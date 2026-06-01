import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdCheckCircle, MdRefresh, MdVisibility, MdCancel } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  approvePayment,
  getCodConfig,
  getAdminPayments,
  rejectPayment,
  updateCodConfig,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";

const PROVIDERS = [
  "razorpay",
  "cod",
  "manual_bank_transfer",
  "manual_upi",
  "wallet_only",
];
const STATUSES = ["initiated", "authorized", "captured", "failed", "refunded"];

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

const unwrapData = (payload = {}) => payload?.data?.data || payload?.data || {};

const Payments = () => {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.adminPaymentsData);
  const savedCodConfig = unwrapData(selector.codConfigData);

  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    provider: "",
    status: "",
    buyerId: "",
    orderId: "",
    fromDate: "",
    toDate: "",
  });
  const [detailPayment, setDetailPayment] = useState(null);
  const [decision, setDecision] = useState({ open: false, type: "", payment: null, referenceId: "", reason: "" });
  const [codForm, setCodForm] = useState({
    enabled: true,
    chargeAmount: 0,
    minOrderAmount: "",
    maxOrderAmount: "",
    currency: "INR",
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(getAdminPayments({
        ...filters,
        limit: 20,
        offset: (page - 1) * 20,
      })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const fetchCodConfig = useCallback(async () => {
    try {
      await dispatch(getCodConfig()).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Failed to load COD settings");
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCodConfig();
  }, [fetchCodConfig]);

  useEffect(() => {
    if (!savedCodConfig || Object.keys(savedCodConfig).length === 0) return;
    setCodForm({
      enabled: savedCodConfig.enabled !== false,
      chargeAmount: savedCodConfig.chargeAmount ?? savedCodConfig.charge_amount ?? 0,
      minOrderAmount: savedCodConfig.minOrderAmount ?? savedCodConfig.min_order_amount ?? "",
      maxOrderAmount: savedCodConfig.maxOrderAmount ?? savedCodConfig.max_order_amount ?? "",
      currency: savedCodConfig.currency || "INR",
    });
  }, [savedCodConfig]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      provider: "",
      status: "",
      buyerId: "",
      orderId: "",
      fromDate: "",
      toDate: "",
    });
    setPage(1);
  };

  const submitDecision = useCallback(async () => {
    if (!decision.payment?.id) return;
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

  const saveCodConfig = useCallback(async () => {
    if (codForm.maxOrderAmount !== "" && codForm.minOrderAmount !== "" && Number(codForm.maxOrderAmount) < Number(codForm.minOrderAmount)) {
      toast.error("Maximum order amount cannot be lower than minimum amount");
      return;
    }
    try {
      setSavingConfig(true);
      await dispatch(updateCodConfig({
        ...codForm,
        chargeAmount: Number(codForm.chargeAmount || 0),
        minOrderAmount: codForm.minOrderAmount === "" ? null : Number(codForm.minOrderAmount),
        maxOrderAmount: codForm.maxOrderAmount === "" ? null : Number(codForm.maxOrderAmount),
      })).unwrap();
      toast.success("COD settings saved");
      await fetchCodConfig();
    } catch (error) {
      toast.error(error?.message || error || "Failed to save COD settings");
    } finally {
      setSavingConfig(false);
    }
  }, [codForm, dispatch, fetchCodConfig]);

  const canManualDecision = (payment) =>
    ["manual_bank_transfer", "manual_upi", "cod"].includes(payment.provider) &&
    !["captured", "refunded"].includes(payment.status);

  const columns = useMemo(() => [
    {
      key: "transaction_reference",
      label: "Payment",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.transaction_reference || row.id}</div>
          <div className="text-xs text-gray-400">Order {row.order_id}</div>
        </div>
      ),
    },
    { key: "buyer_id", label: "Buyer" },
    {
      key: "provider",
      label: "Provider",
      render: (value) => <span className="capitalize">{display(value)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={display(value)} dot />,
    },
    {
      key: "amount",
      label: "Amount",
      render: (value, row) => `${row.currency || "INR"} ${money(value)}`,
    },
    {
      key: "created_at",
      label: "Date",
      render: (value) => value ? moment(value).format("DD-MM-YYYY HH:mm") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setDetailPayment(row)}>
            <MdVisibility size={15} /> View
          </button>
          {canManualDecision(row) && (
            <PermissionGuard module="payments" action={ACTIONS.APPROVE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setDecision({ open: true, type: "approve", payment: row, referenceId: row.provider_payment_id || "", reason: "" })}>
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
  ], []);

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Loader loading={loading} />
      <PageHeader
        title="Payments"
        subtitle="Reconcile online, COD, and manual payments"
        breadcrumbs={[{ label: "Orders Management" }, { label: "Payments" }]}
        actions={
          <button type="button" className="admin-btn-secondary" onClick={fetchPayments}>
            <MdRefresh size={17} /> Refresh
          </button>
        }
      />

      <div className="admin-card p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">COD Settings</h2>
            <p className="text-xs text-gray-500 mt-1">Customer sees Cash on Delivery only when enabled and the order total is inside this range.</p>
          </div>
          <PermissionGuard module="payments" action={ACTIONS.UPDATE} hide>
            <button type="button" className="admin-btn-primary" onClick={saveCodConfig} disabled={savingConfig}>
              {savingConfig ? "Saving..." : "Save COD Charge"}
            </button>
          </PermissionGuard>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!codForm.enabled}
              onChange={(event) => setCodForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              disabled={!can("payments", ACTIONS.UPDATE)}
            />
            COD enabled
          </label>
          <Input labelName="COD Charge" type="number" min="0" value={codForm.chargeAmount} onChange={(event) => setCodForm((prev) => ({ ...prev, chargeAmount: event.target.value }))} disabled={!can("payments", ACTIONS.UPDATE)} />
          <Input labelName="Minimum Order" type="number" min="0" value={codForm.minOrderAmount} onChange={(event) => setCodForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))} disabled={!can("payments", ACTIONS.UPDATE)} />
          <Input labelName="Maximum Order" type="number" min="0" value={codForm.maxOrderAmount} onChange={(event) => setCodForm((prev) => ({ ...prev, maxOrderAmount: event.target.value }))} disabled={!can("payments", ACTIONS.UPDATE)} />
          <Input labelName="Currency" value={codForm.currency} onChange={(event) => setCodForm((prev) => ({ ...prev, currency: event.target.value }))} disabled={!can("payments", ACTIONS.UPDATE)} />
        </div>
        <div className="text-xs text-gray-500 mb-4">
          COD collection amount = order payable amount including COD charge. Admin approves the COD payment after cash is collected.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="admin-input" placeholder="Search ref/order" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
          <input className="admin-input" placeholder="Order ID" value={filters.orderId} onChange={(event) => setFilter("orderId", event.target.value)} />
          <input className="admin-input" placeholder="Buyer ID" value={filters.buyerId} onChange={(event) => setFilter("buyerId", event.target.value)} />
          <select className="admin-input" value={filters.provider} onChange={(event) => setFilter("provider", event.target.value)}>
            <option value="">All providers</option>
            {PROVIDERS.map((provider) => <option key={provider} value={provider}>{display(provider)}</option>)}
          </select>
          <select className="admin-input" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{display(status)}</option>)}
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
        requiredModule="payments"
        exportConfig={{ filename: "payments", columns, data: payload.list }}
      />

      <DefaultModal isOpen={Boolean(detailPayment)} onClose={() => setDetailPayment(null)} title="Payment Detail">
        <div className="space-y-3 text-sm">
          <div><strong>Payment:</strong> {detailPayment?.id}</div>
          <div><strong>Order:</strong> {detailPayment?.order_id}</div>
          <div><strong>Provider:</strong> {display(detailPayment?.provider)}</div>
          <div><strong>Status:</strong> {display(detailPayment?.status)}</div>
          <div><strong>Provider Order:</strong> {detailPayment?.provider_order_id || "N/A"}</div>
          <div><strong>Provider Payment:</strong> {detailPayment?.provider_payment_id || "N/A"}</div>
          <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto">{JSON.stringify(detailPayment?.metadata || {}, null, 2)}</pre>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={decision.open} onClose={() => setDecision({ open: false, type: "", payment: null, referenceId: "", reason: "" })} title={decision.type === "approve" ? "Approve Payment" : "Reject Payment"} onSubmit={submitDecision}>
        <div className="space-y-3">
          <Input labelName="Reference ID" value={decision.referenceId} onChange={(event) => setDecision((prev) => ({ ...prev, referenceId: event.target.value }))} />
          <Input type="textarea" labelName="Reason" value={decision.reason} onChange={(event) => setDecision((prev) => ({ ...prev, reason: event.target.value }))} required={decision.type === "reject"} />
        </div>
      </DefaultModal>
    </div>
  );
};

export default Payments;
