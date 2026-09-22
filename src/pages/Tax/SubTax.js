/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MdPercent,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdBlock,
} from "react-icons/md";
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
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../components/Atoms/FormSection/FormSection";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import FormSelectGroup from "../../components/Atoms/FormSelectGroup/FormSelectGroup";
import FormToggleRow from "../../components/Atoms/FormToggleRow/FormToggleRow";

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
    render: (v) => <span className="font-mono text-sm">{v ?? "—"}%</span>,
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

const EMPTY_FORM = {
  _id: "",
  name: "",
  percentage: "",
  taxId: "",
  isDisable: false,
};

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

  const taxOptions = useMemo(
    () => [
      { value: "", label: "Select parent tax" },
      ...taxList.map((t) => ({ value: t._id, label: t.name })),
    ],
    [taxList],
  );

  const parentTaxName = useMemo(() => {
    if (!id) return "";
    const found = taxList.find(
      (t) => String(t._id) === String(id) || String(t.value) === String(id),
    );
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
      }),
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
    else if (
      isNaN(formData.percentage) ||
      Number(formData.percentage) < 0 ||
      Number(formData.percentage) > 100
    )
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
        res = await dispatch(
          updateSubTax({ ...payload, _id: formData._id }),
        ).unwrap();
      } else {
        res = await dispatch(createSubTax(payload)).unwrap();
      }
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res?.message ||
          `Sub-tax ${modalMode === "edit" ? "updated" : "created"}`,
      );
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(
        softDeleteSubTax({ _id: [deleteTarget._id] }),
      ).unwrap();
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
      const res = await dispatch(
        enableDisableSubTax({
          _id: [toggleTarget._id],
          isDisable: !toggleTarget.isDisable,
        }),
      ).unwrap();
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
        icon: <MdEdit size={16} className="text-blue-600" />,
        onClick: () => {
          setFormData({
            _id: row._id,
            name: row.name || "",
            percentage: row.percentage ?? "",
            taxId:
              typeof row.taxId === "object"
                ? row.taxId?._id
                : row.taxId || id || "",
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
        onClick: () => {
          setToggleTarget(row);
          setConfirmOpen(true);
        },
        danger: !row.isDisable,
      },
      {
        label: "Delete",
        icon: <MdDelete size={16} className="text-red-600" />,
        onClick: () => {
          setDeleteTarget(row);
          setDeleteOpen(true);
        },
        danger: true,
      },
    ],
    [id],
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
              onClick={() => {
                setFormData({ ...EMPTY_FORM, taxId: id || "" });
                setModalMode("add");
              }}
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

      <DefaultModal
        isOpen={Boolean(modalMode)}
        onClose={closeModal}
        title={modalMode === "add" ? "Add Sub-Tax" : "Edit Sub-Tax"}
        submitButtonText={
          saving ? "Saving…" : modalMode === "add" ? "Create" : "Save Changes"
        }
        closeButtonText="Cancel"
        onSubmit={handleSubmit}
        isButtonView={true}
      >
        <div className="space-y-5">
          {/* ==================== Basic Information ==================== */}
          <FormSection
            title="Basic Information"
            description="Enter the sub-tax name and applicable percentage."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Name */}
              <FormInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                placeholder="e.g. IGST, CGST, SGST"
                required
              />

              {/* Percentage */}
              <FormInput
                label="Percentage (%)"
                name="percentage"
                type="number"
                value={formData.percentage}
                onChange={handleInputChange}
                error={errors.percentage}
                placeholder="0-100"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>
          </FormSection>

          {/* ==================== Parent Tax ==================== */}
          {!id && (
            <FormSection
              title="Parent Tax"
              description="Select the main tax under which this sub-tax will be created."
            >
              <FormSelectGroup
                label="Parent Tax"
                name="taxId"
                options={taxOptions}
                value={
                  taxOptions.find(
                    (option) => String(option.value) === String(formData.taxId),
                  ) || null
                }
                onChange={(selectedOption) =>
                  setFormData((prev) => ({
                    ...prev,
                    taxId: selectedOption?.value || "",
                  }))
                }
                error={errors.taxId}
                placeholder="Select parent tax"
                required
              />
            </FormSection>
          )}

          {/* ==================== Status ==================== */}
          <FormSection
            title="Status"
            description="Control whether this sub-tax is active and available for use."
          >
            <FormToggleRow
              title="Active"
              description="Enable this sub-tax for applicable tax calculations."
              isToggle={!formData.isDisable}
              handleClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  isDisable: !prev.isDisable,
                }))
              }
            />
          </FormSection>
        </div>
      </DefaultModal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setToggleTarget(null);
        }}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Sub-Tax`}
        message={`${toggleTarget?.isDisable ? "Enable" : "Disable"} "${toggleTarget?.name}"?`}
        variant={toggleTarget?.isDisable ? "default" : "danger"}
        confirmText={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
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
