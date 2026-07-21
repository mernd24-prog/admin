import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "../../../utils/toast";
import { formatLabel, formatDateTime, formatCurrency } from "../../../utils/formatters";
import {
  RETURN_STATUS_OPTIONS,
  RETURN_REASON_OPTIONS,
  REFUND_STATUS_OPTIONS,
} from "../../../constants/statusConstants";
import { useDispatch, useSelector } from "react-redux";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import {
  MdAssignmentReturn,
  MdCheckCircle,
  MdClose,
  MdLocalShipping,
  MdRefresh,
  MdReplay,
  MdVisibility,
} from "react-icons/md";
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
  approveReturn,
  closeReturn,
  getAdminReturn,
  getAdminReturns,
  qcReturn,
  receiveReturn,
  refundReturn,
  rejectReturn,
  replaceReturn,
  retryReturnRefund,
  scheduleReturn,
  syncReturnRefund,
  updateReturnReverseTracking,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const ACTION_TITLES = {
  approve: "Approve Return",
  reject: "Reject Return",
  schedule: "Schedule Pickup",
  tracking: "Update Reverse Shipment",
  receive: "Receive Return",
  qc: "Record Item QC",
  refund: "Process Refund",
  retry_refund: "Retry Refund",
  sync_refund: "Sync Provider Refund",
  replacement_request: "Request Replacement",
  replacement_approve: "Approve Replacement",
  replacement_ship: "Ship Replacement",
  replacement_deliver: "Confirm Replacement Delivery",
  replacement_complete: "Complete Replacement",
  close: "Close Return",
};

const FILTER_FIELDS = [
  { key: "orderId", type: "text", label: "Order #", width: "w-48" },
  {
    key: "buyerId",
    type: "asyncDropdown",
    label: "Buyer",
    width: "w-52",
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  { key: "status", type: "select", label: "Status", options: RETURN_STATUS_OPTIONS },
  { key: "refundStatus", type: "select", label: "Refund Status", options: REFUND_STATUS_OPTIONS },
  { key: "shipmentStatus", type: "text", label: "Reverse Shipment", width: "w-44" },
  { key: "reason", type: "select", label: "Reason", options: RETURN_REASON_OPTIONS },
  // { key: "fromDate", type: "date", label: "From" },
  // { key: "toDate", type: "date", label: "To" },
];

const EMPTY_ACTION = {
  open: false,
  type: "",
  title: "",
  returnRequest: null,
  refundAmount: "",
  reason: "",
  note: "",
  trackingNumber: "",
  provider: "manual",
  courierName: "",
  mode: "reverse_pickup",
  shippingMode: "standard",
  pickupScheduledAt: "",
  expectedDeliveryAt: "",
  shipmentStatus: "picked_up",
  location: "",
  referenceId: "",
  method: "auto",
  walletAmount: "",
  providerAmount: "",
  itemActions: [],
};

const ADMIN_ONLY_RETURN_ACTIONS = new Set([
  "reject", "refund", "retry_refund", "sync_refund",
  "replacement_approve", "replacement_deliver", "replacement_complete",
]);

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.items || data?.list || data || [],
    total: Number(data?.total || data?.items?.length || data?.list?.length || 0),
  };
};

const unwrapResult = (payload = {}) => payload?.data?.data || payload?.data || payload || {};
const display = (value) => formatLabel(value);
const money = (value) => formatCurrency(value, "—");
const returnId = (row) => row?._id || row?.id || row?.returnId;
const getInitialQuery = (key) => new URLSearchParams(window.location.search).get(key) || "";
const personName = (person = {}) => person?.displayName || person?.fullName || person?.name ||
  [person?.firstName || person?.profile?.firstName, person?.lastName || person?.profile?.lastName]
    .filter(Boolean)
    .join(" ") || person?.businessName || person?.email || "";
const buyerName = (row = {}) => row?.buyerName || personName(row?.buyer) || personName(row?.buyerSnapshot);
const buyerContact = (row = {}) => row?.buyerEmail || row?.buyer?.email || row?.buyerSnapshot?.email ||
  row?.buyerPhone || row?.buyer?.phone || row?.buyerSnapshot?.phone || "";
const orderNumber = (row = {}) => row?.orderNumber || row?.order_number || row?.order?.orderNumber || row?.order?.order_number;
const sellerName = (item = {}, row = {}) => item?.sellerName || personName(item?.seller) ||
  row?.sellerName || personName(row?.seller);

const Returns = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.adminReturnsData);
  const filterFields = useMemo(
    () => isSeller ? FILTER_FIELDS.filter((field) => field.key !== "sellerId") : FILTER_FIELDS,
    [isSeller],
  );
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
    defaultFilters: { orderId: getInitialQuery("orderId") },
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailReturn, setDetailReturn] = useState(null);
  const [action, setAction] = useState(EMPTY_ACTION);
  const [confirmAction, setConfirmAction] = useState({ open: false });

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getAdminReturns({
        ...params,
        offset: (params.page - 1) * params.limit,
      })).unwrap();
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to load returns";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const openDetail = useCallback(async (row) => {
    setDetailReturn(row);
    try {
      setLoading(true);
      const response = await dispatch(getAdminReturn({ returnId: returnId(row) })).unwrap();
      setDetailReturn(unwrapResult(response));
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to load return detail");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const openAction = useCallback((type, returnRequest) => {
    if (isSeller && ADMIN_ONLY_RETURN_ACTIONS.has(type)) {
      toast.error("This return action is admin-only");
      return;
    }
    setAction({
      ...EMPTY_ACTION,
      open: true,
      type,
      title: ACTION_TITLES[type] || "Update Return",
      returnRequest,
      refundAmount: returnRequest?.refundAmount || returnRequest?.refundBreakup?.totalRefundAmount || "",
      trackingNumber: returnRequest?.trackingNumber || "",
      provider: returnRequest?.reverseShipment?.provider || "manual",
      courierName: returnRequest?.reverseShipment?.courierName || "",
      referenceId: ["refund", "retry_refund"].includes(type)
        ? returnRequest?.refund?.referenceId || `return_${returnId(returnRequest)}`
        : "",
      method: returnRequest?.refund?.method || "auto",
      walletAmount: returnRequest?.refundBreakup?.walletRefundAmount || "",
      providerAmount: returnRequest?.refundBreakup?.originalPaymentRefundAmount || "",
      itemActions: (returnRequest?.items || []).map((item) => ({
        orderItemId: item.orderItemId || "",
        productId: item.productId || "",
        variantSku: item.variantSku || "",
        label: item.productTitle || item.productId || "Item",
        approvedQuantity: Number(item.approvedQuantity || item.requestedQuantity || item.quantity || 0),
        receivedQuantity: Number(item.receivedQuantity || item.approvedQuantity || item.requestedQuantity || item.quantity || 0),
        quantity: Number(item.receivedQuantity || item.approvedQuantity || item.requestedQuantity || item.quantity || 0),
        result: item.qcResult === "pending" || !item.qcResult ? "sellable" : item.qcResult,
        condition: item.condition || "",
        notes: item.qcNotes || "",
      })),
    });
  }, [isSeller]);

  const updateItemAction = (index, key, value) => {
    setAction((prev) => ({
      ...prev,
      itemActions: prev.itemActions.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }));
  };

  const validateAction = () => {
    if (!returnId(action.returnRequest)) return "Return ID is missing";
    if (((!isSeller && action.type === "approve") || ["refund", "retry_refund"].includes(action.type)) && Number(action.refundAmount || 0) <= 0) {
      return "Refund amount must be greater than zero";
    }
    if (action.type === "reject" && !action.reason.trim()) return "Rejection reason is required";
    if (["refund", "retry_refund"].includes(action.type) && action.referenceId.trim().length < 3) return "Refund reference ID is required";
    if (action.type === "schedule" && action.mode === "reverse_pickup" && !action.provider.trim()) return "Shipping provider is required";
    if (action.type === "tracking" && !action.shipmentStatus) return "Shipment status is required";
    if (["approve", "receive", "qc"].includes(action.type) && !action.itemActions.length) return "Return items are missing";
    if (action.type === "replacement_ship" && (!action.courierName.trim() || !action.trackingNumber.trim())) {
      return "Courier and tracking/AWB are required";
    }
    if (action.type === "close" && !action.reason.trim() && !action.note.trim()) return "Close reason or note is required";
    return "";
  };

  const prepareAction = () => {
    if (isSeller && ADMIN_ONLY_RETURN_ACTIONS.has(action.type)) {
      toast.error("This return action is admin-only");
      return;
    }
    const validationMessage = validateAction();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setConfirmAction({
      open: true,
      title: `${ACTION_TITLES[action.type] || "Update Return"}?`,
      message: `This will update return ${returnId(action.returnRequest)} to the next lifecycle state.`,
    });
  };

  const executeAction = useCallback(async () => {
    if (isSeller && ADMIN_ONLY_RETURN_ACTIONS.has(action.type)) {
      toast.error("This return action is admin-only");
      return;
    }
    const base = {
      returnId: returnId(action.returnRequest),
      refundAmount: Number(action.refundAmount || 0),
      reason: action.reason,
      note: action.note,
      trackingNumber: action.trackingNumber,
      notes: action.note,
      referenceId: action.referenceId,
      method: action.method,
      walletAmount: action.method === "split" ? Number(action.walletAmount || 0) : undefined,
      providerAmount: action.method === "split" ? Number(action.providerAmount || 0) : undefined,
      provider: action.provider,
      courierName: action.courierName,
      mode: action.mode,
      shippingMode: action.shippingMode,
      pickupScheduledAt: action.pickupScheduledAt || undefined,
      expectedDeliveryAt: action.expectedDeliveryAt || undefined,
      status: action.shipmentStatus,
      location: action.location,
      action: action.type.startsWith("replacement_") ? action.type.replace("replacement_", "") : undefined,
      items: action.type === "approve"
        ? action.itemActions.map((item) => ({
            orderItemId: item.orderItemId,
            productId: item.productId,
            variantSku: item.variantSku,
            approvedQuantity: Number(item.approvedQuantity || 0),
          }))
        : action.type === "receive"
          ? action.itemActions.map((item) => ({
              orderItemId: item.orderItemId,
              productId: item.productId,
              variantSku: item.variantSku,
              receivedQuantity: Number(item.receivedQuantity || 0),
            }))
          : action.type === "qc"
            ? action.itemActions.map((item) => ({
                orderItemId: item.orderItemId,
                productId: item.productId,
                variantSku: item.variantSku,
                quantity: Number(item.quantity || 0),
                result: item.result,
                condition: item.condition,
                notes: item.notes,
              }))
            : undefined,
    };
    const actionMap = {
      approve: approveReturn,
      reject: rejectReturn,
      schedule: scheduleReturn,
      tracking: updateReturnReverseTracking,
      receive: receiveReturn,
      qc: qcReturn,
      refund: refundReturn,
      retry_refund: retryReturnRefund,
      sync_refund: syncReturnRefund,
      replacement_request: replaceReturn,
      replacement_approve: replaceReturn,
      replacement_ship: replaceReturn,
      replacement_deliver: replaceReturn,
      replacement_complete: replaceReturn,
      close: closeReturn,
    };
    const actionCreator = actionMap[action.type];
    if (typeof actionCreator !== "function") {
      toast.error("The return action is no longer available. Please open it again.");
      setConfirmAction({ open: false });
      return;
    }
    try {
      setLoading(true);
      await dispatch(actionCreator(base)).unwrap();
      toast.success("Return updated");
      setAction(EMPTY_ACTION);
      setConfirmAction({ open: false });
      await fetchReturns();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to update return");
    } finally {
      setLoading(false);
    }
  }, [action, dispatch, fetchReturns, isSeller]);

  const columns = useMemo(() => [
    {
      key: "orderId",
      label: "Return",
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.returnNumber || returnId(row)}</div>
          <div className="text-xs text-gray-400">Order {row.orderId}</div>
        </div>
      ),
    },
    {
      key: "buyerId",
      label: "Buyer",
      sortable: true,
      render: (value, row) => {
        const name = buyerName(row);
        const email = row.buyerEmail || row.buyer?.email || row.buyerSnapshot?.email;
        return (
          <div>
            {name && <div className="text-sm font-medium text-gray-800">{name}</div>}
            {email && !name && <div className="text-sm text-gray-700">{email}</div>}
            {email && name && <div className="text-xs text-gray-400">{email}</div>}
            {!name && !email && value && (
              <span className="font-mono text-xs text-gray-500">
                {String(value).slice(0, 16)}{String(value).length > 16 ? "…" : ""}
              </span>
            )}
            {!name && !email && !value && "—"}
          </div>
        );
      },
    },
    {
      key: "reason",
      label: "Reason",
      sortable: true,
      render: (value) => <span className="capitalize">{display(value)}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={display(value)} dot />,
    },
    {
      key: "refundAmount",
      label: "Refund",
      sortable: true,
      render: (value, row) => money(value || row.refundBreakup?.totalRefundAmount),
    },
    {
      key: "createdAt",
      label: "Requested",
      sortable: true,
      render: (value) => formatDateTime(value),
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "min-w-[360px]",
      cellClassName: "min-w-[360px]",
      render: (_, row) => (
        <div className="admin-table-actions-nowrap">
          <PermissionGuard module="returns" action={ACTIONS.VIEW} hide>
            <button type="button" className="admin-table-action-btn" onClick={() => openDetail(row)}>
              <MdVisibility size={15} /> View
            </button>
          </PermissionGuard>
          {row.status === "requested" && (
            <>
              {(!isSeller || ["replacement", "exchange"].includes(row.resolution)) && (
                <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
                  <button type="button" className="admin-table-action-btn" onClick={() => openAction("approve", row)}>
                    <MdCheckCircle size={15} /> {isSeller ? "Approve Exchange" : "Approve"}
                  </button>
                </PermissionGuard>
              )}
              {!isSeller && (
                <PermissionGuard module="returns" action={ACTIONS.REJECT} hide>
                  <button type="button" className="admin-table-action-btn danger" onClick={() => openAction("reject", row)}>
                    <MdClose size={15} /> Reject
                  </button>
                </PermissionGuard>
              )}
            </>
          )}
          {["approved", "pickup_failed"].includes(row.status) && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("schedule", row)}>
                <MdLocalShipping size={15} /> Pickup
              </button>
            </PermissionGuard>
          )}
          {["reverse_pickup_scheduled", "pickup_failed", "in_reverse_transit"].includes(row.status) && row.reverseShipment?.shipmentId && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("tracking", row)}>
                <MdLocalShipping size={15} /> Tracking
              </button>
            </PermissionGuard>
          )}
          {["approved", "reverse_pickup_scheduled", "manual_ship_back", "shipped_back", "in_reverse_transit"].includes(row.status) && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("receive", row)}>
                <MdAssignmentReturn size={15} /> Receive
              </button>
            </PermissionGuard>
          )}
          {row.status === "received" && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("qc", row)}>Record QC</button>
            </PermissionGuard>
          )}
          {["qc_passed", "qc_completed"].includes(row.status) && (
            <>
              {!isSeller && (
                <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
                  <button type="button" className="admin-table-action-btn" onClick={() => openAction("refund", row)}>
                    <MdReplay size={15} /> Refund
                  </button>
                </PermissionGuard>
              )}
              {(!isSeller || ["replacement", "exchange"].includes(row.resolution)) && (
                <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
                  <button type="button" className="admin-table-action-btn" onClick={() => openAction("replacement_request", row)}>Request Replacement</button>
                </PermissionGuard>
              )}
            </>
          )}
          {!isSeller && row.status === "replacement_requested" && (
            <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("replacement_approve", row)}>Approve Replacement</button>
            </PermissionGuard>
          )}
          {row.status === "replacement_created" && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("replacement_ship", row)}>Ship Replacement</button>
            </PermissionGuard>
          )}
          {!isSeller && row.status === "replacement_shipped" && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("replacement_deliver", row)}>Confirm Delivery</button>
            </PermissionGuard>
          )}
          {!isSeller && row.status === "replacement_delivered" && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("replacement_complete", row)}>Complete</button>
            </PermissionGuard>
          )}
          {!isSeller && row.status === "refund_failed" && (
            <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("retry_refund", row)}>
                <MdReplay size={15} /> Retry
              </button>
            </PermissionGuard>
          )}
          {!isSeller && ["refund_pending", "refund_failed"].includes(row.status) && row.refund?.providerRefundId && (
            <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("sync_refund", row)}>
                <MdRefresh size={15} /> Sync
              </button>
            </PermissionGuard>
          )}
          {!["closed", "refunded", "replaced"].includes(row.status) && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-table-action-btn" onClick={() => openAction("close", row)}>Close</button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ], [isSeller, openAction, openDetail]);

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Returns & Refunds"
        subtitle="Review RMA requests, QC, refunds, and replacement lifecycle"
        breadcrumbs={[{ label: isSeller ? "Orders" : "Returns & Cancellations" }, { label: "Returns & Refunds" }]}
      />

      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total || payload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search return, order, buyer, or tracking"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchReturns}
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
        requiredModule="returns"
        tableContainerClassName="overflow-x-auto overscroll-x-contain"
        tableClassName="min-w-[1480px]"
        exportConfig={{ filename: "returns-refunds", columns, data: payload.list }}
      />

      <DefaultModal isOpen={Boolean(detailReturn)} onClose={() => setDetailReturn(null)} title="Return Detail" isButtonView={false} width="640px">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><strong>Return number:</strong> {detailReturn?.returnNumber || "Not assigned"}</div>
            <div><strong>Order:</strong> {orderNumber(detailReturn) || "Not available"}</div>
            <div>
              <strong>Buyer:</strong> {buyerName(detailReturn) || "Not assigned"}
              {buyerContact(detailReturn) && (
                <div className="mt-1 text-xs text-gray-500">{buyerContact(detailReturn)}</div>
              )}
            </div>
            <div><strong>Resolution:</strong> {display(detailReturn?.resolution)}</div>
            <div><strong>Status:</strong> {display(detailReturn?.status)}</div>
            <div><strong>Reason:</strong> {display(detailReturn?.reason)}</div>
            <div><strong>Refund:</strong> {money(detailReturn?.refundAmount || detailReturn?.refundBreakup?.totalRefundAmount)}</div>
            <div><strong>Reference:</strong> {detailReturn?.refundReferenceId || "Not available"}</div>
            <div><strong>Method:</strong> {display(detailReturn?.refundMethod)}</div>
            <div><strong>Refund status:</strong> {display(detailReturn?.refund?.status)}</div>
            <div><strong>Provider refund:</strong> {detailReturn?.refund?.providerRefundId || detailReturn?.providerRefundId || "Not available"}</div>
          </div>
          <div className="rounded border border-gray-100 p-3">
            <div className="font-semibold text-gray-700 mb-2">Eligibility &amp; Reverse Shipping</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>Window: {detailReturn?.policySnapshot?.returnWindowDays ? `${detailReturn.policySnapshot.returnWindowDays} days` : "Not available"}</div>
              <div>Eligible Until: {formatDateTime(detailReturn?.policySnapshot?.eligibleUntil)}</div>
              <div>AWB: {detailReturn?.reverseShipment?.awbNumber || detailReturn?.reverseShipment?.shipment?.awb_number || "Not assigned"}</div>
              <div>Courier: {detailReturn?.reverseShipment?.courierName || detailReturn?.reverseShipment?.provider || "Not assigned"}</div>
              <div>Tracking: {detailReturn?.reverseShipment?.trackingNumber || detailReturn?.reverseShipment?.shipment?.tracking_number || detailReturn?.trackingNumber || "Not available"}</div>
              <div>Shipment Status: {display(detailReturn?.reverseShipment?.status)}</div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Items</div>
            <div className="space-y-2">
              {(detailReturn?.items || []).map((item, index) => {
                const productLabel = item.productTitle || item.productName || item.product?.title || item.product?.name;
                const sellerLabel = sellerName(item, detailReturn);
                const itemPolicy = item.policySnapshot || item.policy_snapshot || {};
                const itemReturnWindow = item.returnWindowDays || item.return_window_days || itemPolicy.returnWindowDays || itemPolicy.return_window_days;
                const itemEligibleUntil = item.returnEligibleUntil || item.return_eligible_until || itemPolicy.eligibleUntil || itemPolicy.returnUntil;
                const requiresImages = item.requiresImages ?? item.requires_images ?? itemPolicy.requiresImages ?? itemPolicy.requires_images;
                const inspectionRequired = item.inspectionRequired ?? item.inspection_required ?? itemPolicy.inspectionRequired ?? itemPolicy.inspection_required;
                return (
                  <div key={`${item.productId}-${index}`} className="rounded border border-gray-100 p-3">
                    <div className="font-medium">{productLabel || "Product details unavailable"}</div>
                    <div className="text-xs text-gray-500">
                      Seller: {sellerLabel || "Not assigned"} · SKU: {item.variantSku || item.productSku || "Not available"}
                    </div>
                    <div className="text-xs text-gray-500">
                      Return window: {itemReturnWindow ? `${itemReturnWindow} days` : "Not available"} · Eligible until: {formatDateTime(itemEligibleUntil)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Images: {requiresImages ? "Required" : "Optional"} · Inspection: {inspectionRequired === false ? "Not required" : "Required"}
                    </div>
                    <div className="text-xs text-gray-500">Requested {item.requestedQuantity || item.quantity} · Approved {item.approvedQuantity || 0} · Received {item.receivedQuantity || 0}</div>
                    <div className="text-xs text-gray-500">Refund {money(item.refundAmount)} · QC {display(item.qcResult)} · Restocked {item.restockedQuantity || 0} · Damaged {item.damagedQuantity || 0}</div>
                    <div className="text-xs text-gray-500">Condition {display(item.condition)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Refund attempts</div>
            <div className="space-y-2">
              {(detailReturn?.refund?.attempts || []).map((attempt, index) => (
                <div key={attempt.attemptId || index} className="rounded border border-gray-100 p-3 text-xs text-gray-600">
                  <div className="font-medium text-gray-800">{display(attempt.status)} · {money(attempt.amount)}</div>
                  <div>{display(attempt.method)} · Wallet {money(attempt.walletAmount)} · Provider {money(attempt.providerAmount)}</div>
                  {attempt.providerRefundId && <div>Provider ID: {attempt.providerRefundId}</div>}
                  {attempt.failureReason && <div className="text-red-600">{attempt.failureReason}</div>}
                </div>
              ))}
              {!detailReturn?.refund?.attempts?.length && <div className="text-xs text-gray-500">No refund attempts.</div>}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Timeline</div>
            <div className="space-y-2">
              {(detailReturn?.timeline || []).map((item, index) => (
                <div key={`${item.status}-${index}`} className="rounded border border-gray-100 p-3">
                  <div className="font-medium capitalize">{display(item.status)}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(item.at)} · {display(item.actorRole)}</div>
                  {item.reason && <div className="text-xs text-gray-600 mt-1">Reason: {item.reason}</div>}
                  {item.note && <div className="text-xs text-gray-600 mt-1">{item.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal
        isOpen={action.open}
        onClose={() => setAction(EMPTY_ACTION)}
        title={action.title}
        onSubmit={prepareAction}
        submitButtonText="Continue"
        closeButtonText="Cancel"
        loading={loading}
      >
        <div className="space-y-3">
          {((!isSeller && action.type === "approve") || ["refund", "retry_refund"].includes(action.type)) && (
            <Input labelName="Refund Amount" type="number" min="0" value={action.refundAmount} onChange={(event) => setAction((prev) => ({ ...prev, refundAmount: event.target.value }))} required />
          )}
          {["refund", "retry_refund"].includes(action.type) && (
            <>
              <Input labelName="Reference ID" value={action.referenceId} onChange={(event) => setAction((prev) => ({ ...prev, referenceId: event.target.value }))} required />
              <label className="block text-sm text-gray-700">
                <span className="mb-1 block">Refund method</span>
                <select className="admin-input w-full" value={action.method} onChange={(event) => setAction((prev) => ({ ...prev, method: event.target.value }))}>
                  <option value="auto">Automatic allocation</option>
                  <option value="original_payment">Original payment</option>
                  <option value="wallet">Wallet credit</option>
                  <option value="split">Wallet + original payment</option>
                  <option value="manual">Manual bank/cash refund</option>
                </select>
              </label>
              {action.method === "split" && (
                <div className="grid grid-cols-2 gap-3">
                  <Input labelName="Wallet amount" type="number" min="0" value={action.walletAmount} onChange={(event) => setAction((prev) => ({ ...prev, walletAmount: event.target.value }))} />
                  <Input labelName="Provider amount" type="number" min="0" value={action.providerAmount} onChange={(event) => setAction((prev) => ({ ...prev, providerAmount: event.target.value }))} />
                </div>
              )}
            </>
          )}
          {["reject", "close"].includes(action.type) && (
            <Input labelName={action.type === "reject" ? "Reason" : "Close Reason"} value={action.reason} onChange={(event) => setAction((prev) => ({ ...prev, reason: event.target.value }))} required={action.type === "reject"} />
          )}
          {action.type === "schedule" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block">Return mode</span>
                  <select className="admin-input w-full" value={action.mode} onChange={(event) => setAction((prev) => ({ ...prev, mode: event.target.value }))}>
                    <option value="reverse_pickup">Platform reverse pickup</option>
                    <option value="manual_ship_back">Customer ship back</option>
                  </select>
                </label>
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block">Shipping mode</span>
                  <select className="admin-input w-full" value={action.shippingMode} onChange={(event) => setAction((prev) => ({ ...prev, shippingMode: event.target.value }))}>
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                    <option value="same_day">Same day</option>
                    <option value="hyperlocal">Hyperlocal</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input labelName="Provider" value={action.provider} onChange={(event) => setAction((prev) => ({ ...prev, provider: event.target.value }))} required={action.mode === "reverse_pickup"} />
                <Input labelName="Courier" value={action.courierName} onChange={(event) => setAction((prev) => ({ ...prev, courierName: event.target.value }))} />
                <Input labelName="Tracking / AWB" value={action.trackingNumber} onChange={(event) => setAction((prev) => ({ ...prev, trackingNumber: event.target.value }))} />
                <Input labelName="Pickup date" type="datetime-local" value={action.pickupScheduledAt} onChange={(event) => setAction((prev) => ({ ...prev, pickupScheduledAt: event.target.value }))} />
              </div>
            </>
          )}
          {action.type === "tracking" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm text-gray-700">
                <span className="mb-1 block">Shipment status</span>
                <select className="admin-input w-full" value={action.shipmentStatus} onChange={(event) => setAction((prev) => ({ ...prev, shipmentStatus: event.target.value }))}>
                  <option value="picked_up">Picked up</option>
                  <option value="in_transit">In reverse transit</option>
                  <option value="pickup_failed">Pickup failed</option>
                  <option value="delivered">Received at warehouse</option>
                </select>
              </label>
              <Input labelName="Location" value={action.location} onChange={(event) => setAction((prev) => ({ ...prev, location: event.target.value }))} />
            </div>
          )}
          {["approve", "receive", "qc"].includes(action.type) && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">Item decisions</div>
              {action.itemActions.map((item, index) => (
                <div key={`${item.orderItemId || item.productId}-${index}`} className="rounded border border-gray-200 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-800">{item.label}</div>
                  {action.type === "approve" && (
                    <Input labelName="Approved quantity" type="number" min="0" value={item.approvedQuantity} onChange={(event) => updateItemAction(index, "approvedQuantity", event.target.value)} required />
                  )}
                  {action.type === "receive" && (
                    <Input labelName="Received quantity" type="number" min="0" value={item.receivedQuantity} onChange={(event) => updateItemAction(index, "receivedQuantity", event.target.value)} required />
                  )}
                  {action.type === "qc" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input labelName="QC quantity" type="number" min="0" value={item.quantity} onChange={(event) => updateItemAction(index, "quantity", event.target.value)} required />
                      <label className="block text-sm text-gray-700">
                        <span className="mb-1 block">Disposition</span>
                        <select className="admin-input w-full" value={item.result} onChange={(event) => updateItemAction(index, "result", event.target.value)}>
                          <option value="sellable">Sellable - restock</option>
                          <option value="damaged">Damaged - quarantine</option>
                          <option value="missing">Missing</option>
                          <option value="rejected">Rejected by QC</option>
                        </select>
                      </label>
                      <Input labelName="Condition" value={item.condition} onChange={(event) => updateItemAction(index, "condition", event.target.value)} />
                      <Input labelName="Item note" value={item.notes} onChange={(event) => updateItemAction(index, "notes", event.target.value)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {action.type === "replacement_ship" && (
            <>
              <Input labelName="Courier" value={action.courierName} onChange={(event) => setAction((prev) => ({ ...prev, courierName: event.target.value }))} required />
              <Input labelName="Tracking / AWB" value={action.trackingNumber} onChange={(event) => setAction((prev) => ({ ...prev, trackingNumber: event.target.value }))} required />
            </>
          )}
          <Input type="textarea" labelName="Note" value={action.note} onChange={(event) => setAction((prev) => ({ ...prev, note: event.target.value }))} />
        </div>
      </DefaultModal>

      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false })}
        onConfirm={executeAction}
        title={confirmAction.title}
        message={confirmAction.message}
        variant={action.type === "reject" || action.type === "close" ? "danger" : "warning"}
        confirmLabel="Confirm"
        loading={loading}
      />
    </div>
  );
};

export default Returns;
