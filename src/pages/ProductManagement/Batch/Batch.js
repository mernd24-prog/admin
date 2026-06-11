import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdInventory2, MdToggleOff, MdToggleOn } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ACTIONS } from "../../../_helpers/usePermission";
import { ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { useListPage } from "../../../hooks/useListPage";
import {
  createBatch,
  deleteBatch,
  enableDisableBatch,
  getBatchList,
  updateBatch,
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
  batchCode: "",
  manufactureDate: "",
  expiryDate: "",
  active: true,
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  const date = new Date(Number(value) || value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(Number(value) || value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toTimestamp = (value) => new Date(`${value}T00:00:00`).getTime();

const isActive = (row) => row?.active ?? row?.isDisable !== true;

const BASE_COLUMNS = [
  {
    key: "batchCode",
    label: "Batch Code",
    sortable: true,
    render: (value) => <span className="font-medium text-gray-800">{value || "-"}</span>,
  },
  {
    key: "manufactureDate",
    label: "Manufacture Date",
    sortable: true,
    render: (value) => formatDateDisplay(value),
  },
  {
    key: "expiryDate",
    label: "Expiry Date",
    sortable: true,
    render: (value) => formatDateDisplay(value),
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

const Batch = () => {
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
        getBatchList({
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          searchFields: "batchCode",
          active: params.active,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
        }),
      ).unwrap();
      const normalized = normalizeList(response);
      setItems(normalized.list);
      setTotal(normalized.total);
    } catch (error) {
      toast.error(error?.message || "Failed to load batches");
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
    const batchCode = formData.batchCode.trim();
    const manufactureDate = formData.manufactureDate;
    const expiryDate = formData.expiryDate;

    if (!batchCode) nextErrors.batchCode = "Batch code is required";
    else if (batchCode.length < 2) nextErrors.batchCode = "Minimum 2 characters required";
    else if (batchCode.length > 100) nextErrors.batchCode = "Maximum 100 characters allowed";

    if (!manufactureDate) nextErrors.manufactureDate = "Manufacture date is required";
    if (!expiryDate) nextErrors.expiryDate = "Expiry date is required";

    if (manufactureDate && Number.isNaN(toTimestamp(manufactureDate))) {
      nextErrors.manufactureDate = "Invalid manufacture date";
    }
    if (expiryDate && Number.isNaN(toTimestamp(expiryDate))) {
      nextErrors.expiryDate = "Invalid expiry date";
    }
    if (manufactureDate && expiryDate && toTimestamp(manufactureDate) > toTimestamp(expiryDate)) {
      nextErrors.expiryDate = "Expiry date must be after manufacture date";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      batchCode: formData.batchCode.trim(),
      manufactureDate: toTimestamp(formData.manufactureDate),
      expiryDate: toTimestamp(formData.expiryDate),
      active: Boolean(formData.active),
      isDisable: !formData.active,
    };
    try {
      const response = modalMode === "edit"
        ? await dispatch(updateBatch({ ...payload, _id: formData._id })).unwrap()
        : await dispatch(createBatch(payload)).unwrap();
      toast.success(response?.message || `Batch ${modalMode === "edit" ? "updated" : "created"}`);
      closeModal();
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to save batch");
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
        enableDisableBatch({
          _id: [statusTarget._id],
          active: nextActive,
          isDisable: !nextActive,
        }),
      ).unwrap();
      toast.success(response?.message || "Batch status updated");
      setStatusTarget(null);
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to update batch status");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setSaving(true);
    try {
      const response = await dispatch(deleteBatch({ _id: [deleteTarget._id] })).unwrap();
      toast.success(response?.message || "Batch deleted");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to delete batch");
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
                title="Edit batch"
                onClick={() => {
                  setFormData({
                    _id: row._id,
                    batchCode: row.batchCode || "",
                    manufactureDate: formatDateInput(row.manufactureDate),
                    expiryDate: formatDateInput(row.expiryDate),
                    active: isActive(row),
                  });
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
                title={isActive(row) ? "Deactivate batch" : "Activate batch"}
                onClick={() => setStatusTarget(row)}
              >
                {isActive(row) ? <MdToggleOff size={20} /> : <MdToggleOn size={20} />}
              </button>
            </PermissionGuard>
            <PermissionGuard module="platform" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="admin-icon-btn text-red-600"
                title="Delete batch"
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
        title="Product Batches"
        subtitle="Manage manufacturing and expiry batches used in catalog setup"
        breadcrumbs={[{ label: "Catalog Masters" }, { label: "Batches" }]}
        actions={
          <PermissionGuard module="platform" action={ACTIONS.CREATE} hide>
            <button
              type="button"
              onClick={() => setModalMode("add")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add Batch
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
        searchPlaceholder="Search batches..."
        emptyText="No batches found."
        emptyIcon={<MdInventory2 size={40} className="text-gray-200" />}
        requiredModule="platform"
        exportConfig={{ filename: "product-batches", columns: BASE_COLUMNS }}
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
              {modalMode === "edit" ? "Edit Batch" : "Add Batch"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Code <span className="text-red-500">*</span>
                </label>
                <input
                  name="batchCode"
                  value={formData.batchCode}
                  onChange={(event) => {
                    setFormData((previous) => ({ ...previous, batchCode: event.target.value }));
                    if (errors.batchCode) setErrors((previous) => ({ ...previous, batchCode: undefined }));
                  }}
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g. BATCH-2026-01"
                />
                {errors.batchCode && <p className="text-red-500 text-xs mt-1">{errors.batchCode}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacture Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="manufactureDate"
                  value={formData.manufactureDate}
                  onChange={(event) => {
                    setFormData((previous) => ({ ...previous, manufactureDate: event.target.value }));
                    if (errors.manufactureDate) setErrors((previous) => ({ ...previous, manufactureDate: undefined }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                />
                {errors.manufactureDate && <p className="text-red-500 text-xs mt-1">{errors.manufactureDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  min={formData.manufactureDate || undefined}
                  onChange={(event) => {
                    setFormData((previous) => ({ ...previous, expiryDate: event.target.value }));
                    if (errors.expiryDate) setErrors((previous) => ({ ...previous, expiryDate: undefined }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                />
                {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
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
                  {saving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Batch"}
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
        title={`${isActive(statusTarget) ? "Deactivate" : "Activate"} Batch`}
        message={`${isActive(statusTarget) ? "Deactivate" : "Activate"} "${statusTarget?.batchCode || "this batch"}"?`}
        variant={isActive(statusTarget) ? "warning" : "success"}
        confirmLabel={isActive(statusTarget) ? "Deactivate" : "Activate"}
        loading={saving}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Batch"
        message={`Delete "${deleteTarget?.batchCode || "this batch"}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  );
};

export default Batch;
