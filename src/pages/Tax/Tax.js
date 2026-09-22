/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  MdAccountBalance,
  MdAdd,
  MdList,
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
  createTaxList,
  enableDisableTaxList,
  getTaxList,
  softDeleteTaxList,
  updateTaxList,
} from "../../Redux/cmsSlice";
import { getAllCountryList } from "../../Redux/CountrySlice";
import FormSection from "../../components/Atoms/FormSection/FormSection";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import FormSelectGroup from "../../components/Atoms/FormSelectGroup/FormSelectGroup";
import FormToggleRow from "../../components/Atoms/FormToggleRow/FormToggleRow";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";

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
    label: "Tax Name",
    sortable: true,
    render: (v) => (
      <span className="font-medium text-gray-800 capitalize">{v || "—"}</span>
    ),
  },
  {
    key: "countryId",
    label: "Country",
    render: (v, row) => (
      <span className="text-sm text-gray-600">
        {v?.name || row?.country_code?.name || "—"}
      </span>
    ),
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v, row) => {
      const active = row?.active !== undefined ? Boolean(row.active) : !v;
      return <StatusBadge status={active ? "active" : "inactive"} dot />;
    },
  },
];

const EMPTY_FORM = { _id: "", name: "", country_code: "", isDisable: false };

const Tax = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const [isRefresh, setIsRefresh] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selector = useSelector((state) => state.cms);
  const countrySelector = useSelector((state) => state.country);
  const listPayload = selector?.getTaxListData?.data?.data || {};
  const taxList = listPayload?.list || [];
  const totalTax = Number(listPayload?.total || 0);
  const loading = selector.loading || countrySelector.loading;

  const countryOptions = [
    { value: "", label: "Select country" },
    ...(countrySelector?.getAllCountryListData?.data?.data?.list?.map((c) => ({
      value: c?._id,
      label: c?.name,
    })) || []),
  ];

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getTaxList({
        page: params.page,
        size: params.limit || 10,
        keyWord: params.search || "",
        searchFields: "name,country_code.name",
        populate: "country_code:name",
        ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
      }),
    );
  }, [list.page, list.pageSize, list.search, list.filters, isRefresh]);

  useEffect(() => {
    dispatch(getAllCountryList({ page: 1, size: 200, select: "name" }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = "Tax name is required";
    else if (formData.name.trim().length < 2) errs.name = "Min 2 characters";
    if (!formData.country_code) errs.country_code = "Country is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => {
    setModalMode(null);
    setFormData(EMPTY_FORM);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      country_code: formData.country_code,
      isDisable: formData.isDisable,
    };
    try {
      let res;
      if (modalMode === "edit") {
        res = await dispatch(
          updateTaxList({ ...payload, _id: formData._id }),
        ).unwrap();
      } else {
        res = await dispatch(createTaxList(payload)).unwrap();
      }
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res?.message || `Tax ${modalMode === "edit" ? "updated" : "created"}`,
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
        softDeleteTaxList({ _id: [deleteTarget._id] }),
      ).unwrap();
      toast.success(res?.message || "Tax deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    const isActive =
      toggleTarget?.active !== undefined
        ? Boolean(toggleTarget.active)
        : !toggleTarget.isDisable;
    try {
      const res = await dispatch(
        enableDisableTaxList({ _id: [toggleTarget._id], isDisable: isActive }),
      ).unwrap();
      toast.success(res?.message || "Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Status update failed");
    }
  };

  const isRowActive = (row) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const rowActions = useCallback(
    (row) => {
      const active = isRowActive(row);
      return [
        {
          label: "Edit",
          icon: <MdEdit size={16} className="text-blue-600" />,
          onClick: () => {
            setFormData({
              _id: row._id,
              name: row.name
                ? row.name.charAt(0).toUpperCase() +
                  row.name.slice(1).toLowerCase()
                : "",
              country_code: row.countryId?._id || row.country_code?._id || "",
              isDisable: !active,
            });
            setModalMode("edit");
          },
        },
        {
          label: active ? "Disable" : "Enable",
          icon: active ? (
            <MdBlock size={16} className="text-amber-600" />
          ) : (
            <MdCheckCircle size={16} className="text-green-600" />
          ),
          onClick: () => {
            setToggleTarget(row);
            setConfirmOpen(true);
          },
          danger: active,
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
      ];
    },
    [navigate],
  );

  return (
    <div>
      <PageHeader
        title="Tax Management"
        subtitle="Configure tax rules by country"
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "Taxes" }]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button onClick={() => setModalMode("add")}>
              <MdAdd size={16} /> Add Tax
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={taxList}
        loading={loading}
        totalCount={totalTax}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        rowActions={rowActions}
        searchPlaceholder="Search taxes…"
        emptyText="No tax records found."
        emptyIcon={<MdAccountBalance size={40} className="text-gray-200" />}
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

      <DefaultModal
        isOpen={Boolean(modalMode)}
        onClose={closeModal}
        title={modalMode === "add" ? "Add Tax" : "Edit Tax"}
        submitButtonText={
          saving
            ? "Saving…"
            : modalMode === "add"
              ? "Create Tax"
              : "Save Changes"
        }
        closeButtonText="Cancel"
        onSubmit={handleSubmit}
        isButtonView={true}
      >
        <div className="space-y-5">
          {/* ==================== Tax Information ==================== */}
          <FormSection
            title="Tax Information"
            description="Enter the tax name and select the country where this tax applies."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Tax Name */}
              <FormInput
                label="Tax Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                placeholder="e.g. GST, VAT"
                required
              />

              {/* Country */}
              <FormSelectGroup
                label="Country"
                name="country_code"
                options={countryOptions}
                value={
                  countryOptions.find(
                    (option) =>
                      String(option.value) === String(formData.country_code),
                  ) || null
                }
                onChange={(selectedOption) =>
                  setFormData((prev) => ({
                    ...prev,
                    country_code: selectedOption?.value || "",
                  }))
                }
                error={errors.country_code}
                placeholder="Select country"
                required
              />
            </div>
          </FormSection>

          {/* ==================== Status ==================== */}
          <FormSection
            title="Status"
            description="Control whether this tax is currently available for use."
          >
            <FormToggleRow
              title="Active"
              description="Enable this tax for applicable tax calculations."
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
        title={`${toggleTarget && isRowActive(toggleTarget) ? "Disable" : "Enable"} Tax`}
        message={`${toggleTarget && isRowActive(toggleTarget) ? "Disable" : "Enable"} "${toggleTarget?.name}"?`}
        variant={
          toggleTarget && isRowActive(toggleTarget) ? "danger" : "default"
        }
        confirmText={
          toggleTarget && isRowActive(toggleTarget) ? "Disable" : "Enable"
        }
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Tax"
        message={`Delete tax "${deleteTarget?.name}"? This cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default Tax;
