import 'react-quill/dist/quill.snow.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';

// Components
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';
import Loader from '../../../../components/Loader/Loader';
import DefaultModal from '../../../../components/Atoms/Modal/DefaultRightSideModal';

// Modals
import AddStoreModal from './Modals/AddStoreModal';
import AddBrandModal from './Modals/AddBrandModal';
import AddCategoryModal from './Modals/AddCategoryModal';
// import AddBatchModal from './Modals/AddBatchModal';
import AddQtyHead from './Modals/AddQtyHead';

// Redux Actions
import { getAllCityList } from '../../../../Redux/citySlice';
import { getAllStateList } from '../../../../Redux/stateSlice';
import { getAllZipCodeList } from '../../../../Redux/zipCodeSlice';
import { create, getAllSellerList } from '../../../../Redux/StoreSlice';
import { createBatch, createBrand, createCategory, createHsn, createWarranty } from '../../../../Redux/productSlice';
import { createQtyHead } from '../../../../Redux/badgeSlice';

import { transformArray, uploadFile } from '../../../../_helpers/globalFunctions';
import AddHsnModal from './Modals/AddHsnModal';
import AddBatchModal from './Modals/AddBatchModal';
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

const INITIAL_FORM_VALUES = {
  name: "",
  thumbnails: "",
  logo: "",
  isDisable: true,
};

const INITIAL_FORM_CATEGORY = {
  categoryName: '',
  seoUrl: '',
  parentCategory: null,
  isPublish: true,
  isDashboardVisible: false, priority: "0"
};

const INITIAL_FORM_BATCH = {
  batchCode: '',
  manufactureDate: '',
  expire_date: '',
  isDisable: true
};

const INITIAL_FORM_QTY = {
  name: "",
  isDisable: true,
  value: "",
  description: "",
  example: "",
};

const INITIAL_FORM_WARRANTY = {
  period: ""
};

const INITIAL_FORM_HSN = {
  code: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "",
  description: "",
  isDisable: true
}

export default function BasicDetailsTab({
  formData,
  handleChange,
  formattedBrandList,
  formattedCategoryList,
  storeList,
  handleSelectChange,
  batchData,
  errors,
  formattedQtyHeadList,
  formattedWarrantyList,
  fetchAllData,
  allCategories, API_CALL_OBJECT, hsnCodeList, handleInputReactQuillChange, userData
}) {
  const dispatch = useDispatch();
  const selector = useSelector(state => state);

  const modifiedCountry = transformArray(selector?.country?.getAllCountryListData?.data?.data?.list || []);
  const modifiedState = transformArray(selector?.state?.getAllStateListData?.data?.data?.list || []);
  const modifiedCity = transformArray(selector?.city?.getAllCityListData?.data?.data?.list || []);
  const modifiedZipCode = transformArray(selector?.zipCode?.getAllZipCodeListData?.data?.data?.list || []);
  const modifiedSellerList = transformArray(selector?.store?.getAllSellerListData?.data?.data?.list || [])




  const [isAddStoreModal, setIsAddStoreModal] = useState(false);
  const [isBrandAddModal, setIsBrandAddModal] = useState(false);
  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [isBatchAddModal, setIsBatchAddModal] = useState(false);
  const [isQtyModal, setIsQtyModal] = useState(false);
  const [isWarrantyAddModal, setIsWarrantyAddModal] = useState(false);
  const [isHsnAddModal, setIsHsnAddModal] = useState(false)

  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [brandFormValues, setBrandFormValues] = useState(INITIAL_FORM_VALUES);
  const [categoryForm, setCategoryForm] = useState(INITIAL_FORM_CATEGORY);
  const [batchFormValues, setBatchFormValues] = useState(INITIAL_FORM_BATCH);
  const [qtyFormValues, setQtyFormValues] = useState(INITIAL_FORM_QTY);
  const [warrantyFormData, setWarrantyFormData] = useState(INITIAL_FORM_WARRANTY);
  const [hsnFormValues, setIsHsnFormValue] = useState(INITIAL_FORM_HSN)

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    dispatch(getAllSellerList())
  }, [dispatch])


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


  const handleBrandInputChange = (e) => {
    const { name, value } = e.target;
    setBrandFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleInputCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBatchInputChange = (e) => {
    const { name, value } = e.target;
    setBatchFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleQtyInputChange = (e) => {
    const { name, value } = e.target;
    setQtyFormValues(prev => ({ ...prev, [name]: value }));
    setFormErrors({})
  };

  const handleWarrantyInputChange = (e) => {
    const { name, value } = e.target;
    setWarrantyFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors({})
  };

  const handleHsnInputChange = (e) => {
    const { name, value } = e.target;
    setIsHsnFormValue(prev => ({ ...prev, [name]: value }));
    setFormErrors({})
  }

  const handleAction = (action) => {
    const actionMap = {
      'Store': () => setIsAddStoreModal(true),
      'BRAND': () => setIsBrandAddModal(true),
      'Category': () => setIsCategoryModal(true),
      'Batch': () => setIsBatchAddModal(true),
      'QTY': () => setIsQtyModal(true),
      'Warranty': () => setIsWarrantyAddModal(true),
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
        if (selectedOption?.value) {
          dispatch(getAllZipCodeList({ query: JSON.stringify({ city_code: selectedOption.value }) }));
        }
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

  const handleFileUpload = useCallback(async (file, type) => {
    if (!file) return;
    try {
      setIsLoading(true);
      const uploadedImage = await uploadFile(file, type);
      setBrandFormValues(prev => ({
        ...prev,
        ...(type === 'BRANDS' ? { logo: uploadedImage } : { thumbnails: uploadedImage })
      }));
    } catch (error) {
      toast.error('File upload failed: ' + (error?.message || error));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    const addOptions = (categories, prefix = '', depth = 1) => {
      if (!Array.isArray(categories)) return;

      categories.forEach(category => {
        const categoryName = category.name || category.title || category.categoryKey;
        const label = prefix ? `${prefix} > ${categoryName}` : categoryName;
        options.push({ value: category._id, label });

        if (depth < 2 && (category.subcategories || category.subCategories)?.length) {
          addOptions(category.subcategories || category.subCategories, label, depth + 1);
        }
      });
    };

    addOptions(allCategories);
    return options;
  }, [allCategories]);

  const handleSubmitBrand = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true)
      const res = await dispatch(createBrand(brandFormValues)).unwrap();
      toast.success(res?.message || 'Brand created successfully');
      setIsBrandAddModal(false);
      setBrandFormValues(INITIAL_FORM_VALUES);
      fetchAllData([API_CALL_OBJECT["Brand List"]])

    } catch (err) {
      toast.error(err?.message || 'Failed to create brand');
    } finally {
      setIsLoading(false)
    }
  };

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
        reqData.categoryId = categoryForm.parentCategory.value;
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

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true)
      const res = await dispatch(createBatch(batchFormValues)).unwrap();
      toast.success(res?.message || 'Batch created successfully');
      setIsBatchAddModal(false);
      setBatchFormValues(INITIAL_FORM_BATCH);
      fetchAllData([API_CALL_OBJECT["Batch List"]])
      setFormErrors({})

    } catch (error) {
      toast.error(error?.message || 'Failed to create batch');
    } finally {
      setIsLoading(false)
      setFormErrors({})
    }
  };

  const handleQtyHeadSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true)
      await dispatch(createQtyHead({ ...qtyFormValues, isDisable: true })).unwrap();
      toast.success('Quantity head created successfully');
      setQtyFormValues(INITIAL_FORM_QTY);
      setIsQtyModal(false);
      fetchAllData([API_CALL_OBJECT["Qty Head List"]])
      setFormErrors({})
    } catch (error) {
      toast.error(error?.message || 'Failed to create quantity head');
    } finally {
      setIsLoading(false)
      setFormErrors({})
    }
  };

  const handleWarrantySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true)
      const res = await dispatch(createWarranty({
        period: warrantyFormData.period,
        isDisable: true
      })).unwrap();

      toast.success(res?.message || "Warranty period created successfully");
      setIsWarrantyAddModal(false);
      setWarrantyFormData(INITIAL_FORM_WARRANTY);
      fetchAllData([API_CALL_OBJECT["Warranty List"]])
      setIsLoading(false)
      setFormErrors({})

    } catch (error) {
      toast.error(error?.message || "Failed to create warranty period");
    } finally {
      setIsLoading(false)
      setFormErrors({})
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
      isDisable: true

    }
    try {
      await dispatch(createHsn(basePayload)).unwrap()
      toast.success('HSN Code created successfully')
      setIsHsnAddModal(false); setIsHsnFormValue(INITIAL_FORM_HSN)
      fetchAllData([API_CALL_OBJECT["Hsn code list"]])

    } catch (error) {
      toast.error(error?.message || 'Failed to save HSN Code')
    } finally {
      setFormErrors({})
      setIsHsnAddModal(false); setIsHsnFormValue(INITIAL_FORM_HSN)
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

  const validateBrandForm = () => {
    const newErrors = {};
    if (!brandFormValues.name) newErrors.name = "Brand name is required";
    if (!brandFormValues.logo) newErrors.logo = "Logo is required";
    return Object.keys(newErrors).length === 0;
  };

  const validateCategoryForm = () => {
    const newErrors = {};
    if (!categoryForm.categoryName) newErrors.categoryName = "Category name is required";
    return Object.keys(newErrors).length === 0;
  };

  const validateBatchForm = () => {
    const newErrors = {};
    if (!batchFormValues.batchCode) newErrors.batchCode = "Batch code is required";
    if (!batchFormValues.manufactureDate) newErrors.manufactureDate = "Manufacture date is required";
    if (!batchFormValues.expire_date) newErrors.expire_date = "Expiry date is required";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateQtyForm = () => {
    const newErrors = {};
    if (!qtyFormValues.name) newErrors.name = "Name is required";
    if (!qtyFormValues.value) newErrors.value = "Value is required";
    if (!qtyFormValues.example) newErrors.example = "example is required";
    if (!qtyFormValues.description) newErrors.description = "description is required";

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateWarrantyForm = () => {
    const newErrors = {};
    if (!warrantyFormData.period) newErrors.period = "Warranty period is required";
    setFormErrors(newErrors);
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
          <div className="grid w-auto grid-cols-1 gap-4 md:grid-cols-2">
            {userData?.role !== 'seller' && (
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
            {
              userData?.roleId !== 9 && (
                <div>
                  <div className='flex justify-between items-center'>
                    <label>Store</label>
                    <button
                      className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                      onClick={() => handleAction("Store")}
                    >
                      Add store
                    </button>
                  </div>
                  <FilterSelect
                    name="store_id"
                    value={storeList.find(opt => opt.value === formData?.store_id)}
                    onChange={(e) => handleSelectChange(e, 'STORE_ID')}
                    options={storeList || []}
                    error={errors?.store_id}
                    placeholder="Store"
                  />
                </div>
              )
            }

            <div>
              <div className='flex justify-between items-center'>
                <label>Brand</label>
                <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("BRAND")}
                >
                  Add Brand
                </button>
              </div>
              <FilterSelect
                name="brand_id"
                value={formattedBrandList.find(opt => opt.value === formData.brand_id)}
                onChange={(e) => handleSelectChange(e, 'BRAND_ID')}
                options={formattedBrandList || []}
                error={errors?.brand_id}
                placeholder="Brand"
              />
            </div>

            <div>
              <div className='flex justify-between items-center'>
                <label>Category</label>
                <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("Category")}
                >
                  Add Category
                </button>
              </div>
              <FilterSelect
                name="category_id"
                value={formattedCategoryList.find(opt => opt.value === formData.category_id)}
                onChange={(e) => handleSelectChange(e, 'CATEGORY_ID')}
                options={formattedCategoryList || []}
                error={errors?.category_id}
                placeholder="Category"
              />
            </div>

            {/* <div>
              <div className='flex justify-between items-center'>
                <label>Batch</label>
                <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("Batch")}
                >
                  Add Batch
                </button>
              </div>
              <FilterSelect
                name="batch_id"
                value={batchData.find(opt => opt.value === formData.batch_id)}
                onChange={(e) => handleSelectChange(e, 'STORE_BATCH_ID')}
                options={batchData || []}
                error={errors?.batch_id}
                placeholder="Batch"
              />
            </div> */}

            {/* <div>
              <div className='flex justify-between items-center'>
                <label>Quantity Head</label>
                <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("QTY")}
                >
                  Add Quantity Head
                </button>
              </div>
              <FilterSelect
                name="qty_head_id"
                value={formattedQtyHeadList.find(opt => opt.value === formData.qty_head_id)}
                onChange={(e) => handleSelectChange(e, 'STORE_qtyHead_ID')}
                options={formattedQtyHeadList || []}
                error={errors?.qty_head_id}
                placeholder="Quantity"
              />
            </div> */}

            <div>
              <div className='flex justify-between items-center'>
                <label>Warranty</label>
                <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("Warranty")}
                >
                  Add Warranty
                </button>
              </div>
              <FilterSelect
                name="warranty_id"
                value={formattedWarrantyList.find(opt => opt.value === formData.warranty_id)}
                onChange={(e) => handleSelectChange(e, 'STORE_WARRANTY_ID')}
                options={formattedWarrantyList || []}
                error={errors?.warranty_id}
                placeholder="Warranty"
              />
            </div>
            <div>
              <div className='flex justify-between items-center'>
                <label>Hsn Code</label>
                <button
                  className='font-semibold text-xs text-blue-600 hover:text-blue-800'
                  onClick={() => handleAction("Hsn")}
                >
                  Add Hsn
                </button>
              </div>
              <FilterSelect
                name="hsn_code"
                value={hsnCodeList.find(opt => opt.value === formData.hsn_code)}
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
            <Input
              labelName="Price"
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
              labelName="MRP"
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

      <AddStoreModal
        isOpen={isAddStoreModal}
        formValues={formValues}
        formErrors={formErrors}
        handleInputChange={handleInputChange}
        modifiedCountry={modifiedCountry}
        modifiedState={modifiedState}
        modifiedCity={modifiedCity}
        modifiedZipCode={modifiedZipCode}
        handleSelectChange={handleSelectAddChange}
        onClose={() => { setIsAddStoreModal(false); setFormValues(INITIAL_FORM_STATE); setFormErrors({}) }}
        handleSubmit={() => validateStoreForm() && handleAddStore()}
        modifiedSellerList={modifiedSellerList}
      />

      <AddBrandModal
        isOpen={isBrandAddModal}
        handleCloseModal={() => setIsBrandAddModal(false)}
        formValues={brandFormValues}
        handleInputChange={handleBrandInputChange}
        handleFileUpload={handleFileUpload}
        handleSubmit={(e) => validateBrandForm() && handleSubmitBrand(e)}
      />

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

      <AddBatchModal
        isOpen={isBatchAddModal}
        formValues={batchFormValues}
        handleInputChange={handleBatchInputChange}
        handleCloseModal={() => { setIsBatchAddModal(false); setBatchFormValues(INITIAL_FORM_BATCH); setFormErrors({}) }}
        handleSubmit={(e) => validateBatchForm() && handleBatchSubmit(e)} errors={formErrors}
      />

      <AddQtyHead
        isOpen={isQtyModal}
        handleCloseModal={() => { setIsQtyModal(false); setQtyFormValues(INITIAL_FORM_QTY); setFormErrors({}) }}
        formData={qtyFormValues}
        handleInputChange={handleQtyInputChange}
        handleSubmit={(e) => validateQtyForm() && handleQtyHeadSubmit(e)}
        errors={formErrors}
      />

      <AddHsnModal isOpen={isHsnAddModal} formData={hsnFormValues}
        resetForm={() => { setIsHsnAddModal(false); setIsHsnFormValue(INITIAL_FORM_HSN); setFormErrors({}) }}
        handleInputChange={handleHsnInputChange} handleSubmit={(e) => validateHsnForm() && handleHsnSubmit(e)}
        errors={formErrors} />

      <DefaultModal
        isOpen={isWarrantyAddModal}
        onClose={() => { setIsWarrantyAddModal(false); setFormErrors({}); setWarrantyFormData(INITIAL_FORM_WARRANTY) }}
        onSubmit={(e) => validateWarrantyForm() && handleWarrantySubmit(e)}
        isButtonView={true}
        submitButtonText="Create"
        closeButtonText="Cancel"
        title="Add Warranty Period"
        titleClassName="mt-5 font-medium"
      >
        <div className='p-4'>
          <Input
            labelName="Warranty Period"
            name="period"
            type="text"
            placeholder="Enter warranty period (e.g., 1 year)"
            value={warrantyFormData.period}
            onChange={handleWarrantyInputChange}
            required
            error={formErrors?.period}
          />
        </div>
      </DefaultModal >
    </>
  );
}
