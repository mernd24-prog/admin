/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BasicDetailsTab from './BasicDetailsTab';
import MediaTab from './MediaTab';
import ProductSettingsPanel from './ProductSettingsPanel';
import { useDispatch, useSelector } from 'react-redux';
import {
  createProducts, getAllBrandList, getAllStoreList, getAllStoreShippingDurationList, getAllTaxRulesList, getList,
  getProductById, updateProductsById, getAllBatchList, getAllWarrantyList, getAllQtyHeadList,
  getAllHsn, getCategoryAttributes,
} from '../../../../Redux/productSlice';
import { transformArray } from '../../../../_helpers/globalFunctions';
import Loader from '../../../../components/Loader/Loader';
import { getAllCountryList } from '../../../../Redux/CountrySlice';
import { GrDocument } from 'react-icons/gr';
import { IoImage } from 'react-icons/io5';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import TabNavigation from './TabNavigation';
import Breadcrumb from './Breadcrumb';
import selectJson from '../../../../_helpers/SelectJson.json'
import { BsMenuApp } from 'react-icons/bs';
import VariantsOptionsTab from './VariantsOptionsTab';
import DynamicAttributesTab from './DynamicAttributesTab';

const API_CALLS = [
{ action: getList, name: 'Category List' },
{ action: getAllCountryList, name: 'Country List' },
{ action: getAllHsn, name: 'Hsn code List' },
];

const API_CALL_OBJECT = {
  "Brand List": { action: getAllBrandList, name: "Brand List" },
  "Category List": { action: getList, name: "Category List" },
  "Store List": { action: getAllStoreList, name: "Store List" },
  "Country List": { action: getAllCountryList, name: "Country List" },
  "Batch List": { action: getAllBatchList, name: "Batch List" },
  "Warranty List": { action: getAllWarrantyList, name: "Warranty List" },
  "Qty Head List": { action: getAllQtyHeadList, name: "Qty Head List" },
  "Hsn code list": { action: getAllHsn, name: "Hsn code List" },

}

const SELLER_PANEL_ROLES = new Set(['seller', 'seller-sub-admin']);

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const toOptionalNumber = (value) => {
  if (!hasValue(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const compactObject = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(compactObject)
      .filter((item) => hasValue(item) && !(typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    const nextValue = compactObject(item);
    if (!hasValue(nextValue)) return acc;
    if (typeof nextValue === 'object' && !Array.isArray(nextValue) && Object.keys(nextValue).length === 0) {
      return acc;
    }
    acc[key] = nextValue;
    return acc;
  }, {});
};

export default function ProductManagementUI() {
  const dispatch = useDispatch();
  const navigate = useNavigate()
  const selector = useSelector(state => state.product);
  const mainContainerRef = useRef(null);
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  let { INITIALS_DATA } = selectJson
  const [formData, setFormData] = useState(INITIALS_DATA);
  const [options, setVariantRows] = useState([{
    "sku": "",
    "type": null,
    "remark": "",
    "packaging": "",
    "mrp": "",
    "discount": "",
    "salePrice": "",
    "stock": ""
  }]);
  const [activeTab, setActiveTab] = useState('basic-details');
  const [isScrolling, setIsScrolling] = useState(false);
  const [images, setImages] = useState([])
  const isEditMode = id ? true : false;
  const [taxData, setTaxData] = useState(null)
  const [userData, setUserData] = useState({})
  const [categoryAttributeSchema, setCategoryAttributeSchema] = useState([]);

  const calculatePriceWithTax = (product, basePrice) => {
    const igst = product?.IGST ?? 0;
    const additionalTax = product?.additionalTax ?? 0;
    const sgst = product?.SGST ?? 0;
    const cgst = product?.CGST ?? 0;
    const totalTaxRate = igst + additionalTax + sgst + cgst;
    const taxAmount = (basePrice * totalTaxRate / 100);
    const priceWithTax = Number(basePrice) + Number(taxAmount);
    return priceWithTax;
  };

  const getListPayload = (sliceData) => {
    const data = sliceData?.data?.data || sliceData?.normalized?.data || sliceData?.data || {};
    if (Array.isArray(data)) return data;
    return data.list || data.items || [];
  };

  const toSelectId = (record = {}) => String(record._id || record.id || record.value || record.categoryKey || record.code || "");

  const toCategoryOption = (category = {}, prefix = '') => {
    const categoryName = category.name || category.title || category.categoryKey;
    return {
      value: toSelectId(category),
      categoryKey: category.categoryKey || toSelectId(category),
      label: prefix ? `${prefix} > ${categoryName}` : categoryName,
    };
  };

  const refs = {
    'basic-details': useRef(null),
    'variants-options': useRef(null),
    'media': useRef(null),
  };

  const formattedBatchData = useMemo(() =>
    selector?.getAllBatchListData?.data?.data?.list?.map((e) => ({
      value: e?.id,
      label: e?.batchCode
    })) || [],
    [selector?.getAllBatchListData]
  );

  const fetchProductById = async (productId) => {
    try {
      dispatch(getProductById({ _id: productId })).unwrap()
        .then((res) => {
          const productData = res?.data;
          setFormData({
            ...INITIALS_DATA,
            ...productData,
            name: productData?.title || productData?.name || '',
            category_id: productData?.categoryId || productData?.category || '',
            sellerId: productData?.sellerId || '',
            stock: productData?.stock ?? '',
            price: productData?.price ?? '',
            mrp: productData?.mrp ?? '',
            gstRate: productData?.gstRate ?? 18,
            attributes: productData?.attributes || {},
            options: productData?.options || [{
              "sku": "",
              "type": null,
              "remark": "",
              "packaging": "",
              "mrp": "",
              "discount": "",
              "salePrice": "",
              "stock": ""
            }]
          });

          const sourceVariants = productData?.variants?.length ? productData.variants : productData?.options;
          if (sourceVariants && Array.isArray(sourceVariants)) {
            const formattedOptions = sourceVariants.map((option, index) => ({
              id: option._id || Date.now() + index,
              sku: option.sku || '',
              type: option.type || Object.keys(option.attributes || {})[0] || '',
              remark: option.remark || '',
              packaging: option.packaging || '',
              mrp: option.mrp || '',
              discount: option.discount || '',
              salePrice: option.salePrice || option.price || '',
              stock: option.stock || ''
            }));
            setVariantRows(formattedOptions);
          }

          setImages(productData?.images || res?.data?.imageUrls || []);



          if (res?.data?.hsnCode || res?.data?.hsn_code) {
            const hsnValue = res?.data?.hsnCode || res?.data?.hsn_code;
            const hsnCodeData = getListPayload(selector?.getAllHsnData).find(item =>
              item?.code === hsnValue || item?._id === hsnValue || item?.id === hsnValue
            );
            if (hsnCodeData) {
              setTaxData(hsnCodeData);
            }
          }
        })
        .catch((err) => {
          toast.error("Error fetching collections:" || err);
        });
    } catch (err) {
      toast.error("Failed to fetch product:" || err);
    }
  };

  const fetchAllData = useCallback(async (callsArray = API_CALLS) => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        callsArray.map(({ action }) => dispatch(action()).unwrap?.() || dispatch(action()))
      );

      const failedCalls = results
        .filter(({ status }) => status === 'rejected')
        .map((_, index) => callsArray[index].name);

      if (failedCalls.length > 0) {
        setError(`Some data failed to load: ${failedCalls.join(', ')}. Please refresh to try again.`);
      } else {
        // setApiCallsCompleted(true);
      }
    } catch (err) {
      toast.error(err || 'Failed to load product data. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    const userDataString = sessionStorage.getItem('EcomAdmin');
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (isEditMode && !loading) {
      fetchProductById(id);
    }
  }, [isEditMode, id, loading]);

  useEffect(() => {
    const categoryId = formData?.category_id || formData?.categoryId || formData?.category;
    if (!categoryId) {
      setCategoryAttributeSchema([]);
      return;
    }

    dispatch(getCategoryAttributes({ categoryId }))
      .unwrap()
      .then((res) => {
        const data = res?.data || {};
        setCategoryAttributeSchema(data.attributeSchema || []);
      })
      .catch(() => {
        setCategoryAttributeSchema([]);
      });
  }, [dispatch, formData?.category_id, formData?.categoryId, formData?.category]);

  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sideScrollOffset = Math.min(scrollTop * 0.2, 200);

      [container.previousElementSibling, container.nextElementSibling].forEach(panel => {
        if (panel) panel.style.transform = `translateY(-${sideScrollOffset}px)`;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const formattedData = useMemo(() => ({
    brandList: transformArray(selector?.getAllBrandListData?.data?.data?.list || []),
    storeList: transformArray(selector?.getAllStoreListData?.data?.data?.list || []),
    taxList: transformArray(selector?.getAllTaxListData?.data?.data?.list || []),
    batchList: transformArray(selector?.getAllBatchListData?.data?.data?.list || []),
    warrantyList: transformArray(selector?.getAllWarrantyListData?.data?.data?.list || []),
    qtyHeadList: transformArray(selector?.getAllQtyHeadListData?.data?.data?.list || []),
    hsnCodeList: getListPayload(selector?.getAllHsnData).map((item) => ({
      value: item.code || item._id || item.id,
      code: item.code,
      label: `${item.code || item._id || item.id} | GST: ${Number(item.gstRate || item.IGST || 0)}%`,
    })),

  }), [selector]);

  const createSelectOptions = useMemo(() => {
    const options = [];
    const categorySource = getListPayload(selector?.getListData);
    const addOptions = (categories, prefix = '') => {
      if (!Array.isArray(categories)) return;
      categories.forEach(category => {
        const option = toCategoryOption(category, prefix);
        options.push(option);
        if (Array.isArray(category.subcategories || category.subCategories) && (category.subcategories || category.subCategories).length > 0) {
          addOptions(category.subcategories || category.subCategories, option.label);
        }
      });
    };
    addOptions(categorySource);
    return options;
  }, [selector?.getListData]);


  const validateForm = () => {
    const newErrors = {};
    const isSellerPanelUser = SELLER_PANEL_ROLES.has(userData?.role);
    if (!formData?.name?.trim()) newErrors.name = "Product name is required.";
    if (formData?.name?.trim() && formData.name.trim().length < 3) newErrors.name = "Product name must be at least 3 characters.";
    if (!formData?.description?.trim()) newErrors.description = "Description is required.";
    if (formData?.description?.trim() && formData.description.trim().length < 10) newErrors.description = "Description must be at least 10 characters.";
    if (!formData?.sellerId && !isSellerPanelUser) newErrors.sellerId = "Seller is required.";
    if (!formData?.category_id) newErrors.category_id = "Category is required.";
    if (!formData?.price || Number(formData.price) <= 0) newErrors.price = "Price is required.";
    if (!formData?.mrp || Number(formData.mrp) <= 0) newErrors.mrp = "MRP is required.";
    if (formData?.stock === undefined || formData?.stock === '' || Number(formData.stock) < 0) newErrors.stock = "Stock is required.";
    categoryAttributeSchema.forEach((field) => {
      const value = formData?.attributes?.[field.key];
      if (field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
        newErrors.attributes = {
          ...(newErrors.attributes || {}),
          [field.key]: `${field.label || field.key} is required.`,
        };
      }
    });

    if (!images || images.length === 0) {
      newErrors.images = "At least one image is required.";
    }
    setError(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  useEffect(() => {
    if (isScrolling) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let mostVisibleEntry = null;
        let maxRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry) {
          const targetId = mostVisibleEntry.target.id;
          if (targetId && targetId !== activeTab) {
            setActiveTab(targetId);
          }
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0.1, 0.5, 0.9],
      }
    );

    Object.values(refs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    const handleManualScroll = () => {
      if (isScrolling) return;

      if (window.scrollY <= 100 && activeTab !== 'basic-details') {
        setActiveTab('basic-details');
      }
    };

    window.addEventListener('scroll', handleManualScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleManualScroll);
    };
  }, [isScrolling, refs, activeTab]);

  const scrollToSection = useCallback((id) => {
    setIsScrolling(true);

    refs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const handleScrollStop = () => {
      setIsScrolling(false);
      window.removeEventListener('scroll', handleScrollStop);
    };

    window.addEventListener('scroll', handleScrollStop);

    setTimeout(() => {
      setIsScrolling(false);
      window.removeEventListener('scroll', handleScrollStop);
    }, 1200);
  }, [refs]);


  function calculateDiscount(price, discountPercent = 0) {
    const validPrice = parseFloat(price) || 0;
    const validDiscount = parseFloat(discountPercent) || 0;

    if (validPrice < 0 || validDiscount < 0) {
      return {
        discountedPrice: 0,
        discountAmount: 0
      };
    }

    const discountAmount = (validPrice * validDiscount) / 100;
    const discountedPrice = validPrice - discountAmount;

    return {
      discountedPrice: parseFloat(discountedPrice.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2))
    };
  }

  useEffect(() => {
    if (!formData.basePrice || !taxData) return;

    const priceWithTax = calculatePriceWithTax(taxData, formData.basePrice);
    const { discountedPrice } = calculateDiscount(priceWithTax, formData.discount);

    setFormData((prev) => ({
      ...prev,
      salePrice: discountedPrice.toString()
    }));
  }, [formData.basePrice, formData.discount, taxData]);



  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [group, field] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [group]: {
          ...(prev[group] || {}),
          [field]: value,
        },
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev, [name]: value
    }))
  }, []);




  const handleSelectChange = (selectedOption, action) => {
    console.log("selectedOption", selectedOption)
    setError(prevErrors => {
      const newErrors = { ...prevErrors };
      switch (action) {
        case 'COUNTRY':
          delete newErrors.mfd_country;
          delete newErrors.mfd_state;
          delete newErrors.mfd_city;
          delete newErrors.mfd_zip_code;
          break;

        case 'STORE_ID':
          delete newErrors.store_id;
          break;
        case 'SELLER_ID':
          delete newErrors.sellerId;
          break;
        case 'BRAND_ID':
          delete newErrors.brand_id;
          break;
        case 'CATEGORY_ID':
          delete newErrors.category_id;
          break;
        case 'REPLACE_ID':
          delete newErrors.replace_id;
          break;
        case 'STORE_TAX_ID':
          delete newErrors.store_tax_id;
          break;
        case 'STORE_BATCH_ID':
          delete newErrors.store_batch_id;
          break;
        case 'STORE_qtyHead_ID':
          delete newErrors.store_qtyHead_id;
          break;
        case 'STORE_WARRANTY_ID':
          delete newErrors.store_warranty_id;
          break;
        case 'OPTION_ID':
          delete newErrors.option_id;
          break;
        case 'OPTION_VALUE_IDS':
          delete newErrors.option_value_ids;
          break;
        case 'STORE_SHIPPING_DURATION_ID':
          delete newErrors.store_shipping_duration_id;
          break;
        default:
          break;
      }
      return newErrors;
    });
    switch (action) {

      case 'STORE_ID':
        setFormData(prev => ({ ...prev, store_id: selectedOption?.value || "" }));
        setError({})
        if (selectedOption?.value) {
          dispatch(getAllStoreShippingDurationList({ query: JSON.stringify({ store_id: selectedOption.value }) }))
        }
        break;
      case 'SELLER_ID':
        setFormData(prev => ({ ...prev, sellerId: selectedOption?.value || "" }));
        break;

      case 'BRAND_ID':
        setFormData(prev => ({ ...prev, brand: selectedOption?.label || selectedOption?.value || "" }));
        break;

      case 'CATEGORY_ID':
        setFormData(prev => ({
          ...prev,
          category_id: selectedOption?.value || "",
          categoryId: selectedOption?.value || "",
          category: selectedOption?.categoryKey || selectedOption?.value || "",
          category_key: selectedOption?.categoryKey || selectedOption?.value || "",
          attributes: {}
        }));
        if (selectedOption?.value) {
          dispatch(getAllTaxRulesList({ query: JSON.stringify({ category_id: selectedOption.value }) }))
        }
        break;
      case 'STORE_BATCH_ID':
        setFormData(prev => ({ ...prev, batch_id: selectedOption?.value || "" }));
        break;
      case 'STORE_qtyHead_ID':
        setFormData(prev => ({ ...prev, qty_head_id: selectedOption?.value || "" }));
        break;
      case 'STORE_WARRANTY_ID':
        setFormData(prev => ({ ...prev, warranty_id: selectedOption?.value || "" }));
        break;
      case 'hsn_code':
        setFormData(prev => ({
          ...prev,
          hsn_code: selectedOption?.value || "",
          hsnCode: selectedOption?.code || selectedOption?.value || "",
        }));
        const hsnCodeData = getListPayload(selector?.getAllHsnData).find(item =>
          toSelectId(item) === String(selectedOption?.value) || item?.code === selectedOption?.value
        )

        setTaxData(hsnCodeData)


        break;
      case 'PRODUCT_COUNTRY':
        setFormData(prev => ({
          ...prev,
          origin: {
            ...(prev.origin || {}),
            country: selectedOption?.label || selectedOption?.value || "",
            state: "",
            city: "",
          },
        }));
        break;
      case 'PRODUCT_STATE':
        setFormData(prev => ({
          ...prev,
          origin: {
            ...(prev.origin || {}),
            state: selectedOption?.label || selectedOption?.value || "",
            city: "",
          },
        }));
        break;
      case 'PRODUCT_CITY':
        setFormData(prev => ({
          ...prev,
          origin: {
            ...(prev.origin || {}),
            city: selectedOption?.label || selectedOption?.value || "",
          },
        }));
        break;
      default:
        console.warn(`Unhandled select change action: ${action}`);
        break;
    }
  };
  const handleToggleProductSetting = (key) => {
    const fieldMap = {
      DISABLE: 'isDisable',
      APPROVE: 'isApproved',
      FEATURED: 'markAsFeatured',
      COD: 'cod',
      prescription_required: 'prescription_required'
    };

    const fieldName = fieldMap[key];

    if (fieldName) {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: !prev[fieldName],
      }));
    }
  };




  const handleSaveSubmit = useCallback(async () => {
    const catalogsUrlsArray = typeof formData.catalogsUrls === 'string'
      ? [formData.catalogsUrls]
      : formData.catalogsUrls;

    const updatedFormData = { ...formData };

    const formattedOptions = options.map(option => ({
      sku: option.sku || '',
      type: option.type,
      remark: option.remark || '',
      packaging: option.packaging || '',
      mrp: parseFloat(option.mrp) || 0,
      discount: parseFloat(option.discount) || 0,
      salePrice: parseFloat(option.salePrice) || 0,
      stock: Number(option.stock || 0),
      ...(option._id && { _id: option._id })
    }));

    const primaryOption = formattedOptions[0] || {};
    const origin = compactObject(updatedFormData.origin || {});
    const dimensions = compactObject({
      unit: updatedFormData.dimensions?.unit,
      weightUnit: updatedFormData.dimensions?.weightUnit,
      length: toOptionalNumber(updatedFormData.dimensions?.length),
      width: toOptionalNumber(updatedFormData.dimensions?.width),
      height: toOptionalNumber(updatedFormData.dimensions?.height),
      weight: toOptionalNumber(updatedFormData.dimensions?.weight),
    });
    const warranty = compactObject({
      ...(updatedFormData.warranty || {}),
      period: toOptionalNumber(updatedFormData.warranty?.period),
      returnPolicy: {
        ...(updatedFormData.warranty?.returnPolicy || {}),
        days: toOptionalNumber(updatedFormData.warrantyReturnDays || updatedFormData.warranty?.returnPolicy?.days),
      },
    });

    const productPayload = {
      sellerId: updatedFormData.sellerId,
      title: updatedFormData.name || updatedFormData.title,
      gstRate: Number(taxData?.gstRate ?? taxData?.IGST ?? updatedFormData.gstRate ?? 18),
      description: updatedFormData.description,
      price: Number(updatedFormData.price || primaryOption.salePrice || 0),
      mrp: Number(updatedFormData.mrp || primaryOption.mrp || 0),
      category: updatedFormData.category_key || updatedFormData.category || updatedFormData.category_id,
      categoryId: updatedFormData.category_id || updatedFormData.categoryId,
      brand: updatedFormData.brand || updatedFormData.brand_id || "",
      productFamilyCode: updatedFormData.productFamilyCode || "DEFAULT",
      sku: updatedFormData.sku || updatedFormData.rack_no || updatedFormData.name,
      color: updatedFormData.color || "default",
      attributes: {
        ...(updatedFormData.attributes || {}),
      },
      variants: formattedOptions
        .filter((option) => option.sku || option.salePrice || option.mrp || option.stock)
        .map((option, index) => ({
          sku: option.sku || `${updatedFormData.sku || updatedFormData.name || 'SKU'}-${index + 1}`,
          price: Number(option.salePrice || updatedFormData.price || 0),
          mrp: Number(option.mrp || updatedFormData.mrp || 0),
          stock: Number(option.stock || 0),
          attributes: option.type ? { [option.type]: option.remark || option.packaging || option.type } : {},
          images: [],
      })),
      hsnCode: updatedFormData.hsnCode || updatedFormData.hsn_code,
      origin,
      ...(Object.keys(dimensions).length ? { dimensions } : {}),
      ...(Object.keys(warranty).length ? { warranty } : {}),
      stock: Number(updatedFormData.stock || updatedFormData.quantity || 0),
      images: images?.length ? images : catalogsUrlsArray,
      status: updatedFormData.isApproved ? "active" : updatedFormData.isDisable ? "inactive" : "draft",
      metadata: {
        featured: Boolean(updatedFormData.markAsFeatured),
        codAvailable: Boolean(updatedFormData.cod),
        prescriptionRequired: Boolean(updatedFormData.prescription_required),
      },
    };

    try {
      const response = isEditMode
        ? await dispatch(updateProductsById({ id, body: productPayload })).unwrap()
        : await dispatch(createProducts(productPayload)).unwrap();

      if (response) {
        if (!isEditMode) {
          setFormData({});
          setImages([]);
          setVariantRows([{
            "sku": "",
            "type": null,
            "remark": "",
            "packaging": "",
            "mrp": "",
            "discount": "",
            "salePrice": "",
            "stock": ""
          }]);
        }
        toast.success(response?.message || "Product saved successfully!");
        navigate(`/app/product-catalog`);
      }
    } catch (err) {
      toast.error(err || "Failed to save product.");
    }
  }, [formData, images, options, dispatch, setFormData, setImages, isEditMode, userData, id, navigate]);


  const handleProductDetailChange = (field, content) => {
    setFormData((prev) => ({
      ...prev,
      [field]: content,
    }));
    setError({})
  };



  const tabs = useMemo(() => [
    {
      id: 'basic-details',
      title: 'Basic details',
      description: 'Manage the product\'s basic information.',
      icon: <GrDocument />,
      component: (
        <BasicDetailsTab
          formData={formData}
          errors={error}
          handleChange={handleChange}
          formattedCategoryList={createSelectOptions}
          formattedBrandList={formattedData.brandList}
          formattedWarrantyList={formattedData.warrantyList}
          formattedQtyHeadList={formattedData.qtyHeadList}
          storeList={formattedData.storeList}
          handleSelectChange={handleSelectChange}
          batchData={formattedData?.batchList}
          fetchAllData={fetchAllData}
          allCategories={getListPayload(selector?.getListData)}
          hsnCodeList={formattedData?.hsnCodeList}
          API_CALL_OBJECT={API_CALL_OBJECT}
          handleInputReactQuillChange={handleProductDetailChange}
          userData={userData}

        />
      )
    },
    {
      id: 'product-details',
      title: 'Attributes',
      description: 'Manage category-based product attributes.',
      icon: <GrDocument />,
      component: (
        <DynamicAttributesTab
          attributeSchema={categoryAttributeSchema}
          formData={formData}
          setFormData={setFormData}
          errors={error}
        />
      )
    },
    {
      id: 'variants-options',
      title: 'Variants & options',
      description: 'Customize the product variants, including size, color, etc.',
      icon: <BsMenuApp />,
      component: (
        <VariantsOptionsTab
          optionsData={selector?.productOptionListData?.data?.data}
          setVariantRows={setVariantRows}
          options={options} // Make sure this is passed
          formData={formData}
          handleChange={handleChange}
          selectJson={selectJson}
          setFormData={setFormData}
        />
      )
    },
    {
      id: 'media',
      title: 'Media',
      description: 'Manage your product\'s image gallery.',
      icon: <IoImage />,
      component: (
        <MediaTab
          setFormData={setFormData}
          formData={formData}
          images={images} setImages={setImages}
          error={error}
        />
      )
    },

  ], [
    formData, formattedData, createSelectOptions, formattedBatchData,
    handleChange, handleSelectChange,
    selector, options, categoryAttributeSchema, error
  ]);


  return (
    <div className='relative min-h-screen p-2 mx-auto max-w-7xl'>
      <Loader loading={loading} />
      <Breadcrumb isEditMode={isEditMode} />
      <div className="flex flex-col gap-4 pb-8 lg:flex-row ">
        <div className='h-full lg:sticky lg:top-24 '>
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            scrollToSection={scrollToSection}
          />
        </div>
        <div className='w-10/12 mt-8'>
          <div className='space-y-1 pb-7'>
            <h3 className='text-2xl font-semibold'>{isEditMode ? "Edit" : "Add"} Product</h3>
            <p className='text-xs text-gray-500'>Fields with (<span className='text-red-500'>*</span>) are mandatory</p>
          </div>
          <main
            ref={mainContainerRef}
            className="flex-1 overflow-hidden bg-white border border-gray-100 "
          >
            {tabs.map(tab => (
              <section key={tab.id} ref={refs[tab.id]} id={tab.id} className="p-2 pb-10 md:p-6 scroll-mt-24"  >
                {tab.component}
              </section>
            ))}
          </main>
        </div>
        <div className="lg:w-5/12 lg:sticky lg:top-24 h-fit ">
          <ProductSettingsPanel handleSaveSubmit={() => { validateForm() && handleSaveSubmit() }} formData={formData} handleToggleProductSetting={handleToggleProductSetting}
          />
        </div>
      </div>
    </div>
  );
}
