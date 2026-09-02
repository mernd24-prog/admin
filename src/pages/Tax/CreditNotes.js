/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdDownload, MdVisibility } from "react-icons/md";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../components/Loader/Loader";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../components/Atoms/Input/Input";
import {
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  StatusBadge,
} from "../../components/Shared";
import {
  getTaxCreditNotes,
  createTaxCreditNote,
} from "../../Redux/adminCoreSlice";
import { ACTIONS, usePermission } from "../../_helpers/usePermission";
import { useListPage } from "../../hooks/useListPage";
import { dropdownApi } from "../../_helpers/dropdownApi";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { formatDateTime12Hour, formatLabel } from "../../utils/formatters";

const REF_TYPES = ["return", "cancellation", "refund", "manual"];

const CLASS_TEXT_XS_MUTED = "text-xs text-gray-500";
const CLASS_SECTION_TITLE = "mb-3 text-sm font-semibold text-gray-900";
const CLASS_CARD_WHITE = "rounded-lg border border-gray-100 bg-white p-3";
const CLASS_CODE_VALUE = "mt-1 break-all font-mono text-xs text-gray-800";
const CLASS_AMOUNT_CARD = "rounded-xl border border-gray-200 p-4";
const CLASS_AMOUNT_VALUE = "mt-1 text-base font-semibold text-gray-900";

const FILTER_FIELDS = [
  // { key: "search", type: "text", label: "Search", width: "w-56" },
  { key: "orderId", type: "text", label: "Order #", width: "w-56" },
  {
    key: "organizationId",
    type: "text",
    label: "Organization ID",
    width: "w-52",
  },
  {
    key: "buyerId",
    type: "asyncDropdown",
    label: "Buyer",
    load: (search) =>
      dropdownApi.getBuyers({
        keyWord: search,
        searchFields: "full_name,email",
      }),
  },
  {
    key: "referenceType",
    type: "select",
    label: "Ref Type",
    options: REF_TYPES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.creditNotes || data || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const fmt = (value) => formatDateTime12Hour(value, "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const pick = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "")
      return row[key];
  }
  return undefined;
};
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12
    ? `${text.slice(0, 8)}...${text.slice(-4)}`
    : text || "—";
};

const EMPTY_FORM = {
  orderId: "",
  referenceId: "",
  referenceType: "return",
  taxableAmount: "",
  taxAmount: "",
  totalAmount: "",
  reason: "",
};

const CreditNotes = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.taxCreditNotesData);
  const filterFields = useMemo(
    () =>
      isSeller
        ? FILTER_FIELDS.filter(
            (field) => !["organizationId", "buyerId"].includes(field.key),
          )
        : FILTER_FIELDS,
    [isSeller],
  );

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "issuedAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      const allowedSortBy = new Set([
        "issuedAt",
        "creditNoteNumber",
        "taxableAmount",
        "taxAmount",
        "totalAmount",
      ]);
      const sortBy = allowedSortBy.has(params.sortBy)
        ? params.sortBy
        : "issuedAt";
      await dispatch(
        getTaxCreditNotes({
          ...params,
          sortBy,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load credit notes";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = useCallback(async () => {
    if (isSeller) {
      toast.error("Credit note creation is admin-only");
      return;
    }
    if (!form.orderId.trim()) {
      toast.error("Order ID required");
      return;
    }
    if (!form.taxableAmount || Number(form.taxableAmount) <= 0) {
      toast.error("Taxable amount must be > 0");
      return;
    }
    try {
      setSaving(true);
      const taxableAmount = Number(form.taxableAmount);
      const taxAmount = form.taxAmount ? Number(form.taxAmount) : undefined;
      await dispatch(
        createTaxCreditNote({
          orderId: form.orderId,
          referenceId: form.referenceId || undefined,
          referenceType: form.referenceType,
          taxableAmount,
          taxAmount,
          ...(form.totalAmount
            ? { totalAmount: Number(form.totalAmount) }
            : {}),
          reason: form.reason || undefined,
        }),
      ).unwrap();
      toast.success("Credit note created");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchNotes();
    } catch (err) {
      toast.error(err?.message || "Failed to create credit note");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch, fetchNotes, isSeller]);

  const downloadCreditNote = useCallback(async (row = {}) => {
    const creditNoteId = pick(row, "id", "creditNoteId", "credit_note_id");
    if (!creditNoteId) {
      toast.error("Credit note ID is missing");
      return;
    }
    try {
      setDownloadingId(creditNoteId);
      await downloadApiFile(
        ENDPOINTS.tax.creditNoteDownload(creditNoteId),
        { format: "pdf" },
        {
          filename: `${pick(row, "creditNoteNumber", "credit_note_number") || creditNoteId}.pdf`,
          format: "pdf",
        },
      );
      toast.success("Download started");
    } catch (downloadError) {
      toast.error(downloadError?.message || "Unable to download credit note");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const COLUMNS = useMemo(
    () =>
      [
        {
          key: "creditNoteNumber",
          label: "Credit Note #",
          sortable: true,
          render: (v, row) => (
            <span className="font-mono text-sm font-medium">
              {v || row.credit_note_number || "—"}
            </span>
          ),
        },
        {
          key: "orderId",
          label: "Order",
          render: (v, row) => {
            const orderId = v || row?.order_id;
            return (
              <OrderLink
                orderId={orderId}
                orderNumber={row.orderNumber || row.order_number}
              />
            );
          },
        },
        {
          key: "referenceType",
          label: "Ref Type",
          render: (v, row) => (
            <span className="capitalize text-sm">
              {v || row.reference_type || "—"}
            </span>
          ),
        },
        {
          key: "organizationId",
          label: "Organization",
          render: (v, row) => (
            <span className="font-mono text-xs text-gray-500">
              {shortId(v || row.organization_id)}
            </span>
          ),
        },
        {
          key: "totalAmount",
          label: "Total Credit",
          sortable: true,
          render: (v, row) => (
            <span className="text-sm font-semibold">
              {money(v ?? row.total_amount ?? row.taxable_amount)}
            </span>
          ),
        },
        {
          key: "taxAmount",
          label: "Tax",
          render: (v, row) => (
            <span className="text-sm">{money(v ?? row.tax_amount)}</span>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (v) => (
            <StatusBadge
              status={v || "issued"}
              color={
                v === "cancelled" ? "red" : v === "applied" ? "blue" : "green"
              }
            />
          ),
        },
        {
          key: "createdAt",
          label: "Date",
          sortable: true,
          render: (v, row) => (
            <span className={CLASS_TEXT_XS_MUTED}>
              {formatDateTime12Hour(v ?? row.issued_at ?? row.created_at)}
            </span>
          ),
        },
      ].filter((column) => !(isSeller && column.key === "organizationId")),
    [isSeller],
  );

  const rowActions = useCallback(
    (row) => {
      const creditNoteId = pick(row, "id", "creditNoteId", "credit_note_id");
      return [
        {
          label: "View",
          icon: <MdVisibility size={16} className="text-blue-600" />,
          onClick: () => setDetail(row),
        },
        {
          label: "Download PDF",
          icon: <MdDownload size={16} className="text-gray-600" />,
          disabled: downloadingId === creditNoteId,
          onClick: () => downloadCreditNote(row),
        },
      ];
    },
    [downloadCreditNote, downloadingId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Notes"
        subtitle="Tax credit notes for returns and cancellations."
        breadcrumbs={[
          { label: "Invoices & Taxation" },
          { label: "Credit Notes" },
        ]}
        actions={
          <div className="flex gap-2">
            {!isSeller && (
              <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
                <button onClick={() => setShowCreate(true)}>
                  <MdAdd size={16} /> New Credit Note
                </button>
              </PermissionGuard>
            )}
          </div>
        }
      />

      {/* {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )} */}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No credit notes found"
          rowActions={rowActions}
          filterBar={<FilterBar fields={filterFields} listPage={list} />}
        />
      )}

      {/* Detail */}
  <DefaultModal
  isOpen={!!detail}
  onClose={() => setDetail(null)}
  title="Credit Note Details"
>
  {detail && (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={CLASS_TEXT_XS_MUTED}>
              Credit Note Number
            </p>

            <p className="mt-1 font-mono text-sm font-semibold text-gray-900">
              {pick(detail, "creditNoteNumber", "credit_note_number") || "—"}
            </p>
          </div>

          <StatusBadge
            status={detail.status || "issued"}
            color={detail.status === "cancelled" ? "red" : "green"}
          />
        </div>
      </div>

      {/* Reference Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Reference Information
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Details related to the order and credit note reference.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={CLASS_CARD_WHITE}>
            <p className={CLASS_TEXT_XS_MUTED}>Order ID</p>

            <div className="mt-1 text-sm font-medium text-gray-900">
              <OrderLink
                orderId={pick(detail, "orderId", "order_id")}
                orderNumber={pick(detail, "orderNumber", "order_number")}
              />
            </div>
          </div>

          <div className={CLASS_CARD_WHITE}>
            <p className={CLASS_TEXT_XS_MUTED}>Organization ID</p>

            <p className={CLASS_CODE_VALUE}>
              {pick(detail, "organizationId", "organization_id") || "—"}
            </p>
          </div>

          <div className={CLASS_CARD_WHITE}>
            <p className={CLASS_TEXT_XS_MUTED}>Reference Type</p>

            <p className="mt-1 text-sm font-medium capitalize text-gray-800">
              {pick(detail, "referenceType", "reference_type") || "—"}
            </p>
          </div>

          <div className={CLASS_CARD_WHITE}>
            <p className={CLASS_TEXT_XS_MUTED}>Reference ID</p>

            <p className={CLASS_CODE_VALUE}>
              {pick(detail, "referenceId", "reference_id") || "—"}
            </p>
          </div>

          <div className={CLASS_CARD_WHITE}>
            <p className={CLASS_TEXT_XS_MUTED}>Buyer ID</p>

            <p className={CLASS_CODE_VALUE}>
              {pick(detail, "buyerId", "buyer_id") || "—"}
            </p>
          </div>

          <div className={CLASS_CARD_WHITE}>
            <p className={CLASS_TEXT_XS_MUTED}>Created</p>

            <p className="mt-1 text-sm font-medium text-gray-800">
              {fmt(
                pick(
                  detail,
                  "createdAt",
                  "issuedAt",
                  "created_at",
                  "issued_at",
                ),
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Amount Details
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Breakdown of the credit note amount.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={CLASS_AMOUNT_CARD}>
            <p className={CLASS_TEXT_XS_MUTED}>
              Taxable Amount
            </p>

            <p className={CLASS_AMOUNT_VALUE}>
              {money(
                pick(detail, "taxableAmount", "taxable_amount"),
              )}
            </p>
          </div>

          <div className={CLASS_AMOUNT_CARD}>
            <p className={CLASS_TEXT_XS_MUTED}>
              Tax Amount
            </p>

            <p className={CLASS_AMOUNT_VALUE}>
              {money(
                pick(detail, "taxAmount", "tax_amount"),
              )}
            </p>
          </div>

          <div className="rounded-xl border border-[#CB9C2D]/30 bg-[#CB9C2D]/10 p-4">
            <p className="text-xs font-medium text-gray-600">
              Total Credit
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {money(
                pick(detail, "totalAmount", "total_amount"),
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Reason */}
      {detail.reason && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Reason
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Reason provided for issuing this credit note.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm leading-6 text-gray-700">
              {detail.reason}
            </p>
          </div>
        </div>
      )}

      {/* Footer Action */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => downloadCreditNote(detail)}
          disabled={
            downloadingId ===
            pick(detail, "id", "creditNoteId", "credit_note_id")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-[#CB9C2D] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#b88b25] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MdDownload size={17} />

          {downloadingId ===
          pick(detail, "id", "creditNoteId", "credit_note_id")
            ? "Downloading..."
            : "Download PDF"}
        </button>
      </div>
    </div>
  )}
</DefaultModal>

      {/* Create modal */}
      <DefaultModal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setForm(EMPTY_FORM);
        }}
        title="Create Credit Note"
      >
        <div className="p-4 space-y-4">
          <Input
            label="Order ID *"
            value={form.orderId}
            onChange={(e) =>
              setForm((p) => ({ ...p, orderId: e.target.value }))
            }
            placeholder="Order UUID..."
          />
          <Input
            label="Reference ID"
            value={form.referenceId}
            onChange={(e) =>
              setForm((p) => ({ ...p, referenceId: e.target.value }))
            }
            placeholder="Return / cancellation ID..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Type
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.referenceType}
              onChange={(e) =>
                setForm((p) => ({ ...p, referenceType: e.target.value }))
              }
            >
              {REF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Taxable Amount *"
            type="number"
            value={form.taxableAmount}
            onChange={(e) =>
              setForm((p) => ({ ...p, taxableAmount: e.target.value }))
            }
            placeholder="0.00"
          />
          <Input
            label="Tax Amount"
            type="number"
            value={form.taxAmount}
            onChange={(e) =>
              setForm((p) => ({ ...p, taxAmount: e.target.value }))
            }
            placeholder="0.00"
          />
          <Input
            label="Total Credit Amount"
            type="number"
            value={form.totalAmount}
            onChange={(e) =>
              setForm((p) => ({ ...p, totalAmount: e.target.value }))
            }
            placeholder="Taxable + tax"
          />
          <Input
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            placeholder="Reason for credit note..."
          />
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
