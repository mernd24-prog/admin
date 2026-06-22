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
  const [trackingModal, setTrackingModal] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [verificationModal, setVerificationModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [ewayModal, setEwayModal] = useState(false);
  const [manifestConfirm, setManifestConfirm] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [trackingForm, setTrackingForm] = useState(EMPTY_TRACKING);
  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT);
  const [verificationForm, setVerificationForm] = useState(EMPTY_VERIFICATION);
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
  }, [dispatch, fetchShipments, trackingForm]);

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
        channels: ["in_app", "sms", "email"],
      })).unwrap();
      const result = unwrapResult(response);
      toast.success(result?.otp
        ? `Delivery OTP ${result.otp} generated and queued`
        : "Delivery OTP generated and queued for customer notification");
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
    setTrackingForm({ ...EMPTY_TRACKING, shipmentId: row.id });
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
      deliveryAgentId: row.delivery_agent_id || "",
    });
    setAssignmentModal(true);
    fetchAssignableAgents(row.seller_id);
  }, [fetchAssignableAgents]);

  const openVerification = useCallback((row) => {
    const methods = Array.isArray(row.verification_methods) ? row.verification_methods : [];
    setVerificationForm({
      ...EMPTY_VERIFICATION,
      shipmentId: row.id,
      method: methods[0] || "otp",
    });
    setVerificationModal(true);
  }, []);

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
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="admin-btn-secondary !px-2 !py-1"
            onClick={() => openDetail(row)}
          >
            View
          </button>
          {renderDeliveryAction(ACTIONS.STATUS_CHANGE,
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => openTracking(row)}
              disabled={row.direction === "reverse" || row.shipment_type === "return"}
            >
              <MdTimeline size={15} /> Track
            </button>,
          )}
          {renderDeliveryAction(ACTIONS.ASSIGN,
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => openAssignment(row)}
              disabled={row.direction === "reverse" || row.shipment_type === "return"}
            >
              <MdPersonAdd size={15} /> Agent
            </button>,
          )}
          {renderDeliveryAction(ACTIONS.STATUS_CHANGE,
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => sendDeliveryOtp(row)}
              disabled={row.status !== "out_for_delivery"}
              hidden={row.direction === "reverse" || row.shipment_type === "return"}
            >
              OTP
            </button>,
          )}
          {renderDeliveryAction(ACTIONS.STATUS_CHANGE,
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => openVerification(row)}
              disabled={!["out_for_delivery", "delivered"].includes(row.status)}
              hidden={row.direction === "reverse" || row.shipment_type === "return"}
            >
              <MdVerified size={15} /> Verify
            </button>,
          )}
          {renderDeliveryAction(ACTIONS.STATUS_CHANGE,
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => openEwayBill(row)}
              disabled={row.direction === "reverse" || row.shipment_type === "return"}
            >
              <MdDescription size={15} /> E-way
            </button>,
          )}
        </div>
      ),
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
    <div className="max-w-7xl mx-auto mt-8">
      <Loader loading={loading} />
      <PageHeader
        title="Shipments"
        subtitle="Shipment creation, tracking, delivery OTP, and proof verification"
        breadcrumbs={[{ label: "Shipping & Fulfilment" }, { label: "Shipments" }]}
        actions={
          <div className="flex gap-2">
            {renderDeliveryAction(ACTIONS.CREATE,
              <button type="button" className="admin-btn-primary" onClick={() => setShipmentModal(true)}>
                <MdAdd size={16} /> Create Shipment
              </button>,
            )}
            {!isSeller && (
              <PermissionGuard module="delivery" action={ACTIONS.CREATE} hide>
                <button type="button" className="admin-btn-secondary" onClick={() => setManifestConfirm(true)} disabled={!selectedRows.length}>
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
          <Input labelName="Order ID" name="orderId" value={shipmentForm.orderId} onChange={(event) => setShipmentForm((prev) => ({ ...prev, orderId: event.target.value }))} required />
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
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
            <input type="checkbox" checked={shipmentForm.cod} onChange={(event) => setShipmentForm((prev) => ({ ...prev, cod: event.target.checked }))} />
            COD shipment
          </label>
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
            {TRACKING_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
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
            <div><strong>Shipment:</strong> {assignmentForm.shipmentId || "N/A"}</div>
            <div><strong>Seller:</strong> {assignmentForm.sellerId || "N/A"}</div>
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
          <select
            className="admin-input"
            value={verificationForm.method}
            onChange={(event) => setVerificationForm((prev) => ({ ...prev, method: event.target.value }))}
          >
            <option value="otp">OTP</option>
            <option value="signature">Signature</option>
            <option value="photo">Photo proof</option>
            <option value="qr">QR code</option>
            <option value="courier_api">Courier API</option>
            <option value="manual_override">Manual override</option>
          </select>
          {verificationForm.method === "otp" && (
            <Input labelName="Customer OTP" value={verificationForm.otp} onChange={(event) => setVerificationForm((prev) => ({ ...prev, otp: event.target.value }))} required />
          )}
          {verificationForm.method !== "otp" && (
            <>
              <Input labelName="Verification reference" value={verificationForm.verificationReference} onChange={(event) => setVerificationForm((prev) => ({ ...prev, verificationReference: event.target.value }))} />
              <Input labelName="Proof URL" value={verificationForm.proofUrl} onChange={(event) => setVerificationForm((prev) => ({ ...prev, proofUrl: event.target.value }))} />
              {verificationForm.method === "qr" && (
                <Input labelName="QR Code" value={verificationForm.qrCode} onChange={(event) => setVerificationForm((prev) => ({ ...prev, qrCode: event.target.value }))} />
              )}
            </>
          )}
          <Input labelName="Location" value={verificationForm.location} onChange={(event) => setVerificationForm((prev) => ({ ...prev, location: event.target.value }))} />
          <Input type="textarea" labelName="Note / override reason" value={verificationForm.note} onChange={(event) => setVerificationForm((prev) => ({ ...prev, note: event.target.value }))} />
        </div>
      </DefaultModal>

      <DefaultModal isOpen={detailModal} onClose={() => setDetailModal(false)} title="Shipment Detail">
        <div className="space-y-3 text-sm">
          <div><strong>Shipment:</strong> {selectedShipment?.id}</div>
          <div><strong>Order:</strong> #{selectedShipment?.orderNumber || selectedShipment?.order_number || String(selectedShipment?.order_id || "").slice(-8)}</div>
          <div><strong>Type:</strong> {displayStatus(selectedShipment?.shipment_type || selectedShipment?.direction || "forward")}</div>
          <div><strong>Return:</strong> {selectedShipment?.return_id || "N/A"}</div>
          <div><strong>AWB:</strong> {selectedShipment?.awb_number || "N/A"}</div>
          <div><strong>Status:</strong> {displayStatus(selectedShipment?.status)}</div>
          <div><strong>Verification:</strong> {selectedShipment?.verification_required ? `Required (${(selectedShipment?.verification_methods || []).join(", ") || "any"})` : "Not required"}</div>
          <div><strong>Delivery Agent:</strong> {selectedShipment?.delivery_agent_snapshot?.name || selectedShipment?.delivery_agent_id || "Unassigned"}</div>
          <div><strong>Verified At:</strong> {selectedShipment?.delivered_verified_at ? moment(selectedShipment.delivered_verified_at).format("DD-MM-YYYY HH:mm") : "N/A"}</div>
          <div><strong>Label/Manifest:</strong> {selectedShipment?.manifest_id || "N/A"}</div>
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
                    {event.actor_id ? ` · Actor #${String(event.actor_id).slice(-8)}` : ""}
                  </div>
                  {event.failure_reason && <div className="text-xs text-red-600 mt-1">{event.failure_reason}</div>}
                </div>
              ))}
              {!selectedShipment?.verificationEvents?.length && <div className="text-xs text-gray-500">No verification events found.</div>}
            </div>
          </div>
          <div className="border-t pt-3">
            <strong>Raw References</strong>
            <pre className="mt-2 bg-gray-50 p-3 rounded overflow-auto text-xs">{JSON.stringify(selectedShipment || {}, null, 2)}</pre>
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
