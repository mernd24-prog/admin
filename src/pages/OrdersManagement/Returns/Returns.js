import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
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
import { DataTable, PageHeader, StatusBadge } from "../../../components/Shared";
import {
  approveReturn,
  closeReturn,
  getAdminReturns,
  qcReturn,
  receiveReturn,
  refundReturn,
  rejectReturn,
  replaceReturn,
  scheduleReturn,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";

const STATUSES = [
  "requested",
  "approved",
  "reverse_pickup_scheduled",
  "manual_ship_back",
  "shipped_back",
  "received",
  "qc_passed",
  "qc_failed",
  "refunded",
  "replaced",
  "rejected",
  "closed",
];

const REASONS = ["defective", "not_as_described", "changed_mind", "other"];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.items || data?.list || data || [],
    total: Number(data?.total || data?.items?.length || data?.list?.length || 0),
  };
};

const display = (value = "") => String(value || "N/A").replace(/_/g, " ");
const money = (value) => `INR ${Number(value || 0).toFixed(2)}`;
const returnId = (row) => row?._id || row?.id || row?.returnId;
const getInitialQuery = (key) => new URLSearchParams(window.location.search).get(key) || "";

const Returns = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.adminReturnsData);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [detailReturn, setDetailReturn] = useState(null);
  const [action, setAction] = useState({
    open: false,
    type: "",
    title: "",
    returnRequest: null,
    refundAmount: "",
    reason: "",
    note: "",
    trackingNumber: "",
    passed: true,
    condition: "",
    referenceId: "",
    method: "wallet_fallback",
    replacementOrderId: "",
    replacementShipmentId: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    reason: "",
    orderId: getInitialQuery("orderId"),
    buyerId: "",
    fromDate: "",
    toDate: "",
  });

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(getAdminReturns({
        ...filters,
        limit: 20,
        offset: (page - 1) * 20,
      })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, page]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      reason: "",
      orderId: "",
      buyerId: "",
      fromDate: "",
      toDate: "",
    });
    setPage(1);
  };

  const openAction = (type, returnRequest) => {
    const titles = {
      approve: "Approve Return",
      reject: "Reject Return",
      schedule: "Schedule Pickup",
      receive: "Receive Return",
      qc_pass: "QC Pass",
      qc_fail: "QC Fail",
      refund: "Process Refund",
      replace: "Create Replacement",
      close: "Close Return",
    };
    setAction({
      open: true,
      type,
      title: titles[type] || "Update Return",
      returnRequest,
      refundAmount: returnRequest?.refundAmount || returnRequest?.refundBreakup?.totalRefundAmount || "",
      reason: "",
      note: "",
      trackingNumber: returnRequest?.trackingNumber || "",
      passed: type !== "qc_fail",
      condition: type === "qc_fail" ? "damaged" : "sellable",
      referenceId: "",
      method: "wallet_fallback",
      replacementOrderId: "",
      replacementShipmentId: "",
    });
  };

  const submitAction = useCallback(async () => {
    if (!returnId(action.returnRequest)) return;
    const base = {
      returnId: returnId(action.returnRequest),
      refundAmount: Number(action.refundAmount || 0),
      reason: action.reason,
      note: action.note,
      trackingNumber: action.trackingNumber,
      passed: action.passed,
      condition: action.condition,
      notes: action.note,
      referenceId: action.referenceId,
      method: action.method,
      replacementOrderId: action.replacementOrderId,
      replacementShipmentId: action.replacementShipmentId,
    };
    if (action.type === "reject" && !action.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    try {
      setLoading(true);
      const map = {
        approve: approveReturn,
        reject: rejectReturn,
        schedule: scheduleReturn,
        receive: receiveReturn,
        qc_pass: qcReturn,
        qc_fail: qcReturn,
        refund: refundReturn,
        replace: replaceReturn,
        close: closeReturn,
      };
      await dispatch(map[action.type](base)).unwrap();
      toast.success("Return updated");
      setAction((prev) => ({ ...prev, open: false }));
      await fetchReturns();
    } catch (error) {
      toast.error(error?.message || error || "Failed to update return");
    } finally {
      setLoading(false);
    }
  }, [action, dispatch, fetchReturns]);

  const columns = useMemo(() => [
    {
      key: "orderId",
      label: "Return",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-800">{returnId(row)}</div>
          <div className="text-xs text-gray-400">Order {row.orderId}</div>
        </div>
      ),
    },
    { key: "buyerId", label: "Buyer" },
    {
      key: "reason",
      label: "Reason",
      render: (value) => <span className="capitalize">{display(value)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={display(value)} dot />,
    },
    {
      key: "refundAmount",
      label: "Refund",
      render: (value, row) => money(value || row.refundBreakup?.totalRefundAmount),
    },
    {
      key: "createdAt",
      label: "Requested",
      render: (value) => value ? moment(value).format("DD-MM-YYYY HH:mm") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setDetailReturn(row)}>
            <MdVisibility size={15} /> View
          </button>
          {row.status === "requested" && (
            <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("approve", row)}>
                <MdCheckCircle size={15} /> Approve
              </button>
              <button type="button" className="admin-btn-secondary !px-2 !py-1 text-red-600" onClick={() => openAction("reject", row)}>
                <MdClose size={15} /> Reject
              </button>
            </PermissionGuard>
          )}
          {["approved", "manual_ship_back"].includes(row.status) && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("schedule", row)}>
                <MdLocalShipping size={15} /> Pickup
              </button>
            </PermissionGuard>
          )}
          {["approved", "reverse_pickup_scheduled", "manual_ship_back", "shipped_back"].includes(row.status) && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("receive", row)}>
                <MdAssignmentReturn size={15} /> Receive
              </button>
            </PermissionGuard>
          )}
          {row.status === "received" && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("qc_pass", row)}>QC Pass</button>
              <button type="button" className="admin-btn-secondary !px-2 !py-1 text-red-600" onClick={() => openAction("qc_fail", row)}>QC Fail</button>
            </PermissionGuard>
          )}
          {row.status === "qc_passed" && (
            <PermissionGuard module="returns" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("refund", row)}>
                <MdReplay size={15} /> Refund
              </button>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("replace", row)}>Replace</button>
            </PermissionGuard>
          )}
          {!["closed", "refunded", "replaced"].includes(row.status) && (
            <PermissionGuard module="returns" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openAction("close", row)}>Close</button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Loader loading={loading} />
      <PageHeader
        title="Returns & Refunds"
        subtitle="Review RMA requests, QC, refund, and replacement lifecycle"
        breadcrumbs={[{ label: "Orders Management" }, { label: "Returns & Refunds" }]}
        actions={
          <button type="button" className="admin-btn-secondary" onClick={fetchReturns}>
            <MdRefresh size={17} /> Refresh
          </button>
        }
      />

      <div className="admin-card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="admin-input" placeholder="Search order/buyer/tracking" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
          <input className="admin-input" placeholder="Order ID" value={filters.orderId} onChange={(event) => setFilter("orderId", event.target.value)} />
          <input className="admin-input" placeholder="Buyer ID" value={filters.buyerId} onChange={(event) => setFilter("buyerId", event.target.value)} />
          <select className="admin-input" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{display(status)}</option>)}
          </select>
          <select className="admin-input" value={filters.reason} onChange={(event) => setFilter("reason", event.target.value)}>
            <option value="">All reasons</option>
            {REASONS.map((reason) => <option key={reason} value={reason}>{display(reason)}</option>)}
          </select>
          <input className="admin-input" type="date" value={filters.fromDate} onChange={(event) => setFilter("fromDate", event.target.value)} />
          <input className="admin-input" type="date" value={filters.toDate} onChange={(event) => setFilter("toDate", event.target.value)} />
          <button type="button" className="admin-btn-secondary" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total || payload.list.length}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        requiredModule="returns"
        exportConfig={{ filename: "returns-refunds", columns, data: payload.list }}
      />

      <DefaultModal isOpen={Boolean(detailReturn)} onClose={() => setDetailReturn(null)} title="Return Detail">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><strong>Return:</strong> {returnId(detailReturn)}</div>
            <div><strong>Order:</strong> {detailReturn?.orderId}</div>
            <div><strong>Buyer:</strong> {detailReturn?.buyerId}</div>
            <div><strong>Status:</strong> {display(detailReturn?.status)}</div>
            <div><strong>Reason:</strong> {display(detailReturn?.reason)}</div>
            <div><strong>Refund:</strong> {money(detailReturn?.refundAmount || detailReturn?.refundBreakup?.totalRefundAmount)}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Items</div>
            <div className="space-y-2">
              {(detailReturn?.items || []).map((item, index) => (
                <div key={`${item.productId}-${index}`} className="rounded border border-gray-100 p-3">
                  <div className="font-medium">{item.productId}</div>
                  <div className="text-xs text-gray-500">Qty {item.quantity} · Refund {money(item.refundAmount)}</div>
                  <div className="text-xs text-gray-500">Condition {display(item.condition)}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Timeline</div>
            <div className="space-y-2">
              {(detailReturn?.timeline || []).map((item, index) => (
                <div key={`${item.status}-${index}`} className="rounded border border-gray-100 p-3">
                  <div className="font-medium capitalize">{display(item.status)}</div>
                  <div className="text-xs text-gray-500">{item.at ? moment(item.at).format("DD-MM-YYYY HH:mm") : "N/A"} · {display(item.actorRole)}</div>
                  {item.note && <div className="text-xs text-gray-600 mt-1">{item.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={action.open} onClose={() => setAction((prev) => ({ ...prev, open: false }))} title={action.title} onSubmit={submitAction}>
        <div className="space-y-3">
          {["approve", "refund"].includes(action.type) && (
            <Input labelName="Refund Amount" type="number" value={action.refundAmount} onChange={(event) => setAction((prev) => ({ ...prev, refundAmount: event.target.value }))} />
          )}
          {action.type === "refund" && (
            <>
              <Input labelName="Reference ID" value={action.referenceId} onChange={(event) => setAction((prev) => ({ ...prev, referenceId: event.target.value }))} />
              <Input labelName="Method" value={action.method} onChange={(event) => setAction((prev) => ({ ...prev, method: event.target.value }))} />
            </>
          )}
          {action.type === "reject" && (
            <Input labelName="Reason" value={action.reason} onChange={(event) => setAction((prev) => ({ ...prev, reason: event.target.value }))} required />
          )}
          {action.type === "schedule" && (
            <Input labelName="Tracking Number" value={action.trackingNumber} onChange={(event) => setAction((prev) => ({ ...prev, trackingNumber: event.target.value }))} />
          )}
          {["qc_pass", "qc_fail"].includes(action.type) && (
            <Input labelName="Condition" value={action.condition} onChange={(event) => setAction((prev) => ({ ...prev, condition: event.target.value }))} />
          )}
          {action.type === "replace" && (
            <>
              <Input labelName="Replacement Order ID" value={action.replacementOrderId} onChange={(event) => setAction((prev) => ({ ...prev, replacementOrderId: event.target.value }))} />
              <Input labelName="Replacement Shipment ID" value={action.replacementShipmentId} onChange={(event) => setAction((prev) => ({ ...prev, replacementShipmentId: event.target.value }))} />
            </>
          )}
          <Input type="textarea" labelName="Note" value={action.note} onChange={(event) => setAction((prev) => ({ ...prev, note: event.target.value }))} />
        </div>
      </DefaultModal>
    </div>
  );
};

export default Returns;
