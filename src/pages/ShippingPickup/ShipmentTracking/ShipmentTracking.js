import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdDescription, MdFileDownload, MdLocalShipping, MdPersonAdd, MdTimeline, MdVerified } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  addShipmentTracking,
  assignDeliveryAgentToShipment,
  confirmShipmentDelivery,
  createSellerOrderEwayBill,
  createShipment,
  createShipmentManifest,
  generateShipmentDeliveryOtp,
  getDeliveryAgents,
  getSellerOrderEwayBill,
  getShipment,
  getShipments,
  updateSellerEwayBillStatus,
} from "../../../Redux/deliverySlice";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { uploadFile } from "../../../_helpers/globalFunctions";

const STATUS_OPTIONS = [
  "initiated",
  "manifested",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivered_verified",
  "failed",
  "cancelled",
  "rto",
  "lost",
  "damaged",
];
const TRACKING_STATUS_OPTIONS = STATUS_OPTIONS.filter((status) => status !== "delivered_verified");
const TRACKING_TRANSITIONS = {
  initiated: ["manifested", "picked_up", "in_transit", "cancelled", "failed"],
  manifested: ["picked_up", "in_transit", "cancelled", "failed"],
  picked_up: ["in_transit", "failed", "rto", "lost", "damaged"],
  in_transit: ["out_for_delivery", "failed", "rto", "lost", "damaged"],
  out_for_delivery: ["delivered", "failed", "rto", "lost", "damaged"],
  failed: ["in_transit", "out_for_delivery", "rto", "cancelled"],
  delivered: [],
  delivered_verified: [],
  cancelled: [],
  rto: [],
  lost: [],
  damaged: [],
};
const REASON_REQUIRED_TRACKING_STATUSES = new Set(["failed", "cancelled", "rto", "lost", "damaged"]);

const EMPTY_SHIPMENT = {
  orderId: "",
  sellerId: "",
  courierName: "",
  awbNumber: "",
  trackingNumber: "",
  shippingMode: "standard",
  cod: false,
  verificationRequired: false,
  verificationMethods: ["otp"],
  idempotencyKey: "",
  packageSnapshot: {
    weightGrams: "",
    length: "",
    width: "",
    height: "",
    unit: "cm",
  },
};

const EMPTY_TRACKING = {
  shipmentId: "",
  status: "in_transit",
  location: "",
  note: "",
  deliveryException: "",
};

const EMPTY_ASSIGNMENT = {
  shipmentId: "",
  sellerId: "",
  sellerName: "",
  deliveryAgentId: "",
};

const EMPTY_VERIFICATION = {
  shipmentId: "",
  method: "otp",
  otp: "",
  verificationReference: "",
  proofUrl: "",
  qrCode: "",
  location: "",
  note: "",
};

const EMPTY_EWAY = {
  orderId: "",
  ewayBillId: "",
  invoiceId: "",
  eWayBillNumber: "",
  status: "initiated",
  validFrom: "",
  validUntil: "",
  transporterName: "",
  vehicleNumber: "",
  distanceKm: "",
};

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};
const unwrapResult = (payload = {}) => payload?.data?.data || payload?.data || payload || {};

const displayStatus = (value = "") => String(value || "N/A").replace(/_/g, " ");
const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const getInitialQuery = (key) => new URLSearchParams(window.location.search).get(key) || "";
const agentIdOf = (row = {}) => row.id || row._id || row.deliveryAgentId;
const agentNameOf = (agent = {}) =>
  agent.name || agent.fullName || agent.deliveryAgentSnapshot?.name || agent.phone || agentIdOf(agent);
const TERMINAL_SHIPMENT_STATUSES = new Set(["delivered", "delivered_verified", "cancelled", "rto", "lost", "damaged"]);
const ASSIGNABLE_SHIPMENT_STATUSES = new Set(["initiated", "manifested", "picked_up", "in_transit", "out_for_delivery"]);

const shipmentStatusOf = (row = {}) => String(row.status || "").toLowerCase();
const isReverseShipment = (row = {}) =>
  String(row.direction || "").toLowerCase() === "reverse" ||
  String(row.shipment_type || "").toLowerCase() === "return";
const isForwardShipment = (row = {}) => !isReverseShipment(row);
const isTerminalShipment = (row = {}) => TERMINAL_SHIPMENT_STATUSES.has(shipmentStatusOf(row));

const getTrackingDisabledReason = (row = {}) => {
  if (isReverseShipment(row)) return "Reverse shipment tracking is managed from Returns";
  if (isTerminalShipment(row)) return `Tracking is closed after ${displayStatus(row.status)}`;
  return "";
};

const getAgentDisabledReason = (row = {}) => {
  if (isReverseShipment(row)) return "Reverse shipments are managed from Returns";
  if (!row.seller_id) return "Shipment seller is required before assigning an agent";
  if (!ASSIGNABLE_SHIPMENT_STATUSES.has(shipmentStatusOf(row))) {
    return `Agent assignment is not allowed when shipment is ${displayStatus(row.status)}`;
  }
  return "";
};

const getOtpDisabledReason = (row = {}) => {
  if (isReverseShipment(row)) return "Reverse shipments do not use this delivery OTP flow";
  if (shipmentStatusOf(row) !== "out_for_delivery") {
    return "Move shipment to Out for Delivery before generating OTP";
  }
  return "";
};

const getVerificationDisabledReason = (row = {}) => {
  if (isReverseShipment(row)) return "Reverse shipment verification is managed from Returns";
  if (shipmentStatusOf(row) === "delivered_verified") return "Delivery is already verified";
  if (!["out_for_delivery", "delivered"].includes(shipmentStatusOf(row))) {
    return "Delivery can be verified only after Out for Delivery";
  }
  return "";
};

const getEwayDisabledReason = (row = {}) => {
  if (isReverseShipment(row)) return "E-way bill is only for forward shipments";
  if (!row.order_id) return "Order ID is required for e-way bill";
  return "";
};

const getTrackingStatusOptions = (row = {}) => {
  const allowed = TRACKING_TRANSITIONS[shipmentStatusOf(row)] || [];
  return allowed.filter((status) => {
    if (status === "delivered_verified") return false;
    if (status === "delivered" && row.verification_required) return false;
    return true;
  });
};

const ActionButton = ({ children, onClick, disabledReason = "", disabled = false, title = "" }) => {
  const isDisabled = disabled || Boolean(disabledReason);
  return (
    <button
      type="button"
      className="admin-btn-secondary !px-2 !py-1"
      onClick={onClick}
      disabled={isDisabled}
      title={disabledReason || title}
      aria-disabled={isDisabled}
    >
      {children}
    </button>
  );
};

const FILTER_FIELDS = [
  { key: "orderId", type: "text", label: "Order #", width: "w-48" },
  { key: "returnId", type: "text", label: "Return #", width: "w-44" },
  { key: "shipmentType", type: "select", label: "Type", options: [{ value: "forward", label: "Forward" }, { value: "return", label: "Return" }] },
  { key: "direction", type: "select", label: "Direction", options: [{ value: "forward", label: "Forward" }, { value: "reverse", label: "Reverse" }] },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  { key: "awbNumber", type: "text", label: "AWB / Tracking", width: "w-44" },
  { key: "courierName", type: "text", label: "Courier", width: "w-40" },
  { key: "status", type: "select", label: "Status", options: STATUS_OPTIONS.map((value) => ({ value, label: displayStatus(value) })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const ShipmentTracking = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((state) => state.delivery);
  const shipmentPayload = unwrapList(selector.shipmentsData);
  const agentPayload = unwrapList(selector.agentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: { orderId: getInitialQuery("orderId") },
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shipmentModal, setShipmentModal] = useState(false);
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => { dropdownApi.getSellers({ limit: 200 }).then(setSellerOptions).catch(() => {}); }, []);
  const [orderOptions, setOrderOptions] = useState([]);
  useEffect(() => {
    dropdownApi.getOrders({ limit: 100 })
      .then(setOrderOptions)
      .catch(() => setOrderOptions([]));
  }, []);
  const [trackingModal, setTrackingModal] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [verificationModal, setVerificationModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [ewayModal, setEwayModal] = useState(false);
  const [manifestConfirm, setManifestConfirm] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [trackingForm, setTrackingForm] = useState(EMPTY_TRACKING);
  const [trackingStatusOptions, setTrackingStatusOptions] = useState(TRACKING_STATUS_OPTIONS);
  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT);
  const [verificationForm, setVerificationForm] = useState(EMPTY_VERIFICATION);
  const [verificationMethodOptions, setVerificationMethodOptions] = useState(["otp"]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [ewayForm, setEwayForm] = useState(EMPTY_EWAY);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const filterFields = useMemo(
    () => (isSeller ? FILTER_FIELDS.filter((field) => field.key !== "sellerId") : FILTER_FIELDS),
    [isSeller],
  );
  const renderDeliveryAction = useCallback(
    (action, children) => isSeller
      ? children
      : (
        <PermissionGuard module="delivery" action={action} hide>
          {children}
        </PermissionGuard>
      ),
    [isSeller],
  );

  const fetchAssignableAgents = useCallback(async (sellerId) => {
    if (!sellerId) return;
    try {
      await dispatch(getDeliveryAgents({
        sellerId,
        active: true,
        verificationStatus: "verified",
        limit: 200,
        offset: 0,
      })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Failed to load delivery agents");
    }
  }, [dispatch]);

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getShipments({
        ...params,
        offset: (params.page - 1) * params.limit,
      })).unwrap();
    } catch (error) {
      const message = error?.message || error || "Failed to load shipments";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const submitShipment = useCallback(async () => {
    if (!shipmentForm.orderId.trim()) {
      toast.error("Order ID is required");
      return;
    }
    try {
      setLoading(true);
      await dispatch(createShipment({
        ...shipmentForm,
        idempotencyKey: shipmentForm.idempotencyKey || `${shipmentForm.orderId}:${shipmentForm.sellerId || "seller"}:${shipmentForm.awbNumber || Date.now()}`,
        packageSnapshot: {
          ...shipmentForm.packageSnapshot,
          weightGrams: Number(shipmentForm.packageSnapshot.weightGrams || 0),
          length: Number(shipmentForm.packageSnapshot.length || 0),
          width: Number(shipmentForm.packageSnapshot.width || 0),
          height: Number(shipmentForm.packageSnapshot.height || 0),
        },
      })).unwrap();
      toast.success("Shipment created");
      setShipmentModal(false);
      setShipmentForm(EMPTY_SHIPMENT);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, shipmentForm]);

  const submitTracking = useCallback(async () => {
    if (!trackingForm.shipmentId || !trackingForm.status) {
      toast.error("Shipment and status are required");
      return;
    }
    if (!trackingStatusOptions.includes(trackingForm.status)) {
      toast.error("Selected tracking status is not allowed from the current shipment state");
      return;
    }
    if (
      REASON_REQUIRED_TRACKING_STATUSES.has(trackingForm.status) &&
      !String(trackingForm.note || trackingForm.deliveryException || "").trim()
    ) {
      toast.error("Add a note or exception reason for this tracking status");
      return;
    }
    try {
      setLoading(true);
      await dispatch(addShipmentTracking(trackingForm)).unwrap();
      toast.success("Tracking updated");
      setTrackingModal(false);
      setTrackingForm(EMPTY_TRACKING);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to update tracking");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, trackingForm, trackingStatusOptions]);

  const submitAssignment = useCallback(async () => {
    if (!assignmentForm.shipmentId || !assignmentForm.deliveryAgentId) {
      toast.error("Select a delivery agent");
      return;
    }
    try {
      setLoading(true);
      await dispatch(assignDeliveryAgentToShipment(assignmentForm)).unwrap();
      toast.success("Delivery agent assigned");
      setAssignmentModal(false);
      setAssignmentForm(EMPTY_ASSIGNMENT);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to assign delivery agent");
    } finally {
      setLoading(false);
    }
  }, [assignmentForm, dispatch, fetchShipments]);

  const sendDeliveryOtp = useCallback(async (row) => {
    if (row.status !== "out_for_delivery") {
      toast.error("Move shipment to Out for Delivery before generating OTP");
      return;
    }
    try {
      setLoading(true);
      const response = await dispatch(generateShipmentDeliveryOtp({
        shipmentId: row.id,
        channels: ["in_app", "email"],
      })).unwrap();
      const result = unwrapResult(response);
      const queuedChannels = (result.notificationDelivery || [])
        .filter((item) => item.status === "queued")
        .map((item) => item.channel.replace("in_app", "app"));
      toast.success(queuedChannels.length
        ? `Delivery OTP sent through ${queuedChannels.join(" and ")}`
        : "Delivery OTP generated for the customer");
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to generate delivery OTP");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments]);

  const submitVerification = useCallback(async () => {
    if (!verificationForm.shipmentId || !verificationForm.method) {
      toast.error("Shipment and verification method are required");
      return;
    }
    if (verificationForm.method === "otp" && !verificationForm.otp.trim()) {
      toast.error("Delivery OTP is required");
      return;
    }
    if (["signature", "photo"].includes(verificationForm.method) && !verificationForm.proofUrl) {
      toast.error(`Upload the ${verificationForm.method === "signature" ? "customer signature" : "delivery photo"} first`);
      return;
    }
    if (verificationForm.method === "manual_override" && !verificationForm.note.trim()) {
      toast.error("Enter the reason for overriding verification");
      return;
    }
    try {
      setLoading(true);
      await dispatch(confirmShipmentDelivery({
        ...verificationForm,
        proofSnapshot: {
          verificationReference: verificationForm.verificationReference || undefined,
          proofUrl: verificationForm.proofUrl || undefined,
          qrCode: verificationForm.qrCode ? "provided" : undefined,
        },
      })).unwrap();
      toast.success("Delivery verified");
      setVerificationModal(false);
      setVerificationForm(EMPTY_VERIFICATION);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to verify delivery");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, verificationForm]);

  const handleProofUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      setUploadingProof(true);
      const proofUrl = await uploadFile(file, "DELIVERY_PROOF");
      setVerificationForm((prev) => ({ ...prev, proofUrl }));
      toast.success("Delivery proof uploaded");
    } catch (uploadError) {
      toast.error(uploadError?.message || uploadError || "Failed to upload delivery proof");
    } finally {
      setUploadingProof(false);
    }
  }, []);

  const createManifest = useCallback(async () => {
    if (!selectedRows.length) {
      toast.error("Select at least one shipment");
      return;
    }
    try {
      setLoading(true);
      const res = await dispatch(createShipmentManifest({
        shipmentIds: selectedRows,
        manifestNumber: `MAN-${moment().format("YYYYMMDD-HHmmss")}`,
      })).unwrap();
      toast.success("Manifest created");
      const manifest = res?.data || {};
      const csv = [
        ["Manifest", "Shipment ID"],
        ...selectedRows.map((shipmentId) => [manifest.manifest_number || manifest.manifestNumber || "", shipmentId]),
      ].map((row) => row.map(csvValue).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `manifest-${moment().format("YYYYMMDD-HHmm")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setSelectedRows([]);
      setManifestConfirm(false);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to create manifest");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, selectedRows]);

  const openTracking = useCallback((row) => {
    const options = getTrackingStatusOptions(row);
    if (!options.length) {
      toast.error("No manual tracking transition is available for this shipment");
      return;
    }
    setTrackingStatusOptions(options);
    setTrackingForm({ ...EMPTY_TRACKING, shipmentId: row.id, status: options[0] });
    setTrackingModal(true);
  }, []);

  const openAssignment = useCallback((row) => {
    if (!row.seller_id) {
      toast.error("Shipment seller is required before assigning an agent");
      return;
    }
    setAssignmentForm({
      shipmentId: row.id,
      sellerId: row.seller_id,
      sellerName: row.sellerName || row.seller?.displayName || row.seller?.businessName || "Shipment seller",
      deliveryAgentId: row.delivery_agent_id || "",
    });
    setAssignmentModal(true);
    fetchAssignableAgents(row.seller_id);
  }, [fetchAssignableAgents]);

  const openVerification = useCallback((row) => {
    const methods = Array.isArray(row.verification_methods) ? row.verification_methods : [];
    const availableMethods = methods.length
      ? methods
      : ["otp", "signature", "photo", "qr", "courier_api"];
    if (!isSeller) availableMethods.push("manual_override");
    const uniqueMethods = Array.from(new Set(availableMethods));
    setVerificationMethodOptions(uniqueMethods);
    setVerificationForm({
      ...EMPTY_VERIFICATION,
      shipmentId: row.id,
      method: uniqueMethods[0] || "otp",
    });
    setVerificationModal(true);
  }, [isSeller]);

  const openDetail = useCallback(async (row) => {
    setSelectedShipment(row);
    setDetailModal(true);
    try {
      setLoading(true);
      const response = await dispatch(getShipment({ shipmentId: row.id })).unwrap();
      setSelectedShipment(unwrapResult(response));
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to load shipment detail");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const openEwayBill = useCallback(async (row) => {
    setEwayForm({ ...EMPTY_EWAY, orderId: row.order_id });
    setEwayModal(true);
    try {
      setLoading(true);
      const response = await dispatch(getSellerOrderEwayBill({ orderId: row.order_id })).unwrap();
      const record = unwrapResult(response);
      if (record?.id) {
        setEwayForm({
          orderId: row.order_id,
          ewayBillId: record.id,
          invoiceId: record.invoice_id || "",
          eWayBillNumber: record.e_way_bill_number || "",
          status: record.status || "initiated",
          validFrom: record.valid_from ? moment(record.valid_from).format("YYYY-MM-DD") : "",
          validUntil: record.valid_until ? moment(record.valid_until).format("YYYY-MM-DD") : "",
          transporterName: record.transporter_name || "",
          vehicleNumber: record.vehicle_number || "",
          distanceKm: record.distance_km ?? "",
        });
      }
    } catch (requestError) {
      const status = requestError?.status || requestError?.response?.status;
      if (status && status !== 404) toast.error(requestError?.message || "Failed to load e-way bill");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const submitEwayBill = useCallback(async () => {
    if (!ewayForm.orderId) return;
    if (!ewayForm.ewayBillId && !ewayForm.eWayBillNumber.trim()) {
      toast.error("E-way bill number is required");
      return;
    }
    try {
      setLoading(true);
      if (ewayForm.ewayBillId) {
        await dispatch(updateSellerEwayBillStatus({
          ewayBillId: ewayForm.ewayBillId,
          status: ewayForm.status,
          transporterName: ewayForm.transporterName,
          vehicleNumber: ewayForm.vehicleNumber,
        })).unwrap();
      } else {
        await dispatch(createSellerOrderEwayBill({
          ...ewayForm,
          distanceKm: ewayForm.distanceKm === "" ? null : Number(ewayForm.distanceKm),
          validFrom: ewayForm.validFrom || null,
          validUntil: ewayForm.validUntil || null,
        })).unwrap();
      }
      toast.success(ewayForm.ewayBillId ? "E-way bill updated" : "E-way bill created");
      setEwayModal(false);
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to save e-way bill");
    } finally {
      setLoading(false);
    }
  }, [dispatch, ewayForm]);

  const columns = useMemo(() => {
    const baseColumns = [
    {
      key: "shipment",
      label: "Shipment",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <MdLocalShipping size={18} />
          </span>
          <div>
            <div className="font-semibold text-gray-800">{row.awb_number || row.tracking_number || row.id}</div>
            <div className="text-xs text-gray-400">
              Order #{row.orderNumber || row.order_number || String(row.order_id || "").slice(-8)}{row.return_id ? ` · Return #${String(row.return_id).slice(-8)}` : ""}
            </div>
          </div>
        </div>
      ),
    },
    { key: "seller_id", label: "Seller", sortable: true, render: (value, row) => {
      const name = row.sellerName || row.seller?.name || row.seller?.companyName || sellerOptions.find((o) => o.value === value)?.label;
      return name ? <span className="text-sm font-medium text-gray-700">{name}</span> : <span className="font-mono text-xs text-gray-400">{value ? String(value).slice(0, 10) + "…" : "—"}</span>;
    } },
    {
      key: "delivery_agent_id",
      label: "Agent",
      render: (value, row) => {
        const snapshot = row.delivery_agent_snapshot || {};
        return value ? (
          <div>
            <div className="font-medium text-gray-800">{snapshot.name || value}</div>
            {snapshot.phone && <div className="text-xs text-gray-400">{snapshot.phone}</div>}
          </div>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        );
      },
    },
    {
      key: "shipment_type",
      label: "Type",
      render: (value, row) => <StatusBadge status={displayStatus(value || row.direction || "forward")} dot />,
    },
    { key: "courier_name", label: "Courier", sortable: true, render: (value) => value || "Manual" },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} dot />,
    },
    {
      key: "cod",
      label: "COD",
      sortable: true,
      render: (value) => (value ? "Yes" : "No"),
    },
    {
      key: "expected_delivery_at",
      label: "Expected",
      sortable: true,
      render: (value) => value ? moment(value).format("DD-MM-YYYY") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const trackingDisabledReason = getTrackingDisabledReason(row);
        const agentDisabledReason = getAgentDisabledReason(row);
        const otpDisabledReason = getOtpDisabledReason(row);
        const verificationDisabledReason = getVerificationDisabledReason(row);
        const ewayDisabledReason = getEwayDisabledReason(row);

        return (
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={() => openDetail(row)} title="View shipment details">
              View
            </ActionButton>
            {renderDeliveryAction(ACTIONS.STATUS_CHANGE,
              <ActionButton
                onClick={() => openTracking(row)}
                disabledReason={trackingDisabledReason}
                title="Update shipment tracking"
              >
                <MdTimeline size={15} /> Track
              </ActionButton>,
            )}
            {renderDeliveryAction(ACTIONS.ASSIGN,
              <ActionButton
                onClick={() => openAssignment(row)}
                disabledReason={agentDisabledReason}
                title="Assign delivery agent"
              >
                <MdPersonAdd size={15} /> Agent
              </ActionButton>,
            )}
            {isForwardShipment(row) && renderDeliveryAction(ACTIONS.STATUS_CHANGE,
              <ActionButton
                onClick={() => sendDeliveryOtp(row)}
                disabledReason={otpDisabledReason}
                title="Generate customer delivery OTP"
              >
                OTP
              </ActionButton>,
            )}
            {isForwardShipment(row) && renderDeliveryAction(ACTIONS.STATUS_CHANGE,
              <ActionButton
                onClick={() => openVerification(row)}
                disabledReason={verificationDisabledReason}
                title="Verify delivery proof"
              >
                <MdVerified size={15} /> Verify
              </ActionButton>,
            )}
            {renderDeliveryAction(ACTIONS.STATUS_CHANGE,
              <ActionButton
                onClick={() => openEwayBill(row)}
                disabledReason={ewayDisabledReason}
                title="Create or update e-way bill"
              >
                <MdDescription size={15} /> E-way
              </ActionButton>,
            )}
          </div>
        );
      },
    },
    ];
    return isSeller ? baseColumns.filter((column) => column.key !== "seller_id") : baseColumns;
  }, [isSeller, openAssignment, openDetail, openEwayBill, openTracking, openVerification, renderDeliveryAction, sellerOptions, sendDeliveryOtp]);

  const updatePackageField = (field, value) => {
    setShipmentForm((prev) => ({
      ...prev,
      packageSnapshot: { ...prev.packageSnapshot, [field]: value },
    }));
  };

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Shipments"
        subtitle="Shipment creation, tracking, delivery OTP, and proof verification"
        breadcrumbs={[{ label: "Shipping & Fulfilment" }, { label: "Shipments" }]}
        actions={
          <div className="flex gap-2">
            {renderDeliveryAction(ACTIONS.CREATE,
              <button type="button" onClick={() => setShipmentModal(true)}>
                <MdAdd size={16} /> Create Shipment
              </button>,
            )}
            {!isSeller && (
              <PermissionGuard module="delivery" action={ACTIONS.CREATE} hide>
                <button type="button" onClick={() => setManifestConfirm(true)} disabled={!selectedRows.length}>
                  <MdFileDownload size={16} /> Manifest
                </button>
              </PermissionGuard>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={shipmentPayload.list}
        loading={loading}
        totalCount={shipmentPayload.total || shipmentPayload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search shipment, AWB, courier, or order"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchShipments}
        error={error}
        filterBar={(
          <FilterBar
            filters={filterFields}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        )}
        selectable={!isSeller}
        selectedKeys={selectedRows}
        onSelectionChange={setSelectedRows}
        rowKey="id"
        requiredModule="delivery"
        exportConfig={{ filename: "shipments", columns, data: shipmentPayload.list }}
      />

      <DefaultModal isOpen={shipmentModal} onClose={() => setShipmentModal(false)} title="Create Shipment" onSubmit={submitShipment}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">Order *</span>
            <select
              className="admin-input w-full"
              value={shipmentForm.orderId}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, orderId: event.target.value }))}
              required
            >
              <option value="">Select an order</option>
              {shipmentForm.orderId && !orderOptions.some((option) => option.value === shipmentForm.orderId) && (
                <option value={shipmentForm.orderId}>Selected order</option>
              )}
              {orderOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          {!isSeller && (
            <label className="block text-sm text-gray-700">
              <span className="block mb-1 font-medium">Seller</span>
              <select
                className="admin-input w-full"
                value={shipmentForm.sellerId}
                onChange={(event) => setShipmentForm((prev) => ({ ...prev, sellerId: event.target.value }))}
              >
                <option value="">— Select seller —</option>
                {sellerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
          )}
          <Input labelName="Courier" name="courierName" value={shipmentForm.courierName} onChange={(event) => setShipmentForm((prev) => ({ ...prev, courierName: event.target.value }))} />
          <Input labelName="AWB Number" name="awbNumber" value={shipmentForm.awbNumber} onChange={(event) => setShipmentForm((prev) => ({ ...prev, awbNumber: event.target.value }))} />
          <Input labelName="Tracking Number" name="trackingNumber" value={shipmentForm.trackingNumber} onChange={(event) => setShipmentForm((prev) => ({ ...prev, trackingNumber: event.target.value }))} />
          <select className="admin-input mt-7" value={shipmentForm.shippingMode} onChange={(event) => setShipmentForm((prev) => ({ ...prev, shippingMode: event.target.value }))}>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
            <option value="same_day">Same day</option>
            <option value="hyperlocal">Hyperlocal</option>
          </select>
          <Input type="number" labelName="Weight grams" value={shipmentForm.packageSnapshot.weightGrams} onChange={(event) => updatePackageField("weightGrams", event.target.value)} />
          <Input type="number" labelName="Length" value={shipmentForm.packageSnapshot.length} onChange={(event) => updatePackageField("length", event.target.value)} />
          <Input type="number" labelName="Width" value={shipmentForm.packageSnapshot.width} onChange={(event) => updatePackageField("width", event.target.value)} />
          <Input type="number" labelName="Height" value={shipmentForm.packageSnapshot.height} onChange={(event) => updatePackageField("height", event.target.value)} />
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            COD is detected automatically from the order payment method.
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
            <input
              type="checkbox"
              checked={shipmentForm.verificationRequired}
              onChange={(event) => setShipmentForm((prev) => ({
                ...prev,
                verificationRequired: event.target.checked,
                verificationMethods: event.target.checked ? prev.verificationMethods : [],
              }))}
            />
            Require delivery verification
          </label>
          {shipmentForm.verificationRequired && (
            <select
              className="admin-input"
              value={shipmentForm.verificationMethods[0] || "otp"}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, verificationMethods: [event.target.value] }))}
            >
              <option value="otp">OTP</option>
              <option value="signature">Signature</option>
              <option value="photo">Photo proof</option>
              <option value="qr">QR code</option>
              <option value="courier_api">Courier API</option>
            </select>
          )}
        </div>
      </DefaultModal>

      <DefaultModal isOpen={trackingModal} onClose={() => setTrackingModal(false)} title="Update Tracking" onSubmit={submitTracking}>
        <div className="space-y-3">
          <select className="admin-input" value={trackingForm.status} onChange={(event) => setTrackingForm((prev) => ({ ...prev, status: event.target.value }))}>
            {trackingStatusOptions.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
          </select>
          <Input labelName="Location" value={trackingForm.location} onChange={(event) => setTrackingForm((prev) => ({ ...prev, location: event.target.value }))} />
          <Input labelName="Exception" value={trackingForm.deliveryException} onChange={(event) => setTrackingForm((prev) => ({ ...prev, deliveryException: event.target.value }))} />
          <Input type="textarea" labelName="Note" value={trackingForm.note} onChange={(event) => setTrackingForm((prev) => ({ ...prev, note: event.target.value }))} />
        </div>
      </DefaultModal>

      <DefaultModal
        isOpen={assignmentModal}
        onClose={() => setAssignmentModal(false)}
        title="Assign Delivery Agent"
        onSubmit={submitAssignment}
        submitButtonText="Assign"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
            <div><strong>Seller:</strong> {assignmentForm.sellerName || "Shipment seller"}</div>
            <div className="mt-1">Only active, admin-verified agents are available.</div>
          </div>
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">Verified active agent</span>
            <select
              className="admin-input w-full"
              value={assignmentForm.deliveryAgentId}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, deliveryAgentId: event.target.value }))}
              disabled={loading}
            >
              <option value="">Select delivery agent</option>
              {agentPayload.list.map((agent) => (
                <option key={agentIdOf(agent)} value={agentIdOf(agent)}>
                  {agentNameOf(agent)}{agent.phone ? ` - ${agent.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
          {!agentPayload.list.length && (
            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
              No verified active agents found for this seller.
            </div>
          )}
        </div>
      </DefaultModal>

      <DefaultModal isOpen={verificationModal} onClose={() => setVerificationModal(false)} title="Verify Delivery" onSubmit={submitVerification}>
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">Verification method</span>
            <select
              className="admin-input w-full"
              value={verificationForm.method}
              onChange={(event) => setVerificationForm((prev) => ({ ...prev, method: event.target.value, otp: "", proofUrl: "", qrCode: "" }))}
            >
              {verificationMethodOptions.map((method) => (
                <option key={method} value={method}>{displayStatus(method)}</option>
              ))}
            </select>
          </label>
          {verificationForm.method === "otp" && (
            <div className="space-y-2">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                Ask the customer for the 6-digit OTP sent to their account. Never ask for a login or payment OTP.
              </div>
              <Input labelName="Customer delivery OTP" value={verificationForm.otp} onChange={(event) => setVerificationForm((prev) => ({ ...prev, otp: event.target.value.replace(/\D/g, "").slice(0, 6) }))} required />
            </div>
          )}
          {["signature", "photo"].includes(verificationForm.method) && (
            <label className="block rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-700">
              <span className="mb-2 block font-medium">
                {verificationForm.method === "signature" ? "Upload customer signature" : "Upload delivery photo"} *
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingProof}
                onChange={(event) => handleProofUpload(event.target.files?.[0])}
              />
              <div className="mt-2 text-xs text-gray-500">
                {uploadingProof ? "Uploading…" : verificationForm.proofUrl ? "Proof uploaded and ready" : "Use a clear image that confirms handover."}
              </div>
            </label>
          )}
          {verificationForm.method === "qr" && (
            <Input labelName="Scanned QR value" value={verificationForm.qrCode} onChange={(event) => setVerificationForm((prev) => ({ ...prev, qrCode: event.target.value }))} required />
          )}
          {verificationForm.method === "courier_api" && (
            <Input labelName="Courier confirmation reference" value={verificationForm.verificationReference} onChange={(event) => setVerificationForm((prev) => ({ ...prev, verificationReference: event.target.value }))} required />
          )}
          {verificationForm.method === "manual_override" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Admin override should be used only when normal proof cannot be collected. The reason is saved in the audit trail.
            </div>
          )}
          <Input labelName="Location" value={verificationForm.location} onChange={(event) => setVerificationForm((prev) => ({ ...prev, location: event.target.value }))} />
          <Input type="textarea" labelName={verificationForm.method === "manual_override" ? "Override reason *" : "Delivery note"} value={verificationForm.note} onChange={(event) => setVerificationForm((prev) => ({ ...prev, note: event.target.value }))} />
        </div>
      </DefaultModal>

      <DefaultModal isOpen={detailModal} onClose={() => setDetailModal(false)} title="Shipment Detail">
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
            <div><strong>Order:</strong> #{selectedShipment?.orderNumber || selectedShipment?.order_number || "Order"}</div>
            <div><strong>Status:</strong> <StatusBadge status={selectedShipment?.status || "initiated"} dot /></div>
            <div><strong>Seller:</strong> {selectedShipment?.sellerName || selectedShipment?.seller?.displayName || selectedShipment?.seller?.businessName || "Seller"}</div>
            <div><strong>Customer:</strong> {selectedShipment?.buyerName || selectedShipment?.buyer?.displayName || selectedShipment?.buyer?.email || "Customer"}</div>
            <div><strong>Courier:</strong> {selectedShipment?.courier_name || "Seller delivery"}</div>
            <div><strong>Tracking number:</strong> {selectedShipment?.tracking_number || selectedShipment?.awb_number || "Not added"}</div>
            <div><strong>Payment collection:</strong> {selectedShipment?.cod ? "Cash on delivery" : "Prepaid"}</div>
            <div><strong>Shipment type:</strong> {displayStatus(selectedShipment?.shipment_type || selectedShipment?.direction || "forward")}</div>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="font-semibold text-gray-800">Handover and verification</div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div><strong>Delivery agent:</strong> {selectedShipment?.delivery_agent_snapshot?.name || "Unassigned"}</div>
              <div><strong>Agent phone:</strong> {selectedShipment?.delivery_agent_snapshot?.phone || "Not available"}</div>
              <div><strong>Verification:</strong> {selectedShipment?.verification_required ? `Required by ${displayStatus((selectedShipment?.verification_methods || []).join(" or ") || "proof")}` : "Not required"}</div>
              <div><strong>Verified:</strong> {selectedShipment?.delivered_verified_at ? moment(selectedShipment.delivered_verified_at).format("DD-MM-YYYY HH:mm") : "Not yet"}</div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="font-semibold text-gray-800">Delivery address</div>
            <div className="mt-2 text-gray-600">
              {[
                selectedShipment?.ship_to_snapshot?.fullName,
                selectedShipment?.ship_to_snapshot?.phone,
                selectedShipment?.ship_to_snapshot?.line1,
                selectedShipment?.ship_to_snapshot?.line2,
                selectedShipment?.ship_to_snapshot?.city,
                selectedShipment?.ship_to_snapshot?.state,
                selectedShipment?.ship_to_snapshot?.postalCode,
              ].filter(Boolean).join(", ") || "Address not available"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="font-semibold text-gray-800">Package</div>
            <div className="mt-2 text-gray-600">
              {selectedShipment?.package_snapshot?.weightGrams ? `${selectedShipment.package_snapshot.weightGrams} g` : "Weight not entered"}
              {selectedShipment?.package_snapshot?.length ? ` · ${selectedShipment.package_snapshot.length} × ${selectedShipment.package_snapshot.width || "-"} × ${selectedShipment.package_snapshot.height || "-"} ${selectedShipment.package_snapshot.unit || "cm"}` : ""}
            </div>
          </div>
          <div className="border-t pt-3">
            <strong>Tracking timeline</strong>
            <div className="mt-2 space-y-2">
              {(selectedShipment?.trackingEvents || []).map((event) => (
                <div key={event.id} className="border-l-2 border-blue-200 pl-3 py-1">
                  <div className="font-medium capitalize">{displayStatus(event.status)}</div>
                  <div className="text-xs text-gray-500">
                    {event.event_time ? moment(event.event_time).format("DD-MM-YYYY HH:mm") : "N/A"}
                    {event.location ? ` · ${event.location}` : ""}
                  </div>
                  {event.note && <div className="text-xs text-gray-600 mt-1">{event.note}</div>}
                </div>
              ))}
              {!selectedShipment?.trackingEvents?.length && <div className="text-xs text-gray-500">No tracking events found.</div>}
            </div>
          </div>
          <div className="border-t pt-3">
            <strong>Verification events</strong>
            <div className="mt-2 space-y-2">
              {(selectedShipment?.verificationEvents || []).map((event) => (
                <div key={event.id} className="border-l-2 border-emerald-200 pl-3 py-1">
                  <div className="font-medium capitalize">{displayStatus(event.status)} · {displayStatus(event.method)}</div>
                  <div className="text-xs text-gray-500">
                    {event.created_at ? moment(event.created_at).format("DD-MM-YYYY HH:mm") : "N/A"}
                    {event.actor?.displayName ? ` · ${event.actor.displayName}` : ""}
                  </div>
                  {event.failure_reason && <div className="text-xs text-red-600 mt-1">{event.failure_reason}</div>}
                </div>
              ))}
              {!selectedShipment?.verificationEvents?.length && <div className="text-xs text-gray-500">No verification events found.</div>}
            </div>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal
        isOpen={ewayModal}
        onClose={() => setEwayModal(false)}
        title={ewayForm.ewayBillId ? "Update E-way Bill" : "Create E-way Bill"}
        onSubmit={submitEwayBill}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input labelName="Order ID" value={ewayForm.orderId} disabled />
          <Input labelName="Invoice ID" value={ewayForm.invoiceId} onChange={(event) => setEwayForm((prev) => ({ ...prev, invoiceId: event.target.value }))} disabled={Boolean(ewayForm.ewayBillId)} />
          <Input labelName="E-way Bill Number" value={ewayForm.eWayBillNumber} onChange={(event) => setEwayForm((prev) => ({ ...prev, eWayBillNumber: event.target.value }))} disabled={Boolean(ewayForm.ewayBillId)} required />
          <select className="admin-input mt-7" value={ewayForm.status} onChange={(event) => setEwayForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="initiated">Initiated</option>
            <option value="in_transit">In transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Input labelName="Valid From" type="date" value={ewayForm.validFrom} onChange={(event) => setEwayForm((prev) => ({ ...prev, validFrom: event.target.value }))} disabled={Boolean(ewayForm.ewayBillId)} />
          <Input labelName="Valid Until" type="date" value={ewayForm.validUntil} onChange={(event) => setEwayForm((prev) => ({ ...prev, validUntil: event.target.value }))} disabled={Boolean(ewayForm.ewayBillId)} />
          <Input labelName="Transporter" value={ewayForm.transporterName} onChange={(event) => setEwayForm((prev) => ({ ...prev, transporterName: event.target.value }))} />
          <Input labelName="Vehicle Number" value={ewayForm.vehicleNumber} onChange={(event) => setEwayForm((prev) => ({ ...prev, vehicleNumber: event.target.value }))} />
          <Input labelName="Distance (km)" type="number" min="0" value={ewayForm.distanceKm} onChange={(event) => setEwayForm((prev) => ({ ...prev, distanceKm: event.target.value }))} disabled={Boolean(ewayForm.ewayBillId)} />
        </div>
      </DefaultModal>

      <ConfirmModal
        open={manifestConfirm}
        onClose={() => setManifestConfirm(false)}
        onConfirm={createManifest}
        title="Create shipment manifest?"
        message={`${selectedRows.length} selected shipment${selectedRows.length === 1 ? "" : "s"} will be assigned to a new manifest.`}
        variant="warning"
        confirmLabel="Create manifest"
        loading={loading}
      />
    </div>
  );
};

export default ShipmentTracking;
