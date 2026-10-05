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

const INITIAL_FORM_HSN = {
  code: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "",
  description: "",
  isDisable: false,
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

  /*
   * ------------------------------------------------------------
   * Approval
   * ------------------------------------------------------------
   */

  const approvePendingOption = async (event, option) => {
    event.preventDefault();
    event.stopPropagation();

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

  const [hsnFormValues, setIsHsnFormValue] = useState(INITIAL_FORM_HSN);

  const [isLoading, setIsLoading] = useState(false);

  /*
   * ------------------------------------------------------------
   * Brand submissions
   * ------------------------------------------------------------
   */

  const loadMyBrandSubmissions =
    useCallback(async () => {
      try {
        const response =
          await dispatch(
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

  /*
   * ------------------------------------------------------------
   * Brand
   * ------------------------------------------------------------
   */

  const handleBrandLogoUpload = async (file) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

    const extension = file.name?.split(".").pop()?.toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !["png", "jpg", "jpeg", "webp"].includes(extension)
    ) {
      toast.error("Only JPG, PNG, or WEBP images allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Brand logo must be 5MB or less");
      return;
    }

    setBrandLogoUploading(true);

    try {
      const logoUrl = await uploadFile(file, "BRANDS");

      setBrandSubmission((current) => ({
        ...current,
        logo: logoUrl,
      }));

      toast.success("Brand logo uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload brand logo"));
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const submitBrandRequest = async (event) => {
    event.preventDefault();

    if (!brandSubmission.name.trim()) {
      return toast.error("Brand name is required");
    }

    if (!brandSubmission.logo) {
      return toast.error("Please upload a brand logo");
    }

    if (brandLogoUploading) {
      return toast.error("Please wait for logo upload to finish");
    }

    setBrandSubmitting(true);

    try {
      if (isSellerPanelUser) {
        const response = await dispatch(
          brandSubmission._id
            ? resubmitBrandForApproval({
                ...brandSubmission,
                _id: brandSubmission._id,
              })
            : submitBrandForApproval(brandSubmission),
        ).unwrap();

        const createdBrand = response?.data || {};

        const brandName = createdBrand.name || brandSubmission.name.trim();

        setMyBrandSubmissions((current) => [
          {
            ...brandSubmission,
            ...createdBrand,
            name: brandName,
            approvalStatus: createdBrand.approvalStatus || "pending",
          },
          ...current.filter(
            (brand) =>
              String(brand._id || "") !==
              String(createdBrand._id || brandSubmission._id || ""),
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
          brandSubmission._id
            ? "Brand resubmitted for approval"
            : "Brand submitted for approval",
        );
      } else {
        const response = await dispatch(
          createBrand({
            ...brandSubmission,
            active: true,
          }),
        ).unwrap();

        const createdBrand = response?.data || {};

        const brandName = createdBrand.name || brandSubmission.name.trim();

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
          !approvedNames.has(
            String(brand.name || "").toLowerCase(),
          ),
      )
      .map((brand) => {
        const approvalStatus = brand.approvalStatus || "pending";
        const statusLabel =
          approvalStatus === "rejected"
            ? "Rejected"
            : "Pending approval";

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

    return [
      ...submissionBrands,
      ...(formattedBrandList || []),
    ].map((brand) => {
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
  }, [
    brandStatusOverrides,
    formattedBrandList,
    myBrandSubmissions,
  ]);

  const selectedBrandOption = useMemo(() => {
    const rawBrand =
      formData.brand || formData.brandId || formData.brand_id || "";

    const currentBrand =
      typeof rawBrand === "object"
        ? rawBrand.value || rawBrand._id || rawBrand.id || rawBrand.name
        : rawBrand;

    if (!currentBrand) return null;

      return (
        brandOptions.find(
          (option) =>
            String(
              option.value,
            ) ===
              String(
                currentBrand,
              ) ||
            String(
              option.label,
            ) ===
              String(
                currentBrand,
              ) ||
            String(
              option.brandName ||
                "",
            ) ===
              String(
                currentBrand,
              ) ||
            String(
              option.brandId ||
                option.resourceId ||
                option._id ||
                option.id ||
                "",
            ) ===
              String(
                currentBrand,
              ),
        ) ||
        (typeof rawBrand ===
        "object"
          ? {
              ...rawBrand,
              value:
                currentBrand,
              label:
                rawBrand.label ||
                rawBrand.name ||
                currentBrand,
            }
          : {
              value:
                currentBrand,
              label:
                currentBrand,
            })
      );
    }, [
      brandOptions,
      formData.brand,
      formData.brandId,
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

  const handleHsnInputChange = (e) => {
    const { name, value } = e.target;

    setIsHsnFormValue((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors({});
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
      const type =
        categoryForm.parentCategory?.value !== "ROOT" ? "CHILD" : "ROOT";

      const reqData = {
        name: categoryForm.categoryName,
        bannerUrl: categoryForm.bannerUrl,
        iconUrl: categoryForm.iconUrl,
        type,
        isDisable: true,
        isDashboardVisible: categoryForm?.isDashboardVisible,
        priority: categoryForm?.priority,
      };

      if (type === "CHILD") {
        reqData.parentKey = categoryForm.parentCategory.value;

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
      toast.error(error?.message || "Failed to create category");
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Create HSN
   * ------------------------------------------------------------
   */

  const handleHsnSubmit = async (e) => {
    e?.preventDefault();

    const basePayload = {
      code: hsnFormValues.code.trim(),
      IGST: Number(hsnFormValues.IGST),
      CGST: Number(hsnFormValues.CGST),
      SGST: Number(hsnFormValues.SGST),
      additionalTax: Number(hsnFormValues.additionalTax),
      description: hsnFormValues.description?.trim() || "",
      active: true,
    };

    try {
      const res = await dispatch(createHsn(basePayload)).unwrap();

      const createdHsn = res?.data || {};

      const hsnValue = createdHsn.code || basePayload.code;

      const newOption = {
        value: hsnValue,
        code: hsnValue,
        label: createdHsn.description
          ? `${hsnValue} - ${createdHsn.description}`
          : hsnValue,
        description: createdHsn.description || basePayload.description,
        resourceType: "hsn",
        resourceId: createdHsn._id || createdHsn.id || hsnValue,
        approvalStatus: createdHsn.approvalStatus,
      };

      setLocalHsnOptions((current) => [newOption, ...current]);

      handleSelectChange(newOption, "hsn_code");

      toast.success("HSN Code created successfully");

      setIsHsnAddModal(false);

      setIsHsnFormValue(INITIAL_FORM_HSN);

      setFormErrors({});

      fetchAllData([API_CALL_OBJECT["Hsn code list"]]);
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

  const validateHsnForm = () => {
    const newErrors = {};

    const hasRate = (value) =>
      value !== "" && value !== null && value !== undefined;

    if (!hsnFormValues.code) {
      newErrors.code = "Code is required";
    }

    if (!hasRate(hsnFormValues.IGST)) {
      newErrors.IGST = "IGST is required";
    } else if (
      Number(hsnFormValues.IGST) < 0 ||
      Number(hsnFormValues.IGST) > 100
    ) {
      newErrors.IGST = "IGST must be between 0 and 100";
    }

    if (!hasRate(hsnFormValues.CGST)) {
      newErrors.CGST = "CGST is required";
    } else if (
      Number(hsnFormValues.CGST) < 0 ||
      Number(hsnFormValues.CGST) > 100
    ) {
      newErrors.CGST = "CGST must be between 0 and 100";
    }

    if (!hasRate(hsnFormValues.SGST)) {
      newErrors.SGST = "SGST is required";
    } else if (
      Number(hsnFormValues.SGST) < 0 ||
      Number(hsnFormValues.SGST) > 100
    ) {
      newErrors.SGST = "SGST must be between 0 and 100";
    }

    if (!hsnFormValues.description) {
      newErrors.description = "Description is required";
    } else if (hsnFormValues.description.length < 3) {
      newErrors.description = "Description must be at least 3 characters";
    } else if (hsnFormValues.description.length > 100) {
      newErrors.description =
        "Description must be less than or equal to 100 characters";
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

    if (!value.trim()) return;

    const titled = toTitleCase(value);

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
                    error={errors?.category_id}
                    placeholder="Select Category"
                    helperText="Attributes are controlled by the selected category schema."
                    formatOptionLabel={formatCatalogOption}
                    required
                    isClearable
                  />
                </div>

                <PermissionGuard
                  module="categories"
                  action="create"
                  allowSeller
                  hide
                >
                  <button
                    type="button"
                    className="mt-6 flex-shrink-0 rounded-md border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]/40 px-3 py-2 text-xs font-semibold text-[var(--admin-gold-dark)] transition-colors hover:bg-[var(--admin-gold-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-gold)]"
                    onClick={() => setIsCategoryModal(true)}
                  >
                    + Add
                  </button>
                </PermissionGuard>

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
              <div className="product-form-section-header">
                <h3>Warranty information</h3>

                <p>
                  Describe warranty coverage, exclusions, claim rules, required
                  documents, and support instructions.
                </p>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <Input
                  labelName="Warranty Period"
                  name="warranty.period"
                  type="number"
                  min={0}
                  value={formData.warranty?.period ?? ""}
                  onChange={(event) =>
                    handleNestedChange("warranty.period", event.target.value)
                  }
                  placeholder="Example: 12"
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
                />
<FilterSelect
  label="Warranty Provider"
  value={
    warrantyProviders.options.find(
      (option) =>
        option.value === formData.warranty?.provider
    ) || null
  }
  onChange={(option) =>
    handleNestedChange(
      "warranty.provider",
      option?.value || ""
    )
  }
  options={warrantyProviders.options}
  placeholder="Select warranty provider"
  isLoading={warrantyProviders.loading}
  isClearable
/>

<FilterSelect
  label="Warranty Type"
  value={
    warrantyTypes.options.find(
      (option) =>
        option.value === formData.warranty?.type
    ) || null
  }
  onChange={(option) =>
    handleNestedChange(
      "warranty.type",
      option?.value || ""
    )
  }
  options={warrantyTypes.options}
  placeholder="Select warranty type"
  isLoading={warrantyTypes.loading}
  isClearable
/>
              </div>

              <TextEditor
                label="Warranty description and rules"
                value={formData.warranty?.terms || ""}
                onChange={(content) =>
                  handleNestedChange("warranty.terms", content)
                }
                height="220px"
                className="[&_.ql-container]:h-[220px] [&_.ql-editor]:min-h-[180px]"
                placeholder="Add coverage, exclusions, claim process, required proof, service locations, and other warranty rules"
              />
            </section>

            {/* =====================================================
                RETURN POLICY
                ===================================================== */}

            <section className="product-form-subsection md:col-span-2">
              <div className="product-form-section-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3>Product Return Policy</h3>

                  <p className="max-w-2xl">
                    Set the return window, available resolution, shipping
                    responsibility, and verification requirements for this
                    product.
                  </p>

                  <p className="mt-1 text-[11px] text-gray-400">
                    The policy is saved with each order and will not change for
                    existing orders.
                  </p>
                </div>

                <div className="shrink-0 rounded-full bg-[var(--admin-surface-soft)] px-3 py-2">
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

              <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  labelName="Return Window Days"
                  name="warranty.returnPolicy.returnWindowDays"
                  type="number"
                  min={0}
                  max={365}
                  disabled={!isReturnable}
                  value={
                    formData.warranty?.returnPolicy?.returnWindowDays ?? ""
                  }
                  onChange={(event) => {
                    const value =
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value);

                    handleNestedChange(
                      "warranty.returnPolicy.returnWindowDays",
                      value,
                    );

                    handleNestedChange("warranty.returnPolicy.days", value);
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

                <div className="md:col-span-2 xl:col-span-3">
                  <p className="mb-3 border-[var(--admin-line)] pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Return requirements
                  </p>

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
                        formData.warranty?.returnPolicy?.inspectionRequired !==
                        false
                      }
                      onChange={(event) =>
                        handleNestedChange(
                          "warranty.returnPolicy.inspectionRequired",
                          event.target.checked,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ==========================================================
          CATEGORY MODAL
          ========================================================== */}

      <CategorySetup
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
      />

      {/* ==========================================================
          HSN MODAL
          ========================================================== */}

      <AddHsnModal
        isOpen={isHsnAddModal}
        formData={hsnFormValues}
        resetForm={() => {
          setIsHsnAddModal(false);

          setIsHsnFormValue(INITIAL_FORM_HSN);

          setFormErrors({});
        }}
        handleInputChange={handleHsnInputChange}
        handleSubmit={(e) => validateHsnForm() && handleHsnSubmit(e)}
        errors={formErrors}
      />

      {/* ==========================================================
          BRAND MODAL
          ========================================================== */}

      <DefaultModal
        title={brandSubmission._id ? "Resubmit Brand" : "Add New Brand"}
        isOpen={isBrandModal}
        onClose={() => setIsBrandModal(false)}
        onSubmit={submitBrandRequest}
        submitButtonText={
          brandSubmitting
            ? "Saving..."
            : brandLogoUploading
              ? "Uploading..."
              : brandSubmission._id
                ? "Resubmit"
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
              <FormInput
                label="Brand Name"
                name="name"
                type="text"
                value={brandSubmission.name}
                onChange={(event) =>
                  setBrandSubmission((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Enter brand name"
                maxLength={200}
                required
              />

              <FormInput
                label="Description"
                name="description"
                type="textarea"
                value={brandSubmission.description}
                onChange={(event) =>
                  setBrandSubmission((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Enter brand details (optional)"
                rows={4}
                maxLength={1000}
              />
            </div>
          </FormSection>

          <ImageUpload
            label="Brand Logo"
            file={brandSubmission.logo}
            onChange={handleBrandLogoUpload}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            isDisabled={brandLogoUploading || brandSubmitting}
            isLoading={brandLogoUploading}
            onRemove={() =>
              setBrandSubmission((current) => ({
                ...current,
                logo: "",
              }))
            }
            required
          />
          <p className="mt-1 text-[11px] text-gray-400">
            {brandLogoUploading
              ? "Uploading logo..."
              : "JPG, PNG, or WEBP up to 5MB"}
          </p>

          {myBrandSubmissions.filter(
            (brand) => brand.approvalStatus === "rejected",
          ).length > 0 && (
            <FormSection
              title="Rejected Submissions"
              description="Select a rejected brand to make changes and resubmit it."
            >
              <div className="space-y-2">
                {myBrandSubmissions
                  .filter((brand) => brand.approvalStatus === "rejected")
                  .map((brand) => (
                    <button
                      key={brand._id}
                      type="button"
                      className="w-full rounded-md border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700 transition-colors hover:bg-red-100"
                      onClick={() =>
                        setBrandSubmission({
                          _id: brand._id,
                          name: brand.name || "",
                          logo: brand.logo || "",
                          thumbnails: brand.thumbnails || "",
                          description: brand.description || "",
                        })
                      }
                    >
                      <span className="font-semibold">{brand.name}</span>

                      <span className="mt-1 block text-red-600">
                        {brand.rejectionReason || "Needs changes"}
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
