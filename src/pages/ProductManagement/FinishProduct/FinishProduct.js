import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdPalette, MdToggleOff, MdToggleOn } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ACTIONS } from "../../../_helpers/usePermission";
import { ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { useListPage } from "../../../hooks/useListPage";
import {
  CreateFinish,
  FinishGetList,
  enableDisableFinish,
  softDeleteFinish,
  updateFinish,
} from "../../../Redux/productSlice";

const FILTER_FIELDS = [
  {
    key: "active",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
];

const EMPTY_FORM = {
  _id: "",
  name: "",
  active: true,
};

const BASE_COLUMNS = [
  {
    key: "name",
    label: "Finish Name",
    sortable: true,
    render: (value) => <span className="font-medium text-gray-800 capitalize">{value || "-"}</span>,
  },
  {
    key: "active",
    label: "Status",
    render: (value, row) => <StatusBadge status={(value ?? row?.isDisable !== true) ? "active" : "inactive"} dot />,
  },
];

const normalizeList = (payload) => {
  const root = payload?.data?.data || payload?.data || payload || {};
  const list = root.items || root.list || root.rows || [];
  return {
    list,
    total: Number(root.total ?? payload?.data?.pagination?.total ?? list.length),
  };
};

const isActive = (row) => row?.active ?? row?.isDisable !== true;

const FinishProducts = () => {
  const dispatch = useDispatch();
  const list = useListPage({ defaultPageSize: 10, defaultSortKey: "createdAt", defaultSortDir: "desc" });
  const { toQueryParams } = list;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = toQueryParams();
      const response = await dispatch(
        FinishGetList({
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          searchFields: "name",
          active: params.active,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
        }),
      ).unwrap();
      const normalized = normalizeList(response);
      setItems(normalized.list);
      setTotal(normalized.total);
    } catch (error) {
      toast.error(error?.message || "Failed to load finishes");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = () => {
    setModalMode(null);
    setFormData(EMPTY_FORM);
    setErrors({});
  };

  const validate = () => {
    const nextErrors = {};
    const name = formData.name.trim();
    if (!name) nextErrors.name = "Finish name is required";
    else if (name.length < 2) nextErrors.name = "Minimum 2 characters required";
    else if (name.length > 100) nextErrors.name = "Maximum 100 characters allowed";
    else if (!/^[a-zA-Z0-9\s-]+$/.test(name)) nextErrors.name = "Only letters, numbers, spaces, and hyphen are allowed";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      active: Boolean(formData.active),
      isDisable: !formData.active,
    };
    try {
      const response = modalMode === "edit"
        ? await dispatch(updateFinish({ ...payload, _id: formData._id })).unwrap()
        : await dispatch(CreateFinish(payload)).unwrap();
      toast.success(response?.message || `Finish ${modalMode === "edit" ? "updated" : "created"}`);
      closeModal();
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to save finish");
    } finally {
      setSaving(false);
    }
  };

  const confirmStatus = async () => {
    if (!statusTarget?._id) return;
    setSaving(true);
    try {
      const nextActive = !isActive(statusTarget);
      const response = await dispatch(
        enableDisableFinish({
          _id: [statusTarget._id],
          active: nextActive,
          isDisable: !nextActive,
        }),
      ).unwrap();
      toast.success(response?.message || "Finish status updated");
      setStatusTarget(null);
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to update finish status");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setSaving(true);
    try {
      const response = await dispatch(softDeleteFinish({ _id: [deleteTarget._id] })).unwrap();
      toast.success(response?.message || "Finish deleted");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to delete finish");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      ...BASE_COLUMNS,
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <PermissionGuard module="platform" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="Edit finish"
                onClick={() => {
                  setFormData({ _id: row._id, name: row.name || "", active: isActive(row) });
                  setModalMode("edit");
                }}
              >
                <MdEdit size={18} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="platform" action={ACTIONS.STATUS_CHANGE} hide>
              <button
                type="button"
                className={isActive(row) ? "admin-icon-btn text-yellow-600" : "admin-icon-btn text-green-600"}
                title={isActive(row) ? "Deactivate finish" : "Activate finish"}
                onClick={() => setStatusTarget(row)}
              >
                {isActive(row) ? <MdToggleOff size={20} /> : <MdToggleOn size={20} />}
              </button>
            </PermissionGuard>
            <PermissionGuard module="platform" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="admin-icon-btn text-red-600"
                title="Delete finish"
                onClick={() => setDeleteTarget(row)}
              >
                <MdDelete size={18} />
              </button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Finish Products"
        subtitle="Manage product finish values used in catalog setup"
        breadcrumbs={[{ label: "Catalog Masters" }, { label: "Finish Products" }]}
        actions={
          <PermissionGuard module="platform" action={ACTIONS.CREATE} hide>
            <button
              type="button"
              onClick={() => setModalMode("add")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add Finish
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
        searchPlaceholder="Search finishes..."
        emptyText="No finish records found."
        emptyIcon={<MdPalette size={40} className="text-gray-200" />}
        requiredModule="platform"
        exportConfig={{ filename: "finish-products", columns: BASE_COLUMNS }}
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {modalMode === "edit" ? "Edit Finish" : "Add Finish"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Finish Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={(event) => {
                    setFormData((previous) => ({ ...previous, name: event.target.value }));
                    if (errors.name) setErrors((previous) => ({ ...previous, name: undefined }));
                  }}
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g. Matte, Glossy"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton
                  isToggle={formData.active}
                  handleClick={() => setFormData((previous) => ({ ...previous, active: !previous.active }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors">
                  {saving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Finish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatus}
        title={`${isActive(statusTarget) ? "Deactivate" : "Activate"} Finish`}
        message={`${isActive(statusTarget) ? "Deactivate" : "Activate"} "${statusTarget?.name || "this finish"}"?`}
        variant={isActive(statusTarget) ? "warning" : "success"}
        confirmLabel={isActive(statusTarget) ? "Deactivate" : "Activate"}
        loading={saving}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Finish"
        message={`Delete "${deleteTarget?.name || "this finish"}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  );
};

export default FinishProducts;
