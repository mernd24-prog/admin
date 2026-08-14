import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MdAdd,
  MdClose,
  MdEdit,
  MdMilitaryTech,
  MdRefresh,
  MdToggleOff,
  MdToggleOn,
} from "react-icons/md";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  clearBadgeForm,
  createBadge,
  deleteBadge,
  listBadges,
  updateBadge,
} from "../../../Redux/badgeSlice";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "product", label: "Product" },
  { value: "seller", label: "Seller" },
  { value: "buyer", label: "Buyer" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const FILTER_FIELDS = [
  { key: "type", type: "select", label: "Type", options: TYPE_OPTIONS },
  { key: "active", type: "select", label: "Status", options: STATUS_OPTIONS },
];

const DEFAULT_FORM = {
  name: "",
  label: "",
  type: "product",
  icon: "",
  color: "#E53E3E",
  bgColor: "#FFF5F5",
  description: "",
  priority: 0,
  active: true,
  validFrom: "",
  validTo: "",
};

function BadgePreview({ label, color, bgColor, icon }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
      style={{
        color: color || "#E53E3E",
        backgroundColor: bgColor || "#FFF5F5",
        border: `1px solid ${color || "#E53E3E"}33`,
      }}
    >
      {icon && <span>{icon}</span>}
      {label || "Badge"}
    </span>
  );
}

function ColorInput({ label, value, onChange, name }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-gray-200"
        />
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function BadgeModal({ open, onClose, initialData, loading, onSubmit }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const isEdit = !!initialData?._id;

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          name: initialData.name || "",
          label: initialData.label || "",
          type: initialData.type || "product",
          icon: initialData.icon || "",
          color: initialData.color || "#E53E3E",
          bgColor: initialData.bgColor || "#FFF5F5",
          description: initialData.description || "",
          priority: initialData.priority ?? 0,
          active: initialData.active !== false,
          validFrom: initialData.validFrom
            ? initialData.validFrom.split("T")[0]
            : "",
          validTo: initialData.validTo ? initialData.validTo.split("T")[0] : "",
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, initialData]);

  const set = (key) => (e) => {
    const val = e?.target
      ? e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value
      : e;
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    else if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(form.name.trim()))
      errs.name = "Use only letters, numbers, hyphens or underscores";
    if (!form.label.trim()) errs.label = "Label is required";
    if (form.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color))
      errs.color = "Invalid hex color";
    if (
      form.bgColor &&
      !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.bgColor)
    )
      errs.bgColor = "Invalid hex color";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const payload = {
      ...form,
      priority: Number(form.priority) || 0,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
    };
    if (isEdit) payload.badgeId = initialData._id;
    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {isEdit ? "Edit Badge" : "Create Badge"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-6 py-4 space-y-4"
        >
          {/* Live preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Preview</span>
            <BadgePreview
              label={form.label}
              color={form.color}
              bgColor={form.bgColor}
              icon={form.icon}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Internal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. new-arrival"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-200"}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Display Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={set("label")}
                placeholder="e.g. New Arrival"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.label ? "border-red-400" : "border-gray-200"}`}
              />
              {errors.label && (
                <p className="text-xs text-red-500 mt-1">{errors.label}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={set("type")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="product">Product</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Icon / Emoji
              </label>
              <input
                type="text"
                value={form.icon}
                onChange={set("icon")}
                placeholder="e.g. 🔥 or star"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ColorInput
              label="Text Color"
              value={form.color}
              onChange={set("color")}
              name="color"
            />
            <ColorInput
              label="Background Color"
              value={form.bgColor}
              onChange={set("bgColor")}
              name="bgColor"
            />
          </div>
          {(errors.color || errors.bgColor) && (
            <p className="text-xs text-red-500">
              {errors.color || errors.bgColor}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={2}
              placeholder="Optional description…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Priority
              </label>
              <input
                type="number"
                min={0}
                value={form.priority}
                onChange={set("priority")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={set("active")}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={form.validFrom}
                onChange={set("validFrom")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Valid To
              </label>
              <input
                type="date"
                value={form.validTo}
                onChange={set("validTo")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Badge"}
          </button>
        </div>
      </div>
    </div>
  );
}

const COLUMNS = [
  {
    key: "label",
    label: "Badge",
    render: (_, row) => (
      <div className="flex items-center gap-3">
        <BadgePreview
          label={row.label}
          color={row.color}
          bgColor={row.bgColor}
          icon={row.icon}
        />
        <div>
          <p className="text-sm font-medium text-gray-800">{row.label}</p>
          <p className="text-xs text-gray-400 font-mono">{row.name}</p>
        </div>
      </div>
    ),
  },
  {
    key: "type",
    label: "Type",
    render: (_, row) => (
      <span className="capitalize text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
        {row.type}
      </span>
    ),
  },
  {
    key: "priority",
    label: "Priority",
    render: (_, row) => (
      <span className="text-sm text-gray-600">{row.priority ?? 0}</span>
    ),
  },
  {
    key: "validity",
    label: "Validity",
    render: (_, row) => {
      if (!row.validFrom && !row.validTo)
        return <span className="text-xs text-gray-400">Always</span>;
      const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");
      return (
        <span className="text-xs text-gray-600">
          {fmt(row.validFrom)} → {fmt(row.validTo)}
        </span>
      );
    },
  },
  {
    key: "active",
    label: "Status",
    render: (_, row) => (
      <StatusBadge status={row.active ? "active" : "inactive"} />
    ),
  },
];

const Badges = () => {
  const dispatch = useDispatch();
  const { loading, listBadgesData } = useSelector((state) => state.badge);

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    active: "",
    page: 1,
    limit: 20,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const prevFilters = useRef(null);

  const badges = listBadgesData?.data?.data ?? listBadgesData?.data ?? [];
  const pagination =
    listBadgesData?.normalized?.pagination ??
    listBadgesData?.data?.pagination ??
    null;
  const total =
    pagination?.total ?? (Array.isArray(badges) ? badges.length : 0);

  const fetchBadges = useCallback(
    (override = {}) => {
      const params = { ...filters, ...override };
      dispatch(listBadges(params));
    },
    [dispatch, filters],
  );

  useEffect(() => {
    const key = JSON.stringify(filters);
    if (prevFilters.current !== key) {
      prevFilters.current = key;
      fetchBadges();
    }
  }, [filters, fetchBadges]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }));
  const handlePageSizeChange = (limit) =>
    setFilters((prev) => ({ ...prev, limit, page: 1 }));

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditTarget(row);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    dispatch(clearBadgeForm());
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (payload.badgeId) {
        await dispatch(updateBadge(payload)).unwrap();
      } else {
        await dispatch(createBadge(payload)).unwrap();
      }
      closeModal();
      fetchBadges();
    } catch {
      // error shown by global alert
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (row) => {
    await dispatch(updateBadge({ badgeId: row._id, active: !row.active }));
    fetchBadges();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await dispatch(deleteBadge({ badgeId: deleteTarget._id })).unwrap();
      setDeleteTarget(null);
      fetchBadges();
    } catch {
      // error shown by global alert
    } finally {
      setSaving(false);
    }
  };

  const rowActions = (row) => [
    {
      label: "Edit",
      icon: <MdEdit size={15} />,
      onClick: () => openEdit(row),
    },
    {
      label: row.active ? "Deactivate" : "Activate",
      icon: row.active ? <MdToggleOff size={15} /> : <MdToggleOn size={15} />,
      onClick: () => handleToggleStatus(row),
    },
    {
      label: "Delete",
      icon: <MdClose size={15} />,
      danger: true,
      onClick: () => setDeleteTarget(row),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Badges"
        subtitle="Manage product, seller, and buyer badges shown on the storefront"
        breadcrumbs={[{ label: "Catalog Management" }, { label: "Badges" }]}
        count={total}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => fetchBadges()} title="Refresh">
              <MdRefresh size={18} />
            </button>

            <button onClick={openCreate}>
              <MdAdd size={16} />
              New Badge
            </button>
          </div>
        }
      />
      <DataTable
        columns={COLUMNS}
        data={Array.isArray(badges) ? badges : []}
        loading={loading}
        total={total}
        page={pagination?.page ?? filters.page}
        pageSize={pagination?.limit ?? filters.limit}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={(value) => handleFilterChange("search", value)}
        searchPlaceholder="Search badges…"
        filterBar={
          <FilterBar
            fields={FILTER_FIELDS}
            values={filters}
            loading={loading}
            onChange={handleFilterChange}
            onClear={() =>
              setFilters((current) => ({
                ...current,
                type: "",
                active: "",
                page: 1,
              }))
            }
          />
        }
        rowActions={rowActions}
        rowKey={(row) => row._id || row.name}
        emptyMessage="No badges found"
        emptyIcon={<MdMilitaryTech size={48} className="text-gray-200" />}
      />

      <BadgeModal
        open={modalOpen}
        onClose={closeModal}
        initialData={editTarget}
        loading={saving}
        onSubmit={handleSave}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Badge"
        message={`Are you sure you want to delete the "${deleteTarget?.label}" badge? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  );
};

export default Badges;
