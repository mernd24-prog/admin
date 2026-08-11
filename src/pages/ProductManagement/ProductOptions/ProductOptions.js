import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MdSettings, MdAdd, MdDelete, MdEdit, MdListAlt, MdToggleOff, MdToggleOn } from "react-icons/md";
import {
  getPlatformOptions,
  createPlatformOption,
  updatePlatformOption,
  deletePlatformOption,
} from "../../../Redux/adminCoreSlice";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ConfirmModal,
  FilterBar,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { useListPage } from "../../../hooks/useListPage";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

const DISPLAY_TYPE_META = {
  button: { label: "Button", color: "bg-blue-100 text-blue-700" },
  dropdown: { label: "Dropdown", color: "bg-gray-100 text-gray-600" },
  color_swatch: { label: "Color Swatch", color: "bg-pink-100 text-pink-700" },
  radio: { label: "Radio", color: "bg-purple-100 text-purple-700" },
  thumbnail: { label: "Thumbnail", color: "bg-yellow-100 text-yellow-700" },
};

const slugify = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const emptyForm = { name: "", slug: "", displayType: "dropdown", description: "", active: true };
const idOf = (r) => r?._id || r?.id || "";

const FILTER_FIELDS = [
  {
    key: "active",
    type: "select",
    label: "Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
    width: "w-40",
  },
];

const getListPayload = (sliceData = {}) => {
  const payload =
    sliceData?.data?.data ||
    sliceData?.data?.normalized?.data ||
    sliceData?.normalized?.data ||
    sliceData?.data ||
    {};
  if (Array.isArray(payload)) return payload;
  return payload.list || payload.items || [];
};

const getTotal = (sliceData = {}, fallback = 0) =>
  sliceData?.data?.meta?.total ||
  sliceData?.data?.data?.total ||
  sliceData?.data?.total ||
  fallback;

const COLUMNS = [
  {
    key: "name",
    label: "Attribute Name",
    sortable: true,
    render: (v, row) => (
      <div>
        <p className="font-semibold text-gray-800">{v}</p>
        <p className="font-mono text-xs text-gray-400">{row.slug || "—"}</p>
      </div>
    ),
  },
  {
    key: "displayType",
    label: "Display Type",
    render: (v) => {
      const meta = DISPLAY_TYPE_META[v] || DISPLAY_TYPE_META.button;
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
          {meta.label}
        </span>
      );
    },
  },
  {
    key: "description",
    label: "Description",
    render: (v) => <span className="text-gray-500 text-xs max-w-[200px] truncate block">{v || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    render: (v) => <StatusBadge status={v !== false ? "active" : "inactive"} dot />,
  },
];

export default function ProductOptions() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useListPage({ defaultPageSize: 15, defaultSortKey: "createdAt", defaultSortDir: "desc" });

  const selector = useSelector((s) => s.adminCore);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const displayTypes = useDropdownOptions("product-option-display-types");
  const { toQueryParams } = list;

  const items = getListPayload(selector?.platformOptionsData);
  const total = getTotal(selector?.platformOptionsData, items.length);
  const loading = selector?.loading;

  const load = useCallback(() => {
    const params = toQueryParams();
    dispatch(getPlatformOptions({
      page: params.page,
      limit: params.limit || 15,
      q: params.search || undefined,
      active: params.active || undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    }));
  }, [dispatch, toQueryParams]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name || "", slug: row.slug || slugify(row.name), displayType: row.displayType || "dropdown", description: row.description || "", active: row.active !== false });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) e.slug = "Use lowercase letters, numbers, and hyphens only";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updatePlatformOption({ id: idOf(editing), ...form })).unwrap();
        toast.success("Option master updated");
      } else {
        await dispatch(createPlatformOption(form)).unwrap();
        toast.success("Option master created");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await dispatch(deletePlatformOption({ id: idOf(deleteTarget) })).unwrap();
      toast.success("Option master deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row) => {
    if (!row) return;
    setSaving(true);
    try {
      await dispatch(updatePlatformOption({ id: idOf(row), active: !row.active })).unwrap();
      toast.success(row.active ? "Disabled" : "Enabled");
      setStatusTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const columns = COLUMNS;

  return (
    <div>
      <PageHeader
        title="Product Option Masters"
        subtitle="Define reusable option attributes like Size, Color, RAM, Material"
        breadcrumbs={[{ label: "Product Management" }, { label: "Option Masters" }]}
        actions={
          <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
            <button
              onClick={openAdd}

            >
              <MdAdd size={16} /> Add Option
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={items}
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
        searchPlaceholder="Search attributes…"
        emptyText="No option masters yet."
        emptyIcon={<MdSettings size={40} className="text-gray-200" />}
        requiredModule="products"
        exportConfig={{ filename: "product-option-masters", columns: COLUMNS }}
        rowActions={(row) => [
          {
            label: "Manage Values",
            icon: <MdListAlt size={16} className="text-blue-600" />,
            requiredModule: "products",
            requiredAction: ACTIONS.VIEW,
            onClick: () => navigate(`/app/product-option-value/${idOf(row)}`),
          },
          {
            label: "Edit Option",
            icon: <MdEdit size={16} className="text-emerald-600" />,
            requiredModule: "products",
            requiredAction: ACTIONS.UPDATE,
            onClick: () => openEdit(row),
          },
          {
            label: row.active === false ? "Enable Option" : "Disable Option",
            icon:
              row.active === false ? (
                <MdToggleOn size={18} className="text-emerald-600" />
              ) : (
                <MdToggleOff size={18} className="text-amber-600" />
              ),
            requiredModule: "products",
            requiredAction: ACTIONS.STATUS_CHANGE,
            onClick: () => setStatusTarget(row),
          },
          {
            label: "Delete Option",
            icon: <MdDelete size={16} className="text-red-600" />,
            danger: true,
            requiredModule: "products",
            requiredAction: ACTIONS.DELETE,
            onClick: () => setDeleteTarget(row),
          },
        ]}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {editing ? "Edit Option Master" : "New Option Master"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                  placeholder="e.g. Color, Size, RAM, Material"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] ${errors.name ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="e.g. size, color, storage"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] ${errors.slug ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Type</label>
                <p className="text-xs text-gray-400 mb-2">How values appear on product and variant forms</p>
                <div className="grid grid-cols-2 gap-2">
                  {displayTypes.options.map((dt) => (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, displayType: dt.value }))}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                        form.displayType === dt.value
                          ? "border-[var(--admin-gold)] bg-[var(--admin-blue-soft)] text-[var(--admin-navy)] font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Available color options for this product"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active (visible to sellers)</span>
                <ToggleButton isToggle={form.active} handleClick={() => setForm((f) => ({ ...f, active: !f.active }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-gold)] rounded-lg hover:bg-[var(--admin-gold-dark)] disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Option Master"
        message={`Delete option master "${deleteTarget?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={saving}
      />

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => handleToggleActive(statusTarget)}
        title={statusTarget?.active === false ? "Enable Option Master?" : "Disable Option Master?"}
        message={`This will mark "${statusTarget?.name || "this option"}" as ${statusTarget?.active === false ? "active" : "inactive"}.`}
        variant={statusTarget?.active === false ? "success" : "warning"}
        confirmLabel={statusTarget?.active === false ? "Enable" : "Disable"}
        loading={saving}
      />
    </div>
  );
}
