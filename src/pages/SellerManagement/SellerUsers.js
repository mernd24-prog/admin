import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { getStoredRole, normalizeRole } from "../../_helpers/authStorage";
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
import TableData from "../../components/Atoms/TableData/TableData";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import Loader from "../../components/Loader/Loader";
import Pagination from "../../components/Pagination/Pagination";
import AddButton from "../../components/Button/AddButton";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import StatusPopup from "../../components/Atoms/PopupData/StatusPopup";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import SellerSubAdminManagement from "./SellerSubAdminManagement";

const PAGE_SIZE = 10;

const emptyStaffForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  parentSellerId: "",
  allowedModules: [],
  role: "seller-admin",
};

const unwrapPayload = (response = {}) =>
  response?.data?.data ||
  response?.normalized?.data ||
  response?.data ||
  response ||
  {};

const toListPayload = (payload = {}) => {
  if (Array.isArray(payload)) return { list: payload, total: payload.length };
  const list =
    payload?.list || payload?.items || payload?.results || payload?.data || [];
  const total = Number(
    payload?.total ?? payload?.count ?? payload?.meta?.total ?? list.length,
  );
  return { list: Array.isArray(list) ? list : [], total };
};

const getId = (item = {}) => item?._id || item?.id || item?.userId;

const getUserName = (user = {}) => {
  const profile = user?.profile || {};
  return (
    user?.full_name ||
    user?.fullName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user?.userName ||
    user?.email ||
    "-"
  );
};

const isUserActive = (user = {}) => {
  const status = String(
    user?.accountStatus || user?.status || "",
  ).toLowerCase();
  if (status) return status === "active";
  if (typeof user?.isDisable === "boolean") return !user.isDisable;
  return true;
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
      items: items.sort((left, right) => {
        const leftOrder = left.order || 999;
        const rightOrder = right.order || 999;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left.label || left.slug).localeCompare(
          String(right.label || right.slug),
        );
      }),
    }))
    .sort((left, right) => {
      const leftIndex = MODULE_TAB_ORDER.indexOf(left.tabName);
      const rightIndex = MODULE_TAB_ORDER.indexOf(right.tabName);
      const safeLeft = leftIndex === -1 ? MODULE_TAB_ORDER.length : leftIndex;
      const safeRight =
        rightIndex === -1 ? MODULE_TAB_ORDER.length : rightIndex;
      if (safeLeft !== safeRight) return safeLeft - safeRight;
      return left.tabName.localeCompare(right.tabName);
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

const ModuleSelector = ({
  modules = [],
  selected = [],
  onChange,
  disabled = false,
}) => {
  const selectedSet = new Set(selected);

  const toggleModule = (slug) => {
    if (disabled) return;
    const next = selectedSet.has(slug)
      ? selected.filter((value) => value !== slug)
      : [...selected, slug];
    if (!next.length) return;
    onChange(Array.from(new Set(next)));
  };

  const toggleGroup = (items = []) => {
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
    <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
      {groupModules(modules).map(({ tabName, items }) => (
        <section
          key={tabName}
          className="rounded-md border border-gray-100 p-3"
        >
          <button
            type="button"
            className="mb-2 flex w-full items-center justify-between text-left"
            onClick={() => toggleGroup(items)}
            disabled={disabled}
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

const SellerUsers = () => {
  const navigate = useNavigate();
  const storedRole = normalizeRole(getStoredRole());
  const isSellerRole = ["seller", "seller-admin", "seller-sub-admin"].includes(
    storedRole,
  );

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("sellers");
  const [filters, setFilters] = useState({ search: "" });
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(false);

  const [sellersData, setSellersData] = useState({ list: [], total: 0 });
  const [sellerAdminsData, setSellerAdminsData] = useState({
    list: [],
    total: 0,
  });
  const [sellerSubAdminsData, setSellerSubAdminsData] = useState({
    list: [],
    total: 0,
  });

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [errors, setErrors] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [moduleOptions, setModuleOptions] = useState([]);
  const [moduleActionOptions, setModuleActionOptions] = useState({});
  const [moduleAssignedActions, setModuleAssignedActions] = useState({});
  const [moduleActionsMap, setModuleActionsMap] = useState({});
  const [showModuleActions, setShowModuleActions] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sellerOptions = sellersData.list || [];

  const fetchModuleOptions = useCallback(async (role = "seller-admin") => {
    try {
      const response = await apiRequest("GET", ENDPOINTS.adminAccess.modules, {
        role,
        includePermissions: true,
      });
      const payload = unwrapPayload(response);
      const modules = (payload?.modules || [])
        .filter((module) => module.assignable !== false)
        .map((module) =>
          String(module.slug || module.moduleKey || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
      const actionMaps = buildAccessModuleActionMaps(payload?.modules || []);
      if (modules.length) {
        setModuleOptions(Array.from(new Set(modules)));
        setModuleActionOptions(actionMaps.assignable);
        setModuleAssignedActions(actionMaps.assigned);
        return;
      }
    } catch (error) {
      // Keep module options empty when the backend access catalog is unavailable.
    }
    setModuleOptions([]);
    setModuleActionOptions({});
    setModuleAssignedActions({});
  }, []);

  const fetchTabData = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        page,
        limit: PAGE_SIZE,
        q: filters.search,
      };
      if (tab === "sellers") {
        const response = await apiRequest(
          "GET",
          ENDPOINTS.sellerUsers.sellers,
          query,
        );
        setSellersData(toListPayload(unwrapPayload(response)));
      } else if (tab === "seller-admins") {
        try {
          const response = await apiRequest(
            "GET",
            ENDPOINTS.sellerUsers.sellerAdmins,
            query,
          );
          setSellerAdminsData(toListPayload(unwrapPayload(response)));
        } catch (error) {
          const fallback = await apiRequest(
            "GET",
            ENDPOINTS.adminAccess.subAdmins,
            query,
          );
          const payload = toListPayload(unwrapPayload(fallback));
          const filtered = payload.list.filter(
            (item) => normalizeRole(item.role) === "seller-admin",
          );
          setSellerAdminsData({ list: filtered, total: filtered.length });
        }
      } else if (tab === "seller-sub-admins") {
        try {
          const response = await apiRequest(
            "GET",
            ENDPOINTS.sellerUsers.sellerSubAdmins,
            query,
          );
          setSellerSubAdminsData(toListPayload(unwrapPayload(response)));
        } catch (error) {
          const fallback = await apiRequest(
            "GET",
            ENDPOINTS.adminAccess.subAdmins,
            query,
          );
          const payload = toListPayload(unwrapPayload(fallback));
          const filtered = payload.list.filter(
            (item) => normalizeRole(item.role) === "seller-sub-admin",
          );
          setSellerSubAdminsData({ list: filtered, total: filtered.length });
        }
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load seller users");
    } finally {
      setLoading(false);
    }
  }, [filters.search, page, tab]);

  useEffect(() => {
    if (isSellerRole) return;
    fetchTabData();
  }, [fetchTabData, refreshToken, isSellerRole]);

  useEffect(() => {
    if (isSellerRole) return;
    fetchModuleOptions(staffForm.role || "seller-admin");
  }, [staffForm.role, fetchModuleOptions, isSellerRole]);

  useEffect(() => {
    if (isSellerRole || !staffModalOpen || (sellersData.list || []).length)
      return;

    apiRequest("GET", ENDPOINTS.sellerUsers.sellers, { page: 1, limit: 100 })
      .then((response) => {
        setSellersData(toListPayload(unwrapPayload(response)));
      })
      .catch(() => {
        // Keep modal usable even if seller lookup fails.
      });
  }, [isSellerRole, sellersData.list, staffModalOpen]);

  useEffect(() => {
    setStaffForm((current) => {
      const filtered = (current.allowedModules || []).filter((module) =>
        moduleOptions.includes(module),
      );
      return {
        ...current,
        allowedModules: filtered.length
          ? filtered
          : moduleOptions.slice(0, Math.min(2, moduleOptions.length)),
      };
    });
  }, [moduleOptions]);

  useEffect(() => {
    setModuleActionsMap((current) =>
      reconcileActionsMap(
        staffForm.allowedModules || [],
        current,
        moduleAssignedActions,
        moduleActionOptions,
      ),
    );
  }, [staffForm.allowedModules, moduleActionOptions, moduleAssignedActions]);

  const activeData = useMemo(() => {
    if (tab === "sellers") return sellersData;
    if (tab === "seller-admins") return sellerAdminsData;
    return sellerSubAdminsData;
  }, [tab, sellersData, sellerAdminsData, sellerSubAdminsData]);

  const rows = useMemo(
    () =>
      (activeData.list || []).map((user) => {
        const userId = getId(user);
        const isActive = isUserActive(user);
        const modules = user.allowedModules || [];
        const showStaffActions = tab !== "sellers";
        return [
          <span key={`name-${userId}`} className="font-medium capitalize">
            {getUserName(user)}
          </span>,
          <span key={`email-${userId}`} className="text-gray-500">
            {user.email || "-"}
          </span>,
          <span key={`role-${userId}`} className="text-gray-600">
            {String(user.role || "-").replace(/-/g, " ")}
          </span>,
          <span key={`parent-${userId}`} className="text-xs text-gray-500">
            {user.parentSellerId || user.ownerSellerId || "-"}
          </span>,
          <div key={`mods-${userId}`} className="flex flex-wrap gap-1">
            {modules.slice(0, 2).map((module) => (
              <span
                key={module}
                className="rounded bg-[var(--admin-blue)]/10 px-1.5 py-0.5 text-xs text-[var(--admin-blue)]"
              >
                {getModuleLabel(module)}
              </span>
            ))}
            {modules.length > 2 && (
              <span className="text-xs text-gray-400">
                +{modules.length - 2}
              </span>
            )}
          </div>,
          <ToggleButton
            key={`toggle-${userId}`}
            isToggle={isActive}
            handleClick={() => {
              setToggleTarget(user);
              setConfirmOpen(true);
            }}
          />,
          <ActionButtons
            key={`actions-${userId}`}
            onEdit={() => {
              if (!showStaffActions) return;
              setEditTarget(user);
              setEditMode(true);
              setErrors({});
              const allowedModules = (user.allowedModules || []).filter(
                (module) => moduleOptions.includes(module),
              );
              setModuleActionsMap(
                reconcileActionsMap(
                  allowedModules,
                  buildActionsMapFromUser(user),
                  moduleAssignedActions,
                  moduleActionOptions,
                ),
              );
              setShowModuleActions(false);
              setStaffForm({
                ...emptyStaffForm,
                fullName: getUserName(user),
                email: user.email || "",
                phone: user.phone || "",
                parentSellerId: user.parentSellerId || user.ownerSellerId || "",
                allowedModules,
                role: normalizeRole(user.role) || "seller-admin",
              });
              setStaffModalOpen(true);
            }}
            showEditButton={showStaffActions}
            showDeleteButton={false}
            showPasswordButton={false}
            showLinkButton={false}
            viewButton={true}
            onViewClick={() =>
              navigate(
                showStaffActions
                  ? `/app/admin-users/view/${userId}`
                  : `/app/seller/view/${userId}`,
              )
            }
            userPermissions={showStaffActions}
            onPermissionClick={() =>
              navigate(`/app/user-permissions/${userId}`)
            }
          />,
        ];
      }),
    [
      activeData.list,
      tab,
      moduleOptions,
      moduleActionOptions,
      moduleAssignedActions,
      navigate,
    ],
  );

  const openCreateStaff = (role = "seller-admin") => {
    setEditMode(false);
    setEditTarget(null);
    setErrors({});
    const allowedModules = moduleOptions.slice(
      0,
      Math.min(2, moduleOptions.length),
    );
    setModuleActionsMap(
      reconcileActionsMap(
        allowedModules,
        {},
        moduleAssignedActions,
        moduleActionOptions,
      ),
    );
    setShowModuleActions(false);
    setStaffForm({
      ...emptyStaffForm,
      role,
      allowedModules,
    });
    setStaffModalOpen(true);
  };

  const validateStaffForm = (requirePassword = true) => {
    const nextErrors = {};
    if (!staffForm.fullName?.trim())
      nextErrors.fullName = "Full name is required";
    if (!staffForm.email?.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.email))
      nextErrors.email = "Invalid email address";
    if (requirePassword) {
      if (!staffForm.password) nextErrors.password = "Password is required";
      else if (staffForm.password.length < 8)
        nextErrors.password = "Minimum 8 characters";
      if (staffForm.password !== staffForm.confirmPassword)
        nextErrors.confirmPassword = "Passwords do not match";
    }
    if (!staffForm.parentSellerId)
      nextErrors.parentSellerId = "Parent seller is required";
    if (!staffForm.allowedModules?.length)
      nextErrors.allowedModules = "Select at least one module";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitStaffForm = async (event) => {
    event.preventDefault();
    const requirePassword = !editMode;
    if (!validateStaffForm(requirePassword)) return;
    try {
      const modulePermissions = buildModulePermissions(
        staffForm.allowedModules,
        moduleActionOptions,
        moduleActionsMap,
      );
      const payload = {
        fullName: staffForm.fullName,
        email: staffForm.email,
        phone: staffForm.phone,
        password: staffForm.password,
        parentSellerId: staffForm.parentSellerId,
        allowedModules: staffForm.allowedModules,
        modulePermissions,
      };
      if (editMode && editTarget) {
        const userId = getId(editTarget);
        await apiRequest("PATCH", ENDPOINTS.users.adminUser(userId), {
          fullName: staffForm.fullName,
          phone: staffForm.phone,
        });
        await apiRequest(
          "PATCH",
          ENDPOINTS.adminAccess.subAdminModules(userId),
          {
            allowedModules: staffForm.allowedModules,
            modulePermissions,
          },
        );
        toast.success("Seller staff updated");
      } else if (staffForm.role === "seller-sub-admin") {
        await apiRequest(
          "POST",
          ENDPOINTS.sellerUsers.createSellerSubAdmin,
          payload,
        );
        toast.success("Seller sub-admin created");
      } else {
        await apiRequest(
          "POST",
          ENDPOINTS.sellerUsers.createSellerAdmin,
          payload,
        );
        toast.success("Seller admin created");
      }
      setStaffModalOpen(false);
      setRefreshToken((value) => !value);
    } catch (error) {
      toast.error(error?.message || "Failed to save seller staff");
    }
  };

  const applyStatusChange = async () => {
    if (!toggleTarget) return;
    const userId = getId(toggleTarget);
    const active = isUserActive(toggleTarget);
    try {
      if (tab === "sellers") {
        await apiRequest("PATCH", ENDPOINTS.sellers.adminStatus(userId), {
          accountStatus: active ? "suspended" : "active",
        });
      } else {
        await apiRequest("PATCH", ENDPOINTS.users.adminUser(userId), {
          accountStatus: active ? "suspended" : "active",
        });
      }
      toast.success("Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setRefreshToken((value) => !value);
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    }
  };

  if (isSellerRole) {
    return <SellerSubAdminManagement />;
  }

  return (
    <>
      <Loader loading={loading} />
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm text-gray-500">
            <Link
              to="/app/home"
              className="text-[var(--admin-blue)] hover:underline"
            >
              Home
            </Link>{" "}
            / <b className="text-gray-800">Seller Users</b>
          </h3>
          {(tab === "seller-admins" || tab === "seller-sub-admins") && (
            <AddButton
              onClick={() =>
                openCreateStaff(
                  tab === "seller-admins" ? "seller-admin" : "seller-sub-admin",
                )
              }
            >
              + Add{" "}
              {tab === "seller-admins" ? "Seller Admin" : "Seller Sub Admin"}
            </AddButton>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "sellers", label: "Sellers" },
            { key: "seller-admins", label: "Seller Admins" },
            { key: "seller-sub-admins", label: "Seller Sub Admins" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                setPage(1);
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === item.key
                  ? "bg-[var(--admin-navy)] text-white"
                  : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="p-3">
            <SearchComponent
              isSearchShow={true}
              filters={filters}
              setFilters={setFilters}
              placeholder={`Search ${tab.replace(/-/g, " ")}...`}
              handleSearchRemove={() => setFilters({ search: "" })}
              applyFilters={() => setPage(1)}
              hideBottomBorder
            />
          </div>
          <TableData
            Heading="Seller Users"
            tableHeadings={[
              "Name",
              "Email",
              "Role",
              "Parent Seller",
              "Assigned Modules",
              "Status",
              "Actions",
            ]}
            data={rows}
            totalData={activeData.total || rows.length}
            totalSize={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
          {(activeData.total || 0) > PAGE_SIZE && (
            <div className="flex justify-center py-4">
              <Pagination
                totalPages={Math.ceil((activeData.total || 0) / PAGE_SIZE)}
                currentPage={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      <DefaultModal
        isOpen={staffModalOpen}
        onClose={() => {
          setStaffModalOpen(false);
          setShowModuleActions(false);
          setModuleActionsMap({});
        }}
        onSubmit={submitStaffForm}
        isButtonView={true}
        submitButtonText={editMode ? "Update Staff" : "Create Staff"}
        closeButtonText="Cancel"
        title={
          editMode
            ? "Edit Seller Staff"
            : `Create ${staffForm.role === "seller-sub-admin" ? "Seller Sub Admin" : "Seller Admin"}`
        }
        titleClassName="mt-5 font-medium"
      >
        <div className="space-y-4 p-4">
          <FormInput
            label="Full Name *"
            name="fullName"
            value={staffForm.fullName}
            onChange={(event) =>
              setStaffForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            error={errors.fullName}
            maxLength={60}
            required
          />
          <FormInput
            label="Email *"
            name="email"
            type="email"
            value={staffForm.email}
            onChange={(event) =>
              setStaffForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            error={errors.email}
            maxLength={80}
            disabled={editMode}
            required
          />
          <FormInput
            label="Phone"
            name="phone"
            value={staffForm.phone}
            onChange={(event) =>
              setStaffForm((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            maxLength={15}
          />
          {!editMode && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormInput
                label="Password *"
                name="password"
                type="password"
                value={staffForm.password}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                error={errors.password}
                maxLength={64}
                required
              />
              <FormInput
                label="Confirm Password *"
                name="confirmPassword"
                type="password"
                value={staffForm.confirmPassword}
                onChange={(event) =>
                  setStaffForm((current) => ({
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Parent Seller *
            </label>
            <select
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[var(--admin-blue)] focus:outline-none"
              value={staffForm.parentSellerId}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  parentSellerId: event.target.value,
                }))
              }
            >
              <option value="">Select seller</option>
              {sellerOptions.map((seller) => (
                <option key={getId(seller)} value={getId(seller)}>
                  {getUserName(seller)}
                </option>
              ))}
            </select>
            {errors.parentSellerId && (
              <p className="text-xs text-red-500">{errors.parentSellerId}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Assign Modules <span className="text-red-500">*</span>
            </label>
            <ModuleSelector
              modules={moduleOptions}
              selected={staffForm.allowedModules}
              onChange={(allowedModules) =>
                setStaffForm((current) => ({ ...current, allowedModules }))
              }
            />
            {errors.allowedModules && (
              <p className="text-xs text-red-500">{errors.allowedModules}</p>
            )}
          </div>
          {staffForm.allowedModules.length > 0 && (
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
                  modules={staffForm.allowedModules}
                  actionOptions={moduleActionOptions}
                  actionsMap={moduleActionsMap}
                  onChange={setModuleActionsMap}
                />
              ) : (
                <p className="text-[10px] text-gray-400">
                  Uses backend RBAC role defaults. Open this to assign
                  create/update/delete per module.
                </p>
              )}
            </div>
          )}
        </div>
      </DefaultModal>

      <StatusPopup
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setToggleTarget(null);
        }}
        onConfirm={applyStatusChange}
        heading={`Are you sure you want to ${isUserActive(toggleTarget) ? "deactivate" : "activate"} this user?`}
      />
    </>
  );
};

export default SellerUsers;
