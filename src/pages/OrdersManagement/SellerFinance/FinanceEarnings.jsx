import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MdRefresh, MdVisibility } from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { OrderLink } from "../../../components/Shared/EntityLink";
import { getSellerCommissions } from "../../../Redux/sellerCommissionsSlice";
import { CalculationRows, FinanceNav, FinanceStatusBadge, financeDateTime, financeList, financeMoney, financeValue, sellerFinanceStatus } from "./financeUi";

const FILTERS = [["", "All"], ["waiting", "Waiting"], ["available", "Available"], ["held", "On hold"], ["paid", "Paid"]];
export default function FinanceEarnings() {
  const dispatch = useDispatch();
  const state = useSelector((store) => store.sellerCommissions?.myCommissionsData || {});
  const rows = financeList(state);
  const [params, setParams] = useSearchParams();
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const status = params.get("status") || "";
  const load = useCallback(async () => {
    try { await dispatch(getSellerCommissions({ limit: 100, offset: 0 })).unwrap(); }
    catch (error) { toast.error(error?.message || error || "Unable to load earnings"); }
  }, [dispatch]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = params.get("earning"); if (id && rows.length) setDetail(rows.find((row) => String(row.id || row.commissionId) === id) || null); }, [params, rows]);
  const counts = useMemo(() => rows.reduce((result, row) => { const key = sellerFinanceStatus(row).key; result[key] = (result[key] || 0) + 1; return result; }, {}), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const mapped = sellerFinanceStatus(row).key;
    const statusMatch = !status || mapped === status || (status === "held" && mapped === "held");
    const needle = search.trim().toLowerCase();
    const searchMatch = !needle || [row.orderNumber, row.order_number, row.orderId, row.order_id, row.productTitle, row.productName, row.sku].filter(Boolean).join(" ").toLowerCase().includes(needle);
    return statusMatch && searchMatch;
  }), [rows, search, status]);
  const columns = useMemo(() => [
    { key: "order", label: "Order", render: (_, row) => <OrderLink orderId={row.orderId || row.order_id} orderNumber={row.orderNumber || row.order_number} /> },
    { key: "product", label: "Product", render: (_, row) => <div><strong className="block max-w-[260px] truncate">{row.productTitle || row.productName || row.metadata?.productTitle || "Order earning"}</strong><span className="text-xs text-[var(--admin-muted)]">Qty {row.quantity || 1}</span></div> },
    { key: "net", label: "Your earning", render: (_, row) => <strong>{financeMoney(financeValue(row, "net_amount", "netAmount"), row.currency)}</strong> },
    { key: "status", label: "Status", render: (_, row) => <FinanceStatusBadge row={row} /> },
    { key: "date", label: "Available / paid on", render: (_, row) => <div className="text-xs"><span>{financeDateTime(row.processedAt || row.processed_at || row.eligibleAt || row.returnWindowEndsAt)}</span><span className="mt-1 block text-[var(--admin-muted)]">{sellerFinanceStatus(row).detail}</span></div> },
    { key: "action", label: "Action", render: (_, row) => <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setDetail(row)}><MdVisibility /> View details</button> },
  ], []);
  return <div className="space-y-5"><PageHeader title="Earnings" subtitle="See what you earned from every order and when it becomes payable." breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Earnings" }]} actions={<button type="button" className="admin-btn-secondary" onClick={load}><MdRefresh /> Refresh</button>} /><FinanceNav />
    <div className="flex gap-2 overflow-x-auto">{FILTERS.map(([key, label]) => <button key={label} type="button" onClick={() => setParams(key ? { status: key } : {})} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${status === key ? "border-[var(--admin-navy)] bg-[var(--admin-navy)] text-white" : "border-[var(--admin-line)] bg-white"}`}>{label} <span className="ml-1 opacity-70">{key ? counts[key] || 0 : rows.length}</span></button>)}</div>
    <DataTable columns={columns} data={filtered} loading={Boolean(state.loading)} totalCount={filtered.length} pageSize={20} rowKey={(row) => row.id || row.commissionId} searchPlaceholder="Search order or product" onSearch={setSearch} emptyText={status === "waiting" ? "Nothing is waiting. All eligible earnings have moved out of the waiting period." : "No earnings found."} />
    <DefaultModal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={`Order #${detail?.orderNumber || String(detail?.orderId || detail?.order_id || "").slice(0, 12)}`} isButtonView={false}>{detail && <div className="space-y-5 p-2"><div className="rounded-lg bg-[var(--admin-soft)] p-4"><span className="text-xs text-[var(--admin-muted)]">{detail.productTitle || detail.productName || "Order earning"}</span><div className="mt-2 flex items-center justify-between"><strong className="text-xl">{financeMoney(financeValue(detail, "net_amount", "netAmount"), detail.currency)}</strong><FinanceStatusBadge row={detail} /></div><p className="mt-2 text-xs text-[var(--admin-muted)]">{sellerFinanceStatus(detail).detail}</p></div><div><h3 className="mb-3 font-semibold">How your earning was calculated</h3><CalculationRows row={detail} /></div></div>}</DefaultModal>
  </div>;
}
