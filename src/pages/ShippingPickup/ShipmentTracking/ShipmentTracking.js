import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdLocalShipping } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  addShipmentTracking,
  confirmShipmentDelivery,
  generateShipmentDeliveryOtp,
  getShipment,
  getShipments,
} from "../../../Redux/deliverySlice";
import { usePermission } from "../../../_helpers/usePermission";
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
const FULFILLMENT_STATUS_OPTIONS = [
  { value: "initiated", label: "Packed" },
  { value: "manifested", label: "Ready to ship" },
  { value: "in_transit", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "failed", label: "Failed delivery" },
  { value: "rto", label: "Return to origin" },
];
const FULFILLMENT_TRANSITIONS = {
  initiated: ["manifested", "in_transit", "failed"],
  manifested: ["in_transit", "failed"],
  picked_up: ["in_transit", "failed", "rto"],
  in_transit: ["out_for_delivery", "failed", "rto"],
  out_for_delivery: ["failed", "rto"],
  failed: ["in_transit", "out_for_delivery", "rto"],
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
const shipmentStepLabel = (value = "") =>
  FULFILLMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label || displayStatus(value);
const getTrackingActionOptions = (currentStatus = "initiated") => {
  const nextStatuses = FULFILLMENT_TRANSITIONS[currentStatus] || [];
  return FULFILLMENT_STATUS_OPTIONS.filter((option) => nextStatuses.includes(option.value));
};
const getDefaultTrackingStatus = (currentStatus = "initiated") =>
  getTrackingActionOptions(currentStatus)[0]?.value || currentStatus;
const getInitialQuery = (key) => new URLSearchParams(window.location.search).get(key) || "";
const initialShipmentId = getInitialQuery("shipmentId");

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
  { key: "status", type: "select", label: "Status", options: STATUS_OPTIONS.map((value) => ({ value, label: shipmentStepLabel(value) })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const ShipmentTracking = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((state) => state.delivery);
  const shipmentPayload = unwrapList(selector.shipmentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: {
      orderId: getInitialQuery("orderId"),
      sellerId: getInitialQuery("sellerId"),
      search: initialShipmentId,
    },
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => { dropdownApi.getSellers({ limit: 200 }).then(setSellerOptions).catch(() => { }); }, []);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingAction, setTrackingAction] = useState({ status: "manifested", note: "", location: "" });
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const trackingActionOptions = useMemo(
    () => getTrackingActionOptions(selectedShipment?.status || "initiated"),
    [selectedShipment?.status],
  );
  const filterFields = useMemo(
    () => (isSeller ? FILTER_FIELDS.filter((field) => field.key !== "sellerId") : FILTER_FIELDS),
    [isSeller],
  );

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

  const openDetail = useCallback(async (row) => {
    setSelectedShipment(row);
    setDetailModal(true);
    setTrackingAction({ status: getDefaultTrackingStatus(row.status || "initiated"), note: "", location: "" });
    setDeliveryOtp("");
    try {
      setLoading(true);
      const response = await dispatch(getShipment({ shipmentId: row.id })).unwrap();
      const nextShipment = unwrapResult(response);
      setSelectedShipment(nextShipment);
      setTrackingAction({ status: getDefaultTrackingStatus(nextShipment.status || "initiated"), note: "", location: "" });
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to load shipment detail");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!initialShipmentId) return;
    openDetail({ id: initialShipmentId });
  }, [openDetail]);

  const refreshSelectedShipment = useCallback(async (shipmentId) => {
    const response = await dispatch(getShipment({ shipmentId })).unwrap();
    const nextShipment = unwrapResult(response);
    setSelectedShipment(nextShipment);
    setTrackingAction((prev) => ({ ...prev, status: getDefaultTrackingStatus(nextShipment.status || "initiated") }));
    await fetchShipments();
    return nextShipment;
  }, [dispatch, fetchShipments]);

  const handleTrackingStatus = useCallback(async () => {
    if (!selectedShipment?.id) return;
    try {
      setLoading(true);
      await dispatch(addShipmentTracking({
        shipmentId: selectedShipment.id,
        status: trackingAction.status,
        note: trackingAction.note,
        location: trackingAction.location,
        source: "seller_panel",
      })).unwrap();
      toast.success("Shipment status updated");
      await refreshSelectedShipment(selectedShipment.id);
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to update shipment status");
    } finally {
      setLoading(false);
    }
  }, [dispatch, refreshSelectedShipment, selectedShipment?.id, trackingAction]);

  const handleGenerateOtp = useCallback(async () => {
    if (!selectedShipment?.id) return;
    try {
      setLoading(true);
      const response = await dispatch(generateShipmentDeliveryOtp({
        shipmentId: selectedShipment.id,
        channels: ["in_app"],
      })).unwrap();
      const result = unwrapResult(response);
      toast.success(result?.otp ? `Delivery OTP generated: ${result.otp}` : "Delivery OTP generated");
      await refreshSelectedShipment(selectedShipment.id);
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to generate delivery OTP");
    } finally {
      setLoading(false);
    }
  }, [dispatch, refreshSelectedShipment, selectedShipment?.id]);

  const handleConfirmDelivery = useCallback(async () => {
    if (!selectedShipment?.id) return;
    if (!deliveryOtp.trim()) {
      toast.error("Enter customer OTP");
      return;
    }
    try {
      setLoading(true);
      await dispatch(confirmShipmentDelivery({
        shipmentId: selectedShipment.id,
        method: "otp",
        otp: deliveryOtp.trim(),
        note: "Customer OTP verified",
        source: "seller_panel",
      })).unwrap();
      toast.success("Delivery verified");
      setDeliveryOtp("");
      await refreshSelectedShipment(selectedShipment.id);
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to verify delivery");
    } finally {
      setLoading(false);
    }
  }, [deliveryOtp, dispatch, refreshSelectedShipment, selectedShipment?.id]);

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
      {
        key: "seller_id", label: "Seller", sortable: true, render: (value, row) => {
          const name = row.sellerName || row.seller?.name || row.seller?.companyName || sellerOptions.find((o) => o.value === value)?.label;
          return name ? <span className="text-sm font-medium text-gray-700">{name}</span> : <span className="font-mono text-xs text-gray-400">{value ? String(value).slice(0, 10) + "…" : "—"}</span>;
        }
      },
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
            <ActionButton onClick={() => openDetail(row)} title="View shipment details">
              View
            </ActionButton>
          </div>
        ),
      },
    ];
    return isSeller ? baseColumns.filter((column) => column.key !== "seller_id") : baseColumns;
  }, [isSeller, openDetail, sellerOptions]);

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Shipments"
        subtitle="Manage seller delivery progress, customer OTP verification, courier details, AWB, and tracking history"
        breadcrumbs={[{ label: "Shipping & Fulfilment" }, { label: "Shipments" }]}
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
        selectable={false}
        selectedKeys={[]}
        rowKey="id"
        requiredModule="delivery"
        exportConfig={{ filename: "shipments", columns, data: shipmentPayload.list }}
      />

      <DefaultModal isOpen={detailModal} onClose={() => setDetailModal(false)} title="Shipment Detail">
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
            <div><strong>Order:</strong> #{selectedShipment?.orderNumber || selectedShipment?.order_number || "Order"}</div>
            <div><strong>Status:</strong> <StatusBadge status={shipmentStepLabel(selectedShipment?.status || "initiated")} dot /></div>
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
              <div>
                <strong>Verification:</strong>{" "}
                {selectedShipment?.verification_required
                  ? `Required by ${displayStatus(
                    Array.isArray(selectedShipment?.verification_methods)
                      ? selectedShipment.verification_methods.join(" or ")
                      : selectedShipment?.verification_methods || "proof"
                  )}`
                  : "Not required"}
              </div>
              <div><strong>Verified:</strong> {selectedShipment?.delivered_verified_at ? moment(selectedShipment.delivered_verified_at).format("DD-MM-YYYY HH:mm") : "Not yet"}</div>
            </div>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
            <div className="font-semibold text-gray-800">Seller delivery actions</div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
              <select
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={trackingAction.status}
                onChange={(event) => setTrackingAction((prev) => ({ ...prev, status: event.target.value }))}
                disabled={selectedShipment?.status === "delivered_verified"}
              >
                {trackingActionOptions.length ? trackingActionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                )) : (
                  <option value={selectedShipment?.status || "initiated"}>{shipmentStepLabel(selectedShipment?.status || "initiated")}</option>
                )}
              </select>
              <input
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="Location"
                value={trackingAction.location}
                onChange={(event) => setTrackingAction((prev) => ({ ...prev, location: event.target.value }))}
                disabled={selectedShipment?.status === "delivered_verified"}
              />
              <input
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="Note"
                value={trackingAction.note}
                onChange={(event) => setTrackingAction((prev) => ({ ...prev, note: event.target.value }))}
                disabled={selectedShipment?.status === "delivered_verified"}
              />
              <ActionButton onClick={handleTrackingStatus} disabled={selectedShipment?.status === "delivered_verified" || !trackingActionOptions.length}>
                Update
              </ActionButton>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_auto]">
              <ActionButton
                onClick={handleGenerateOtp}
                disabledReason={selectedShipment?.status !== "out_for_delivery" ? "Move shipment to out for delivery first" : ""}
                disabled={selectedShipment?.status === "delivered_verified"}
              >
                Generate OTP
              </ActionButton>
              <input
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="Enter customer OTP"
                value={deliveryOtp}
                onChange={(event) => setDeliveryOtp(event.target.value)}
                disabled={selectedShipment?.status === "delivered_verified"}
              />
              <ActionButton
                onClick={handleConfirmDelivery}
                disabledReason={!selectedShipment?.delivery_otp_expires_at ? "Generate OTP first" : ""}
                disabled={selectedShipment?.status === "delivered_verified"}
              >
                Verify Delivery
              </ActionButton>
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

    </div>
  );
};

export default ShipmentTracking;
