import "react-quill/dist/quill.snow.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FiRefreshCw } from "react-icons/fi";

import { useDispatch, useSelector } from "react-redux";

import { toast } from "sonner";

// Components
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import Input from "../../../../components/Atoms/Input/Input";
import Loader from "../../../../components/Loader/Loader";
import useDropdownOptions from "../../../../hooks/useDropdownOptions";
import PermissionGuard from "../../../../components/Atoms/PermissionGuard/PermissionGuard";

// Modals
import CategorySetup from "../../ProductCategories/components/CategorySetup";

// Redux Actions
import {
  createBrand,
  createCategory,
  createHsn,
  getBrandList,
  getMyBrandSubmissions,
  resubmitBrandForApproval,
  submitBrandForApproval,
  reviewBrandSubmission,
  reviewCategorySubmission,
  reviewHsnSubmission,
} from "../../../../Redux/productSlice";

import {
  transformArray,
  uploadFile,
} from "../../../../_helpers/globalFunctions";

import AddHsnModal from "./Modals/AddHsnModal";

import {
  extractRole,
  getStoredRole,
  getStoredUser,
  normalizeRole,
} from "../../../../_helpers/authStorage";

import { isSellerPanel } from "../../../../_helpers/panelConfig";

import { TextEditor } from "../../../../components/Atoms/FormInput/TextEditor";

import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";

import FormSection from "../../../../components/Atoms/FormSection/FormSection";

import FormInput from "../../../../components/Atoms/FormInput/FormInput";

import ImageUpload from "../../../../components/Atoms/ImageGallery/ImageUpload";
import { dropdownApi } from "../../../../_helpers/dropdownApi";
import { brandValidationSchema } from "../../../../_helpers/validationSchemas";
import { useFormik } from "formik";

// Same dropdown API used in Product Catalog
// import dropdownApi from "../../../../services/dropdownApi";

const INITIAL_FORM_CATEGORY = {
  categoryName: "",
  bannerUrl: "",
  iconUrl: "",
  parentCategory: null,
  isPublish: true,
  isDashboardVisible: false,
  priority: "0",
};

const SELLER_PANEL_ROLES = new Set([
  "seller",
  "seller-admin",
  "seller-sub-admin",
]);

const getErrorMessage = (error, fallback) =>
  typeof error === "string"
    ? error
    : error?.message ||
      error?.error?.message ||
      error?.data?.message ||
      error?.response?.data?.message ||
      fallback;

const preventNegativeNumericKey = (event) => {
  if (event.key === "Subtract" || /[-−]/u.test(event.key || "")) {
    event.preventDefault();
  }
};

const preventNegativeNumericPaste = (event) => {
  if (/[-−]/u.test(event.clipboardData?.getData("text") || "")) {
    event.preventDefault();
  }
};

const isNegativeNumericValue = (value) =>
  /[-−]/u.test(String(value ?? "")) || (value !== "" && Number(value) < 0);

const getSessionUser = () => {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.sessionStorage.getItem("EcomAdmin") || "null");
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
  allCategories,
  API_CALL_OBJECT,
  hsnCodeList,
  sellerList = [],
  organizationList = [],
  userData,
  hasVariantPricing = false,
  handleInputReactQuillChange,
  onBusyChange,
}) {
  const dispatch = useDispatch();

  const selector = useSelector((state) => state);

  const warrantyUnits = useDropdownOptions("warranty-units");

  const warrantyTemplatesFromMaster = useDropdownOptions("warranty-templates");

  const [brandStatusOverrides, setBrandStatusOverrides] = useState({});

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

  const [localCategoryOptions, setLocalCategoryOptions] = useState([]);

  const [localHsnOptions, setLocalHsnOptions] = useState([]);

  const [refreshingCatalog, setRefreshingCatalog] = useState("");

  /*
   * ------------------------------------------------------------
   * Seller / Organization dropdown state
   * ------------------------------------------------------------
   */

  const [sellerOptions, setSellerOptions] = useState([]);

  const [organizationOptions, setOrganizationOptions] = useState([]);

  const [sellerLoading, setSellerLoading] = useState(false);

  const [organizationLoading, setOrganizationLoading] = useState(false);

  const warrantyProviders = {
    loading: false,
    options: [
      { value: "seller", label: "Seller" },
      { value: "manufacturer", label: "Manufacturer" },
      { value: "service_partner", label: "Service Partner" },
    ],
  };

  const warrantyTypes = {
    loading: false,
    options: [
      { value: "manufacturer_warranty", label: "Manufacturer Warranty" },
      { value: "seller_warranty", label: "Seller Warranty" },
      { value: "service_warranty", label: "Service Warranty" },
      { value: "extended_warranty", label: "Extended Warranty" },
    ],
  };

  /*
   * ------------------------------------------------------------
   * Load sellers using the same dropdown API pattern
   * used in Product Catalog
   * ------------------------------------------------------------
   */

  const loadSellerOptions = useCallback(async () => {
    if (isSellerPanelUser) return;

    setSellerLoading(true);

    try {
      const response = await dropdownApi.getSellers({
        limit: 100,
        searchFields: "full_name,email,businessName",
      });

      console.log("Seller dropdown response:", response);

      /*
       * getSellers() can return:
       *
       * 1. Direct array:
       * [
       *   {
       *     label: "Akshita Gupta",
       *     value: "sellerId",
       *     id: "sellerId",
       *     meta: {}
       *   }
       * ]
       *
       * 2. Axios response:
       * {
       *   data: [...]
       * }
       *
       * 3. Wrapped response:
       * {
       *   data: {
       *     sellers: [...]
       *   }
       * }
       */

      let sellers = [];

      if (Array.isArray(response)) {
        sellers = response;
      } else if (Array.isArray(response?.data)) {
        sellers = response.data;
      } else if (Array.isArray(response?.normalized?.data)) {
        sellers = response.normalized.data;
      } else if (Array.isArray(response?.data?.data)) {
        sellers = response.data.data;
      } else if (Array.isArray(response?.data?.sellers)) {
        sellers = response.data.sellers;
      } else if (Array.isArray(response?.data?.items)) {
        sellers = response.data.items;
      } else if (Array.isArray(response?.data?.list)) {
        sellers = response.data.list;
      }

      const mappedOptions = sellers
        .map((seller) => {
          /*
           * Your current API response already has:
           * {
           *   label,
           *   value,
           *   id,
           *   meta
           * }
           *
           * So value should be used as the seller ID.
           */
          const sellerId =
            seller?.value || seller?.sellerId || seller?._id || seller?.id;

          if (!sellerId) return null;

          const sellerName =
            seller?.label ||
            seller?.sellerName ||
            seller?.accountHolderName ||
            seller?.fullName ||
            seller?.name ||
            seller?.businessName ||
            seller?.meta?.accountHolderName ||
            seller?.meta?.sellerName ||
            seller?.meta?.fullName ||
            seller?.meta?.name ||
            seller?.meta?.businessName ||
            seller?.meta?.storeDisplayName ||
            "Unknown Seller";

          return {
            ...seller,

            value: String(sellerId),

            id: String(seller?.id || sellerId),

            sellerId: String(sellerId),

            label: String(sellerName),
          };
        })
        .filter(Boolean);

      /*
       * Remove duplicate sellers by seller ID.
       */
      const uniqueOptions = Array.from(
        new Map(
          mappedOptions.map((option) => [String(option.value), option]),
        ).values(),
      ).sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || "")),
      );

      console.log("Mapped seller options:", uniqueOptions);

      setSellerOptions(uniqueOptions);
    } catch (error) {
      console.error("Failed to load seller dropdown:", error);

      toast.error(getErrorMessage(error, "Failed to load seller list"));

      setSellerOptions([]);
    } finally {
      setSellerLoading(false);
    }
  }, [isSellerPanelUser]);

  /*
   * ------------------------------------------------------------
   * Load organizations/stores for selected seller
   *
   * Keep existing organizationList as fallback so existing
   * edit/create flows don't break while the seller-specific
   * organizations are being loaded.
   * ------------------------------------------------------------
   */

  const loadOrganizationOptions = useCallback(
    async (sellerId) => {
      if (isSellerPanelUser || !sellerId) {
        setOrganizationOptions([]);
        return;
      }

      setOrganizationLoading(true);

      try {
        /*
         * If your dropdownApi already exposes seller organizations,
         * use it here.
         *
         * This keeps the same seller -> organization dependency
         * used on Product Catalog.
         */
        let response;

        if (typeof dropdownApi.getSellerOrganizations === "function") {
          response = await dropdownApi.getSellerOrganizations(sellerId);
        } else if (typeof dropdownApi.getOrganizations === "function") {
          response = await dropdownApi.getOrganizations({
            sellerId,
            limit: 100,
          });
        } else {
          /*
           * Fallback to the organization data already supplied
           * by the parent component.
           */
          const fallbackOrganizations = Array.isArray(organizationList)
            ? organizationList
            : [];

          const mappedFallback = fallbackOrganizations
            .map((organization) => {
              const organizationId =
                organization?.value ||
                organization?._id ||
                organization?.id ||
                organization?.organizationId;

              if (!organizationId) return null;

              return {
                ...organization,
                value: String(organizationId),
                label:
                  organization?.storeDisplayName ||
                  organization?.legalBusinessName ||
                  organization?.organizationName ||
                  organization?.name ||
                  organization?.label ||
                  "Unknown Organization",
              };
            })
            .filter(Boolean);

          setOrganizationOptions(mappedFallback);
          return;
        }

        const responseData =
          response?.data?.data ||
          response?.normalized?.data ||
          response?.data ||
          {};

        const organizations =
          responseData?.organizations ||
          responseData?.items ||
          responseData?.list ||
          (Array.isArray(responseData) ? responseData : []);

        const mappedOptions = organizations
          .map((organization) => {
            const organizationId =
              organization?.value ||
              organization?._id ||
              organization?.id ||
              organization?.organizationId;

            if (!organizationId) return null;

            return {
              ...organization,
              value: String(organizationId),
              label:
                organization?.storeDisplayName ||
                organization?.legalBusinessName ||
                organization?.organizationName ||
                organization?.name ||
                organization?.label ||
                "Unknown Organization",
            };
          })
          .filter(Boolean);

        const uniqueOptions = Array.from(
          new Map(
            mappedOptions.map((option) => [String(option.value), option]),
          ).values(),
        ).sort((a, b) =>
          String(a.label || "").localeCompare(String(b.label || "")),
        );

        setOrganizationOptions(uniqueOptions);
      } catch (error) {
        console.error("Failed to load organization dropdown:", error);

        toast.error(getErrorMessage(error, "Failed to load organization list"));

        setOrganizationOptions([]);
      } finally {
        setOrganizationLoading(false);
      }
    },
    [isSellerPanelUser, organizationList],
  );

  /*
   * Load sellers on component mount for admin panel.
   */
  useEffect(() => {
    loadSellerOptions();
  }, [loadSellerOptions]);

  /*
   * Load organizations when seller changes.
   */
  useEffect(() => {
    if (isSellerPanelUser) return;

    const sellerId = formData?.sellerId;

    if (!sellerId) {
      setOrganizationOptions([]);
      return;
    }

    loadOrganizationOptions(sellerId);
  }, [formData?.sellerId, isSellerPanelUser, loadOrganizationOptions]);

  /*
   * Fallback organization options.
   *
   * This is useful when editing an existing product where the
   * organization is already selected but the seller-specific
   * organization API has not returned yet.
   */
  const formattedOrganizationOptions = useMemo(() => {
    const sourceOptions =
      organizationOptions.length > 0
        ? organizationOptions
        : organizationList || [];

    return sourceOptions
      .map((organization) => {
        const organizationId =
          organization?.value ||
          organization?._id ||
          organization?.id ||
          organization?.organizationId;

        if (!organizationId) return null;

        return {
          ...organization,
          value: String(organizationId),
          label:
            organization?.storeDisplayName ||
            organization?.legalBusinessName ||
            organization?.organizationName ||
            organization?.name ||
            organization?.label ||
            "Unknown Organization",
        };
      })
      .filter(Boolean);
  }, [organizationOptions, organizationList]);

  /*
   * Seller options fallback:
   * if seller dropdown API has not returned data yet,
   * preserve the sellerList prop for existing flows.
   */
  const formattedSellerOptions = useMemo(() => {
    if (sellerOptions.length > 0) {
      return sellerOptions;
    }

    return (sellerList || [])
      .map((seller) => {
        const sellerId =
          seller?.value || seller?.sellerId || seller?._id || seller?.id;

        if (!sellerId) return null;

        return {
          ...seller,
          value: String(sellerId),
          sellerId: String(sellerId),
          label:
            seller?.label ||
            seller?.sellerName ||
            seller?.accountHolderName ||
            seller?.fullName ||
            seller?.name ||
            seller?.businessName ||
            "Unknown Seller",
        };
      })
      .filter(Boolean);
  }, [sellerOptions, sellerList]);

  /*
   * ------------------------------------------------------------
   * Catalog options
   * ------------------------------------------------------------
   */

  const mergeCatalogOptions = useCallback((localOptions, serverOptions) => {
    const options = [...localOptions, ...(serverOptions || [])];

    const seen = new Set();

    return options.filter((option) => {
      const key = String(option?.value ?? option?.code ?? "");

      if (!key || seen.has(key)) return false;

      seen.add(key);

      return true;
    });
  }, []);

  const categoryOptions = useMemo(
    () => mergeCatalogOptions(localCategoryOptions, formattedCategoryList),
    [formattedCategoryList, localCategoryOptions, mergeCatalogOptions],
  );

  const hsnOptions = useMemo(
    () => mergeCatalogOptions(localHsnOptions, hsnCodeList),
    [hsnCodeList, localHsnOptions, mergeCatalogOptions],
  );

  const loadCategoryOptions = useCallback(
    async (inputValue) => {
      const search = String(inputValue || "").trim();
      if (!search) return categoryOptions;

      const options = await dropdownApi.getCategories({ search, limit: 100 });
      return mergeCatalogOptions(
        categoryOptions,
        options.map((option) => ({
          ...option,
          categoryKey: option.value,
          resourceType: "category",
          resourceId: option.id || option.value,
        })),
      ).filter((option) =>
        String(option.label || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    },
    [categoryOptions, mergeCatalogOptions],
  );

  const loadHsnOptions = useCallback(
    async (inputValue) => {
      const search = String(inputValue || "").trim();
      if (!search) return hsnOptions;

      const options = await dropdownApi.getHsnCodes({ search, limit: 100 });
      return mergeCatalogOptions(
        hsnOptions,
        options.map((option) => ({
          ...option,
          code: option.value,
          description: option.meta?.description || "",
          hsnCategory: option.meta?.category || "",
          gstRate: Number(option.meta?.gstRate || 0),
          resourceType: "hsn",
          resourceId: option.id || option.value,
        })),
      ).filter((option) => {
        const searchable = [
          option.label,
          option.code,
          option.description,
          option.hsnCategory,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(search.toLowerCase());
      });
    },
    [hsnOptions, mergeCatalogOptions],
  );

  /*
   * ------------------------------------------------------------
   * Approval
   * ------------------------------------------------------------
   */

  const approvePendingOption = async (event, option) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      option.resourceType === "brand" &&
      !/^[a-f\d]{24}$/i.test(String(option.resourceId || ""))
    ) {
      toast.error(
        "This brand is missing a valid approval ID. Refresh the brand list and try again.",
      );
      return;
    }

    const reviewAction =
      option.resourceType === "brand"
        ? reviewBrandSubmission
        : option.resourceType === "category"
          ? reviewCategorySubmission
          : reviewHsnSubmission;

    try {
      const response = await dispatch(
        reviewAction({
          _id: option.resourceId,
          categoryKey: option.resourceId,
          code: option.resourceId,
          action: "approve",
        }),
      ).unwrap();

      const approvedRecord = response?.data || {};

      if (option.resourceType === "brand") {
        const keys = [
          option.resourceId,
          option.value,
          option.brandName,
          approvedRecord._id,
          approvedRecord.id,
          approvedRecord.name,
        ]
          .filter(Boolean)
          .map(String);

        setBrandStatusOverrides((current) => ({
          ...current,
          ...Object.fromEntries(keys.map((key) => [key, "approved"])),
        }));
      }

      toast.success(
        `${
          option.resourceType === "hsn" ? "HSN code" : option.resourceType
        } approved`,
      );

      await fetchAllData?.();
    } catch (error) {
      toast.error(getErrorMessage(error, "Approval failed"));
    }
  };

  const formatCatalogOption = (option) => (
    <div className="flex items-center justify-between gap-2">
      <span>{option.label}</span>

      {!isSellerPanelUser && option.approvalStatus === "pending" && (
        <button
          type="button"
          className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
          onMouseDown={(event) => approvePendingOption(event, option)}
        >
          Approve
        </button>
      )}
    </div>
  );

  /*
   * ------------------------------------------------------------
   * Selected category
   * ------------------------------------------------------------
   */

  const selectedCategoryOption = useMemo(() => {
    const currentCategory = String(
      formData.category_id ||
        formData.categoryId ||
        formData.category ||
        formData.category_key ||
        "",
    );

    if (!currentCategory) return null;

    return (
      categoryOptions.find(
        (opt) =>
          String(opt.value) === currentCategory ||
          String(opt.categoryKey || "") === currentCategory,
      ) || null
    );
  }, [
    categoryOptions,
    formData.category_id,
    formData.categoryId,
    formData.category,
    formData.category_key,
  ]);

  /*
   * ------------------------------------------------------------
   * Selected HSN
   * ------------------------------------------------------------
   */

  const selectedHsnOption = useMemo(() => {
    const currentHsn = String(formData.hsn_code || formData.hsnCode || "");

    if (!currentHsn) return null;

    return (
      hsnOptions.find(
        (opt) =>
          String(opt.value) === currentHsn ||
          String(opt.code || "") === currentHsn,
      ) || null
    );
  }, [hsnOptions, formData.hsn_code, formData.hsnCode]);

  /*
   * ------------------------------------------------------------
   * HSN suggestion
   * ------------------------------------------------------------
   */

  const [hsnSuggestion, setHsnSuggestion] = useState(null);

  const userChangedCategoryRef = useRef(false);

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

  const categoryParentMap = useMemo(() => {
    const map = new Map();

    flatCategories.forEach((c) => {
      const key = String(c.categoryKey || c._id || "");

      if (key && c.parentKey) {
        map.set(key, String(c.parentKey));
      }
    });

    return map;
  }, [flatCategories]);

  const getCategoryAncestors = useCallback(
    (key) => {
      const chain = [];

      let cur = key;

      const seen = new Set();

      while (cur && !seen.has(cur)) {
        chain.push(cur);

        seen.add(cur);

        cur = categoryParentMap.get(cur) || null;
      }

      return chain;
    },
    [categoryParentMap],
  );

  const handleCategoryChange = useCallback(
    (option) => {
      userChangedCategoryRef.current = true;

      setHsnSuggestion(null);

      handleSelectChange(option, "CATEGORY_ID");
    },
    [handleSelectChange],
  );

  useEffect(() => {
    if (!userChangedCategoryRef.current) return;

    const categoryKey = String(
      formData?.category_id ||
        formData?.categoryId ||
        formData?.category ||
        formData?.category_key ||
        "",
    );

    if (!categoryKey || !Array.isArray(hsnCodeList) || !hsnCodeList.length)
      return;

    const ancestors = getCategoryAncestors(categoryKey);

    const match = ancestors.reduce(
      (found, ancestor) =>
        found || hsnCodeList.find((o) => o.hsnCategory === ancestor) || null,
      null,
    );

    if (!match) {
      setHsnSuggestion({
        type: "none",
      });

      return;
    }

    setHsnSuggestion({
      type: "suggest",
      option: match,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData?.category_id,
    formData?.categoryId,
    formData?.category,
    formData?.category_key,
  ]);

  /*
   * ------------------------------------------------------------
   * Modals
   * ------------------------------------------------------------
   */

  const [isCategoryModal, setIsCategoryModal] = useState(false);

  const [isHsnAddModal, setIsHsnAddModal] = useState(false);

  const [isBrandModal, setIsBrandModal] = useState(false);

  const [brandSubmission, setBrandSubmission] = useState({
    name: "",
    logo: "",
    thumbnails: "",
    description: "",
  });

  const [myBrandSubmissions, setMyBrandSubmissions] = useState([]);

  const [brandSubmitting, setBrandSubmitting] = useState(false);

  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  const [formErrors, setFormErrors] = useState({});

  const [categoryForm, setCategoryForm] = useState(INITIAL_FORM_CATEGORY);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    onBusyChange?.(
      brandSubmitting ||
        brandLogoUploading ||
        Boolean(refreshingCatalog) ||
        isLoading ||
        sellerLoading ||
        organizationLoading,
    );
  }, [
    brandSubmitting,
    brandLogoUploading,
    refreshingCatalog,
    isLoading,
    sellerLoading,
    organizationLoading,
    onBusyChange,
  ]);

  /*
   * ------------------------------------------------------------
   * Brand submissions
   * ------------------------------------------------------------
   */

  const loadMyBrandSubmissions = useCallback(async () => {
    try {
      const response = await dispatch(
        isSellerPanelUser
          ? getMyBrandSubmissions()
          : getBrandList({
              page: 1,
              limit: 500,
            }),
      ).unwrap();

      const data = response?.data;

      setMyBrandSubmissions(
        Array.isArray(data) ? data : data?.list || data?.items || [],
      );
    } catch {
      // Optional request; don't block product editing.
    }
  }, [dispatch, isSellerPanelUser]);

  useEffect(() => {
    loadMyBrandSubmissions();
  }, [loadMyBrandSubmissions]);

  const refreshCatalogList = async (type) => {
    setRefreshingCatalog(type);

    try {
      if (type === "brand") {
        await Promise.all([fetchAllData?.(), loadMyBrandSubmissions()]);
      } else {
        const call =
          type === "category"
            ? API_CALL_OBJECT["Category List"]
            : API_CALL_OBJECT["Hsn code list"];

        await fetchAllData?.([call]);
      }

      toast.success(`${type === "hsn" ? "HSN code" : type} list refreshed`);
    } catch (error) {
      toast.error(getErrorMessage(error, `Could not refresh ${type} list`));
    } finally {
      setRefreshingCatalog("");
    }
  };

  const DisabledPolicyState = ({ type, title, description }) => (
    <div className="relative flex min-h-[250px] flex-col items-center justify-center overflow-hidden px-4 py-8 text-center">
      {/* Subtle background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFF7EA]/50 blur-2xl"
      />

      {/* Icon */}
      <div className="relative mb-3 flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-[#F5E4C5] bg-[#FFF7EA] shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70">
          {type === "return" ? (
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="h-10 w-10"
            >
              <path
                d="M16 20 32 11 48 20 32 29 16 20Z"
                stroke="#102F70"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M16 20V43L32 52V29M48 20V31M32 29V52"
                stroke="#102F70"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M45 38H53C60 38 62 48 56 52C51 56 44 53 43 48M45 38L50 33M45 38L50 43"
                stroke="#D6A323"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="h-10 w-10"
            >
              <path
                d="M32 7 51 15V29C51 42 43 51 32 57C21 51 13 42 13 29V15L32 7Z"
                stroke="#102F70"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M23 32L29 38L42 24"
                stroke="#D6A323"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Heading */}
      <h4 className="relative m-0 text-base font-semibold leading-6 text-[#102F70] sm:text-lg">
        {title}
      </h4>

      {/* Description */}
      <p className="relative mt-1.5 max-w-md text-xs leading-5 text-[#6489BD] sm:text-sm">
        {description}
      </p>
    </div>
  );

  /*
   * ------------------------------------------------------------
   * Brand
   * ------------------------------------------------------------
   */

  const formik = useFormik({
    initialValues: {
      _id: brandSubmission._id || "",
      name: brandSubmission.name || "",
      logo: brandSubmission.logo || "",
      thumbnails: brandSubmission.thumbnails || "",
      description: brandSubmission.description || "",
    },
    enableReinitialize: true,
    validationSchema: brandValidationSchema,
    validateOnBlur: true,
    validateOnChange: true,

    onSubmit: async (values) => {
      setBrandSubmission(values);
      await submitBrandRequest(values);
    },
  });

  const handleBrandLogoUpload = async (file) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

    const extension = file.name?.split(".").pop()?.toLowerCase();

    if (
      (file.type && !allowedTypes.includes(file.type)) ||
      !["png", "jpg", "jpeg", "webp"].includes(extension)
    ) {
      toast.error("Only JPG, PNG, or WEBP images allowed");
      return;
    }

    if (!file.size || file.size > 5 * 1024 * 1024) {
      toast.error("Brand logo must be 5MB or less");
      return;
    }

    setBrandLogoUploading(true);

    try {
      const logoUrl = await uploadFile(file, "BRANDS");

      setBrandSubmission((current) => ({
        ...current,
        ...formik.values,
        logo: logoUrl,
      }));

      toast.success("Brand logo uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload brand logo"));
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const submitBrandRequest = async (values) => {
    if (brandLogoUploading || brandSubmitting) {
      return toast.error("Please wait for logo upload to finish");
    }

    setBrandSubmitting(true);

    try {
      const submissionData = {
        ...values,
        name: values.name.trim().replace(/ +/g, " "),
        description: values.description?.trim() || "",
      };

      if (isSellerPanelUser) {
        const response = await dispatch(
          submissionData._id
            ? resubmitBrandForApproval({
                ...submissionData,
                _id: submissionData._id,
              })
            : submitBrandForApproval(submissionData),
        ).unwrap();

        const createdBrand = response?.data || {};

        const brandName = createdBrand.name || submissionData.name;

        setMyBrandSubmissions((current) => [
          {
            ...submissionData,
            ...createdBrand,
            name: brandName,
            approvalStatus: createdBrand.approvalStatus || "pending",
          },
          ...current.filter(
            (brand) =>
              String(brand._id || "") !==
              String(createdBrand._id || submissionData._id || ""),
          ),
        ]);

        handleSelectChange(
          {
            value: brandName,
            label: `${brandName} (Pending approval)`,
            brandName,
            resourceId: createdBrand._id || createdBrand.id,
            approvalStatus: createdBrand.approvalStatus || "pending",
            isPendingBrand: true,
            submittedBySellerId: createdBrand.submittedBySellerId,
          },
          "BRAND_ID",
        );

        toast.success(
          submissionData._id
            ? "Brand updated and pending approval"
            : "Brand submitted for approval",
        );
      } else {
        const response = await dispatch(
          createBrand({
            ...submissionData,
            active: true,
          }),
        ).unwrap();

        const createdBrand = response?.data || {};

        const brandName = createdBrand.name || submissionData.name;

        handleSelectChange(
          {
            value: brandName,
            label: brandName,
            brandName,
            resourceId: createdBrand._id || createdBrand.id,
            approvalStatus: createdBrand.approvalStatus || "approved",
          },
          "BRAND_ID",
        );

        toast.success("Brand created and selected");
      }

      setBrandSubmission({
        name: "",
        logo: "",
        thumbnails: "",
        description: "",
      });

      setIsBrandModal(false);

      await Promise.allSettled([
        loadMyBrandSubmissions(),
        Promise.resolve(fetchAllData?.()),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not submit brand"));
    } finally {
      setBrandSubmitting(false);
    }
  };

  const brandOptions = useMemo(() => {
    const approvedNames = new Set(
      (formattedBrandList || []).map((brand) =>
        String(brand.value || "").toLowerCase(),
      ),
    );

    const submissionBrands = myBrandSubmissions
      .filter(
        (brand) =>
          (brand.approvalStatus || "pending") === "pending" &&
          !approvedNames.has(String(brand.name || "").toLowerCase()),
      )
      .map((brand) => {
        const approvalStatus = brand.approvalStatus || "pending";
        const statusLabel =
          approvalStatus === "rejected" ? "Rejected" : "Pending approval";

        return {
          value: brand.name,
          label: `${brand.name} (${statusLabel})`,
          brandName: brand.name,
          resourceType: "brand",
          resourceId: brand._id || brand.id,
          approvalStatus,
          isPendingBrand: approvalStatus === "pending",
          submittedBySellerId: brand.submittedBySellerId,
        };
      });

    return [...submissionBrands, ...(formattedBrandList || [])].map((brand) => {
      const approvalStatus =
        brandStatusOverrides[String(brand.resourceId || "")] ||
        brandStatusOverrides[String(brand.value || "")] ||
        brandStatusOverrides[String(brand.brandName || "")] ||
        brand.approvalStatus;

      if (approvalStatus === brand.approvalStatus) {
        return brand;
      }

      const baseName =
        brand.brandName ||
        String(brand.label || "").replace(/ \(\s*Pending approval\s*\)$/, "");

      return {
        ...brand,
        approvalStatus,
        label:
          approvalStatus === "pending"
            ? `${baseName} (Pending approval)`
            : baseName,
      };
    });
  }, [brandStatusOverrides, formattedBrandList, myBrandSubmissions]);

  const loadBrandOptions = useCallback(
    async (inputValue) => {
      const search = String(inputValue || "").trim();
      if (!search) return brandOptions;

      const normalizedSearch = search.toLowerCase();
      const matchesSearch = (option) =>
        [
          option.label,
          option.value,
          option.brandName,
          option.resourceId,
          option.id,
          option.meta?.slug,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      // Keep locally submitted pending brands searchable, but always query
      // the server as well. The initial dropdown list is only a prefill and
      // must not become the source of truth for search results.
      const localMatches = brandOptions.filter(matchesSearch);

      const options = await dropdownApi.getBrands({ search, limit: 100 });
      return mergeCatalogOptions(
        localMatches,
        options.map((option) => ({
          ...option,
          brandName: option.label || option.value || "",
          resourceType: "brand",
          resourceId: option.id || option._id || option.value,
        })),
      ).filter(matchesSearch);
    },
    [brandOptions, mergeCatalogOptions],
  );

  const selectedBrandOption = useMemo(() => {
    const rawBrand =
      formData.brand || formData.brandId || formData.brand_id || "";
    const savedBrandName =
      formData.brandName ||
      (typeof rawBrand === "object"
        ? rawBrand.brandName || rawBrand.label || rawBrand.name
        : "");

    const currentBrand =
      typeof rawBrand === "object"
        ? rawBrand.value || rawBrand._id || rawBrand.id || rawBrand.name
        : rawBrand;

    if (!currentBrand) return null;

    return (
      brandOptions.find(
        (option) =>
          String(option.value) === String(currentBrand) ||
          String(option.label) === String(currentBrand) ||
          String(option.brandName || "") === String(currentBrand) ||
          (savedBrandName &&
            String(option.brandName || option.label || option.value) ===
              String(savedBrandName)) ||
          String(
            option.brandId ||
              option.resourceId ||
              option._id ||
              option.id ||
              "",
          ) === String(currentBrand),
      ) ||
      (typeof rawBrand === "object"
        ? {
            ...rawBrand,
            value: currentBrand,
            label:
              rawBrand.label ||
              rawBrand.brandName ||
              rawBrand.name ||
              savedBrandName ||
              currentBrand,
          }
        : {
            value: currentBrand,
            label: savedBrandName || currentBrand,
            brandName: savedBrandName || undefined,
          })
    );
  }, [
    brandOptions,
    formData.brand,
    formData.brandId,
    formData.brandName,
    formData.brand_id,
  ]);

  const handleBrandSelect = (option) => {
    if (!option) {
      handleSelectChange(null, "BRAND_ID");

      return;
    }

    if (option.isAddBrand) {
      setBrandSubmission({
        name: "",
        logo: "",
        thumbnails: "",
        description: "",
      });

      setIsBrandModal(true);

      return;
    }

    handleSelectChange(
      option.brandName
        ? {
            ...option,
            label: option.brandName,
          }
        : option,
      "BRAND_ID",
    );
  };

  /*
   * ------------------------------------------------------------
   * Warranty
   * ------------------------------------------------------------
   */

  const warrantyOptions = useMemo(
    () =>
      warrantyTemplatesFromMaster.options.length > 0
        ? warrantyTemplatesFromMaster.options
        : formattedWarrantyList || [],
    [formattedWarrantyList, warrantyTemplatesFromMaster.options],
  );

  const selectedWarrantyOption = useMemo(() => {
    const currentValue = `${String(formData.warranty?.period ?? "")}:${String(
      formData.warranty?.periodUnit || "",
    )}`;

    return (
      warrantyOptions.find((opt) => String(opt.value) === currentValue) || null
    );
  }, [
    warrantyOptions,
    formData.warranty?.period,
    formData.warranty?.periodUnit,
  ]);

  /*
   * ------------------------------------------------------------
   * Category / HSN form handlers
   * ------------------------------------------------------------
   */

  const handleInputCategoryChange = (e) => {
    const { name, value } = e.target;

    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUploadCategory = async (file, fieldName) => {
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];

    const allowedExtensions = ["png", "jpg", "jpeg", "webp", "svg"];

    const fileExtension = file.name?.split(".").pop()?.toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      toast.error("Only JPG, PNG, WEBP, or SVG images allowed");

      return;
    }

    try {
      setIsLoading(true);

      const uploadedImageUrl = await uploadFile(file, "THUMBNAILS");

      setCategoryForm((prev) => ({
        ...prev,
        [fieldName]: uploadedImageUrl,
      }));

      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCategoryChange = (selectedOption, name) => {
    setCategoryForm((prev) => ({
      ...prev,
      [name]: selectedOption,
    }));
  };

  const handleDashboardVisible = () => {
    setCategoryForm((prev) => ({
      ...prev,
      isDashboardVisible: !prev?.isDashboardVisible,
      priority: !prev?.isDashboardVisible ? prev.priority : 0,
    }));
  };

  /*
   * ------------------------------------------------------------
   * Category options
   * ------------------------------------------------------------
   */

  const createSelectOptions = useMemo(() => {
    const options = [
      {
        label: "ROOT",
        value: "ROOT",
      },
    ];

    if (!Array.isArray(allCategories) || !allCategories.length) {
      return options;
    }

    const hasNested = allCategories.some(
      (item) =>
        Array.isArray(item?.subcategories) ||
        Array.isArray(item?.subCategories),
    );

    if (hasNested) {
      const addOptions = (categories, prefix = "", depth = 1) => {
        if (!Array.isArray(categories)) return;

        categories.forEach((category) => {
          const categoryName =
            category.name || category.title || category.categoryKey;

          const label = prefix ? `${prefix} > ${categoryName}` : categoryName;

          options.push({
            value: category.categoryKey || category._id,
            label,
          });

          const children =
            category.subcategories || category.subCategories || [];

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
      const parent = category?.parentKey
        ? String(category.parentKey)
        : "__root__";

      if (!byParent.has(parent)) {
        byParent.set(parent, []);
      }

      byParent.get(parent).push(category);
    });

    const walk = (parent = "__root__", prefix = "", depth = 1) => {
      const children = byParent.get(parent) || [];

      children
        .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
        .forEach((category) => {
          const categoryName =
            category.name || category.title || category.categoryKey;

          const label = prefix ? `${prefix} > ${categoryName}` : categoryName;

          options.push({
            value: category.categoryKey || category._id,
            label,
          });

          if (depth < 2) {
            walk(
              String(category.categoryKey || category._id),
              label,
              depth + 1,
            );
          }
        });
    };

    walk();

    return options;
  }, [allCategories]);

  /*
   * ------------------------------------------------------------
   * Create Category
   * ------------------------------------------------------------
   */

  const handleCategorySubmit = async () => {
    try {
      const selectedParentKey = categoryForm.parentCategory?.value;
      const isRootCategory = !selectedParentKey || selectedParentKey === "ROOT";

      const reqData = {
        name: categoryForm.categoryName.trim(),
        bannerUrl: categoryForm.bannerUrl,
        iconUrl: categoryForm.iconUrl,
        type: isRootCategory ? "ROOT" : "CHILD",
        active: true,
        isDashboardVisible: categoryForm?.isDashboardVisible,
        priority: categoryForm?.priority,
      };

      if (!isRootCategory) {
        reqData.parentKey = selectedParentKey;

        reqData.level = 1;
      }

      setIsLoading(true);

      const res = await dispatch(createCategory(reqData)).unwrap();

      const createdCategory = res?.data || {};

      const categoryValue =
        createdCategory.categoryKey ||
        createdCategory._id ||
        createdCategory.id;

      if (categoryValue) {
        const newOption = {
          value: categoryValue,
          categoryKey: createdCategory.categoryKey || categoryValue,
          label:
            createdCategory.title ||
            createdCategory.name ||
            categoryForm.categoryName,
          resourceType: "category",
          resourceId:
            createdCategory._id || createdCategory.id || categoryValue,
          approvalStatus: createdCategory.approvalStatus,
        };

        setLocalCategoryOptions((current) => [newOption, ...current]);

        handleSelectChange(newOption, "CATEGORY_ID");
      }

      toast.success(res.message || "Category created successfully");

      setIsCategoryModal(false);

      setCategoryForm(INITIAL_FORM_CATEGORY);

      fetchAllData([API_CALL_OBJECT["Category List"]]);
    } catch (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message ||
            error?.error?.message ||
            error?.data?.message ||
            error?.response?.data?.message ||
            "Failed to create category";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Create HSN
   * ------------------------------------------------------------
   */

  const handleHsnSubmit = async (values) => {
    const basePayload = {
      code: values.code.trim(),
      IGST: Number(values.IGST),
      CGST: Number(values.CGST),
      SGST: Number(values.SGST),
      additionalTax: Number(values.additionalTax),
      description: values.description?.trim() || "",
      active: true,
    };

    try {
      const res = await dispatch(createHsn(basePayload)).unwrap();

      const createdHsn = res?.data || {};

      const hsnValue = createdHsn.code || basePayload.code;

      const newOption = {
        value: hsnValue,
        code: hsnValue,
        label: `${createdHsn.description
          ? `${hsnValue} - ${createdHsn.description}`
          : hsnValue}${
          createdHsn.approvalStatus === "pending"
            ? " (Pending approval)"
            : ""
        }`,
        description: createdHsn.description || basePayload.description,
        resourceType: "hsn",
        resourceId: createdHsn._id || createdHsn.id || hsnValue,
        approvalStatus: createdHsn.approvalStatus,
        submittedBySellerId: createdHsn.submittedBySellerId,
        active: createdHsn.active !== false,
      };

      setLocalHsnOptions((current) => [newOption, ...current]);

      handleSelectChange(newOption, "hsn_code");

      toast.success(
        createdHsn.approvalStatus === "pending"
          ? "HSN code submitted for admin approval"
          : "HSN code created successfully",
      );

      setIsHsnAddModal(false);

      fetchAllData([API_CALL_OBJECT["Hsn code list"]]);
      return true;
    } catch (error) {
      console.error("HSN Create Error:", error);

      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message ||
            error?.error?.message ||
            error?.response?.data?.message ||
            "Failed to save HSN Code";

      toast.error(errorMessage);
      return false;
    }
  };

  /*
   * ------------------------------------------------------------
   * Validation
   * ------------------------------------------------------------
   */

  const validateCategoryForm = () => {
    const newErrors = {};

    if (!categoryForm.categoryName) {
      newErrors.categoryName = "Category name is required";
    }

    setFormErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /*
   * ------------------------------------------------------------
   * Name formatting
   * ------------------------------------------------------------
   */

  const toTitleCase = (str) =>
    str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
    );

  const handleNameBlur = (e) => {
    const { name, value } = e.target;

    const titled = toTitleCase(value.trim());

    if (titled !== value) {
      handleChange({
        target: {
          name,
          value: titled,
        },
      });
    }
  };

  const isReturnable = Boolean(formData.warranty?.returnPolicy?.returnable);
  const hasLegacyWarrantyDetails =
    Number(formData.warranty?.period) >= 1 ||
    Boolean(String(formData.warranty?.provider || "").trim());
  const warrantyEnabled =
    formData.warranty?.enabled === true ||
    (formData.warranty?.enabled === undefined && hasLegacyWarrantyDetails);

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <>
      <Loader loading={isLoading} />

      <div className="bg-white">
        <div className="product-form-section-header">
          <h3>Basic Details</h3>

          <p>
            Customize the product basic details like name, brand, and categories
          </p>
        </div>

        {(errors?.basicDetails ||
          errors?.dimensions ||
          errors?.restockingFee ||
          errors?.shortDescription) && (
          <div
            className="mb-4 space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {errors.basicDetails && <p>{errors.basicDetails}</p>}
            {errors.dimensions && <p>{errors.dimensions}</p>}
            {errors.restockingFee && <p>{errors.restockingFee}</p>}
            {errors.shortDescription && <p>{errors.shortDescription}</p>}
          </div>
        )}

        <div className="space-y-5">
          <div className="grid w-full grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
            {/* =====================================================
                SELLER
                ===================================================== */}

            {!isSellerPanelUser && (
              <div>
                <FilterSelect
                  label="Seller"
                  name="sellerId"
                  value={
                    formattedSellerOptions.find(
                      (option) =>
                        String(option.value) ===
                        String(formData.sellerId || ""),
                    ) || null
                  }
                  onChange={(option) => {
                    /*
                     * Seller changes should clear the
                     * organization/store because stores
                     * belong to the selected seller.
                     */
                    handleSelectChange(option, "SELLER_ID");

                    handleSelectChange(null, "ORGANIZATION_ID");

                    setOrganizationOptions([]);
                  }}
                  options={formattedSellerOptions}
                  error={errors?.sellerId}
                  placeholder="Select Seller"
                  required
                  isLoading={sellerLoading}
                  isClearable
                />
              </div>
            )}

            {/* =====================================================
                ORGANIZATION / STORE
                ===================================================== */}

            {!isSellerPanelUser && (
              <div>
                <FilterSelect
                  label="Legal Organization"
                  name="organizationId"
                  value={
                    formattedOrganizationOptions.find(
                      (option) =>
                        String(option.value) ===
                        String(formData.organizationId || ""),
                    ) || null
                  }
                  onChange={(option) =>
                    handleSelectChange(option, "ORGANIZATION_ID")
                  }
                  options={formattedOrganizationOptions}
                  error={errors?.organizationId}
                  placeholder={
                    !formData.sellerId
                      ? "Select Seller First"
                      : organizationLoading
                        ? "Loading organizations..."
                        : "Select Organization"
                  }
                  required
                  isDisabled={!formData.sellerId}
                  isLoading={organizationLoading}
                  isClearable
                />
              </div>
            )}

            {/* =====================================================
                PRODUCT NAME
                ===================================================== */}

            <div
              className={`${
                userRole !== "seller-sub-admin" ? "col-span-1" : "col-span-2"
              }`}
            >
              <Input
                labelName="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
                minLength={3}
                maxLength={200}
                required
                helpText="Name of the product as it will be displayed"
                error={errors?.name}
              />
            </div>

            {/* =====================================================
                BRAND
                ===================================================== */}

            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <FilterSelect
                  label="Brand"
                  name="brand"
                  value={selectedBrandOption}
                  onChange={handleBrandSelect}
                  options={brandOptions}
                  loadOptions={loadBrandOptions}
                  defaultOptions={brandOptions}
                  cacheOptions={false}
                  placeholder="Select Brand"
                  error={errors?.brand}
                  formatOptionLabel={formatCatalogOption}
                  isClearable
                  required
                />
              </div>

              <PermissionGuard module="brands" action="create" allowSeller hide>
                <button
                  type="button"
                  className="mt-6 flex-shrink-0 rounded-md border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]/40 px-3 py-2 text-xs font-semibold text-[var(--admin-gold-dark)] transition-colors hover:bg-[var(--admin-gold-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-gold)]"
                  onClick={() => setIsBrandModal(true)}
                >
                  + Add
                </button>
              </PermissionGuard>

              <button
                type="button"
                aria-label="Refresh brand list"
                title="Refresh brand list"
                disabled={refreshingCatalog === "brand"}
                className="mt-6 flex-shrink-0 rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => refreshCatalogList("brand")}
              >
                <FiRefreshCw
                  className={
                    refreshingCatalog === "brand" ? "animate-spin" : ""
                  }
                />
              </button>
            </div>

            {/* =====================================================
                CATEGORY
                ===================================================== */}

            <div>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FilterSelect
                    label="Category"
                    name="category_id"
                    value={selectedCategoryOption}
                    onChange={handleCategoryChange}
                    options={categoryOptions}
                    loadOptions={loadCategoryOptions}
                    defaultOptions={categoryOptions}
                    error={errors?.category_id}
                    placeholder="Select Category"
                    helperText="Attributes are controlled by the selected category schema."
                    formatOptionLabel={formatCatalogOption}
                    required
                    isClearable
                  />
                </div>

                {!isSellerPanelUser && (
                  <PermissionGuard module="categories" action="create" hide>
                    <button
                      type="button"
                      className="mt-6 flex-shrink-0 rounded-md border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]/40 px-3 py-2 text-xs font-semibold text-[var(--admin-gold-dark)] transition-colors hover:bg-[var(--admin-gold-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-gold)]"
                      onClick={() => setIsCategoryModal(true)}
                    >
                      + Add
                    </button>
                  </PermissionGuard>
                )}

                <button
                  type="button"
                  aria-label="Refresh category list"
                  title="Refresh category list"
                  disabled={refreshingCatalog === "category"}
                  className="mt-6 flex-shrink-0 rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => refreshCatalogList("category")}
                >
                  <FiRefreshCw
                    className={
                      refreshingCatalog === "category" ? "animate-spin" : ""
                    }
                  />
                </button>
              </div>
            </div>

            {/* =====================================================
                HSN
                ===================================================== */}

            <div>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FilterSelect
                    label="HSN Code"
                    name="hsn_code"
                    value={selectedHsnOption}
                    onChange={(option) => {
                      setHsnSuggestion(null);

                      handleSelectChange(option, "hsn_code");
                    }}
                    options={hsnOptions}
                    loadOptions={loadHsnOptions}
                    defaultOptions={hsnOptions}
                    error={errors?.hsn_code}
                    placeholder="Search by code or description…"
                    formatOptionLabel={formatCatalogOption}
                    isClearable
                    required
                  />
                </div>

                <PermissionGuard module="tax" action="create" allowSeller hide>
                  <button
                    type="button"
                    className="mt-6 flex-shrink-0 rounded-md border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]/40 px-3 py-2 text-xs font-semibold text-[var(--admin-gold-dark)] transition-colors hover:bg-[var(--admin-gold-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-gold)]"
                    onClick={() => setIsHsnAddModal(true)}
                  >
                    + Add
                  </button>
                </PermissionGuard>

                <button
                  type="button"
                  aria-label="Refresh HSN code list"
                  title="Refresh HSN code list"
                  disabled={refreshingCatalog === "hsn"}
                  className="mt-6 flex-shrink-0 rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => refreshCatalogList("hsn")}
                >
                  <FiRefreshCw
                    className={
                      refreshingCatalog === "hsn" ? "animate-spin" : ""
                    }
                  />
                </button>
              </div>

              {hsnSuggestion?.type === "suggest" && (
                <div className="mt-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-xs text-blue-500">
                      ℹ
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-blue-800">
                        HSN suggestion for this category
                      </p>

                      <p className="mt-0.5 truncate text-xs text-blue-700">
                        {hsnSuggestion.option.code}

                        {hsnSuggestion.option.description
                          ? ` — ${hsnSuggestion.option.description}`
                          : ""}

                        {` (${hsnSuggestion.option.gstRate}% GST)`}
                      </p>
                    </div>

                    <div className="mt-0.5 flex flex-shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectChange(hsnSuggestion.option, "hsn_code");

                          setHsnSuggestion(null);
                        }}
                        className="rounded-md bg-[var(--admin-blue)] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Apply
                      </button>

                      <button
                        type="button"
                        onClick={() => setHsnSuggestion(null)}
                        className="rounded-md border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {hsnSuggestion?.type === "none" && (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <span className="flex-shrink-0 text-xs text-amber-500">
                    ⚠
                  </span>

                  <p className="flex-1 text-xs text-amber-700">
                    No HSN mapping found for this category. Please select
                    manually.
                  </p>

                  <button
                    type="button"
                    onClick={() => setHsnSuggestion(null)}
                    className="flex-shrink-0 text-base leading-none text-amber-400 hover:text-amber-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* =====================================================
                PRODUCT FAMILY
                ===================================================== */}

            <FilterSelect
              label="Product Family Code"
              value={
                (formattedProductFamilyList || []).find(
                  (opt) =>
                    String(opt.value) ===
                    String(formData.productFamilyCode || ""),
                ) || null
              }
              onChange={(e) => handleSelectChange(e, "PRODUCT_FAMILY")}
              options={formattedProductFamilyList || []}
              placeholder="Select family code"
              error={errors?.productFamilyCode}
              isClearable
            />

            {/* =====================================================
                DESCRIPTION
                ===================================================== */}

            <div
              data-error-field="description"
              name="description"
              className="md:col-span-2"
            >
              <TextEditor
                label="Description"
                value={formData.description || ""}
                onChange={(content) =>
                  handleInputReactQuillChange?.("description", content)
                }
                required
                maxLength={5000}
                placeholder="Enter detailed product description"
                error={errors?.description}
                height="220px"
                className="[&_.ql-container]:h-[220px] [&_.ql-editor]:min-h-[180px]"
              />
            </div>

            {/* =====================================================
                WARRANTY
                ===================================================== */}

            <section className="product-form-subsection md:col-span-2">
              <div className="product-form-section-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3>Warranty information</h3>
                  <p>
                    Enable this only when the product includes warranty
                    coverage.
                  </p>
                </div>
                <div className="shrink-0">
                  <Input
                    className="!mb-0"
                    labelName="Warranty Applicable"
                    name="warranty.enabled"
                    type="switch"
                    value={warrantyEnabled}
                    onChange={(eventOrValue) => {
                      const checked =
                        typeof eventOrValue === "boolean"
                          ? eventOrValue
                          : Boolean(eventOrValue?.target?.checked);
                      handleNestedChange("warranty.enabled", checked);
                      if (!checked) {
                        [
                          "period",
                          "periodUnit",
                          "provider",
                          "type",
                          "terms",
                        ].forEach((field) =>
                          handleNestedChange(`warranty.${field}`, ""),
                        );
                      }
                    }}
                  />
                </div>
              </div>

              {warrantyEnabled ? (
                <>
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <Input
                      labelName="Warranty Period"
                      name="warranty.period"
                      type="number"
                      min={1}
                      max={365}
                      value={formData.warranty?.period ?? ""}
                      onKeyDown={preventNegativeNumericKey}
                      onPaste={preventNegativeNumericPaste}
                      onChange={(event) => {
                        if (isNegativeNumericValue(event.target.value)) return;
                        handleNestedChange(
                          "warranty.period",
                          event.target.value,
                        );
                      }}
                      placeholder="Example: 12"
                      helperText="Use a value between 1 and 365."
                      error={errors?.warrantyPeriod}
                    />

                    <FilterSelect
                      label="Warranty Unit"
                      value={
                        warrantyUnits.options.find(
                          (option) =>
                            option.value === formData.warranty?.periodUnit,
                        ) || null
                      }
                      onChange={(option) =>
                        handleNestedChange(
                          "warranty.periodUnit",
                          option?.value || "",
                        )
                      }
                      options={warrantyUnits.options}
                      placeholder="Select warranty unit"
                      isLoading={warrantyUnits.loading}
                      isClearable
                      error={errors?.warrantyPeriodUnit}
                    />
                    <FilterSelect
                      label="Warranty Provider"
                      value={
                        warrantyProviders.options.find(
                          (option) =>
                            option.value === formData.warranty?.provider,
                        ) || null
                      }
                      onChange={(option) =>
                        handleNestedChange(
                          "warranty.provider",
                          option?.value || "",
                        )
                      }
                      options={warrantyProviders.options}
                      placeholder="Select warranty provider"
                      isLoading={warrantyProviders.loading}
                      isClearable
                      error={errors?.warrantyProvider}
                    />

                    <FilterSelect
                      label="Warranty Type"
                      value={
                        warrantyTypes.options.find(
                          (option) => option.value === formData.warranty?.type,
                        ) || null
                      }
                      onChange={(option) =>
                        handleNestedChange("warranty.type", option?.value || "")
                      }
                      options={warrantyTypes.options}
                      placeholder="Select warranty type"
                      isLoading={warrantyTypes.loading}
                      isClearable
                      error={errors?.warrantyType}
                    />
                  </div>

                  <TextEditor
                    label="Warranty description and rules"
                    value={formData.warranty?.terms || ""}
                    onChange={(content) =>
                      handleNestedChange("warranty.terms", content)
                    }
                    maxLength={1000}
                    height="220px"
                    className="[&_.ql-container]:h-[220px] [&_.ql-editor]:min-h-[180px]"
                    placeholder="Add coverage, exclusions, claim process, required proof, service locations, and other warranty rules"
                  />
                  {errors?.warrantyTerms && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {errors.warrantyTerms}
                    </p>
                  )}
                </>
              ) : (
                <DisabledPolicyState
                  type="warranty"
                  title="Warranty is not offered"
                  description="Turn on to add warranty details."
                />
              )}
            </section>

            {/* =====================================================
                RETURN POLICY
                ===================================================== */}

            <section className="product-form-subsection md:col-span-2">
              <div className="product-form-section-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3>Product Return Policy</h3>

                  <p className="max-w-2xl">
                    Configure return rules for new orders. Existing orders
                    remain unchanged.
                  </p>
                </div>

                <div className="shrink-0">
                  <div className="flex items-center justify-end">
                    <Input
                      className="!mb-0"
                      labelName="Returnable"
                      name="warranty.returnPolicy.returnable"
                      type="switch"
                      value={isReturnable}
                      onChange={(eventOrValue) => {
                        const checked =
                          typeof eventOrValue === "boolean"
                            ? eventOrValue
                            : Boolean(eventOrValue?.target?.checked);

                        handleNestedChange(
                          "warranty.returnPolicy.returnable",
                          checked,
                        );

                        handleNestedChange(
                          "warranty.returnPolicy.eligible",
                          checked,
                        );

                        handleNestedChange(
                          "warranty.returnPolicy.type",
                          checked ? "standard" : "non_returnable",
                        );

                        if (!checked) {
                          handleNestedChange("warranty.returnPolicy.days", 0);

                          handleNestedChange(
                            "warranty.returnPolicy.returnWindowDays",
                            0,
                          );
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              {isReturnable ? (
                <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                  <Input
                    labelName="Return Window Days"
                    name="warranty.returnPolicy.returnWindowDays"
                    type="number"
                    min={1}
                    max={365}
                    disabled={!isReturnable}
                    value={
                      formData.warranty?.returnPolicy?.returnWindowDays ?? ""
                    }
                    onKeyDown={preventNegativeNumericKey}
                    onPaste={preventNegativeNumericPaste}
                    error={errors?.returnWindowDays}
                    helperText={
                      isReturnable
                        ? "Use a return window between 1 and 365 days."
                        : "Enable Returnable to set the return window."
                    }
                    onChange={(event) => {
                      if (isNegativeNumericValue(event.target.value)) return;
                      const value =
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value);

                      const nextValue = Number.isNaN(value) ? 0 : value;

                      handleNestedChange(
                        "warranty.returnPolicy.returnWindowDays",
                        nextValue,
                      );

                      handleNestedChange(
                        "warranty.returnPolicy.days",
                        nextValue,
                      );
                    }}
                  />

                  <Input
                    labelName="Allowed Resolution"
                    name="warranty.returnPolicy.resolution"
                    type="select"
                    value={
                      formData.warranty?.returnPolicy?.resolution ||
                      "refund_or_replacement"
                    }
                    onChange={(option) =>
                      handleNestedChange(
                        "warranty.returnPolicy.resolution",
                        option?.value || "refund_or_replacement",
                      )
                    }
                    options={[
                      {
                        value: "refund_or_replacement",
                        label: "Refund or replacement",
                      },
                      {
                        value: "refund",
                        label: "Refund only",
                      },
                      {
                        value: "replacement",
                        label: "Replacement only",
                      },
                    ]}
                  />

                  <Input
                    labelName="Return Shipping Paid By"
                    name="warranty.returnPolicy.shippingPaidBy"
                    type="select"
                    disabled={isSellerPanelUser}
                    value={
                      isSellerPanelUser
                        ? "seller"
                        : formData.warranty?.returnPolicy?.shippingPaidBy ||
                          "seller"
                    }
                    onChange={(option) =>
                      handleNestedChange(
                        "warranty.returnPolicy.shippingPaidBy",
                        option?.value || "seller",
                      )
                    }
                    options={
                      isSellerPanelUser
                        ? [
                            {
                              value: "seller",
                              label: "Seller",
                            },
                          ]
                        : [
                            {
                              value: "platform",
                              label: "Platform",
                            },
                            {
                              value: "seller",
                              label: "Seller",
                            },
                            {
                              value: "customer",
                              label: "Customer",
                            },
                          ]
                    }
                    helperText={
                      isSellerPanelUser
                        ? "Seller handles delivery and return shipping."
                        : undefined
                    }
                  />

                  {/* <div className="md:col-span-2 xl:col-span-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-x-12">
                      <Input
                        labelName="Require Return Images"
                        name="warranty.returnPolicy.requiresImages"
                        type="switch"
                        value={Boolean(
                          formData.warranty?.returnPolicy?.requiresImages,
                        )}
                        onChange={(event) =>
                          handleNestedChange(
                            "warranty.returnPolicy.requiresImages",
                            event.target.checked,
                          )
                        }
                      />

                      <Input
                        labelName="Require Inspection / QC"
                        name="warranty.returnPolicy.inspectionRequired"
                        type="switch"
                        value={
                          formData.warranty?.returnPolicy
                            ?.inspectionRequired !== false
                        }
                        onChange={(event) =>
                          handleNestedChange(
                            "warranty.returnPolicy.inspectionRequired",
                            event.target.checked,
                          )
                        }
                      />
                    </div>
                  </div> */}
                </div>
              ) : (
                <DisabledPolicyState
                  type="return"
                  title="Returns are currently disabled"
                  description="Turn on to configure return rules."
                />
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ==========================================================
          CATEGORY MODAL
          ========================================================== */}

      {!isSellerPanelUser && <CategorySetup
        isOpen={isCategoryModal}
        formData={categoryForm}
        setFormData={setCategoryForm}
        handleFileUpload={handleFileUploadCategory}
        handleChange={handleInputCategoryChange}
        parentCategories={createSelectOptions}
        handleClose={() => {
          setIsCategoryModal(false);

          setCategoryForm(INITIAL_FORM_CATEGORY);
        }}
        handleSubmit={() => validateCategoryForm() && handleCategorySubmit()}
        handleSelectChange={handleSelectCategoryChange}
        handleDashboardVisible={handleDashboardVisible}
        handleIsPublish={() => {}}
        isPublish={false}
        isEditing={false}
        errors={formErrors}
        title="Add Category"
        submitButtonText="Create"
        closeButtonText="Cancel"
        showPublish={false}
        handleNameBlur={handleNameBlur}
      />}

      {/* ==========================================================
          HSN MODAL
          ========================================================== */}

      <AddHsnModal
        isOpen={isHsnAddModal}
        resetForm={() => {
          setIsHsnAddModal(false);
        }}
        handleSubmit={handleHsnSubmit}
      />

      {/* ==========================================================
          BRAND MODAL
          ========================================================== */}

      <DefaultModal
        title={brandSubmission._id ? "Edit Brand Submission" : "Add New Brand"}
        isOpen={isBrandModal}
        onClose={() => {
          setBrandSubmission((current) => ({ ...current, ...formik.values }));
          setIsBrandModal(false);
          formik.resetForm();
        }}
        onSubmit={formik.handleSubmit}
        submitButtonText={
          brandSubmitting
            ? "Saving..."
            : brandLogoUploading
              ? "Uploading..."
              : brandSubmission._id
                ? "Save for Approval"
                : isSellerPanelUser
                  ? "Submit for Approval"
                  : "Create Brand"
        }
        closeButtonText="Cancel"
        loading={brandSubmitting || brandLogoUploading}
        isButtonView
      >
        <div className="space-y-5">
          <FormSection
            title="Brand Information"
            description={
              isSellerPanelUser
                ? "New brands require admin approval before they can be used on products."
                : "Create a new brand that will be available for this product."
            }
          >
            <div className="space-y-4">
              <div>
                <FormInput
                  label="Brand Name"
                  name="name"
                  type="text"
                  value={formik.values.name}
                  maxLength={50}
                  onChange={(event) => {
                    formik.setFieldTouched("name", true, false);
                    formik.setFieldValue("name", event.target.value.trimStart().replace(/ +/g, " "));
                  }}
                  onBlur={() => {
                    formik.setFieldValue("name", formik.values.name.trim().replace(/ +/g, " "));
                    formik.setFieldTouched("name", true);
                  }}
                  error={formik.touched.name ? formik.errors.name : ""}
                  placeholder="Enter brand name"
                  required
                />
              </div>

              <div>
                <FormInput
                  label="Description"
                  name="description"
                  type="textarea"
                  value={formik.values.description}
                  maxLength={1000}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.description ? formik.errors.description : ""
                  }
                  placeholder="Enter brand details (optional)"
                  rows={4}
                />
              </div>

              <div>
                <ImageUpload
                  label="Brand Logo"
                  file={formik.values.logo}
                  onChange={handleBrandLogoUpload}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  isDisabled={brandLogoUploading || brandSubmitting}
                  isLoading={brandLogoUploading}
                  onRemove={() => {
                    formik.setFieldValue("logo", "");
                    formik.setFieldTouched("logo", true, false);

                    setBrandSubmission((current) => ({
                      ...current,
                      ...formik.values,
                      logo: "",
                    }));
                  }}
                  required
                />

                {formik.touched.logo && formik.errors.logo && (
                  <p className="mt-1 text-xs text-red-500">
                    {formik.errors.logo}
                  </p>
                )}

                <p className="mt-1 text-[11px] text-gray-400">
                  {brandLogoUploading
                    ? "Uploading logo..."
                    : "JPG, PNG, or WEBP up to 5MB"}
                </p>
              </div>
            </div>
          </FormSection>

          {myBrandSubmissions.filter(
            (brand) => ["pending", "rejected"].includes(brand.approvalStatus),
          ).length > 0 && (
            <FormSection
              title="Your Brand Submissions"
              description="Select your pending or rejected brand to edit it. Changes still require admin approval."
            >
              <div className="space-y-2">
                {myBrandSubmissions
                  .filter((brand) => ["pending", "rejected"].includes(brand.approvalStatus))
                  .map((brand) => (
                    <button
                      key={brand._id}
                      type="button"
                      className="w-full rounded-md border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700 transition-colors hover:bg-red-100"
                      onClick={() => {
                        const values = {
                          _id: brand._id,
                          name: brand.name || "",
                          logo: brand.logo || "",
                          thumbnails: brand.thumbnails || "",
                          description: brand.description || "",
                        };

                        setBrandSubmission(values);
                        formik.setValues(values);
                        formik.setTouched({});
                        formik.setErrors({});
                      }}
                    >
                      <span className="font-semibold">{brand.name}</span>

                      <span className="mt-1 block text-red-600">
                        {brand.approvalStatus === "pending" ? "Pending approval — click to edit" : brand.rejectionReason || "Needs changes"}
                      </span>
                    </button>
                  ))}
              </div>
            </FormSection>
          )}
        </div>
      </DefaultModal>
    </>
  );
}
