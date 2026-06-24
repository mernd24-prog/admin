import 'react-quill/dist/quill.snow.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';

// Components
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';
import Loader from '../../../../components/Loader/Loader';
import useDropdownOptions from '../../../../hooks/useDropdownOptions';
import PermissionGuard from '../../../../components/Atoms/PermissionGuard/PermissionGuard';

// Modals
import AddCategoryModal from './Modals/AddCategoryModal';

// Redux Actions
import { createCategory, createHsn } from '../../../../Redux/productSlice';

import { transformArray, uploadFile } from '../../../../_helpers/globalFunctions';
import AddHsnModal from './Modals/AddHsnModal';
// import { TextEditor } from '../../../../components/Atoms/FormInput/TextEditor';

const INITIAL_FORM_CATEGORY = {
  categoryName: '',
  bannerUrl: '',
  iconUrl: '',
  parentCategory: null,
  isPublish: true,
  isDashboardVisible: false, priority: "0"
};

const INITIAL_FORM_HSN = {
  code: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "",
  description: "",
  isDisable: false
}

const SELLER_PANEL_ROLES = new Set(['seller', 'seller-admin', 'seller-sub-admin']);

export default function BasicDetailsTab({
  formData,
  handleChange,
  formattedBrandList,
  formattedWarrantyList,
  formattedColorList,
  formattedProductFamilyList,
  formattedCategoryList,
  handleSelectChange,
  errors,
  fetchAllData,
  allCategories, API_CALL_OBJECT, hsnCodeList, sellerList = [], organizationList = [], userData
}) {
  const dispatch = useDispatch();
  const selector = useSelector(state => state);
  const warrantyUnits = useDropdownOptions('warranty-units');
  const warrantyTemplatesFromMaster = useDropdownOptions('warranty-templates');

 
  const modifiedSellerList = sellerList.length
    ? sellerList
    : transformArray(selector?.store?.getAllSellerListData?.data?.data?.list || [])
  const selectedCategoryOption = useMemo(() => {
    const currentCategory = String(formData.category_id || formData.categoryId || formData.category || formData.category_key || '');
    if (!currentCategory) return null;
    return (
      formattedCategoryList.find((opt) =>
        String(opt.value) === currentCategory || String(opt.categoryKey || '') === currentCategory
      ) || null
    );
  }, [formattedCategoryList, formData.category_id, formData.categoryId, formData.category, formData.category_key]);

  const selectedHsnOption = useMemo(() => {
    const currentHsn = String(formData.hsn_code || formData.hsnCode || '');
    if (!currentHsn) return null;
    return (
      hsnCodeList.find((opt) =>
        String(opt.value) === currentHsn || String(opt.code || '') === currentHsn
      ) || null
    );
  }, [hsnCodeList, formData.hsn_code, formData.hsnCode]);

  // ── HSN auto-suggestion ─────────────────────────────────────────────────

  const [hsnSuggestion, setHsnSuggestion] = useState(null);
  const userChangedCategoryRef = useRef(false);

  // Flatten nested / flat allCategories into a single array for ancestor lookup
  const flatCategories = useMemo(() => {
    const result = [];
    const flatten = (cats) => {
      if (!Array.isArray(cats)) return;
      cats.forEach((c) => {
        result.push(c);
        flatten(c.subcategories || c.subCategories || []);
      });
    };
    flatten(Array.isArray(allCategories) ? allCategories : []);
    return result;
  }, [allCategories]);

  // Map: categoryKey → parentKey for ancestor traversal
  const categoryParentMap = useMemo(() => {
    const map = new Map();
    flatCategories.forEach((c) => {
      const key = String(c.categoryKey || c._id || '');
      if (key && c.parentKey) map.set(key, String(c.parentKey));
    });
    return map;
  }, [flatCategories]);

  const getCategoryAncestors = useCallback((key) => {
    const chain = [];
    let cur = key;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      chain.push(cur);
      seen.add(cur);
      cur = categoryParentMap.get(cur) || null;
    }
    return chain;
  }, [categoryParentMap]);

  // Intercept category selection so we know it was a user action (not initial load)
  const handleCategoryChange = useCallback((option) => {
    userChangedCategoryRef.current = true;
    setHsnSuggestion(null);
    handleSelectChange(option, 'CATEGORY_ID');
  }, [handleSelectChange]);

  // When category changes (user-triggered), compute HSN suggestion
  useEffect(() => {
    if (!userChangedCategoryRef.current) return;
    const categoryKey = String(formData?.category_id || formData?.categoryId || formData?.category || formData?.category_key || '');
    if (!categoryKey || !Array.isArray(hsnCodeList) || !hsnCodeList.length) return;

    const ancestors = getCategoryAncestors(categoryKey);
    const match = ancestors.reduce((found, ancestor) =>
      found || hsnCodeList.find((o) => o.hsnCategory === ancestor) || null, null);

    if (!match) {
      setHsnSuggestion({ type: 'none' });
      return;
    }

    const isEditMode = Boolean(formData?._id || formData?.id);
    const currentHsn = formData?.hsn_code || formData?.hsnCode;

    if (isEditMode && currentHsn) {
      setHsnSuggestion({ type: 'suggest', option: match });
    } else {
      handleSelectChange(match, 'hsn_code');
      setHsnSuggestion({ type: 'applied', option: match });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.category_id, formData?.categoryId, formData?.category, formData?.category_key]);

  // ───────────────────────────────────────────────────────────────────────

  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [isHsnAddModal, setIsHsnAddModal] = useState(false)

  const [formErrors, setFormErrors] = useState({});
  const [categoryForm, setCategoryForm] = useState(INITIAL_FORM_CATEGORY);
  const [hsnFormValues, setIsHsnFormValue] = useState(INITIAL_FORM_HSN)

  const [isLoading, setIsLoading] = useState(false);
  const [isCustomWarranty, setIsCustomWarranty] = useState(false);

  const selectedColorOption = useMemo(() => {
    const currentColor = String(formData.color || '').trim();
    if (!currentColor) return null;
    return (
      (formattedColorList || []).find((opt) => String(opt.value) === currentColor) ||
      { value: currentColor, label: currentColor }
    );
  }, [formattedColorList, formData.color]);

  const warrantyOptions = warrantyTemplatesFromMaster.options.length > 0
    ? warrantyTemplatesFromMaster.options
    : (formattedWarrantyList || []);

  const selectedWarrantyOption = useMemo(() => {
    const currentValue = `${String(formData.warranty?.period ?? '')}:${String(formData.warranty?.periodUnit || '')}`;
    return warrantyOptions.find((opt) => String(opt.value) === currentValue) || null;
  }, [warrantyOptions, formData.warranty?.period, formData.warranty?.periodUnit]);
  const hasUnmatchedWarranty = Boolean(
    (formData.warranty?.period || formData.warranty?.periodUnit) &&
    !selectedWarrantyOption
  );
  const showCustomWarranty = isCustomWarranty || hasUnmatchedWarranty;

  const handleWarrantyTemplateChange = (option) => {
    const durationValue = option?.durationValue ?? option?.meta?.durationValue ?? String(option?.value || '').split(':')[0] ?? '';
    const durationUnit = option?.durationUnit ?? option?.meta?.durationUnit ?? String(option?.value || '').split(':')[1] ?? '';

    setIsCustomWarranty(false);
    handleChange({ target: { name: 'warranty.period', value: durationValue } });
    handleChange({ target: { name: 'warranty.periodUnit', value: durationUnit } });
  };

  const handleCustomWarrantyToggle = (event) => {
    const checked = event.target.checked;
    setIsCustomWarranty(checked);

    if (checked) {
      if (!formData.warranty?.periodUnit) {
        handleChange({ target: { name: 'warranty.periodUnit', value: 'months' } });
      }
      return;
    }

    if (!selectedWarrantyOption) {
      handleChange({ target: { name: 'warranty.period', value: '' } });
      handleChange({ target: { name: 'warranty.periodUnit', value: '' } });
    }
  };

  const handleInputCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleHsnInputChange = (e) => {
    const { name, value } = e.target;
    setIsHsnFormValue(prev => ({ ...prev, [name]: value }));
    setFormErrors({})
  }

  const handleFileUploadCategory = async (file, fieldName) => {
    if (!file) return;
    try {
      setIsLoading(true);
      const uploadedImageUrl = await uploadFile(file, 'THUMBNAILS');
      setCategoryForm(prev => ({ ...prev, [fieldName]: uploadedImageUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCategoryChange = (selectedOption, name) => {
    setCategoryForm(prev => ({ ...prev, [name]: selectedOption }));
  };
  const handleDashboardVisible = () => {
    setCategoryForm((prev) => ({
      ...prev,
      isDashboardVisible: !prev?.isDashboardVisible,
      priority: !prev?.isDashboardVisible ? prev.priority : 0
    }));
  };

  const createSelectOptions = useMemo(() => {
    const options = [{ label: "ROOT", value: "ROOT" }];
    if (!Array.isArray(allCategories) || !allCategories.length) return options;

    const hasNested = allCategories.some(
      (item) => Array.isArray(item?.subcategories) || Array.isArray(item?.subCategories),
    );
    if (hasNested) {
      const addOptions = (categories, prefix = '', depth = 1) => {
        if (!Array.isArray(categories)) return;
        categories.forEach((category) => {
          const categoryName = category.name || category.title || category.categoryKey;
          const label = prefix ? `${prefix} > ${categoryName}` : categoryName;
          options.push({ value: category.categoryKey || category._id, label });
          const children = category.subcategories || category.subCategories || [];
          if (depth < 2 && children.length) {
            addOptions(children, label, depth + 1);
          }
        });
      };
      addOptions(allCategories);
      return options;
    }

    const byParent = new Map();
    allCategories.forEach((category) => {
      const parent = category?.parentKey ? String(category.parentKey) : '__root__';
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(category);
    });

    const walk = (parent = '__root__', prefix = '', depth = 1) => {
      const children = byParent.get(parent) || [];
      children
        .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
        .forEach((category) => {
          const categoryName = category.name || category.title || category.categoryKey;
          const label = prefix ? `${prefix} > ${categoryName}` : categoryName;
          options.push({ value: category.categoryKey || category._id, label });
          if (depth < 2) {
            walk(String(category.categoryKey || category._id), label, depth + 1);
          }
        });
    };
    walk();
    return options;
  }, [allCategories]);

  const handleCategorySubmit = async () => {
    try {
      const type = categoryForm.parentCategory?.value !== "ROOT" ? "CHILD" : "ROOT";
      const reqData = {
        name: categoryForm.categoryName,
        bannerUrl: categoryForm.bannerUrl,
        iconUrl: categoryForm.iconUrl,
        type,
        isDisable: true,
        isDashboardVisible: categoryForm?.isDashboardVisible,
        priority: categoryForm?.priority
      };

      if (type === "CHILD") {
        reqData.parentKey = categoryForm.parentCategory.value;
        reqData.level = 1;
      }
      setIsLoading(true)
      const res = await dispatch(createCategory(reqData)).unwrap();
      toast.success(res.message || "Category created successfully");
      setIsCategoryModal(false);
      setCategoryForm(INITIAL_FORM_CATEGORY);
      fetchAllData([API_CALL_OBJECT["Category List"]])
    } catch (error) {
      toast.error(error?.message || "Failed to create category");
    } finally {
      setIsLoading(false)
    }
  };

  const handleHsnSubmit = async (e) => {
    e.preventDefault();
    const basePayload = {
      code: hsnFormValues.code.trim(),
      IGST: Number(hsnFormValues.IGST),
      CGST: Number(hsnFormValues.CGST),
      SGST: Number(hsnFormValues.SGST),
      additionalTax: Number(hsnFormValues.additionalTax),
      description: hsnFormValues.description?.trim() || '',
      active: true

    }
    try {
      await dispatch(createHsn(basePayload)).unwrap()
      toast.success('HSN Code created successfully')
      setIsHsnAddModal(false);
      setIsHsnFormValue(INITIAL_FORM_HSN);
      setFormErrors({});
      fetchAllData([API_CALL_OBJECT["Hsn code list"]])
    } catch (error) {
      toast.error(error?.message || 'Failed to save HSN Code')
    }

  }

  const validateCategoryForm = () => {
    const newErrors = {};
    if (!categoryForm.categoryName) newErrors.categoryName = "Category name is required";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateHsnForm = () => {
    const newErrors = {};
    const hasRate = (value) => value !== "" && value !== null && value !== undefined;

    if (!hsnFormValues.code) {
      newErrors.code = "Code is required";
    }
    if (!hasRate(hsnFormValues.IGST)) {
      newErrors.IGST = "IGST is required";
    } else if (Number(hsnFormValues.IGST) < 0 || Number(hsnFormValues.IGST) > 100) {
      newErrors.IGST = "IGST must be between 0 and 100";
    }
    if (!hasRate(hsnFormValues.CGST)) {
      newErrors.CGST = "CGST is required";
    } else if (Number(hsnFormValues.CGST) < 0 || Number(hsnFormValues.CGST) > 100) {
      newErrors.CGST = "CGST must be between 0 and 100";
    }
    if (!hasRate(hsnFormValues.SGST)) {
      newErrors.SGST = "SGST is required";
    } else if (Number(hsnFormValues.SGST) < 0 || Number(hsnFormValues.SGST) > 100) {
      newErrors.SGST = "SGST must be between 0 and 100";
    }
    if (!hsnFormValues.description) {
      newErrors.description = "Description is required";
    } else if (hsnFormValues.description.length < 3) {
      newErrors.description = "Description must be at least 3 characters";
    } else if (hsnFormValues.description.length > 100) {
      newErrors.description = "Description must be less than or equal to 100 characters";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const toTitleCase = (str) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    if (!value.trim()) return;
    const titled = toTitleCase(value);
    if (titled !== value) handleChange({ target: { name, value: titled } });
  };

  return (
    <>
      <Loader loading={isLoading} />
      <div className="bg-white">
        <div className="pb-4 mb-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Basic Details</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Customize the product basic details like name, brand, and categories
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid w-full grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
            {!SELLER_PANEL_ROLES.has(userData?.role) && (
              <div>
                <FilterSelect
                  label="Seller"
                  name="sellerId"
                  value={modifiedSellerList.find(opt => opt.value === formData.sellerId) || null}
                  onChange={(e) => handleSelectChange(e, 'SELLER_ID')}
                  options={modifiedSellerList || []}
                  error={errors?.sellerId}
                  placeholder="Select Seller"
                  required
                />
              </div>
            )}
            {!SELLER_PANEL_ROLES.has(userData?.role) && (
              <div>
                <FilterSelect
                  label="Legal Organization"
                  name="organizationId"
                  value={organizationList.find((opt) => String(opt.value) === String(formData.organizationId || '')) || null}
                  onChange={(e) => handleSelectChange(e, 'ORGANIZATION_ID')}
                  options={organizationList || []}
                  error={errors?.organizationId}
                  placeholder="Select Organization"
                  required
                />
              </div>
            )}
            <div className={`${userData?.roleId !== 9 ? "col-span-1" : "col-span-2"}`}>
              <Input
                labelName="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
                required={true}
                helpText="Name of the product as it will be displayed"
                error={errors?.name}
              />
            </div>
            <div>
              <FilterSelect
                label="Brand"
                name="brand"
                value={formattedBrandList.find((opt) => String(opt.value) === String(formData.brand || '')) || null}
                onChange={(e) => handleSelectChange(e, 'BRAND_ID')}
                options={formattedBrandList || []}
                placeholder="Select Brand"
                error={errors?.brand}
              />
            </div>

            <div>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FilterSelect
                    label="Category"
                    name="category_id"
                    value={selectedCategoryOption}
                    onChange={handleCategoryChange}
                    options={formattedCategoryList || []}
                    error={errors?.category_id}
                    placeholder="Select Category"
                    helperText="Attributes are controlled by the selected category schema."
                    required
                  />
                </div>
                <PermissionGuard module="categories" action="create" hide>
                  <button
                    type="button"
                    className="mt-6 flex-shrink-0 rounded-md border border-[var(--admin-blue)] px-3 py-2 text-xs font-semibold text-[var(--admin-blue)] hover:bg-[var(--admin-blue-soft)]"
                    onClick={() => setIsCategoryModal(true)}
                  >
                    + Add
                  </button>
                </PermissionGuard>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FilterSelect
                    label="HSN Code"
                    name="hsn_code"
                    value={selectedHsnOption}
                    onChange={(e) => { setHsnSuggestion(null); handleSelectChange(e, 'hsn_code'); }}
                    options={hsnCodeList || []}
                    error={errors?.hsn_code}
                    placeholder="Search by code or description…"
                  />
                </div>
                <PermissionGuard module="tax" action="create" hide>
                  <button
                    type="button"
                    className="mt-6 flex-shrink-0 rounded-md border border-[var(--admin-blue)] px-3 py-2 text-xs font-semibold text-[var(--admin-blue)] hover:bg-[var(--admin-blue-soft)]"
                    onClick={() => setIsHsnAddModal(true)}
                  >
                    + Add
                  </button>
                </PermissionGuard>
              </div>

              {/* Suggestion: auto-applied (new product) */}
              {hsnSuggestion?.type === 'applied' && (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="text-emerald-600 text-xs font-bold flex-shrink-0">✓</span>
                  <p className="text-xs text-emerald-700 flex-1 min-w-0">
                    HSN auto-filled: <strong>{hsnSuggestion.option.code}</strong>
                    {hsnSuggestion.option.description ? ` — ${hsnSuggestion.option.description}` : ''}
                  </p>
                  <button type="button" onClick={() => setHsnSuggestion(null)}
                    className="text-emerald-400 hover:text-emerald-700 text-base leading-none flex-shrink-0">×</button>
                </div>
              )}

              {/* Suggestion: category changed on edit, existing HSN kept */}
              {hsnSuggestion?.type === 'suggest' && (
                <div className="mt-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 text-xs mt-0.5 flex-shrink-0">ℹ</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-800">HSN suggestion for this category</p>
                      <p className="text-xs text-blue-700 mt-0.5 truncate">
                        {hsnSuggestion.option.code}
                        {hsnSuggestion.option.description ? ` — ${hsnSuggestion.option.description}` : ''}
                        {` (${hsnSuggestion.option.gstRate}% GST)`}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                      <button type="button"
                        onClick={() => { handleSelectChange(hsnSuggestion.option, 'hsn_code'); setHsnSuggestion(null); }}
                        className="rounded-md bg-[var(--admin-blue)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity">
                        Apply
                      </button>
                      <button type="button"
                        onClick={() => setHsnSuggestion(null)}
                        className="rounded-md border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                        Keep current
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No HSN mapping for selected category */}
              {hsnSuggestion?.type === 'none' && (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <span className="text-amber-500 text-xs flex-shrink-0">⚠</span>
                  <p className="text-xs text-amber-700 flex-1">No HSN mapping found for this category. Please select manually.</p>
                  <button type="button" onClick={() => setHsnSuggestion(null)}
                    className="text-amber-400 hover:text-amber-700 text-base leading-none flex-shrink-0">×</button>
                </div>
              )}
            </div>


            <Input
              labelName="SKU"
              name="sku"
              type="text"
              value={formData.sku}
              onChange={handleChange}
              placeholder="Enter SKU"
              error={errors?.sku}
              textareaClasses='text-sm'
            />
            <FilterSelect
              label="Color"
              value={selectedColorOption}
              onChange={(e) => handleSelectChange(e, 'PRODUCT_COLOR')}
              options={formattedColorList || []}
              placeholder="Select color"
              error={errors?.color}
            />
            <FilterSelect
              label="Product Family Code"
              value={(formattedProductFamilyList || []).find((opt) => String(opt.value) === String(formData.productFamilyCode || '')) || null}
              onChange={(e) => handleSelectChange(e, 'PRODUCT_FAMILY')}
              options={formattedProductFamilyList || []}
              placeholder="Select family code"
              error={errors?.productFamilyCode}
            />
            <Input
              labelName="Price (GST included)"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              required
              placeholder="Enter selling price"
              error={errors?.price}
              textareaClasses='text-sm'
            />
            <Input
              labelName="MRP (GST included)"
              name="mrp"
              type="number"
              value={formData.mrp}
              onChange={handleChange}
              required
              placeholder="Enter MRP"
              error={errors?.mrp}
              textareaClasses='text-sm'
            />
            <Input
              labelName="Stock"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleChange}
              required
              placeholder="Enter stock"
              error={errors?.stock}
              textareaClasses='text-sm'
            />
           
            {!showCustomWarranty && (
              <div className="space-y-1">
                <FilterSelect
                  label="Warranty Template"
                  value={selectedWarrantyOption}
                  onChange={handleWarrantyTemplateChange}
                  options={warrantyOptions}
                  placeholder={
                    warrantyTemplatesFromMaster.loading
                      ? 'Loading warranty templates…'
                      : warrantyOptions.length === 0
                        ? 'No warranty templates available'
                        : 'Select warranty template'
                  }
                  isLoading={warrantyTemplatesFromMaster.loading}
                  isClearable
                  isDisabled={warrantyTemplatesFromMaster.loading}
                />
                {!warrantyTemplatesFromMaster.loading && warrantyOptions.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No warranty templates available. Add warranty options in Option Master.
                  </p>
                )}
              </div>
            )}
            <Input
              labelName="Custom warranty"
              name="customWarranty"
              type="switch"
              value={showCustomWarranty}
              onChange={handleCustomWarrantyToggle}
            />
            {showCustomWarranty && (
              <>
                <Input
                  labelName="Warranty Period"
                  name="warranty.period"
                  type="number"
                  value={formData.warranty?.period ?? ""}
                  onChange={handleChange}
                  placeholder="Example: 12"
                  min={0}
                />
                <FilterSelect
                  label="Warranty Unit"
                  value={warrantyUnits.options.find(opt => opt.value === formData.warranty?.periodUnit) || null}
                  onChange={(e) => handleChange({ target: { name: 'warranty.periodUnit', value: e?.value || '' } })}
                  options={warrantyUnits.options}
                  placeholder="Select unit"
                  isLoading={warrantyUnits.loading}
                />
              </>
            )}
            <Input
              labelName="Warranty Provider"
              name="warranty.provider"
              type="text"
              value={formData.warranty?.provider || ""}
              onChange={handleChange}
              placeholder="Enter provider name"
            />
            <Input
              labelName="Return Window Days"
              name="warrantyReturnDays"
              type="number"
              value={formData.warrantyReturnDays || ""}
              onChange={handleChange}
              placeholder="Example: 7"
            />
          </div>

          <FormInput
            label="Description"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={handleChange}
            required={true}
            placeholder="Enter detailed product description (50-500 characters)"
            error={errors?.description}
            textareaClasses="text-sm"
          />
        </div>
      </div>
 

      <AddCategoryModal
        isOpen={isCategoryModal}
        formData={categoryForm}
        handleFileUpload={handleFileUploadCategory}
        handleChange={handleInputCategoryChange}
        parentCategories={createSelectOptions}
        handleCloseModal={() => { setIsCategoryModal(false); setCategoryForm(INITIAL_FORM_CATEGORY) }}
        handleSubmit={() => validateCategoryForm() && handleCategorySubmit()}
        handleSelectChange={handleSelectCategoryChange}
        handleDashboardVisible={handleDashboardVisible}
      />

      <AddHsnModal isOpen={isHsnAddModal} formData={hsnFormValues}
        resetForm={() => { setIsHsnAddModal(false); setIsHsnFormValue(INITIAL_FORM_HSN); setFormErrors({}) }}
        handleInputChange={handleHsnInputChange} handleSubmit={(e) => validateHsnForm() && handleHsnSubmit(e)}
        errors={formErrors} />
    </>
  );
}
