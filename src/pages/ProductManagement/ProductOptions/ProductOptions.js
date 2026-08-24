import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MdSettings, MdAdd, MdDelete, MdEdit, MdListAlt } from "react-icons/md";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import {
  getPlatformOptions,
  createPlatformOption,
  updatePlatformOption,
  deletePlatformOption,
} from "../../../Redux/adminCoreSlice";
import {
  PageHeader,
  DataTable,
  ConfirmModal,
  ExportButton,
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
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const emptyForm = {
  name: "",
  slug: "",
  displayType: "dropdown",
  description: "",
  active: true,
};
const idOf = (r) => r?._id || r?.id || "";

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

export default function ProductOptions() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useListPage({
    defaultPageSize: 15,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const selector = useSelector((s) => s.adminCore);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    activationStatus: { value: "All", label: "All" },
  });
  const displayTypes = useDropdownOptions("product-option-display-types");
  const { toQueryParams, setSearch, setFilter, clearFilters, setPage } = list;

  const items = getListPayload(selector?.platformOptionsData);
  const total = getTotal(selector?.platformOptionsData, items.length);
  const loading = selector?.loading;

  const load = useCallback(() => {
    const params = toQueryParams();
    dispatch(
      getPlatformOptions({
        page: params.page,
        limit: params.limit || 15,
        q: params.search || undefined,
        active: params.active || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      }),
    );
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    setSelectedKeys([]);
    load();
  }, [load]);

  // Automatic search & filter handling when search input or status filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const searchVal = filters.search || "";
      const statusVal =
        filters.activationStatus?.value === "All"
          ? ""
          : filters.activationStatus?.value === "active"
            ? "true"
            : filters.activationStatus?.value === "inactive"
              ? "false"
              : "";

      if (list.search !== searchVal) {
        setSearch(searchVal);
      }
      if ((list.filters.active || "") !== statusVal) {
        setFilter("active", statusVal);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    filters.search,
    filters.activationStatus?.value,
    list.search,
    list.filters.active,
    setSearch,
    setFilter,
  ]);

  const handleSearchClear = () => {
    setFilters({
      search: "",
      activationStatus: { value: "All", label: "All" },
    });
    clearFilters();
    setSearch("");
    setPage(1);
  };

  const handleBulkAction = async (action, rows) => {
    const targetKeys = rows && rows.length ? rows : selectedKeys;
    if (!targetKeys.length) return;
    if (action === "Active" || action === "Inactive") {
      const isNextActive = action === "Active";
      setSaving(true);
      try {
        await Promise.all(
          targetKeys.map((id) =>
            dispatch(
              updatePlatformOption({
                id,
                active: isNextActive,
              }),
            ).unwrap(),
          ),
        );
        toast.success(
          `Selected option masters ${isNextActive ? "activated" : "deactivated"} successfully`,
        );
        setSelectedKeys([]);
        load();
      } catch (err) {
        toast.error(err?.message || "Failed to update option masters status");
      } finally {
        setSaving(false);
      }
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      slug: row.slug || slugify(row.name),
      displayType: row.displayType || "dropdown",
      description: row.description || "",
      active: row.active !== false,
    });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug))
      e.slug = "Use lowercase letters, numbers, and hyphens only";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await dispatch(
          updatePlatformOption({ id: idOf(editing), ...form }),
        ).unwrap();
        toast.success("Option master updated");
      } else {
        await dispatch(createPlatformOption(form)).unwrap();
        toast.success("Option master created");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
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
      await dispatch(
        updatePlatformOption({ id: idOf(row), active: !row.active }),
      ).unwrap();
      toast.success(row.active ? "Disabled" : "Enabled");
      setStatusTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
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
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
            >
              {meta.label}
            </span>
          );
        },
      },
      {
        key: "description",
        label: "Description",
        render: (v) => (
          <span className="text-gray-500 text-xs max-w-[200px] truncate block">
            {v || "—"}
          </span>
        ),
      },
      {
        key: "active",
        label: "Active",
        render: (_, row) => (
          <ToggleButton
            isToggle={row.active !== false}
            handleClick={() => setStatusTarget(row)}
            requiredModule="products"
          />
        ),
      },
    ],
    [],
  );

  const exportData = useMemo(() => {
    if (selectedKeys.length > 0) {
      return items.filter((it) => selectedKeys.includes(idOf(it)));
    }
    return items;
  }, [items, selectedKeys]);

  return (
    <div>
      <PageHeader
        title="Product Option Masters"
        subtitle="Define reusable option attributes like Size, Color, RAM, Material"
        breadcrumbs={[
          { label: "Product Management" },
          { label: "Option Masters" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <ExportButton
              data={exportData}
              filename="product-option-masters"
              columns={columns}
              requiredModule="products"
            />
            <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
              <button onClick={openAdd}>
                <MdAdd size={16} /> Add Option
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white shadow-sm">
        <section className="border-b border-[var(--admin-line)]">
          <SearchComponent
            selectedRow={selectedKeys}
            setSelectedRow={setSelectedKeys}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActivationStatus={true}
            activationStatusOptions={[
              { value: "All", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            applyFilters={() => {}}
            handleSearchRemove={handleSearchClear}
            isActionButton={true}
            isStatusAction={true}
            handleAction={handleBulkAction}
            requiredModule="products"
            isSearchDown={false}
            defaultSearchOpen={true}
            compactFilterBar={true}
            hideFilterActions={true}
            largeSearchInput={true}
          />
        </section>
        <section>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            totalCount={total}
            page={list.page}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            onSort={list.setSort}
            sortKey={list.sortKey}
            sortDir={list.sortDir}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            rowKey={(row) => idOf(row)}
            emptyText="No option masters yet."
            emptyIcon={<MdSettings size={40} className="text-gray-200" />}
            requiredModule="products"
            cardClassName="overflow-hidden rounded-none border-0 shadow-none"
            rowActions={(row) => [
              {
                label: "Manage Values",
                icon: <MdListAlt size={16} className="text-blue-600" />,
                requiredModule: "products",
                requiredAction: ACTIONS.VIEW,
                onClick: () =>
                  navigate(`/app/product-option-value/${idOf(row)}`),
              },
              {
                label: "Edit Option",
                icon: <MdEdit size={16} className="text-emerald-600" />,
                requiredModule: "products",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => openEdit(row),
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
          />
        </section>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-5 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editing ? "Edit Option Master" : "New Option Master"}
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  {editing
                    ? "Update option master details and display settings."
                    : "Create a new option master for product variants."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6 py-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>

                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.slug || slugify(e.target.value),
                    }))
                  }
                  placeholder="e.g. Color, Size, RAM, Material"
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-0 ${
                    errors.name
                      ? "border-red-400 focus:border-red-400"
                      : "border-gray-300 focus:border-[var(--admin-gold)]"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Slug
                </label>

                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: slugify(e.target.value),
                    }))
                  }
                  placeholder="e.g. size, color, storage"
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-0 ${
                    errors.slug
                      ? "border-red-400 focus:border-red-400"
                      : "border-gray-300 focus:border-[var(--admin-gold)]"
                  }`}
                />
                {errors.slug && (
                  <p className="mt-1 text-xs text-red-500">{errors.slug}</p>
                )}
              </div>

              {/* Display Type */}
              <div className="border-t border-gray-100 pt-4">
                <div className="mb-2.5">
                  <label className="block text-sm font-semibold text-gray-900">
                    Display Type
                  </label>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Choose how values appear on product and variant forms.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {displayTypes.options.map((dt) => {
                    const isSelected = form.displayType === dt.value;

                    return (
                      <button
                        key={dt.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            displayType: dt.value,
                          }))
                        }
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "border-[var(--admin-gold)] bg-[var(--admin-gold)]/10 font-medium text-[var(--admin-navy)]"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[var(--admin-gold)] hover:bg-gray-50"
                        }`}
                      >
                        {dt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="border-t border-gray-100 pt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                  <span className="ml-1 font-normal text-gray-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g. Available color options for this product"
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-0"
                />
              </div>

              {/* Active */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 transition focus-within:border-[var(--admin-gold)]">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Active</p>

                    <p className="text-xs text-gray-400">
                      Visible to sellers when enabled.
                    </p>
                  </div>

                  <ToggleButton
                    isToggle={form.active}
                    handleClick={() =>
                      setForm((f) => ({
                        ...f,
                        active: !f.active,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/70 px-6 py-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex min-w-[100px] items-center justify-center rounded-lg bg-[var(--admin-navy)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
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
        title={
          statusTarget?.active === false
            ? "Enable Option Master?"
            : "Disable Option Master?"
        }
        message={`This will mark "${statusTarget?.name || "this option"}" as ${statusTarget?.active === false ? "active" : "inactive"}.`}
        variant={statusTarget?.active === false ? "success" : "warning"}
        confirmLabel={statusTarget?.active === false ? "Enable" : "Disable"}
        loading={saving}
      />
    </div>
  );
}
