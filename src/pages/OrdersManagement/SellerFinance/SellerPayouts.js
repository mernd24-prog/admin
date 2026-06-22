/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdRefresh, MdVisibility } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { getAdminPayouts, createAdminPayout } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const STATUSES = ["pending", "processing", "completed", "failed", "cancelled"];
const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.payouts || data?.items || data || [],
    total: Number(data?.total || data?.list?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

const EMPTY_FORM = {
  sellerId: "",
  periodStart: "",
  periodEnd: "",
  grossAmount: "",
  commissionAmount: "",
  processingFeeAmount: "",
  taxWithheldAmount: "",
  netPayoutAmount: "",
  currency: "INR",
};

const STATUS_COLOR = {
  pending: "yellow", processing: "blue", completed: "green", failed: "red", cancelled: "gray",
};

const SellerPayouts = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.adminPayoutsData);

  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "created_at", defaultSortDir: "desc" });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => { dropdownApi.getSellers({ limit: 100 }).then(setSellerOptions).catch(() => {}); }, []);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getAdminPayouts({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load payouts";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleCreate = useCallback(async () => {
    if (!form.sellerId.trim()) { toast.error("Seller ID required"); return; }
    if (!form.netPayoutAmount || Number(form.netPayoutAmount) <= 0) { toast.error("Net payout amount required"); return; }
    try {
      setSaving(true);
      await dispatch(createAdminPayout({
        sellerId: form.sellerId,
        periodStart: form.periodStart || undefined,
        periodEnd: form.periodEnd || undefined,
        grossAmount: form.grossAmount !== "" ? Number(form.grossAmount) : undefined,
        commissionAmount: form.commissionAmount !== "" ? Number(form.commissionAmount) : undefined,
        processingFeeAmount: form.processingFeeAmount !== "" ? Number(form.processingFeeAmount) : undefined,
        taxWithheldAmount: form.taxWithheldAmount !== "" ? Number(form.taxWithheldAmount) : undefined,
        netPayoutAmount: Number(form.netPayoutAmount),
        currency: form.currency || "INR",
      })).unwrap();
      toast.success("Payout created");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchPayouts();
    } catch (err) {
      toast.error(err?.message || "Failed to create payout");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch, fetchPayouts]);

  const COLUMNS = [
    {
      key: "id",
      label: "Payout ID",
      render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-8)}</span>,
    },
    {
      key: "sellerId",
      label: "Seller",
      render: (v, row) => { const name = row.sellerName || row.seller?.name || row.seller?.companyName || sellerOptions.find((o) => o.value === v)?.label; return name ? <span className="text-sm font-medium text-gray-700">{name}</span> : <span className="font-mono text-xs text-gray-400">{String(v || "—").slice(-8)}</span>; },
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "pending"} color={STATUS_COLOR[v] || "gray"} />,
    },
    {
      key: "grossAmount",
      label: "Gross",
      render: (v) => <span className="text-sm">{money(v)}</span>,
    },
    {
      key: "commissionAmount",
      label: "Commission",
      render: (v) => <span className="text-sm text-red-600">-{money(v)}</span>,
    },
    {
      key: "netPayoutAmount",
      label: "Net Payout",
      render: (v) => <span className="text-sm font-semibold text-green-700">{money(v)}</span>,
    },
    {
      key: "periodStart",
      label: "Period",
      render: (v, row) => <span className="text-xs text-gray-500">{fmt(v)} – {fmt(row.periodEnd)}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <button onClick={() => setDetail(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
          <MdVisibility size={18} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Seller Payouts"
        subtitle="Manage seller commission payouts"
        breadcrumbs={[{ label: "Seller Finance & Payouts" }, { label: "Seller Payouts" }]}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchPayouts} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="sellers" action={ACTIONS.CREATE} hide>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <MdAdd size={16} /> Create Payout
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar
        filters={FILTER_FIELDS}
        values={list.filters}
        onChange={list.setFilter}
        onClear={list.clearFilters}
        loading={loading}
        activeCount={list.activeFilterCount}
      />
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}
      <DataTable
        columns={COLUMNS}
        data={payload.list}
        loading={loading}
        totalCount={payload.total || payload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search by seller or payout ID…"
        emptyText="No payouts found"
      />

      {/* Detail */}
      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Payout Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Payout ID</p><p className="font-mono text-xs">{detail._id || detail.id}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status} color={STATUS_COLOR[detail.status] || "gray"} /></div>
              <div><p className="text-gray-500">Seller</p><p className="text-sm font-medium">{detail.sellerName || detail.seller?.name || sellerOptions.find((o) => o.value === detail.sellerId)?.label || <span className="font-mono text-xs">{detail.sellerId || "—"}</span>}</p></div>
              <div><p className="text-gray-500">Currency</p><p>{detail.currency || "INR"}</p></div>
              <div><p className="text-gray-500">Gross Amount</p><p>{money(detail.grossAmount)}</p></div>
              <div><p className="text-gray-500">Commission</p><p className="text-red-600">-{money(detail.commissionAmount)}</p></div>
              <div><p className="text-gray-500">Processing Fee</p><p>-{money(detail.processingFeeAmount)}</p></div>
              <div><p className="text-gray-500">Tax Withheld</p><p>-{money(detail.taxWithheldAmount)}</p></div>
              <div><p className="text-gray-500">Net Payout</p><p className="font-semibold text-green-700">{money(detail.netPayoutAmount)}</p></div>
              <div><p className="text-gray-500">Period</p><p>{fmt(detail.periodStart)} – {fmt(detail.periodEnd)}</p></div>
              <div><p className="text-gray-500">Scheduled</p><p>{fmt(detail.scheduledAt)}</p></div>
              <div><p className="text-gray-500">Created</p><p>{fmt(detail.createdAt)}</p></div>
            </div>
          </div>
        )}
      </DefaultModal>

      {/* Create modal */}
      <DefaultModal isOpen={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }} title="Create Seller Payout">
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
            <select value={form.sellerId} onChange={(e) => setForm((p) => ({ ...p, sellerId: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select Seller —</option>
              {sellerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Period Start" type="date" value={form.periodStart} onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))} />
            <Input label="Period End" type="date" value={form.periodEnd} onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))} />
          </div>
          <Input label="Gross Amount (₹)" type="number" value={form.grossAmount} onChange={(e) => setForm((p) => ({ ...p, grossAmount: e.target.value }))} placeholder="0.00" />
          <Input label="Commission Amount (₹)" type="number" value={form.commissionAmount} onChange={(e) => setForm((p) => ({ ...p, commissionAmount: e.target.value }))} placeholder="0.00" />
          <Input label="Processing Fee (₹)" type="number" value={form.processingFeeAmount} onChange={(e) => setForm((p) => ({ ...p, processingFeeAmount: e.target.value }))} placeholder="0.00" />
          <Input label="Tax Withheld (₹)" type="number" value={form.taxWithheldAmount} onChange={(e) => setForm((p) => ({ ...p, taxWithheldAmount: e.target.value }))} placeholder="0.00" />
          <Input label="Net Payout Amount (₹) *" type="number" value={form.netPayoutAmount} onChange={(e) => setForm((p) => ({ ...p, netPayoutAmount: e.target.value }))} placeholder="0.00" />
          <button onClick={handleCreate} disabled={saving} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Creating..." : "Create Payout"}
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default SellerPayouts;
