/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdCheckCircle, MdRefresh, MdVisibility } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  SellerLink,
  StatusBadge,
} from "../../../components/Shared";
import {
  getDealPayouts,
  generateDealPayout,
  processDealPayout,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const PAYOUT_STATUSES = [
  "generated",
  "processing",
  "paid",
  "failed",
  "cancelled",
];
const STATUS_COLOR = {
  generated: "blue",
  processing: "yellow",
  paid: "green",
  failed: "red",
  cancelled: "gray",
};

const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields: "full_name,email,businessName",
      }),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: PAYOUT_STATUSES.map((v) => ({ value: v, label: formatLabel(v) })),
  },
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

const fmt = (value) => formatDateTime12Hour(value, "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

const DealPayouts = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.dealPayoutsData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    fromDate: "",
    toDate: "",
    sellerId: "",
  });
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => {
    dropdownApi
      .getSellers({ limit: 100 })
      .then(setSellerOptions)
      .catch(() => {});
  }, []);
  const [generating, setGenerating] = useState(false);
  const [processConfirm, setProcessConfirm] = useState({
    open: false,
    payout: null,
    status: "paid",
    referenceId: "",
    note: "",
  });
  const [processing, setProcessing] = useState(false);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(
        getDealPayouts({ ...params, offset: (params.page - 1) * params.limit }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load deal payouts");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleGenerate = useCallback(async () => {
    if (!generateForm.fromDate || !generateForm.toDate) {
      toast.error("Date range required");
      return;
    }
    try {
      setGenerating(true);
      await dispatch(
        generateDealPayout({
          fromDate: generateForm.fromDate,
          toDate: generateForm.toDate,
          sellerId: generateForm.sellerId || undefined,
        }),
      ).unwrap();
      toast.success("Payout(s) generated");
      setShowGenerate(false);
      setGenerateForm({ fromDate: "", toDate: "", sellerId: "" });
      fetchPayouts();
    } catch (err) {
      toast.error(err?.message || "Failed to generate payouts");
    } finally {
      setGenerating(false);
    }
  }, [generateForm, dispatch, fetchPayouts]);

  const handleProcess = useCallback(async () => {
    const { payout, status, referenceId, note } = processConfirm;
    if (!payout) return;
    try {
      setProcessing(true);
      await dispatch(
        processDealPayout({
          payoutId: payout._id || payout.id,
          status,
          referenceId: referenceId || undefined,
          note: note || undefined,
        }),
      ).unwrap();
      toast.success(`Payout marked as ${status}`);
      setProcessConfirm({
        open: false,
        payout: null,
        status: "paid",
        referenceId: "",
        note: "",
      });
      fetchPayouts();
    } catch (err) {
      toast.error(err?.message || "Failed to process payout");
    } finally {
      setProcessing(false);
    }
  }, [processConfirm, dispatch, fetchPayouts]);

  const COLUMNS = [
    {
      key: "id",
      label: "ID",
      render: (v) => (
        <span className="font-mono text-xs text-gray-500">
          {String(v || "—").slice(-8)}
        </span>
      ),
    },
    {
      key: "sellerId",
      label: "Seller",
      render: (v, row) => {
        const name =
          row.sellerName ||
          row.seller?.name ||
          row.seller?.companyName ||
          sellerOptions.find((o) => o.value === v)?.label;
        return name ? (
          <SellerLink sellerId={v || row.seller_id || row.seller?.id || row.seller?._id} sellerName={name} />
        ) : (
          <span className="font-mono text-xs text-gray-400">
            {String(v || "—").slice(-8)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} />
      ),
    },
    {
      key: "totalAmount",
      label: "Amount",
      render: (v) => <span className="text-sm font-semibold">{money(v)}</span>,
    },
    {
      key: "periodStart",
      label: "Period",
      render: (v, row) => (
        <span className="text-xs text-gray-500">
          {fmt(v)} – {fmt(row.periodEnd)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Generated",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => setDetail(row)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View"
          >
            <MdVisibility size={18} />
          </button>
          <PermissionGuard module="deals" action={ACTIONS.APPROVE} hide>
            {row.status === "generated" && (
              <button
                onClick={() =>
                  setProcessConfirm({
                    open: true,
                    payout: row,
                    status: "paid",
                    referenceId: "",
                    note: "",
                  })
                }
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Process"
              >
                <MdCheckCircle size={18} />
              </button>
            )}
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Payouts"
        subtitle="Generate and process deal seller payouts"
        breadcrumbs={[{ label: "Marketing" }, { label: "Deal Payouts" }]}
        actions={
          <div className="flex gap-2">
            {/* <button onClick={fetchPayouts}>
              <MdRefresh size={16} /> Refresh
            </button> */}
            <PermissionGuard module="deals" action={ACTIONS.APPROVE} hide>
              <button onClick={() => setShowGenerate(true)}>
                <MdAdd size={16} /> Generate Payouts
              </button>
            </PermissionGuard>
          </div>
        }
      />
      <DataTable
        columns={COLUMNS}
        data={payload.list}
        total={payload.total}
        listPage={list}
        loading={loading}
        searchPlaceholder="Search deal payouts…"
        filterBar={<FilterBar fields={FILTER_FIELDS} listPage={list} />}
        emptyMessage="No deal payouts found"
      />

      {/* Detail */}
      <DefaultModal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Deal Payout Detail"
      >
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500">Payout ID</p>
                <p className="font-mono text-xs">{detail._id || detail.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <StatusBadge
                  status={detail.status}
                  color={STATUS_COLOR[detail.status] || "gray"}
                />
              </div>
              <div>
                <p className="text-gray-500">Seller</p>
                <p className="text-sm font-medium">
                  {detail.sellerName ||
                    detail.seller?.name ||
                    sellerOptions.find((o) => o.value === detail.sellerId)
                      ?.label || (
                      <span className="font-mono text-xs">
                        {detail.sellerId || "—"}
                      </span>
                    )}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Amount</p>
                <p className="font-semibold">{money(detail.totalAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Period</p>
                <p>
                  {fmt(detail.periodStart)} – {fmt(detail.periodEnd)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Reference ID</p>
                <p className="font-mono text-xs">{detail.referenceId || "—"}</p>
              </div>
            </div>
          </div>
        )}
      </DefaultModal>

      {/* Generate payouts modal */}
      <DefaultModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        title="Generate Deal Payouts"
      >
        <div className="p-4 space-y-4">
          <Input
            label="From Date *"
            type="date"
            value={generateForm.fromDate}
            onChange={(e) =>
              setGenerateForm((p) => ({ ...p, fromDate: e.target.value }))
            }
          />
          <Input
            label="To Date *"
            type="date"
            value={generateForm.toDate}
            onChange={(e) =>
              setGenerateForm((p) => ({ ...p, toDate: e.target.value }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seller{" "}
              <span className="text-gray-400 font-normal">
                (leave blank for all sellers)
              </span>
            </label>
            <select
              value={generateForm.sellerId}
              onChange={(e) =>
                setGenerateForm((p) => ({ ...p, sellerId: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— All Sellers —</option>
              {sellerOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Payouts"}
          </button>
        </div>
      </DefaultModal>

      {/* Process payout */}
      <ConfirmModal
        isOpen={processConfirm.open}
        title="Process Payout"
        description="Mark this deal payout as processed?"
        onConfirm={handleProcess}
        onCancel={() =>
          setProcessConfirm({
            open: false,
            payout: null,
            status: "paid",
            referenceId: "",
            note: "",
          })
        }
        loading={processing}
        confirmLabel="Process"
        confirmVariant="success"
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={processConfirm.status}
              onChange={(e) =>
                setProcessConfirm((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <Input
            label="Reference ID"
            value={processConfirm.referenceId}
            onChange={(e) =>
              setProcessConfirm((p) => ({ ...p, referenceId: e.target.value }))
            }
            placeholder="Bank / transfer reference..."
          />
          <Input
            label="Note"
            value={processConfirm.note}
            onChange={(e) =>
              setProcessConfirm((p) => ({ ...p, note: e.target.value }))
            }
            placeholder="Optional note..."
          />
        </div>
      </ConfirmModal>
    </div>
  );
};

export default DealPayouts;
