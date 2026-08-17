/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BasicDetailsTab from "./BasicDetailsTab";
import ProductSettingsPanel from "./ProductSettingsPanel";
import { useDispatch, useSelector } from "react-redux";
import {
  createProducts,
  getProductPrefill,
  getProductPrefillProducts,
  getProductPrefillLocations,
  getProductById,
  updateProductsById,
  getCategoryAttributes,
} from "../../../../Redux/productSlice";
import {
  getPlatformOptions,
  getPlatformOptionValues,
} from "../../../../Redux/adminCoreSlice";
import {
  transformArray,
  uploadFileMulti,
  uploadVideoFile,
} from "../../../../_helpers/globalFunctions";
import Loader from "../../../../components/Loader/Loader";
import { getAllStateList } from "../../../../Redux/stateSlice";
import { getAllCityList } from "../../../../Redux/citySlice";
import { GrDocument } from "react-icons/gr";
import { FiTrash2, FiAlertCircle, FiPlus } from "react-icons/fi";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import TabNavigation from "./TabNavigation";
import Breadcrumb from "./Breadcrumb";
import selectJson from "../../../../_helpers/SelectJson.json";
import { BsMenuApp } from "react-icons/bs";
import DynamicAttributesTab from "./DynamicAttributesTab";
import VariantBuilder from "../../../../components/Product/VariantBuilder";
import SEOPanel from "../../../../components/Product/SEOPanel";
import TagsInput from "../../../../components/Product/TagsInput";
import { getSelectedSellerOrganizationId } from "../../../../_helpers/sellerOrganizationContext";
import { getShippingProfiles } from "../../../../Redux/deliverySlice";
import { getShippingProfileTemplates } from "../../../../Redux/deliverySlice";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import {
  extractRole,
  getStoredRole,
  getStoredUser,
  normalizeRole,
} from "../../../../_helpers/authStorage";
import { isSellerPanel } from "../../../../_helpers/panelConfig";

const API_CALLS = [
  {
    action: () => getProductPrefill({ includeProducts: false, limit: 20 }),
    name: "Product Prefill Basic+Lookups",
  },
];

const API_CALL_OBJECT = {
  "Category List": {
    action: () => getProductPrefill({ includeProducts: true, limit: 100 }),
    name: "Product Prefill",
  },
  "Country List": {
    action: () => getProductPrefill({ includeProducts: true, limit: 100 }),
    name: "Product Prefill",
  },
  "Hsn code list": {
    action: () => getProductPrefill({ includeProducts: true, limit: 100 }),
    name: "Product Prefill",
  },
};

const DEFAULT_PRODUCT_VARIANT = {
  sku: "",
  title: "Default",
  price: "",
  mrp: "",
  salePrice: "",
  stock: 0,
  gstRate: 18,
  status: "active",
  isDefault: true,
  sortOrder: 0,
  attributes: {},
};

const SELLER_PANEL_ROLES = new Set([
  "seller",
  "seller-admin",
  "seller-sub-admin",
]);
const MAX_COMMON_PRODUCT_IMAGES = 8;
const getSessionUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem("EcomAdmin") || "null");
  } catch {
    return null;
  }
};
// const DEAL_BADGE_OPTIONS = [
//   "Today's Deal",
//   "Flash Sale",
//   "Hot Deal",
//   "Limited Offer",
//   "Best Deal",
//   "Festival Offer",
//   "Mega Sale",
// ];
// const DEAL_SOURCE_OPTIONS = [
//   { value: "admin_direct", label: "Admin Direct" },
//   { value: "seller_request", label: "Seller Request" },
//   { value: "marketing_campaign", label: "Marketing Campaign" },
//   { value: "seasonal_campaign", label: "Seasonal Campaign" },
// ];

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const toOptionalNumber = (value) => {
  if (!hasValue(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const normalizeProductServiceabilityMode = (mode) => {
  const value = String(mode || "")
    .trim()
    .toLowerCase();
  const modeMap = {
    inherit: "inherit",
    all_india: "all_pincodes",
    all_locations: "all_pincodes",
    all_pincodes: "all_pincodes",
    selected_pincodes: "allowlist",
    serviceable_pincodes: "allowlist",
    allow_pincodes: "allowlist",
    allowlist: "allowlist",
    selected_states: "regions",
    selected_cities: "regions",
    regions: "regions",
    disabled: "disabled",
  };
  return modeMap[value] || "inherit";
};

const normalizePincodeList = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/[\n,]+/);
  return Array.from(
    new Set(source.map((item) => String(item || "").trim()).filter(Boolean)),
  );
};

const isValidIndianPincode = (value) =>
  /^\d{6}$/.test(String(value || "").trim());

const inferWarrantyDuration = (template = {}) => {
  const metadata = template?.metadata || {};
  const directValue = template?.durationValue ?? metadata.durationValue;
  const directUnit = template?.durationUnit || metadata.durationUnit;

  if (directValue !== undefined && directValue !== null && directUnit) {
    return { value: directValue, unit: directUnit };
  }

  const durationMonths = template?.durationMonths ?? metadata.durationMonths;
  if (durationMonths !== undefined && durationMonths !== null) {
    return { value: durationMonths, unit: "months" };
  }

  const label = String(template?.period || template?.name || "")
    .trim()
    .toLowerCase();
  if (!label || label.includes("no warranty")) {
    return { value: 0, unit: "months" };
  }

  const match = label.match(
    /(\d+)\s*(day|days|week|weeks|month|months|year|years)?/,
  );
  if (!match) return null;

  const unitMap = {
    day: "days",
    days: "days",
    week: "weeks",
    weeks: "weeks",
    month: "months",
    months: "months",
    year: "years",
    years: "years",
  };

  return {
    value: Number(match[1]),
    unit: unitMap[match[2]] || "months",
  };
};

const compactObject = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(compactObject)
      .filter(
        (item) =>
          hasValue(item) &&
          !(
            typeof item === "object" &&
            !Array.isArray(item) &&
            Object.keys(item).length === 0
          ),
      );
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    const nextValue = compactObject(item);
    if (!hasValue(nextValue)) return acc;
    if (
      typeof nextValue === "object" &&
      !Array.isArray(nextValue) &&
      Object.keys(nextValue).length === 0
    ) {
      return acc;
    }
    acc[key] = nextValue;
    return acc;
  }, {});
};

export default function ProductManagementUI() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.product);
  const adminCoreSelector = useSelector((state) => state.adminCore);
  const mainContainerRef = useRef(null);
  const pendingValidationScrollRef = useRef(false);
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(Boolean(id));
  const [prefilledProductId, setPrefilledProductId] = useState(null);
  const [productLoadFailed, setProductLoadFailed] = useState(false);
  const [error, setError] = useState(null);
  let { INITIALS_DATA } = selectJson;
  const [formData, setFormData] = useState(INITIALS_DATA);
  const [commonImageUrl, setCommonImageUrl] = useState("");
  const [commonImagesUploading, setCommonImagesUploading] = useState(false);
  const [productVideoUploading, setProductVideoUploading] = useState(false);
  const [options, setVariantRows] = useState([
    {
      sku: "",
      type: null,
      remark: "",
      packaging: "",
      mrp: "",
      discount: "",
      salePrice: "",
      stock: "",
    },
  ]);
  const [activeTab, setActiveTab] = useState("basic-details");
  const [isScrolling, setIsScrolling] = useState(false);
  const isEditMode = id ? true : false;
  const [taxData, setTaxData] = useState(null);
  const [userData, setUserData] = useState({});
  const [categoryAttributeSchema, setCategoryAttributeSchema] = useState([]);
  const [useManualAttributes] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");
  const [manualAttrErrors, setManualAttrErrors] = useState({});
  const [variantsData, setVariantsData] = useState([DEFAULT_PRODUCT_VARIANT]);
  const [variantAxes, setVariantAxes] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);
  const [platformValues, setPlatformValues] = useState({});
  const fetchedOptionIds = useRef(new Set());
  const [saving, setSaving] = useState(false);
  const [shippingProfileOptions, setShippingProfileOptions] = useState([]);
  const [allowedPincodeInput, setAllowedPincodeInput] = useState("");

  const calculatePriceWithTax = (product, basePrice) => {
    const igst = product?.IGST ?? 0;
    const additionalTax = product?.additionalTax ?? 0;
    const sgst = product?.SGST ?? 0;
    const cgst = product?.CGST ?? 0;
    const totalTaxRate = igst + additionalTax + sgst + cgst;
    const taxAmount = (basePrice * totalTaxRate) / 100;
    const priceWithTax = Number(basePrice) + Number(taxAmount);
    return priceWithTax;
  };

  const getListPayload = (sliceData) => {
    const data =
      sliceData?.data?.data ||
      sliceData?.normalized?.data ||
      sliceData?.data ||
      {};
    if (Array.isArray(data)) return data;
    return data.list || data.items || [];
  };

  const prefillData = useMemo(() => {
    const data =
      selector?.productPrefillData?.data?.data ||
      selector?.productPrefillData?.normalized?.data ||
      selector?.productPrefillData?.data ||
      {};
    return data && typeof data === "object" ? data : {};
  }, [selector?.productPrefillData]);

  const prefillList = useCallback(
    (key, fallback = []) => {
      const value = prefillData?.[key];
      return Array.isArray(value) ? value : fallback;
    },
    [prefillData],
  );

  const toSelectId = (record = {}) =>
    String(
      record.categoryKey ||
        record._id ||
        record.id ||
        record.value ||
        record.code ||
        "",
    );

  const toCategoryOption = (category = {}, prefix = "") => {
    const categoryName =
      category.name || category.title || category.categoryKey;
    return {
      value: toSelectId(category),
      categoryKey: category.categoryKey || toSelectId(category),
      label: prefix ? `${prefix} > ${categoryName}` : categoryName,
    };
  };

  const refs = {
    "basic-details": useRef(null),
    "product-details": useRef(null),
    "common-images": useRef(null),
    "product-type": useRef(null),
    "variants-options": useRef(null),
    shipping: useRef(null),
    seo: useRef(null),
    tags: useRef(null),
  };

  const FIELD_TO_SECTION = {
    sellerId: "basic-details",
    organizationId: "basic-details",
    name: "basic-details",
    brand: "basic-details",
    description: "basic-details",
    category_id: "basic-details",
    hsn_code: "basic-details",
    productFamilyCode: "basic-details",
    variants: "variants-options",
    attributes: "product-details",
    shipping: "shipping",
    seo: "seo",
    tags: "tags",
  };

  const scrollToFirstValidationError = (errors, attempt = 0) => {
    const sectionOrder = [
      "basic-details",
      "product-details",
      "common-images",
      "variants-options",
      "shipping",
      "seo",
      "tags",
    ];
    const errorFields = Object.keys(errors || {});
    const firstField = errorFields
      .map((field, index) => ({
        field,
        index,
        sectionIndex: sectionOrder.indexOf(
          FIELD_TO_SECTION[field] || "basic-details",
        ),
      }))
      .sort(
        (a, b) =>
          (a.sectionIndex < 0 ? sectionOrder.length : a.sectionIndex) -
            (b.sectionIndex < 0 ? sectionOrder.length : b.sectionIndex) ||
          a.index - b.index,
      )[0]?.field;
    if (!firstField || typeof document === "undefined") return;

    let nestedFieldSelector = null;
    if (
      firstField === "variants" &&
      errors?.variants &&
      typeof errors.variants === "object"
    ) {
      const firstVariantIndex = Object.keys(errors.variants).find(
        (key) => key !== "_form",
      );
      const firstVariantField = firstVariantIndex
        ? Object.keys(errors.variants[firstVariantIndex] || {})[0]
        : null;
      if (firstVariantIndex !== undefined && firstVariantField) {
        nestedFieldSelector = `[name="variants.${firstVariantIndex}.${firstVariantField}"]`;
      }
    }

    const sectionId = FIELD_TO_SECTION[firstField] || "basic-details";
    if (activeTab !== sectionId) setActiveTab(sectionId);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const selectors = [
          nestedFieldSelector,
          `[name="${firstField}"]`,
          `[id="${firstField}"]`,
          `[data-error-field="${firstField}"]`,
        ].filter(Boolean);
        let field = null;
        const formRoot = mainContainerRef.current;

        for (const selector of selectors) {
          const matches = Array.from(
            (formRoot || document).querySelectorAll(selector),
          );
          const found =
            matches.find(
              (element) =>
                element.getClientRects().length > 0 &&
                !element.closest("[aria-hidden='true']"),
            ) || matches[0];
          if (found) {
            field = found;
            break;
          }
        }
        const target =
          field?.closest?.(".admin-field") || field || refs[sectionId]?.current;
        if (target?.scrollIntoView) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        const focusTarget = field?.matches?.("input, select, textarea")
          ? field
          : field?.querySelector?.(
              "input:not([type='hidden']), select, textarea",
            );
        if (focusTarget && focusTarget.type !== "file") {
          focusTarget.focus({ preventScroll: true });
        }

        if (!field && attempt < 5) {
          setTimeout(
            () => scrollToFirstValidationError(errors, attempt + 1),
            150,
          );
        }
      });
    });
  };

  // Validation messages change the form's height. Wait until React has painted
  // them before measuring and scrolling to the first invalid control.
  useEffect(() => {
    if (!pendingValidationScrollRef.current || !error) return undefined;

    pendingValidationScrollRef.current = false;
    const timeoutId = setTimeout(() => {
      scrollToFirstValidationError(error);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [error]);

  const fetchProductById = async (productId) => {
    setProductLoading(true);
    setProductLoadFailed(false);
    setPrefilledProductId(null);
    try {
      return dispatch(getProductById({ _id: productId }))
        .unwrap()
        .then((res) => {
          const productData = res?.data;
          const resolvedCategoryId =
            productData?.categoryId ||
            productData?.category_id ||
            productData?.categoryKey ||
            productData?.category ||
            "";
          const resolvedCategoryKey =
            productData?.categoryKey ||
            productData?.category_key ||
            productData?.category ||
            resolvedCategoryId;
          setFormData({
            ...INITIALS_DATA,
            ...productData,
            name: productData?.title || productData?.name || "",
            category_id: resolvedCategoryId,
            categoryId: resolvedCategoryId,
            category: resolvedCategoryKey,
            category_key: resolvedCategoryKey,
            sellerId: productData?.sellerId || "",
            organizationId: productData?.organizationId || "",
            storeId: productData?.storeId || "",
            warehouseId: productData?.warehouseId || "",
            stock: productData?.stock ?? "",
            price: productData?.price ?? "",
            mrp: productData?.mrp ?? "",
            salePrice: productData?.salePrice ?? "",
            isDealProduct: Boolean(productData?.metadata?.isDealProduct),
            dealBadge:
              productData?.metadata?.dealBadge || INITIALS_DATA.dealBadge,
            dealSource:
              productData?.metadata?.dealSource || INITIALS_DATA.dealSource,
            gstRate: productData?.gstRate ?? 18,
            gstInclusive: productData?.gstInclusive ?? true,
            attributes: productData?.attributes || {},
            shipping: {
              ...(productData?.shipping || {}),
              codAvailable:
                productData?.shipping?.codAvailable ??
                productData?.metadata?.codAvailable ??
                false,
            },
            options: productData?.options || [
              {
                sku: "",
                type: null,
                remark: "",
                packaging: "",
                mrp: "",
                discount: "",
                salePrice: "",
                stock: "",
              },
            ],
          });

          const sourceVariants = productData?.variants?.length
            ? productData.variants
            : productData?.options;
          if (sourceVariants && Array.isArray(sourceVariants)) {
            const formattedOptions = sourceVariants.map((option, index) => ({
              id: option._id || Date.now() + index,
              sku: option.sku || "",
              type:
                option.type || Object.keys(option.attributes || {})[0] || "",
              remark: option.remark || "",
              packaging: option.packaging || "",
              mrp: option.mrp || "",
              discount: option.discount || "",
              salePrice: option.salePrice || option.price || "",
              stock: option.stock || "",
              images: option.images || [],
            }));
            setVariantRows(formattedOptions);
          }

          if (
            Array.isArray(productData?.variants) &&
            productData.variants.length
          ) {
            setVariantsData(
              productData.variants.map((variant, index) => ({
                ...variant,
                isDefault:
                  variant.isDefault === true ||
                  (!productData.variants.some((item) => item.isDefault) &&
                    index === 0),
                sortOrder: variant.sortOrder ?? index,
              })),
            );
          } else {
            setVariantsData([
              {
                ...DEFAULT_PRODUCT_VARIANT,
                sku: productData?.sku || "",
                title:
                  productData?.color && productData.color !== "default"
                    ? productData.color
                    : "Default",
                price: productData?.price ?? "",
                mrp: productData?.mrp ?? "",
                salePrice: productData?.salePrice ?? "",
                stock: productData?.stock ?? 0,
                attributes:
                  productData?.color && productData.color !== "default"
                    ? { color: productData.color }
                    : {},
              },
            ]);
          }
          if (
            Array.isArray(productData?.options) &&
            productData.options.length
          ) {
            setVariantAxes(productData.options);
          } else if (
            Array.isArray(productData?.variantAxes) &&
            productData.variantAxes.length
          ) {
            setVariantAxes(
              productData.variantAxes.map((axis, index) => ({
                name: String(axis || ""),
                values: [],
                sortOrder: index,
              })),
            );
          }

          if (res?.data?.hsnCode || res?.data?.hsn_code) {
            const hsnValue = res?.data?.hsnCode || res?.data?.hsn_code;
            const hsnCodeData = prefillList(
              "hsnCodes",
              getListPayload(selector?.getAllHsnData),
            ).find(
              (item) =>
                item?.code === hsnValue ||
                item?._id === hsnValue ||
                item?.id === hsnValue,
            );
            if (hsnCodeData) {
              setTaxData(hsnCodeData);
            }
          }
          setPrefilledProductId(String(productId));
        })
        .catch((err) => {
          setProductLoadFailed(true);
          toast.error(err?.message || "Error fetching product");
        })
        .finally(() => setProductLoading(false));
    } catch (err) {
      setProductLoadFailed(true);
      setProductLoading(false);
      toast.error(err?.message || "Failed to fetch product");
    }
  };

  const fetchAllData = useCallback(
    async (callsArray = API_CALLS) => {
      // setLoading(true);
      try {
        const results = await Promise.allSettled(
          callsArray.map(
            ({ action }) => dispatch(action()).unwrap?.() || dispatch(action()),
          ),
        );

        const failedCalls = results
          .filter(({ status }) => status === "rejected")
          .map((_, index) => callsArray[index].name);

        if (failedCalls.length > 0) {
          toast.error(
            `Some data failed to load: ${failedCalls.join(", ")}. Please refresh to try again.`,
          );
        } else {
          // setApiCallsCompleted(true);
        }
      } catch (err) {
        toast.error(
          err ||
            "Failed to load product data. Please refresh the page and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const userDataString = sessionStorage.getItem("EcomAdmin");
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    fetchAllData();
  }, [fetchAllData]);

  // background-load heavy prefill parts once initial prefill has completed
  useEffect(() => {
    if (loading) return;
    // fetch larger payloads in background without blocking UI
    (async () => {
      try {
        // products (related products) can be heavy
        dispatch(getProductPrefillProducts({ includeProducts: true, productLimit: 100 })).catch(() => {});
        // locations (cities/states/warehouses)
        dispatch(getProductPrefillLocations({})).catch(() => {});
      } catch (err) {
        // intentionally swallow—these are background best-effort loads
      }
    })();
  }, [loading, dispatch]);

  useEffect(() => {
    if (id) {
      fetchProductById(id);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const categoryKey =
      formData?.category_key ||
      formData?.category ||
      formData?.category_id ||
      formData?.categoryId;
    if (!categoryKey) {
      setCategoryAttributeSchema([]);
      return;
    }

    const cachedCategoryAttributes = prefillList("categoryAttributes").find(
      (item) =>
        String(item.categoryKey || item.categoryId || item._id || "") ===
        String(categoryKey),
    );
    if (cachedCategoryAttributes) {
      const schema = cachedCategoryAttributes.attributeSchema || [];
      setCategoryAttributeSchema(schema);
      schema.forEach((field) => {
        const optId = field.platformOptionId;
        if (!optId || fetchedOptionIds.current.has(optId)) return;
        const cachedValues = prefillData.optionValuesByOptionId?.[optId] || [];
        if (cachedValues.length) {
          fetchedOptionIds.current.add(optId);
          setPlatformValues((prev) => ({ ...prev, [optId]: cachedValues }));
        }
      });
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
          dispatch(
            getPlatformOptionValues({
              optionId: optId,
              limit: 100,
              active: true,
            }),
          )
            .unwrap()
            .then((valueRes) => {
              const raw = valueRes?.data;
              const list = Array.isArray(raw)
                ? raw
                : raw?.list || raw?.items || [];
              setPlatformValues((prev) => ({ ...prev, [optId]: list }));
            })
            .catch(() => {
              fetchedOptionIds.current.delete(optId);
            });
        });
      })
      .catch(() => {
        setCategoryAttributeSchema([]);
      });
  }, [
    dispatch,
    formData?.category_key,
    formData?.category,
    formData?.category_id,
    formData?.categoryId,
    prefillData.optionValuesByOptionId,
    prefillList,
  ]);

  useEffect(() => {
    const originCountry =
      formData?.origin?.countryCode || formData?.origin?.country;
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
    const cachedOptions = prefillList("productOptions");
    if (cachedOptions.length) {
      const valuesByOptionId = prefillData.optionValuesByOptionId || {};
      setPlatformOptions(cachedOptions);
      setPlatformValues(valuesByOptionId);
      Object.keys(valuesByOptionId).forEach((optionId) =>
        fetchedOptionIds.current.add(optionId),
      );
      return;
    }

    dispatch(getPlatformOptions({ limit: 100, active: true }))
      .unwrap()
      .then((res) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : res?.data?.list || res?.data?.items || [];
        setPlatformOptions(list);
      })
      .catch(() => {});
  }, [dispatch, prefillData.optionValuesByOptionId, prefillList]);

  useEffect(() => {
    platformOptions.forEach((option) => {
      const optId = option._id || option.id;
      if (!optId || fetchedOptionIds.current.has(optId)) return;
      const cachedValues = prefillData.optionValuesByOptionId?.[optId] || [];
      if (cachedValues.length) {
        fetchedOptionIds.current.add(optId);
        setPlatformValues((prev) => ({ ...prev, [optId]: cachedValues }));
        return;
      }
      fetchedOptionIds.current.add(optId);
      dispatch(
        getPlatformOptionValues({ optionId: optId, limit: 100, active: true }),
      )
        .unwrap()
        .then((res) => {
          const raw = res?.data;
          const list = Array.isArray(raw) ? raw : raw?.list || raw?.items || [];
          setPlatformValues((prev) => ({ ...prev, [optId]: list }));
        })
        .catch(() => {
          fetchedOptionIds.current.delete(optId);
        });
    });
  }, [dispatch, platformOptions, prefillData.optionValuesByOptionId]);

  // When a platform-linked axis is added to variantAxes, load its values
  useEffect(() => {
    variantAxes.forEach((axis) => {
      const optId = axis.platformOptionId;
      if (!optId || fetchedOptionIds.current.has(optId)) return;
      const cachedValues = prefillData.optionValuesByOptionId?.[optId] || [];
      if (cachedValues.length) {
        fetchedOptionIds.current.add(optId);
        setPlatformValues((prev) => ({ ...prev, [optId]: cachedValues }));
        return;
      }
      fetchedOptionIds.current.add(optId);
      dispatch(
        getPlatformOptionValues({ optionId: optId, limit: 100, active: true }),
      )
        .unwrap()
        .then((res) => {
          const list = Array.isArray(res?.data)
            ? res.data
            : res?.data?.list || res?.data?.items || [];
          setPlatformValues((prev) => ({ ...prev, [optId]: list }));
        })
        .catch(() => {
          fetchedOptionIds.current.delete(optId);
        });
    });
  }, [dispatch, variantAxes, prefillData.optionValuesByOptionId]);

  const userRole = normalizeRole(
    extractRole(
      userData,
      userData?.user,
      userData?.data,
      getSessionUser(),
      getSessionUser()?.user,
      getStoredUser(),
      { role: getStoredRole() },
    ),
  );
  const isSellerPanelUser = isSellerPanel() || SELLER_PANEL_ROLES.has(userRole);

  // Load shipping profiles whenever the seller / org context changes.
  // Admin users also see admin-authored templates here so they can assign
  // reusable delivery rules directly while creating/updating products.
  useEffect(() => {
    const sid =
      formData?.sellerId ||
      userData?.ownerSellerId ||
      userData?._id ||
      userData?.id;
    const requests = [];
    if (sid) {
      const params = { sellerId: sid, active: true, limit: 100 };
      if (formData?.organizationId)
        params.organizationId = formData.organizationId;
      requests.push(
        dispatch(getShippingProfiles(params))
          .unwrap()
          .then((res) => {
            const list =
              res?.data?.profiles ||
              res?.data?.data?.profiles ||
              res?.normalized?.data?.profiles ||
              res?.profiles ||
              [];
            return list.map((p) => ({
              value: p.id,
              label: p.name,
              profile: p,
              type: "profile",
            }));
          })
          .catch(() => []),
      );
    }
    if (!isSellerPanelUser) {
      requests.push(
        dispatch(
          getShippingProfileTemplates({
            status: "published",
            active: true,
            limit: 100,
          }),
        )
          .unwrap()
          .then((res) => {
            const data = res?.data?.data || res?.data || res || {};
            const list = Array.isArray(data)
              ? data
              : data.templates || data.items || data.list || [];
            return list.map((template) => ({
              value: `template:${template.id}`,
              label: `Template: ${template.name}`,
              profile: {
                ...template,
                id: `template:${template.id}`,
                sourceTemplateId: template.id,
                sourceType: "template",
              },
              type: "template",
            }));
          })
          .catch(() => []),
      );
    }
    if (!requests.length) {
      setShippingProfileOptions([]);
      return;
    }
    Promise.all(requests).then((groups) => {
      setShippingProfileOptions(groups.flat());
    });
  }, [
    dispatch,
    formData?.sellerId,
    formData?.organizationId,
    isSellerPanelUser,
    userData,
  ]);

  const handleOptionSearch = useCallback(
    (query) => {
      dispatch(
        getPlatformOptions({ limit: 100, active: true, q: query || undefined }),
      )
        .unwrap()
        .then((res) => {
          const list = Array.isArray(res?.data)
            ? res.data
            : res?.data?.list || res?.data?.items || [];
          setPlatformOptions(list);
        })
        .catch(() => {});
    },
    [dispatch],
  );

  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sideScrollOffset = Math.min(scrollTop * 0.2, 200);

      [container.previousElementSibling, container.nextElementSibling].forEach(
        (panel) => {
          if (panel)
            panel.style.transform = `translateY(-${sideScrollOffset}px)`;
        },
      );
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const formattedData = useMemo(
    () => ({
      brandList: prefillList(
        "brands",
        getListPayload(selector?.getAllBrandListData),
      ).map((item) => ({
        value: item?.name || item?._id || item?.id,
        label:
          item?.name ||
          item?.title ||
          item?.code ||
          String(item?._id || item?.id || ""),
      })),
      warrantyTemplateList: prefillList(
        "warrantyTemplates",
        getListPayload(selector?.getAllWarrantyListData),
      )
        .map((item) => {
          const metadata = item?.metadata || {};
          const duration = inferWarrantyDuration(item);
          const durationValue = duration?.value;
          const durationUnit = duration?.unit;
          const supportedUnits = new Set(["days", "weeks", "months", "years"]);

          if (
            durationValue === undefined ||
            durationValue === null ||
            !supportedUnits.has(durationUnit)
          )
            return null;

          return {
            value: `${durationValue}:${durationUnit}`,
            label:
              item?.period || item?.name || String(item?._id || item?.id || ""),
            durationValue,
            durationUnit,
            sortOrder: metadata.sortOrder || 999,
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
        ),
      colorList: (() => {
        const colorOption = platformOptions.find(
          (item) =>
            String(item.name || item.slug || "").toLowerCase() === "color",
        );
        const colorValues = colorOption
          ? platformValues[colorOption._id || colorOption.id] || []
          : [];
        return colorValues
          .filter((item) => item.active !== false)
          .map((item) => ({ value: item.name, label: item.name }));
      })(),
      productFamilyList: prefillList(
        "productFamilies",
        getListPayload(adminCoreSelector?.productFamiliesData),
      )
        .map((item) => String(item?.familyCode || item?.code || "").trim())
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .map((code) => ({ value: code, label: code })),
      taxList: transformArray(
        selector?.getAllTaxListData?.data?.data?.list || [],
      ),
      hsnCodeList: prefillList(
        "hsnCodes",
        getListPayload(selector?.getAllHsnData),
      ).map((item) => {
        const code = item.code || item._id || item.id;
        const desc = item.description || "";
        const gst = Number(item.gstRate || item.IGST || 0);
        return {
          value: code,
          code: item.code,
          description: desc,
          hsnCategory: item.category || "",
          gstRate: gst,
          label: [code, desc ? ` - ${desc}` : "", ` (${gst}% GST)`].join(""),
        };
      }),
      countryList: transformArray(prefillList("countries")),
      sellerList: transformArray(prefillList("sellers")),
      organizationList: prefillList("organizations").map((item) => ({
        value: item.id || item.organizationId,
        label: [
          item.storeDisplayName ||
            item.legalBusinessName ||
            item.id ||
            item.organizationId,
          item.gstin ? `GSTIN ${item.gstin}` : null,
          item.approvalStatus
            ? String(item.approvalStatus).replace(/_/g, " ")
            : null,
        ]
          .filter(Boolean)
          .join(" | "),
        sellerId: item.sellerId,
        approvalStatus: item.approvalStatus,
        raw: item,
      })),
    }),
    [
      selector,
      adminCoreSelector?.productFamiliesData,
      platformOptions,
      platformValues,
      prefillList,
    ],
  );

  const organizationOptions = useMemo(() => {
    const selectedSellerId = String(
      formData?.sellerId ||
        userData?.ownerSellerId ||
        userData?._id ||
        userData?.id ||
        "",
    );
    if (!selectedSellerId) return formattedData.organizationList;
    return formattedData.organizationList.filter(
      (option) => String(option.sellerId || "") === selectedSellerId,
    );
  }, [formattedData.organizationList, formData?.sellerId, userData]);

  useEffect(() => {
    if (isSellerPanelUser) {
      // Seller panel: use the active organization resolved by the session/header sync.
      const activeOrgId = getSelectedSellerOrganizationId();
      if (activeOrgId && formData?.organizationId !== activeOrgId) {
        setFormData((prev) => ({ ...prev, organizationId: activeOrgId }));
      }
      return;
    }

    // Admin: derive from the organization list (existing behavior)
    if (formData?.organizationId) {
      const exists = organizationOptions.some(
        (option) => String(option.value) === String(formData.organizationId),
      );
      if (!exists) {
        setFormData((prev) => ({ ...prev, organizationId: "" }));
      }
      return;
    }
    if (organizationOptions.length === 1) {
      setFormData((prev) => ({
        ...prev,
        organizationId: organizationOptions[0].value,
      }));
    }
  }, [organizationOptions, formData?.organizationId, isSellerPanelUser]);

  const createSelectOptions = useMemo(() => {
    const categorySource = prefillList(
      "categories",
      getListPayload(selector?.getListData),
    );
    const options = [];
    if (!Array.isArray(categorySource) || categorySource.length === 0)
      return options;

    const hasNested = categorySource.some(
      (item) =>
        Array.isArray(item?.children) ||
        Array.isArray(item?.subcategories) ||
        Array.isArray(item?.subCategories),
    );

    const addOptions = (categories, prefix = "") => {
      if (!Array.isArray(categories)) return;
      categories.forEach((category) => {
        const option = toCategoryOption(category, prefix);
        options.push(option);
        const children =
          category.children ||
          category.subcategories ||
          category.subCategories ||
          [];
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
  }, [selector?.getListData, prefillList]);

  const validateForm = () => {
    const newErrors = {};

    // Product name validation
    const productName = String(formData?.name || "").trim();

    if (!productName) {
      newErrors.name = "Product name is required.";
    } else if (productName.length < 3) {
      newErrors.name = "Product name must be at least 3 characters.";
    } else if (productName.length > 200) {
      newErrors.name = "Product name must not be more than 200 characters.";
    }

    // Description validation
    const description = formData?.description || "";

    const plainDescription = description
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!plainDescription) {
      newErrors.description = "Description is required.";
    } else if (plainDescription.length < 10) {
      newErrors.description = "Description must be at least 10 characters.";
    } else if (plainDescription.length > 5000) {
      newErrors.description =
        "Description must not be more than 5000 characters.";
    }

    // Seller validation
    if (!formData?.sellerId && !isSellerPanelUser) {
      newErrors.sellerId = "Seller is required.";
    }

    // Organization validation
    if (!formData?.organizationId) {
      if (isSellerPanelUser) {
        const activeOrgId = getSelectedSellerOrganizationId();

        if (!activeOrgId) {
          newErrors.organizationId =
            "No active organization is available for this seller account.";
        }
      } else {
        newErrors.organizationId = "Organization is required.";
      }
    }

    // Brand validation
    const brandValue = String(
      formData?.brand || formData?.brandId || formData?.brand_id || "",
    ).trim();

    if (!brandValue) {
      newErrors.brand = "Brand is required.";
    }

    // Category validation
    const categoryValue =
      formData?.category_id ||
      formData?.categoryId ||
      formData?.category ||
      formData?.category_key;

    if (!categoryValue) {
      newErrors.category_id = "Category is required.";
    }

    // HSN code validation
    const hsnValue = String(
      formData?.hsn_code || formData?.hsnCode || formData?.hsn_id || "",
    ).trim();

    if (!hsnValue) {
      newErrors.hsn_code = "HSN Code is required.";
    }

    // Variant existence validation
    if (!Array.isArray(variantsData) || !variantsData.length) {
      newErrors.variants = {
        _form: "Add at least one variant for this product.",
      };
    }

    // Shipping validation
    const hasShippingProfile = Boolean(formData?.shipping?.shippingProfileId);

    if (!hasShippingProfile) {
      const deliveryMode = normalizeProductServiceabilityMode(
        formData?.shipping?.serviceabilityMode,
      );

      const allowedPincodes = normalizePincodeList(
        formData?.shipping?.allowPincodes ||
          formData?.shipping?.serviceablePincodes,
      );

      if (deliveryMode !== "allowlist") {
        newErrors.shipping =
          "Add allowed delivery pincodes when no shipping profile is selected.";
      } else if (!allowedPincodes.length) {
        newErrors.shipping = "Add at least one allowed delivery pincode.";
      } else if (
        allowedPincodes.some((pincode) => !isValidIndianPincode(pincode))
      ) {
        newErrors.shipping = "Every pincode must be a valid 6-digit pincode.";
      }
    }

    // Variant field validation
    if (Array.isArray(variantsData) && variantsData.length) {
      const variantErrors = variantsData.reduce((result, variant, index) => {
        const fieldErrors = {};

        const price = Number(variant?.price || 0);
        const mrp = Number(variant?.mrp || 0);

        const hasSalePrice =
          variant?.salePrice !== undefined &&
          variant?.salePrice !== null &&
          variant?.salePrice !== "";

        const salePrice = Number(variant?.salePrice || 0);

        const hasGstRate =
          variant?.gstRate !== undefined &&
          variant?.gstRate !== null &&
          variant?.gstRate !== "";

        const gstRate = Number(variant?.gstRate);

        if (!String(variant?.sku || "").trim()) {
          fieldErrors.sku = "SKU is required.";
        }

        if (price <= 0) {
          fieldErrors.price = "Price must be greater than 0.";
        } else if (mrp > 0 && price > mrp) {
          fieldErrors.price = "Price cannot be greater than MRP.";
        }

        if (mrp <= 0) {
          fieldErrors.mrp = "MRP must be greater than 0.";
        }

        if (!hasSalePrice) {
          fieldErrors.salePrice = "Sale price is required.";
        } else if (salePrice <= 0) {
          fieldErrors.salePrice = "Sale price must be greater than 0.";
        } else if (salePrice > price) {
          fieldErrors.salePrice = "Sale price cannot be greater than price.";
        }

        // GST validation
        if (!hasGstRate) {
          fieldErrors.gstRate = "GST rate is required.";
        } else if (Number.isNaN(gstRate)) {
          fieldErrors.gstRate = "Enter a valid GST rate.";
        } else if (gstRate < 0 || gstRate > 100) {
          fieldErrors.gstRate = "GST rate must be between 0 and 100.";
        }

        if (Object.keys(fieldErrors).length) {
          result[index] = fieldErrors;
        }

        return result;
      }, {});

      if (Object.keys(variantErrors).length) {
        newErrors.variants = {
          ...(newErrors.variants || {}),
          ...variantErrors,
        };
      }
    }

    // Category attribute validation
    if (!useManualAttributes) {
      categoryAttributeSchema.forEach((field) => {
        const value = formData?.attributes?.[field.key];

        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);
        if (Object.keys(newErrors).length > 0) {
          pendingValidationScrollRef.current = true;
        }
        setError(newErrors);

        if (field.required && isEmpty) {
          newErrors.attributes = {
            ...(newErrors.attributes || {}),
            [field.key]: `${field.label || field.key} is required.`,
          };
        }
      });
    }

    setError(newErrors);

    if (Object.keys(newErrors).length > 0) {
      scrollToFirstValidationError(newErrors);
    }

    return Object.keys(newErrors).length === 0;
  };
  useEffect(() => {
    if (isScrolling) return;

    const sectionIds = [
      "basic-details",
      "product-details",
      "common-images",
      "variants-options",
      "shipping",
      "seo",
      "tags",
    ];

    let animationFrameId = null;

    const updateActiveSection = () => {
      const viewportHeight = window.innerHeight;

      // Position in viewport where a section becomes active.
      const activationLine = 220;

      const sections = sectionIds
        .map((id) => ({
          id,
          element: refs[id]?.current,
        }))
        .filter((item) => item.element);

      if (!sections.length) return;

      // -----------------------------------------
      // LAST SECTION FIX
      // -----------------------------------------
      const lastSection = sections[sections.length - 1];
      const lastRect = lastSection.element.getBoundingClientRect();

      /*
      Last section often cannot move all the way to the top because
      there is no content after it.

      As soon as Tags & Discovery enters enough of the viewport,
      activate it.
    */
      if (lastRect.top <= viewportHeight * 0.78 && lastRect.bottom > 0) {
        setActiveTab((prev) =>
          prev !== lastSection.id ? lastSection.id : prev,
        );

        return;
      }

      // -----------------------------------------
      // NORMAL SECTION DETECTION
      // -----------------------------------------
      let currentSection = sections[0].id;

      sections.forEach(({ id, element }) => {
        const rect = element.getBoundingClientRect();

        /*
        The latest section that has crossed the activation line
        becomes active.
      */
        if (rect.top <= activationLine) {
          currentSection = id;
        }
      });

      setActiveTab((prev) => (prev !== currentSection ? currentSection : prev));
    };

    const handleScroll = () => {
      if (isScrolling) return;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        updateActiveSection();
        animationFrameId = null;
      });
    };

    /*
    IMPORTANT:
    true = capture phase.

    This lets us detect scrolling even when your admin layout
    scrolls inside a nested div instead of window.
  */
    document.addEventListener("scroll", handleScroll, true);

    window.addEventListener("resize", handleScroll);

    // Set correct active tab immediately.
    updateActiveSection();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      document.removeEventListener("scroll", handleScroll, true);

      window.removeEventListener("resize", handleScroll);
    };
  }, [isScrolling]);

  const scrollToSection = useCallback((id) => {
    const target = refs[id]?.current;

    if (!target) return;

    // Immediately highlight clicked navigation item
    setActiveTab(id);
    setIsScrolling(true);

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setTimeout(() => {
      setIsScrolling(false);
    }, 700);
  }, []);

  function calculateDiscount(price, discountPercent = 0) {
    const validPrice = parseFloat(price) || 0;
    const validDiscount = parseFloat(discountPercent) || 0;

    if (validPrice < 0 || validDiscount < 0) {
      return {
        discountedPrice: 0,
        discountAmount: 0,
      };
    }

    const discountAmount = (validPrice * validDiscount) / 100;
    const discountedPrice = validPrice - discountAmount;

    return {
      discountedPrice: parseFloat(discountedPrice.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
    };
  }

  useEffect(() => {
    if (!formData.basePrice || !taxData) return;

    const priceWithTax = calculatePriceWithTax(taxData, formData.basePrice);
    const { discountedPrice } = calculateDiscount(
      priceWithTax,
      formData.discount,
    );

    setFormData((prev) => ({
      ...prev,
      salePrice: discountedPrice.toString(),
    }));
  }, [formData.basePrice, formData.discount, taxData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    // Update form data
    if (name.includes(".")) {
      const [group, field] = name.split(".");

      setFormData((prev) => ({
        ...prev,
        [group]: {
          ...(prev[group] || {}),
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear/revalidate the error while typing
    setError((prev) => {
      const updatedErrors = { ...prev };

      if (name === "name") {
        if (!value.trim()) {
          updatedErrors.name = "Product name is required.";
        } else if (value.trim().length < 3) {
          updatedErrors.name = "Product name must be at least 3 characters.";
        } else if (value.trim().length > 200) {
          updatedErrors.name =
            "Product name must not be more than 200 characters.";
        } else {
          delete updatedErrors.name;
        }
      }

      return updatedErrors;
    });
  }, []);

  const handleSelectChange = (selectedOption, action) => {
    setError((prevErrors) => {
      const newErrors = { ...prevErrors };
      switch (action) {
        case "COUNTRY":
          delete newErrors.mfd_country;
          delete newErrors.mfd_state;
          delete newErrors.mfd_city;
          delete newErrors.mfd_zip_code;
          break;

        case "STORE_ID":
          delete newErrors.store_id;
          break;
        case "SELLER_ID":
          delete newErrors.sellerId;
          delete newErrors.organizationId;
          break;
        case "ORGANIZATION_ID":
          delete newErrors.organizationId;
          break;
        case "BRAND_ID":
          delete newErrors.brand;
          break;
        case "CATEGORY_ID":
          delete newErrors.category_id;
          break;
        case "REPLACE_ID":
          delete newErrors.replace_id;
          break;
        case "STORE_TAX_ID":
          delete newErrors.store_tax_id;
          break;
        case "STORE_BATCH_ID":
          delete newErrors.store_batch_id;
          break;
        case "STORE_qtyHead_ID":
          delete newErrors.store_qtyHead_id;
          break;
        case "STORE_WARRANTY_ID":
          delete newErrors.store_warranty_id;
          break;
        case "OPTION_ID":
          delete newErrors.option_id;
          break;
        case "OPTION_VALUE_IDS":
          delete newErrors.option_value_ids;
          break;
        case "STORE_SHIPPING_DURATION_ID":
          delete newErrors.store_shipping_duration_id;
          break;
        case "hsn_code":
          delete newErrors.hsn_code;
          break;
        default:
          break;
      }
      return newErrors;
    });
    switch (action) {
      case "STORE_ID":
        setFormData((prev) => ({
          ...prev,
          store_id: selectedOption?.value || "",
        }));
        break;
      case "SELLER_ID":
        setFormData((prev) => ({
          ...prev,
          sellerId: selectedOption?.value || "",
          organizationId: "",
        }));
        break;
      case "ORGANIZATION_ID":
        setFormData((prev) => ({
          ...prev,
          organizationId: selectedOption?.value || "",
        }));
        break;

      case "BRAND_ID":
        setFormData((prev) => ({
          ...prev,
          brand: selectedOption?.label || selectedOption?.value || "",
        }));
        break;

      case "CATEGORY_ID":
        setFormData((prev) => ({
          ...prev,
          category_id: selectedOption?.value || "",
          categoryId: selectedOption?.value || "",
          category: selectedOption?.categoryKey || selectedOption?.value || "",
          category_key:
            selectedOption?.categoryKey || selectedOption?.value || "",
          attributes: useManualAttributes ? prev.attributes || {} : {},
        }));
        break;
      case "STORE_BATCH_ID":
        setFormData((prev) => ({
          ...prev,
          batch_id: selectedOption?.value || "",
        }));
        break;
      case "STORE_qtyHead_ID":
        setFormData((prev) => ({
          ...prev,
          qty_head_id: selectedOption?.value || "",
        }));
        break;
      case "STORE_WARRANTY_ID":
        setFormData((prev) => ({
          ...prev,
          warranty_id: selectedOption?.value || "",
        }));
        break;
      case "PRODUCT_FAMILY":
        setFormData((prev) => ({
          ...prev,
          productFamilyCode: selectedOption?.value || "",
        }));
        break;
      case "hsn_code":
        setFormData((prev) => ({
          ...prev,
          hsn_code: selectedOption?.value || "",
          hsnCode: selectedOption?.code || selectedOption?.value || "",
        }));
        const hsnCodeData = prefillList(
          "hsnCodes",
          getListPayload(selector?.getAllHsnData),
        ).find(
          (item) =>
            toSelectId(item) === String(selectedOption?.value) ||
            item?.code === selectedOption?.value,
        );

        setTaxData(hsnCodeData);

        break;
      case "PRODUCT_COUNTRY":
        setFormData((prev) => ({
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
      case "PRODUCT_STATE":
        setFormData((prev) => ({
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
      case "PRODUCT_CITY":
        setFormData((prev) => ({
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
    if (key === "COD") {
      setFormData((prev) => ({
        ...prev,
        shipping: {
          ...(prev.shipping || {}),
          codAvailable: !Boolean(prev?.shipping?.codAvailable),
        },
      }));

      return;
    }

    if (key === "FREE_SHIPPING") {
      setFormData((prev) => {
        const nextFreeShipping = !Boolean(prev?.shipping?.freeShipping);

        return {
          ...prev,
          shipping: {
            ...(prev.shipping || {}),
            freeShipping: nextFreeShipping,
            ...(nextFreeShipping ? { shippingProfileId: null } : {}),
          },
        };
      });

      return;
    }

    const fieldMap = {
      DISABLE: "isDisable",
      APPROVE: "isApproved",
      FEATURED: "markAsFeatured",
      DEAL_PRODUCT: "isDealProduct",
      prescription_required: "prescription_required",
    };

    const fieldName = fieldMap[key];

    if (!fieldName) return;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: !Boolean(prev[fieldName]),
    }));
  };

  const handleSaveSubmit = useCallback(async () => {
    setSaving(true);

    const updatedFormData = { ...formData };
    // persist manual-attributes selection to payload
    updatedFormData.attributesManual = useManualAttributes;
    const selectedShippingOption =
      !updatedFormData.shipping?.freeShipping &&
      updatedFormData.shipping?.shippingProfileId
        ? shippingProfileOptions.find(
            (option) =>
              String(option.value) ===
              String(updatedFormData.shipping.shippingProfileId),
          ) || null
        : null;
    const selectedShippingProfile = selectedShippingOption?.profile || null;
    const isSelectedShippingTemplate =
      selectedShippingOption?.type === "template";
    const profileShippingCharge = selectedShippingProfile
      ? toOptionalNumber(selectedShippingProfile.shippingCharge)
      : undefined;
    const profileEtaMin = selectedShippingProfile
      ? toOptionalNumber(selectedShippingProfile.etaMin)
      : undefined;
    const profileEtaMax = selectedShippingProfile
      ? toOptionalNumber(selectedShippingProfile.etaMax)
      : undefined;
    const resolvedCodAvailable =
      updatedFormData?.shipping?.codAvailable === true;

    const formattedOptions = options.map((option) => ({
      sku: option.sku || "",
      type: option.type,
      remark: option.remark || "",
      packaging: option.packaging || "",
      mrp: parseFloat(option.mrp) || 0,
      discount: parseFloat(option.discount) || 0,
      salePrice: parseFloat(option.salePrice) || 0,
      stock: Number(option.stock || 0),
      ...(option._id && { _id: option._id }),
    }));
    const variableOptionAxes = variantAxes
      .map((axis, index) => ({
        name: axis.name,
        slug: axis.slug,
        platformOptionId: axis.platformOptionId,
        displayType: axis.displayType,
        values: Array.isArray(axis.values) ? axis.values : [],
        valueCodes: axis.valueCodes || {},
        required: Boolean(axis.required),
        sortOrder: axis.sortOrder ?? index,
      }))
      .filter((axis) => axis.name && axis.values.length);

    const legacyVariants = formattedOptions
      .filter(
        (option) =>
          option.sku || option.salePrice || option.mrp || option.stock,
      )
      .map((option, index) => ({
        sku:
          option.sku ||
          `${updatedFormData.sku || updatedFormData.name || "SKU"}-${index + 1}`,
        price: Number(option.salePrice || 0),
        mrp: Number(option.mrp || 0),
        stock: Number(option.stock || 0),
        attributes: option.type
          ? { [option.type]: option.remark || option.packaging || option.type }
          : {},
        images: Array.isArray(option.images) ? option.images : [],
      }));
    const normalizedVariants = (
      variantsData.length ? variantsData : legacyVariants
    ).map((variant, index) => ({
      ...variant,
      sku:
        variant.sku ||
        `${updatedFormData.sku || updatedFormData.name || "SKU"}-${index + 1}`,
      price: Number(variant.price || variant.salePrice || 0),
      mrp: Number(variant.mrp || variant.price || variant.salePrice || 0),
      salePrice:
        variant.salePrice === undefined || variant.salePrice === ""
          ? undefined
          : Number(variant.salePrice || 0),
      stock: Number(variant.stock || 0),
      reservedStock: Number(variant.reservedStock || 0),
      isDefault:
        variant.isDefault === true ||
        (!variantsData.some((item) => item.isDefault) && index === 0),
      sortOrder: variant.sortOrder ?? index,
    }));
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
      returnPolicy: (() => {
        const current = updatedFormData.warranty?.returnPolicy || {};
        const returnable = current.returnable ?? current.eligible ?? true;
        const returnWindowDays = returnable
          ? Number(current.returnWindowDays ?? current.days ?? 7)
          : 0;
        return {
          ...current,
          returnable,
          eligible: returnable,
          returnWindowDays,
          days: returnWindowDays,
          type: returnable ? current.type || "standard" : "non_returnable",
          resolution: current.resolution || "refund_or_replacement",
          requiresImages: Boolean(current.requiresImages),
          inspectionRequired: current.inspectionRequired !== false,
          shippingPaidBy: isSellerPanelUser
            ? "seller"
            : current.shippingPaidBy || "seller",
          restockingFee: Number(current.restockingFee || 0),
        };
      })(),
    });
    const shipping = compactObject(
      selectedShippingProfile
        ? {
            shippingProfileId: isSelectedShippingTemplate
              ? null
              : updatedFormData.shipping?.shippingProfileId,

            freeShipping: profileShippingCharge === 0,
            additionalCost: profileShippingCharge,
            shippingCharge: profileShippingCharge,

            serviceabilityMode: normalizeProductServiceabilityMode(
              selectedShippingProfile.serviceabilityMode,
            ),

            allowPincodes:
              selectedShippingProfile.allowedPincodes ||
              selectedShippingProfile.allowPincodes ||
              selectedShippingProfile.serviceablePincodes ||
              [],

            serviceablePincodes:
              selectedShippingProfile.allowedPincodes ||
              selectedShippingProfile.serviceablePincodes ||
              selectedShippingProfile.allowPincodes ||
              [],

            regions:
              selectedShippingProfile.regions ||
              selectedShippingProfile.allowedStates ||
              selectedShippingProfile.states ||
              [],

            states:
              selectedShippingProfile.allowedStates ||
              selectedShippingProfile.states ||
              [],

            cities:
              selectedShippingProfile.allowedCities ||
              selectedShippingProfile.cities ||
              [],

            codAvailable: resolvedCodAvailable,

            processingDays: profileEtaMin,
            estimatedDaysMin: profileEtaMin,
            estimatedDaysMax: profileEtaMax,

            shippingMethod:
              selectedShippingProfile.shippingMethod || "standard",
          }
        : {
            ...(updatedFormData.shipping || {}),
            blockPincodes: undefined,

            serviceabilityMode: normalizeProductServiceabilityMode(
              updatedFormData.shipping?.serviceabilityMode,
            ),

            allowPincodes: normalizePincodeList(
              updatedFormData.shipping?.allowPincodes ||
                updatedFormData.shipping?.serviceablePincodes,
            ),

            serviceablePincodes: normalizePincodeList(
              updatedFormData.shipping?.serviceablePincodes ||
                updatedFormData.shipping?.allowPincodes,
            ),

            freeShipping: Boolean(updatedFormData.shipping?.freeShipping),

            freeShippingMinOrder: toOptionalNumber(
              updatedFormData.shipping?.freeShippingMinOrder,
            ),

            additionalCost: toOptionalNumber(
              updatedFormData.shipping?.additionalCost,
            ),

            shippingCharge: toOptionalNumber(
              updatedFormData.shipping?.shippingCharge,
            ),

            handlingCharge: toOptionalNumber(
              updatedFormData.shipping?.handlingCharge,
            ),

            codAvailable: resolvedCodAvailable,

            processingDays: toOptionalNumber(
              updatedFormData.shipping?.processingDays,
            ),

            estimatedDaysMin: toOptionalNumber(
              updatedFormData.shipping?.estimatedDaysMin,
            ),

            estimatedDaysMax: toOptionalNumber(
              updatedFormData.shipping?.estimatedDaysMax,
            ),

            shippingProfileId: updatedFormData.shipping?.freeShipping
              ? null
              : updatedFormData.shipping?.shippingProfileId || null,
          },
    );

    const productPayload = {
      sellerId: updatedFormData.sellerId,
      organizationId:
        updatedFormData.organizationId ||
        (isSellerPanelUser ? getSelectedSellerOrganizationId() : ""),
      ...(updatedFormData.storeId ? { storeId: updatedFormData.storeId } : {}),
      ...(updatedFormData.warehouseId
        ? { warehouseId: updatedFormData.warehouseId }
        : {}),
      title: updatedFormData.name || updatedFormData.title,
      description: updatedFormData.description,
      gstInclusive: true,
      category:
        updatedFormData.category_key ||
        updatedFormData.category ||
        updatedFormData.category_id,
      categoryId: updatedFormData.category_id || updatedFormData.categoryId,
      brand: updatedFormData.brand || updatedFormData.brand_id || "",
      productFamilyCode: updatedFormData.productFamilyCode,
      attributes: {
        ...(updatedFormData.attributes || {}),
      },
      hsnCode: updatedFormData.hsnCode || updatedFormData.hsn_code,
      origin,
      ...(Object.keys(dimensions).length ? { dimensions } : {}),
      ...(Object.keys(warranty).length ? { warranty } : {}),
      ...(Object.keys(shipping).length ? { shipping } : {}),
      status: updatedFormData.isApproved
        ? "active"
        : updatedFormData.isDisable
          ? "inactive"
          : "draft",
      ...(updatedFormData.isApproved
        ? { approvalStatus: "approved" }
        : {}),
      metadata: {
        ...(updatedFormData.metadata || {}),
        featured: Boolean(updatedFormData.markAsFeatured),
        isDealProduct: Boolean(updatedFormData.isDealProduct),
        dealBadge: updatedFormData.isDealProduct
          ? updatedFormData.dealBadge
          : undefined,
        dealSource: updatedFormData.isDealProduct
          ? updatedFormData.dealSource
          : undefined,
        codAvailable: resolvedCodAvailable,
        prescriptionRequired: Boolean(updatedFormData.prescription_required),
        attributesManual: Boolean(updatedFormData.attributesManual),
      },
      productType: "variable",
      ...(updatedFormData.shortDescription
        ? { shortDescription: updatedFormData.shortDescription }
        : {}),
      ...(updatedFormData.visibility
        ? { visibility: updatedFormData.visibility }
        : {}),
      tags: Array.isArray(updatedFormData.tags) ? updatedFormData.tags : [],
      commonImages: Array.isArray(updatedFormData.commonImages)
        ? updatedFormData.commonImages.filter(Boolean)
        : [],
      videos: Array.isArray(updatedFormData.videos)
        ? updatedFormData.videos.filter(Boolean).slice(0, 1)
        : [],
      ...(updatedFormData.seo && Object.keys(updatedFormData.seo).length
        ? { seo: updatedFormData.seo }
        : {}),
      ...(Array.isArray(updatedFormData.relatedProducts)
        ? { relatedProducts: updatedFormData.relatedProducts }
        : {}),
      ...(Array.isArray(updatedFormData.crossSellProducts)
        ? { crossSellProducts: updatedFormData.crossSellProducts }
        : {}),
      ...(Array.isArray(updatedFormData.upSellProducts)
        ? { upSellProducts: updatedFormData.upSellProducts }
        : {}),
      ...(Array.isArray(updatedFormData.frequentlyBoughtTogether)
        ? { frequentlyBoughtTogether: updatedFormData.frequentlyBoughtTogether }
        : {}),
      ...(Array.isArray(updatedFormData.featuredProducts)
        ? { featuredProducts: updatedFormData.featuredProducts }
        : {}),
      ...(Array.isArray(updatedFormData.trendingProducts)
        ? { trendingProducts: updatedFormData.trendingProducts }
        : {}),
      ...(Array.isArray(updatedFormData.bestSellerProducts)
        ? { bestSellerProducts: updatedFormData.bestSellerProducts }
        : {}),
      ...(Array.isArray(updatedFormData.collectionIds)
        ? { collectionIds: updatedFormData.collectionIds }
        : {}),
      ...(variableOptionAxes.length
        ? {
            options: variableOptionAxes,
            variantAxes: variableOptionAxes.map(
              (axis) => axis.slug || axis.name,
            ),
          }
        : {}),
      ...(normalizedVariants.length
        ? {
            variants: normalizedVariants,
            hasVariants: true,
          }
        : {}),
    };

    try {
      const response = isEditMode
        ? await dispatch(
            updateProductsById({ id, body: productPayload }),
          ).unwrap()
        : await dispatch(createProducts(productPayload)).unwrap();

      if (response) {
        if (!isEditMode) {
          setFormData({});
          setVariantRows([
            {
              sku: "",
              type: null,
              remark: "",
              packaging: "",
              mrp: "",
              discount: "",
              salePrice: "",
              stock: "",
            },
          ]);
          setVariantsData([DEFAULT_PRODUCT_VARIANT]);
          setVariantAxes([]);
        }
        toast.success(response?.message || "Product saved successfully!");
        navigate(`/app/product-catalog`);
      }
    } catch (err) {
      toast.error(err || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }, [
    formData,
    options,
    dispatch,
    setFormData,
    isEditMode,
    isSellerPanelUser,
    id,
    navigate,
    shippingProfileOptions,
    variantAxes,
    variantsData,
  ]);

  const handleProductDetailChange = (field, content) => {
    setFormData((prev) => ({
      ...prev,
      [field]: content,
    }));
    setError((current) => {
      if (!current || typeof current !== "object" || !current[field]) {
        return current;
      }
      const nextErrors = { ...current };
      delete nextErrors[field];
      return Object.keys(nextErrors).length ? nextErrors : null;
    });
  };

  const handleNestedChange = useCallback((field, value) => {
    const parts = field.split(".");
    if (parts.length === 1) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      const [group, subKey, deepKey] = parts;
      setFormData((prev) => ({
        ...prev,
        [group]: deepKey
          ? {
              ...(prev[group] || {}),
              [subKey]: {
                ...((prev[group] || {})[subKey] || {}),
                [deepKey]: value,
              },
            }
          : { ...(prev[group] || {}), [subKey]: value },
      }));
    }
  }, []);

  const patchShipping = useCallback((patch) => {
    setFormData((prev) => ({
      ...prev,
      shipping: {
        ...(prev.shipping || {}),
        ...patch,
      },
    }));
  }, []);

  const addProductPincode = useCallback(() => {
    const value = allowedPincodeInput.trim();
    if (!value) return;
    if (!isValidIndianPincode(value)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }
    const current = normalizePincodeList(
      formData?.shipping?.allowPincodes ||
        formData?.shipping?.serviceablePincodes,
    );
    if (current.includes(value)) {
      toast.error("This pincode is already added");
      return;
    }
    const next = [...current, value];
    patchShipping({
      serviceabilityMode: "allowlist",
      allowPincodes: next,
      serviceablePincodes: next,
    });
    setAllowedPincodeInput("");
    setError((previous) => {
      if (!previous?.shipping) return previous;
      const nextErrors = { ...previous };
      delete nextErrors.shipping;
      return Object.keys(nextErrors).length ? nextErrors : null;
    });
  }, [allowedPincodeInput, formData?.shipping, patchShipping]);

  const removeProductPincode = useCallback(
    (pincode) => {
      const next = normalizePincodeList(
        formData?.shipping?.allowPincodes ||
          formData?.shipping?.serviceablePincodes,
      ).filter((item) => item !== pincode);
      patchShipping({
        serviceabilityMode: "allowlist",
        allowPincodes: next,
        serviceablePincodes: next,
      });
    },
    [formData?.shipping, patchShipping],
  );

  const handleProductPincodeKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addProductPincode();
      }
    },
    [addProductPincode],
  );

  const addManualAttribute = useCallback(() => {
    const key = (newAttrKey || "").trim();
    const value = (newAttrValue || "").trim();
    const existingKeys = Object.keys(formData?.attributes || {});
    const errors = {};

    if (!key) errors.key = "Attribute key is required.";
    else if (existingKeys.some((k) => k.toLowerCase() === key.toLowerCase())) {
      errors.key = "This attribute key already exists.";
    }
    if (!value) errors.value = "Attribute value is required.";

    if (Object.keys(errors).length > 0) {
      setManualAttrErrors(errors);
      return;
    }

    setManualAttrErrors({});
    setFormData((prev) => ({
      ...prev,
      attributes: { ...(prev.attributes || {}), [key]: value },
    }));
    setNewAttrKey("");
    setNewAttrValue("");
  }, [newAttrKey, newAttrValue, formData?.attributes]);

  const removeManualAttribute = useCallback((key) => {
    setFormData((prev) => {
      const next = { ...(prev.attributes || {}) };
      delete next[key];
      return { ...prev, attributes: next };
    });
    setManualAttrErrors((prev) => {
      if (!prev?.rowErrors?.[key]) return prev;
      const nextRowErrors = { ...prev.rowErrors };
      delete nextRowErrors[key];
      return { ...prev, rowErrors: nextRowErrors };
    });
  }, []);

  const updateManualAttributeValue = useCallback((key, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: { ...(prev.attributes || {}), [key]: value },
    }));
    setManualAttrErrors((prev) => {
      const trimmed = (value || "").trim();
      const hasRowError = prev?.rowErrors?.[key];
      if (trimmed && !hasRowError) return prev;
      const nextRowErrors = { ...(prev?.rowErrors || {}) };
      if (trimmed) delete nextRowErrors[key];
      else nextRowErrors[key] = "Value cannot be empty.";
      return { ...prev, rowErrors: nextRowErrors };
    });
  }, []);

  const handleManualAttrKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addManualAttribute();
      }
    },
    [addManualAttribute],
  );

  const uploadCommonProductImages = async (files) => {
    const current = Array.isArray(formData.commonImages)
      ? formData.commonImages
      : [];
    const remaining = MAX_COMMON_PRODUCT_IMAGES - current.length;
    if (!files?.length || remaining <= 0) {
      if (remaining <= 0)
        toast.error(`Maximum ${MAX_COMMON_PRODUCT_IMAGES} common images`);
      return;
    }
    setCommonImagesUploading(true);
    try {
      const urls = await uploadFileMulti(
        Array.from(files).slice(0, remaining),
        "PRODUCT",
      );
      setFormData((previous) => ({
        ...previous,
        commonImages: [...(previous.commonImages || []), ...urls],
      }));
      toast.success(
        `${urls.length} common product image${urls.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (uploadError) {
      toast.error(uploadError?.message || "Common image upload failed");
    } finally {
      setCommonImagesUploading(false);
    }
  };

  // const addCommonProductImageUrl = () => {
  //   const url = commonImageUrl.trim();
  //   const current = Array.isArray(formData.commonImages) ? formData.commonImages : [];
  //   if (!url) return;
  //   if (current.length >= MAX_COMMON_PRODUCT_IMAGES) {
  //     toast.error(`Maximum ${MAX_COMMON_PRODUCT_IMAGES} common images`);
  //     return;
  //   }
  //   setFormData((previous) => ({
  //     ...previous,
  //     commonImages: [...(previous.commonImages || []), url],
  //   }));
  //   setCommonImageUrl("");
  // };

  const removeCommonProductImage = (imageIndex) => {
    setFormData((previous) => ({
      ...previous,
      commonImages: (previous.commonImages || []).filter(
        (_, index) => index !== imageIndex,
      ),
    }));
  };

  const uploadProductVideo = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("video/")) {
      toast.error("Please upload a valid video file");
      return;
    }
    setProductVideoUploading(true);
    try {
      const url = await uploadVideoFile(file, "PRODUCT");
      setFormData((previous) => ({
        ...previous,
        videos: [url],
      }));
      toast.success("Product video uploaded");
    } catch (uploadError) {
      toast.error(uploadError?.message || uploadError || "Video upload failed");
    } finally {
      setProductVideoUploading(false);
    }
  };

  const removeProductVideo = () => {
    setFormData((previous) => ({
      ...previous,
      videos: [],
    }));
  };

  const handleVariantsChange = useCallback((nextVariants) => {
    setVariantsData(nextVariants);
  }, []);

  const handleVariantErrorClear = useCallback((variantIndex, field) => {
    setError((current) => {
      if (!current || typeof current !== "object" || !current.variants) {
        return current;
      }
      const variantErrors = { ...current.variants };
      const fieldErrors = { ...(variantErrors[variantIndex] || {}) };
      delete fieldErrors[field];
      if (Object.keys(fieldErrors).length) {
        variantErrors[variantIndex] = fieldErrors;
      } else {
        delete variantErrors[variantIndex];
      }

      const nextErrors = { ...current };
      if (Object.keys(variantErrors).length) {
        nextErrors.variants = variantErrors;
      } else {
        delete nextErrors.variants;
      }
      return Object.keys(nextErrors).length ? nextErrors : null;
    });
  }, []);

  const tabs = useMemo(
    () => [
      {
        id: "basic-details",
        title: "Basic details",
        description: "Manage the product's basic information.",
        icon: <GrDocument />,
        component: (
          <BasicDetailsTab
            formData={formData}
            errors={error}
            handleChange={handleChange}
            handleNestedChange={handleNestedChange}
            formattedCategoryList={createSelectOptions}
            formattedBrandList={formattedData.brandList}
            formattedWarrantyList={formattedData.warrantyTemplateList}
            formattedProductFamilyList={formattedData.productFamilyList}
            handleSelectChange={handleSelectChange}
            fetchAllData={fetchAllData}
            allCategories={prefillList(
              "categories",
              getListPayload(selector?.getListData),
            )}
            countryList={formattedData.countryList}
            sellerList={formattedData.sellerList}
            organizationList={organizationOptions}
            hsnCodeList={formattedData?.hsnCodeList}
            API_CALL_OBJECT={API_CALL_OBJECT}
            handleInputReactQuillChange={handleProductDetailChange}
            userData={userData}
            hasVariantPricing
          />
        ),
      },

      {
        id: "product-details",
        title: "Attributes",
        description: "Manage category-based product attributes.",
        icon: <GrDocument />,
        component: (
          <div ref={refs["product-details"]} className="space-y-4">
            {/* <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Attributes</h3>
              <p className="text-xs text-gray-500 mt-0.5">Choose dynamic (category-driven) attributes or enter manual key/value attributes.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--admin-blue)]" checked={useManualAttributes} onChange={() => setUseManualAttributes((v) => !v)} />
              <span className="text-sm">Manual attributes</span>
            </label>
          </div> */}

            {useManualAttributes ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    <div>
                      <label className="admin-label">Key</label>
                      <input
                        className={`admin-input${manualAttrErrors.key ? " admin-input-error" : ""}`}
                        value={newAttrKey}
                        onChange={(e) => {
                          setNewAttrKey(e.target.value);
                          if (manualAttrErrors.key)
                            setManualAttrErrors((prev) => ({
                              ...prev,
                              key: undefined,
                            }));
                        }}
                        onKeyDown={handleManualAttrKeyDown}
                        placeholder="eg. material"
                        aria-invalid={Boolean(manualAttrErrors.key)}
                      />
                      {manualAttrErrors.key && (
                        <p
                          className="admin-field-error flex items-center gap-1"
                          role="alert"
                        >
                          <FiAlertCircle className="shrink-0" />{" "}
                          {manualAttrErrors.key}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="admin-label">Value</label>
                      <input
                        className={`admin-input${manualAttrErrors.value ? " admin-input-error" : ""}`}
                        value={newAttrValue}
                        onChange={(e) => {
                          setNewAttrValue(e.target.value);
                          if (manualAttrErrors.value)
                            setManualAttrErrors((prev) => ({
                              ...prev,
                              value: undefined,
                            }));
                        }}
                        onKeyDown={handleManualAttrKeyDown}
                        placeholder="eg. cotton"
                        aria-invalid={Boolean(manualAttrErrors.value)}
                      />
                      {manualAttrErrors.value && (
                        <p
                          className="admin-field-error flex items-center gap-1"
                          role="alert"
                        >
                          <FiAlertCircle className="shrink-0" />{" "}
                          {manualAttrErrors.value}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="admin-label invisible sm:block hidden">
                        Add
                      </label>
                      <button
                        type="button"
                        className="admin-btn w-full sm:w-auto flex items-center justify-center gap-1.5"
                        onClick={addManualAttribute}
                      >
                        <FiPlus /> Add attribute
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.keys(formData?.attributes || {}).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center">
                      <p className="text-sm text-gray-400">
                        No manual attributes added yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-500">
                        {Object.keys(formData?.attributes || {}).length}{" "}
                        attribute
                        {Object.keys(formData?.attributes || {}).length === 1
                          ? ""
                          : "s"}{" "}
                        added
                      </p>
                      {Object.keys(formData?.attributes || {}).map((key) => {
                        const rowError = manualAttrErrors?.rowErrors?.[key];
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-3 rounded-lg border p-2.5 transition-colors ${rowError ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-white hover:border-gray-300"}`}
                          >
                            <div
                              className="w-36 shrink-0 pt-2 text-sm font-medium text-gray-700 truncate"
                              title={key}
                            >
                              {key}
                            </div>
                            <div className="flex-1">
                              <input
                                className={`admin-input${rowError ? " admin-input-error" : ""}`}
                                value={formData.attributes[key] || ""}
                                onChange={(e) =>
                                  updateManualAttributeValue(
                                    key,
                                    e.target.value,
                                  )
                                }
                              />
                              {rowError && (
                                <p
                                  className="admin-field-error flex items-center gap-1"
                                  role="alert"
                                >
                                  <FiAlertCircle className="shrink-0" />{" "}
                                  {rowError}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              className="mt-1.5 shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              onClick={() => removeManualAttribute(key)}
                              aria-label={`Remove ${key} attribute`}
                              title="Remove attribute"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <DynamicAttributesTab
                attributeSchema={categoryAttributeSchema}
                formData={formData}
                setFormData={setFormData}
                errors={error}
                optionValues={platformValues}
              />
            )}
          </div>
        ),
      },
      {
        id: "common-images",
        title: "Media",
        description: "Images and one product video shown on the customer product page.",
        icon: <BsMenuApp />,
        component: (
          <section
            ref={refs["common-images"]}
            className="space-y-5 rounded-xl border border-[var(--admin-line)] bg-white p-5 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[var(--admin-ink)]">
                  Product view images
                </h3>
                <span className="rounded-full bg-[var(--admin-blue)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--admin-blue)]">
                  {(formData.commonImages || []).length}/
                  {MAX_COMMON_PRODUCT_IMAGES}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Upload shared images such as front, back, packaging, usage,
                and detail views. They appear for every variant.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {(formData.commonImages || []).map((image, imageIndex) => (
                <div
                  key={`${image}-${imageIndex}`}
                  className="group relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <img
                    src={image}
                    alt={`Catalog image ${imageIndex + 1}`}
                    className="h-full w-full object-contain p-1"
                  />
                  {imageIndex === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeCommonProductImage(imageIndex)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Remove catalog image ${imageIndex + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}

              {(formData.commonImages || []).length <
                MAX_COMMON_PRODUCT_IMAGES && (
                <label
                  className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-[var(--admin-blue)] hover:text-[var(--admin-blue)] ${commonImagesUploading ? "pointer-events-none opacity-50" : ""}`}
                >
                  <FiPlus size={20} />
                  <span>{commonImagesUploading ? "Uploading…" : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      uploadCommonProductImages(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {/* 
              {(formData.commonImages || []).length < MAX_COMMON_PRODUCT_IMAGES && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    className="admin-input flex-1"
                    placeholder="Or paste a common image URL"
                    value={commonImageUrl}
                    onChange={(event) => setCommonImageUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCommonProductImageUrl();
                      }
                    }}
                  />
                  <button type="button" className="admin-btn" onClick={addCommonProductImageUrl}>Add image</button>
                </div>
              )} */}

            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--admin-ink)]">
                    Product video
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload one video for this product. It will be visible on the customer product page.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--admin-blue)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--admin-blue)]">
                  {(formData.videos || []).filter(Boolean).length}/1
                </span>
              </div>

              {(formData.videos || []).filter(Boolean).length ? (
                <div className="mt-4 max-w-md overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <video
                    src={(formData.videos || []).filter(Boolean)[0]}
                    className="aspect-video w-full bg-black"
                    controls
                    preload="metadata"
                  />
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="truncate text-xs text-gray-500">
                      Product video uploaded
                    </span>
                    <button
                      type="button"
                      onClick={removeProductVideo}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`mt-4 flex h-28 max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-[var(--admin-blue)] hover:text-[var(--admin-blue)] ${productVideoUploading ? "pointer-events-none opacity-50" : ""}`}
                >
                  <FiPlus size={20} />
                  <span>{productVideoUploading ? "Uploading video…" : "Upload product video"}</span>
                  <span className="mt-1 text-xs text-gray-400">MP4, WebM, MOV or OGG</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    className="hidden"
                    onChange={(event) => {
                      uploadProductVideo(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </section>
        ),
      },
      {
        id: "variants-options",
        title: "Variants & options",
        description:
          "Customize the product variants, including size, color, etc.",
        icon: <BsMenuApp />,
        component: (
          <div className="space-y-5">
            <div className="pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Variant Builder
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Define option axes (Color, Size...), generate combinations, then
                edit each variant.
              </p>
            </div>
            {error?.variants?._form && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error.variants._form}
              </div>
            )}
            <VariantBuilder
              variants={variantsData}
              options={variantAxes}
              basePrice={Number(formData?.price || 0)}
              baseMrp={Number(formData?.mrp || 0)}
              onChange={handleVariantsChange}
              onOptionsChange={setVariantAxes}
              platformOptions={platformOptions}
              platformValues={platformValues}
              onOptionSearch={handleOptionSearch}
              errors={error?.variants}
              onClearError={handleVariantErrorClear}
            />
          </div>
        ),
      },
      {
        id: "shipping",
        title: "Shipping",
        description: "Product delivery and serviceability.",
        icon: <BsMenuApp />,
        component: (
          <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Shipping</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Select a shipping profile or configure delivery settings
                manually.
              </p>
            </div>

            {formData?.shipping?.freeShipping ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">
                  Free shipping is enabled
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Shipping charge is ₹0, but pincode deliverability still
                  applies.
                </p>
              </div>
            ) : (
              <div
                className={`rounded-xl border p-4 space-y-3 ${formData?.shipping?.shippingProfileId ? "border-[var(--admin-blue)]" : "border-gray-200 "}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Shipping Profile
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reusable delivery configuration. Selecting a profile uses
                      its serviceability, charges, and ETA.
                    </p>
                  </div>
                  {formData?.shipping?.shippingProfileId && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline whitespace-nowrap"
                      onClick={() =>
                        patchShipping({
                          shippingProfileId: null,
                        })
                      }
                    >
                      Remove profile
                    </button>
                  )}
                </div>
                <FilterSelect
                  options={shippingProfileOptions.map((opt) => ({
                    ...opt,
                    label:
                      opt.label + (opt.profile?.isDefault ? " (Default)" : ""),
                  }))}
                  value={
                    shippingProfileOptions.find(
                      (opt) =>
                        opt.value === formData?.shipping?.shippingProfileId,
                    ) || null
                  }
                  onChange={(selected) => {
                    const profileId = selected?.value || null;
                    patchShipping({
                      shippingProfileId: profileId,
                      ...(profileId
                        ? {
                            serviceabilityMode: "inherit",
                            allowPincodes: [],
                            serviceablePincodes: [],
                          }
                        : {}),
                    });
                  }}
                  placeholder="— No profile (use manual settings below) —"
                  isClearable
                  isSearchable
                />

                {shippingProfileOptions.length === 0 && !formData?.sellerId && (
                  <p className="text-xs text-amber-600">
                    Select a seller first to load their shipping profiles.
                  </p>
                )}
                {shippingProfileOptions.length === 0 && formData?.sellerId && (
                  <p className="text-xs text-gray-400">
                    No active shipping profiles found.{" "}
                    <a
                      href="/app/shipping-profiles"
                      className="text-[var(--admin-blue)] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Create one →
                    </a>
                  </p>
                )}
                {formData?.shipping?.shippingProfileId &&
                  (() => {
                    const selected = shippingProfileOptions.find(
                      (o) => o.value === formData.shipping.shippingProfileId,
                    );
                    const p = selected?.profile;
                    if (!p) return null;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {[
                          { label: "Method", value: p.shippingMethod },
                          {
                            label: "Mode",
                            value: p.serviceabilityMode?.replace(/_/g, " "),
                          },
                          {
                            label: "Charge",
                            value:
                              p.shippingCharge === 0
                                ? "Free"
                                : `₹${Number(p.shippingCharge).toFixed(0)}`,
                          },
                          ...(p.etaMin || p.etaMax
                            ? [
                                {
                                  label: "ETA",
                                  value:
                                    [p.etaMin, p.etaMax]
                                      .filter(Boolean)
                                      .join("–") + " days",
                                },
                              ]
                            : []),
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="rounded-lg bg-white border border-[var(--admin-blue)]/20 px-2 py-1.5"
                          >
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              {label}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 mt-0.5">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                {formData?.shipping?.shippingProfileId && (
                  <p className="text-xs text-[var(--admin-blue)]">
                    Manual shipping fields are hidden while this profile is
                    active. Remove the profile to edit product-level shipping
                    manually.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Product delivery pincodes
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  This controls whether customers can buy this product for a
                  pincode. It is checked separately from shipping charges, even
                  when shipping is free.
                </p>
              </div>

              {formData?.shipping?.shippingProfileId && (
                <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  A shipping profile is selected. Its pincode rules are used at
                  checkout, so manual product pincodes are locked. Remove the
                  profile to add product-specific pincodes.
                </p>
              )}
              {!formData?.shipping?.shippingProfileId && (
                <>
                  <div>
                    <label className="admin-label">
                      Delivery rule <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="admin-input"
                      value="allowlist"
                      onChange={() =>
                        patchShipping({
                          serviceabilityMode: "allowlist",
                        })
                      }
                    >
                      <option value="allowlist">
                        Deliver only to allowed pincodes
                      </option>
                    </select>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Required when no shipping profile is selected. Any pincode
                      not added here is automatically not deliverable.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="admin-label">
                      Allowed pincodes <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="admin-input flex-1"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit pincode"
                        value={allowedPincodeInput}
                        onChange={(event) =>
                          setAllowedPincodeInput(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        onKeyDown={handleProductPincodeKeyDown}
                      />
                      <button
                        type="button"
                        className="admin-btn-primary whitespace-nowrap px-4"
                        onClick={addProductPincode}
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex min-h-[44px] flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3">
                      {normalizePincodeList(
                        formData?.shipping?.allowPincodes ||
                          formData?.shipping?.serviceablePincodes,
                      ).length ? (
                        normalizePincodeList(
                          formData?.shipping?.allowPincodes ||
                            formData?.shipping?.serviceablePincodes,
                        ).map((pincode) => (
                          <span
                            key={pincode}
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--admin-blue)]/10 px-2 py-1 text-xs font-medium text-[var(--admin-blue)]"
                          >
                            {pincode}
                            <button
                              type="button"
                              onClick={() => removeProductPincode(pincode)}
                              className="ml-1 text-sm leading-none hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">
                          No allowed pincodes added yet.
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
              {error?.shipping && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {error.shipping}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "seo",
        title: "SEO",
        description: "Search engine metadata and social sharing settings.",
        icon: <GrDocument />,
        component: (
          <div className="space-y-5">
            <div className="pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                SEO &amp; Metadata
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Optimise how this product appears in search engines and social
                sharing.
              </p>
            </div>
            <SEOPanel
              seo={formData?.seo || {}}
              onChange={handleNestedChange}
              slug={formData?.slug || ""}
            />
          </div>
        ),
      },
      {
        id: "tags",
        title: "Tags & Discovery",
        description: "Tags, badges, and discoverability settings.",
        icon: <BsMenuApp />,
        component: (
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Tags &amp; Discovery
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Tags, badges, and discoverability settings.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Tags help customers find this product through search and
                filters.
              </p>
              <TagsInput
                tags={Array.isArray(formData?.tags) ? formData.tags : []}
                onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                placeholder="Add tag…"
                maxTags={20}
              />
            </div>

            {/* <div className="rounded-xl border border-[var(--admin-line)] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[var(--admin-ink)]">Deal Product</h4>
                <p className="text-xs text-gray-500">Mark this existing product so admin can pick it for Deal Management.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(formData?.isDealProduct)}
                  onChange={() => handleToggleProductSetting('DEAL_PRODUCT')}
                  className="h-4 w-4 accent-[var(--admin-blue)]"
                />
                Show in deal selection
              </label>
            </div>

            {formData?.isDealProduct && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="admin-label">Deal Badge</label>
                  <select
                    name="dealBadge"
                    value={formData?.dealBadge || "Today's Deal"}
                    onChange={handleChange}
                    className="admin-input"
                  >
                    {DEAL_BADGE_OPTIONS.map((badge) => (
                      <option key={badge} value={badge}>{badge}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Deal Source</label>
                  <select
                    name="dealSource"
                    value={formData?.dealSource || "admin_direct"}
                    onChange={handleChange}
                    className="admin-input"
                  >
                    {DEAL_SOURCE_OPTIONS.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div> */}
          </div>
        ),
      },
    ],
    [
      formData,
      formattedData,
      createSelectOptions,
      handleChange,
      handleSelectChange,
      handleNestedChange,
      patchShipping,
      selector,
      options,
      variantsData,
      variantAxes,
      categoryAttributeSchema,
      error,
      commonImageUrl,
      commonImagesUploading,
      productVideoUploading,
      allowedPincodeInput,
      addProductPincode,
      removeProductPincode,
      handleProductPincodeKeyDown,
      handleVariantsChange,
      handleVariantErrorClear,
    ],
  );

  // const flowReadiness = useMemo(() => {
  //   const items = [
  //     {
  //       label: "Categories",
  //       count: createSelectOptions?.length || 0,
  //       route: "/app/categories",
  //     },
  //     {
  //       label: "Attributes (selected category)",
  //       count: categoryAttributeSchema?.length || 0,
  //       route: "/app/categories",
  //     },
  //     {
  //       label: "Brands",
  //       count: formattedData?.brandList?.length || 0,
  //       route: "/app/brands",
  //     },
  //     {
  //       label: "HSN Codes",
  //       count: formattedData?.hsnCodeList?.length || 0,
  //       route: "/app/hsn-code",
  //     },
  //     {
  //       label: "Warranty Templates",
  //       count: formattedData?.warrantyTemplateList?.length || 0,
  //       route: "/app/warranty",
  //     },
  //   ];
  //   return items;
  // }, [createSelectOptions, categoryAttributeSchema, formattedData]);

  const flowGateErrors = useMemo(() => {
    const blockers = [];
    if (!createSelectOptions?.length) {
      blockers.push({
        key: "categories",
        message: "Create at least one category before creating products.",
        route: "/app/categories",
      });
    }
    if (!formattedData?.brandList?.length) {
      blockers.push({
        key: "brands",
        message: "Create at least one brand to assign products properly.",
        route: "/app/brands",
      });
    }
    if (!formattedData?.hsnCodeList?.length) {
      blockers.push({
        key: "hsn",
        message: "Create at least one HSN code so tax mapping is consistent.",
        route: "/app/hsn-code",
      });
    }

    // Product Family Code remains available in the form, but it is optional.
    // The prior gate blocked saves after related product fields were hidden.
    return blockers;
  }, [createSelectOptions, formattedData, formData]);

  const handleValidateAndSubmit = useCallback(() => {
    const isBasicFormValid = validateForm();
    if (!isBasicFormValid) return;
    if (flowGateErrors.length) {
      setError((prev) => ({
        ...(prev || {}),
        flow: `Complete ${flowGateErrors.length} setup ${flowGateErrors.length > 1 ? "items" : "item"} before saving.`,
      }));
      toast.error(
        "Product flow is incomplete. Complete the highlighted setup items first.",
      );
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
    <div className="relative min-h-screen">
      <Loader
        loading={
          loading ||
          productLoading ||
          (isEditMode &&
            !productLoadFailed &&
            String(prefilledProductId || "") !== String(id)) ||
          saving
        }
      />
      <Breadcrumb isEditMode={isEditMode} />
      {/* <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
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
        </div>
      </div> */}
      {/* {flowGateErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Complete Required Master Data Before Save</p>
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
      )} */}
      {error?.flow && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {error.flow}
        </div>
      )}
      <div className="flex flex-col gap-6 pb-8 lg:flex-row lg:items-start">
        <div className="lg:w-44 flex-shrink-0 lg:sticky lg:top-24">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            scrollToSection={scrollToSection}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="space-y-1 pb-5">
            <h3 className="text-2xl font-semibold">
              {isEditMode ? "Edit" : "Add"} Product
            </h3>
            <p className="text-xs text-gray-500">
              Fields with (<span className="text-red-500">*</span>) are
              mandatory
            </p>
          </div>
          <main
            ref={mainContainerRef}
            className="flex-1 bg-white border border-gray-100 rounded-xl overflow-visible"
          >
            {tabs?.map((tab) => (
              <section
                key={tab.id}
                ref={refs[tab.id]}
                id={tab.id}
                className="px-4 py-6 sm:px-6 sm:py-8 border-b border-gray-100 last:border-b-0 scroll-mt-24"
              >
                {tab.component}
              </section>
            ))}
          </main>
        </div>
        <div className="lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-24 h-fit">
          <ProductSettingsPanel
            handleSaveSubmit={handleValidateAndSubmit}
            formData={formData}
            handleToggleProductSetting={handleToggleProductSetting}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}
