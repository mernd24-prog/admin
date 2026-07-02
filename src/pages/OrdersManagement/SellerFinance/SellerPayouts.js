import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdRefresh, MdVisibility } from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { getAdminSellerPayouts, getSellerPayouts } from "../../../Redux/sellerCommissionsSlice";
import { usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const STATUSES = ["pending", "processing", "on_hold", "completed", "failed", "cancelled"];
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
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "created_at", defaultSortDir: "desc" });
  const { toQueryParams } = list;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const filterFields = useMemo(
    () => isSeller ? FILTER_FIELDS.filter((field) => field.key !== "sellerId") : FILTER_FIELDS,
    [isSeller],
  );

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      const action = isSeller ? getSellerPayouts : getAdminSellerPayouts;
      await dispatch(action({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to load seller payouts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, isSeller, toQueryParams]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

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
        breadcrumbs={[{ label: "Seller Finance & Payouts" }, { label: "Seller Payouts" }]}
        actions={<button type="button" onClick={fetchPayouts} className="admin-btn-secondary"><MdRefresh size={16} /> Refresh</button>}
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

      <DefaultModal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title="Payout Calculation">
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
