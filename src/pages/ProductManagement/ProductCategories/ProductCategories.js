/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { FaPlus, FaMinus } from "react-icons/fa";

// Components
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import DeletePopup from "../../../components/Atoms/DeletePopup.js/DeletePopup";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import CategorySetup from "./components/CategorySetup";

// Redux actions
import {
  create,
  enableDisable,
  getList,
  softDelete,
  update,
} from "../../../Redux/productSlice";
import Loader from "../../../components/Loader/Loader";
import AddButton from "../../../components/Button/AddButton";

const ProductCategories = () => {
  // State management
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isRefresh, setIsRefresh] = useState(false);
  const [isPublish, setIsPublish] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [formData, setFormData] = useState({
    categoryName: "",
    seoUrl: "",
    parentCategory: null,
    isPublish: false,
    isDashboardVisible: false,
    priority: "0",
  });
  const [errors, setErrors] = useState({
    categoryName: "",
    seoUrl: "",
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

      case "seoUrl":
        if (!value.trim()) {
          error = "Thumbnail URL is required";
        } else if (!/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value)) {
          error = "Please enter a valid URL";
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
      seoUrl: validateField("seoUrl", formData.seoUrl),
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
      : apiData?.list || apiData?.items || [];
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
      thumbnails: category?.imageUrl || category?.thumbnails || "",
      isExpanded: false,
      parentId: category?.parentKey || null,
      parentName: null,
      subCategories: [],
      isDashboardVisible: Boolean(category?.isDashboardVisible),
      priority: category?.sortOrder ?? category?.priority ?? 0,
      level: Number(category?.level || 0),
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
    dispatch(getList({ tree: true, limit: 5000 }));
  }, [dispatch, isRefresh]);

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
      seoUrl: "",
      parentCategory: null,
      isDashboardVisible: false,
      priority: "0",
    });
    setSelectedCategory(null);
    setIsPublish(false);
    setErrors({
      categoryName: "",
      seoUrl: "",
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
      thumbnails: formData.seoUrl,
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
      seoUrl: category.thumbnails || "",
      parentCategory: parentCategoryValue,
      isDashboardVisible: category?.isDashboardVisible,
      priority: category?.priority,
    });

    setIsPublish(!category.isDisable);
    setCategoryEditOpen(true);
  }, []);

  const toggleExpand = (id, level = 0, parentId = null) => {
    setCategories((prev) => {
      if (level === 0) {
        // Toggle root category
        return prev.map((cat) =>
          cat._id === id ? { ...cat, isExpanded: !cat.isExpanded } : cat,
        );
      } else if (level === 1) {
        // Toggle subcategory
        return prev.map((cat) => {
          if (cat._id === parentId) {
            return {
              ...cat,
              subCategories: cat.subCategories.map((sub) =>
                sub._id === id ? { ...sub, isExpanded: !sub.isExpanded } : sub,
              ),
            };
          }
          return cat;
        });
      }
      return prev;
    });
  };

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
      thumbnails: formData.seoUrl,
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

  const calculateCategoryCount = useCallback((category) => {
    let count = 1; // Count the category itself
    if (category.subCategories && category.subCategories.length > 0) {
      count += category.subCategories.reduce(
        (acc, subCat) => acc + calculateCategoryCount(subCat),
        0,
      );
    }
    return count;
  }, []);

  const applySearchFilters = useCallback(() => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const filtered = allCategories
        .map((category) => {
          const mainCategoryMatches = category.name
            .toLowerCase()
            .includes(searchTerm);

          const filteredSubCategories =
            category.subCategories
              ?.map((subCategory) => {
                const subCategoryMatches = subCategory.name
                  .toLowerCase()
                  .includes(searchTerm);

                const filteredChildren =
                  subCategory.subCategories?.filter((child) =>
                    child.name.toLowerCase().includes(searchTerm),
                  ) || [];

                if (subCategoryMatches || filteredChildren.length > 0) {
                  return {
                    ...subCategory,
                    subCategories: filteredChildren,
                    isExpanded: filteredChildren.length > 0,
                  };
                }
                return null;
              })
              .filter(Boolean) || [];

          if (mainCategoryMatches || filteredSubCategories.length > 0) {
            return {
              ...category,
              subCategories: filteredSubCategories,
              isExpanded: filteredSubCategories.length > 0,
            };
          }
          return null;
        })
        .filter(Boolean);

      setCategories(filtered);
    } else {
      setCategories(allCategories);
    }
  }, [filters.search, allCategories]);

  const handleSearchRemove = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
    setCategories(allCategories);
    setIsRefresh(!isRefresh);
  }, [allCategories]);

  // const renderCategory = (category, level = 0, parentId = null) => {
  //   const hasChildren = category.subCategories?.length > 0;
  //   const marginLeft = level > 0 ? `${level * 20}px` : '0';

  //   return (
  //     <div key={category._id} className="mb-2">
  //       {/* Category Row */}
  //       <div
  //         className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white"
  //         style={{ marginLeft }}
  //       >

  //         <div className="flex items-center gap-2">
  //           {hasChildren && (
  //             <button
  //               onClick={() => toggleExpand(category._id, level, parentId)}
  //               className="text-gray-500 hover:text-gray-700"
  //             >
  //               {category.isExpanded ? <FaMinus size={14} /> : <FaPlus size={14} />}
  //             </button>
  //           )}
  //           <span className="font-medium text-gray-900 capitalize">{category.name}</span>
  //         </div>
  //         <div className="flex items-center gap-2">
  //           <ToggleButton
  //             isToggle={!category.isDisable}
  //             handleClick={handleToggle(category)}
  //             size="sm"
  //           />
  //           <ActionButtons
  //             showLinkButton={false}
  //             onEdit={() => handleEdit(category)}
  //             onDelete={() => handleDelete(category)}
  //             size="sm"
  //           />
  //         </div>
  //       </div>

  //       {category.isExpanded && hasChildren && (
  //         <div className="mt-2 space-y-2">
  //           {category.subCategories.map(subCategory =>
  //             renderCategory(subCategory, level + 1, category._id)
  //           )}
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  // Helper function to find category by ID in nested structure

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

  // Helper function to count total subcategories recursively
  const countSubCategories = (category) => {
    if (!category.subCategories || category.subCategories.length === 0) {
      return 0;
    }

    let count = category.subCategories.length;
    category.subCategories.forEach((subCategory) => {
      count += countSubCategories(subCategory);
    });

    return count;
  };

  // Helper function to format count display
  const formatCount = (count) => {
    if (count === 0) return "0";
    return count > 99 ? "99+" : count.toString();
  };

  const renderCategory = (
    category,
    level = 0,
    parentId = null,
    allCategories = [],
  ) => {
    const hasChildren = category.subCategories?.length > 0;
    const marginLeft = level > 0 ? `${level * 40}px` : "0";

    const isLastChild = parentId
      ? (() => {
          const parent = findCategoryById(allCategories, parentId);
          return (
            parent?.subCategories?.indexOf(category) ===
            parent?.subCategories?.length - 1
          );
        })()
      : false;

    return (
      <div key={category._id} className="relative">
        {/* Vertical connecting line for nested items */}
        {level > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gray-300"
            style={{
              left: `${(level - 1) * 40 + 20}px`,
              height: isLastChild ? "24px" : "100%",
            }}
          />
        )}

        {/* Horizontal connecting line for nested items */}
        {level > 0 && (
          <div
            className="absolute top-6 w-5 h-px bg-gray-300"
            style={{ left: `${(level - 1) * 40 + 20}px` }}
          />
        )}

        {/* Category Row */}
        <div
          className={`flex items-center justify-between p-3 mb-1 ${
            level === 0
              ? "bg-gray-100 border-l-4 border-l-gray-400"
              : "bg-white border-l-2 border-l-transparent hover:bg-gray-50"
          }`}
          style={{ marginLeft }}
        >
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(category._id, level, parentId)}
                className={`flex items-center justify-center w-5 h-5 rounded-sm border ${
                  category.isExpanded
                    ? "bg-gray-600 border-gray-600 text-black"
                    : "bg-white border-gray-400 text-gray-600 hover:border-gray-600"
                }`}
              >
                {category.isExpanded ? (
                  <FaMinus size={10} />
                ) : (
                  <FaPlus size={10} />
                )}
              </button>
            )}

            <span
              className={`capitalize ${
                level === 0
                  ? "font-semibold text-gray-800 text-base"
                  : "font-medium text-gray-700 text-sm"
              }`}
            >
              {category.name}
            </span>
            {hasChildren && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium bg-cyan-100 text-cyan-700`}
              >
                {formatCount(countSubCategories(category))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Subcategory count badge - only show if category has subcategories */}
            <ToggleButton
              isToggle={!category.isDisable}
              handleClick={handleToggle(category)}
              size="sm"
            />
            <ActionButtons
              showLinkButton={false}
              onEdit={() => handleEdit(category)}
              onDelete={() => handleDelete(category)}
              size="sm"
            />
          </div>
        </div>

        {/* Subcategories */}
        {category.isExpanded && hasChildren && (
          <div className="relative">
            {category.subCategories.map((subCategory, index) =>
              renderCategory(
                subCategory,
                level + 1,
                category._id,
                allCategories,
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  const handleDashboardVisible = () => {
    setFormData((prev) => ({
      ...prev,
      isDashboardVisible: !prev?.isDashboardVisible,
      priority: !prev?.isDashboardVisible ? prev.priority : 0,
    }));
  };

  return (
    <>
      <Loader loading={selector.loading || isLoading} />
      <div className="mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3>
                Home / <b>Product Categories</b>
              </h3>
            </div>
            <AddButton
              className=" "
              onClick={() => {
                handleResetForm();
                setCategoryOpen(true);
              }}
            >
              Add
            </AddButton>
          </div>

          <div className="bg-white p-2">
            <div className="border-b mb-4">
              <SearchComponent
                isSearchShow={true}
                filters={filters}
                setFilters={setFilters}
                placeholder="Search categories..."
                handleSearchRemove={handleSearchRemove}
                applyFilters={applySearchFilters}
              />
            </div>

            <div className="space-y-3">
              {categories.length > 0 ? (
                categories.map((category) =>
                  renderCategory(category, 0, null, categories),
                )
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {filters.search
                    ? "No categories match your search"
                    : "No categories found"}
                </div>
              )}
            </div>
          </div>
        </div>

        <CategorySetup
          isOpen={categoryOpen}
          handleClose={() => {
            setCategoryOpen(false);
            handleResetForm();
          }}
          formData={formData}
          setFormData={setFormData}
          parentCategories={createSelectOptions}
          handleResetForm={handleResetForm}
          handleSubmit={handleSubmit}
          isEditing={false}
          isPublish={isPublish}
          handleIsPublish={handleIsPublish}
          errors={errors}
          handleInputChange={handleInputChange}
          handleDashboardVisible={handleDashboardVisible}
        />

        <CategorySetup
          isOpen={categoryEditOpen}
          handleClose={() => {
            setCategoryEditOpen(false);
            handleResetForm();
          }}
          formData={formData}
          setFormData={setFormData}
          parentCategories={createSelectOptions}
          handleResetForm={handleResetForm}
          handleSubmit={handleEditSubmit}
          isEditing={true}
          isPublish={isPublish}
          handleIsPublish={handleIsPublish}
          errors={errors}
          handleInputChange={handleInputChange}
          handleDashboardVisible={handleDashboardVisible}
        />

        <DeletePopup
          isDeleteModalOpen={showDeleteConfirmation}
          closeDeleteModal={() => setShowDeleteConfirmation(false)}
          DeleteHeading={`Delete "${selectedCategory?.name}" category?`}
          DeleteDescription="This will permanently remove the category and all its subCategories. This action cannot be undone."
          confirmDelete={handleDeleteConfirmDelete}
        />
      </div>
    </>
  );
};

export default ProductCategories;
