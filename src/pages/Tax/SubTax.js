/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { MdPercent, MdAdd } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import { useListPage } from "../../hooks/useListPage";
import {
  createSubTax,
  enableDisableSubTax,
  getListSubTax,
  getTaxList,
  softDeleteSubTax,
  updateSubTax,
} from "../../Redux/cmsSlice";

const FILTER_FIELDS = [
  {
    key: "isDisable",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "false", label: "Active" },
      { value: "true", label: "Disabled" },
    ],
  },
];

const COLUMNS = [
  {
    key: "name",
    label: "Sub-Tax Name",
    sortable: true,
    render: (v) => (
      <span className="font-medium text-gray-800 capitalize">{v || "—"}</span>
    ),
  },
  {
    key: "percentage",
    label: "Rate (%)",
    render: (v) => (
      <span className="font-mono text-sm">{v ?? "—"}%</span>
    ),
  },
  {
    key: "taxId",
    label: "Parent Tax",
    render: (v, row) => (
      <span className="text-sm text-gray-600">
        {typeof v === "object" ? v?.name : row?.tax?.name || "—"}
      </span>
    ),
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "inactive" : "active"} dot />,
  },
];

const EMPTY_FORM = { _id: "", name: "", percentage: "", taxId: "", isDisable: false };

const SubTax = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const [isRefresh, setIsRefresh] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM, taxId: id || "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selector = useSelector((state) => state.cms);
  const taxList = selector?.getTaxListData?.data?.data?.list || [];
  const subTaxPayload = selector?.getListSubTaxData?.data?.data || {};
  const subTaxList = subTaxPayload?.list || [];
  const totalSubTax = Number(subTaxPayload?.total || 0);

  const taxOptions = useMemo(() => [
    { value: "", label: "Select parent tax" },
    ...taxList.map((t) => ({ value: t._id, label: t.name })),
  ], [taxList]);

  const parentTaxName = useMemo(() => {
    if (!id) return "";
    const found = taxList.find((t) => String(t._id) === String(id) || String(t.value) === String(id));
    return found?.name || id;
  }, [taxList, id]);

  useEffect(() => {
    dispatch(getTaxList({ page: 1, size: 200 }));
  }, []);

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getListSubTax({
        page: params.page,
        size: params.limit || 10,
        keyWord: params.search || "",
        ...(id && { taxId: id }),
        ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
      })
    );
  }, [list.page, list.pageSize, list.search, list.filters, isRefresh, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = "Name is required";
    else if (formData.name.trim().length < 3) errs.name = "Min 3 characters";
    if (!formData.percentage) errs.percentage = "Percentage is required";
    else if (isNaN(formData.percentage) || Number(formData.percentage) < 0 || Number(formData.percentage) > 100)
      errs.percentage = "Must be 0-100";
    if (!id && !formData.taxId) errs.taxId = "Parent tax is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => {
    setModalMode(null);
    setFormData({ ...EMPTY_FORM, taxId: id || "" });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      percentage: formData.percentage,
      taxId: id || formData.taxId,
      isDisable: formData.isDisable,
    };
    try {
      let res;
      if (modalMode === "edit") {
        res = await dispatch(updateSubTax({ ...payload, _id: formData._id })).unwrap();
      } else {
        res = await dispatch(createSubTax(payload)).unwrap();
      }
      if (res?.error) { toast.error(res.error); return; }
      toast.success(res?.message || `Sub-tax ${modalMode === "edit" ? "updated" : "created"}`);
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(softDeleteSubTax({ _id: [deleteTarget._id] })).unwrap();
      toast.success(res?.message || "Sub-tax deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const res = await dispatch(enableDisableSubTax({ _id: [toggleTarget._id], isDisable: !toggleTarget.isDisable })).unwrap();
      toast.success(res?.message || "Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Status update failed");
    }
  };

  const rowActions = useCallback(
    (row) => [
      {
        label: "Edit",
        onClick: () => {
          setFormData({
            _id: row._id,
            name: row.name || "",
            percentage: row.percentage ?? "",
            taxId: typeof row.taxId === "object" ? row.taxId?._id : row.taxId || id || "",
            isDisable: row.isDisable || false,
          });
          setModalMode("edit");
        },
      },
      {
        label: row.isDisable ? "Enable" : "Disable",
        onClick: () => { setToggleTarget(row); setConfirmOpen(true); },
        danger: !row.isDisable,
      },
      {
        label: "Delete",
        onClick: () => { setDeleteTarget(row); setDeleteOpen(true); },
        danger: true,
      },
    ],
    [id]
  );

  return (
    <div>
      <PageHeader
        title={parentTaxName ? `${parentTaxName} — Sub-Taxes` : "Sub-Taxes"}
        subtitle="Manage sub-tax rates and percentages"
        breadcrumbs={[
          { label: "Invoices & Taxation" },
          { label: "Taxes", href: "/app/tax" },
          { label: parentTaxName || "Sub-Taxes" },
        ]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => { setFormData({ ...EMPTY_FORM, taxId: id || "" }); setModalMode("add"); }}

            >
              <MdAdd size={16} /> Add Sub-Tax
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={subTaxList}
        loading={selector.loading}
        totalCount={totalSubTax}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        rowActions={rowActions}
        searchPlaceholder="Search sub-taxes…"
        emptyText="No sub-taxes found."
        emptyIcon={<MdPercent size={40} className="text-gray-200" />}
        requiredModule="tax"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={selector.loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {modalMode === "add" ? "Add Sub-Tax" : "Edit Sub-Tax"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g. IGST, CGST, SGST"
                  maxLength={100}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentage (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="percentage"
                  value={formData.percentage}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="0-100"
                  min="0"
                  max="100"
                  step="0.01"
                />
                {errors.percentage && <p className="text-red-500 text-xs mt-1">{errors.percentage}</p>}
              </div>

              {!id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Tax <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {taxOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.taxId && <p className="text-red-500 text-xs mt-1">{errors.taxId}</p>}
                </div>
              )}

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton isToggle={!formData.isDisable} handleClick={() => setFormData((p) => ({ ...p, isDisable: !p.isDisable }))} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : modalMode === "add" ? "Create" : "Save Changes"}
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
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Sub-Tax`}
        message={`${toggleTarget?.isDisable ? "Enable" : "Disable"} "${toggleTarget?.name}"?`}
        variant={toggleTarget?.isDisable ? "default" : "danger"}
        confirmText={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub-Tax"
        message={`Delete sub-tax "${deleteTarget?.name}"? This cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default SubTax;
