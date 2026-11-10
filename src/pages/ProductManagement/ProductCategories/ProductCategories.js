/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdTune, MdFolder } from "react-icons/md";
import { ChevronRight } from "lucide-react";
// Components
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  PageHeader,
  ConfirmModal,
  DataTable,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { SkeletonLoader } from "../../../components/Loader/SkeletonLoader";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { isSellerPanel } from "../../../_helpers/panelConfig";
import { categoryValidationSchema } from "../../../_helpers/validationSchemas";
import CategorySetup from "./components/CategorySetup";
import { CategoryAttributesPanel } from "./CategoryAttributes";

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
  const { isSeller } = usePermission();
  const isSellerAccount = isSellerPanel() || isSeller;
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

  const validateForm = () => {
    const newErrors = {};
    try {
      categoryValidationSchema.validateSync(formData, { abortEarly: false });
    } catch (error) {
      error.inner?.forEach((validationError) => {
        if (validationError.path) {
          newErrors[validationError.path] = validationError.message;
        }
      });
    }
    newErrors.categoryName = newErrors.categoryName || "";
    setErrors(newErrors);
    return !newErrors.categoryName;
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

  const handleRefresh = useCallback(() => {
    if (isTableLoading) return;
    setIsRefresh((prev) => !prev);
  }, [isTableLoading]);

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

  const handleGoBack = () => {
    setCurrentPath((prevPath) => prevPath.slice(0, -1));
  };

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
    const matchRank = (category) => {
      const name = String(category.name || "")
        .toLowerCase()
        .trim();
      if (name === term) return 0;
      if (name.startsWith(term)) return 1;
      if (name.split(/\s+/).some((word) => word.startsWith(term))) return 2;
      if (name.includes(term)) return 3;
      return 4; // Parent included only because a descendant matches.
    };

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
        .filter(Boolean)
        .sort((a, b) => matchRank(a) - matchRank(b));

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

    return activeCategories.map((category) => ({
      category,
      name: category.name || "-",
      userName: category.userName || "-",

      // Count only direct subcategories, not nested descendants
      count: category.subCategories?.length || 0,

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
          <MdTune aria-hidden="true" size={17} />
        </button>
      </PermissionGuard>
    </div>
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Category Name",
        render: (_, row) => {
          const categoryIcon =
            row.category?.iconUrl?.trim() || row.iconUrl?.trim();

          if (row.hasSubCategories) {
            return (
              <button
                type="button"
                onClick={() => handleNavigate([...currentPath, row.category])}
                className="grid w-full space-x-2 max-w-full grid-cols-[36px_360px_18px] items-center gap-1 text-left"
              >
                {/* Category / Subcategory Icon */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fffaf0] transition-all group-hover:bg-white group-hover:shadow-sm">
                  {categoryIcon ? (
                    <img
                      src={categoryIcon}
                      alt={row.category?.name || row.name}
                      className="h-9 w-9 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";

                        const fallback = e.currentTarget.nextElementSibling;

                        if (fallback) {
                          fallback.classList.remove("hidden");
                        }
                      }}
                    />
                  ) : null}

                  {/* Dot fallback */}
                  <span
                    className={`h-2.5 w-2.5 rounded-full bg-[var(--admin-primary)] ${
                      categoryIcon ? "hidden" : ""
                    }`}
                  />
                </span>

                {/* Category / Subcategory Name */}
                <span className="min-w-0">
                  <span className="block truncate font-semibold capitalize text-[var(--admin-primary)]">
                    {row.name}
                  </span>
                </span>
              </button>
            );
          }

          return (
            <div className="flex items-center gap-3">
              {/* Category / Subcategory Icon */}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--admin-surface-soft)]">
                {categoryIcon ? (
                  <img
                    src={categoryIcon}
                    alt={row.category?.name || row.name}
                    className="h-7 w-7 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";

                      const fallback = e.currentTarget.nextElementSibling;

                      if (fallback) {
                        fallback.classList.remove("hidden");
                      }
                    }}
                  />
                ) : null}

                {/* Dot fallback */}
                <span
                  className={`h-2.5 w-2.5 rounded-full bg-[var(--admin-muted)] ${
                    categoryIcon ? "hidden" : ""
                  }`}
                />
              </span>

              {/* Category / Subcategory Name */}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--admin-ink)]">
                  {row.name}
                </span>

                <span className="text-xs text-[var(--admin-muted)]">
                  No subcategories
                </span>
              </span>
            </div>
          );
        },
      },
      {
        key: "subCategories",
        label: "Subcategories",
        render: (_, row) =>
          row.hasSubCategories ? (
            <button
              type="button"
              onClick={() => handleNavigate([...currentPath, row.category])}
              className="group inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-100 transition-colors hover:bg-cyan-100"
              aria-label={`View ${row.count} subcategories of ${row.name}`}
            >
              <span>{formatCount(row.count)}</span>
              <span>View</span>
              <ChevronRight
                size={14}
                strokeWidth={2.5}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          ) : (
            <span className="text-xs text-gray-400">No subcategories</span>
          ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => renderCategoryActions(row.category),
      },
    ],
    [currentPath, handleNavigate, renderCategoryActions],
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
        showBack={currentPath.length > 0}
        onBack={currentPath.length > 0 ? handleGoBack : undefined}
        breadcrumbs={[
          { label: "Catalog Management" },
          {
            label: "Category Tree",
            onClick: () => handleNavigate([]),
          },
          ...currentPath.map((category, index) => ({
            label: category.name,
            onClick: () => handleNavigate(currentPath.slice(0, index + 1)),
          })),
        ]}
        actions={
          !isSellerAccount ? (
            <PermissionGuard module="categories" action={ACTIONS.CREATE} hide>
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setCategoryOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--admin-gold-dark)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]/30"
              >
                <MdAdd aria-hidden="true" size={18} />
                Add Category
              </button>
            </PermissionGuard>
          ) : null
        }
      />

      {/* Main Table Content */}
      <DataTable
        columns={columns}
        data={pagedCategoryRows}
        loading={isTableLoading}
        totalCount={categoryTableRows.length}
        page={categoryPage}
        pageSize={categoryPageSize}
        onPageChange={setCategoryPage}
        onPageSizeChange={(size) => {
          setCategoryPageSize(Number(size) || CATEGORY_TABLE_PAGE_SIZE);
          setCategoryPage(1);
        }}
        onSearch={(value) => {
          setFilters((f) => ({
            ...f,
            search: value,
          }));
          setCategoryPage(1);
        }}
        searchValue={filters.search}
        searchPlaceholder="Search Category..."
        onRefresh={handleRefresh}
        emptyText={
          filters.search ? "No categories found" : "No categories available"
        }
        emptyIcon={<MdFolder aria-hidden="true" size={32} />}
        showSerialNumber={false}
        cardClassName="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-white shadow-sm"
        rowKey={(row) =>
          row.category?._id || row.category?.categoryKey || row.name
        }
      />

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
        parentCategoriesLoading={categoriesLoading}
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

          <aside className="absolute right-0 top-0 h-full w-full max-w-4xl overflow-hidden bg-white shadow-xl">
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
