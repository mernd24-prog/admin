import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdDownload, MdReceiptLong, MdVisibility } from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { getAdminSellerPayouts, getMySellerSettlements, getSellerPayouts } from "../../../Redux/sellerCommissionsSlice";
import { usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { downloadApiFile } from "../../../_helpers/downloadApi";
import { exportToCsv } from "../../../_helpers/exportToCsv";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";

const STATUSES = ["pending", "processing", "approved", "on_hold", "completed", "failed", "cancelled"];
const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  { key: "status", type: "select", label: "Status", options: STATUSES.map((value) => ({ value, label: value.replace(/_/g, " ") })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data || payload?.data || {};
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data.items || data.list || [],
    total: Number(data.total || data.items?.length || data.list?.length || 0),
    summary: data.summary || {},
  };
};

const valueOf = (row, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return 0;
};
const fmt = (value) => formatDateTime12Hour(value, "—");
const money = (value, currency = "INR") => `${currency} ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sellerName = (row = {}) => row.sellerName || row.seller?.displayName || row.seller?.businessName || row.seller?.email || "Seller";
const jsonOf = (value) => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "{}"); } catch { return {}; }
};
const breakdownOf = (row = {}) => jsonOf(row.metadata).financialBreakdown || jsonOf(row.metadata);
const signedMoney = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${money(numeric, currency)}`;
  if (numeric < 0) return `-${money(Math.abs(numeric), currency)}`;
  return money(0, currency);
};

const getInitialPayoutFilters = () => {
  const params = new URLSearchParams(window.location.search);
  return ["sellerId", "status", "fromDate", "toDate"].reduce((filters, key) => {
    const value = params.get(key);
    if (value) filters[key] = value;
    return filters;
  }, {});
};

const SellerPayouts = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const finance = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(isSeller ? finance.myPayoutsData : finance.adminPayoutsData);
  const settlementsPayload = unwrapList(finance.mySettlementsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: getInitialPayoutFilters(),
  });
  const { toQueryParams } = list;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const filterFields = useMemo(
    () => isSeller ? FILTER_FIELDS.filter((field) => field.key !== "sellerId") : FILTER_FIELDS,
    [isSeller],
  );

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      const query = { ...params, offset: (params.page - 1) * params.limit };
      const action = isSeller ? getSellerPayouts : getAdminSellerPayouts;
      await dispatch(action(query)).unwrap();
      if (isSeller) {
        await dispatch(getMySellerSettlements(query)).unwrap();
      }
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to load seller payouts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, isSeller, toQueryParams]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const downloadFile = useCallback(async (endpoint, params, filename, id = endpoint) => {
    try {
      setDownloadingId(id);
      await downloadApiFile(endpoint, params, { filename, format: params?.format });
      toast.success("Download started");
    } catch (downloadError) {
      toast.error(downloadError?.message || "Unable to download file");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const columns = useMemo(() => {
    const base = [
      ...(!isSeller ? [{ key: "seller_id", label: "Seller", render: (_, row) => (
        <div><div className="font-medium text-gray-800">{sellerName(row)}</div>{row.seller?.email && <div className="text-xs text-gray-400">{row.seller.email}</div>}</div>
      ) }] : []),
      { key: "status", label: "Status", sortable: true, render: (value) => <StatusBadge status={value || "pending"} dot /> },
      { key: "total_amount", label: "Seller receivable", render: (value, row) => money(value ?? row.totalAmount, row.currency) },
      { key: "commission_amount", label: "Platform commission", render: (value, row) => <span className="text-red-600">-{money(value ?? row.commissionAmount, row.currency)}</span> },
      { key: "tax_amount", label: "GST on commission", render: (value, row) => <span className="text-red-600">-{money(value ?? row.taxAmount, row.currency)}</span> },
      { key: "tax_withheld", label: "TCS/TDS", render: (_, row) => {
        const breakdown = breakdownOf(row);
        return <span className="text-red-600">-{money(Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0), row.currency)}</span>;
      } },
      { key: "shipping_net", label: "Shipping net", render: (_, row) => {
        const breakdown = breakdownOf(row);
        const shippingNet = Number(breakdown.shippingReimbursementAmount || 0) - Number(breakdown.shippingDeductionAmount || 0);
        return <span className={shippingNet >= 0 ? "text-green-700" : "text-red-600"}>{signedMoney(shippingNet, row.currency)}</span>;
      } },
      { key: "refund_amount", label: "Refunds", render: (value, row) => <span className="text-red-600">-{money(value ?? row.refundAmount, row.currency)}</span> },
      { key: "net_amount", label: "Net payout", render: (value, row) => <span className="font-semibold text-green-700">{money(value ?? row.netAmount, row.currency)}</span> },
      { key: "period_start", label: "Period", render: (value, row) => <span className="text-xs text-gray-500">{fmt(value ?? row.periodStart)} – {fmt(valueOf(row, "period_end", "periodEnd"))}</span> },
      { key: "processed_at", label: "Paid", render: (value, row) => <span className="text-xs text-gray-500">{fmt(value ?? row.processedAt, true)}</span> },
      { key: "actions", label: "", render: (_, row) => <button type="button" onClick={() => setDetail(row)} className="admin-btn-secondary !px-2 !py-1"><MdVisibility size={15} /> View</button> },
    ];
    return base;
  }, [isSeller]);

  const payoutExportColumns = useMemo(() => [
    ...(!isSeller ? [{ label: "Seller", value: (row) => sellerName(row) }] : []),
    { label: "Status", value: (row) => formatLabel(row.status || "pending") },
    { label: "Seller receivable", value: (row) => money(valueOf(row, "total_amount", "totalAmount"), row.currency) },
    { label: "Platform commission", value: (row) => `-${money(valueOf(row, "commission_amount", "commissionAmount"), row.currency)}` },
    { label: "GST on commission", value: (row) => `-${money(valueOf(row, "tax_amount", "taxAmount"), row.currency)}` },
    { label: "TCS/TDS", value: (row) => {
      const breakdown = breakdownOf(row);
      return `-${money(Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0), row.currency)}`;
    } },
    { label: "Shipping net", value: (row) => {
      const breakdown = breakdownOf(row);
      return signedMoney(Number(breakdown.shippingReimbursementAmount || 0) - Number(breakdown.shippingDeductionAmount || 0), row.currency);
    } },
    { label: "Refunds", value: (row) => `-${money(valueOf(row, "refund_amount", "refundAmount"), row.currency)}` },
    { label: "Net payout", value: (row) => money(valueOf(row, "net_amount", "netAmount"), row.currency) },
    { label: "Period", value: (row) => `${fmt(valueOf(row, "period_start", "periodStart"))} – ${fmt(valueOf(row, "period_end", "periodEnd"))}` },
    { label: "Paid", value: (row) => fmt(valueOf(row, "processed_at", "processedAt")) },
  ], [isSeller]);

 const exportPayoutTable = () => {
  if (!payload.list.length) {
    toast.error("No payout records available to export", {
      id: "export-payout-error",
    });
    return;
  }

  exportToCsv(payload.list, {
    filename: "seller-payouts.csv",
    columns: payoutExportColumns,
  });

  toast.success(
    `${payload.list.length} payout record${payload.list.length === 1 ? "" : "s"} exported`,
    {
      id: "export-payout-success",
    }
  );
};

  const settlementExportColumns = useMemo(() => [
    { label: "Settlement", value: (row) => `#${String(row.id || "").slice(0, 8) || "—"}` },
    { label: "Payout", value: (row) => `#${String(valueOf(row, "payout_id", "payoutId") || "—").slice(0, 8)}` },
    { label: "Seller receivable", value: (row) => money(valueOf(row, "gross_amount", "grossAmount"), row.currency) },
    { label: "Platform commission", value: (row) => `-${money(valueOf(row, "commission_amount", "commissionAmount"), row.currency)}` },
    { label: "GST on commission", value: (row) => `-${money(valueOf(row, "tax_amount", "taxAmount"), row.currency)}` },
    { label: "TCS/TDS", value: (row) => {
      const breakdown = breakdownOf(row);
      return `-${money(Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0), row.currency)}`;
    } },
    { label: "Shipping net", value: (row) => {
      const breakdown = breakdownOf(row);
      return signedMoney(Number(breakdown.shippingReimbursementAmount || 0) - Number(breakdown.shippingDeductionAmount || 0), row.currency);
    } },
    { label: "Net", value: (row) => money(valueOf(row, "net_amount", "netAmount"), row.currency) },
    { label: "Status", value: (row) => formatLabel(row.status || "pending") },
    { label: "Paid", value: (row) => fmt(valueOf(row, "settlement_date", "settlementDate") ?? row.created_at) },
  ], []);

  const exportSettlementTable = () => {
    if (!settlementsPayload.list.length) {
      toast.error("No settlement records available to export");
      return;
    }
    exportToCsv(settlementsPayload.list, {
      filename: "seller-settlements.csv",
      columns: settlementExportColumns,
    });
    toast.success(`${settlementsPayload.list.length} settlement record${settlementsPayload.list.length === 1 ? "" : "s"} exported`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Payouts"
        subtitle={isSeller ? "See how every payout was calculated and when it was paid." : "Calculated seller payouts. Use Payout Operations to approve or complete them."}
        breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Payouts" }]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPayoutTable}
            >
              <MdDownload size={16} />
              Export
            </button>
          </div>
        )}
      />

      {/* <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        Payout amounts come from delivered orders and their checkout fee snapshots. They cannot be typed manually.
      </div> */}
     
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search seller or payment reference"
        emptyText="No calculated payouts found"
        filterBar={ <FilterBar filters={filterFields} values={list.filters} onChange={list.setFilter} onClear={list.clearFilters} loading={loading} activeCount={list.activeFilterCount} />}
      />

      {isSeller && (
        <section className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
                <MdReceiptLong size={18} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--admin-ink)]">Settlement Statements</h2>
                <p className="text-xs text-[var(--admin-muted)]">Download the payout slip generated from commissions, payouts, and settlements.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportSettlementTable}
              className="admin-btn-secondary shrink-0"
            >
              <MdDownload size={16} />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="admin-table-head text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                <tr>
                  <th className="px-5 py-3">Settlement</th>
                  <th className="px-4 py-3">Payout</th>
                  <th className="px-4 py-3">Seller Receivable</th>
                  <th className="px-4 py-3">Platform Commission</th>
                  <th className="px-4 py-3">GST on Commission</th>
                  <th className="px-4 py-3">TCS/TDS</th>
                  <th className="px-4 py-3">Shipping Net</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3 text-right">Statement</th>
                </tr>
              </thead>
              <tbody>
                {settlementsPayload.list.length ? settlementsPayload.list.map((row) => {
                  const isDownloading = downloadingId === row.id;
                  const breakdown = breakdownOf(row);
                  const taxWithheld = Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0);
                  const shippingNet = Number(breakdown.shippingReimbursementAmount || 0) - Number(breakdown.shippingDeductionAmount || 0);
                  return (
                    <tr key={row.id} className="border-b border-[var(--admin-line)] last:border-0 hover:bg-[var(--admin-surface-soft)]">
                      <td className="whitespace-nowrap px-5 py-3">
                        <span title={row.id} className="rounded bg-[var(--admin-canvas)] px-1.5 py-0.5 font-mono text-xs text-[var(--admin-ink)]">
                          #{String(row.id || "").slice(0, 8) || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span title={valueOf(row, "payout_id", "payoutId")} className="rounded bg-[var(--admin-canvas)] px-1.5 py-0.5 font-mono text-xs text-[var(--admin-ink)]">
                          #{String(valueOf(row, "payout_id", "payoutId") || "—").slice(0, 8)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{money(valueOf(row, "gross_amount", "grossAmount"), row.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-red-600">-{money(valueOf(row, "commission_amount", "commissionAmount"), row.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-red-600">-{money(valueOf(row, "tax_amount", "taxAmount"), row.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-red-600">-{money(taxWithheld, row.currency)}</td>
                      <td className={`whitespace-nowrap px-4 py-3 ${shippingNet >= 0 ? "text-green-700" : "text-red-600"}`}>{signedMoney(shippingNet, row.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-green-700">{money(valueOf(row, "net_amount", "netAmount"), row.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status || "pending"} dot /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--admin-muted)]">{fmt(valueOf(row, "settlement_date", "settlementDate") ?? row.created_at, true)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Download statement"
                          onClick={() => downloadFile(
                            ENDPOINTS.payouts.mySettlementStatement(row.id),
                            { format: "pdf" },
                            `settlement-${row.id}.pdf`,
                            row.id,
                          )}
                          disabled={isDownloading}
                          className="admin-btn-secondary !min-h-0 !px-2.5 !py-1.5 !text-xs"
                        >
                          {isDownloading ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                          ) : (
                            <MdDownload size={14} />
                          )}
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={11} className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-[var(--admin-muted)]">
                        <MdReceiptLong size={28} className="text-[var(--admin-line-strong)]" />
                        <span className="text-sm">No settlement statements yet</span>
                        <span className="text-xs">Statements appear here once a payout for this period is completed.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DefaultModal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Payout Calculation"
        isButtonView={false}
      >
        {detail && (
          <div className="space-y-4 p-2 text-sm">
            {(() => {
              const breakdown = breakdownOf(detail);
              const taxWithheld = Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0);
              const shippingNet = Number(breakdown.shippingReimbursementAmount || 0) - Number(breakdown.shippingDeductionAmount || 0);
              return (
                <>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="font-semibold text-gray-800">{sellerName(detail)}</div>
              <div className="mt-1"><StatusBadge status={detail.status || "pending"} dot /></div>
              <div className="mt-2 text-gray-600">Earning period: {fmt(valueOf(detail, "period_start", "periodStart"))} – {fmt(valueOf(detail, "period_end", "periodEnd"))}</div>
            </div>
            <div className="space-y-2 rounded-lg border border-gray-100 p-4">
              <div className="flex justify-between"><span>Seller receivable</span><span>{money(valueOf(detail, "total_amount", "totalAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>Platform commission</span><span className="text-red-600">-{money(valueOf(detail, "commission_amount", "commissionAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>GST on commission</span><span className="text-red-600">-{money(valueOf(detail, "tax_amount", "taxAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>GST TCS / income-tax TDS</span><span className="text-red-600">-{money(taxWithheld, detail.currency)}</span></div>
              <div className="flex justify-between"><span>Shipping collected / reimbursed</span><span className={shippingNet >= 0 ? "text-green-700" : "text-red-600"}>{signedMoney(shippingNet, detail.currency)}</span></div>
              <div className="flex justify-between"><span>Refund adjustments</span><span className="text-red-600">-{money(valueOf(detail, "refund_amount", "refundAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>Other adjustments</span><span>{signedMoney(valueOf(detail, "adjustment_amount", "adjustmentAmount"), detail.currency)}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Net payout</span><span className="text-green-700">{money(valueOf(detail, "net_amount", "netAmount"), detail.currency)}</span></div>
            </div>
                </>
              );
            })()}
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 p-4 md:grid-cols-2">
              <div><strong>Payment method:</strong> {String(valueOf(detail, "payment_method", "paymentMethod") || "Not selected").replace(/_/g, " ")}</div>
              <div><strong>Payment reference:</strong> {valueOf(detail, "payment_reference", "paymentReference") || "Not paid yet"}</div>
              <div><strong>Processed:</strong> {fmt(valueOf(detail, "processed_at", "processedAt"), true)}</div>
              <div><strong>Created:</strong> {fmt(valueOf(detail, "created_at", "createdAt"), true)}</div>
            </div>
          </div>
        )}
      </DefaultModal>
    </div>
  );
};

export default SellerPayouts;
