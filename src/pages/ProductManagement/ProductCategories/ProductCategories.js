/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { FaChevronRight } from "react-icons/fa";
import { MdAdd, MdTune, MdFolder } from "react-icons/md";

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
  // State management
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [attributeCategory, setAttributeCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isRefresh, setIsRefresh] = useState(false);
  const [isPublish, setIsPublish] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedMainCategoryKey, setSelectedMainCategoryKey] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const [currentPath, setCurrentPath] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
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

  // Validation functions
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

  // Transform API data structure
  const transformData = useCallback((apiData) => {
    const raw = Array.isArray(apiData)
      ? apiData
      : apiData?.list ||
        apiData?.items ||
        apiData?.categories ||
        apiData?.roots ||
        apiData?.tree ||
        [];
    if (!Array.isArray(raw) || raw.length === 0) return [];

    // Flatten server-side tree (children array) into a flat list so parentKey-based rebuilding works
    const flattenTree = (nodes = [], out = []) => {
      nodes.forEach((node) => {
        out.push(node);
        const nested = node.children || node.subCategories || [];
        if (Array.isArray(nested) && nested.length) flattenTree(nested, out);
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

  // Update categories when API data changes
  useEffect(() => {
    if (getListData) {
      const transformedData = transformData(getListData);
      setAllCategories(transformedData);
      setCategories(transformedData);
    }
  }, [getListData, transformData]);

  // Fetch categories on initial load and refresh
  useEffect(() => {
    let active = true;
    setHasLoadedCategories(false);
    dispatch(getList({ tree: true, limit: 100 }))
      .unwrap()
      .catch(() => null)
      .finally(() => {
        if (active) setHasLoadedCategories(true);
      });

    return () => {
      active = false;
    };
  }, [dispatch, isRefresh]);

  const categoriesLoading =
    !hasLoadedCategories || selector?.getListData?.loading;

  // Build select options for category dropdown
  const createSelectOptions = useMemo(() => {
    const options = [{ label: "ROOT", value: "ROOT" }];
    const blockedKeys = new Set();

    const collectBlockedKeys = (category) => {
      if (!category) return;
      blockedKeys.add(String(category.categoryKey || category._id));
      (category.subCategories || []).forEach(collectBlockedKeys);
    };

    if (selectedCategory) {
      collectBlockedKeys(selectedCategory);
    }

    const addOptions = (categories, prefix = "", depth = 1) => {
      Array.isArray(categories) &&
        categories?.length > 0 &&
        categories.forEach((category) => {
          if (blockedKeys.has(String(category.categoryKey || category._id)))
            return;

          options.push({
            value: category.categoryKey || category._id,
            label: <span className="capitalize">{prefix + category.name}</span>,
          });

          // Only go deeper if depth is less than 3
          if (depth < 2 && category.subCategories?.length > 0) {
            addOptions(category.subCategories, prefix + "- ", depth + 1);
          }
        });
    };

    addOptions(allCategories);
    return options;
  }, [allCategories, selectedCategory]);

  // Event handlers
  const handleIsPublish = useCallback(() => {
    setIsPublish((prev) => !prev);
  }, []);

  const handleResetForm = useCallback(() => {
    setFormData({
      categoryName: "",
      bannerUrl: "",
      iconUrl: "",
      parentCategory: null,
      isDashboardVisible: false,
      priority: "0",
    });
    setSelectedCategory(null);
    setIsPublish(false);
    setErrors({
      categoryName: "",
    });
  }, []);

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
        ? formData?.isDashboardVisible
        : false,
      priority: formData?.isDashboardVisible ? Number(formData?.priority) : 0,
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

  const handleEdit = useCallback((category) => {
    setSelectedCategory(category);
    let parentCategoryValue = { label: "ROOT", value: "ROOT" };

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
      isDashboardVisible: category?.isDashboardVisible,
      priority: category?.priority,
    });

    setIsPublish(!category.isDisable);
    setCategoryEditOpen(true);
  }, []);

  const handleDelete = useCallback((data) => {
    setSelectedCategory({ id: data._id, name: data.name });
    setShowDeleteConfirmation(true);
  }, []);

  const handleDeleteConfirmDelete = useCallback(() => {
    dispatch(softDelete({ _id: selectedCategory.id }))
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
        toast.error(error.message || "Error in Deleting Item");
      });
  }, [dispatch, selectedCategory, isRefresh]);

  // const handleToggle = useCallback((data) => () => {
  //   const updateChildrenStatus = (categoryId, status) => {
  //     const findCategory = (categories, id) => {
  //       for (const category of categories) {
  //         if (category._id === id) return category;
  //         if (category.subCategories?.length > 0) {
  //           const found = findCategory(category.subCategories, id);
  //           if (found) return found;
  //         }
  //       }
  //       return null;
  //     };

  //     const category = findCategory(allCategories, categoryId);
  //     if (!category) return;
  //     const updateCategoryAndChildren = (cat) => {
  //       dispatch(enableDisable({
  //         _id: cat._id,
  //         isDisable: status
  //       }));
  //       setCategories(prev => {
  //         const updateCategoryInState = (categories) => {
  //           return categories.map(item => {
  //             if (item._id === cat._id) {
  //               return {
  //                 ...item,
  //                 isDisable: status,
  //                 isExpanded: item.isExpanded,
  //                 subCategories: item.subCategories?.length > 0
  //                   ? updateCategoryInState(item.subCategories)
  //                   : []
  //               };
  //             }
  //             if (item.subCategories?.length > 0) {
  //               return {
  //                 ...item,
  //                 subCategories: updateCategoryInState(item.subCategories)
  //               };
  //             }
  //             return item;
  //           });
  //         };
  //         return updateCategoryInState(prev);
  //       });
  //       if (cat.subCategories?.length > 0) {
  //         cat.subCategories.forEach(updateCategoryAndChildren);
  //       }
  //     };

  //     updateCategoryAndChildren(category);
  //   };

  //   setIsLoading(true);
  //   dispatch(enableDisable({
  //     _id: data._id,
  //     isDisable: !data.isDisable
  //   }))
  //     .unwrap()
  //     .then((res) => {
  //       if (res.error) {
  //         toast.error(res.message);
  //         return;
  //       }
  //       setCategories(prev => {
  //         return prev.map(item => {
  //           if (item._id === data._id) {
  //             return {
  //               ...item,
  //               isDisable: !data.isDisable,
  //               isExpanded: item.isExpanded
  //             };
  //           }
  //           return item;
  //         });
  //       });
  //       // updateChildrenStatus(data._id, !data.isDisable);

  //       toast.success(res.message || "Status Updated Successfully");
  //       // setIsRefresh(!isRefresh);
  //     })
  //     .catch((error) => {
  //       toast.error(error.message || "Error in Updating Status");
  //     })
  //     .finally(() => {
  //       setIsLoading(false);
  //     });
  // }, [dispatch, isRefresh, allCategories]);

  const handleToggle = useCallback(
    (data) => () => {
      const updateChildrenStatus = (categories, categoryId, status) => {
        return categories.map((category) => {
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
            } else {
              // enable only the selected category
              return {
                ...category,
                isDisable: false,
                subCategories: category.subCategories || [],
              };
            }
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
          toast.error(error.message || "Error in Updating Status");
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

  const handleEditSubmit = useCallback(() => {
    if (!selectedCategory) return;
    if (!validateForm()) return;

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
        ? formData?.isDashboardVisible
        : false,
      priority: formData?.isDashboardVisible ? Number(formData?.priority) : 0,
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
  }, [filters.search, allCategories, filterCategoryTree]);

  useEffect(() => {
    if (!categories.length) {
      setSelectedMainCategoryKey("");
      return;
    }

    const selectedMainExists = categories.some(
      (category) => String(category.categoryKey || category._id) === selectedMainCategoryKey,
    );
    if (!selectedMainExists) {
      setSelectedMainCategoryKey("");
    }
  }, [categories, selectedMainCategoryKey]);

  const handleSearchRemove = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  // Helper function to find category by ID in nested structure
  const findCategoryById = (categories, targetId) => {
    for (const category of categories) {
      if (category._id === targetId) {
        return category;
      }
      if (category.subCategories?.length > 0) {
        const found = findCategoryById(category.subCategories, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to format count display
  const formatCount = (count) => {
    return String(count);
  };

  const categoryTableRows = useMemo(() => {
    let activeCategories = categories;

    // Navigate to current path level
    for (const step of currentPath) {
      const found = activeCategories.find((c) => String(c._id || c.categoryKey || c.name) === String(step._id || step.categoryKey || step.name));
      if (found) {
        activeCategories = found.subCategories || [];
      } else {
        // If path node not found (e.g. filtered out), fallback to empty
        activeCategories = [];
        break;
      }
    }

    const countCache = new Map();
    const descendantCount = (category) => {
      const key = String(category._id || category.categoryKey || category.name);
      if (countCache.has(key)) return countCache.get(key);
      const count = (category.subCategories || []).reduce(
        (total, child) => total + 1 + descendantCount(child),
        0,
      );
      countCache.set(key, count);
      return count;
    };

    return activeCategories.map((category) => {
      return {
        category,
        name: category.name || "-",
        userName: category.userName || "-",
        count: descendantCount(category),
        hasSubCategories:
          category.subCategories && category.subCategories.length > 0,
      };
    });
  }, [categories, currentPath]);

  const totalCategoryPages = Math.max(
    1,
    Math.ceil(categoryTableRows.length / CATEGORY_TABLE_PAGE_SIZE),
  );

  const pagedCategoryRows = useMemo(() => {
    const startIndex = (categoryPage - 1) * CATEGORY_TABLE_PAGE_SIZE;
    return categoryTableRows.slice(
      startIndex,
      startIndex + CATEGORY_TABLE_PAGE_SIZE,
    );
  }, [categoryPage, categoryTableRows]);

  const renderCategoryActions = (category) => (
    <div className="flex items-center justify-end gap-3">
      <PermissionGuard
        module="categories"
        action={ACTIONS.STATUS_CHANGE}
        hide
      >
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
          onClick={() => setAttributeCategory(category)}
          className="rounded p-1 text-[var(--admin-blue)] transition-colors duration-200 hover:bg-[var(--admin-blue-soft)]"
          title="Manage category attributes"
        >
          <MdTune size={18} />
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

  return (
    <div>
      <PageHeader
        title="Product Categories"
        subtitle="Manage hierarchical product category tree"
        breadcrumbs={[{ label: "Catalog" }, { label: "Categories" }]}
        actions={
          <PermissionGuard module="categories" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => {
                handleResetForm();
                setCategoryOpen(true);
              }}
            >
              <MdAdd size={16} /> Add Category
            </button>
          </PermissionGuard>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {/* Search bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 max-w-2xl">
            <SearchInput
              placeholder="Search categories…"
              searchTerm={filters.search}
              handleChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              handleRemove={handleSearchRemove}
            />
          </div>
        </div>

        {/* Category Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-sm text-[var(--admin-muted)]">
          <button 
            type="button"
            onClick={() => setCurrentPath([])} 
            className={`hover:text-[var(--admin-primary)] ${currentPath.length === 0 ? 'font-semibold text-[var(--admin-ink)]' : ''}`}
          >
            Catalog
          </button>
          
          <FaChevronRight size={10} className="text-gray-400" />
          
          <button 
            type="button"
            onClick={() => setCurrentPath([])} 
            className={`hover:text-[var(--admin-primary)] ${currentPath.length === 0 ? 'font-semibold text-[var(--admin-ink)]' : ''}`}
          >
            Categories
          </button>

          {currentPath.map((cat, index) => (
            <React.Fragment key={cat._id || cat.name || index}>
              <FaChevronRight size={10} className="text-gray-400" />
              <button 
                type="button"
                onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                className={`hover:text-[var(--admin-primary)] ${index === currentPath.length - 1 ? 'font-semibold text-[var(--admin-ink)]' : ''}`}
              >
                {cat.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Category table */}
        <div className="overflow-hidden rounded-lg border border-[var(--admin-line)]">
          {categoriesLoading && (
            <div
              className="space-y-2 py-2"
              role="status"
              aria-label="Loading categories"
              aria-busy="true"
            >
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="flex min-h-12 items-center gap-3 rounded-lg border border-[var(--admin-line)] bg-white px-3 py-2"
                  style={{ marginLeft: row === 2 || row === 3 ? 0 : 0 }}
                >
                  <SkeletonLoader circle height={24} width={24} />
                  <div className="min-w-0 flex-1">
                    <SkeletonLoader
                      height={12}
                      width={row % 2 === 0 ? "38%" : "28%"}
                    />
                    <div className="mt-1">
                      <SkeletonLoader
                        height={9}
                        width={row % 2 === 0 ? "24%" : "18%"}
                      />
                    </div>
                  </div>
                  <SkeletonLoader height={26} width={72} />
                </div>
              ))}
              <span className="sr-only">Loading categories…</span>
            </div>
          )}
          {!categoriesLoading && categoryTableRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--admin-line)] text-sm">
                <thead className="bg-[var(--admin-surface-soft)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--admin-muted)]">
                      Category Name
                    </th>
                  
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--admin-muted)]">
                      Subcategories
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--admin-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-line)] bg-white">
                  {pagedCategoryRows.map((row) => (
                    <tr
                      key={row.category._id}
                      className="transition-colors hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="min-w-[260px] px-4 py-3">
                        {row.hasSubCategories ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPath([...currentPath, row.category]);
                              setCategoryPage(1);
                            }}
                            className="flex items-center gap-2 text-left font-semibold text-[var(--admin-primary)] hover:underline capitalize"
                          >
                            <MdFolder size={18} className="text-gray-400" />
                            {row.name}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-left font-semibold text-[var(--admin-ink)] capitalize pl-[26px]">
                            {row.name}
                          </div>
                        )}
                      </td>
                    
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700">
                          {formatCount(row.count)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {renderCategoryActions(row.category)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {categoryTableRows.length > CATEGORY_TABLE_PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-line)] bg-white px-4 py-3 text-sm">
                  <span className="text-[var(--admin-muted)]">
                    Showing {(categoryPage - 1) * CATEGORY_TABLE_PAGE_SIZE + 1}-
                    {Math.min(
                      categoryPage * CATEGORY_TABLE_PAGE_SIZE,
                      categoryTableRows.length,
                    )}{" "}
                    of {categoryTableRows.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryPage((page) => Math.max(1, page - 1))
                      }
                      disabled={categoryPage === 1}
                      className="rounded border border-[var(--admin-line)] px-3 py-1.5 font-medium text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-[var(--admin-muted)]">
                      Page {categoryPage} of {totalCategoryPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryPage((page) =>
                          Math.min(totalCategoryPages, page + 1),
                        )
                      }
                      disabled={categoryPage === totalCategoryPages}
                      className="rounded border border-[var(--admin-line)] px-3 py-1.5 font-medium text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !categoriesLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {filters.search
                ? "No categories match your search"
                : "No categories found"}
            </div>
          ) : null}
        </div>
      </div>

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

      <ConfirmModal
        open={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteConfirmDelete}
        title={`Delete "${selectedCategory?.name}"`}
        message="This will permanently remove the category and all its subcategories. This action cannot be undone."
        variant="danger"
        confirmLabel="Delete"
      />

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
        title={`${statusTarget?.isDisable ? "Enable" : "Disable"} Category`}
        message={`${statusTarget?.isDisable ? "Enable" : "Disable"} "${statusTarget?.name || "this category"}"? Disabling a parent also disables its child categories.`}
        variant={statusTarget?.isDisable ? "success" : "warning"}
        confirmLabel={statusTarget?.isDisable ? "Enable" : "Disable"}
        loading={isLoading}
      />

      {attributeCategory && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Close category attributes"
            onClick={() => setAttributeCategory(null)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
            <CategoryAttributesPanel
              embedded
              initialCategory={attributeCategory}
              onClose={() => setAttributeCategory(null)}
            />
          </aside>
        </div>
      )}
    </div>
  );
};

export default ProductCategories;
