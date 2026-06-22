/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdRefresh, MdVisibility } from "react-icons/md";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../components/Loader/Loader";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../components/Atoms/Input/Input";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../components/Shared";
import { getTaxCreditNotes, createTaxCreditNote } from "../../Redux/adminCoreSlice";
import { ACTIONS } from "../../_helpers/usePermission";
import { useListPage } from "../../hooks/useListPage";
import { dropdownApi } from "../../_helpers/dropdownApi";

const REF_TYPES = ["return", "cancellation", "adjustment", "discount", "other"];

const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Search", width: "w-56" },
  { key: "orderId", type: "text", label: "Order #", width: "w-56" },
  { key: "organizationId", type: "text", label: "Organization ID", width: "w-52" },
  { key: "buyerId", type: "asyncDropdown", label: "Buyer", load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }) },
  { key: "referenceType", type: "select", label: "Ref Type", options: REF_TYPES.map((v) => ({ value: v, label: v })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.creditNotes || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || "—";
};

const EMPTY_FORM = {
  orderId: "",
  referenceId: "",
  referenceType: "return",
  creditAmount: "",
  taxAmount: "",
  reason: "",
};

const CreditNotes = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.taxCreditNotesData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getTaxCreditNotes({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load credit notes";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleCreate = useCallback(async () => {
    if (!form.orderId.trim()) { toast.error("Order ID required"); return; }
    if (!form.creditAmount || Number(form.creditAmount) <= 0) { toast.error("Credit amount must be > 0"); return; }
    try {
      setSaving(true);
      await dispatch(createTaxCreditNote({
        orderId: form.orderId,
        referenceId: form.referenceId || undefined,
        referenceType: form.referenceType,
        creditAmount: Number(form.creditAmount),
        taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
        reason: form.reason || undefined,
      })).unwrap();
      toast.success("Credit note created");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchNotes();
    } catch (err) {
      toast.error(err?.message || "Failed to create credit note");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch, fetchNotes]);

  const COLUMNS = [
    {
      key: "creditNoteNumber",
      label: "Credit Note #",
      sortable: true,
      render: (v) => <span className="font-mono text-sm font-medium">{v || "—"}</span>,
    },
    {
      key: "orderId",
      label: "Order",
      render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-8)}</span>,
    },
    {
      key: "referenceType",
      label: "Ref Type",
      render: (v) => <span className="capitalize text-sm">{v || "—"}</span>,
    },
    {
      key: "organizationId",
      label: "Organization",
      render: (v, row) => <span className="font-mono text-xs text-gray-500">{shortId(v || row.organization_id)}</span>,
    },
    {
      key: "creditAmount",
      label: "Credit Amt",
      sortable: true,
      render: (v) => <span className="text-sm font-semibold">{money(v)}</span>,
    },
    {
      key: "taxAmount",
      label: "Tax",
      render: (v) => <span className="text-sm">{money(v)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <StatusBadge
          status={v || "issued"}
          color={v === "cancelled" ? "red" : v === "applied" ? "blue" : "green"}
        />
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
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
        title="Credit Notes"
        subtitle="Tax credit notes for returns and cancellations"
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "Credit Notes" }]}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchNotes} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <MdAdd size={16} /> New Credit Note
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No credit notes found"
        />
      )}

      {/* Detail */}
      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Credit Note Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Credit Note #</p><p className="font-mono">{detail.creditNoteNumber || "—"}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status || "issued"} color={detail.status === "cancelled" ? "red" : "green"} /></div>
              <div><p className="text-gray-500">Order ID</p><p className="font-mono text-xs">{detail.orderId || "—"}</p></div>
              <div><p className="text-gray-500">Organization ID</p><p className="font-mono text-xs">{detail.organizationId || detail.organization_id || "—"}</p></div>
              <div><p className="text-gray-500">Ref Type</p><p className="capitalize">{detail.referenceType || "—"}</p></div>
              <div><p className="text-gray-500">Reference ID</p><p className="font-mono text-xs">{detail.referenceId || "—"}</p></div>
              <div><p className="text-gray-500">Buyer ID</p><p className="font-mono text-xs">{detail.buyerId || "—"}</p></div>
              <div><p className="text-gray-500">Credit Amount</p><p className="font-semibold">{money(detail.creditAmount)}</p></div>
              <div><p className="text-gray-500">Tax Amount</p><p>{money(detail.taxAmount)}</p></div>
              <div><p className="text-gray-500">Created</p><p>{fmt(detail.createdAt)}</p></div>
            </div>
            {detail.reason && <div><p className="text-gray-500">Reason</p><p>{detail.reason}</p></div>}
          </div>
        )}
      </DefaultModal>

      {/* Create modal */}
      <DefaultModal isOpen={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }} title="Create Credit Note">
        <div className="p-4 space-y-4">
          <Input label="Order ID *" value={form.orderId} onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))} placeholder="Order UUID..." />
          <Input label="Reference ID" value={form.referenceId} onChange={(e) => setForm((p) => ({ ...p, referenceId: e.target.value }))} placeholder="Return / cancellation ID..." />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.referenceType}
              onChange={(e) => setForm((p) => ({ ...p, referenceType: e.target.value }))}
            >
              {REF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Credit Amount *" type="number" value={form.creditAmount} onChange={(e) => setForm((p) => ({ ...p, creditAmount: e.target.value }))} placeholder="0.00" />
          <Input label="Tax Amount" type="number" value={form.taxAmount} onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))} placeholder="0.00" />
          <Input label="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for credit note..." />
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Credit Note"}
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default CreditNotes;
