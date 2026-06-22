/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdCheckCircle,
  MdClose,
  MdPause,
  MdPlayArrow,
  MdRefresh,
  MdVisibility,
} from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  getDeals,
  getDeal,
  approveDeal,
  rejectDeal,
  pauseDeal,
  resumeDeal,
  cancelDeal,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const DEAL_STATUSES = [
  "draft",
  "pending_approval",
  "scheduled",
  "active",
  "paused",
  "expired",
  "completed",
  "rejected",
  "cancelled",
];

const DEAL_TYPES = [
  "fixed_price",
  "percentage_discount",
  "flash_sale",
  "limited_inventory",
  "sponsored_placement",
  "bulk_quantity",
  "new_seller_promo",
  "brand_partnership",
  "region_specific",
  "variant_level",
];

const STATUS_COLOR = {
  draft: "gray",
  pending_approval: "yellow",
  scheduled: "blue",
  active: "green",
  paused: "orange",
  expired: "gray",
  completed: "green",
  rejected: "red",
  cancelled: "red",
};

const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Search", width: "w-56" },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  { key: "status", type: "select", label: "Status", options: DEAL_STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
  { key: "dealType", type: "select", label: "Type", options: DEAL_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.deals || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const display = (v = "") => String(v || "—").replace(/_/g, " ");
const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");

const CONFIRM_TITLES = {
  approve: "Approve Deal",
  reject: "Reject Deal",
  pause: "Pause Deal",
  resume: "Resume Deal",
  cancel: "Cancel Deal",
};

const CONFIRM_DESCRIPTIONS = {
  approve: "Approve this deal and make it live?",
  reject: "Reject this deal. This action cannot be undone.",
  pause: "Pause this deal temporarily?",
  resume: "Resume this paused deal?",
  cancel: "Cancel this deal permanently?",
};

const DealManagement = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.dealsData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, action: "", deal: null, reason: "", note: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getDeals({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load deals";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const openDetail = useCallback(async (deal) => {
    setDetail(deal);
    setDetailLoading(true);
    try {
      const res = await dispatch(getDeal({ dealId: deal._id || deal.id })).unwrap();
      setDetail(res?.data?.data || res?.data || deal);
    } catch (err) {
      toast.error(err?.message || "Failed to load deal detail");
    } finally {
      setDetailLoading(false);
    }
  }, [dispatch]);

  const openConfirm = (action, deal) =>
    setConfirm({ open: true, action, deal, reason: "", note: "" });

  const closeConfirm = () =>
    setConfirm({ open: false, action: "", deal: null, reason: "", note: "" });

  const submitAction = useCallback(async () => {
    const { action, deal, reason, note } = confirm;
    if (!deal) return;
    const dealId = deal._id || deal.id;

    const thunkMap = {
      approve: approveDeal,
      reject: rejectDeal,
      pause: pauseDeal,
      resume: resumeDeal,
      cancel: cancelDeal,
    };

    if (["reject", "cancel"].includes(action) && !reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    try {
      setActionLoading(true);
      const body = { dealId, ...(reason ? { reason } : {}), ...(note ? { note } : {}) };
      await dispatch(thunkMap[action](body)).unwrap();
      toast.success(`Deal ${action}d successfully`);
      closeConfirm();
      fetchDeals();
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} deal`);
    } finally {
      setActionLoading(false);
    }
  }, [confirm, dispatch, fetchDeals]);

  const COLUMNS = [
    {
      key: "title",
      label: "Deal Title",
      sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-800 truncate max-w-[200px]">{v || "—"}</p>
          <p className="text-xs text-gray-500">{display(row.dealType)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} />,
    },
    {
      key: "sellerId",
      label: "Seller",
      render: (v) => <span className="text-sm text-gray-600 font-mono">{v || "—"}</span>,
    },
    {
      key: "startAt",
      label: "Start",
      sortable: true,
      render: (v) => <span className="text-sm">{fmt(v)}</span>,
    },
    {
      key: "endAt",
      label: "End",
      sortable: true,
      render: (v) => <span className="text-sm">{fmt(v)}</span>,
    },
    {
      key: "soldQuantity",
      label: "Sold",
      render: (v) => <span className="text-sm font-medium">{v ?? "—"}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => {
        const status = row.status;
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => openDetail(row)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="View"
            >
              <MdVisibility size={18} />
            </button>
            <PermissionGuard module="deals" action={ACTIONS.APPROVE} hide>
              {status === "pending_approval" && (
                <button
                  onClick={() => openConfirm("approve", row)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Approve"
                >
                  <MdCheckCircle size={18} />
                </button>
              )}
            </PermissionGuard>
            <PermissionGuard module="deals" action={ACTIONS.REJECT} hide>
              {status === "pending_approval" && (
                <button
                  onClick={() => openConfirm("reject", row)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Reject"
                >
                  <MdClose size={18} />
                </button>
              )}
            </PermissionGuard>
            <PermissionGuard module="deals" action={ACTIONS.UPDATE} hide>
              {status === "active" && (
                <button
                  onClick={() => openConfirm("pause", row)}
                  className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                  title="Pause"
                >
                  <MdPause size={18} />
                </button>
              )}
              {status === "paused" && (
                <button
                  onClick={() => openConfirm("resume", row)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Resume"
                >
                  <MdPlayArrow size={18} />
                </button>
              )}
              {["active", "paused", "scheduled"].includes(status) && (
                <button
                  onClick={() => openConfirm("cancel", row)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Cancel"
                >
                  <MdClose size={18} />
                </button>
              )}
            </PermissionGuard>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Deal Management"
        subtitle="Review, approve and manage seller deals"
        actions={
          <button
            onClick={fetchDeals}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <MdRefresh size={16} />
            Refresh
          </button>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No deals found"
        />
      )}

      {/* Detail modal */}
      <DefaultModal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Deal Detail"
      >
        {detailLoading ? (
          <Loader />
        ) : detail ? (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Title</p>
                <p className="font-medium">{detail.title || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <StatusBadge status={detail.status} color={STATUS_COLOR[detail.status] || "gray"} />
              </div>
              <div>
                <p className="text-gray-500">Type</p>
                <p>{display(detail.dealType)}</p>
              </div>
              <div>
                <p className="text-gray-500">Seller ID</p>
                <p className="font-mono">{detail.sellerId || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Start Date</p>
                <p>{fmt(detail.startAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">End Date</p>
                <p>{fmt(detail.endAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Discount</p>
                <p>{detail.discountValue != null ? `${detail.discountValue}${detail.discountType === "percentage" ? "%" : " ₹"}` : "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Sold Qty</p>
                <p>{detail.soldQuantity ?? "—"}</p>
              </div>
              {detail.description && (
                <div className="col-span-2">
                  <p className="text-gray-500">Description</p>
                  <p>{detail.description}</p>
                </div>
              )}
            </div>
            {detail.status === "pending_approval" && (
              <div className="flex gap-2 pt-2 border-t">
                <PermissionGuard module="deals" action={ACTIONS.APPROVE} hide>
                  <button
                    onClick={() => { setDetail(null); openConfirm("approve", detail); }}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    Approve
                  </button>
                </PermissionGuard>
                <PermissionGuard module="deals" action={ACTIONS.REJECT} hide>
                  <button
                    onClick={() => { setDetail(null); openConfirm("reject", detail); }}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    Reject
                  </button>
                </PermissionGuard>
              </div>
            )}
          </div>
        ) : null}
      </DefaultModal>

      {/* Confirm action modal */}
      <ConfirmModal
        isOpen={confirm.open}
        title={CONFIRM_TITLES[confirm.action] || "Confirm"}
        description={CONFIRM_DESCRIPTIONS[confirm.action] || "Are you sure?"}
        onConfirm={submitAction}
        onCancel={closeConfirm}
        loading={actionLoading}
        confirmLabel={confirm.action ? confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1) : "Confirm"}
        confirmVariant={["approve", "resume"].includes(confirm.action) ? "success" : "danger"}
      >
        {["reject", "cancel"].includes(confirm.action) && (
          <div className="mt-3">
            <Input
              label="Reason *"
              value={confirm.reason}
              onChange={(e) => setConfirm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Enter reason..."
            />
          </div>
        )}
        {["approve", "pause"].includes(confirm.action) && (
          <div className="mt-3">
            <Input
              label="Note (optional)"
              value={confirm.note}
              onChange={(e) => setConfirm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Add a note..."
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

export default DealManagement;
