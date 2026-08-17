import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { MdTune, MdAdd, MdArrowBack, MdDelete, MdEdit } from "react-icons/md";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import {
  getPlatformOptions,
  getPlatformOptionValues,
  createPlatformOptionValue,
  updatePlatformOptionValue,
  deletePlatformOptionValue,
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

const idOf = (r) => r?._id || r?.id || "";

const emptyForm = { name: "", valueCode: "", colorHex: "", imageUrl: "", sortOrder: 0, active: true };

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

export default function ProductOptionValue() {
  const { id: optionId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "sortOrder", defaultSortDir: "asc" });

  const selector = useSelector((s) => s.adminCore);
  const [parentOption, setParentOption] = useState(null);
  const [optionFilter, setOptionFilter] = useState(optionId || "");
  const [optionMasters, setOptionMasters] = useState([]);
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

  const items = getListPayload(selector?.platformOptionValuesData);
  const total = getTotal(selector?.platformOptionValuesData, items.length);
  const loading = selector?.loading;

  const selectedOptionId = optionId || optionFilter;
  const isColorSwatch = parentOption?.displayType === "color_swatch";
  const isThumbnail = parentOption?.displayType === "thumbnail";
  const { toQueryParams } = list;

  useEffect(() => {
    dispatch(getPlatformOptions({ limit: 100 }))
      .unwrap()
      .then((res) => {
        const masterList = Array.isArray(res?.data) ? res.data : res?.data?.list || res?.data?.items || [];
        setOptionMasters(masterList);
        const found = masterList.find((o) => idOf(o) === selectedOptionId);
        if (found) setParentOption(found);
        if (!optionId && !optionFilter && masterList[0]) setOptionFilter(idOf(masterList[0]));
      })
      .catch(() => {});
  }, [dispatch, optionFilter, optionId, selectedOptionId]);

  useEffect(() => {
    const found = optionMasters.find((o) => idOf(o) === selectedOptionId);
    setParentOption(found || null);
  }, [optionMasters, selectedOptionId]);

  const load = useCallback(() => {
    if (!selectedOptionId) return;
    const params = toQueryParams();
    dispatch(getPlatformOptionValues({
      optionId: selectedOptionId,
      page: params.page,
      limit: params.limit || 20,
      q: params.search || undefined,
      active: params.active || undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    }));
  }, [dispatch, selectedOptionId, toQueryParams]);

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

      list.setSearch(searchVal);
      list.setFilter("active", statusVal);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search, filters.activationStatus?.value]);

  const handleSearchClear = () => {
    setFilters({
      search: "",
      activationStatus: { value: "All", label: "All" },
    });
    list.clearFilters();
    list.setSearch("");
    list.setPage(1);
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
              updatePlatformOptionValue({
                id,
                optionId: selectedOptionId,
                active: isNextActive,
              }),
            ).unwrap(),
          ),
        );
        toast.success(
          `Selected option values ${isNextActive ? "activated" : "deactivated"} successfully`,
        );
        setSelectedKeys([]);
        load();
      } catch (err) {
        toast.error(err?.message || "Failed to update option values status");
      } finally {
        setSaving(false);
      }
    }
  };

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, sortOrder: items.length }); setErrors({}); setModalOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name || "", valueCode: row.valueCode || "", colorHex: row.colorHex || "", imageUrl: row.imageUrl || "", sortOrder: row.sortOrder ?? 0, active: row.active !== false });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Value name is required";
    if (form.valueCode && !/^[a-z0-9_/-]+$/i.test(form.valueCode)) {
      e.valueCode = "Use letters, numbers, underscores, hyphens, or slashes only";
    }
    if (isColorSwatch && form.colorHex && !/^#[0-9A-Fa-f]{6}$/.test(form.colorHex)) {
      e.colorHex = "Enter a valid hex color, e.g. #111827";
    }
    if (isThumbnail && form.imageUrl && !/^https?:\/\/\S+$/i.test(form.imageUrl)) {
      e.imageUrl = "Enter a valid image URL";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleNameChange = (value) => {
    setForm((f) => ({ ...f, name: value, valueCode: f.valueCode || value.trim().toLowerCase().replace(/\s+/g, "_") }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updatePlatformOptionValue({ id: idOf(editing), optionId: selectedOptionId, optionName: parentOption?.name || "", ...form })).unwrap();
        toast.success("Value updated");
      } else {
        await dispatch(createPlatformOptionValue({ optionId: selectedOptionId, optionName: parentOption?.name || "", ...form })).unwrap();
        toast.success("Value created");
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
      await dispatch(deletePlatformOptionValue({ id: idOf(deleteTarget) })).unwrap();
      toast.success("Value deleted");
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
      await dispatch(updatePlatformOptionValue({ id: idOf(row), optionId: selectedOptionId, active: !row.active })).unwrap();
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
        key: "preview",
        label: "Preview",
        render: (_, row) =>
          isColorSwatch && row.colorHex ? (
            <span
              className="inline-block w-8 h-8 rounded-full border border-gray-300 shadow-sm"
              style={{ backgroundColor: row.colorHex }}
              title={row.colorHex}
            />
          ) : isThumbnail && row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt={row.name}
              className="w-8 h-8 rounded object-cover border border-gray-200"
            />
          ) : (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
              {row.name}
            </span>
          ),
      },
      {
        key: "name",
        label: "Value Name",
        sortable: true,
        render: (v) => <span className="font-medium text-gray-800">{v}</span>,
      },
      {
        key: "valueCode",
        label: "Code",
        render: (v) => <span className="font-mono text-xs text-gray-500">{v || "—"}</span>,
      },
      {
        key: "sortOrder",
        label: "Sort",
        sortable: true,
        render: (v) => <span className="text-gray-500 text-xs">{v ?? "—"}</span>,
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
    [isColorSwatch, isThumbnail],
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
        title={parentOption?.name ? `${parentOption.name} — Values` : "Option Values"}
        subtitle={
          parentOption?.displayType
            ? `Display type: ${parentOption.displayType.replace("_", " ")}${isColorSwatch ? " · Enter hex codes for swatches" : ""}${isThumbnail ? " · Enter image URLs for thumbnails" : ""}`
            : "Manage reusable values for this option"
        }
        breadcrumbs={[
          { label: "Product Management" },
          { label: "Option Masters", href: "/app/product-options" },
          { label: parentOption?.name || "Values" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/product-options")}>
              <MdArrowBack size={16} /> Option Masters
            </button>
            <ExportButton
              data={exportData}
              filename="product-option-values"
              columns={columns}
              requiredModule="products"
            />
            <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
              <button onClick={openAdd}>
                <MdAdd size={16} /> Add Value
              </button>
            </PermissionGuard>
          </div>
        }
      />

      {!optionId && (
        <div className="mb-4">
          <select
            value={selectedOptionId}
            onChange={(e) => { setOptionFilter(e.target.value); list.setPage(1); }}
            className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
          >
            {optionMasters.map((opt) => (
              <option key={idOf(opt)} value={idOf(opt)}>{opt.name}</option>
            ))}
          </select>
        </div>
      )}

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
            emptyText="No values yet."
            emptyIcon={<MdTune size={40} className="text-gray-200" />}
            requiredModule="products"
            cardClassName="overflow-hidden rounded-none border-0 shadow-none"
            rowActions={(row) => [
              {
                label: "Edit Value",
                icon: <MdEdit size={16} className="text-emerald-600" />,
                requiredModule: "products",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => openEdit(row),
              },
              {
                label: "Delete Value",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {editing ? `Edit "${editing.name}"` : `Add value to "${parentOption?.name || "Option"}"`}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={isColorSwatch ? "e.g. Black, Red, Navy Blue" : isThumbnail ? "e.g. Small, Large" : "e.g. S, M, L, XL, 128GB"}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] ${errors.name ? "border-red-400" : "border-gray-300"}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {isColorSwatch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color (Hex)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.colorHex || "#000000"} onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))} className="w-12 h-10 rounded border border-gray-300 cursor-pointer p-0.5" />
                    <input value={form.colorHex} onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))} placeholder="#1A1919" className={`flex-1 px-3 py-2 text-sm border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] ${errors.colorHex ? "border-red-400" : "border-gray-300"}`} />
                    {form.colorHex && <span className="w-8 h-8 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: form.colorHex }} />}
                  </div>
                  {errors.colorHex && <p className="mt-1 text-xs text-red-500">{errors.colorHex}</p>}
                </div>
              )}

              {isThumbnail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image URL</label>
                  <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://example.com/image.jpg" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] ${errors.imageUrl ? "border-red-400" : "border-gray-300"}`} />
                  {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="mt-2 h-12 w-12 object-cover rounded border border-gray-200" />}
                  {errors.imageUrl && <p className="mt-1 text-xs text-red-500">{errors.imageUrl}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value Code</label>
                <p className="text-xs text-gray-400 mb-1">Auto-generated from name. Used in APIs and filters.</p>
                <input value={form.valueCode} onChange={(e) => setForm((f) => ({ ...f, valueCode: e.target.value }))} placeholder="e.g. black, size_xl, 128gb" className={`w-full px-3 py-2 text-sm border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] ${errors.valueCode ? "border-red-400" : "border-gray-300"}`} />
                {errors.valueCode && <p className="mt-1 text-xs text-red-500">{errors.valueCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton isToggle={form.active} handleClick={() => setForm((f) => ({ ...f, active: !f.active }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-gold)] rounded-lg hover:bg-[var(--admin-gold-dark)] disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Update" : "Add Value"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Value"
        message={`Delete value "${deleteTarget?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={saving}
      />

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => handleToggleActive(statusTarget)}
        title={statusTarget?.active === false ? "Enable Option Value?" : "Disable Option Value?"}
        message={`This will mark "${statusTarget?.name || "this value"}" as ${statusTarget?.active === false ? "active" : "inactive"}.`}
        variant={statusTarget?.active === false ? "success" : "warning"}
        confirmLabel={statusTarget?.active === false ? "Enable" : "Disable"}
        loading={saving}
      />
    </div>
  );
}
