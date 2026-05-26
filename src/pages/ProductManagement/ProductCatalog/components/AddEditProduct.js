/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BasicDetailsTab from './BasicDetailsTab';
import MediaTab from './MediaTab';
import ProductSettingsPanel from './ProductSettingsPanel';
import { useDispatch, useSelector } from 'react-redux';
import {
  createProducts, getAllProducts, getList,
  getProductById, updateProductsById, getAllHsn, getCategoryAttributes, getAllBrandList, getAllWarrantyList,
} from '../../../../Redux/productSlice';
import { getProductFamilies, getPlatformOptions, getPlatformOptionValues } from '../../../../Redux/adminCoreSlice';
import { transformArray } from '../../../../_helpers/globalFunctions';
import Loader from '../../../../components/Loader/Loader';
import { getAllCountryList } from '../../../../Redux/CountrySlice';
import { getAllStateList } from '../../../../Redux/stateSlice';
import { getAllCityList } from '../../../../Redux/citySlice';
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
import VariantBuilder from '../../../../components/Product/VariantBuilder';
import ProductTypeSelector from '../../../../components/Product/ProductTypeSelector';
import SEOPanel from '../../../../components/Product/SEOPanel';
import TagsInput from '../../../../components/Product/TagsInput';
import DigitalProductPanel from '../../../../components/Product/DigitalProductPanel';
import SubscriptionPanel from '../../../../components/Product/SubscriptionPanel';
import BundleBuilder from '../../../../components/Product/BundleBuilder';
import useDropdownOptions from '../../../../hooks/useDropdownOptions';

const API_CALLS = [
{ action: getList, name: 'Category List' },
{ action: getAllCountryList, name: 'Country List' },
{ action: getAllHsn, name: 'Hsn code List' },
{ action: getAllBrandList, name: 'Brand List' },
{ action: getAllWarrantyList, name: 'Warranty List' },
{ action: () => getProductFamilies({ page: 1, limit: 100 }), name: 'Product Families List' },
{ action: getAllProducts, name: 'Products List' },
];

const API_CALL_OBJECT = {
  "Category List": { action: getList, name: "Category List" },
  "Country List": { action: getAllCountryList, name: "Country List" },
  "Hsn code list": { action: getAllHsn, name: "Hsn code List" },

}

const SELLER_PANEL_ROLES = new Set(['seller', 'seller-admin', 'seller-sub-admin']);

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
  const adminCoreSelector = useSelector(state => state.adminCore);
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
  const [variantsData, setVariantsData] = useState([]);
  const [variantAxes, setVariantAxes] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);
  const [platformValues, setPlatformValues] = useState({});
  const fetchedOptionIds = useRef(new Set());
  const productVisibilities = useDropdownOptions('product-visibilities');

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

  const toSelectId = (record = {}) => String(record.categoryKey || record._id || record.id || record.value || record.code || "");

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
    'product-type': useRef(null),
    'variants-options': useRef(null),
    'media': useRef(null),
    'seo': useRef(null),
    'tags': useRef(null),
  };

  const fetchProductById = async (productId) => {
    try {
      dispatch(getProductById({ _id: productId })).unwrap()
        .then((res) => {
          const productData = res?.data;
          const resolvedCategoryId = productData?.categoryId || productData?.category_id || productData?.categoryKey || productData?.category || '';
          const resolvedCategoryKey = productData?.categoryKey || productData?.category_key || productData?.category || resolvedCategoryId;
          setFormData({
            ...INITIALS_DATA,
            ...productData,
            name: productData?.title || productData?.name || '',
            category_id: resolvedCategoryId,
            categoryId: resolvedCategoryId,
            category: resolvedCategoryKey,
            category_key: resolvedCategoryKey,
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

          if (Array.isArray(productData?.variants) && productData.variants.length) {
            const hasAttributes = productData.variants.some((v) => v.attributes && Object.keys(v.attributes).length);
            if (hasAttributes) {
              setVariantsData(productData.variants);
            }
          }
          if (Array.isArray(productData?.options) && productData.options.length) {
            setVariantAxes(productData.options);
          } else if (Array.isArray(productData?.variantAxes) && productData.variantAxes.length) {
            setVariantAxes(productData.variantAxes.map((axis, index) => ({
              name: String(axis || ''),
              values: [],
              sortOrder: index,
            })));
          }

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
    const categoryKey = formData?.category_key || formData?.category || formData?.category_id || formData?.categoryId;
    if (!categoryKey) {
      setCategoryAttributeSchema([]);
      return;
    }

    dispatch(getCategoryAttributes({ categoryKey }))
      .unwrap()
      .then((res) => {
        const data = res?.data || {};
        const schema = data.attributeSchema || [];
        setCategoryAttributeSchema(schema);
        schema.forEach((field) => {
          const optId = field.platformOptionId;
          if (!optId || fetchedOptionIds.current.has(optId)) return;
          fetchedOptionIds.current.add(optId);
          dispatch(getPlatformOptionValues({ optionId: optId, limit: 100, active: true }))
            .unwrap()
            .then((valueRes) => {
              const raw = valueRes?.data;
              const list = Array.isArray(raw) ? raw : (raw?.list || raw?.items || []);
              setPlatformValues((prev) => ({ ...prev, [optId]: list }));
            })
            .catch(() => { fetchedOptionIds.current.delete(optId); });
        });
      })
      .catch(() => {
        setCategoryAttributeSchema([]);
      });
  }, [dispatch, formData?.category_key, formData?.category, formData?.category_id, formData?.categoryId]);

  useEffect(() => {
    const originCountry = formData?.origin?.countryCode || formData?.origin?.country;
    const originState = formData?.origin?.stateCode || formData?.origin?.state;
    if (originCountry) {
      dispatch(getAllStateList({ countryId: originCountry }));
    }
    if (originState) {
      dispatch(getAllCityList({ stateId: originState }));
    }
  }, [dispatch, formData?.origin?.country, formData?.origin?.state]);

  // Load platform attribute options once on mount
  useEffect(() => {
    dispatch(getPlatformOptions({ limit: 100, active: true }))
      .unwrap()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || res?.data?.items || []);
        setPlatformOptions(list);
      })
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    platformOptions.forEach((option) => {
      const optId = option._id || option.id;
      if (!optId || fetchedOptionIds.current.has(optId)) return;
      fetchedOptionIds.current.add(optId);
      dispatch(getPlatformOptionValues({ optionId: optId, limit: 100, active: true }))
        .unwrap()
        .then((res) => {
          const raw = res?.data;
          const list = Array.isArray(raw) ? raw : (raw?.list || raw?.items || []);
          setPlatformValues((prev) => ({ ...prev, [optId]: list }));
        })
        .catch(() => { fetchedOptionIds.current.delete(optId); });
    });
  }, [dispatch, platformOptions]);

  // When a platform-linked axis is added to variantAxes, load its values
  useEffect(() => {
    variantAxes.forEach((axis) => {
      const optId = axis.platformOptionId;
      if (!optId || fetchedOptionIds.current.has(optId)) return;
      fetchedOptionIds.current.add(optId);
      dispatch(getPlatformOptionValues({ optionId: optId, limit: 100, active: true }))
        .unwrap()
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || res?.data?.items || []);
          setPlatformValues((prev) => ({ ...prev, [optId]: list }));
        })
        .catch(() => { fetchedOptionIds.current.delete(optId); });
    });
  }, [dispatch, variantAxes]);

  const handleOptionSearch = useCallback((query) => {
    dispatch(getPlatformOptions({ limit: 100, active: true, q: query || undefined }))
      .unwrap()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || res?.data?.items || []);
        setPlatformOptions(list);
      })
      .catch(() => {});
  }, [dispatch]);

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
    brandList: getListPayload(selector?.getAllBrandListData).map((item) => ({
      value: item?.name || item?._id || item?.id,
      label: item?.name || item?.title || item?.code || String(item?._id || item?.id || ''),
    })),
    warrantyTemplateList: getListPayload(selector?.getAllWarrantyListData).map((item) => ({
      value: item?.period || item?._id || item?.id,
      label: item?.period || item?.name || String(item?._id || item?.id || ''),
    })),
    colorList: (() => {
      const colorOption = platformOptions.find((item) => String(item.name || item.slug || '').toLowerCase() === 'color');
      const colorValues = colorOption ? (platformValues[colorOption._id || colorOption.id] || []) : [];
      return colorValues
        .filter((item) => item.active !== false)
        .map((item) => ({ value: item.name, label: item.name }));
    })(),
    productFamilyList: getListPayload(adminCoreSelector?.productFamiliesData)
      .map((item) => String(item?.familyCode || item?.code || '').trim())
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .map((code) => ({ value: code, label: code })),
    taxList: transformArray(selector?.getAllTaxListData?.data?.data?.list || []),
    hsnCodeList: getListPayload(selector?.getAllHsnData).map((item) => ({
      value: item.code || item._id || item.id,
      code: item.code,
      label: `${item.code || item._id || item.id} | GST: ${Number(item.gstRate || item.IGST || 0)}%`,
    })),

  }), [selector, adminCoreSelector?.productFamiliesData, platformOptions, platformValues]);

  const createSelectOptions = useMemo(() => {
    const categorySource = getListPayload(selector?.getListData);
    const options = [];
    if (!Array.isArray(categorySource) || categorySource.length === 0) return options;

    const hasNested = categorySource.some(
      (item) => Array.isArray(item?.subcategories) || Array.isArray(item?.subCategories),
    );

    const addOptions = (categories, prefix = '') => {
      if (!Array.isArray(categories)) return;
      categories.forEach((category) => {
        const option = toCategoryOption(category, prefix);
        options.push(option);
        const children = category.subcategories || category.subCategories || [];
        if (Array.isArray(children) && children.length > 0) {
          addOptions(children, option.label);
        }
      });
    };

    if (hasNested) {
      addOptions(categorySource);
      return options;
    }

    const byKey = new Map();
    categorySource.forEach((item) => {
      const key = item?.categoryKey || item?._id;
      if (key) byKey.set(String(key), item);
    });

    const byParent = new Map();
    categorySource.forEach((item) => {
      const parentKey = item?.parentKey ? String(item.parentKey) : "__root__";
      if (!byParent.has(parentKey)) byParent.set(parentKey, []);
      byParent.get(parentKey).push(item);
    });

    const walk = (parentKey = "__root__", prefix = "") => {
      const children = byParent.get(parentKey) || [];
      children
        .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
        .forEach((category) => {
          const option = toCategoryOption(category, prefix);
          options.push(option);
          const key = String(category?.categoryKey || category?._id || "");
          if (key && byParent.has(key)) {
            walk(key, option.label);
          }
        });
    };
    walk("__root__", "");
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
    if (!(formData?.category_id || formData?.category || formData?.category_key)) {
      newErrors.category_id = "Category is required.";
    }
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
      case 'PRODUCT_COLOR':
        setFormData(prev => ({ ...prev, color: selectedOption?.value || "" }));
        break;
      case 'PRODUCT_FAMILY':
        setFormData(prev => ({ ...prev, productFamilyCode: selectedOption?.value || "" }));
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
            countryCode: selectedOption?.value || "",
            country: selectedOption?.label || selectedOption?.value || "",
            state: "",
            stateCode: "",
            city: "",
            cityCode: "",
          },
        }));
        break;
      case 'PRODUCT_STATE':
        setFormData(prev => ({
          ...prev,
          origin: {
            ...(prev.origin || {}),
            stateCode: selectedOption?.value || "",
            state: selectedOption?.label || selectedOption?.value || "",
            city: "",
            cityCode: "",
          },
        }));
        break;
      case 'PRODUCT_CITY':
        setFormData(prev => ({
          ...prev,
          origin: {
            ...(prev.origin || {}),
            cityCode: selectedOption?.value || "",
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

  const productType = formData?.productType || 'simple';

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
    const variableOptionAxes = variantAxes.map((axis, index) => ({
      name: axis.name,
      slug: axis.slug,
      platformOptionId: axis.platformOptionId,
      displayType: axis.displayType,
      values: Array.isArray(axis.values) ? axis.values : [],
      valueCodes: axis.valueCodes || {},
      required: Boolean(axis.required),
      sortOrder: axis.sortOrder ?? index,
    })).filter((axis) => axis.name && axis.values.length);

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
      productFamilyCode: updatedFormData.productFamilyCode,
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
      ...(updatedFormData.productType ? { productType: updatedFormData.productType } : {}),
      ...(updatedFormData.shortDescription ? { shortDescription: updatedFormData.shortDescription } : {}),
      ...(updatedFormData.visibility ? { visibility: updatedFormData.visibility } : {}),
      tags: Array.isArray(updatedFormData.tags) ? updatedFormData.tags : [],
      ...(updatedFormData.seo && Object.keys(updatedFormData.seo).length ? { seo: updatedFormData.seo } : {}),
      ...(updatedFormData.digital && Object.keys(updatedFormData.digital).length ? { digital: updatedFormData.digital } : {}),
      ...(updatedFormData.subscription && Object.keys(updatedFormData.subscription).length ? { subscription: updatedFormData.subscription } : {}),
      ...(Array.isArray(updatedFormData.bundleItems) && updatedFormData.bundleItems.length ? { bundleItems: updatedFormData.bundleItems } : {}),
      ...(typeof updatedFormData.bundleDiscount === 'number' ? { bundleDiscount: updatedFormData.bundleDiscount } : {}),
      options: productType === 'variable' ? variableOptionAxes : formattedOptions,
      ...(variableOptionAxes.length ? { variantAxes: variableOptionAxes.map((axis) => axis.slug || axis.name) } : {}),
      ...(variantsData.length ? {
        variants: variantsData,
        hasVariants: true,
      } : {}),
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
  }, [formData, images, options, dispatch, setFormData, setImages, isEditMode, userData, id, navigate, productType, variantAxes, variantsData]);


  const handleProductDetailChange = (field, content) => {
    setFormData((prev) => ({
      ...prev,
      [field]: content,
    }));
    setError({})
  };

  const handleNestedChange = useCallback((field, value) => {
    const parts = field.split('.');
    if (parts.length === 1) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      const [group, subKey, deepKey] = parts;
      setFormData((prev) => ({
        ...prev,
        [group]: deepKey
          ? { ...(prev[group] || {}), [subKey]: { ...((prev[group] || {})[subKey] || {}), [deepKey]: value } }
          : { ...(prev[group] || {}), [subKey]: value },
      }));
    }
  }, []);

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
          formattedWarrantyList={formattedData.warrantyTemplateList}
          formattedColorList={formattedData.colorList}
          formattedProductFamilyList={formattedData.productFamilyList}
          handleSelectChange={handleSelectChange}
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
      id: 'product-type',
      title: 'Product Type',
      description: 'Set the product type and type-specific configuration.',
      icon: <BsMenuApp />,
      component: (
        <div className="space-y-6">
          <ProductTypeSelector
            value={productType}
            onChange={(val) => setFormData((prev) => ({ ...prev, productType: val }))}
          />

          {/* Short description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Short Description</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094] resize-none"
              placeholder="Brief one-line summary shown in product cards…"
              value={formData?.shortDescription || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Visibility</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
              value={formData?.visibility || 'public'}
              onChange={(e) => setFormData((prev) => ({ ...prev, visibility: e.target.value }))}
            >
              {productVisibilities.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {productType === 'digital' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-gray-800 mb-4">Digital Product Settings</h5>
              <DigitalProductPanel
                digital={formData?.digital || {}}
                onChange={handleNestedChange}
              />
            </div>
          )}

          {productType === 'subscription' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-gray-800 mb-4">Subscription Settings</h5>
              <SubscriptionPanel
                subscription={formData?.subscription || {}}
                onChange={handleNestedChange}
              />
            </div>
          )}

          {productType === 'bundle' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-gray-800 mb-4">Bundle Configuration</h5>
              <BundleBuilder
                bundleItems={formData?.bundleItems || []}
                bundleDiscount={formData?.bundleDiscount || 0}
                onChange={(items) => setFormData((prev) => ({ ...prev, bundleItems: items }))}
                onDiscountChange={(d) => setFormData((prev) => ({ ...prev, bundleDiscount: d }))}
              />
            </div>
          )}
        </div>
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
          optionValues={platformValues}
        />
      )
    },
    {
      id: 'variants-options',
      title: 'Variants & options',
      description: 'Customize the product variants, including size, color, etc.',
      icon: <BsMenuApp />,
      component: productType === 'variable' ? (
        <div className="space-y-2">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-gray-800">Variant Builder</h4>
            <p className="text-xs text-gray-500">Define option axes (Color, Size…), generate combinations, then edit each variant.</p>
          </div>
          <VariantBuilder
            variants={variantsData}
            options={variantAxes}
            basePrice={Number(formData?.price || 0)}
            baseMrp={Number(formData?.mrp || 0)}
            onChange={setVariantsData}
            onOptionsChange={setVariantAxes}
            platformOptions={platformOptions}
            platformValues={platformValues}
            onOptionSearch={handleOptionSearch}
          />
        </div>
      ) : (
        <VariantsOptionsTab
          optionsData={selector?.productOptionListData?.data?.data}
          setVariantRows={setVariantRows}
          options={options}
          formData={formData}
          handleChange={handleChange}
          setFormData={setFormData}
          platformOptions={platformOptions}
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
    {
      id: 'seo',
      title: 'SEO',
      description: 'Search engine metadata and social sharing settings.',
      icon: <GrDocument />,
      component: (
        <div className="space-y-2">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-gray-800">SEO &amp; Metadata</h4>
            <p className="text-xs text-gray-500">Optimise how this product appears in Google and social sharing.</p>
          </div>
          <SEOPanel
            seo={formData?.seo || {}}
            onChange={handleNestedChange}
            slug={formData?.slug || ''}
          />
        </div>
      )
    },
    {
      id: 'tags',
      title: 'Tags & Discovery',
      description: 'Tags, badges, and discoverability settings.',
      icon: <BsMenuApp />,
      component: (
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-800">Product Tags</h4>
            <p className="text-xs text-gray-500 mb-2">Tags help customers find this product through search and filters.</p>
            <TagsInput
              tags={Array.isArray(formData?.tags) ? formData.tags : []}
              onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
              placeholder="Add tag…"
              maxTags={20}
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">Product Badges</h4>
            {[
              { key: 'markAsFeatured', label: 'Featured', desc: 'Show on homepage / featured sections.' },
              { key: 'cod', label: 'Cash on Delivery', desc: 'Allow COD payment for this product.' },
              { key: 'prescription_required', label: 'Prescription Required', desc: 'Customer must upload a prescription.' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[#3E4094]"
                  checked={!!formData?.[key]}
                  onChange={() => handleToggleProductSetting(key === 'markAsFeatured' ? 'FEATURED' : key === 'cod' ? 'COD' : 'prescription_required')}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )
    },
  ], [
    formData, productType, formattedData, createSelectOptions,
    handleChange, handleSelectChange, handleNestedChange,
    selector, options, variantsData, variantAxes, categoryAttributeSchema, error, images,
  ]);

  const flowReadiness = useMemo(() => {
    const items = [
      { label: 'Categories', count: createSelectOptions?.length || 0, route: '/app/categories' },
      { label: 'Attributes (selected category)', count: categoryAttributeSchema?.length || 0, route: '/app/category-attributes' },
      { label: 'Brands', count: formattedData?.brandList?.length || 0, route: '/app/brands' },
      { label: 'HSN Codes', count: formattedData?.hsnCodeList?.length || 0, route: '/app/hsn-code' },
      { label: 'Warranty Templates', count: formattedData?.warrantyTemplateList?.length || 0, route: '/app/warranty' },
    ];
    return items;
  }, [createSelectOptions, categoryAttributeSchema, formattedData]);

  const flowGateErrors = useMemo(() => {
    const blockers = [];
    const isVariableProduct = (formData?.productType || 'simple') === 'variable';
    if (!createSelectOptions?.length) {
      blockers.push({ key: 'categories', message: 'Create at least one category before creating products.', route: '/app/categories' });
    }
    if (!formattedData?.brandList?.length) {
      blockers.push({ key: 'brands', message: 'Create at least one brand to assign products properly.', route: '/app/brands' });
    }
    if (!formattedData?.hsnCodeList?.length) {
      blockers.push({ key: 'hsn', message: 'Create at least one HSN code so tax mapping is consistent.', route: '/app/hsn-code' });
    }
    if (!formData?.brand) {
      blockers.push({ key: 'brand_selected', message: 'Select a brand for this product.', route: '/app/brands' });
    }
    if (!formData?.hsnCode && !formData?.hsn_code) {
      blockers.push({ key: 'hsn_selected', message: 'Select an HSN code for this product.', route: '/app/hsn-code' });
    }
    if (isVariableProduct && !formattedData?.productFamilyList?.length) {
      blockers.push({ key: 'family', message: 'Create at least one product family code for variable products.', route: '/app/product-families' });
    }
    if (isVariableProduct && !formData?.productFamilyCode) {
      blockers.push({ key: 'family_selected', message: 'Select a product family code for this variable product.', route: '/app/product-families' });
    }
    return blockers;
  }, [createSelectOptions, formattedData, formData]);

  const handleValidateAndSubmit = useCallback(() => {
    const isBasicFormValid = validateForm();
    if (!isBasicFormValid) return;
    if (flowGateErrors.length) {
      setError((prev) => ({
        ...(prev || {}),
        flow: `Complete ${flowGateErrors.length} setup ${flowGateErrors.length > 1 ? 'items' : 'item'} before saving.`,
      }));
      toast.error('Product flow is incomplete. Complete the highlighted setup items first.');
      return;
    }
    setError((prev) => {
      if (!prev?.flow) return prev;
      const next = { ...prev };
      delete next.flow;
      return next;
    });
    handleSaveSubmit();
  }, [flowGateErrors, handleSaveSubmit]);


  return (
    <div className='relative min-h-screen p-2 mx-auto max-w-7xl'>
      <Loader loading={loading} />
      <Breadcrumb isEditMode={isEditMode} />
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm font-semibold text-blue-900">Master Data Readiness</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {flowReadiness.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.route)}
              className={`rounded border px-2 py-1 text-xs ${item.count > 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}
            >
              {item.label}: {item.count}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/app/product-flow')}
            className="rounded bg-[#3E4094] px-3 py-1 text-xs text-white"
          >
            Open Full Flow
          </button>
        </div>
      </div>
      {flowGateErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Complete Product Setup Flow Before Save</p>
          <ul className="mt-2 space-y-2 text-xs text-amber-900">
            {flowGateErrors.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-2 rounded border border-amber-200 bg-white p-2">
                <span>{item.message}</span>
                <button
                  type="button"
                  className="rounded bg-amber-600 px-2 py-1 text-white"
                  onClick={() => navigate(item.route)}
                >
                  Fix Now
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error?.flow && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {error.flow}
        </div>
      )}
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
          <ProductSettingsPanel handleSaveSubmit={handleValidateAndSubmit} formData={formData} handleToggleProductSetting={handleToggleProductSetting}
          />
        </div>
      </div>
    </div>
  );
}
