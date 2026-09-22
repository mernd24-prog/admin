/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MdGavel,
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
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { useListPage } from "../../../hooks/useListPage";
import { transformArray } from "../../../_helpers/globalFunctions";
import {
  createTaxRule,
  enableDisableTaxRule,
  getAllDocuments,
  getListSubTax,
  getListTaxRule,
  softDeleteTaxRule,
  updateTaxRule,
} from "../../../Redux/cmsSlice";
import { getListCategory } from "../../../Redux/userManagementSlice";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormToggleRow from "../../../components/Atoms/FormToggleRow/FormToggleRow";

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
    key: "description",
    label: "Description",
    sortable: true,
    render: (v) => (
      <span className="font-medium text-gray-800 capitalize">{v || "—"}</span>
    ),
  },
  {
    key: "taxId",
    label: "Tax",
    render: (v, row) => (
      <span className="text-sm text-gray-600 capitalize">
        {v?.name || row?.tax_id?.name || "—"}
      </span>
    ),
  },
  {
    key: "category",
    label: "Category",
    render: (v, row) => (
      <span className="text-sm text-gray-600 capitalize">
        {v || row?.category_id?.name || "—"}
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

const EMPTY_FORM = {
  _id: "",
  description: "",
  tax_id: "",
  subTaxes_id: [],
  category_id: "",
  isDisable: false,
};

const isRowActive = (row = {}) =>
  row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

const TaxRule = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const [isRefresh, setIsRefresh] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedTax, setSelectedTax] = useState(null);
  const [selectedSubTax, setSelectedSubTax] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredSubTaxOptions, setFilteredSubTaxOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cmsSelector = useSelector((state) => state.cms);
  const userSelector = useSelector((state) => state.user);
  const totalRules = cmsSelector?.getListTaxRuleData?.data?.data?.total || 0;
  const taxRuleList = cmsSelector?.getListTaxRuleData?.data?.data?.list || [];
  const taxList = cmsSelector?.getAllDocumentsData?.data?.data?.list || [];
  const subTaxList = cmsSelector?.getListSubTaxData?.data?.data?.list || [];

  const taxOptions = useMemo(() => transformArray(taxList), [taxList]);
  const subTaxOptions = useMemo(() => transformArray(subTaxList), [subTaxList]);

  useEffect(() => {
    dispatch(getAllDocuments());
    dispatch(getListCategory());
  }, []);

  useEffect(() => {
    dispatch(
      getListSubTax({
        page: 1,
        size: 1000,
        query: id ? JSON.stringify({ tax_id: id }) : "",
      }),
    );
  }, [id]);

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getListTaxRule({
        page: params.page,
        size: params.limit || 10,
        keyWord: params.search || "",
        searchFields: "description",
        sortBy: "createdAt",
        sortOrder: "desc",
        populate: "tax_id:name||category_id:name||subTaxes_id:name",
        ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
      }),
    );
  }, [list.page, list.pageSize, list.search, list.filters, isRefresh]);

  useEffect(() => {
    if (selectedTax && subTaxList.length > 0) {
      const filtered = subTaxList.filter(
        (st) => (st.tax_id?._id || st.tax_id) === selectedTax.value,
      );
      setFilteredSubTaxOptions(transformArray(filtered));
      if (selectedSubTax.length > 0) {
        const cur = subTaxList.find((s) => s._id === selectedSubTax[0]?.value);
        if ((cur?.tax_id?._id || cur?.tax_id) !== selectedTax.value) {
          setSelectedSubTax([]);
          setFormData((prev) => ({ ...prev, subTaxes_id: [] }));
        }
      }
    } else {
      setFilteredSubTaxOptions(subTaxOptions);
    }
  }, [selectedTax, subTaxList, subTaxOptions]);

  const categoryOptions = useMemo(() => {
    const options = [];
    const categoryPayload = userSelector?.getListCategoryData?.data?.data;
    const categories = Array.isArray(categoryPayload)
      ? categoryPayload
      : categoryPayload?.list || [];
    if (!categories.length) return options;

    const hasNested = categories.some(
      (c) => Array.isArray(c?.subcategories) || Array.isArray(c?.subCategories),
    );
    if (hasNested) {
      const addOptions = (nodes, prefix = "") => {
        if (!Array.isArray(nodes)) return;
        nodes.forEach((cat) => {
          const name = cat.name || cat.title || cat.categoryKey;
          const label = prefix ? `${prefix} > ${name}` : name;
          options.push({ value: String(cat.categoryKey || cat._id), label });
          const children = cat.subcategories || cat.subCategories || [];
          if (children.length) addOptions(children, label);
        });
      };
      addOptions(categories);
      return options;
    }

    const byParent = new Map();
    categories.forEach((cat) => {
      const parent = cat?.parentKey ? String(cat.parentKey) : "__root__";
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(cat);
    });
    const walk = (parent = "__root__", prefix = "") => {
      (byParent.get(parent) || [])
        .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
        .forEach((cat) => {
          const name = cat.name || cat.title || cat.categoryKey;
          const label = prefix ? `${prefix} > ${name}` : name;
          options.push({ value: String(cat.categoryKey || cat._id), label });
          walk(String(cat.categoryKey || cat._id), label);
        });
    };
    walk();
    return options;
  }, [userSelector.getListCategoryData]);

  const validate = () => {
    const errs = {};
    if (!formData.description?.trim())
      errs.description = "Description is required";
    else if (formData.description.trim().length < 3)
      errs.description = "Min 3 characters";
    if (!formData.tax_id) errs.tax_id = "Tax is required";
    if (!formData.subTaxes_id?.length) errs.subTaxes_id = "Sub Tax is required";
    if (!formData.category_id) errs.category_id = "Category is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => {
    setModalMode(null);
    setFormData(EMPTY_FORM);
    setSelectedTax(null);
    setSelectedSubTax([]);
    setSelectedCategory(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleTaxChange = (opt) => {
    setSelectedTax(opt);
    setFormData((prev) => ({ ...prev, tax_id: opt.value, subTaxes_id: [] }));
    setSelectedSubTax([]);
    if (errors.tax_id) setErrors((prev) => ({ ...prev, tax_id: undefined }));
  };

  const handleSubTaxChange = (opts) => {
    setSelectedSubTax(opts);
    setFormData((prev) => ({ ...prev, subTaxes_id: opts.map((o) => o.value) }));
    if (errors.subTaxes_id)
      setErrors((prev) => ({ ...prev, subTaxes_id: undefined }));
  };

  const handleCategoryChange = (opt) => {
    setSelectedCategory(opt);
    setFormData((prev) => ({ ...prev, category_id: opt.value }));
    if (errors.category_id)
      setErrors((prev) => ({ ...prev, category_id: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      description: formData.description.trim(),
      tax_id: formData.tax_id,
      subTaxes_id: formData.subTaxes_id,
      category_id: formData.category_id,
      isDisable: formData.isDisable,
    };
    try {
      let res;
      if (modalMode === "edit") {
        res = await dispatch(
          updateTaxRule({ ...payload, _id: formData._id }),
        ).unwrap();
      } else {
        res = await dispatch(createTaxRule(payload)).unwrap();
      }
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res?.message ||
          `Tax rule ${modalMode === "edit" ? "updated" : "created"}`,
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
        softDeleteTaxRule({ _id: [deleteTarget._id] }),
      ).unwrap();
      toast.success(res?.message || "Tax rule deleted");
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
        enableDisableTaxRule({
          _id: [toggleTarget._id],
          isDisable: isRowActive(toggleTarget),
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
    (row) => {
      const active = isRowActive(row);
      return [
        {
          label: "Edit",
          icon: <MdEdit size={16} className="text-blue-600" />,
          onClick: () => {
            const ruleSubTaxes = subTaxList
              .filter(
                (st) =>
                  row.subTaxes_id &&
                  (Array.isArray(row.subTaxes_id)
                    ? row.subTaxes_id.some((id) => id._id === st._id)
                    : row.subTaxes_id._id === st._id),
              )
              .map((st) => ({ value: st._id, label: st.name }));

            setFormData({
              _id: row._id,
              description: row.description || "",
              tax_id:
                row.taxId?._id ||
                row.tax_id?._id ||
                row.taxId ||
                row.tax_id ||
                "",
              subTaxes_id: Array.isArray(row.subTaxIds)
                ? row.subTaxIds.map((s) => s?._id || s)
                : Array.isArray(row.subTaxes_id)
                  ? row.subTaxes_id.map((s) => s?._id || s)
                  : [row.subTaxes_id?._id || row.subTaxes_id].filter(Boolean),
              category_id:
                row.category_id?._id || row.category_id || row.category || "",
              isDisable: !active,
            });

            const taxVal = row.taxId || row.tax_id;
            setSelectedTax(
              taxVal
                ? {
                    value: taxVal._id || taxVal,
                    label: taxVal.name || "Selected Tax",
                  }
                : null,
            );
            setSelectedSubTax(ruleSubTaxes);
            const catVal = row.category_id || row.category;
            setSelectedCategory(
              catVal
                ? { value: catVal._id || catVal, label: catVal.name || catVal }
                : null,
            );
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
    [subTaxList],
  );

  return (
    <div>
      <PageHeader
        title="Tax Rules"
        subtitle="Map tax structures to product categories"
        breadcrumbs={[
          { label: "Invoices & Taxation" },
          { label: "Taxes", href: "/app/tax" },
          { label: "Tax Rules" },
        ]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button onClick={() => setModalMode("add")}>
              <MdAdd size={16} /> Add Tax Rule
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={taxRuleList}
        loading={cmsSelector.loading}
        totalCount={totalRules}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        rowActions={rowActions}
        searchPlaceholder="Search tax rules…"
        emptyText="No tax rules found."
        emptyIcon={<MdGavel size={40} className="text-gray-200" />}
        requiredModule="tax"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={cmsSelector.loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {modalMode && (
        <DefaultModal
          isOpen={Boolean(modalMode)}
          onClose={closeModal}
          onSubmit={handleSubmit}
          title={modalMode === "add" ? "Add Tax Rule" : "Edit Tax Rule"}
          submitButtonText={
            saving
              ? "Saving..."
              : modalMode === "add"
                ? "Create Tax Rule"
                : "Save Changes"
          }
          closeButtonText="Cancel"
          isButtonView={true}
          loading={saving}
        >
          <div className="space-y-5">
            {/* ==================== Tax Rule Information ==================== */}
            <FormSection
              title="Tax Rule Information"
              description="Configure the tax rule and select the applicable taxes and category."
            >
              <div className="space-y-4">
                {/* Description */}
                <FormInput
                  label="Description"
                  name="description"
                  type="textarea"
                  value={formData.description}
                  onChange={handleInputChange}
                  error={errors.description}
                  placeholder="Describe this tax rule"
                  rows={3}
                  required
                />

                {/* Tax + Sub Tax */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FilterSelect
                    options={taxOptions}
                    label="Select Tax"
                    value={selectedTax}
                    onChange={handleTaxChange}
                    error={errors.tax_id}
                    required
                    placeholder="Select tax"
                  />

                  <FilterSelect
                    options={filteredSubTaxOptions}
                    label="Select Sub Tax"
                    value={selectedSubTax}
                    onChange={handleSubTaxChange}
                    error={errors.subTaxes_id}
                    required
                    isMulti
                    isDisabled={!selectedTax}
                    placeholder={
                      selectedTax ? "Select sub tax" : "Select tax first"
                    }
                  />
                </div>

                {/* Category */}
                <FilterSelect
                  options={categoryOptions}
                  label="Select Category"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  error={errors.category_id}
                  required
                  placeholder="Select category"
                />
              </div>
            </FormSection>

            {/* ==================== Status ==================== */}
            <FormSection
              title="Status"
              description="Control whether this tax rule is active and available for use."
            >
              <FormToggleRow
                title="Active"
                description="Enable this tax rule for applicable products and categories."
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
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setToggleTarget(null);
        }}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget && isRowActive(toggleTarget) ? "Disable" : "Enable"} Tax Rule`}
        message={`${toggleTarget && isRowActive(toggleTarget) ? "Disable" : "Enable"} rule "${toggleTarget?.description}"?`}
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
        title="Delete Tax Rule"
        message={`Delete rule "${deleteTarget?.description}"? This cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default TaxRule;
