import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdCheckCircle, MdClose, MdRefresh, MdVisibility, MdGavel } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import {
  BulkActionBar,
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  getAdminProductModerationQueue,
  moderateAdminProduct,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODERATION_STATUSES = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "change_pending",   label: "Change Pending"   },
  { value: "rejected",         label: "Rejected"         },
];

const CHECKLIST_FIELDS = [
  { key: "imagesOk",      label: "Images OK"      },
  { key: "titleOk",       label: "Title OK"       },
  { key: "descriptionOk", label: "Description OK" },
  { key: "pricingOk",     label: "Pricing OK"     },
  { key: "categoryOk",    label: "Category OK"    },
  { key: "specsOk",       label: "Specs OK"       },
  { key: "complianceOk",  label: "Compliance OK"  },
];

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Status",
    options: MODERATION_STATUSES,
  },
  { key: "category", type: "text", label: "Category", width: "w-44" },
];

const EMPTY_REJECT_MODAL = {
  open: false,
  product: null,
  rejectionReason: "",
  checklist: {
    imagesOk:      false,
    titleOk:       false,
    descriptionOk: false,
    pricingOk:     false,
    categoryOk:    false,
    specsOk:       false,
    complianceOk:  false,
  },
};

const EMPTY_MODERATE_MODAL = {
  open: false,
  product: null,
  status: "active",
  rejectionReason: "",
};

const EMPTY_CONFIRM = { open: false, title: "", message: "", variant: "warning", onConfirm: null };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list:  data?.items || data?.list || data || [],
    total: Number(data?.total ?? data?.items?.length ?? data?.list?.length ?? 0),
  };
};

const productId = (row) => row?._id || row?.id || row?.productId;
const money     = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const display   = (value = "") => String(value || "N/A").replace(/_/g, " ");

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProductModerationQueue = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const selector  = useSelector((state) => state.adminCore);
  const payload   = unwrapList(selector.adminProductModerationQueueData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey:  "createdAt",
    defaultSortDir:  "desc",
    defaultFilters:  { status: "pending_approval" },
  });
  const { toQueryParams } = list;

  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [rejectModal,    setRejectModal]    = useState(EMPTY_REJECT_MODAL);
  const [moderateModal,  setModerateModal]  = useState(EMPTY_MODERATE_MODAL);
  const [confirmState,   setConfirmState]   = useState(EMPTY_CONFIRM);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getAdminProductModerationQueue({
        ...params,
        offset: (params.page - 1) * params.limit,
      })).unwrap();
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to load moderation queue";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // ── Approve single ───────────────────────────────────────────────────────
  const openApproveConfirm = useCallback((row) => {
    setConfirmState({
      open:      true,
      title:     "Approve Product?",
      message:   `This will approve "${row.title || row.name || productId(row)}" and set its status to active.`,
      variant:   "success",
      onConfirm: async () => {
        try {
          setLoading(true);
          await dispatch(moderateAdminProduct({
            productId: productId(row),
            status:    "active",
          })).unwrap();
          toast.success("Product approved successfully");
          setConfirmState(EMPTY_CONFIRM);
          await fetchQueue();
        } catch (requestError) {
          toast.error(requestError?.message || requestError || "Failed to approve product");
        } finally {
          setLoading(false);
        }
      },
    });
  }, [dispatch, fetchQueue]);

  // ── Reject single ────────────────────────────────────────────────────────
  const openRejectModal = useCallback((row) => {
    setRejectModal({ ...EMPTY_REJECT_MODAL, open: true, product: row });
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    const { product, rejectionReason, checklist } = rejectModal;
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    if (rejectionReason.trim().length < 10) {
      toast.error("Rejection reason must be at least 10 characters");
      return;
    }
    try {
      setLoading(true);
      await dispatch(moderateAdminProduct({
        productId:       productId(product),
        status:          "rejected",
        rejectionReason: rejectionReason.trim(),
        checklist,
      })).unwrap();
      toast.success("Product rejected");
      setRejectModal(EMPTY_REJECT_MODAL);
      await fetchQueue();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to reject product");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchQueue, rejectModal]);

  // ── Moderate (change_pending) ────────────────────────────────────────────
  const openModerateModal = useCallback((row) => {
    setModerateModal({ ...EMPTY_MODERATE_MODAL, open: true, product: row });
  }, []);

  const handleModerateSubmit = useCallback(async () => {
    const { product, status, rejectionReason } = moderateModal;
    if (status === "rejected" && (!rejectionReason.trim() || rejectionReason.trim().length < 10)) {
      toast.error("Rejection reason must be at least 10 characters when rejecting");
      return;
    }
    try {
      setLoading(true);
      await dispatch(moderateAdminProduct({
        productId:       productId(product),
        status,
        ...(status === "rejected" && { rejectionReason: rejectionReason.trim() }),
      })).unwrap();
      toast.success(`Product status updated to ${display(status)}`);
      setModerateModal(EMPTY_MODERATE_MODAL);
      await fetchQueue();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to moderate product");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchQueue, moderateModal]);

  // ── Bulk approve ─────────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(() => {
    const count = list.selectedKeys.length;
    if (!count) return;
    setConfirmState({
      open:      true,
      title:     `Approve ${count} product${count > 1 ? "s" : ""}?`,
      message:   `All ${count} selected product${count > 1 ? "s" : ""} will be set to active.`,
      variant:   "success",
      onConfirm: async () => {
        try {
          setLoading(true);
          await Promise.all(
            list.selectedKeys.map((key) =>
              dispatch(moderateAdminProduct({ productId: key, status: "active" })).unwrap()
            )
          );
          toast.success(`${count} product${count > 1 ? "s" : ""} approved`);
          list.clearSelection();
          setConfirmState(EMPTY_CONFIRM);
          await fetchQueue();
        } catch (requestError) {
          toast.error(requestError?.message || requestError || "Bulk approve failed");
        } finally {
          setLoading(false);
        }
      },
    });
  }, [dispatch, fetchQueue, list]);

  // ── Bulk reject ──────────────────────────────────────────────────────────
  const handleBulkReject = useCallback(() => {
    const count = list.selectedKeys.length;
    if (!count) return;
    // Open the reject modal with null product — we'll iterate selectedKeys on submit
    setRejectModal({
      ...EMPTY_REJECT_MODAL,
      open:    true,
      product: null, // signals bulk mode
      _bulk:   true,
      _count:  count,
    });
  }, [list]);

  const handleBulkRejectSubmit = useCallback(async () => {
    const { rejectionReason, checklist } = rejectModal;
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    if (rejectionReason.trim().length < 10) {
      toast.error("Rejection reason must be at least 10 characters");
      return;
    }
    const count = list.selectedKeys.length;
    try {
      setLoading(true);
      await Promise.all(
        list.selectedKeys.map((key) =>
          dispatch(moderateAdminProduct({
            productId:       key,
            status:          "rejected",
            rejectionReason: rejectionReason.trim(),
            checklist,
          })).unwrap()
        )
      );
      toast.success(`${count} product${count > 1 ? "s" : ""} rejected`);
      list.clearSelection();
      setRejectModal(EMPTY_REJECT_MODAL);
      await fetchQueue();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Bulk reject failed");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchQueue, list, rejectModal]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key:      "_id",
      label:    "Product ID",
      sortable: true,
      render:   (_, row) => (
        <span className="font-mono text-xs text-gray-500">
          {String(productId(row) || "").slice(0, 16)}{String(productId(row) || "").length > 16 ? "…" : ""}
        </span>
      ),
    },
    {
      key:      "title",
      label:    "Name / Title",
      sortable: true,
      render:   (value, row) => {
        const name      = row.title || row.name || value;
        const thumbnail = row.thumbnail || row.images?.[0]?.url || row.image;
        return (
          <div className="flex items-center gap-2 min-w-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={name || "product"}
                className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-100"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-gray-400">IMG</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{name || "—"}</div>
              {row.sku && <div className="text-xs text-gray-400">SKU: {row.sku}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key:      "category",
      label:    "Category",
      sortable: true,
      render:   (value, row) => {
        const cat = row.categoryName || row.category?.name || value;
        return <span className="text-sm text-gray-700">{cat || "—"}</span>;
      },
    },
    {
      key:      "sellerId",
      label:    "Seller",
      sortable: true,
      render:   (value, row) => {
        const name = row.sellerName || row.seller?.name || row.seller?.businessName;
        return (
          <div>
            {name && <div className="text-sm font-medium text-gray-800">{name}</div>}
            {!name && value && (
              <span className="font-mono text-xs text-gray-500">
                {String(value).slice(0, 14)}{String(value).length > 14 ? "…" : ""}
              </span>
            )}
            {!name && !value && "—"}
          </div>
        );
      },
    },
    {
      key:      "status",
      label:    "Status",
      sortable: true,
      render:   (value) => <StatusBadge status={display(value)} dot />,
    },
    {
      key:      "price",
      label:    "Price",
      sortable: true,
      render:   (value, row) => {
        const price = value ?? row.basePrice ?? row.mrp ?? row.variants?.[0]?.price;
        return <span className="text-sm text-gray-700">{price != null ? money(price) : "—"}</span>;
      },
    },
    {
      key:      "createdAt",
      label:    "Submitted",
      sortable: true,
      render:   (value) => value ? moment(value).format("DD-MM-YYYY HH:mm") : "—",
    },
    {
      key:    "actions",
      label:  "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          {/* View */}
          <PermissionGuard module="products" action={ACTIONS.VIEW} hide>
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => navigate(`/app/product-catalog/view/${productId(row)}`)}
            >
              <MdVisibility size={15} /> View
            </button>
          </PermissionGuard>

          {/* Approve — for pending_approval */}
          {row.status === "pending_approval" && (
            <PermissionGuard module="products" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1 text-green-600"
                onClick={() => openApproveConfirm(row)}
              >
                <MdCheckCircle size={15} /> Approve
              </button>
            </PermissionGuard>
          )}

          {/* Reject — for pending_approval */}
          {row.status === "pending_approval" && (
            <PermissionGuard module="products" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1 text-red-600"
                onClick={() => openRejectModal(row)}
              >
                <MdClose size={15} /> Reject
              </button>
            </PermissionGuard>
          )}

          {/* Moderate — for change_pending */}
          {row.status === "change_pending" && (
            <PermissionGuard module="products" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1"
                onClick={() => openModerateModal(row)}
              >
                <MdGavel size={15} /> Moderate
              </button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ], [navigate, openApproveConfirm, openRejectModal, openModerateModal]);

  // ── Bulk actions config ──────────────────────────────────────────────────
  const bulkActions = useMemo(() => [
    {
      label:   "Approve Selected",
      icon:    <MdCheckCircle />,
      action:  ACTIONS.UPDATE,
      onClick: handleBulkApprove,
      variant: "primary",
    },
    {
      label:   "Reject Selected",
      icon:    <MdClose />,
      action:  ACTIONS.UPDATE,
      onClick: handleBulkReject,
      variant: "danger",
    },
  ], [handleBulkApprove, handleBulkReject]);

  // ── Reject modal submit handler — routes to single vs bulk ───────────────
  const onRejectModalSubmit = rejectModal._bulk ? handleBulkRejectSubmit : handleRejectSubmit;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <Loader loading={loading} />

      <PageHeader
        title="Product Moderation Queue"
        subtitle="Review and approve or reject products submitted by sellers"
        breadcrumbs={[{ label: "Product Management" }, { label: "Moderation Queue" }]}
        actions={
          <button type="button" onClick={fetchQueue}>
            <MdRefresh size={17} /> Refresh
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total || payload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search by product name, SKU, or seller"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchQueue}
        error={error}
        emptyMessage="No products pending moderation"
        selectable
        selectedKeys={list.selectedKeys}
        onSelectionChange={list.setSelectedKeys}
        filterBar={(
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        )}
        bulkActionBar={(
          <BulkActionBar
            selectedCount={list.selectedCount}
            totalCount={payload.total || payload.list.length}
            onClear={list.clearSelection}
            onSelectAll={() => list.setSelectedKeys(payload.list.map((row) => productId(row)))}
            module="products"
            actions={bulkActions}
            loading={loading}
          />
        )}
        requiredModule="products"
        exportConfig={{ filename: "product-moderation-queue", columns, data: payload.list }}
      />

      {/* ── Approve confirmation modal ── */}
      <ConfirmModal
        open={confirmState.open}
        onClose={() => !loading && setConfirmState(EMPTY_CONFIRM)}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant || "warning"}
        confirmLabel="Yes, proceed"
        cancelLabel="Cancel"
        loading={loading}
      />

      {/* ── Reject modal ── */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(31,27,95,0.35)] backdrop-blur-[2px]"
            onClick={() => !loading && setRejectModal(EMPTY_REJECT_MODAL)}
          />
          <div className="admin-card relative w-full max-w-lg mx-4 p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--admin-ink)]">
                {rejectModal._bulk
                  ? `Reject ${rejectModal._count} Product${rejectModal._count > 1 ? "s" : ""}`
                  : `Reject Product`}
              </h3>
              <button
                type="button"
                onClick={() => !loading && setRejectModal(EMPTY_REJECT_MODAL)}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Product name (single mode) */}
            {rejectModal.product && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <strong>Product:</strong>{" "}
                {rejectModal.product.title || rejectModal.product.name || productId(rejectModal.product)}
              </div>
            )}

            {/* Rejection reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="admin-input w-full min-h-[90px] resize-y"
                placeholder="Describe why this product is being rejected (min. 10 characters)…"
                value={rejectModal.rejectionReason}
                disabled={loading}
                onChange={(e) =>
                  setRejectModal((prev) => ({ ...prev, rejectionReason: e.target.value }))
                }
              />
              <div className="text-xs text-gray-400 mt-1">
                {rejectModal.rejectionReason.trim().length} / 10 min. characters
              </div>
            </div>

            {/* Checklist */}
            <div className="mb-5">
              <div className="text-sm font-medium text-gray-700 mb-2">Review Checklist (optional)</div>
              <div className="grid grid-cols-2 gap-2">
                {CHECKLIST_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[var(--admin-gold)] focus:ring-[var(--admin-gold)]"
                      checked={rejectModal.checklist[key]}
                      disabled={loading}
                      onChange={(e) =>
                        setRejectModal((prev) => ({
                          ...prev,
                          checklist: { ...prev.checklist, [key]: e.target.checked },
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="admin-btn-secondary !min-h-9 px-4 py-2 text-sm"
                disabled={loading}
                onClick={() => setRejectModal(EMPTY_REJECT_MODAL)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || rejectModal.rejectionReason.trim().length < 10}
                className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={onRejectModalSubmit}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Rejecting…
                  </span>
                ) : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Moderate modal (change_pending) ── */}
      {moderateModal.open && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(31,27,95,0.35)] backdrop-blur-[2px]"
            onClick={() => !loading && setModerateModal(EMPTY_MODERATE_MODAL)}
          />
          <div className="admin-card relative w-full max-w-md mx-4 p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--admin-ink)]">Moderate Product</h3>
              <button
                type="button"
                onClick={() => !loading && setModerateModal(EMPTY_MODERATE_MODAL)}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Product name */}
            {moderateModal.product && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <strong>Product:</strong>{" "}
                {moderateModal.product.title || moderateModal.product.name || productId(moderateModal.product)}
              </div>
            )}

            {/* Status selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Set Status <span className="text-red-500">*</span>
              </label>
              <select
                className="admin-input w-full"
                value={moderateModal.status}
                disabled={loading}
                onChange={(e) => setModerateModal((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Approve — set to Active</option>
                <option value="rejected">Reject — request changes</option>
              </select>
            </div>

            {/* Rejection reason — only when rejecting */}
            {moderateModal.status === "rejected" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="admin-input w-full min-h-[80px] resize-y"
                  placeholder="Describe the required changes (min. 10 characters)…"
                  value={moderateModal.rejectionReason}
                  disabled={loading}
                  onChange={(e) =>
                    setModerateModal((prev) => ({ ...prev, rejectionReason: e.target.value }))
                  }
                />
                <div className="text-xs text-gray-400 mt-1">
                  {moderateModal.rejectionReason.trim().length} / 10 min. characters
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                className="admin-btn-secondary !min-h-9 px-4 py-2 text-sm"
                disabled={loading}
                onClick={() => setModerateModal(EMPTY_MODERATE_MODAL)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  (moderateModal.status === "rejected" && moderateModal.rejectionReason.trim().length < 10)
                }
                className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--admin-gold)] hover:bg-[var(--admin-gold-dark)] text-[var(--admin-navy)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleModerateSubmit}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-[var(--admin-navy)]/30 border-t-[var(--admin-navy)] rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductModerationQueue;
