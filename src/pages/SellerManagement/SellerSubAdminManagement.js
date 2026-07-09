import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  createSellerSubAdmin,
  deleteSellerSubAdmin,
  getSellerSubAdminHierarchy,
  listSellerSubAdmins,
  updateSellerSubAdminModules,
  updateSellerSubAdminStatus,
} from "../../Redux/sellerSubAdminsSlice";
import { getMyModulePermission } from "../../Redux/userManagementSlice";
import {
  buildAccessModuleActionMaps,
  buildModulePermissions,
  normalizePermissionActions,
} from "../../_helpers/adminApi";
import {
  getModuleLabel,
  getModuleMeta,
  MODULE_TAB_ORDER,
} from "../../_helpers/rbacRoutes";
import {
  getStoredRole,
  getStoredUser,
  normalizeRole,
} from "../../_helpers/authStorage";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { ACTIONS, usePermission } from "../../_helpers/usePermission";
import TableData from "../../components/Atoms/TableData/TableData";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import Loader from "../../components/Loader/Loader";
import Pagination from "../../components/Pagination/Pagination";
import AddButton from "../../components/Button/AddButton";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import StatusPopup from "../../components/Atoms/PopupData/StatusPopup";
import { PageHeader } from "../../components/Shared";

const PAGE_SIZE = 10;
const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  allowedModules: [],
};

const getPayload = (sliceData = {}) =>
  sliceData?.data?.data ||
  sliceData?.data?.normalized?.data ||
  sliceData?.normalized?.data ||
  sliceData?.normalized ||
  sliceData?.data ||
  sliceData ||
  {};

const extractList = (sliceData = {}) => {
  const payload = getPayload(sliceData);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getId = (item = {}) => item._id || item.id || item.userId;

const getUserName = (user = {}) => {
  const profile = user.profile || {};
  return (
    user.fullName ||
    user.full_name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    user.userName ||
    user.email ||
    "Sub-Seller"
  );
};

const getParentId = (user = {}) => {
  const parent =
    user.parentAdmin ||
    user.parent ||
    user.createdBy ||
    user.createdByUser ||
    user.ownerAdmin;
  return (
    user.parentAdminId ||
    user.parentId ||
    user.createdByUserId ||
    user.createdById ||
    user.ownerAdminId ||
    (typeof parent === "object" ? getId(parent) : parent)
  );
};

const getRoleLabel = (role = "") =>
  String(role || "").toLowerCase() === "seller-admin"
    ? "Seller Admin"
    : "Sub-Seller";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const getOrderId = (order = {}) =>
  order.order_no ||
  order.orderNo ||
  order.order_id ||
  order.orderId ||
  order.id ||
  "-";

const getOrderAmount = (order = {}) =>
  order.total_amount ||
  order.totalAmount ||
  order.payable_amount ||
  order.payableAmount ||
  0;

const getOrderDate = (order = {}) =>
  order.created_at || order.createdAt || order.orderDate || order.date;

const getProductName = (product = {}) =>
  product.name ||
  product.productName ||
  product.title ||
  product.product_name ||
  product.sku ||
  "-";

const getProductStatus = (product = {}) =>
  product.status ||
  product.approvalStatus ||
  product.productStatus ||
  (product.isActive === false ? "inactive" : "active");

const getProductPrice = (product = {}) =>
  product.price ||
  product.salePrice ||
  product.sellingPrice ||
  product.mrp ||
  product.basePrice ||
  0;

const getProductCreatorId = (product = {}) => {
  const creator =
    product.createdBy ||
    product.created_by ||
    product.uploadedBy ||
    product.createdByUser;
  if (creator && typeof creator === "object") return getId(creator);
  return creator || product.createdById || product.created_by_user_id || "";
};

const isActive = (user = {}) => {
  const status = String(user.accountStatus || user.status || "").toLowerCase();
  if (status) return status === "active";
  if (typeof user.isDisable === "boolean") return !user.isDisable;
  return true;
};

const validateForm = (form) => {
  const errors = {};
  if (!form.fullName?.trim()) errors.fullName = "Full name is required";
  if (!form.email?.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Invalid email address";
  if (!form.password) errors.password = "Password is required";
  else if (form.password.length < 8) errors.password = "Minimum 8 characters";
  if (form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match";
  if (!form.allowedModules?.length)
    errors.allowedModules = "Select at least one management section";
  return errors;
};

const groupModules = (modules = []) => {
  const grouped = modules.reduce((acc, slug) => {
    const meta = getModuleMeta(slug);
    const tab = meta.tab || "Settings";
    if (!acc[tab]) acc[tab] = [];
    acc[tab].push({ slug, ...meta });
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([tabName, items]) => ({
      tabName,
      items: items.sort((a, b) => (a.order || 999) - (b.order || 999)),
    }))
    .sort((a, b) => {
      const indexA = MODULE_TAB_ORDER.indexOf(a.tabName);
      const indexB = MODULE_TAB_ORDER.indexOf(b.tabName);
      const safeA = indexA === -1 ? MODULE_TAB_ORDER.length : indexA;
      const safeB = indexB === -1 ? MODULE_TAB_ORDER.length : indexB;
      if (safeA !== safeB) return safeA - safeB;
      return a.tabName.localeCompare(b.tabName);
    });
};

const ACTION_LABELS = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  assign: "Assign",
  export: "Export",
  import: "Import",
  status_change: "Status",
  restore: "Restore",
  bulk_action: "Bulk",
  adjust: "Adjust",
};

const getActionLabel = (action = "") =>
  ACTION_LABELS[action] ||
  String(action || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const reconcileActionsMap = (
  modules = [],
  current = {},
  assignedDefaults = {},
  assignableOptions = {},
) =>
  Array.from(new Set(modules)).reduce((lookup, module) => {
    const assignableActions = normalizePermissionActions(
      assignableOptions[module] || ["view"],
    );
    const sourceActions = current[module] ||
      assignedDefaults[module] || ["view"];
    lookup[module] = normalizePermissionActions(sourceActions).filter(
      (action) => action === "view" || assignableActions.includes(action),
    );
    if (!lookup[module].length) lookup[module] = ["view"];
    return lookup;
  }, {});

const buildActionsMapFromUser = (user = {}) =>
  (Array.isArray(user.modulePermissions) ? user.modulePermissions : []).reduce(
    (lookup, item) => {
      const module = String(item.module || item.slug || "")
        .trim()
        .toLowerCase();
      if (module)
        lookup[module] = normalizePermissionActions(item.actions || ["view"]);
      return lookup;
    },
    (Array.isArray(user.permissionSummary?.permissions)
      ? user.permissionSummary.permissions
      : []
    ).reduce((lookup, permission) => {
      const [module, action] = String(permission || "").split(":");
      const slug = String(module || "")
        .trim()
        .toLowerCase();
      if (slug && action) {
        lookup[slug] = normalizePermissionActions([
          ...(lookup[slug] || []),
          action,
        ]);
      }
      return lookup;
    }, {}),
  );

const ModuleSelector = ({ modules, selected, onChange, disabled = false }) => {
  const selectedSet = new Set(selected);

  const toggleModule = (slug) => {
    if (disabled) return;
    const next = selectedSet.has(slug)
      ? selected.filter((item) => item !== slug)
      : [...selected, slug];
    if (!next.length) return;
    onChange(Array.from(new Set(next)));
  };

  const toggleGroup = (items) => {
    if (disabled) return;
    const slugs = items.map((item) => item.slug);
    const allSelected = slugs.every((slug) => selectedSet.has(slug));
    const next = allSelected
      ? selected.filter((slug) => !slugs.includes(slug))
      : Array.from(new Set([...selected, ...slugs]));
    if (!next.length) return;
    onChange(next);
  };

  return (
    <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
      {groupModules(modules).map(({ tabName, items }) => (
        <section
          key={tabName}
          className="rounded-md border border-gray-100 p-3"
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => toggleGroup(items)}
            className="mb-2 flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-gray-800">
              {tabName}
            </span>
            <span className="text-xs text-gray-400">
              {items.filter((item) => selectedSet.has(item.slug)).length}/
              {items.length}
            </span>
          </button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((module) => (
              <label
                key={module.slug}
                className="flex items-center gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs text-gray-600"
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(module.slug)}
                  disabled={disabled}
                  onChange={() => toggleModule(module.slug)}
                />
                <span>{module.label || module.slug}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const ModuleActionsSelector = ({
  modules = [],
  actionOptions = {},
  actionsMap = {},
  onChange,
  disabled = false,
}) => {
  if (!modules.length) return null;
  const actionColumns = normalizePermissionActions(
    modules.flatMap((module) => actionOptions[module] || ["view"]),
  );

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-gray-100">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase text-gray-500">
          Actions per module
        </span>
        <span className="text-[10px] text-gray-400">
          View is always included
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="w-40 px-3 py-2 text-left font-medium text-gray-500">
                Module
              </th>
              {actionColumns.map((action) => (
                <th
                  key={action}
                  className="px-2 py-2 text-center font-medium text-gray-400"
                >
                  {getActionLabel(action)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {modules.map((module) => {
              const available = normalizePermissionActions(
                actionOptions[module] || ["view"],
              );
              const current = normalizePermissionActions(
                actionsMap[module] || ["view"],
              );
              return (
                <tr key={module}>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {getModuleLabel(module)}
                  </td>
                  {actionColumns.map((action) => {
                    const canAssign =
                      action === "view" || available.includes(action);
                    return (
                      <td key={action} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={
                            canAssign &&
                            (action === "view" || current.includes(action))
                          }
                          disabled={disabled || action === "view" || !canAssign}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? normalizePermissionActions([...current, action])
                              : normalizePermissionActions(
                                  current.filter((item) => item !== action),
                                );
                            onChange?.({ ...actionsMap, [module]: next });
                          }}
                          className="h-3.5 w-3.5 accent-[var(--admin-blue)] disabled:cursor-default"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const buildHierarchy = (users = [], rootUser = {}, rootModules = []) => {
  const rootId = getId(rootUser) || "seller-root";
  const root = {
    id: rootId,
    name: getUserName(rootUser),
    email: rootUser.email || "",
    role: "Seller Owner",
    modules: rootModules,
    children: [],
    level: 0,
  };

  const nodeMap = new Map();
  users.forEach((user) => {
    const id = getId(user);
    if (!id) return;
    nodeMap.set(String(id), {
      id,
      name: getUserName(user),
      email: user.email || "",
      role: user.role === "seller-admin" ? "Seller Admin" : "Sub-Seller",
      modules: user.allowedModules || [],
      active: isActive(user),
      parentId: getParentId(user),
      children: [],
      level: 1,
    });
  });

  nodeMap.forEach((node) => {
    const parentKey = node.parentId ? String(node.parentId) : "";
    const parent =
      parentKey && parentKey !== String(node.id)
        ? nodeMap.get(parentKey)
        : null;
    if (parent) {
      node.level = parent.level + 1;
      parent.children.push(node);
      return;
    }
    root.children.push(node);
  });

  const flatten = (node) => [
    node,
    ...node.children
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((child) => {
        child.level = node.level + 1;
        return flatten(child);
      }),
  ];

  return flatten(root);
};

const hasAssignedModuleAccess = (module = {}) => {
  const hasAssignedPermission = (module.permissions || []).some(
    (permission) => permission?.assigned,
  );
  if (hasAssignedPermission) return true;
  if (module.assigned === false) return false;
  return module.assigned === true || module.assigned === undefined;
};

const SellerSubAdminManagement = () => {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const sellerSelector = useSelector((state) => state.sellerSubAdmins);
  const userSelector = useSelector((state) => state.user);
  const storedUser = useMemo(() => getStoredUser() || {}, []);
  const storedRole = normalizeRole(getStoredRole());
  const isSellerPanelRole =
    storedRole === "seller" ||
    storedRole === "seller-admin" ||
    storedRole === "seller-sub-admin";
  const canCreateSubAdmin =
    isSellerPanelRole && can("seller-management", ACTIONS.CREATE);
  const canUpdateSubAdmin =
    isSellerPanelRole && can("seller-management", ACTIONS.UPDATE);
  const canDeleteSubAdmin =
    isSellerPanelRole && can("seller-management", ACTIONS.DELETE);
  const canChangeSubAdminStatus =
    isSellerPanelRole && can("seller-management", ACTIONS.STATUS_CHANGE);

  const [tab, setTab] = useState("subadmins");
  const [filters, setFilters] = useState({ search: "" });
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [viewOrders, setViewOrders] = useState([]);
  const [viewProducts, setViewProducts] = useState([]);
  const [viewDashboard, setViewDashboard] = useState({});
  const [viewLoading, setViewLoading] = useState(false);
  const [accessModules, setAccessModules] = useState([]);
  const [moduleActionsMap, setModuleActionsMap] = useState({});
  const [showModuleActions, setShowModuleActions] = useState(false);

  const subAdmins = extractList(sellerSelector?.listSubAdminsData);
  const hierarchyItems = extractList(sellerSelector?.hierarchyData);
  const moduleOptions = useMemo(() => {
    const fromAccessModules = (
      Array.isArray(accessModules) ? accessModules : []
    )
      .filter((module) => module?.assignable !== false)
      .filter(hasAssignedModuleAccess)
      .map((module) => module.slug || module.moduleKey || module.moduleSlug)
      .filter(Boolean);
    if (fromAccessModules.length) {
      return Array.from(new Set(fromAccessModules));
    }

    const sidebarModules =
      userSelector?.getMyModulePermissionData?.data?.data?.modules || [];
    const fromPermissions = (
      Array.isArray(sidebarModules) ? sidebarModules : []
    )
      .filter(
        (module) =>
          module?.assigned ||
          (module.permissions || []).some((permission) => permission?.assigned),
      )
      .map(
        (module) =>
          module.slug ||
          module.module ||
          module.module_code?.module_code ||
          module.module_code,
      )
      .filter(Boolean);
    return Array.from(new Set(fromPermissions));
  }, [accessModules, userSelector?.getMyModulePermissionData]);
  const moduleActionMaps = useMemo(() => {
    const sidebarModules = accessModules.length
      ? accessModules
      : userSelector?.getMyModulePermissionData?.data?.data?.modules || [];
    return buildAccessModuleActionMaps(
      (Array.isArray(sidebarModules) ? sidebarModules : []).filter(
        hasAssignedModuleAccess,
      ),
    );
  }, [accessModules, userSelector?.getMyModulePermissionData]);
  const moduleActionOptions = moduleActionMaps.assignable;
  const moduleAssignedActions = moduleActionMaps.assigned;

  const visibleSubAdmins = useMemo(() => {
    const query = String(filters.search || "")
      .trim()
      .toLowerCase();
    if (!query) return subAdmins;
    return subAdmins.filter((user) =>
      [
        getUserName(user),
        user.email,
        user.phone,
        user.role,
        ...(user.allowedModules || []).map(getModuleLabel),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [filters.search, subAdmins]);

  const pagedSubAdmins = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleSubAdmins.slice(start, start + PAGE_SIZE);
  }, [page, visibleSubAdmins]);

  const hierarchy = useMemo(
    () =>
      buildHierarchy(
        hierarchyItems.length ? hierarchyItems : subAdmins,
        storedUser,
        moduleOptions,
      ),
    [hierarchyItems, moduleOptions, subAdmins, storedUser],
  );

  useEffect(() => {
    dispatch(listSellerSubAdmins({ limit: 100 }));
    dispatch(getSellerSubAdminHierarchy({ limit: 100 }));
    const currentUserId =
      storedUser?._id || storedUser?.id || storedUser?.userId;
    if (currentUserId) {
      dispatch(getMyModulePermission({ _id: currentUserId, role: storedRole }));
    }
    apiRequest("GET", ENDPOINTS.adminAccess.modules, {
      role: "seller-sub-admin",
      includePermissions: true,
    })
      .then((response) => {
        const payload = getPayload(response);
        setAccessModules(
          Array.isArray(payload?.modules) ? payload.modules : [],
        );
      })
      .catch(() => setAccessModules([]));
  }, [
    dispatch,
    storedRole,
    storedUser?._id,
    storedUser?.id,
    storedUser?.userId,
  ]);

  useEffect(() => {
    setForm((current) => {
      const allowedModules = current.allowedModules.filter((module) =>
        moduleOptions.includes(module),
      );
      return {
        ...current,
        allowedModules: allowedModules.length
          ? allowedModules
          : moduleOptions.slice(0, 2),
      };
    });
  }, [moduleOptions]);

  useEffect(() => {
    setModuleActionsMap((current) =>
      reconcileActionsMap(
        form.allowedModules || [],
        current,
        moduleAssignedActions,
        moduleActionOptions,
      ),
    );
  }, [form.allowedModules, moduleActionOptions, moduleAssignedActions]);

  const openCreate = () => {
    if (!canCreateSubAdmin) {
      toast.error("You do not have permission to create sub-sellers");
      return;
    }
    const allowedModules = moduleOptions.slice(0, 2);
    setEditTarget(null);
    setErrors({});
    setModuleActionsMap(
      reconcileActionsMap(
        allowedModules,
        {},
        moduleAssignedActions,
        moduleActionOptions,
      ),
    );
    setShowModuleActions(false);
    setForm({ ...emptyForm, allowedModules });
    setModalOpen(true);
  };

  const openEdit = (user) => {
    if (!canUpdateSubAdmin) {
      toast.error("You do not have permission to edit sub-seller access");
      return;
    }
    const allowedModules = (user.allowedModules || []).filter((module) =>
      moduleOptions.includes(module),
    );
    setEditTarget(user);
    setErrors({});
    setModuleActionsMap(
      reconcileActionsMap(
        allowedModules,
        buildActionsMapFromUser(user),
        moduleAssignedActions,
        moduleActionOptions,
      ),
    );
    setShowModuleActions(false);
    setForm({
      ...emptyForm,
      fullName: getUserName(user),
      email: user.email || "",
      phone: user.phone || "",
      allowedModules: allowedModules.length
        ? allowedModules
        : moduleOptions.slice(0, 1),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setErrors({});
    setShowModuleActions(false);
    setModuleActionsMap({});
  };

  const refresh = () => {
    dispatch(listSellerSubAdmins({ limit: 100 }));
    dispatch(getSellerSubAdminHierarchy({ limit: 100 }));
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    const allowedModules = form.allowedModules.filter((module) =>
      moduleOptions.includes(module),
    );
    const nextErrors = editTarget
      ? allowedModules.length
        ? {}
        : { allowedModules: "Select at least one management section" }
      : validateForm({ ...form, allowedModules });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      const modulePermissions = buildModulePermissions(
        allowedModules,
        moduleActionOptions,
        moduleActionsMap,
      );
      if (editTarget) {
        if (!canUpdateSubAdmin) {
          toast.error("You do not have permission to edit sub-seller access");
          return;
        }
        await dispatch(
          updateSellerSubAdminModules({
            userId: getId(editTarget),
            allowedModules,
            modulePermissions,
          }),
        ).unwrap();
        toast.success("Sub-seller access updated");
      } else {
        if (!canCreateSubAdmin) {
          toast.error("You do not have permission to create sub-sellers");
          return;
        }
        await dispatch(
          createSellerSubAdmin({ ...form, allowedModules, modulePermissions }),
        ).unwrap();
        toast.success("Sub-seller created successfully");
      }
      closeModal();
      refresh();
    } catch (error) {
      toast.error(
        error?.message ||
          `Failed to ${editTarget ? "update" : "create"} sub-seller`,
      );
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction?.user) return;
    const userId = getId(confirmAction.user);
    try {
      if (confirmAction.type === "delete") {
        if (!canDeleteSubAdmin) {
          toast.error("You do not have permission to delete sub-sellers");
          return;
        }
        await dispatch(deleteSellerSubAdmin({ userId })).unwrap();
        toast.success("Sub-seller deleted");
      } else {
        if (!canChangeSubAdminStatus) {
          toast.error("You do not have permission to change sub-seller status");
          return;
        }
        await dispatch(
          updateSellerSubAdminStatus({
            userId,
            accountStatus: isActive(confirmAction.user)
              ? "suspended"
              : "active",
          }),
        ).unwrap();
        toast.success(
          `Sub-seller ${isActive(confirmAction.user) ? "deactivated" : "activated"}`,
        );
      }
      refresh();
    } catch (error) {
      toast.error(error?.message || "Failed to update sub-seller");
    } finally {
      setConfirmAction(null);
    }
  };

  const openView = async (user) => {
    setViewTarget(user);
    setViewOrders([]);
    setViewProducts([]);
    setViewDashboard({});
    setViewLoading(true);
    try {
      const [ordersResponse, productsResponse, dashboardResponse] =
        await Promise.all([
          apiRequest("GET", ENDPOINTS.orders.listForPanel, { limit: 100 }),
          apiRequest("GET", ENDPOINTS.products.listForPanel, {
            page: 1,
            limit: 100,
          }),
          apiRequest("GET", ENDPOINTS.dashboard.overview),
        ]);
      const subSellerId = String(getId(user) || "");
      setViewOrders(extractList(ordersResponse));
      setViewProducts(
        extractList(productsResponse).filter(
          (product) =>
            String(getProductCreatorId(product) || "") === subSellerId,
        ),
      );
      setViewDashboard(getPayload(dashboardResponse));
    } catch (error) {
      toast.error(error?.message || "Failed to load seller details");
    } finally {
      setViewLoading(false);
    }
  };

  const rows = pagedSubAdmins.map((user) => {
    const id = getId(user);
    const modules = user.allowedModules || [];
    return [
      <span key={`name-${id}`} className="font-medium capitalize">
        {getUserName(user)}
      </span>,
      <span key={`email-${id}`} className="text-gray-500">
        {user.email || "-"}
      </span>,
      <span key={`phone-${id}`} className="text-gray-500">
        {user.phone || "-"}
      </span>,
      <span key={`role-${id}`} className="text-gray-600">
        {getRoleLabel(user.role)}
      </span>,
      <div key={`mods-${id}`} className="flex flex-wrap gap-1">
        {modules.slice(0, 3).map((module) => (
          <span
            key={module}
            className="rounded bg-[var(--admin-blue)]/10 px-1.5 py-0.5 text-xs text-[var(--admin-blue)]"
          >
            {getModuleLabel(module)}
          </span>
        ))}
        {modules.length > 3 && (
          <span className="text-xs text-gray-400">
            +{modules.length - 3} more
          </span>
        )}
      </div>,
      <span
        key={`status-${id}`}
        className={isActive(user) ? "text-green-600" : "text-red-500"}
      >
        {isActive(user) ? "Active" : "Inactive"}
      </span>,
      <span key={`created-${id}`} className="text-gray-500">
        {formatDate(user.createdAt)}
      </span>,
      <div key={`actions-${id}`} className="flex items-center gap-2">
        <ActionButtons
          onEdit={() => openEdit(user)}
          onDelete={() => setConfirmAction({ type: "delete", user })}
          showDeleteButton={canDeleteSubAdmin}
          showEditButton={canUpdateSubAdmin}
          showPasswordButton={false}
          showLinkButton={false}
          viewButton={true}
          onViewClick={() => openView(user)}
          userPermissions={false}
        />
        {canChangeSubAdminStatus && (
          <button
            type="button"
            onClick={() => setConfirmAction({ type: "status", user })}
            className={`rounded px-2 py-1 text-xs ${
              isActive(user)
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-green-50 text-green-600 hover:bg-green-100"
            }`}
          >
            {isActive(user) ? "Deactivate" : "Activate"}
          </button>
        )}
      </div>,
    ];
  });

  return (
    <>
      <Loader loading={sellerSelector?.loading || userSelector?.loading} />
      <div>
        <PageHeader
          title="Seller Management"
          breadcrumbs={[
            { label: "Home", to: "/app/home" },
            { label: "Seller Management" },
          ]}
          actions={
            <>
              {tab === "subadmins" && canCreateSubAdmin && (
                <AddButton onClick={openCreate} labelName="Add Sub-Seller" />
              )}
            </>
          }
        />

        <div className="mb-4 flex gap-0 border-b border-gray-200">
          {[
            { key: "subadmins", label: "Sub-Sellers" },
            { key: "hierarchy", label: "Hierarchy" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`-mb-px border-b-2 pr-5 py-2.5 text-sm font-medium transition-colors ${
                tab === item.key
                  ? "border-[var(--admin-blue)] text-[var(--admin-blue)]"
                  : "border-transparent pr-5  text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "subadmins" && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b p-3">
              <SearchComponent
                isSearchShow={true}
                filters={filters}
                setFilters={setFilters}
                placeholder="Search sub-sellers..."
                handleSearchRemove={() => setFilters({ search: "" })}
                applyFilters={() => setPage(1)}
              />
            </div>
            <TableData
              Heading="Seller Sub-Sellers"
              tableHeadings={[
                "Name",
                "Email",
                "Phone",
                "Role",
                "Management Sections",
                "Status",
                "Created",
                "Actions",
              ]}
              data={rows}
              totalData={visibleSubAdmins.length}
              totalSize={PAGE_SIZE}
              currentPage={page}
              onPageChange={setPage}
            />
            {visibleSubAdmins.length > PAGE_SIZE && (
              <div className="flex justify-center py-4">
                <Pagination
                  totalPages={Math.ceil(visibleSubAdmins.length / PAGE_SIZE)}
                  currentPage={page}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}

        {tab === "hierarchy" && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Seller Hierarchy
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Shows seller admins and sub-sellers below the current seller
                account.
              </p>
            </div>
            <div className="space-y-2">
              {hierarchy.map((node) => (
                <div
                  key={node.id}
                  className="grid grid-cols-1 gap-2 rounded-md border border-gray-100 p-3 md:grid-cols-[1fr,180px,160px]"
                  style={{ marginLeft: `${Math.min(node.level, 5) * 20}px` }}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {node.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {node.email || "Current seller account"}
                    </p>
                  </div>
                  <span className="text-xs capitalize text-gray-600">
                    {node.role}
                  </span>
                  <span
                    className={
                      node.active === false
                        ? "text-xs text-red-500"
                        : "text-xs text-green-600"
                    }
                  >
                    {node.active === false ? "Inactive" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DefaultModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isButtonView={true}
        submitButtonText={editTarget ? "Update Access" : "Create Sub-Seller"}
        closeButtonText="Cancel"
        title={editTarget ? "Edit Sub-Seller" : "Create Sub-Seller"}
        titleClassName="mt-5 font-medium"
      >
        <div className="space-y-4 p-4">
          <FormInput
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            error={errors.fullName}
            maxLength={60}
            required={!editTarget}
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            error={errors.email}
            maxLength={80}
            required={!editTarget}
          />
          <FormInput
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            maxLength={15}
          />
          {!editTarget && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                error={errors.password}
                maxLength={64}
                required
              />
              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                error={errors.confirmPassword}
                maxLength={64}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Management Sections <span className="text-red-500">*</span>
            </label>
            <ModuleSelector
              modules={moduleOptions}
              selected={form.allowedModules}
              onChange={(allowedModules) =>
                setForm((current) => ({ ...current, allowedModules }))
              }
            />
            {errors.allowedModules && (
              <p className="text-xs text-red-500">{errors.allowedModules}</p>
            )}
          </div>
          {form.allowedModules.length > 0 && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowModuleActions((value) => !value)}
                className="text-xs font-medium text-[var(--admin-blue)] hover:underline"
              >
                {showModuleActions ? "Hide" : "Configure"} actions per module
              </button>
              {showModuleActions ? (
                <ModuleActionsSelector
                  modules={form.allowedModules}
                  actionOptions={moduleActionOptions}
                  actionsMap={moduleActionsMap}
                  onChange={setModuleActionsMap}
                />
              ) : (
                <p className="text-[10px] text-gray-400">
                  Uses backend RBAC defaults. Open this to assign
                  create/update/delete per module.
                </p>
              )}
            </div>
          )}
        </div>
      </DefaultModal>
      <DefaultModal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        isButtonView={false}
        title="Sub-Seller Details"
        width="720px"
      >
        {viewTarget && (
          <div className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {getUserName(viewTarget)}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {viewTarget.email || "-"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isActive(viewTarget)
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {isActive(viewTarget) ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-400">Phone</p>
                  <p className="text-gray-800">{viewTarget.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Role</p>
                  <p className="text-gray-800">
                    {getRoleLabel(viewTarget.role)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Created</p>
                  <p className="text-gray-800">
                    {formatDate(viewTarget.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">ID</p>
                  <p className="break-all text-gray-800">{getId(viewTarget)}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase text-gray-400">
                  Management Sections
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(viewTarget.allowedModules || []).length ? (
                    viewTarget.allowedModules.map((module) => (
                      <span
                        key={module}
                        className="rounded bg-[var(--admin-blue)]/10 px-2 py-1 text-xs text-[var(--admin-blue)]"
                      >
                        {getModuleLabel(module)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">
                      No modules assigned
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Orders",
                    value: viewDashboard.totalOrders || viewOrders.length,
                  },
                  { label: "Sub-Seller Products", value: viewProducts.length },
                  {
                    label: "Revenue",
                    value: formatCurrency(
                      viewDashboard.gmv || viewDashboard.totalRevenue || 0,
                    ),
                  },
                  {
                    label: "Returns",
                    value:
                      viewDashboard.returnedOrders ||
                      viewDashboard.returns ||
                      0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <p className="text-[11px] uppercase text-gray-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Seller Orders
                </h3>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {viewOrders.length}
                </span>
              </div>
              {viewLoading ? (
                <p className="text-sm text-gray-400">Loading orders...</p>
              ) : viewOrders.length ? (
                <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded border border-gray-100">
                  {viewOrders.map((order) => (
                    <div
                      key={getOrderId(order)}
                      className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr,120px,120px,110px]"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getOrderId(order)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(getOrderDate(order))}
                        </p>
                      </div>
                      <span className="text-sm text-gray-700">
                        {formatCurrency(
                          getOrderAmount(order),
                          order.currency || "INR",
                        )}
                      </span>
                      <span className="text-xs capitalize text-gray-500">
                        {order.payment_status || order.paymentStatus || "-"}
                      </span>
                      <span className="text-xs capitalize text-gray-600">
                        {order.status || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded border border-dashed border-gray-200 p-4 text-sm text-gray-400">
                  No orders found for this seller account.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Sub-Seller Products
                </h3>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {viewProducts.length}
                </span>
              </div>
              {viewLoading ? (
                <p className="text-sm text-gray-400">Loading products...</p>
              ) : viewProducts.length ? (
                <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded border border-gray-100">
                  {viewProducts.map((product) => (
                    <div
                      key={
                        product._id ||
                        product.id ||
                        product.sku ||
                        getProductName(product)
                      }
                      className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr,110px,100px,110px]"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getProductName(product)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {product.sku ||
                            product.productCode ||
                            product._id ||
                            product.id ||
                            "-"}
                        </p>
                      </div>
                      <span className="text-sm text-gray-700">
                        {formatCurrency(
                          getProductPrice(product),
                          product.currency || "INR",
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        Stock:{" "}
                        {product.stock ??
                          product.quantity ??
                          product.inventory?.quantity ??
                          "-"}
                      </span>
                      <span className="text-xs capitalize text-gray-600">
                        {getProductStatus(product)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded border border-dashed border-gray-200 p-4 text-sm text-gray-400">
                  No products found for this sub-seller.
                </p>
              )}
            </section>
          </div>
        )}
      </DefaultModal>
      <StatusPopup
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
        heading={
          confirmAction?.type === "delete"
            ? "Delete this sub-seller?"
            : `${isActive(confirmAction?.user) ? "Deactivate" : "Activate"} this sub-seller?`
        }
      />
    </>
  );
};

export default SellerSubAdminManagement;
