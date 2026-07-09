/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import moment from "moment/moment";
import { MdLocalOffer, MdAdd } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { useListPage } from "../../../hooks/useListPage";
import useDropdownOptions from "../../../hooks/useDropdownOptions";
import {
  createDiscountCoupons,
  editDiscountCoupons,
  enableDisableDiscountCoupons,
  getDiscountCoupons,
  softDeleteDiscountCoupons,
} from "../../../Redux/promotionsSlice";

// ── Utility helpers ────────────────────────────────────────────────────────────
const normalizeCouponType = (type) => (type === "flat" ? "fixed" : type);
const formatCouponType = (type) => {
  const t = normalizeCouponType(type);
  if (t === "percentage") return "Percentage (%)";
  if (t === "fixed") return "Fixed (₹)";
  return type || "—";
};
const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null);
const toNumber = (value, fallback = null) => {
  if (value === "" || value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};
const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};
const normalizeCouponRecord = (coupon = {}) => ({
  ...coupon,
  _id: coupon?._id || coupon?.id,
  type: normalizeCouponType(coupon?.type),
  min_order_value: firstDefined(coupon?.min_order_value, coupon?.minOrderAmount, 0),
  max_discount_value: firstDefined(coupon?.max_discount_value, coupon?.maxDiscountAmount, ""),
  uses_per_coupon: firstDefined(coupon?.uses_per_coupon, coupon?.usageLimit, ""),
  uses_per_customer: firstDefined(coupon?.uses_per_customer, coupon?.usesPerCustomer, ""),
  valid_from: firstDefined(coupon?.valid_from, coupon?.startsAt),
  valid_to: firstDefined(coupon?.valid_to, coupon?.expiresAt),
  isDisable: typeof coupon?.isDisable === "boolean" ? coupon.isDisable : coupon?.active === false,
});
const normalizeCouponsResponse = (payload) => {
  const data = payload?.data ?? payload;
  const list = Array.isArray(data) ? data
    : Array.isArray(data?.list) ? data.list
    : Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.coupons) ? data.coupons
    : [];
  return { list: list.map(normalizeCouponRecord), total: data?.total ?? payload?.meta?.total ?? list.length };
};
const toCouponApiPayload = (data) => ({
  code: String(data?.code || "").trim().toUpperCase(),
  title: data?.title || "",
  description: data?.description || "",
  type: normalizeCouponType(data?.type),
  value: toNumber(data?.value, 0),
  minOrderAmount: toNumber(data?.min_order_value, 0),
  maxDiscountAmount: toNumber(data?.max_discount_value, null),
  usageLimit: toNumber(data?.uses_per_coupon, null),
  usesPerCustomer: toNumber(data?.uses_per_customer, null),
  startsAt: data?.valid_from || null,
  expiresAt: data?.valid_to || null,
  active: !data?.isDisable,
});

const getDiscountStatus = (validFrom, validTo) => {
  const now = moment();
  if (now.isAfter(moment(validTo), "day")) return "expired";
  if (now.isBefore(moment(validFrom), "day")) return "upcoming";
  return "active";
};

const FILTER_FIELDS = [
  {
    key: "type",
    type: "select",
    label: "Type",
    width: "w-36",
    options: [
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed" },
    ],
  },
];

const COLUMNS = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v) => <span className="font-medium text-gray-800 capitalize">{v || "—"}</span>,
  },
  {
    key: "code",
    label: "Code",
    render: (v) => (
      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{v || "—"}</span>
    ),
  },
  {
    key: "type",
    label: "Type",
    render: (v) => <span className="text-sm text-gray-600">{formatCouponType(v)}</span>,
  },
  {
    key: "value",
    label: "Discount",
    render: (v, row) => {
      const t = normalizeCouponType(row.type);
      return (
        <span className="font-semibold text-[var(--admin-navy)]">
          {t === "fixed" ? "₹" : ""}{v}{t === "percentage" ? "%" : ""}
        </span>
      );
    },
  },
  {
    key: "valid_from",
    label: "From",
    sortable: true,
    render: (v) => <span className="text-xs text-gray-500">{v ? moment(v).format("DD/MM/YYYY") : "—"}</span>,
  },
  {
    key: "valid_to",
    label: "To",
    render: (v) => <span className="text-xs text-gray-500">{v ? moment(v).format("DD/MM/YYYY") : "—"}</span>,
  },
  {
    key: "_validity",
    label: "Validity",
    render: (_, row) => <StatusBadge status={getDiscountStatus(row.valid_from, row.valid_to)} dot />,
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "inactive" : "active"} dot />,
  },
];

const EMPTY_FORM = {
  title: "", code: "", description: "", valid_from: "", valid_to: "",
  type: "percentage", value: "", min_order_value: "", max_discount_value: "",
  uses_per_coupon: "", uses_per_customer: "", _id: null, isDisable: false,
};

const DiscountCoupons = () => {
  useDropdownOptions("discount-types");
  const dispatch = useDispatch();
  const { can } = usePermission();
  const list = useListPage({ defaultPageSize: 10, defaultSortKey: "createdAt", defaultSortDir: "desc" });
  const canCreateCoupon = can("coupons", ACTIONS.CREATE);
  const canUpdateCoupon = can("coupons", ACTIONS.UPDATE);
  const canDeleteCoupon = can("coupons", ACTIONS.DELETE);

  const [coupons, setCoupons] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);

  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = list.toQueryParams();
    try {
      const payload = await dispatch(
        getDiscountCoupons({
          page: params.page,
          size: params.limit || 10,
          keyWord: params.search || "",
          searchFields: "title,code,description",
          ...(params.type && { type: params.type }),
        })
      ).unwrap();
      const data = normalizeCouponsResponse(payload);
      setCoupons(data.list);
      setTotal(data.total);
    } catch (err) {
      toast.error(err?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [dispatch, list.page, list.pageSize, list.search, list.filters, isRefresh]);

  useEffect(() => {
    fetchList();
  }, [list.page, list.pageSize, list.search, list.filters, isRefresh]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.title?.trim()) errs.title = "Title is required";
    else if (formData.title.trim().length < 3) errs.title = "Min 3 characters";
    if (!formData.code?.trim()) errs.code = "Code is required";
    else if (formData.code.trim().length < 5) errs.code = "Min 5 characters";
    if (!formData.description?.trim()) errs.description = "Description is required";
    else if (formData.description.trim().length < 10) errs.description = "Min 10 characters";
    if (!formData.valid_from) errs.valid_from = "Start date is required";
    if (!formData.valid_to) errs.valid_to = "End date is required";
    else if (formData.valid_from && new Date(formData.valid_to) < new Date(formData.valid_from))
      errs.valid_to = "Must be after start date";
    if (!formData.type) errs.type = "Discount type is required";
    if (formData.value === "" || formData.value === null) errs.value = "Discount value is required";
    else if (Number(formData.value) <= 0) errs.value = "Must be > 0";
    else if (normalizeCouponType(formData.type) === "percentage" && Number(formData.value) > 100)
      errs.value = "Max 100% for percentage";
    if (formData.min_order_value === "") errs.min_order_value = "Min order value is required";
    if (formData.max_discount_value === "") errs.max_discount_value = "Max discount is required";
    if (formData.uses_per_coupon === "") errs.uses_per_coupon = "Uses per coupon is required";
    if (formData.uses_per_customer === "") errs.uses_per_customer = "Uses per customer is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => { setModalMode(null); setFormData(EMPTY_FORM); setErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === "edit" && !canUpdateCoupon) {
      toast.error("You do not have permission to update coupons");
      return;
    }
    if (modalMode !== "edit" && !canCreateCoupon) {
      toast.error("You do not have permission to create coupons");
      return;
    }
    if (!validateForm()) return;
    setSaving(true);
    const apiData = toCouponApiPayload(formData);
    try {
      if (modalMode === "edit") {
        await dispatch(editDiscountCoupons({ ...apiData, couponId: formData._id })).unwrap();
        toast.success("Coupon updated");
      } else {
        await dispatch(createDiscountCoupons(apiData)).unwrap();
        toast.success("Coupon created");
      }
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    if (!canUpdateCoupon) {
      toast.error("You do not have permission to update coupon status");
      return;
    }
    try {
      const res = await dispatch(enableDisableDiscountCoupons({ couponId: toggleTarget._id, active: toggleTarget.isDisable })).unwrap();
      toast.success(res?.message || "Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (!canDeleteCoupon) {
      toast.error("You do not have permission to delete coupons");
      return;
    }
    try {
      const res = await dispatch(softDeleteDiscountCoupons({ couponId: deleteTarget._id })).unwrap();
      toast.success(res?.data?.message || "Coupon deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const rowActions = useCallback(
    (row) => [
      canUpdateCoupon && {
        label: "Edit",
        onClick: () => {
          const c = normalizeCouponRecord(row);
          setFormData({
            title: c.title, code: c.code, description: c.description,
            type: c.type, value: c.value,
            min_order_value: c.min_order_value,
            max_discount_value: c.max_discount_value,
            uses_per_coupon: c.uses_per_coupon,
            uses_per_customer: c.uses_per_customer,
            valid_from: toDateInputValue(c.valid_from),
            valid_to: toDateInputValue(c.valid_to),
            isDisable: c.isDisable,
            _id: c._id,
          });
          setModalMode("edit");
        },
      },
      canUpdateCoupon && {
        label: row.isDisable ? "Enable" : "Disable",
        onClick: () => { setToggleTarget(row); setConfirmOpen(true); },
        danger: !row.isDisable,
      },
      canDeleteCoupon && {
        label: "Delete",
        onClick: () => { setDeleteTarget(row); setDeleteOpen(true); },
        danger: true,
      },
    ].filter(Boolean),
    [canDeleteCoupon, canUpdateCoupon]
  );

  return (
    <div>
      <PageHeader
        title="Discount Coupons"
        subtitle="Create and manage promotional discount codes"
        breadcrumbs={[{ label: "Marketing" }, { label: "Discount Coupons" }]}
        actions={
          canCreateCoupon && (
            <button
              onClick={() => setModalMode("add")}

            >
              <MdAdd size={16} /> Add Coupon
            </button>
          )
        }
      />

      <DataTable
        columns={COLUMNS}
        data={coupons}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        rowActions={rowActions}
        searchPlaceholder="Search by title, code…"
        emptyText="No discount coupons found."
        emptyIcon={<MdLocalOffer size={40} className="text-gray-200" />}
        requiredModule="coupons"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {modalMode === "add" ? "Create Coupon" : "Edit Coupon"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Title" name="title" type="text" value={formData.title} onChange={handleInputChange} error={errors.title} maxLength={100} required />
                <FormInput label="Coupon Code" name="code" type="text" value={formData.code} onChange={handleInputChange} error={errors.code} maxLength={30} placeholder="e.g. SAVE20" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] resize-none" placeholder="Describe this coupon" />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type <span className="text-red-500">*</span></label>
                  <select name="type" value={formData.type} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]">
                    <option value="">Select type</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                  {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
                </div>
                <FormInput label={`Discount Value ${formData.type === "percentage" ? "(%)" : "(₹)"}`} name="value" type="number" value={formData.value} onChange={handleInputChange} error={errors.value} min="0" step="0.01" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Min Order Value (₹)" name="min_order_value" type="number" value={formData.min_order_value} onChange={handleInputChange} error={errors.min_order_value} min="0" required />
                <FormInput label="Max Discount Cap (₹)" name="max_discount_value" type="number" value={formData.max_discount_value} onChange={handleInputChange} error={errors.max_discount_value} min="0" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Total Uses Limit" name="uses_per_coupon" type="number" value={formData.uses_per_coupon} onChange={handleInputChange} error={errors.uses_per_coupon} min="1" required />
                <FormInput label="Uses Per Customer" name="uses_per_customer" type="number" value={formData.uses_per_customer} onChange={handleInputChange} error={errors.uses_per_customer} min="1" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Valid From" name="valid_from" type="date" value={formData.valid_from} onChange={handleInputChange} error={errors.valid_from} required />
                <FormInput label="Valid To" name="valid_to" type="date" value={formData.valid_to} onChange={handleInputChange} error={errors.valid_to} required />
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton isToggle={!formData.isDisable} handleClick={() => setFormData((p) => ({ ...p, isDisable: !p.isDisable }))} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : modalMode === "add" ? "Create Coupon" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToggleTarget(null); }}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Coupon`}
        message={`${toggleTarget?.isDisable ? "Enable" : "Disable"} coupon "${toggleTarget?.code}"?`}
        variant={toggleTarget?.isDisable ? "default" : "danger"}
        confirmText={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Coupon"
        message={`Delete coupon "${deleteTarget?.code}"? This cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default DiscountCoupons;
