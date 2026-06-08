import 'react-quill/dist/quill.snow.css';
import { useMemo, useState } from 'react';
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
import { getAllCityList } from '../../../../Redux/citySlice';
import { getAllStateList } from '../../../../Redux/stateSlice';
import { create } from '../../../../Redux/StoreSlice';
import { createCategory, createHsn } from '../../../../Redux/productSlice';

import { transformArray, uploadFile } from '../../../../_helpers/globalFunctions';
import AddHsnModal from './Modals/AddHsnModal';
// import { TextEditor } from '../../../../components/Atoms/FormInput/TextEditor';

const INITIAL_FORM_STATE = {
  name: "",
  contact_person: "",
  address: "",
  country_code: "",
  state_code: "",
  city_code: "",
  zip_code: "",
  phone: "",
  mobile: "",
  email: "",
  open_time: "",
  close_time: "",
  location: {
    type: 'Point',
    coordinates: ['', ''],
  },
  gstNumber: '',
  panNumber: '',
  businessLicense: '',
};

const INITIAL_FORM_CATEGORY = {
  categoryName: '',
  seoUrl: '',
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

const getListPayload = (sliceData) => {
  const data = sliceData?.data?.data || sliceData?.normalized?.data || sliceData?.data || {};
  if (Array.isArray(data)) return data;
  return data.list || data.items || [];
};

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
  allCategories, API_CALL_OBJECT, hsnCodeList, countryList = [], sellerList = [], userData
}) {
  const dispatch = useDispatch();
  const selector = useSelector(state => state);
  const warrantyUnits = useDropdownOptions('warranty-units');

 
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




  const [isAddStoreModal, setIsAddStoreModal] = useState(false);
  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [isHsnAddModal, setIsHsnAddModal] = useState(false)

  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [categoryForm, setCategoryForm] = useState(INITIAL_FORM_CATEGORY);
  const [hsnFormValues, setIsHsnFormValue] = useState(INITIAL_FORM_HSN)

  const [isLoading, setIsLoading] = useState(false);

  const selectedColorOption = useMemo(() => {
    const currentColor = String(formData.color || '').trim();
    if (!currentColor) return null;
    return (
      (formattedColorList || []).find((opt) => String(opt.value) === currentColor) ||
      { value: currentColor, label: currentColor }
    );
  }, [formattedColorList, formData.color]);

  const convertTimeToMilliseconds = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return (hours * 60 + minutes) * 60 * 1000;
  };

  const handleInputChange = (e, coordIndex = null) => {
    const { name, value } = e.target;
    setFormValues(prev => {
      if (name === "coordinates") {
        const updatedCoords = [...(prev.location?.coordinates || ['', ''])];
        updatedCoords[coordIndex] = value;

        return {
          ...prev,
          location: {
            ...prev.location,
            coordinates: updatedCoords
          }
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
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

  const handleAction = (action) => {
    const actionMap = {
      'Store': () => setIsAddStoreModal(true),
      'Category': () => setIsCategoryModal(true),
      'Hsn': () => setIsHsnAddModal(true),

    };

    if (actionMap[action]) {
      actionMap[action]();
    }
  };

  const handleAddStore = async () => {
    try {
      const payloadWithTime = {
        ...formValues,
        open_time: convertTimeToMilliseconds(formValues.open_time),
        close_time: convertTimeToMilliseconds(formValues.close_time),
      };

      await dispatch(create(payloadWithTime)).unwrap();
      fetchAllData();
      setIsAddStoreModal(false);
      setFormValues(INITIAL_FORM_STATE);
      toast.success('Store added successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to add store');
    }
  };

  const handleSelectAddChange = (selectedOption, action) => {
    switch (action) {
      case 'COUNTRY':
        setFormValues(prev => ({
          ...prev,
          country_code: selectedOption?.value || "",
          state_code: "",
          city_code: "",
          zip_code: ""
        }));
        if (selectedOption?.value) {
          dispatch(getAllStateList({ query: JSON.stringify({ country_code: selectedOption.value }) }));
        }
        break;

      case 'STATE':
        setFormValues(prev => ({
          ...prev,
          state_code: selectedOption?.value || "",
          city_code: "",
          zip_code: ""
        }));
        if (selectedOption?.value) {
          dispatch(getAllCityList({ query: JSON.stringify({ state_code: selectedOption.value }) }));
        }
        break;

      case 'CITY':
        setFormValues(prev => ({
          ...prev,
          city_code: selectedOption?.value || "",
          zip_code: ""
        }));
        break;

      case 'ZIP_CODE':
        setFormValues(prev => ({
          ...prev,
          zip_code: selectedOption?.value || ""
        }));
        break;
      case 'user_id':
        setFormValues(prev => ({
          ...prev, user_id: selectedOption?.value
        }));
        break;

      default:
        break;
    }

    const fieldMap = {
      'COUNTRY': 'country_code',
      'STATE': 'state_code',
      'CITY': 'city_code',
      'ZIP_CODE': 'zip_code'
    };

    const fieldName = fieldMap[action];
    if (fieldName && formErrors[fieldName]) {
      setFormErrors(prev => ({
        ...prev,
        [fieldName]: ""
      }));
    }
  };

  const handleProductOriginSelect = (selectedOption, action) => {
    handleSelectChange(selectedOption, action);
    if (action === 'PRODUCT_COUNTRY' && selectedOption?.value) {
      dispatch(getAllStateList({ countryId: selectedOption.value }));
    }
    if (action === 'PRODUCT_STATE' && selectedOption?.value) {
      dispatch(getAllCityList({ stateId: selectedOption.value }));
    }
  };

  const handleFileUploadCategory = async (file) => {
    if (!file) return;
    try {
      setIsLoading(true);
      const uploadedImageUrl = await uploadFile(file, 'THUMBNAILS');
      setCategoryForm(prev => ({ ...prev, seoUrl: uploadedImageUrl }));
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
        thumbnails: categoryForm.seoUrl,
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

  const validateStoreForm = () => {
    const newErrors = {};
    if (!formValues.name) newErrors.name = "Store name is required";
    if (!formValues.contact_person) newErrors.contact_person = "Contact person is required";
    if (!formValues.address) newErrors.address = "Address is required";
    if (!formValues.country_code) newErrors.country_code = "Country is required";
    if (!formValues.phone && !formValues.mobile) newErrors.contact = "At least one contact method is required";
    if (!formValues.email) newErrors.email = "Email is required";
    if (!formValues.open_time) newErrors.open_time = "Opening time is required";
    if (!formValues.close_time) newErrors.close_time = "Closing time is required";

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCategoryForm = () => {
    const newErrors = {};
    if (!categoryForm.categoryName) newErrors.categoryName = "Category name is required";
    return Object.keys(newErrors).length === 0;
  };

  const validateHsnForm = () => {
    const newErrors = {};

    if (!hsnFormValues.code) {
      newErrors.code = "Code is required";
    }
    if (!hsnFormValues.IGST) {
      newErrors.IGST = "IGST is required";
    } else if (Number(hsnFormValues.IGST) > 100) {
      newErrors.IGST = "IGST cannot be greater than 100";
    }
    if (!hsnFormValues.CGST) {
      newErrors.CGST = "CGST is required";
    } else if (Number(hsnFormValues.CGST) > 100) {
      newErrors.CGST = "CGST cannot be greater than 100";
    }
    if (!hsnFormValues.SGST) {
      newErrors.SGST = "SGST is required";
    } else if (Number(hsnFormValues.SGST) > 100) {
      newErrors.SGST = "SGST cannot be greater than 100";
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


  return (
    <>
      <Loader loading={isLoading} />
      <div className="bg-white border-b">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Details</h3>
          <p className="text-sm text-gray-500">
            Customize the product basic details like name, brand, and categories
          </p>
        </div>

        <div className="p-2 space-y-6 ">
          {/* <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-900">Setup help</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => navigate('/app/categories')}>Categories</button>
              <button type="button" className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => navigate('/app/category-attributes')}>Category Attributes</button>
              <button type="button" className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => navigate('/app/product-families')}>Product Families</button>
              <PermissionGuard module="tax" action="view" hide>
                <button type="button" className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => navigate('/app/hsn-code')}>HSN Codes</button>
              </PermissionGuard>
              <button type="button" className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => navigate('/app/product-flow')}>Open Full Product Flow</button>
            </div>
          </div> */}
          <div className="grid w-auto grid-cols-1 gap-4 md:grid-cols-2">
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
            <div className={`${userData?.roleId !== 9 ? "col-span-1" : "col-span-2"}`}>
              <Input
                labelName="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
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
              <div className='flex justify-between items-center'>
                <label>Category</label>
                {/* <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("Category")}
                >
                  Add Category
                </button> */}
              </div>
              <FilterSelect
                name="category_id"
                value={selectedCategoryOption}
                onChange={(e) => handleSelectChange(e, 'CATEGORY_ID')}
                options={formattedCategoryList || []}
                error={errors?.category_id}
                placeholder="Category"
              />
              <p className="mt-1 text-xs text-gray-500">Attributes are controlled by the selected category schema.</p>
            </div>

            
            <div>
              <div className='flex justify-between items-center'>
                <label>Hsn Code</label>
                <PermissionGuard module="tax" action="create" hide>
                  {/* <button
                    type="button"
                    className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                    onClick={() => handleAction("Hsn")}
                  >
                    Add Hsn
                  </button> */}
                </PermissionGuard>
              </div>
              <FilterSelect
                name="hsn_code"
                value={selectedHsnOption}
                onChange={(e) => handleSelectChange(e, 'hsn_code')}
                options={hsnCodeList || []}
                error={errors?.hsn_code}
                placeholder="Hsn"
              />

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
           
            <Input
              labelName="Warranty Period"
              name="warranty.period"
              type="number"
              value={formData.warranty?.period || ""}
              onChange={handleChange}
              placeholder="Example: 12"
            />
            <FilterSelect
              label="Warranty Template"
              value={(formattedWarrantyList || []).find((opt) => String(opt.value) === String(formData.warranty?.period || '')) || null}
              onChange={(e) => handleChange({ target: { name: 'warranty.period', value: e?.value || '' } })}
              options={formattedWarrantyList || []}
              placeholder="Select warranty template"
            />
            <FilterSelect
              label="Warranty Unit"
              value={warrantyUnits.options.find(opt => opt.value === formData.warranty?.periodUnit) || null}
              onChange={(e) => handleChange({ target: { name: 'warranty.periodUnit', value: e?.value || '' } })}
              options={warrantyUnits.options}
              placeholder="Select unit"
              isLoading={warrantyUnits.loading}
            />
            <Input
              labelName="Warranty Provider"
              name="warranty.provider"
              type="text"
              value={formData.warranty?.provider || ""}
              onChange={handleChange}
              placeholder="Provider"
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
            textareaClasses='text-sm'
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
