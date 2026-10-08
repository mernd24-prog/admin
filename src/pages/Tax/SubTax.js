/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
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
import { subTaxValidationSchema } from "../../_helpers/validationSchemas";

const FILTER_FIELDS = [
  {
    key: "isDisable",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "false", label: "Active" },
      { value: "true", label: "Inactive" },
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
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initialFormValues = useMemo(
    () => ({ ...EMPTY_FORM, taxId: id || "" }),
    [id],
  );

  const formik = useFormik({
    initialValues: initialFormValues,
    validationSchema: subTaxValidationSchema,
    onSubmit: async (values) => {
      setSaving(true);
      const payload = {
        name: values.name.trim(),
        percentage: values.percentage,
        taxId: id || values.taxId,
        isDisable: values.isDisable,
      };
      try {
        const res =
          modalMode === "edit"
            ? await dispatch(
                updateSubTax({ ...payload, _id: values._id }),
              ).unwrap()
            : await dispatch(createSubTax(payload)).unwrap();
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
    },
  });

  useEffect(() => {
    formik.resetForm({ values: initialFormValues });
  }, [formik.resetForm, initialFormValues]);

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

  const closeModal = () => {
    setModalMode(null);
    formik.resetForm({ values: { ...EMPTY_FORM, taxId: id || "" } });
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
        icon: <MdEdit aria-hidden="true" size={16} className="text-blue-600" />,
        onClick: () => {
          formik.resetForm({
            values: {
              _id: row._id,
              name: row.name || "",
              percentage: row.percentage ?? "",
              taxId:
                typeof row.taxId === "object"
                  ? row.taxId?._id
                  : row.taxId || id || "",
              isDisable: row.isDisable || false,
            },
          });
          setModalMode("edit");
        },
      },
      {
        label: row.isDisable ? "Enable" : "Disable",
        icon: row.isDisable ? (
          <MdCheckCircle
            aria-hidden="true"
            size={16}
            className="text-green-600"
          />
        ) : (
          <MdBlock aria-hidden="true" size={16} className="text-amber-600" />
        ),
        onClick: () => {
          setToggleTarget(row);
          setConfirmOpen(true);
        },
        danger: !row.isDisable,
      },
      {
        label: "Delete",
        icon: (
          <MdDelete aria-hidden="true" size={16} className="text-red-600" />
        ),
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
          // { label: "Taxes", href: "/app/tax" },
          { label: parentTaxName || "Sub Taxes" },
        ]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => {
                formik.resetForm({
                  values: { ...EMPTY_FORM, taxId: id || "" },
                });
                setModalMode("add");
              }}
            >
              <MdAdd aria-hidden="true" size={16} /> Add Sub-Tax
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
        emptyIcon={
          <MdPercent aria-hidden="true" size={40} className="text-gray-200" />
        }
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
        onSubmit={formik.handleSubmit}
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
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && formik.errors.name}
                placeholder="e.g. IGST, CGST, SGST"
                required
              />

              {/* Percentage */}
              <FormInput
                label="Percentage (%)"
                name="percentage"
                type="number"
                value={formik.values.percentage}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onKeyDown={(e) => {
                  if (
                    e.key === "-" ||
                    e.key === "e" ||
                    e.key === "E" ||
                    e.key === "+"
                  ) {
                    e.preventDefault();
                  }
                }}
                error={formik.touched.percentage && formik.errors.percentage}
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
                    (option) =>
                      String(option.value) === String(formik.values.taxId),
                  ) || null
                }
                onChange={(selectedOption) => {
                  formik.setFieldValue("taxId", selectedOption?.value || "");
                  formik.setFieldTouched("taxId", true, false);
                }}
                error={formik.touched.taxId && formik.errors.taxId}
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
              isToggle={!formik.values.isDisable}
              handleClick={() =>
                formik.setFieldValue("isDisable", !formik.values.isDisable)
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
