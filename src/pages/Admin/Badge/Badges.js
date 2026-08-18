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
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";

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
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>

      <div className="flex h-[42px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-2 transition focus-within:border-[var(--admin-gold)]">
        <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded border border-gray-200">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -left-1 -top-1 h-7 w-7 cursor-pointer border-0 bg-transparent p-0"
          />
        </div>

        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-gray-700 outline-none focus:ring-0"
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

  const BADGE_TYPE_OPTIONS = [
  { value: "product", label: "Product" },
  { value: "seller", label: "Seller" },
  { value: "buyer", label: "Buyer" },
  { value: "custom", label: "Custom" },
];

  if (!open) return null;

 return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Badge" : "Create Badge"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {isEdit
              ? "Update badge details, appearance, and availability."
              : "Create a badge and customize how it appears across the platform."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <MdClose size={20} />
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-h-[70vh] overflow-x-hidden overflow-y-auto px-6 py-5"
      >
        <div className="space-y-6">
          {/* Preview */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Badge Preview
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Preview how the badge will appear.
                </p>
              </div>

              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-gray-200">
                Live Preview
              </span>
            </div>

            <div className="flex min-h-[60px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
              <BadgePreview
                label={form.label || "Badge Label"}
                color={form.color}
                bgColor={form.bgColor}
                icon={form.icon}
              />
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Basic Information
              </h3>

              <p className="mt-0.5 text-xs text-gray-500">
                Add the basic details used to identify this badge.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Internal Name */}
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Internal Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="e.g. new-arrival"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-0 ${
                    errors.name
                      ? "border-red-400 focus:border-red-400"
                      : "border-gray-300 focus:border-[var(--admin-gold)]"
                  }`}
                />

                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Display Label */}
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Display Label <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={form.label}
                  onChange={set("label")}
                  placeholder="e.g. New Arrival"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-0 ${
                    errors.label
                      ? "border-red-400 focus:border-red-400"
                      : "border-gray-300 focus:border-[var(--admin-gold)]"
                  }`}
                />

                {errors.label && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.label}
                  </p>
                )}
              </div>

              {/* Type - Common FilterSelect */}
              <div className="min-w-0">
                <FilterSelect
                  label="Type"
                  options={BADGE_TYPE_OPTIONS}
                  value={
                    BADGE_TYPE_OPTIONS.find(
                      (option) =>
                        String(option.value) === String(form.type || ""),
                    ) || null
                  }
                  onChange={(option) => {
                    setForm((prev) => ({
                      ...prev,
                      type: option?.value || "",
                    }));
                  }}
                  placeholder="Select type"
                  isSearchable={false}
                  isClearable={false}
                />
              </div>

              {/* Icon */}
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Icon / Emoji
                </label>

                <input
                  type="text"
                  value={form.icon}
                  onChange={set("icon")}
                  placeholder="e.g. 🔥 or ⭐"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="border-t border-gray-100 pt-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Appearance
              </h3>

              <p className="mt-0.5 text-xs text-gray-500">
                Customize the text and background colors.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <p className="mt-2 text-xs text-red-500">
                {errors.color || errors.bgColor}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 pt-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="Add an optional description for this badge..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-0"
            />
          </div>

          {/* Settings */}
          <div className="border-t border-gray-100 pt-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Settings
              </h3>

              <p className="mt-0.5 text-xs text-gray-500">
                Control badge priority and availability.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Priority
                </label>

                <input
                  type="number"
                  min={0}
                  value={form.priority}
                  onChange={set("priority")}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[var(--admin-gold)] focus:ring-0"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Status
                </label>

                <label className="flex h-[42px] cursor-pointer items-center justify-between rounded-lg border border-gray-300 px-3.5 transition focus-within:border-[var(--admin-gold)]">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Active
                    </p>

                    <p className="text-[11px] text-gray-400">
                      Make this badge available
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={set("active")}
                    className="h-4 w-4 cursor-pointer accent-[var(--admin-gold)]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Validity */}
          <div className="border-t border-gray-100 pt-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Validity Period
              </h3>

              <p className="mt-0.5 text-xs text-gray-500">
                Optionally define when this badge should be available.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Valid From */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Valid From
                </label>

                <input
                  type="date"
                  value={form.validFrom}
                  onChange={set("validFrom")}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[var(--admin-gold)] focus:ring-0"
                />
              </div>

              {/* Valid To */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Valid To
                </label>

                <input
                  type="date"
                  value={form.validTo}
                  onChange={set("validTo")}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[var(--admin-gold)] focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/70 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex min-w-[130px] items-center justify-center rounded-lg bg-[var(--admin-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Badge"}
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
    <div className="space-y-6">
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
