/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { FaChevronRight } from "react-icons/fa";
import { MdAdd, MdTune, MdFolder, MdSearch } from "react-icons/md";

// Components
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { PageHeader, ConfirmModal } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import SearchInput from "../../../components/Atoms/SearchInput/SearchInput";
import { SkeletonLoader } from "../../../components/Loader/SkeletonLoader";
import { ACTIONS } from "../../../_helpers/usePermission";
import CategorySetup from "./components/CategorySetup";
import { CategoryAttributesPanel } from "./CategoryAttributes";
import Pagination from "../../../components/Pagination/Pagination";

// Redux actions
import {
  create,
  enableDisable,
  getList,
  softDelete,
  update,
} from "../../../Redux/productSlice";

const CATEGORY_TABLE_PAGE_SIZE = 10;

const ProductCategories = () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [attributeCategory, setAttributeCategory] = useState(null);
  const [attributePanelLoading, setAttributePanelLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [isRefresh, setIsRefresh] = useState(false);
  const [isPublish, setIsPublish] = useState(false);

  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [selectedMainCategoryKey, setSelectedMainCategoryKey] = useState("");

  const [categoryPage, setCategoryPage] = useState(1);

  const [categoryPageSize, setCategoryPageSize] = useState(
    CATEGORY_TABLE_PAGE_SIZE,
  );

  const [currentPath, setCurrentPath] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false);

  const [formData, setFormData] = useState({
    categoryName: "",
    bannerUrl: "",
    iconUrl: "",
    parentCategory: null,
    isPublish: false,
    isDashboardVisible: false,
    priority: "0",
  });

  const [errors, setErrors] = useState({
    categoryName: "",
  });

  const [filters, setFilters] = useState({
    search: "",
  });

  const dispatch = useDispatch();

  const selector = useSelector((state) => state.product);

  const getListData = selector?.getListData?.data?.data;

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "categoryName":
        if (!value.trim()) {
          error = "Category name is required";
        } else if (value.length < 3) {
          error = "Category name must be at least 3 characters";
        } else if (value.length > 50) {
          error = "Category name must be less than 50 characters";
        }
        break;

      default:
        break;
    }

    return error;
  };

  const validateForm = () => {
    const newErrors = {
      categoryName: validateField("categoryName", formData.categoryName),
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Transform API Data
  // ---------------------------------------------------------------------------

  const transformData = useCallback((apiData) => {
    const raw = Array.isArray(apiData)
      ? apiData
      : apiData?.list ||
        apiData?.items ||
        apiData?.categories ||
        apiData?.roots ||
        apiData?.tree ||
        [];

    if (!Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    const flattenTree = (nodes = [], out = []) => {
      nodes.forEach((node) => {
        out.push(node);

        const nested = node.children || node.subCategories || [];

        if (Array.isArray(nested) && nested.length) {
          flattenTree(nested, out);
        }
      });

      return out;
    };

    const source = flattenTree(raw);

    const indexed = source.map((category) => ({
      _id: category?.categoryKey || category?._id,
      rawId: category?._id,

      categoryKey: category?.categoryKey || category?._id,

      name: category?.title || category?.name || category?.categoryKey,

      isDisable: category?.active === false,
      active: category?.active !== false,

      bannerUrl: category?.bannerUrl || "",
      iconUrl: category?.iconUrl || "",

      isExpanded: false,

      parentId: category?.parentKey || null,
      parentName: null,

      subCategories: [],

      isDashboardVisible: Boolean(category?.isDashboardVisible),

      priority: category?.sortOrder ?? category?.priority ?? 0,

      level: Number(category?.level || 0),

      userName:
        category?.createdByName ||
        category?.updatedByName ||
        category?.submittedByName ||
        category?.reviewedByName ||
        category?.submittedByUserName ||
        category?.submittedBySellerName ||
        category?.submittedByUserId ||
        category?.submittedBySellerId ||
        category?.reviewedBy ||
        "-",
    }));

    const map = new Map(
      indexed.map((item) => [String(item.categoryKey), item]),
    );

    const roots = [];

    indexed.forEach((item) => {
      const parentKey = item.parentId ? String(item.parentId) : null;

      if (parentKey && map.has(parentKey)) {
        const parent = map.get(parentKey);

        item.parentName = parent?.name || null;

        parent.subCategories.push(item);
      } else {
        roots.push(item);
      }
    });

    const sortRecursive = (nodes = []) =>
      nodes
        .sort(
          (a, b) =>
            Number(a.priority || 0) - Number(b.priority || 0) ||
            String(a.name).localeCompare(String(b.name)),
        )
        .map((node) => ({
          ...node,
          subCategories: sortRecursive(node.subCategories || []),
        }));

    return sortRecursive(roots);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch Categories
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (getListData) {
      const transformedData = transformData(getListData);

      setAllCategories(transformedData);
      setCategories(transformedData);
    }
  }, [getListData, transformData]);

  useEffect(() => {
    let active = true;

    setHasLoadedCategories(false);

    dispatch(
      getList({
        tree: true,
        limit: 100,
      }),
    )
      .unwrap()
      .catch(() => null)
      .finally(() => {
        if (active) {
          setHasLoadedCategories(true);
        }
      });

    return () => {
      active = false;
    };
  }, [dispatch, isRefresh]);

  const categoriesLoading = !hasLoadedCategories;

  const isTableLoading = categoriesLoading || isDrillDownLoading;

  // ---------------------------------------------------------------------------
  // Category Select Options
  // ---------------------------------------------------------------------------

  const createSelectOptions = useMemo(() => {
    const options = [
      {
        label: "ROOT",
        value: "ROOT",
      },
    ];

    const blockedKeys = new Set();

    const collectBlockedKeys = (category) => {
      if (!category) return;

      blockedKeys.add(String(category.categoryKey || category._id));

      (category.subCategories || []).forEach(collectBlockedKeys);
    };

    if (selectedCategory) {
      collectBlockedKeys(selectedCategory);
    }

    const addOptions = (categoryList, prefix = "", depth = 1) => {
      if (!Array.isArray(categoryList) || categoryList.length === 0) {
        return;
      }

      categoryList.forEach((category) => {
        if (blockedKeys.has(String(category.categoryKey || category._id))) {
          return;
        }

        options.push({
          value: category.categoryKey || category._id,

          label: <span className="capitalize">{prefix + category.name}</span>,
        });

        if (depth < 2 && category.subCategories?.length > 0) {
          addOptions(category.subCategories, prefix + "- ", depth + 1);
        }
      });
    };

    addOptions(allCategories);

    return options;
  }, [allCategories, selectedCategory]);

  // ---------------------------------------------------------------------------
  // Form Handlers
  // ---------------------------------------------------------------------------

  const handleIsPublish = useCallback(() => {
    setIsPublish((prev) => !prev);
  }, []);

  const handleResetForm = useCallback(() => {
    setFormData({
      categoryName: "",
      bannerUrl: "",
      iconUrl: "",
      parentCategory: null,
      isPublish: false,
      isDashboardVisible: false,
      priority: "0",
    });

    setSelectedCategory(null);
    setIsPublish(false);

    setErrors({
      categoryName: "",
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Find Category
  // ---------------------------------------------------------------------------

  const findCategoryById = (categoryList, targetId) => {
    for (const category of categoryList) {
      if (String(category._id) === String(targetId)) {
        return category;
      }

      if (category.subCategories?.length > 0) {
        const found = findCategoryById(category.subCategories, targetId);

        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Create Category
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;

    let parentKey = null;
    let level = 0;

    if (formData.parentCategory && formData.parentCategory.value !== "ROOT") {
      parentKey = formData.parentCategory.value;

      const parentCategory = findCategoryById(allCategories, parentKey);

      level = Number(parentCategory?.level || 0) + 1;
    }

    const reqData = {
      name: formData.categoryName,

      bannerUrl: formData.bannerUrl,

      iconUrl: formData.iconUrl,

      parentKey,

      level,

      isDisable: !isPublish,

      isDashboardVisible: formData?.isDashboardVisible
        ? formData.isDashboardVisible
        : false,

      priority: formData?.isDashboardVisible ? Number(formData.priority) : 0,
    };

    dispatch(create(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.message);
          return;
        }

        toast.success(res.message || "Category Created Successfully");

        setIsRefresh(!isRefresh);

        setCategoryOpen(false);

        handleResetForm();
      })
      .catch((error) => {
        console.error("Error creating category:", error);

        toast.error(error || "Error in Creating Category");
      });
  }, [
    dispatch,
    formData,
    isPublish,
    isRefresh,
    handleResetForm,
    allCategories,
  ]);

  // ---------------------------------------------------------------------------
  // Edit Category
  // ---------------------------------------------------------------------------

  const handleEdit = useCallback((category) => {
    setSelectedCategory(category);

    let parentCategoryValue = {
      label: "ROOT",
      value: "ROOT",
    };

    if (category.parentId) {
      parentCategoryValue = {
        label: category.parentName,
        value: category.parentId,
      };
    }

    setFormData({
      categoryName: category.name,

      bannerUrl: category.bannerUrl || "",

      iconUrl: category.iconUrl || "",

      parentCategory: parentCategoryValue,

      isPublish: !category.isDisable,

      isDashboardVisible: category?.isDashboardVisible,

      priority: category?.priority ?? 0,
    });

    setIsPublish(!category.isDisable);

    setCategoryEditOpen(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Delete Category
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback((data) => {
    setSelectedCategory({
      id: data._id,
      name: data.name,
    });

    setShowDeleteConfirmation(true);
  }, []);

  const handleDeleteConfirmDelete = useCallback(() => {
    if (!selectedCategory?.id) {
      return;
    }

    dispatch(
      softDelete({
        _id: selectedCategory.id,
      }),
    )
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.message);
          return;
        }

        setIsRefresh(!isRefresh);

        toast.success(res.message || "Item Deleted Successfully");

        setShowDeleteConfirmation(false);
      })
      .catch((error) => {
        toast.error(error?.message || "Error in Deleting Item");
      });
  }, [dispatch, selectedCategory, isRefresh]);

  // ---------------------------------------------------------------------------
  // Toggle Status
  // ---------------------------------------------------------------------------

  const handleToggle = useCallback(
    (data) => () => {
      const updateChildrenStatus = (categoryList, categoryId, status) => {
        return categoryList.map((category) => {
          if (category._id === categoryId) {
            if (status === true) {
              const disableRecursively = (cat) => ({
                ...cat,

                isDisable: true,

                subCategories:
                  cat.subCategories?.length > 0
                    ? cat.subCategories.map(disableRecursively)
                    : [],
              });

              return disableRecursively(category);
            }

            return {
              ...category,
              isDisable: false,
              subCategories: category.subCategories || [],
            };
          }

          if (category.subCategories?.length > 0) {
            return {
              ...category,

              subCategories: updateChildrenStatus(
                category.subCategories,
                categoryId,
                status,
              ),
            };
          }

          return category;
        });
      };

      setIsLoading(true);

      const newStatus = !data.isDisable;

      dispatch(
        enableDisable({
          _id: data._id,
          isDisable: newStatus,
        }),
      )
        .unwrap()
        .then((res) => {
          if (res.error) {
            toast.error(res.message);
            return;
          }

          setCategories((prevCategories) =>
            updateChildrenStatus(prevCategories, data._id, newStatus),
          );

          toast.success(res.message || "Status Updated Successfully");
        })
        .catch((error) => {
          toast.error(error?.message || "Error in Updating Status");
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [dispatch],
  );

  const handleStatusConfirm = useCallback(() => {
    if (!statusTarget) return;

    handleToggle(statusTarget)();

    setStatusTarget(null);
  }, [handleToggle, statusTarget]);

  // ---------------------------------------------------------------------------
  // Update Category
  // ---------------------------------------------------------------------------

  const handleEditSubmit = useCallback(() => {
    if (!selectedCategory) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    let parentKey = null;
    let level = 0;

    if (formData.parentCategory && formData.parentCategory.value !== "ROOT") {
      parentKey = formData.parentCategory.value;

      const parentCategory = findCategoryById(allCategories, parentKey);

      level = Number(parentCategory?.level || 0) + 1;
    }

    const reqData = {
      _id: selectedCategory.categoryKey || selectedCategory._id,

      name: formData.categoryName,

      bannerUrl: formData.bannerUrl,

      iconUrl: formData.iconUrl,

      isDisable: !isPublish,

      parentKey,

      level,

      isDashboardVisible: formData?.isDashboardVisible
        ? formData.isDashboardVisible
        : false,

      priority: formData?.isDashboardVisible ? Number(formData.priority) : 0,
    };

    dispatch(update(reqData))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.message);
          return;
        }

        toast.success(res.message || "Category Updated Successfully");

        setIsRefresh(!isRefresh);

        setCategoryEditOpen(false);

        handleResetForm();
      })
      .catch((error) => {
        console.error("Error updating category:", error);

        toast.error(error || "Error in Updating Category");
      });
  }, [
    dispatch,
    selectedCategory,
    formData,
    isPublish,
    isRefresh,
    allCategories,
    handleResetForm,
  ]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleNavigate = useCallback((newPath) => {
    setIsDrillDownLoading(true);

    setTimeout(() => {
      setCurrentPath(newPath);

      setCategoryPage(1);

      setIsDrillDownLoading(false);
    }, 300);
  }, []);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const filterCategoryTree = useCallback((searchTerm, sourceCategories) => {
    if (!searchTerm || !searchTerm.trim()) {
      return sourceCategories;
    }

    const term = searchTerm.toLowerCase().trim();

    const filterNodes = (nodes = []) =>
      nodes
        .map((category) => {
          const categoryMatches = category.name?.toLowerCase().includes(term);

          const filteredChildren = filterNodes(category.subCategories || []);

          if (categoryMatches || filteredChildren.length > 0) {
            return {
              ...category,

              subCategories: categoryMatches
                ? category.subCategories || []
                : filteredChildren,
            };
          }

          return null;
        })
        .filter(Boolean);

    return filterNodes(sourceCategories);
  }, []);

  useEffect(() => {
    const filtered = filterCategoryTree(filters.search, allCategories);

    setCategories(filtered);

    setCategoryPage(1);
  }, [filters.search, allCategories, filterCategoryTree]);

  useEffect(() => {
    if (!categories.length) {
      setSelectedMainCategoryKey("");
      return;
    }

    const selectedMainExists = categories.some(
      (category) =>
        String(category.categoryKey || category._id) ===
        selectedMainCategoryKey,
    );

    if (!selectedMainExists) {
      setSelectedMainCategoryKey("");
    }
  }, [categories, selectedMainCategoryKey]);

  const handleSearchRemove = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: "",
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Table Data
  // ---------------------------------------------------------------------------

  const formatCount = (count) => String(count);

  const categoryTableRows = useMemo(() => {
    let activeCategories = categories;

    for (const step of currentPath) {
      const found = activeCategories.find(
        (category) =>
          String(category._id || category.categoryKey || category.name) ===
          String(step._id || step.categoryKey || step.name),
      );

      if (found) {
        activeCategories = found.subCategories || [];
      } else {
        activeCategories = [];
        break;
      }
    }

    const countCache = new Map();

    const descendantCount = (category) => {
      const key = String(category._id || category.categoryKey || category.name);

      if (countCache.has(key)) {
        return countCache.get(key);
      }

      const count = (category.subCategories || []).reduce(
        (total, child) => total + 1 + descendantCount(child),
        0,
      );

      countCache.set(key, count);

      return count;
    };

    return activeCategories.map((category) => ({
      category,

      name: category.name || "-",

      userName: category.userName || "-",

      count: descendantCount(category),

      hasSubCategories: Boolean(category.subCategories?.length),
    }));
  }, [categories, currentPath]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const totalCategoryPages = Math.max(
    1,
    Math.ceil(categoryTableRows.length / categoryPageSize),
  );

  // Keep current page valid if page size
  // or data changes.
  useEffect(() => {
    if (categoryPage > totalCategoryPages) {
      setCategoryPage(totalCategoryPages);
    }
  }, [categoryPage, totalCategoryPages]);

  const pagedCategoryRows = useMemo(() => {
    const startIndex = (categoryPage - 1) * categoryPageSize;

    return categoryTableRows.slice(startIndex, startIndex + categoryPageSize);
  }, [categoryPage, categoryPageSize, categoryTableRows]);

  // ---------------------------------------------------------------------------
  // Category Actions
  // ---------------------------------------------------------------------------

  const renderCategoryActions = (category) => (
    <div className="flex items-center justify-start gap-2">
      <PermissionGuard module="categories" action={ACTIONS.STATUS_CHANGE} hide>
        <ToggleButton
          isToggle={!category.isDisable}
          handleClick={() => setStatusTarget(category)}
          size="sm"
        />
      </PermissionGuard>

      <ActionButtons
        showLinkButton={false}
        onEdit={() => handleEdit(category)}
        onDelete={() => handleDelete(category)}
        requiredModule="categories"
        size="sm"
      />

      <PermissionGuard module="categories" action={ACTIONS.UPDATE} hide>
        <button
          type="button"
          onClick={() => {
            setAttributePanelLoading(true);
            setAttributeCategory(category);
          }}
          className="rounded-lg p-2 text-[var(--admin-blue)] transition-colors hover:bg-[var(--admin-blue-soft)]"
          title="Manage category attributes"
        >
          <MdTune size={17} />
        </button>
      </PermissionGuard>
    </div>
  );

  const handleDashboardVisible = () => {
    setFormData((prev) => ({
      ...prev,

      isDashboardVisible: !prev?.isDashboardVisible,

      priority: !prev?.isDashboardVisible ? prev.priority : 0,
    }));
  };

  //Skeleton loading

  const AttributePanelSkeleton = () => (
    <div className="h-full overflow-y-auto bg-white">
      {/* Header skeleton */}
      <div className="border-b border-[var(--admin-line)] px-6 py-5">
        <SkeletonLoader height={22} width="180px" />

        <div className="mt-3">
          <SkeletonLoader height={11} width="80%" />
        </div>
      </div>

      {/* Info skeleton */}
      <div className="border-b border-[var(--admin-line)] px-6 py-5">
        <SkeletonLoader height={13} width="220px" />

        <div className="mt-4 rounded-xl border border-[var(--admin-line)] p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <SkeletonLoader height={10} width="70px" />
              <div className="mt-2">
                <SkeletonLoader height={38} width="100%" />
              </div>
            </div>

            <div>
              <SkeletonLoader height={10} width="70px" />
              <div className="mt-2">
                <SkeletonLoader height={38} width="100%" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attribute cards skeleton */}
      <div className="space-y-4 px-6 py-5">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-[var(--admin-line)] bg-white p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <SkeletonLoader height={12} width="110px" />
              <SkeletonLoader height={28} width="65px" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <SkeletonLoader height={10} width="60px" />
                <div className="mt-2">
                  <SkeletonLoader height={38} width="100%" />
                </div>
              </div>

              <div>
                <SkeletonLoader height={10} width="60px" />
                <div className="mt-2">
                  <SkeletonLoader height={38} width="100%" />
                </div>
              </div>

              <div>
                <SkeletonLoader height={10} width="60px" />
                <div className="mt-2">
                  <SkeletonLoader height={38} width="100%" />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-5">
              <SkeletonLoader height={18} width="75px" />
              <SkeletonLoader height={18} width="75px" />
              <SkeletonLoader height={18} width="75px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <PageHeader
        title="Product Categories"
        subtitle="Manage hierarchical product category tree"
        breadcrumbs={[{ label: "Catalog" }, { label: "Categories" }]}
        actions={
          <PermissionGuard module="categories" action={ACTIONS.CREATE} hide>
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setCategoryOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--admin-gold-dark)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]/30"
            >
              <MdAdd size={18} />
              Add Category
            </button>
          </PermissionGuard>
        }
      />

      {/* Main Content */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-white shadow-sm">
        {/* Search Header */}
        <div className="border-b border-[var(--admin-line)] bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-blue-soft)] text-[var(--admin-primary)]">
                <MdFolder size={21} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-[var(--admin-ink)]">
                  Category Management
                </h2>

                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  Search and manage your category hierarchy.
                </p>
              </div>
            </div>

            <div className="w-full lg:max-w-md">
              <div className="relative">
                <MdSearch
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--admin-muted)]"
                />

                <div className="[&_input]:pl-10">
                  <SearchInput
                    placeholder="Search categories..."
                    searchTerm={filters.search}
                    handleChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        search: e.target.value,
                      }))
                    }
                    handleRemove={handleSearchRemove}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-5 py-3">
          <div className="flex min-h-[34px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
              {/* Root */}
              <button
                type="button"
                onClick={() => handleNavigate([])}
                className={`inline-flex shrink-0 items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  currentPath.length === 0
                    ? "bg-white text-[var(--admin-primary)] shadow-sm ring-1 ring-[#e3e7f5]"
                    : "text-[var(--admin-muted)] hover:bg-white hover:text-[var(--admin-primary)]"
                }`}
              >
                Categories
              </button>

              {/* Nested Breadcrumbs */}
              {currentPath.map((item, index) => {
                const isLast = index === currentPath.length - 1;

                return (
                  <React.Fragment key={item?.categoryKey || item?._id || index}>
                    <FaChevronRight
                      className="shrink-0 text-[9px] text-gray-400"
                      aria-hidden="true"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleNavigate(currentPath.slice(0, index + 1))
                      }
                      className={`inline-flex max-w-[180px] shrink-0 items-center rounded-lg px-3 py-1.5 text-xs transition-all ${
                        isLast
                          ? "bg-white font-semibold text-[var(--admin-primary)] shadow-sm ring-1 ring-[#e3e7f5]"
                          : "font-medium text-[var(--admin-muted)] hover:bg-white hover:text-[var(--admin-primary)]"
                      }`}
                    >
                      <span className="truncate">
                        {item?.name || item?.title || "Category"}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Current Level Count */}
            <div className="hidden shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[var(--admin-muted)] shadow-sm ring-1 ring-[var(--admin-line)] sm:flex">
              <MdFolder className="text-[var(--admin-gold)]" size={15} />

              <span>
                {categoryTableRows.length}{" "}
                {categoryTableRows.length === 1 ? "category" : "categories"}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden">
          {isTableLoading ? (
            <div
              className="p-4"
              role="status"
              aria-label="Loading categories"
              aria-busy="true"
            >
              {/* Skeleton Header */}
              <div className="mb-2 grid grid-cols-[50%_25%_25%] items-center rounded-lg bg-[var(--admin-surface-soft)] px-5 py-3">
                <SkeletonLoader height={11} width="30%" />

                <SkeletonLoader height={11} width="35%" />

                <SkeletonLoader height={11} width="25%" />
              </div>

              {/* Skeleton Rows */}
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  className="mb-2 grid min-h-[62px] grid-cols-[50%_25%_25%] items-center rounded-lg border border-[var(--admin-line)] bg-white px-5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <SkeletonLoader circle height={36} width={36} />

                    <div className="min-w-0 flex-1">
                      <SkeletonLoader
                        height={12}
                        width={row % 2 === 0 ? "38%" : "30%"}
                      />

                      <div className="mt-2">
                        <SkeletonLoader
                          height={8}
                          width={row % 2 === 0 ? "25%" : "18%"}
                        />
                      </div>
                    </div>
                  </div>

                  <SkeletonLoader height={24} width={45} />

                  <div className="flex items-center gap-2">
                    <SkeletonLoader height={28} width={35} />

                    <SkeletonLoader height={28} width={28} />

                    <SkeletonLoader height={28} width={28} />
                  </div>
                </div>
              ))}

              <span className="sr-only">Loading categories...</span>
            </div>
          ) : categoryTableRows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[50%]" />
                    <col className="w-[25%]" />
                    <col className="w-[25%]" />
                  </colgroup>

                  <thead>
                    <tr className="border-y border-[#dfe3eb] bg-[#f1f3f7]">
                      <th className="px-5 py-3.5 text-left align-middle text-[11px] font-bold uppercase tracking-[0.08em] text-[#374151]">
                        Category Name
                      </th>

                      <th className="px-5 py-3.5 text-left align-middle text-[11px] font-bold uppercase tracking-[0.08em] text-[#374151]">
                        Subcategories
                      </th>

                      <th className="px-5 py-3.5 text-left align-middle text-[11px] font-bold uppercase tracking-[0.08em] text-[#374151]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--admin-line)]">
                    {pagedCategoryRows.map((row) => (
                      <tr
                        key={
                          row.category?._id ||
                          row.category?.categoryKey ||
                          row.name
                        }
                        className="group/category-row h-[62px] transition-colors hover:bg-[var(--admin-surface-soft)]"
                      >
                        {/* Category Name */}
                        <td className="px-5 py-3.5 text-left align-middle">
                          {row.hasSubCategories ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleNavigate([...currentPath, row.category])
                              }
                              className="grid w-full max-w-full grid-cols-[36px_360px_18px] items-center gap-1 text-left"
                            >
                              {/* Folder Icon */}
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fffaf0] text-[var(--admin-primary)] transition-all group-hover/category-row:bg-white group-hover/category-row:shadow-sm">
                                <MdFolder size={18} />
                              </span>

                              {/* Category Name */}
                              <span className="min-w-0">
                                <span className="block truncate font-semibold capitalize text-[var(--admin-primary)]">
                                  {row.name}
                                </span>

                                <span className="mt-0.5 block truncate text-[11px] text-[var(--admin-muted)]">
                                  Click to view subcategories
                                </span>
                              </span>

                              {/* Arrow */}
                              {/* <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 transition-transform group-hover/category-row:translate-x-0.5">
                                <FaChevronRight size={8} />
                              </span> */}
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              {/* Dot Icon */}
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-surface-soft)]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[var(--admin-muted)]" />
                              </span>

                              {/* Category Name */}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-[var(--admin-ink)]">
                                  {row.name}
                                </span>

                                <span className="text-xs text-[var(--admin-muted)]">
                                  No subcategories
                                </span>
                              </span>
                            </div>
                          )}
                        </td>
                        {/* Subcategories */}
                        <td className="px-5 py-3.5 text-left align-middle">
                          <span className="inline-flex min-w-[34px] items-center justify-center rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-100">
                            {formatCount(row.count)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-left align-middle">
                          {renderCategoryActions(row.category)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-[var(--admin-line)] bg-white px-5 py-3">
                <Pagination
                  totalPages={totalCategoryPages}
                  currentPage={categoryPage}
                  onPageChange={setCategoryPage}
                  totalRecords={categoryTableRows.length}
                  pageSize={categoryPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                  onPageSizeChange={(size) => {
                    const newSize = Number(size) || CATEGORY_TABLE_PAGE_SIZE;

                    setCategoryPageSize(newSize);

                    setCategoryPage(1);
                  }}
                />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--admin-surface-soft)] text-[var(--admin-muted)]">
                <MdFolder size={27} />
              </div>

              <h3 className="text-sm font-semibold text-[var(--admin-ink)]">
                {filters.search
                  ? "No categories found"
                  : "No categories available"}
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--admin-muted)]">
                {filters.search
                  ? "Try adjusting your search term to find a matching category."
                  : "Create your first category to start building your product catalog hierarchy."}
              </p>

              {filters.search && (
                <button
                  type="button"
                  onClick={handleSearchRemove}
                  className="mt-4 rounded-lg border border-[var(--admin-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--admin-primary)] transition hover:bg-[var(--admin-surface-soft)]"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Setup */}
      <CategorySetup
        isOpen={categoryOpen || categoryEditOpen}
        handleClose={() => {
          setCategoryOpen(false);
          setCategoryEditOpen(false);
          handleResetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        parentCategories={createSelectOptions}
        handleResetForm={handleResetForm}
        handleSubmit={categoryEditOpen ? handleEditSubmit : handleSubmit}
        isEditing={categoryEditOpen}
        isPublish={isPublish}
        handleIsPublish={handleIsPublish}
        errors={errors}
        handleInputChange={handleInputChange}
        handleDashboardVisible={handleDashboardVisible}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        open={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteConfirmDelete}
        title={`Delete "${selectedCategory?.name}"`}
        message="This will permanently remove the category and all its subcategories. This action cannot be undone."
        variant="danger"
        confirmLabel="Delete"
      />

      {/* Status Confirmation */}
      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
        title={`${statusTarget?.isDisable ? "Enable" : "Disable"} Category`}
        message={`${statusTarget?.isDisable ? "Enable" : "Disable"} "${
          statusTarget?.name || "this category"
        }"? Disabling a parent also disables its child categories.`}
        variant={statusTarget?.isDisable ? "success" : "warning"}
        confirmLabel={statusTarget?.isDisable ? "Enable" : "Disable"}
        loading={isLoading}
      />

      {/* Category Attributes */}
      {attributeCategory && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Close category attributes"
            onClick={() => {
              setAttributeCategory(null);
              setAttributePanelLoading(false);
            }}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-4xl overflow-hidden bg-white shadow-xl ">
            <CategoryAttributesPanel
              embedded
              initialCategory={attributeCategory}
              onClose={() => {
                setAttributeCategory(null);
                setAttributePanelLoading(false);
              }}
              onLoaded={() => setAttributePanelLoading(false)}
            />

            {attributePanelLoading && (
              <div className="absolute inset-0 z-20 bg-white">
                <AttributePanelSkeleton />
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default ProductCategories;
