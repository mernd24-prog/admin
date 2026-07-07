import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdCheckCircle, MdRefresh, MdSettings, MdVisibility, MdCancel } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  approvePayment,
  getAdminPayments,
  rejectPayment,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const PROVIDERS = [
  "razorpay",
  "cod",
  "manual_bank_transfer",
  "manual_upi",
  "wallet_only",
];
const STATUSES = ["initiated", "authorized", "captured", "failed", "partially_refunded", "refunded"];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const display = (value = "") => String(value || "N/A").replace(/_/g, " ");
const money = (value) => Number(value || 0).toFixed(2);
const FILTER_FIELDS = [
  { key: "orderId", type: "text", label: "Order #", width: "w-48" },
  {
    key: "buyerId",
    type: "asyncDropdown",
    label: "Buyer",
    width: "w-52",
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  { key: "provider", type: "select", label: "Provider", options: PROVIDERS.map((value) => ({ value, label: display(value) })) },
  { key: "status", type: "select", label: "Status", options: STATUSES.map((value) => ({ value, label: display(value) })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const getInitialQuery = (key) => new URLSearchParams(window.location.search).get(key) || "";

const Payments = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.adminPaymentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: { orderId: getInitialQuery("orderId") },
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailPayment, setDetailPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decision, setDecision] = useState({ open: false, type: "", payment: null, referenceId: "", reason: "" });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getAdminPayments({
        ...params,
        offset: (params.page - 1) * params.limit,
      })).unwrap();
    } catch (error) {
      const message = error?.message || error || "Failed to load payments";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openDetail = useCallback(async (payment) => {
    setDetailPayment(payment);
    setDetailLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.payments.detail(payment.id));
      setDetailPayment(response?.data?.data || payment);
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Failed to load payment detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitDecision = useCallback(async () => {
    if (!decision.payment?.id) return;
    if (decision.type === "approve" && decision.referenceId.trim().length < 3) {
      toast.error("A payment collection/reference ID is required to approve");
      return;
    }
    if (decision.type === "reject" && !decision.reason.trim()) {
      toast.error("Reason is required to reject a payment");
      return;
    }
    try {
      setLoading(true);
      const action = decision.type === "approve" ? approvePayment : rejectPayment;
      await dispatch(action({
        paymentId: decision.payment.id,
        referenceId: decision.referenceId,
        reason: decision.reason,
      })).unwrap();
      toast.success(decision.type === "approve" ? "Payment approved" : "Payment rejected");
      setDecision({ open: false, type: "", payment: null, referenceId: "", reason: "" });
      await fetchPayments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to update payment");
    } finally {
      setLoading(false);
    }
  }, [decision, dispatch, fetchPayments]);

  const canManualDecision = (payment) =>
    ["manual_bank_transfer", "manual_upi", "cod"].includes(payment.provider) &&
    ["initiated", "authorized"].includes(payment.status);

  const columns = useMemo(() => [
    {
      key: "transaction_reference",
      label: "Payment",
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-800">{display(row.provider)} payment</div>
          <div className="text-xs text-gray-400">Order #{row.orderNumber || "Order"}</div>
        </div>
      ),
    },
    {
      key: "buyer_id",
      label: "Buyer",
      sortable: true,
      render: (value, row) => {
        const name = row.buyerName || row.buyer?.displayName || row.buyer?.name || row.buyerSnapshot?.name || row.buyer_name;
        const email = row.buyerEmail || row.buyer?.email || row.buyerSnapshot?.email || row.buyer_email;
        return (
          <div>
            {name && <div className="text-sm font-medium text-gray-800">{name}</div>}
            {email && !name && <div className="text-sm text-gray-700">{email}</div>}
            {email && name && <div className="text-xs text-gray-400">{email}</div>}
            {!name && !email && <span className="text-xs text-gray-500">Customer details unavailable</span>}
          </div>
        );
      },
    },
    {
      key: "provider",
      label: "Provider",
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
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => `${row.currency || "INR"} ${money(value)}`,
    },
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      render: (value) => value ? moment(value).format("DD-MM-YYYY HH:mm") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openDetail(row)}>
            <MdVisibility size={15} /> View
          </button>
          {canManualDecision(row) && (
            <PermissionGuard module="payments" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setDecision({ open: true, type: "approve", payment: row, referenceId: row.provider_payment_id || row.transaction_reference || "", reason: "" })}>
                <MdCheckCircle size={15} /> Approve
              </button>
              <button type="button" className="admin-btn-secondary !px-2 !py-1 text-red-600" onClick={() => setDecision({ open: true, type: "reject", payment: row, referenceId: row.provider_payment_id || "", reason: "" })}>
                <MdCancel size={15} /> Reject
              </button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ], [openDetail]);

  return (
    <div>
      <Loader loading={loading || detailLoading} />
      <PageHeader
        title="Payments"
        subtitle="Reconcile online, COD, and manual payments"
        breadcrumbs={[{ label: "Payments & Finance" }, { label: "Payments" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-btn-secondary" onClick={() => navigate("/app/cod-config")}>
              <MdSettings size={17} /> COD Settings
            </button>
            <button type="button" className="admin-btn-secondary" onClick={fetchPayments}>
              <MdRefresh size={17} /> Refresh
            </button>
          </div>
        }
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
        searchPlaceholder="Search payment, provider reference, or order"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchPayments}
        error={error}
        filterBar={(
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        )}
        requiredModule="payments"
        exportConfig={{ filename: "payments", columns, data: payload.list }}
      />

      <DefaultModal isOpen={Boolean(detailPayment)} onClose={() => setDetailPayment(null)} title="Payment Detail">
        <div className="space-y-3 text-sm" aria-busy={detailLoading}>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
            <div><strong>Order:</strong> #{detailPayment?.orderNumber || "Order"}</div>
            <div><strong>Customer:</strong> {detailPayment?.buyerName || detailPayment?.buyer?.displayName || "Customer"}</div>
            <div><strong>Email:</strong> {detailPayment?.buyer?.email || "Not available"}</div>
            <div><strong>Provider:</strong> {display(detailPayment?.provider)}</div>
            <div><strong>Status:</strong> {display(detailPayment?.status)}</div>
            <div><strong>Amount:</strong> {detailPayment?.currency || "INR"} {money(detailPayment?.amount)}</div>
            <div><strong>Verification:</strong> {display(detailPayment?.verification_method || "not verified")}</div>
            <div><strong>Created:</strong> {detailPayment?.created_at ? moment(detailPayment.created_at).format("DD-MM-YYYY HH:mm") : "N/A"}</div>
          </div>
          {(detailPayment?.provider_payment_id || detailPayment?.transaction_reference) && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-800">
              <strong>Payment reference:</strong> {detailPayment.provider_payment_id || detailPayment.transaction_reference}
            </div>
          )}
          {detailPayment?.failed_reason && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-red-700"><strong>Failure reason:</strong> {detailPayment.failed_reason}</div>}
          {detailPayment?.metadata?.approvalReason && <div><strong>Approval note:</strong> {detailPayment.metadata.approvalReason}</div>}
        </div>
      </DefaultModal>

      <DefaultModal isOpen={decision.open} onClose={() => setDecision({ open: false, type: "", payment: null, referenceId: "", reason: "" })} title={decision.type === "approve" ? "Approve Payment" : "Reject Payment"} onSubmit={submitDecision}>
        <div className="space-y-3">
          <Input labelName="Collection / bank reference" value={decision.referenceId} onChange={(event) => setDecision((prev) => ({ ...prev, referenceId: event.target.value }))} required={decision.type === "approve"} />
          <Input type="textarea" labelName="Reason" value={decision.reason} onChange={(event) => setDecision((prev) => ({ ...prev, reason: event.target.value }))} required={decision.type === "reject"} />
        </div>
      </DefaultModal>

    </div>
  );
};

export default Payments;
