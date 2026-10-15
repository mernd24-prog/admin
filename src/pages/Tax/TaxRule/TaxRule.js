/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
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
import { getList as getCategoryList } from "../../../Redux/productSlice";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormToggleRow from "../../../components/Atoms/FormToggleRow/FormToggleRow";
import { taxRuleValidationSchema } from "../../../_helpers/validationSchemas";

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
  const [selectedTax, setSelectedTax] = useState(null);
  const [selectedSubTax, setSelectedSubTax] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredSubTaxOptions, setFilteredSubTaxOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: taxRuleValidationSchema,
    onSubmit: async (values) => {
      setSaving(true);
      const payload = {
        description: values.description.trim(),
        tax_id: values.tax_id,
        subTaxes_id: values.subTaxes_id,
        category_id: values.category_id,
        isDisable: values.isDisable,
      };
      try {
        const res =
          modalMode === "edit"
            ? await dispatch(
                updateTaxRule({ ...payload, _id: values._id }),
              ).unwrap()
            : await dispatch(createTaxRule(payload)).unwrap();
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
    },
  });

  const cmsSelector = useSelector((state) => state.cms);
  const totalRules = cmsSelector?.getListTaxRuleData?.data?.data?.total || 0;
  const taxRuleList = cmsSelector?.getListTaxRuleData?.data?.data?.list || [];
  const taxList = cmsSelector?.getAllDocumentsData?.data?.data?.list || [];
  const subTaxList = cmsSelector?.getListSubTaxData?.data?.data?.list || [];

  const taxOptions = useMemo(() => transformArray(taxList), [taxList]);
  const subTaxOptions = useMemo(() => transformArray(subTaxList), [subTaxList]);

  useEffect(() => {
    dispatch(getAllDocuments());
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
          formik.setFieldValue("subTaxes_id", []);
        }
      }
    } else {
      setFilteredSubTaxOptions(subTaxOptions);
    }
  }, [selectedTax, subTaxList, subTaxOptions]);

  // Use the same category-tree API and flattening approach as Product Catalog.
  // This keeps parent categories and every nested subcategory available in the dropdown.
  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setCategoryLoading(true);
      try {
        const response = await dispatch(
          getCategoryList({
            tree: true,
            limit: 100,
          }),
        );

        const raw =
          response?.payload?.data?.data ||
          response?.payload?.data ||
          response?.payload?.data?.list ||
          [];

        const source = Array.isArray(raw) ? raw : raw?.items || raw?.list || [];

        const options = [];
        const seen = new Set();

        const flattenTree = (nodes = [], prefix = "") => {
          if (!Array.isArray(nodes)) return;

          nodes.forEach((node) => {
            if (!node || typeof node !== "object") return;

            const name = node?.title || node?.name || node?.categoryKey || "";
            const key = node?.categoryKey || String(node?._id || "");

            if (name && key && !seen.has(String(key))) {
              seen.add(String(key));
              options.push({
                value: String(key),
                label: prefix ? `${prefix} > ${name}` : name,
              });
            }

            const children = node?.children || node?.subCategories || [];
            if (Array.isArray(children) && children.length) {
              flattenTree(
                children,
                prefix ? `${prefix} > ${name}` : String(name),
              );
            }
          });
        };

        flattenTree(source);

        // Support flat category responses too, without dropping categories
        // that do not have their parent nested in the response.
        const flatSource = Array.isArray(raw)
          ? raw
          : raw?.items || raw?.list || [];
        flatSource.forEach((category) => {
          const key =
            category?.categoryKey ||
            category?._id ||
            category?.id ||
            category?.key;
          const name =
            category?.title ||
            category?.name ||
            category?.categoryName ||
            category?.categoryKey;

          if (key && name && !seen.has(String(key))) {
            seen.add(String(key));
            options.push({ value: String(key), label: String(name) });
          }
        });

        if (isMounted) setCategoryOptions(options);
      } catch (error) {
        console.error("Failed to load categories for tax rules:", error);
        if (isMounted) setCategoryOptions([]);
      } finally {
        if (isMounted) setCategoryLoading(false);
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const closeModal = () => {
    setModalMode(null);
    formik.resetForm({ values: EMPTY_FORM });
    setSelectedTax(null);
    setSelectedSubTax([]);
    setSelectedCategory(null);
  };

  const handleTaxChange = (opt) => {
    setSelectedTax(opt);
    formik.setFieldValue("tax_id", opt?.value || "");
    formik.setFieldValue("subTaxes_id", []);
    formik.setFieldTouched("tax_id", true, false);
    setSelectedSubTax([]);
  };

  const handleSubTaxChange = (opts) => {
    const selected = opts || [];
    setSelectedSubTax(selected);
    formik.setFieldValue(
      "subTaxes_id",
      selected.map((option) => option.value),
    );
    formik.setFieldTouched("subTaxes_id", true, false);
  };

  const handleCategoryChange = (opt) => {
    setSelectedCategory(opt);
    formik.setFieldValue("category_id", opt?.value || "");
    formik.setFieldTouched("category_id", true, false);
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

            formik.resetForm({
              values: {
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
              },
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
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "Tax Rules" }]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => {
                formik.resetForm({ values: EMPTY_FORM });
                setSelectedTax(null);
                setSelectedSubTax([]);
                setSelectedCategory(null);
                setModalMode("add");
              }}
            >
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
        onRefresh={() => setIsRefresh((prev) => !prev)}
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
          onSubmit={formik.handleSubmit}
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
              <div className="space-y-2">
                {/* Description */}

                {/* Tax + Sub Tax */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FilterSelect
                    options={taxOptions}
                    label="Select Tax"
                    value={selectedTax}
                    onChange={handleTaxChange}
                    error={formik.touched.tax_id && formik.errors.tax_id}
                    required
                    placeholder="Select tax"
                  />

                  <FilterSelect
                    options={filteredSubTaxOptions}
                    label="Select Sub Tax"
                    value={selectedSubTax}
                    onChange={handleSubTaxChange}
                    error={
                      formik.touched.subTaxes_id && formik.errors.subTaxes_id
                    }
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
                  isLoading={categoryLoading}
                  label="Select Category"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  error={
                    formik.touched.category_id && formik.errors.category_id
                  }
                  required
                  placeholder="Select category"
                />
                <FormInput
                  label="Description"
                  name="description"
                  type="textarea"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.description && formik.errors.description
                  }
                  placeholder="Describe this tax rule"
                  rows={3}
                  required
                />
              </div>
            </FormSection>

            {/* ==================== Status ==================== */}

            <FormToggleRow
              title="Active"
              description="Enable this tax rule for applicable products and categories."
              isToggle={!formik.values.isDisable}
              handleClick={() =>
                formik.setFieldValue("isDisable", !formik.values.isDisable)
              }
            />
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
