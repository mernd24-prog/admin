import 'react-quill/dist/quill.snow.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';

// Components
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';
import Loader from '../../../../components/Loader/Loader';
import useDropdownOptions from '../../../../hooks/useDropdownOptions';
import PermissionGuard from '../../../../components/Atoms/PermissionGuard/PermissionGuard';

// Modals
import AddCategoryModal from './Modals/AddCategoryModal';

// Redux Actions
import { createBrand, createCategory, createHsn, getMyBrandSubmissions, resubmitBrandForApproval, submitBrandForApproval } from '../../../../Redux/productSlice';

import { transformArray, uploadFile } from '../../../../_helpers/globalFunctions';
import AddHsnModal from './Modals/AddHsnModal';
import { extractRole, getStoredRole, getStoredUser, normalizeRole } from '../../../../_helpers/authStorage';
import { isSellerPanel } from '../../../../_helpers/panelConfig';
import { TextEditor } from '../../../../components/Atoms/FormInput/TextEditor';

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

const getErrorMessage = (error, fallback) =>
  typeof error === 'string'
    ? error
    : error?.message || error?.error?.message || error?.data?.message || error?.response?.data?.message || fallback;

const getSessionUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.sessionStorage.getItem('EcomAdmin') || 'null');
  } catch {
    return null;
  }
};

export default function BasicDetailsTab({
  formData,
  handleChange,
  handleNestedChange,
  formattedBrandList,
  formattedWarrantyList,
  formattedProductFamilyList,
  formattedCategoryList,
  handleSelectChange,
  errors,
  fetchAllData,
  allCategories, API_CALL_OBJECT, hsnCodeList, sellerList = [], organizationList = [], userData,
  hasVariantPricing = false,
  handleInputReactQuillChange,
}) {
  const dispatch = useDispatch();
  const selector = useSelector(state => state);
  const warrantyUnits = useDropdownOptions('warranty-units');
  const warrantyTemplatesFromMaster = useDropdownOptions('warranty-templates');
  const userRole = normalizeRole(extractRole(
    userData,
    userData?.user,
    userData?.data,
    getSessionUser(),
    getSessionUser()?.user,
    getStoredUser(),
    { role: getStoredRole() },
  ));
  const isSellerPanelUser = isSellerPanel() || SELLER_PANEL_ROLES.has(userRole);

 
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

  // ── HSN suggestion ──────────────────────────────────────────────────────

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

  // When category changes (user-triggered), compute HSN suggestion.
  // Platform/admin owns HSN assignment; product form never auto-applies it.
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

    setHsnSuggestion({ type: 'suggest', option: match });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.category_id, formData?.categoryId, formData?.category, formData?.category_key]);

  // ───────────────────────────────────────────────────────────────────────

  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [isHsnAddModal, setIsHsnAddModal] = useState(false)
  const [isBrandModal, setIsBrandModal] = useState(false);
  const [brandSubmission, setBrandSubmission] = useState({ name: '', logo: '', thumbnails: '', description: '' });
  const [myBrandSubmissions, setMyBrandSubmissions] = useState([]);
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  const [formErrors, setFormErrors] = useState({});
  const [categoryForm, setCategoryForm] = useState(INITIAL_FORM_CATEGORY);
  const [hsnFormValues, setIsHsnFormValue] = useState(INITIAL_FORM_HSN)

  const [isLoading, setIsLoading] = useState(false);
  const [isCustomWarranty, setIsCustomWarranty] = useState(false);

  const loadMyBrandSubmissions = useCallback(async () => {
    if (!isSellerPanelUser) return;
    try {
      const response = await dispatch(getMyBrandSubmissions()).unwrap();
      const data = response?.data;
      setMyBrandSubmissions(Array.isArray(data) ? data : (data?.list || data?.items || []));
    } catch {
      // Requests are optional to editing a product, so they must not block it.
    }
  }, [dispatch, isSellerPanelUser]);

  useEffect(() => { loadMyBrandSubmissions(); }, [loadMyBrandSubmissions]);

  useEffect(() => {
    if (!isSellerPanelUser || !fetchAllData) return undefined;
    const interval = window.setInterval(() => fetchAllData(), 30000);
    return () => window.clearInterval(interval);
  }, [fetchAllData, isSellerPanelUser]);

  const handleBrandLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    const extension = file.name?.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      toast.error('Only JPG, PNG, or WEBP images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Brand logo must be 5MB or less');
      return;
    }

    setBrandLogoUploading(true);
    try {
      const logoUrl = await uploadFile(file, 'BRANDS');
      setBrandSubmission((current) => ({ ...current, logo: logoUrl }));
      toast.success('Brand logo uploaded');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload brand logo'));
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const submitBrandRequest = async (event) => {
    event.preventDefault();
    if (!brandSubmission.name.trim()) return toast.error('Brand name is required');
    if (brandLogoUploading) return toast.error('Please wait for logo upload to finish');
    setBrandSubmitting(true);
    try {
      if (isSellerPanelUser) {
        await dispatch(brandSubmission._id
          ? resubmitBrandForApproval({ ...brandSubmission, _id: brandSubmission._id })
          : submitBrandForApproval(brandSubmission)).unwrap();
        const brandName = brandSubmission.name.trim();
        setMyBrandSubmissions((current) => [
          { ...brandSubmission, name: brandName, approvalStatus: 'pending' },
          ...current.filter((brand) => String(brand._id || '') !== String(brandSubmission._id || '')),
        ]);
        handleSelectChange({ value: brandName, label: brandName }, 'BRAND_ID');
        toast.success(brandSubmission._id ? 'Brand resubmitted for approval' : 'Brand submitted for approval');
      } else {
        await dispatch(createBrand({ ...brandSubmission, active: true })).unwrap();
        handleSelectChange({ value: brandSubmission.name.trim(), label: brandSubmission.name.trim() }, 'BRAND_ID');
        toast.success('Brand created and selected');
      }
      setBrandSubmission({ name: '', logo: '', thumbnails: '', description: '' });
      setIsBrandModal(false);
      loadMyBrandSubmissions();
      fetchAllData?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit brand'));
    } finally {
      setBrandSubmitting(false);
    }
  };

  const brandOptions = useMemo(() => {
    const approvedNames = new Set((formattedBrandList || []).map((brand) => String(brand.value || '').toLowerCase()));
    const ownPendingBrands = isSellerPanelUser
      ? myBrandSubmissions
        .filter((brand) => brand.approvalStatus === 'pending' && !approvedNames.has(String(brand.name || '').toLowerCase()))
        .map((brand) => ({
          value: brand.name,
          label: `${brand.name} (Pending approval)`,
          brandName: brand.name,
          isPendingBrand: true,
        }))
      : [];

    return [
      { value: '__add_new_brand__', label: '+ Add New Brand', isAddBrand: true },
      ...ownPendingBrands,
      ...(formattedBrandList || []),
    ];
  }, [formattedBrandList, isSellerPanelUser, myBrandSubmissions]);

  const handleBrandSelect = (option) => {
    if (option?.isAddBrand) {
      setBrandSubmission({ name: '', logo: '', thumbnails: '', description: '' });
      setIsBrandModal(true);
      return;
    }
    handleSelectChange(
      option?.brandName ? { ...option, label: option.brandName } : option,
      'BRAND_ID',
    );
  };

  const warrantyOptions = useMemo(() => (
    warrantyTemplatesFromMaster.options.length > 0
      ? warrantyTemplatesFromMaster.options
      : (formattedWarrantyList || [])
  ), [formattedWarrantyList, warrantyTemplatesFromMaster.options]);

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
            {!isSellerPanelUser && (
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
            {!isSellerPanelUser && (
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
            <div className={`${userRole !== 'seller-sub-admin' ? "col-span-1" : "col-span-2"}`}>
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
                value={brandOptions.find((opt) => String(opt.value) === String(formData.brand || '')) || null}
                onChange={handleBrandSelect}
                options={brandOptions}
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

              {/* Suggestion: category changed, HSN kept until explicitly applied */}
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
                        Dismiss
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


            {/* <Input
              labelName="SKU"
              name="sku"
              type="text"
              value={formData.sku}
              onChange={handleChange}
              placeholder="Enter SKU"
              error={errors?.sku}
              textareaClasses='text-sm'
            /> */}
            <FilterSelect
              label="Product Family Code"
              value={(formattedProductFamilyList || []).find((opt) => String(opt.value) === String(formData.productFamilyCode || '')) || null}
              onChange={(e) => handleSelectChange(e, 'PRODUCT_FAMILY')}
              options={formattedProductFamilyList || []}
              placeholder="Select family code"
              error={errors?.productFamilyCode}
            />
            {/* {!hasVariantPricing && (
              <>
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
                  labelName="Special Price (optional)"
                  name="salePrice"
                  type="number"
                  value={formData.salePrice}
                  onChange={handleChange}
                  placeholder="Enter special price"
                  error={errors?.salePrice}
                  textareaClasses='text-sm'
                />
              </>
            )} */}
           
            {/* {!showCustomWarranty && (
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
            )} */}
            {/* <Input
              labelName="Custom warranty"
              name="customWarranty"
              type="switch"
              value={showCustomWarranty}
              onChange={handleCustomWarrantyToggle}
            /> */}
            {/* {showCustomWarranty && (
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
            )} */}
            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Product Return Policy</h4>
                <p className="mt-1 text-xs text-gray-500">This policy is snapshotted on each order item and cannot be changed for existing orders.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  labelName="Returnable"
                  name="warranty.returnPolicy.returnable"
                  type="switch"
                  value={formData.warranty?.returnPolicy?.returnable ?? formData.warranty?.returnPolicy?.eligible ?? true}
                  onChange={(event) => handleNestedChange('warranty.returnPolicy.returnable', event.target.checked)}
                />
                <Input
                  labelName="Return Window Days"
                  name="warranty.returnPolicy.returnWindowDays"
                  type="number"
                  min={0}
                  max={365}
                  disabled={(formData.warranty?.returnPolicy?.returnable ?? formData.warranty?.returnPolicy?.eligible ?? true) === false}
                  value={(formData.warranty?.returnPolicy?.returnable ?? formData.warranty?.returnPolicy?.eligible ?? true) === false ? 0 : (formData.warranty?.returnPolicy?.returnWindowDays ?? formData.warranty?.returnPolicy?.days ?? 7)}
                  onChange={(event) => handleNestedChange('warranty.returnPolicy.returnWindowDays', event.target.value)}
                  helperText="Starts from the item delivery timestamp."
                />
                <Input
                  labelName="Allowed Resolution"
                  name="warranty.returnPolicy.resolution"
                  type="select"
                  value={formData.warranty?.returnPolicy?.resolution || 'refund_or_replacement'}
                  onChange={(option) => handleNestedChange('warranty.returnPolicy.resolution', option?.value || 'refund_or_replacement')}
                  options={[
                    { value: 'refund_or_replacement', label: 'Refund or replacement' },
                    { value: 'refund', label: 'Refund only' },
                    { value: 'replacement', label: 'Replacement only' },
                  ]}
                />
                <Input
                  labelName="Return Shipping Paid By"
                  name="warranty.returnPolicy.shippingPaidBy"
                  type="select"
                  value={formData.warranty?.returnPolicy?.shippingPaidBy || 'platform'}
                  onChange={(option) => handleNestedChange('warranty.returnPolicy.shippingPaidBy', option?.value || 'platform')}
                  options={[
                    { value: 'platform', label: 'Platform' },
                    { value: 'seller', label: 'Seller' },
                    { value: 'customer', label: 'Customer' },
                  ]}
                />
                <Input
                  labelName="Require Return Images"
                  name="warranty.returnPolicy.requiresImages"
                  type="switch"
                  value={Boolean(formData.warranty?.returnPolicy?.requiresImages)}
                  onChange={(event) => handleNestedChange('warranty.returnPolicy.requiresImages', event.target.checked)}
                />
                <Input
                  labelName="Require Inspection / QC"
                  name="warranty.returnPolicy.inspectionRequired"
                  type="switch"
                  value={formData.warranty?.returnPolicy?.inspectionRequired !== false}
                  onChange={(event) => handleNestedChange('warranty.returnPolicy.inspectionRequired', event.target.checked)}
                />
              </div>
            </div>
          </div>

          <TextEditor
            label="Description"
            value={formData.description || ''}
            onChange={(content) => handleInputReactQuillChange?.('description', content)}
            required={true}
            placeholder="Enter detailed product description"
            error={errors?.description}
            height="220px"
             className="[&_.ql-container]:h-[220px] [&_.ql-editor]:min-h-[180px]"
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

      {isBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submitBrandRequest} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-[var(--admin-navy)]">
              {brandSubmission._id ? 'Resubmit Brand' : 'Add New Brand'}
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              {isSellerPanelUser
                ? 'New brands require admin approval before they can be used on products.'
                : 'This brand will be created as active and selected for this product.'}
            </p>
            <input
              value={brandSubmission.name}
              onChange={(event) => setBrandSubmission((current) => ({ ...current, name: event.target.value }))}
              placeholder="Brand name"
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              maxLength={200}
              required
            />
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Brand logo (optional)</label>
              <div className="flex items-center gap-3 rounded-lg border border-gray-300 px-3 py-2">
                {brandSubmission.logo ? (
                  <img src={brandSubmission.logo} alt="Brand logo preview" className="h-10 w-10 rounded-md border border-gray-200 object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400">
                    Logo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleBrandLogoUpload}
                    disabled={brandLogoUploading || brandSubmitting}
                    className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-navy)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:opacity-60"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    {brandLogoUploading ? 'Uploading logo...' : 'JPG, PNG, or WEBP up to 5MB'}
                  </p>
                </div>
              </div>
            </div>
            <textarea
              value={brandSubmission.description}
              onChange={(event) => setBrandSubmission((current) => ({ ...current, description: event.target.value }))}
              placeholder="Brand details (optional)"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setIsBrandModal(false)}>Cancel</button>
              <button type="submit" disabled={brandSubmitting || brandLogoUploading} className="rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">
                {brandSubmitting ? 'Saving…' : brandLogoUploading ? 'Uploading…' : brandSubmission._id ? 'Resubmit' : isSellerPanelUser ? 'Submit for Approval' : 'Create Brand'}
              </button>
            </div>
            {myBrandSubmissions.filter((brand) => brand.approvalStatus === 'rejected').length > 0 && (
              <div className="mt-5 border-t pt-4">
                <p className="mb-2 text-xs font-semibold text-gray-600">Rejected submissions</p>
                {myBrandSubmissions.filter((brand) => brand.approvalStatus === 'rejected').map((brand) => (
                  <button
                    key={brand._id}
                    type="button"
                    className="mb-2 w-full rounded-md bg-red-50 p-2 text-left text-xs text-red-700"
                    onClick={() => setBrandSubmission({ _id: brand._id, name: brand.name || '', logo: brand.logo || '', thumbnails: brand.thumbnails || '', description: brand.description || '' })}
                  >
                    <span className="font-semibold">{brand.name}</span>: {brand.rejectionReason || 'Needs changes'}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
