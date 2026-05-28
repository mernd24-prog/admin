/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import TableData from "../../../components/Atoms/TableData/TableData";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import DeletePopup from "../../../components/Atoms/DeletePopup.js/DeletePopup";
import StatusPopup from "../../../components/Atoms/PopupData/StatusPopup";
import Pagination from "../../../components/Pagination/Pagination";
import Loader from "../../../components/Loader/Loader";
import Button from "../../../components/Atoms/buttons/button";
import CustomCheckbox from "../../../components/Atoms/Checkbox/Checkbox";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import {
  createProductFamily,
  deleteProductFamily,
  getProductFamilies,
  updateProductFamily,
} from "../../../Redux/adminCoreSlice";
import { getList, getAllProducts } from "../../../Redux/productSlice";
import { getAllSellerList } from "../../../Redux/StoreSlice";
import { transformArray } from "../../../_helpers/globalFunctions";

const PAGE_SIZE = 10;
const idFromRecord = (item = {}) =>
  item?.familyCode || item?.code || item?.id || "";

const emptyAttribute = { key: "", value: "" };

const emptyForm = {
  familyCode: "",
  title: "",
  category: "",
  sellerId: "",
  status: "active",
  variantAxes: [""],
  baseAttributes: [emptyAttribute],
};

const toAttributeRows = (obj = {}) => {
  const entries = Object.entries(obj || {});
  if (!entries.length) return [emptyAttribute];
  return entries.map(([key, value]) => ({ key, value: String(value ?? "") }));
};

const toAttributeObject = (rows = []) =>
  rows.reduce((acc, row) => {
    const key = String(row.key || "").trim();
    if (!key) return acc;
    acc[key] = String(row.value || "").trim();
    return acc;
  }, {});

const ProductFamilies = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const productSelector = useSelector((state) => state.product);
  const storeSelector = useSelector((state) => state.store);

  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "" });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isRefresh, setIsRefresh] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const payload = selector?.productFamiliesData?.data?.data || {};
  const list = payload?.list || [];
  const total = payload?.total || 0;
  const categoryList = productSelector?.getListData?.data?.data?.list || [];
  const productList =
    productSelector?.getAllProductsData?.data?.data?.list || [];
  const sellerOptions = transformArray(
    storeSelector?.getAllSellerListData?.data?.data?.list || [],
  );

  const categoryOptions = useMemo(() => {
    const options = [];
    const addOptions = (categories, prefix = "") => {
      if (!Array.isArray(categories)) return;
      categories.forEach((category) => {
        const name = category.name || category.title || category.categoryKey;
        const label = prefix ? `${prefix} > ${name}` : name;
        options.push({
          value: category.categoryKey || category._id || category.id,
          label,
        });
        const children = category.subcategories || category.subCategories || [];
        if (children.length) addOptions(children, label);
      });
    };
    addOptions(categoryList);
    return options;
  }, [categoryList]);

  const productBrandOptions = useMemo(() => {
    const brands = new Set();
    productList.forEach((p) => {
      const brand = String(p?.brand || "").trim();
      if (brand) brands.add(brand);
    });
    return [...brands]
      .sort((a, b) => a.localeCompare(b))
      .map((brand) => ({ value: brand, label: brand }));
  }, [productList]);

  const categoryLabelMap = useMemo(
    () =>
      Object.fromEntries(
        categoryOptions.map((item) => [String(item.value), item.label]),
      ),
    [categoryOptions],
  );
  const sellerLabelMap = useMemo(
    () =>
      Object.fromEntries(
        sellerOptions.map((item) => [String(item.value), item.label]),
      ),
    [sellerOptions],
  );

  const fetchList = useCallback(() => {
    dispatch(
      getProductFamilies({
        page: pageNo,
        limit: PAGE_SIZE,
        category: filters.search,
      }),
    );
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchList();
  }, [fetchList, isRefresh]);

  useEffect(() => {
    dispatch(getList({ limit: 100 }));
    dispatch(getAllProducts({ page: 1, limit: 100 }));
    dispatch(getAllSellerList());
  }, [dispatch]);

  const validateForm = () => {
    const nextErrors = {};
    if (!String(formData.familyCode || "").trim())
      nextErrors.familyCode = "Required";
    if (!String(formData.title || "").trim()) nextErrors.title = "Required";
    if (!String(formData.category || "").trim())
      nextErrors.category = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const toPayload = () => ({
    familyCode: String(formData.familyCode || "").trim(),
    title: String(formData.title || "").trim(),
    category: String(formData.category || "").trim(),
    sellerId: String(formData.sellerId || "").trim() || undefined,
    status: formData.status || "active",
    variantAxes: (formData.variantAxes || [])
      .map((v) => String(v || "").trim())
      .filter(Boolean),
    baseAttributes: toAttributeObject(formData.baseAttributes || []),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    try {
      if (formData._editingId) {
        await dispatch(
          updateProductFamily({
            ...toPayload(),
            familyCode: formData._editingId,
          }),
        ).unwrap();
        toast.success("Product family updated");
      } else {
        await dispatch(createProductFamily(toPayload())).unwrap();
        toast.success("Product family created");
      }
      closeModal();
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || "Failed to save product family");
    }
  };

  const handleDelete = async () => {
    const familyCode = idFromRecord(deleteTarget);
    if (!familyCode) return;
    try {
      await dispatch(deleteProductFamily({ familyCode })).unwrap();
      toast.success("Product family deleted");
      setDeleteTarget(null);
      setSelectedRow([]);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || "Failed to delete product family");
    }
  };

  const handleToggle = async () => {
    const familyCode = idFromRecord(toggleTarget);
    if (!familyCode) return;
    try {
      await dispatch(
        updateProductFamily({
          familyCode,
          status: toggleTarget.status === "active" ? "inactive" : "active",
        }),
      ).unwrap();
      toast.success("Status updated");
      setToggleTarget(null);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || "Failed to update status");
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedRow.length)
      return toast.warning("Please select at least one family");
    const status =
      action === "Active"
        ? "active"
        : action === "Inactive"
          ? "inactive"
          : null;
    if (!status) return;
    try {
      await Promise.all(
        selectedRow.map((familyCode) =>
          dispatch(updateProductFamily({ familyCode, status })).unwrap(),
        ),
      );
      toast.success("Bulk status updated");
      setSelectedRow([]);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || "Failed bulk update");
    }
  };

  const rows = list.map((item) => [
    <CustomCheckbox
      key={`check-${idFromRecord(item)}`}
      checked={selectedRow.includes(idFromRecord(item))}
      onChange={(event) =>
        setSelectedRow((prev) =>
          event.target.checked
            ? [...prev, idFromRecord(item)]
            : prev.filter((id) => id !== idFromRecord(item)),
        )
      }
    />,
    <span className="font-mono text-xs">{item.familyCode || item.code}</span>,
    <span>{item.title || item.name}</span>,
    <span>
      {categoryLabelMap[String(item.category || "")] || item.category || "-"}
    </span>,
    <span>
      {sellerLabelMap[String(item.sellerId || "")] ||
        item.sellerName ||
        item.sellerId ||
        "-"}
    </span>,
    <span>{(item.variantAxes || []).join(", ") || "-"}</span>,
    <ToggleButton
      isToggle={item.status === "active"}
      handleClick={() => setToggleTarget(item)}
    />,
    <ActionButtons
      onEdit={() => {
        setFormData({
          _editingId: idFromRecord(item),
          familyCode: item.familyCode || item.code || "",
          title: item.title || item.name || "",
          category: item.category || "",
          sellerId: item.sellerId || "",
          status: item.status || "active",
          variantAxes:
            Array.isArray(item.variantAxes) && item.variantAxes.length
              ? item.variantAxes
              : [""],
          baseAttributes: toAttributeRows(item.baseAttributes || {}),
        });
        setIsModalOpen(true);
      }}
      onDelete={() => setDeleteTarget(item)}
      showLinkButton={false}
    />,
  ]);

  const allSelected = useMemo(
    () => selectedRow.length === list.length && list.length > 0,
    [selectedRow.length, list.length],
  );

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="max-w-7xl mx-auto">
        <div className="overflow-hidden overflow-y-auto py-6">
          <div className="flex justify-between items-center">
            <h3>
              Home / <b>Product Families</b>
            </h3>
            <Button
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => setIsModalOpen(true)}
            >
              Add
            </Button>
          </div>
          <div className="overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]">
            <div className="bg-white p-2 border-b mb-4">
              <SearchComponent
                isSearchShow
                filters={filters}
                setFilters={setFilters}
                isActionButton
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                handleAction={handleBulkAction}
                isStatusAction
                placeholder="Search by category"
                applyFilters={() => {
                  setPageNo(1);
                  setIsRefresh((v) => !v);
                }}
                handleSearchRemove={() => {
                  setFilters({ search: "" });
                  setPageNo(1);
                  setIsRefresh((v) => !v);
                }}
              />
            </div>
            <TableData
              Heading="Product Families"
              tableHeadings={[
                <input
                  key="select-all"
                  type="checkbox"
                  className="w-4 h-4 border border-[#4a4a4f] rounded bg-transparent"
                  checked={allSelected}
                  onChange={(event) =>
                    setSelectedRow(
                      event.target.checked
                        ? list.map((item) => idFromRecord(item))
                        : [],
                    )
                  }
                />,
                "Family Code",
                "Title",
                "Category",
                "Seller",
                "Variant Axes",
                "Status",
                "Actions",
              ]}
              data={rows}
              showSearch={false}
              showFilter={false}
              showSummary={false}
              totalData={total}
              totalSize={PAGE_SIZE}
              currentPage={pageNo}
              onPageChange={setPageNo}
            />
          </div>
          <div className="flex justify-center my-6">
            {total > PAGE_SIZE && (
              <Pagination
                totalPages={Math.ceil(total / PAGE_SIZE)}
                currentPage={pageNo}
                onPageChange={setPageNo}
              />
            )}
          </div>
        </div>
      </div>

      <DefaultModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          formData._editingId ? "Edit Product Family" : "Add Product Family"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Family Code"
            name="familyCode"
            value={formData.familyCode}
            onChange={(e) =>
              setFormData((p) => ({ ...p, familyCode: e.target.value }))
            }
            error={errors.familyCode}
            disabled={Boolean(formData._editingId)}
          />
          <FormInput
            label="Title"
            name="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((p) => ({ ...p, title: e.target.value }))
            }
            error={errors.title}
          />
          <FilterSelect
            label="Category"
            options={categoryOptions}
            value={
              categoryOptions.find(
                (opt) => String(opt.value) === String(formData.category || ""),
              ) || null
            }
            onChange={(option) => {
              setFormData((prev) => ({
                ...prev,
                category: option?.value || "",
              }));
              setErrors((prev) => ({ ...prev, category: undefined }));
            }}
            error={errors.category}
            placeholder="Select category"
            required
          />
          <FilterSelect
            label="Seller (optional)"
            options={sellerOptions}
            value={
              sellerOptions.find(
                (opt) => String(opt.value) === String(formData.sellerId || ""),
              ) || null
            }
            onChange={(option) =>
              setFormData((prev) => ({
                ...prev,
                sellerId: option?.value || "",
              }))
            }
            placeholder="Select seller"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Variant Axes
              </label>
              <button
                type="button"
                className="text-xs text-blue-600"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    variantAxes: [...(p.variantAxes || []), ""],
                  }))
                }
              >
                Add Axis
              </button>
            </div>
            {(formData.variantAxes || []).map((axis, idx) => (
              <div key={`axis-${idx}`} className="flex gap-2">
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={axis}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      variantAxes: (p.variantAxes || []).map((v, i) =>
                        i === idx ? e.target.value : v,
                      ),
                    }))
                  }
                  placeholder="e.g. color"
                />
                <button
                  type="button"
                  className="px-2 text-red-600"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      variantAxes: (p.variantAxes || []).filter(
                        (_, i) => i !== idx,
                      ) || [""],
                    }))
                  }
                >
                  X
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Base Attributes
              </label>
              <button
                type="button"
                className="text-xs text-blue-600"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    baseAttributes: [
                      ...(p.baseAttributes || []),
                      emptyAttribute,
                    ],
                  }))
                }
              >
                Add Attribute
              </button>
            </div>
            {(formData.baseAttributes || []).map((row, idx) => (
              <div key={`attr-${idx}`} className="grid grid-cols-2 gap-2">
                <input
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="key"
                  value={row.key}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      baseAttributes: (p.baseAttributes || []).map((r, i) =>
                        i === idx ? { ...r, key: e.target.value } : r,
                      ),
                    }))
                  }
                />
                <div className="flex gap-2">
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="value"
                    value={row.value}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        baseAttributes: (p.baseAttributes || []).map((r, i) =>
                          i === idx ? { ...r, value: e.target.value } : r,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="px-2 text-red-600"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        baseAttributes: (p.baseAttributes || []).filter(
                          (_, i) => i !== idx,
                        ) || [emptyAttribute],
                      }))
                    }
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#3E4094] text-white"
            >
              Save
            </button>
          </div>
        </form>
      </DefaultModal>

      {deleteTarget && (
        <DeletePopup
          Heading="Delete Product Family"
          Body="Are you sure you want to delete this product family?"
          onCancel={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
      )}

      {toggleTarget && (
        <StatusPopup
          title={
            toggleTarget.status === "active"
              ? "Deactivate Product Family"
              : "Activate Product Family"
          }
          message={`Are you sure you want to ${toggleTarget.status === "active" ? "deactivate" : "activate"} this product family?`}
          onConfirm={handleToggle}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </>
  );
};

export default ProductFamilies;
