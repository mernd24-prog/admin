/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { MdPerson, MdAdd, MdShield } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  createUser,
  enableDisableUser,
  getUserList,
  update,
} from "../../../Redux/userManagementSlice";
import { formatDateForDisplay, uploadFile } from "../../../_helpers/globalFunctions";
import { useListPage } from "../../../hooks/useListPage";

const STATUS_OPTIONS = [
  { value: "false", label: "Active" },
  { value: "true", label: "Disabled" },
];

const FILTER_FIELDS = [
  {
    key: "isDisable",
    type: "select",
    label: "Status",
    width: "w-36",
    options: STATUS_OPTIONS,
  },
  {
    key: "emailVerified",
    type: "select",
    label: "Email Verified",
    width: "w-40",
    options: [
      { value: "true", label: "Verified" },
      { value: "false", label: "Unverified" },
    ],
  },
];

const COLUMNS = [
  {
    key: "full_name",
    label: "User",
    sortable: true,
    render: (v, row) => (
      <span className="flex items-center gap-2">
        <img
          src={row?.profile?.avatarUrl || "/Img/noData.png"}
          alt={v || "User"}
          className="h-8 w-8 rounded-full border border-gray-200 object-cover bg-gray-50 shrink-0"
        />
        <span className="font-medium text-gray-800 capitalize">
          {v ||
            [row?.profile?.firstName, row?.profile?.lastName]
              .filter(Boolean)
              .join(" ") ||
            "N/A"}
        </span>
      </span>
    ),
  },
  {
    key: "email",
    label: "Email",
    render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
  },
  {
    key: "phone",
    label: "Mobile",
    render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
  },
  {
    key: "role",
    label: "Role",
    render: (v) => (
      <span className="capitalize text-sm text-gray-600">{v || "user"}</span>
    ),
  },
  {
    key: "emailVerified",
    label: "Verified",
    render: (v) => (
      <StatusBadge status={v ? "verified" : "unverified"} dot />
    ),
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v, row) => (
      <StatusBadge
        status={row?.accountStatus || (v ? "disabled" : "active")}
        dot
      />
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (v) => (
      <span className="text-xs text-gray-400">{formatDateForDisplay(v)}</span>
    ),
  },
  {
    key: "lastLoginAt",
    label: "Last Login",
    render: (v) => (
      <span className="text-xs text-gray-400">
        {v ? formatDateForDisplay(v) : "—"}
      </span>
    ),
  },
];

const EMPTY_FORM = {
  full_name: "",
  userName: "",
  email: "",
  password: "",
  confirmPassword: "",
  avatarUrl: "",
  isDisable: false,
};

const Users = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const [isRefresh, setIsRefresh] = useState(false);
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selector = useSelector((state) => state.user);
  const getListData = selector?.getUserListData?.data?.data;
  const totalUsers = getListData?.total || 0;
  const userList = getListData?.list || [];

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getUserList({
        page: params.page?.toString(),
        size: params.limit?.toString() || "10",
        keyWord: params.search || "",
        searchFields: "userName,full_name,email",
        select: "userName full_name email isDisable phone createdAt lastLoginAt accountStatus emailVerified profile",
        ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
        ...(params.emailVerified !== undefined && {
          emailVerified: params.emailVerified,
        }),
      })
    );
  }, [list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir, isRefresh]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (isEdit = false) => {
    const errs = {};
    if (!formData.full_name?.trim()) errs.full_name = "Full name is required";
    else if (formData.full_name.length < 3)
      errs.full_name = "At least 3 characters";
    if (!formData.userName?.trim()) errs.userName = "Username is required";
    else if (formData.userName.length < 5)
      errs.userName = "At least 5 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.userName))
      errs.userName = "Letters, numbers and underscores only";
    if (!formData.email?.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = "Invalid email address";
    if (!isEdit) {
      if (!formData.password) errs.password = "Password is required";
      if (formData.password !== formData.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      return;
    }
    try {
      const imageUrl = await uploadFile(file, "USER_AVATAR");
      setFormData((prev) => ({ ...prev, avatarUrl: imageUrl }));
      toast.success("Profile image uploaded");
    } catch (err) {
      toast.error(err?.message || "Failed to upload profile image");
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setFormData(EMPTY_FORM);
    setErrors({});
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    setSaving(true);
    try {
      const res = await dispatch(createUser({ ...formData })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "User created successfully");
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || err || "Error creating user");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setSaving(true);
    try {
      const res = await dispatch(
        update({ _id: formData._id, full_name: formData.full_name, email: formData.email, avatarUrl: formData.avatarUrl, isDisable: formData.isDisable })
      ).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "User updated successfully");
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || err || "Error updating user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (user) => {
    setToggleTarget(user);
    setConfirmOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const res = await dispatch(
        enableDisableUser({ _id: [toggleTarget._id], isDisable: !toggleTarget.isDisable })
      ).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Error updating status");
    }
  };

  const rowActions = useCallback(
    (row) => [
      {
        label: "View",
        onClick: () => navigate(`/app/users/view/${row._id}`),
      },
      {
        label: "Permissions",
        icon: <MdShield size={14} />,
        onClick: () => navigate(`/app/user-permissions/${row._id}`),
      },
      {
        label: "Edit",
        onClick: () => {
          setFormData({
            _id: row._id,
            full_name:
              row.full_name ||
              [row?.profile?.firstName, row?.profile?.lastName]
                .filter(Boolean)
                .join(" ") ||
              "",
            userName: row.userName || "",
            email: row.email || "",
            password: "",
            confirmPassword: "",
            avatarUrl: row?.profile?.avatarUrl || "",
            isDisable: row.isDisable || false,
          });
          setModalMode("edit");
        },
      },
      {
        label: row.isDisable ? "Enable" : "Disable",
        onClick: () => handleToggle(row),
        danger: !row.isDisable,
      },
    ],
    [navigate]
  );

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Users"
        subtitle="Manage customer accounts"
        breadcrumbs={[{ label: "User Management" }, { label: "Users" }]}
        actions={
          <PermissionGuard module="users" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setModalMode("add")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add User
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={userList}
        loading={selector.loading}
        totalCount={totalUsers}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        rowActions={rowActions}
        searchPlaceholder="Search by name, email…"
        emptyText="No users found."
        emptyIcon={<MdPerson size={40} className="text-gray-200" />}
        requiredModule="users"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={selector.loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {modalMode === "add" ? "Add User" : "Edit User"}
            </h2>

            <form onSubmit={modalMode === "add" ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Full Name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  error={errors.full_name}
                  maxLength={50}
                  required
                />
                <FormInput
                  label="Username"
                  name="userName"
                  type="text"
                  value={formData.userName}
                  onChange={handleInputChange}
                  error={errors.userName}
                  maxLength={30}
                  required
                  disabled={modalMode === "edit"}
                />
              </div>

              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                maxLength={100}
                required
              />

              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Image
                </label>
                <div className="flex items-center gap-4 rounded border border-gray-100 bg-gray-50 p-3">
                  <img
                    src={formData.avatarUrl || "/Img/noData.png"}
                    alt="Preview"
                    className="h-12 w-12 rounded-full border border-gray-200 object-cover bg-white shrink-0"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer rounded-md bg-[var(--admin-blue)] px-3 py-1.5 text-sm text-white hover:bg-[#2e3074]">
                      {formData.avatarUrl ? "Change" : "Upload"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => setFormData((p) => ({ ...p, avatarUrl: "" }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Password — add mode only */}
              {modalMode === "add" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    error={errors.password}
                    maxLength={50}
                    required
                  />
                  <FormInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    error={errors.confirmPassword}
                    maxLength={50}
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Account Active
                </span>
                <ToggleButton
                  isToggle={!formData.isDisable}
                  handleClick={() =>
                    setFormData((p) => ({ ...p, isDisable: !p.isDisable }))
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving…" : modalMode === "add" ? "Create User" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToggleTarget(null); }}
        onConfirm={handleDisableConfirm}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} User`}
        message={`Are you sure you want to ${toggleTarget?.isDisable ? "enable" : "disable"} ${toggleTarget?.full_name || "this user"}?`}
        variant={toggleTarget?.isDisable ? "default" : "danger"}
        confirmText={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />
    </div>
  );
};

export default Users;
