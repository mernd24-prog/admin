import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "../../../utils/toast";
import { MdArrowForward, MdRefresh } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import { PageHeader, StatusBadge } from "../../../components/Shared";
import { getWalletTransactions } from "../../../Redux/adminCoreSlice";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const unwrapTransaction = (payload, id) => {
  const root = payload?.data?.data || payload?.data || payload || {};
  const items = root.items || root.list || root.rows || [];
  return items.find((item) => String(item.id) === String(id)) || items[0] || null;
};

const money = (value) => {
  const numeric = Number(value || 0);
  return `₹${numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const display = (value = "") => String(value || "N/A").replace(/_/g, " ");

const parseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const DetailPanel = ({ title, children, className = "" }) => (
  <section className={`rounded-lg border border-[#eadfbd] bg-[#fffdf8] shadow-[0_1px_3px_rgba(31,41,55,0.06)] ${className}`}>
    <div className="border-b border-[#efe6cd] px-4 py-3">
      <h2 className="text-sm font-semibold text-[#202337]">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-[#f1ead8] py-2 text-sm last:border-b-0">
    <span className="text-[#65718b]">{label}</span>
    <span className="max-w-[420px] break-words text-right font-medium text-[#202337]">{firstDefined(value, "N/A")}</span>
  </div>
);

const MetricCard = ({ label, value, tone = "blue" }) => {
  const toneClasses = {
    blue: "bg-[#f3f6ff] border-[#dce5ff] text-[#1f4fc9]",
    green: "bg-[#effbf4] border-[#cfeedd] text-[#2ea84a]",
    yellow: "bg-[#fff9ea] border-[#eadfbd] text-[#202337]",
  };

  return (
    <div className={`rounded-lg border p-4 shadow-[0_1px_3px_rgba(31,41,55,0.05)] ${toneClasses[tone] || toneClasses.blue}`}>
      <p className="text-xs font-medium text-[#65718b]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
};

const ViewTransaction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState(null);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const transactionId = decodeURIComponent(id);
      const response = await dispatch(getWalletTransactions({ search: transactionId, limit: 10 })).unwrap();
      setTransaction(unwrapTransaction(response, transactionId));
    } catch (error) {
      toast.error(error?.message || "Failed to load transaction detail");
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const metadata = parseMetadata(transaction?.metadata);
  const transactionId = firstDefined(transaction?.id, id);
  const createdAt = firstDefined(transaction?.created_at, transaction?.createdAt);
  const type = String(transaction?.type || "").toLowerCase();
  const amount = Number(transaction?.amount || 0);
  const orderId = firstDefined(metadata.orderId, metadata.order_id, transaction?.reference_id);
  const provider = firstDefined(metadata.provider, metadata.paymentProvider, metadata.payment_provider, metadata.providerName);
  const paymentId = firstDefined(metadata.paymentId, metadata.payment_id, metadata.providerPaymentId, metadata.provider_payment_id);
  const providerOrderId = firstDefined(metadata.providerOrderId, metadata.provider_order_id);
  const status = transaction?.status || "completed";

  if (!id) {
    return <div className="min-h-screen p-6 text-lg font-semibold text-[#202337]">Invalid Transaction ID</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <Loader loading={loading} />

      <div>
        <PageHeader
          title={`Transaction #${transactionId}`}
          subtitle={transaction?.userLabel || transaction?.user?.email || transaction?.user_id || "Payment transaction detail"}
          breadcrumbs={[
            { label: "Home", to: "/app/home" },
            { label: "Transactions", to: "/app/transactions" },
            { label: "View" },
          ]}
          backPath="/app/transactions"
          status={status}
          actions={(
            <button type="button" className="admin-btn-secondary" onClick={fetchTransaction}>
              <MdRefresh size={17} /> Refresh
            </button>
          )}
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Amount" value={money(amount)} tone={type === "credit" ? "green" : "blue"} />
          <MetricCard label="Type" value={display(type)} tone="yellow" />
          <MetricCard label="Status" value={<StatusBadge status={status} dot />} />
          <MetricCard label="Provider" value={display(provider)} tone="yellow" />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <DetailPanel title="Transaction Detail" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
              <DetailRow label="Transaction ID" value={transactionId} />
              <DetailRow label="User" value={transaction?.userLabel || transaction?.user?.email || transaction?.user_id} />
              <DetailRow label="Date" value={createdAt ? new Date(createdAt).toLocaleString() : "N/A"} />
              <DetailRow label="Type" value={display(type)} />
              <DetailRow label="Amount" value={money(amount)} />
              <DetailRow label="Reference Type" value={display(transaction?.reference_type)} />
              <DetailRow label="Description" value={metadata.description || metadata.reason || metadata.method} />
            </div>
          </DetailPanel>

          <DetailPanel title="Payment Reference">
            <DetailRow label="Provider" value={display(provider)} />
            <DetailRow label="Order ID" value={orderId} />
            <DetailRow label="Payment ID" value={paymentId} />
            <DetailRow label="Provider Order ID" value={providerOrderId} />
            <DetailRow label="Reference ID" value={transaction?.reference_id} />
            {orderId && (
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#2f6fed] bg-white px-3 py-2 text-sm font-medium text-[#2f6fed] transition hover:bg-[#f3f6ff]"
                onClick={() => navigate(`/app/orders/view/${orderId}`)}
              >
                Open Order <MdArrowForward size={16} />
              </button>
            )}
          </DetailPanel>
        </div>

        <DetailPanel title="Raw Metadata" className="mt-4">
          <pre className="max-h-[420px] overflow-auto rounded-md bg-[#f8faff] p-4 text-xs text-[#65718b]">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </DetailPanel>
      </div>
    </div>
  );
};

export default ViewTransaction;
