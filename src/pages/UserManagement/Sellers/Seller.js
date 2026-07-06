/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { MdAdd, MdStorefront } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ConfirmModal,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Loader from "../../../components/Loader/Loader";
import {
  createSeller,
  enableDisableSeller,
  getSellerList,
  updateSeller,
} from "../../../Redux/userManagementSlice";

const EMPTY_FORM = {
  full_name: "",
  userName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  isDisable: false,
};

const getGoLiveStatus = (user = {}) => {
  if (user?.organizationSummary?.goLiveStatus) {
    return user.organizationSummary.goLiveStatus;
  }
  const organizationGoLiveStatus =
    user?.organization?.goLiveStatus ||
    user?.sellerProfile?.organizationGoLiveStatus ||
    user?.onboarding?.organizationGoLiveStatus;
  if (organizationGoLiveStatus) return organizationGoLiveStatus;
  return (
    user?.onboarding?.goLiveStatus ||
    user?.sellerProfile?.goLiveStatus ||
    (user?.accountStatus === "active" ? "live" : null) ||
    "pending"
  );
};

const getGoLiveLabel = (user = {}) => {
  const label = user?.organizationSummary?.goLiveLabel || getGoLiveStatus(user);
  return label === "approval_pending" ? "Approval pending" : label;
};

const Sellers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [isRefresh, setIsRefresh] = useState(false);

  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsOpenEditModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const [formData, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const selector = useSelector((state) => state.user);
  const getListData = selector?.getSellerListData?.data?.data;
  const sellerList = getListData?.list || [];
  const totalSellers = getListData?.total || 0;

  useEffect(() => {
    dispatch(
      getSellerList({
        page: pageNo.toString(),
        size: pageSize.toString(),
        keyWord: search,
        searchFields: "full_name,userName,email",
      }),
    ).unwrap().catch((err) => toast.error(err?.message || "Failed to fetch sellers"));
  }, [pageNo, pageSize, search, isRefresh, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (isEdit = false) => {
    const errs = {};
    if (!formData.full_name?.trim()) errs.full_name = "Full name is required";
    else if (formData.full_name.length < 3) errs.full_name = "At least 3 characters";
    else if (formData.full_name.length > 50) errs.full_name = "Max 50 characters";

    if (!isEdit) {
      if (!formData.userName?.trim()) errs.userName = "Username is required";
      else if (formData.userName.length < 5) errs.userName = "At least 5 characters";
      else if (!/^[a-zA-Z0-9_]+$/.test(formData.userName))
        errs.userName = "Letters, numbers and underscores only";
    }

    if (!formData.email?.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.com$/.test(formData.email))
      errs.email = "Please enter a valid .com email";

    if (!isEdit) {
      if (!formData.phone?.trim()) errs.phone = "Phone number is required";
      else if (!/^\d{10,15}$/.test(formData.phone.trim()))
        errs.phone = "Phone must be 10–15 digits";

      if (!formData.password?.trim()) errs.password = "Password is required";
      else if (formData.password.length < 8) errs.password = "At least 8 characters";
      else if (formData.password.length > 15) errs.password = "Max 15 characters";
      else if (!/[A-Z]/.test(formData.password)) errs.password = "At least one uppercase letter";
      else if (!/[a-z]/.test(formData.password)) errs.password = "At least one lowercase letter";
      else if (!/[0-9]/.test(formData.password)) errs.password = "At least one number";
      else if (!/[^A-Za-z0-9]/.test(formData.password)) errs.password = "At least one special character";

      if (!formData.confirmPassword?.trim()) errs.confirmPassword = "Please confirm your password";
      else if (formData.password !== formData.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    setSaving(true);
    try {
      const res = await dispatch(createSeller({
        full_name: formData.full_name.trim(),
        userName: formData.userName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        isDisable: formData.isDisable,
      })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Seller created successfully");
      setIsOpenAddModal(false);
      resetForm();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || err || "Error creating seller");
      if (err?.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setSaving(true);
    try {
      const res = await dispatch(updateSeller({
        _id: formData._id,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        isDisable: formData.isDisable,
      })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Seller updated successfully");
      setIsOpenEditModal(false);
      resetForm();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Error updating seller");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusConfirm = useCallback(async () => {
    if (!statusTarget) return;
    try {
      const res = await dispatch(enableDisableSeller({
        _id: [statusTarget._id],
        isDisable: !statusTarget.isDisable,
      })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Status updated successfully");
      setStatusTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Error updating status");
    }
  }, [statusTarget, dispatch]);

  const columns = useMemo(() => [
    {
      key: "full_name",
      label: "Name",
      render: (v, row) => (
        <button
          type="button"
          onClick={() => {
            const sellerId = row?._id || row?.id;
            if (sellerId) navigate(`/app/seller/view/${sellerId}`);
          }}
          className="group flex items-center gap-2 text-left"
          aria-label={`View ${v || "seller"} details`}
        >
          <img
            src={row?.profile?.avatarUrl || "/Img/noData.png"}
            alt={v || "Seller"}
            className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-gray-50 object-cover transition group-hover:border-[var(--admin-blue)]"
          />
          <div className="min-w-0">
            <p className="truncate font-medium capitalize text-gray-800 transition group-hover:text-[var(--admin-blue)] group-hover:underline">
              {v || row?.sellerProfile?.displayName || "N/A"}
            </p>
            <p className="text-xs text-gray-400 truncate">{row?.userName || ""}</p>
          </div>
        </button>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
    },
    {
      key: "_business",
      label: "Business",
      render: (_, row) => (
        <div className="text-sm text-gray-700">
          <p className="font-medium truncate max-w-[140px]">
            {row?.sellerProfile?.businessName || row?.sellerProfile?.legalBusinessName || "—"}
          </p>
          {row?.sellerProfile?.gstNumber && (
            <p className="text-xs text-gray-400">GST: {row.sellerProfile.gstNumber}</p>
          )}
          {row?.sellerProfile?.panNumber && (
            <p className="text-xs text-gray-400">PAN: {row.sellerProfile.panNumber}</p>
          )}
        </div>
      ),
    },
    {
      key: "_onboarding",
      label: "Onboarding",
      render: (_, row) => (
        <StatusBadge
          status={row?.onboarding?.status || row?.sellerProfile?.onboardingStatus || "pending"}
          size="sm"
        />
      ),
    },
    {
      key: "_kyc",
      label: "KYC",
      render: (_, row) => (
        <StatusBadge
          status={row?.onboarding?.kycStatus || row?.sellerProfile?.kycStatus || "pending"}
          size="sm"
        />
      ),
    },
    {
      key: "_bank",
      label: "Bank",
      render: (_, row) => (
        <StatusBadge
          status={
            row?.onboarding?.bankVerificationStatus ||
            row?.sellerProfile?.bankVerificationStatus ||
            "pending"
          }
          size="sm"
        />
      ),
    },
    {
      key: "_golive",
      label: "Go Live",
      render: (_, row) => <StatusBadge status={getGoLiveStatus(row)} label={getGoLiveLabel(row)} size="sm" />,
    },
    {
      key: "isDisable",
      label: "Status",
      render: (v, row) => (
        <PermissionGuard module="sellers" action={ACTIONS.STATUS_CHANGE} hide>
          <ToggleButton
            isToggle={!v}
            handleClick={() => setStatusTarget(row)}
            size="sm"
          />
        </PermissionGuard>
      ),
    },
  ], [navigate]);

  const rowActions = useCallback(
    (row) => [
      {
        label: "View",
        onClick: () => navigate(`/app/seller/view/${row._id}`),
      },
      {
        label: "Edit",
        onClick: () => {
          setForm({
            _id: row._id,
            full_name: row.full_name || "",
            userName: row.userName || "",
            email: row.email || "",
            phone: row.phone || "",
            password: "",
            confirmPassword: "",
            isDisable: row.isDisable || false,
          });
          setIsOpenEditModal(true);
        },
      },
    ],
    [navigate],
  );

  return (
    <div>
      <Loader loading={selector.loading} />

      <PageHeader
        title="Sellers"
        subtitle="Manage seller accounts and onboarding"
        breadcrumbs={[{ label: "User Management" }, { label: "Sellers" }]}
        actions={
          <PermissionGuard module="sellers" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => { resetForm(); setIsOpenAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add Seller
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={sellerList}
        loading={selector.loading}
        totalCount={totalSellers}
        page={pageNo}
        pageSize={pageSize}
        onPageChange={setPageNo}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageNo(1);
        }}
        onSearch={(val) => { setSearch(val); setPageNo(1); }}
        rowActions={rowActions}
        searchPlaceholder="Search by name, username or email…"
        emptyText="No sellers found."
        emptyIcon={<MdStorefront size={40} className="text-gray-200" />}
        requiredModule="sellers"
      />

      {/* Add Seller Modal */}
      <DefaultModal
        isOpen={isOpenAddModal}
        onClose={() => { setIsOpenAddModal(false); resetForm(); }}
        onSubmit={handleAddSubmit}
        isButtonView={true}
        submitButtonText={saving ? "Submitting..." : "Submit"}
        closeButtonText="Reset"
        title="Add New Seller"
        titleClassName="mt-5 font-medium"
      >
        <div className="p-4 space-y-4">
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
            />
          </div>
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            maxLength={50}
            required
          />
          <FormInput
            label="Phone"
            name="phone"
            type="text"
            value={formData.phone}
            onChange={handleInputChange}
            error={errors.phone}
            maxLength={15}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              maxLength={15}
              required
              helperText="8–15 chars with uppercase, lowercase, number and special character"
            />
            <FormInput
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={errors.confirmPassword}
              maxLength={15}
              required
            />
          </div>
          <div className="flex items-center justify-between rounded border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-700">Active</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={() => setForm((p) => ({ ...p, isDisable: !p.isDisable }))}
            />
          </div>
        </div>
      </DefaultModal>

      {/* Edit Seller Modal */}
      <DefaultModal
        isOpen={isOpenEditModal}
        onClose={() => { setIsOpenEditModal(false); resetForm(); }}
        onSubmit={handleEditSubmit}
        isButtonView={true}
        submitButtonText={saving ? "Updating..." : "Update"}
        closeButtonText="Cancel"
        title="Edit Seller"
        titleClassName="mt-5 font-medium"
      >
        <div className="p-4 space-y-4">
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
              disabled
            />
          </div>
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            maxLength={50}
            required
            disabled
          />
          <div className="flex items-center justify-between rounded border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-700">Active</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={() => setForm((p) => ({ ...p, isDisable: !p.isDisable }))}
            />
          </div>
        </div>
      </DefaultModal>

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
        title={`${statusTarget?.isDisable ? "Enable" : "Disable"} Seller`}
        message={`${statusTarget?.isDisable ? "Enable" : "Disable"} "${statusTarget?.full_name || "this seller"}"?`}
        variant={statusTarget?.isDisable ? "success" : "warning"}
        confirmLabel={statusTarget?.isDisable ? "Enable" : "Disable"}
      />
    </div>
  );
};

export default Sellers;
