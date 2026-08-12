/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdCode, MdAdd, MdEdit, MdDelete, MdCheckCircle, MdBlock } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { useListPage } from "../../../hooks/useListPage";
import {
  createHsn,
  getHsnList,
  updateHsn,
  enableDisableHsn,
  softDeleteHsn,
} from "../../../Redux/productSlice";

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
    key: "code",
    label: "HSN Code",
    sortable: true,
    render: (v) => (
      <span className="font-mono font-semibold text-[var(--admin-navy)]">
        {v}
      </span>
    ),
  },
  {
    key: "IGST",
    label: "IGST %",
    render: (v) => <span className="text-sm">{v ?? "—"}%</span>,
  },
  {
    key: "CGST",
    label: "CGST %",
    render: (v) => <span className="text-sm">{v ?? "—"}%</span>,
  },
  {
    key: "SGST",
    label: "SGST %",
    render: (v) => <span className="text-sm">{v ?? "—"}%</span>,
  },
  {
    key: "additionalTax",
    label: "Additional %",
    render: (v) => <span className="text-sm">{v ?? 0}%</span>,
  },
  {
    key: "description",
    label: "Description",
    render: (v) => (
      <span className="text-sm text-gray-600 max-w-xs truncate block">
        {v || "—"}
      </span>
    ),
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "inactive" : "active"} dot />,
  },
];

const EMPTY_FORM = {
  code: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "0",
  description: "",
  isDisable: false,
};

const HsnCode = () => {
  const dispatch = useDispatch();
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "code",
    defaultSortDir: "asc",
  });

  const [hsnList, setHsnList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);

  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = list.toQueryParams();
      const res = await dispatch(
        getHsnList({
          page: params.page?.toString(),
          size: params.limit?.toString() || "20",
          keyWord: params.search || "",
          ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
        })
      ).unwrap();
      const data = res?.data?.data || res?.data || {};
      const items = Array.isArray(data) ? data : data?.list || [];
      const totalCount = Number(data?.total ?? items.length);
      setHsnList(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(err?.message || "Failed to load HSN codes");
    } finally {
      setLoading(false);
    }
  }, [dispatch, list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir, isRefresh]);

  useEffect(() => {
    fetchList();
  }, [list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir, isRefresh]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.code?.trim()) errs.code = "HSN Code is required";
    else if (!/^\d{4,8}$/.test(formData.code.trim())) errs.code = "Must be 4-8 digits";
    if (formData.IGST === "" || formData.IGST === null) errs.IGST = "IGST is required";
    else if (Number(formData.IGST) < 0 || Number(formData.IGST) > 100) errs.IGST = "0-100 only";
    if (formData.CGST === "" || formData.CGST === null) errs.CGST = "CGST is required";
    else if (Number(formData.CGST) < 0 || Number(formData.CGST) > 100) errs.CGST = "0-100 only";
    if (formData.SGST === "" || formData.SGST === null) errs.SGST = "SGST is required";
    else if (Number(formData.SGST) < 0 || Number(formData.SGST) > 100) errs.SGST = "0-100 only";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => { setModalMode(null); setFormData(EMPTY_FORM); setErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      code: formData.code.trim(),
      IGST: Number(formData.IGST),
      CGST: Number(formData.CGST),
      SGST: Number(formData.SGST),
      additionalTax: Number(formData.additionalTax || 0),
      description: formData.description?.trim() || "",
      isDisable: formData.isDisable,
    };
    try {
      let res;
      if (modalMode === "edit") {
        res = await dispatch(updateHsn({ ...payload, _id: formData._id })).unwrap();
      } else {
        res = await dispatch(createHsn(payload)).unwrap();
      }
      if (res?.error) { toast.error(res.error); return; }
      toast.success(res?.message || `HSN code ${modalMode === "edit" ? "updated" : "created"}`);
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleToggleStatus = useCallback(async (row) => {
    try {
      const res = await dispatch(enableDisableHsn({ _id: [row._id], isDisable: !row.isDisable })).unwrap();
      toast.success(res?.message || "Status updated");
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    }
  }, [dispatch]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(softDeleteHsn({ _id: [deleteTarget._id] })).unwrap();
      toast.success(res?.message || "HSN code deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const rowActions = useCallback(
    (row) => [
      {
        label: "Edit",
        icon: <MdEdit size={16} className="text-blue-600" />,
        onClick: () => {
          setFormData({
            _id: row._id,
            code: row.code || "",
            IGST: row.IGST ?? "",
            CGST: row.CGST ?? "",
            SGST: row.SGST ?? "",
            additionalTax: row.additionalTax ?? "0",
            description: row.description || "",
            isDisable: row.isDisable || false,
          });
          setModalMode("edit");
        },
      },
      {
        label: row.isDisable ? "Enable" : "Disable",
        icon: row.isDisable ? (
          <MdCheckCircle size={16} className="text-green-600" />
        ) : (
          <MdBlock size={16} className="text-amber-600" />
        ),
        onClick: () => handleToggleStatus(row),
        danger: !row.isDisable,
      },
      {
        label: "Delete",
        icon: <MdDelete size={16} className="text-red-600" />,
        onClick: () => { setDeleteTarget(row); setDeleteOpen(true); },
        danger: true,
      },
    ],
    [handleToggleStatus]
  );

  return (
    <div>
      <PageHeader
        title="HSN Codes"
        subtitle="Manage Harmonized System Nomenclature codes and tax rates"
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "HSN Codes" }]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setModalMode("add")}

            >
              <MdAdd size={16} /> Add HSN Code
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={hsnList}
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
        searchPlaceholder="Search HSN code or description…"
        emptyText="No HSN codes found."
        emptyIcon={<MdCode size={40} className="text-gray-200" />}
        requiredModule="tax"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5 flex items-center gap-2">
              <MdCode size={20} />
              {modalMode === "add" ? "Add HSN Code" : "Edit HSN Code"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="HSN Code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleInputChange}
                error={errors.code}
                placeholder="e.g. 84715000"
                maxLength={8}
                required
                disabled={modalMode === "edit"}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="IGST %" name="IGST" type="number" value={formData.IGST} onChange={handleInputChange} error={errors.IGST} min="0" max="100" step="0.01" required />
                <FormInput label="CGST %" name="CGST" type="number" value={formData.CGST} onChange={handleInputChange} error={errors.CGST} min="0" max="100" step="0.01" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="SGST %" name="SGST" type="number" value={formData.SGST} onChange={handleInputChange} error={errors.SGST} min="0" max="100" step="0.01" required />
                <FormInput label="Additional Tax %" name="additionalTax" type="number" value={formData.additionalTax} onChange={handleInputChange} min="0" max="100" step="0.01" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] resize-none"
                  placeholder="Optional description of this HSN code"
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton
                  isToggle={!formData.isDisable}
                  handleClick={() => setFormData((p) => ({ ...p, isDisable: !p.isDisable }))}
                />
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
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete HSN Code"
        message={`Delete HSN code "${deleteTarget?.code}"? This cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default HsnCode;
