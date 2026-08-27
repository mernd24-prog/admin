import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdDownload, MdRefresh } from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import { getMySellerSettlements } from "../../../Redux/sellerCommissionsSlice";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { downloadApiFile } from "../../../_helpers/downloadApi";
import { FinanceNav, FinanceStatusBadge, financeDateTime, financeList, financeMoney, financeValue, shortReference } from "./financeUi";

export default function FinanceStatements() {
  const dispatch = useDispatch();
  const state = useSelector((store) => store.sellerCommissions?.mySettlementsData || {});
  const rows = financeList(state);
  const [downloading, setDownloading] = useState("");
  const load = useCallback(async () => { try { await dispatch(getMySellerSettlements({ limit: 100, offset: 0 })).unwrap(); } catch (error) { toast.error(error?.message || error || "Unable to load statements"); } }, [dispatch]);
  useEffect(() => { load(); }, [load]);
  const download = useCallback(async (row) => { try { setDownloading(row.id); await downloadApiFile(ENDPOINTS.payouts.mySettlementStatement(row.id), { format: "pdf" }, { filename: `settlement-${row.id}.pdf`, format: "pdf" }); toast.success("Statement download started"); } catch (error) { toast.error(error?.message || "Unable to download statement"); } finally { setDownloading(""); } }, []);
  const columns = useMemo(() => [
    { key: "period", label: "Statement period", render: (_, row) => `${financeDateTime(row.period_start || row.periodStart || row.created_at)} – ${financeDateTime(row.period_end || row.periodEnd || row.settlement_date || row.settlementDate)}` },
    { key: "reference", label: "Reference", render: (_, row) => <div><strong className="font-mono">{shortReference(row.id, "#")}</strong><span className="mt-1 block text-xs text-[var(--admin-muted)]">Payout {shortReference(financeValue(row, "payout_id", "payoutId"), "#")}</span></div> },
    { key: "amount", label: "Payout amount", render: (_, row) => <strong>{financeMoney(financeValue(row, "net_amount", "netAmount"), row.currency)}</strong> },
    { key: "adjustments", label: "Adjustments", render: (_, row) => financeMoney(financeValue(row, "adjustment_amount", "adjustmentAmount"), row.currency) },
    { key: "status", label: "Status", render: (_, row) => <FinanceStatusBadge row={row} /> },
    { key: "generated", label: "Generated on", render: (_, row) => financeDateTime(row.settlement_date || row.settlementDate || row.created_at) },
    { key: "download", label: "Statement", render: (_, row) => <button type="button" disabled={downloading === row.id} className="admin-btn-secondary !px-2 !py-1" onClick={() => download(row)}><MdDownload /> {downloading === row.id ? "Preparing…" : "PDF"}</button> },
  ], [download, downloading]);
  return <div className="space-y-5"><PageHeader title="Statements" subtitle="Download records of your completed payouts and financial adjustments." breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Statements" }]} actions={<button type="button" className="admin-btn-secondary" onClick={load}><MdRefresh /> Refresh</button>} /><FinanceNav /><DataTable columns={columns} data={rows} loading={Boolean(state.loading)} totalCount={rows.length} pageSize={20} rowKey="id" emptyText="No statements yet. Statements appear after a payout or settlement is completed." /></div>;
}
