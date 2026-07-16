import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdDownload, MdVisibility } from "react-icons/md";
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
import { ENDPOINTS } from "../../../_helpers/endpoints";

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

const valueOf = (row, snake, camel) => row?.[snake] ?? row?.[camel];
const fmt = (value, withTime = false) => value ? moment(value).format(withTime ? "DD MMM YYYY HH:mm" : "DD MMM YYYY") : "—";
const money = (value, currency = "INR") => `${currency} ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sellerName = (row = {}) => row.sellerName || row.seller?.displayName || row.seller?.businessName || row.seller?.email || "Seller";

const SellerPayouts = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const finance = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(isSeller ? finance.myPayoutsData : finance.adminPayoutsData);
  const settlementsPayload = unwrapList(finance.mySettlementsData);
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "created_at", defaultSortDir: "desc" });
  const { toQueryParams } = list;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [downloading, setDownloading] = useState(false);
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

  const downloadFile = useCallback(async (endpoint, params, filename) => {
    try {
      setDownloading(true);
      await downloadApiFile(endpoint, params, { filename, format: params?.format });
      toast.success("Download started");
    } catch (downloadError) {
      toast.error(downloadError?.message || "Unable to download file");
    } finally {
      setDownloading(false);
    }
  }, []);

  const columns = useMemo(() => {
    const base = [
      ...(!isSeller ? [{ key: "seller_id", label: "Seller", render: (_, row) => (
        <div><div className="font-medium text-gray-800">{sellerName(row)}</div>{row.seller?.email && <div className="text-xs text-gray-400">{row.seller.email}</div>}</div>
      ) }] : []),
      { key: "status", label: "Status", sortable: true, render: (value) => <StatusBadge status={value || "pending"} dot /> },
      { key: "total_amount", label: "Gross", render: (value, row) => money(value ?? row.totalAmount, row.currency) },
      { key: "commission_amount", label: "Platform fee", render: (value, row) => <span className="text-red-600">-{money(value ?? row.commissionAmount, row.currency)}</span> },
      { key: "tax_amount", label: "Fee GST", render: (value, row) => <span className="text-red-600">-{money(value ?? row.taxAmount, row.currency)}</span> },
      { key: "refund_amount", label: "Refunds", render: (value, row) => <span className="text-red-600">-{money(value ?? row.refundAmount, row.currency)}</span> },
      { key: "net_amount", label: "Net payout", render: (value, row) => <span className="font-semibold text-green-700">{money(value ?? row.netAmount, row.currency)}</span> },
      { key: "period_start", label: "Period", render: (value, row) => <span className="text-xs text-gray-500">{fmt(value ?? row.periodStart)} – {fmt(valueOf(row, "period_end", "periodEnd"))}</span> },
      { key: "processed_at", label: "Paid", render: (value, row) => <span className="text-xs text-gray-500">{fmt(value ?? row.processedAt, true)}</span> },
      { key: "actions", label: "", render: (_, row) => <button type="button" onClick={() => setDetail(row)} className="admin-btn-secondary !px-2 !py-1"><MdVisibility size={15} /> View</button> },
    ];
    return base;
  }, [isSeller]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seller Payouts"
        subtitle={isSeller ? "See how every payout was calculated and when it was paid." : "Calculated seller payouts. Use Payout Operations to approve or complete them."}
        breadcrumbs={[{ label: "Seller Finance & Payouts" }, { label: "Payouts" }]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadFile(
                isSeller ? ENDPOINTS.payouts.myPayoutsExport : ENDPOINTS.payouts.sellerPayoutsExport,
                { format: "csv" },
                "seller-payouts.csv",
              )}
              disabled={downloading}
              
            >
              <MdDownload size={16} /> Export
            </button>
          </div>
        )}
      />

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        Payout amounts come from delivered orders and their checkout fee snapshots. They cannot be typed manually.
      </div>

      <FilterBar filters={filterFields} values={list.filters} onChange={list.setFilter} onClear={list.clearFilters} loading={loading} activeCount={list.activeFilterCount} />
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
      />

      {isSeller && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Settlement Statements</h2>
              <p className="text-xs text-gray-500">Download the payout slip generated from commissions, payouts, and settlements.</p>
            </div>
            <button
              type="button"
              onClick={() => downloadFile(ENDPOINTS.payouts.mySettlementsExport, { format: "csv" }, "seller-settlements.csv")}
              disabled={downloading}
              className="admin-btn-secondary"
            >
              <MdDownload size={16} /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Settlement</th>
                  <th className="px-4 py-3">Payout</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">GST</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settlementsPayload.list.length ? settlementsPayload.list.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{String(row.id || "").slice(0, 8) || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{String(valueOf(row, "payout_id", "payoutId") || "—").slice(0, 8)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(valueOf(row, "gross_amount", "grossAmount"), row.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-red-600">-{money(valueOf(row, "commission_amount", "commissionAmount"), row.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-red-600">-{money(valueOf(row, "tax_amount", "taxAmount"), row.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-green-700">{money(valueOf(row, "net_amount", "netAmount"), row.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status || "pending"} dot /></td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        title="Download statement"
                        onClick={() => downloadFile(
                          ENDPOINTS.payouts.mySettlementStatement(row.id),
                          { format: "pdf" },
                          `settlement-${row.id}.pdf`,
                        )}
                        disabled={downloading}
                        className="admin-btn-secondary !px-2 !py-1"
                      >
                        <MdDownload size={15} /> PDF
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No settlement statements found</td>
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
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="font-semibold text-gray-800">{sellerName(detail)}</div>
              <div className="mt-1"><StatusBadge status={detail.status || "pending"} dot /></div>
              <div className="mt-2 text-gray-600">Earning period: {fmt(valueOf(detail, "period_start", "periodStart"))} – {fmt(valueOf(detail, "period_end", "periodEnd"))}</div>
            </div>
            <div className="space-y-2 rounded-lg border border-gray-100 p-4">
              <div className="flex justify-between"><span>Gross seller sales</span><span>{money(valueOf(detail, "total_amount", "totalAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>Platform fee</span><span className="text-red-600">-{money(valueOf(detail, "commission_amount", "commissionAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>GST on platform fee</span><span className="text-red-600">-{money(valueOf(detail, "tax_amount", "taxAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>Refund adjustments</span><span className="text-red-600">-{money(valueOf(detail, "refund_amount", "refundAmount"), detail.currency)}</span></div>
              <div className="flex justify-between"><span>Other adjustments</span><span>{money(valueOf(detail, "adjustment_amount", "adjustmentAmount"), detail.currency)}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Net payout</span><span className="text-green-700">{money(valueOf(detail, "net_amount", "netAmount"), detail.currency)}</span></div>
            </div>
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
