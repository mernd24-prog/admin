/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import {
  getAdmins,
  deactivateAdminUser,
  getPlatformSubAdmins,
  createPlatformSubAdmin,
  createAdmin,
  updateAdminUser,
} from "../../../Redux/adminCoreSlice";
import TableData from "../../../components/Atoms/TableData/TableData";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Loader from "../../../components/Loader/Loader";
import Pagination from "../../../components/Pagination/Pagination";

import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import StatusPopup from "../../../components/Atoms/PopupData/StatusPopup";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import { getStoredRole, normalizeRole } from "../../../_helpers/authStorage";
import { usePermission } from "../../../_helpers/usePermission";
import AddButton from "../../../components/Atoms/buttons/AddButton";

const PAGE_SIZE = 10;

const emptyUser = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  allowedModules: [],
};
const emptySubAdmin = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  role: "sub-admin",
  parentAdminId: "",
  allowedModules: [],
};

const getUserDisplayName = (user = {}) => {
  const profile = user.profile || {};
  return (
    user.fullName ||
    user.full_name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    user.userName ||
    user.email ||
    ""
  );
};

const extractListPayload = (sliceData = {}) => {
  const candidates = [
    sliceData?.data?.data,
    sliceData?.data?.normalized?.data,
    sliceData?.data,
    sliceData?.normalized?.data,
    sliceData?.normalized,
    sliceData,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return { list: candidate, total: candidate.length };
    }
    if (!candidate || typeof candidate !== "object") continue;

    const list = Array.isArray(candidate.list)
      ? candidate.list
      : Array.isArray(candidate.items)
        ? candidate.items
        : Array.isArray(candidate.results)
          ? candidate.results
          : null;

    if (list) {
      return {
        list,
        total: Number(
          candidate.total ??
            candidate.count ??
            candidate.meta?.total ??
            list.length,
        ),
      };
    }
  }

  return { list: [], total: 0 };
};

const filterUsers = (users = [], query = "") => {
  const value = String(query || "")
    .trim()
    .toLowerCase();
  if (!value) return users;
  return users.filter((user = {}) => {
    const profile = user.profile || {};
    const searchable = [
      user.full_name,
      user.fullName,
      user.email,
      user.phone,
      profile.firstName,
      profile.lastName,
      user.role,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(value);
  });
};

const isUserActive = (user = {}) => {
  if (!user) return false;
  const status = String(user.accountStatus || user.status || "").toLowerCase();
  if (status) return status === "active";
  if (typeof user.isDisable === "boolean") return !user.isDisable;
  return true;
};

const formatRole = (role = "") =>
  String(role || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const AdminUsers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((s) => s.adminCore);
  const { canAny } = usePermission();

  const storedRole = normalizeRole(getStoredRole());
  const isSuperAdmin = storedRole === "super-admin";
  const isAdmin = storedRole === "admin" || isSuperAdmin;
  const canSeeAdminsTab = isSuperAdmin;
  const canCreateSubAdmin =
    isSuperAdmin ||
    canAny("admin_users", ["create", "add", "assign"]) ||
    canAny("rbac", ["create", "add", "assign"]) ||
    canAny("users", ["create", "add", "assign"]);

  const [tab, setTab] = useState(isSuperAdmin ? "admins" : "subadmins");
  const [pageAdmin, setPageAdmin] = useState(1);
  const [pageSubAdmin, setPageSubAdmin] = useState(1);
  const [refresh, setRefresh] = useState(false);
  const [filters, setFilters] = useState({ search: "" });

  const [viewing, setViewing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentsError, setParentsError] = useState("");
  const [parentReload, setParentReload] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [addSubAdminOpen, setAddSubAdminOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Forms
  const [adminForm, setAdminForm] = useState(emptyUser);
  const [subAdminForm, setSubAdminForm] = useState(emptySubAdmin);
  const [errors, setErrors] = useState({});

  // ── Data ────────────────────────────────────────────────────────────────────

  const { list: hierarchyAdmins, total: hierarchyAdminsTotal } =
    extractListPayload(selector?.adminsData);
  const { list: allSubAdmins, total: platformSubAdminsTotal } =
    extractListPayload(selector?.platformSubAdminsData);
  const admins = hierarchyAdmins.filter(
    (user) => normalizeRole(user?.role) === "admin",
  );
  const adminsTotal =
    hierarchyAdmins.length === admins.length
      ? hierarchyAdminsTotal
      : admins.length;
  const subAdminPool = (Array.isArray(allSubAdmins) ? allSubAdmins : []).filter(
    (user) => normalizeRole(user?.role) === "sub-admin",
  );
  const filteredSubAdmins = useMemo(
    () => filterUsers(subAdminPool, filters.search),
    [subAdminPool, filters.search],
  );
  const subAdminsTotal =
    subAdminPool.length === allSubAdmins.length
      ? platformSubAdminsTotal || filteredSubAdmins.length
      : filteredSubAdmins.length;
  const subAdmins = useMemo(() => {
    if (platformSubAdminsTotal) return filteredSubAdmins;
    const start = (pageSubAdmin - 1) * PAGE_SIZE;
    return filteredSubAdmins.slice(start, start + PAGE_SIZE);
  }, [filteredSubAdmins, pageSubAdmin, platformSubAdminsTotal]);

  const loading = selector?.loading || false;

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tab === "admins" && canSeeAdminsTab) {
      dispatch(
        getAdmins({ page: pageAdmin, limit: PAGE_SIZE, q: filters.search }),
      );
    }
  }, [tab, pageAdmin, refresh, filters.search, dispatch, canSeeAdminsTab]);

  useEffect(() => {
    if (tab === "subadmins") {
      dispatch(
        getPlatformSubAdmins({
          page: pageSubAdmin,
          limit: PAGE_SIZE,
          q: filters.search,
        }),
      );
    }
  }, [tab, pageSubAdmin, refresh, filters.search]);

  useEffect(() => {
    if (!addSubAdminOpen || !isSuperAdmin) return;
    let active = true;
    setParentsLoading(true);
    setParentsError("");
    (async () => {
      const parents = [];
      let page = 1;
      let total;
      do {
        const response = await axiosProvider.get("/admin/access/admins", {
          params: { page, limit: 100 },
        });
        const payload = response.data?.data;
        const items = Array.isArray(payload)
          ? payload
          : payload?.items || payload?.list || [];
        parents.push(...items);
        total = Number(
          response.data?.meta?.total ?? payload?.total ?? parents.length,
        );
        if (!items.length) break;
        page += 1;
      } while (parents.length < total);
      if (active)
        setParentOptions(
          parents.filter(
            (parent) =>
              parent.role === "admin" && parent.accountStatus === "active",
          ),
        );
    })()
      .catch(() => {
        if (active) setParentsError("Unable to load parent admins.");
      })
      .finally(() => {
        if (active) setParentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [addSubAdminOpen, isSuperAdmin, parentReload]);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validateUserForm = (form, requirePassword = true) => {
    const errs = {};
    if (!form.fullName?.trim()) errs.fullName = "Full name is required";
    if (!form.email?.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email address";
    if (requirePassword) {
      if (!form.password) errs.password = "Password is required";
      else if (form.password.length < 8) errs.password = "Minimum 8 characters";
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const createAccount = async (event, form, creator, close, reset, label) => {
    event.preventDefault();
    const validation = validateUserForm(form);
    if (Object.keys(validation).length) return setErrors(validation);
    try {
      await dispatch(
        creator({ ...form, allowedModules: [], modulePermissions: [] }),
      ).unwrap();
      toast.success(
        label === "Sub-admin" && (form.parentAdminId || storedRole === "admin")
          ? "Sub-admin created with inherited parent access."
          : `${label} created. Assign access using Permissions in the table.`,
      );
      close(false);
      reset();
      setErrors({});
      setRefresh((value) => !value);
    } catch (error) {
      toast.error(error?.message || `Failed to create ${label.toLowerCase()}`);
    }
  };
  const handleCreateAdmin = (event) =>
    createAccount(
      event,
      adminForm,
      createAdmin,
      setAddAdminOpen,
      () => setAdminForm(emptyUser),
      "Admin",
    );
  const handleCreateSubAdmin = (event) =>
    createAccount(
      event,
      subAdminForm,
      createPlatformSubAdmin,
      setAddSubAdminOpen,
      () => setSubAdminForm(emptySubAdmin),
      "Sub-admin",
    );

  const handleToggleStatus = (user) => {
    setToggleTarget(user);
    setConfirmOpen(true);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const userId = toggleTarget._id || toggleTarget.id;
    const isActive = isUserActive(toggleTarget);
    try {
      if (isActive) {
        await dispatch(
          updateAdminUser({ userId, accountStatus: "suspended" }),
        ).unwrap();
      } else {
        await dispatch(
          updateAdminUser({ userId, accountStatus: "active" }),
        ).unwrap();
      }
      toast.success("Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleSearchApply = () => setRefresh((r) => !r);
  const handleSearchRemove = () => {
    setFilters({ search: "" });
    setRefresh((r) => !r);
  };

  // ── Table data ───────────────────────────────────────────────────────────────

  const getParentAdminLabel = (user = {}) => {
    const parent = user.parentAdmin || {};
    const nameFromParent =
      [parent?.profile?.firstName, parent?.profile?.lastName]
        .filter(Boolean)
        .join(" ") ||
      parent?.full_name ||
      parent?.email;
    return nameFromParent || user.parentAdminName || "-";
  };

  const adminRows = useMemo(
    () =>
      (Array.isArray(admins) ? admins : []).map((user) => {
        const name = user.profile?.firstName
          ? `${user.profile.firstName} ${user.profile.lastName || ""}`.trim()
          : user.full_name || user.email;
        const isActive = isUserActive(user);
        const userId = user._id || user.id;
        return [
          <span key={`name-${userId}`} className="font-medium capitalize">
            {name}
          </span>,
          <span key={`email-${userId}`} className="text-gray-500">
            {user.email}
          </span>,
          <span key={`summary-${userId}`} className="text-xs text-gray-500">
            {user.assignedModuleCount ?? (user.allowedModules || []).length}{" "}
            modules /{" "}
            {user.assignedActionCount ??
              user.permissionSummary?.actionCount ??
              0}{" "}
            actions
          </span>,
          <span key={`created-${userId}`} className="text-xs text-gray-500">
            {formatRole(user.createdByRole) || "-"}
          </span>,
          <ToggleButton
            key={`toggle-${userId}`}
            isToggle={isActive}
            handleClick={() => handleToggleStatus(user)}
            requiredModule="rbac"
          />,
          <div key={`actions-${userId}`} className="flex items-center gap-1">
            <ActionButtons
              showEditButton={false}
              showDeleteButton={true}
              onDelete={() => setDeleteTarget(user)}
              viewButton={true}
              onViewClick={() => {
                setViewing(user);
                setPassword("");
                setConfirmPassword("");
              }}
              userPermissions={true}
              onPermissionClick={() =>
                navigate(`/app/user-permissions/${userId}`)
              }
              requiredModule="rbac"
            />
          </div>,
        ];
      }),
    [admins, navigate, isSuperAdmin],
  );

  const subAdminRows = useMemo(
    () =>
      (Array.isArray(subAdmins) ? subAdmins : []).map((user) => {
        const name = user.profile?.firstName
          ? `${user.profile.firstName} ${user.profile.lastName || ""}`.trim()
          : user.full_name || user.email;
        const isActive = isUserActive(user);
        const userId = user._id || user.id;
        const assignedModuleCount =
          user.assignedModuleCount ?? (user.allowedModules || []).length;
        return [
          <span key={`name-${userId}`} className="font-medium capitalize">
            {name}
          </span>,
          <span key={`email-${userId}`} className="text-gray-500">
            {user.email}
          </span>,
          <span key={`parent-${userId}`} className="text-xs text-gray-600">
            {getParentAdminLabel(user)}
          </span>,
          <span key={`created-${userId}`} className="text-xs text-gray-500">
            {formatRole(user.createdByRole) || "-"}
          </span>,
          <span
            key={`module-count-${userId}`}
            className="text-xs text-gray-500"
          >
            {assignedModuleCount}
          </span>,
          <ToggleButton
            key={`toggle-${userId}`}
            isToggle={isActive}
            handleClick={() => handleToggleStatus(user)}
            requiredModule="rbac"
          />,
          <div key={`actions-${userId}`} className="flex items-center gap-1">
            <ActionButtons
              showEditButton={false}
              showDeleteButton={true}
              onDelete={() => setDeleteTarget(user)}
              viewButton={true}
              onViewClick={() => {
                setViewing(user);
                setPassword("");
                setConfirmPassword("");
              }}
              userPermissions={true}
              onPermissionClick={() =>
                navigate(`/app/user-permissions/${userId}`)
              }
              requiredModule="rbac"
            />
          </div>,
        ];
      }),
    [subAdmins, navigate, isAdmin],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Loader loading={loading} />
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-gray-500">
            <Link
              to="/app/home"
              className="hover:underline text-[var(--admin-blue)]"
            >
              Home
            </Link>{" "}
            / <b className="text-gray-800">Admin Users</b>
          </h3>
          <div className="flex gap-2">
            {tab === "admins" && isSuperAdmin && (
              <AddButton
                requiredModule="rbac"
                variant="primary"
                className="admin-btn-white-text"
                onClick={() => {
                  setErrors({});
                  setAdminForm({
                    ...emptyUser,
                    allowedModules: [],
                  });
                  setAddAdminOpen(true);
                }}
              >
                + Add Admin
              </AddButton>
            )}
            {tab === "subadmins" && isAdmin && canCreateSubAdmin && (
              <AddButton
                variant="primary"
                className="admin-btn-white-text"
                onClick={() => {
                  setErrors({});
                  setSubAdminForm({
                    ...emptySubAdmin,
                    allowedModules: [],
                  });
                  setAddSubAdminOpen(true);
                }}
              >
                + Add Sub-Admin
              </AddButton>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ...(canSeeAdminsTab ? [{ key: "admins", label: "Admins" }] : []),
            { key: "subadmins", label: "Sub-Admins" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-[var(--admin-navy)] text-white"
                  : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3">
            <SearchComponent
              isSearchShow={true}
              filters={filters}
              setFilters={setFilters}
              placeholder={`Search ${tab === "admins" ? "admins" : "sub-admins"}…`}
              handleSearchRemove={handleSearchRemove}
              applyFilters={handleSearchApply}
              requiredModule="rbac"
              hideBottomBorder
            />
          </div>

          {tab === "admins" && (
            <TableData
              Heading="Admins"
              tableHeadings={[
                "Name",
                "Email",
                "Permission Summary",
                "Created By",
                "Status",
                "Actions",
              ]}
              data={adminRows}
              totalData={adminsTotal}
              totalSize={PAGE_SIZE}
              currentPage={pageAdmin}
              onPageChange={setPageAdmin}
            />
          )}

          {tab === "subadmins" && (
            <TableData
              Heading="Sub-Admins"
              tableHeadings={[
                "Name",
                "Email",
                "Parent Admin",
                "Created By",
                "Assigned Modules Count",
                "Status",
                "Actions",
              ]}
              data={subAdminRows}
              totalData={subAdminsTotal}
              totalSize={PAGE_SIZE}
              currentPage={pageSubAdmin}
              onPageChange={setPageSubAdmin}
            />
          )}
        </div>

        {tab === "subadmins" && subAdminsTotal > PAGE_SIZE && (
          <div className="flex justify-center mt-4">
            <Pagination
              totalPages={Math.ceil(subAdminsTotal / PAGE_SIZE)}
              currentPage={pageSubAdmin}
              onPageChange={setPageSubAdmin}
            />
          </div>
        )}
      </div>

      {/* Create Admin modal — super-admin only */}
      <DefaultModal
        isOpen={addAdminOpen}
        onClose={() => {
          setAddAdminOpen(false);
        }}
        onSubmit={handleCreateAdmin}
        isButtonView={true}
        submitButtonText="Create Admin"
        closeButtonText="Cancel"
        title="Create Admin"
        titleClassName="mt-5 font-medium"
      >
        <div className="p-4 space-y-4">
          <FormInput
            label="Full Name *"
            name="fullName"
            value={adminForm.fullName}
            onChange={(e) =>
              setAdminForm((f) => ({ ...f, fullName: e.target.value }))
            }
            error={errors.fullName}
            maxLength={60}
            required
          />
          <FormInput
            label="Email *"
            name="email"
            type="email"
            value={adminForm.email}
            onChange={(e) =>
              setAdminForm((f) => ({ ...f, email: e.target.value }))
            }
            error={errors.email}
            maxLength={80}
            required
          />
          <FormInput
            label="Phone"
            name="phone"
            value={adminForm.phone}
            onChange={(e) =>
              setAdminForm((f) => ({ ...f, phone: e.target.value }))
            }
            maxLength={15}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Password *"
              name="password"
              type="password"
              value={adminForm.password}
              onChange={(e) =>
                setAdminForm((f) => ({ ...f, password: e.target.value }))
              }
              error={errors.password}
              maxLength={64}
              required
            />
            <FormInput
              label="Confirm Password *"
              name="confirmPassword"
              type="password"
              value={adminForm.confirmPassword}
              onChange={(e) =>
                setAdminForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
              error={errors.confirmPassword}
              maxLength={64}
              required
            />
          </div>
          <p className="text-sm text-gray-500">
            Manage module access and actions from the user’s Permissions button
            in the table.
          </p>
        </div>
      </DefaultModal>

      {/* Create Sub-Admin modal */}
      <DefaultModal
        isOpen={addSubAdminOpen}
        onClose={() => {
          setAddSubAdminOpen(false);
        }}
        onSubmit={handleCreateSubAdmin}
        isButtonView={true}
        submitButtonText="Create Sub-Admin"
        closeButtonText="Cancel"
        title="Create Sub-Admin"
        titleClassName="mt-5 font-medium"
      >
        <div className="p-4 space-y-4">
          {isSuperAdmin ? (
            <div className="space-y-2">
              <label className="block text-sm">
                Parent Admin (optional)
                <select
                  aria-label="Parent Admin (optional)"
                  className="admin-input w-full mt-1"
                  value={subAdminForm.parentAdminId || ""}
                  disabled={parentsLoading || Boolean(parentsError)}
                  onChange={(event) =>
                    setSubAdminForm((form) => ({
                      ...form,
                      parentAdminId: event.target.value,
                    }))
                  }
                >
                  <option value="">No parent — assign access separately</option>
                  {parentOptions.map((parent) => (
                    <option
                      key={parent.id || parent._id}
                      value={parent.id || parent._id}
                    >
                      {getUserDisplayName(parent)} ({parent.email})
                    </option>
                  ))}
                </select>
              </label>
              {parentsLoading && <p className="text-xs">Loading admins…</p>}
              {parentsError && (
                <div role="alert">
                  {parentsError}
                  <button
                    type="button"
                    onClick={() => setParentReload((value) => value + 1)}
                  >
                    Retry
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">
                With a parent selected, this sub-admin inherits only that
                admin’s current modules and permissions.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              This sub-admin will inherit your current modules and permissions.
            </p>
          )}

          <FormInput
            label="Full Name *"
            name="fullName"
            value={subAdminForm.fullName}
            onChange={(e) =>
              setSubAdminForm((f) => ({ ...f, fullName: e.target.value }))
            }
            error={errors.fullName}
            maxLength={60}
            required
          />
          <FormInput
            label="Email *"
            name="email"
            type="email"
            value={subAdminForm.email}
            onChange={(e) =>
              setSubAdminForm((f) => ({ ...f, email: e.target.value }))
            }
            error={errors.email}
            maxLength={80}
            required
          />
          <FormInput
            label="Phone"
            name="phone"
            value={subAdminForm.phone}
            onChange={(e) =>
              setSubAdminForm((f) => ({ ...f, phone: e.target.value }))
            }
            maxLength={15}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 bg-gray-50"
              value="Sub Admin"
              readOnly
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Password *"
              name="password"
              type="password"
              value={subAdminForm.password}
              onChange={(e) =>
                setSubAdminForm((f) => ({ ...f, password: e.target.value }))
              }
              error={errors.password}
              maxLength={64}
              required
            />
            <FormInput
              label="Confirm Password *"
              name="confirmPassword"
              type="password"
              value={subAdminForm.confirmPassword}
              onChange={(e) =>
                setSubAdminForm((f) => ({
                  ...f,
                  confirmPassword: e.target.value,
                }))
              }
              error={errors.confirmPassword}
              maxLength={64}
              required
            />
          </div>

          <p className="text-sm text-gray-500">
            {subAdminForm.parentAdminId || storedRole === "admin"
              ? "Access is managed through the parent admin. This sub-admin cannot receive additional permissions."
              : "Assign access afterward using Permissions in the table."}
          </p>
        </div>
      </DefaultModal>

      {/* Status toggle confirm */}
      <StatusPopup
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setToggleTarget(null);
        }}
        onConfirm={confirmToggle}
        heading={`Are you sure you want to ${
          isUserActive(toggleTarget) ? "deactivate" : "activate"
        } this user?`}
      />

      <StatusPopup
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await dispatch(
              deactivateAdminUser({
                userId: deleteTarget.id || deleteTarget._id,
                reason: "deleted by admin",
              }),
            ).unwrap();
            toast.success("Account deleted");
            setDeleteTarget(null);
            setRefresh((value) => !value);
          } catch (error) {
            toast.error(error?.message || "Unable to delete account");
          }
        }}
        heading={`Delete ${deleteTarget ? getUserDisplayName(deleteTarget) : "account"}? This removes account access.`}
      />
      <DefaultModal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Account Details"
        onSubmit={(event) => event.preventDefault()}
        isButtonView={false}
      >
        {viewing && (
          <div className="p-4 space-y-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt>Name</dt>
                <dd>{getUserDisplayName(viewing)}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{viewing.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{formatRole(viewing.role)}</dd>
              </div>
              <div>
                <dt>Parent admin</dt>
                <dd>{getParentAdminLabel(viewing)}</dd>
              </div>
            </dl>
            {isAdmin && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-medium">Change Password</h3>
                <FormInput
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  maxLength={64}
                />
                <FormInput
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  maxLength={64}
                />
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={passwordSaving}
                  onClick={async () => {
                    if (password.length < 8 || password.length > 64)
                      return toast.error("Password must be 8 to 64 characters");
                    if (password !== confirmPassword)
                      return toast.error("Passwords do not match");
                    setPasswordSaving(true);
                    try {
                      await dispatch(
                        updateAdminUser({
                          userId: viewing.id || viewing._id,
                          password,
                        }),
                      ).unwrap();
                      toast.success("Password changed");
                      setPassword("");
                      setConfirmPassword("");
                    } catch (error) {
                      toast.error(
                        error?.message || "Unable to change password",
                      );
                    } finally {
                      setPasswordSaving(false);
                    }
                  }}
                >
                  {passwordSaving ? "Saving…" : "Change Password"}
                </button>
              </div>
            )}
          </div>
        )}
      </DefaultModal>
    </>
  );
};

export default AdminUsers;
