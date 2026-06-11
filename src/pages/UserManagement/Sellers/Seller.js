/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { MdStore, MdAdd, MdVerified, MdAccountBalance } from "react-icons/md";
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
  createSeller,
  enableDisableSeller,
  getSellerList,
  reviewSellerKyc,
  updateSeller,
  updateSellerBankStatus,
  updateSellerGoLive,
} from "../../../Redux/userManagementSlice";
import { useListPage } from "../../../hooks/useListPage";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

const KYC_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "under_review", label: "Under Review" },
];

const ONBOARDING_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready_for_go_live", label: "Ready" },
  { value: "completed", label: "Completed" },
];

const FILTER_FIELDS = [
  {
    key: "kycStatus",
    type: "select",
    label: "KYC Status",
    width: "w-40",
    options: KYC_STATUS_OPTIONS,
  },
  {
    key: "onboardingStatus",
    type: "select",
    label: "Onboarding",
    width: "w-40",
    options: ONBOARDING_STATUS_OPTIONS,
  },
  {
    key: "isDisable",
    type: "select",
    label: "Account",
    width: "w-36",
    options: [
      { value: "false", label: "Active" },
      { value: "true", label: "Disabled" },
    ],
  },
];

const getGoLiveStatus = (user = {}) => {
  if (user?.accountStatus === "active" || user?.sellerProfile?.goLiveStatus === "live") return "live";
  return user?.onboarding?.goLiveStatus || user?.sellerProfile?.goLiveStatus || "pending";
};

const COLUMNS = [
  {
    key: "full_name",
    label: "Seller",
    sortable: true,
    render: (v, row) => (
      <span className="flex items-center gap-2">
        <img
          src={row?.profile?.avatarUrl || "/Img/noData.png"}
          alt={v || "Seller"}
          className="h-8 w-8 rounded-full border border-gray-200 object-cover bg-gray-50 shrink-0"
        />
        <span className="font-medium text-gray-800 capitalize">
          {v || row?.sellerProfile?.displayName || row?.profile?.firstName || "N/A"}
        </span>
      </span>
    ),
  },
  {
    key: "sellerProfile",
    label: "Business",
    render: (v) => (
      <span className="text-sm text-gray-600">
        {v?.businessName || v?.legalBusinessName || "—"}
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
    label: "Phone",
    render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
  },
  {
    key: "onboarding",
    label: "Onboarding",
    render: (v, row) => (
      <StatusBadge
        status={v?.status || row?.sellerProfile?.onboardingStatus || "pending"}
        dot
      />
    ),
  },
  {
    key: "onboarding",
    label: "KYC",
    render: (v, row) => (
      <StatusBadge
        status={v?.kycStatus || row?.sellerProfile?.kycStatus || "pending"}
        dot
      />
    ),
  },
  {
    key: "onboarding",
    label: "Bank",
    render: (v, row) => (
      <StatusBadge
        status={v?.bankVerificationStatus || row?.sellerProfile?.bankVerificationStatus || "not_submitted"}
        dot
      />
    ),
  },
  {
    key: "_goLive",
    label: "Go Live",
    render: (_, row) => <StatusBadge status={getGoLiveStatus(row)} dot />,
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v, row) => (
      <StatusBadge status={row?.accountStatus || (v ? "disabled" : "active")} dot />
    ),
  },
];

const EMPTY_FORM = {
  full_name: "",
  userName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  isDisable: false,
};

const Sellers = () => {
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
  const [saving, setSaving] = useState(false);

  // Status toggle
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // KYC review
  const [kycForm, setKycForm] = useState({ sellerId: "", verificationStatus: "verified", rejectionReason: "" });
  const [isKycReviewOpen, setIsKycReviewOpen] = useState(false);

  // Bank review
  const [bankForm, setBankForm] = useState({ sellerId: "", bankVerificationStatus: "verified", bankRejectionReason: "" });
  const [isBankReviewOpen, setIsBankReviewOpen] = useState(false);

  useDropdownOptions("kyc-review-statuses");
  useDropdownOptions("bank-review-statuses");

  const selector = useSelector((state) => state.user);
  const getListData = selector?.getSellerListData?.data?.data;
  const totalSellers = getListData?.total || 0;
  const sellerList = getListData?.list || [];

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getSellerList({
        page: params.page?.toString(),
        size: params.limit?.toString() || "10",
        keyWord: params.search || "",
        searchFields: "full_name,userName,email",
        select: "full_name userName email isDisable phone createdAt accountStatus profile sellerProfile onboarding",
        ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
        ...(params.kycStatus && { kycStatus: params.kycStatus }),
        ...(params.onboardingStatus && { onboardingStatus: params.onboardingStatus }),
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
    else if (formData.full_name.length < 3) errs.full_name = "At least 3 characters";
    if (!isEdit) {
      if (!formData.userName?.trim()) errs.userName = "Username is required";
      else if (formData.userName.length < 5) errs.userName = "At least 5 characters";
      else if (!/^[a-zA-Z0-9_]+$/.test(formData.userName)) errs.userName = "Letters, numbers and underscores only";
      if (!formData.phone?.trim()) errs.phone = "Phone is required";
      else if (!/^\d{10,15}$/.test(formData.phone.trim())) errs.phone = "10-15 digits";
      if (!formData.password) errs.password = "Password is required";
      else if (formData.password.length < 8) errs.password = "Min 8 characters";
      else if (!/[A-Z]/.test(formData.password)) errs.password = "Needs uppercase";
      else if (!/[a-z]/.test(formData.password)) errs.password = "Needs lowercase";
      else if (!/[0-9]/.test(formData.password)) errs.password = "Needs a number";
      else if (!/[^A-Za-z0-9]/.test(formData.password)) errs.password = "Needs special char";
      if (formData.password !== formData.confirmPassword) errs.confirmPassword = "Passwords do not match";
    }
    if (!formData.email?.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => { setModalMode(null); setFormData(EMPTY_FORM); setErrors({}); };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    setSaving(true);
    try {
      const res = await dispatch(createSeller({ ...formData })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Seller created");
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || err || "Error creating seller");
    } finally { setSaving(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setSaving(true);
    try {
      const res = await dispatch(updateSeller({ _id: formData._id, full_name: formData.full_name, email: formData.email, isDisable: formData.isDisable })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Seller updated");
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Error updating seller");
    } finally { setSaving(false); }
  };

  const handleDisableConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const res = await dispatch(enableDisableSeller({ _id: [toggleTarget._id], isDisable: !toggleTarget.isDisable })).unwrap();
      if (res.error) { toast.error(res.error); return; }
      toast.success(res.message || "Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Error updating status");
    }
  };

  const handleSubmitKycReview = async (e) => {
    e.preventDefault();
    if (kycForm.verificationStatus === "rejected" && !kycForm.rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      const res = await dispatch(reviewSellerKyc(kycForm)).unwrap();
      toast.success(res?.message || "KYC status updated");
      setIsKycReviewOpen(false);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Failed to update KYC");
    }
  };

  const handleSubmitBankReview = async (e) => {
    e.preventDefault();
    if (bankForm.bankVerificationStatus === "rejected" && !bankForm.bankRejectionReason.trim()) {
      toast.error("Bank rejection reason is required");
      return;
    }
    try {
      const res = await dispatch(updateSellerBankStatus(bankForm)).unwrap();
      toast.success(res?.message || "Bank status updated");
      setIsBankReviewOpen(false);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Failed to update bank status");
    }
  };

  const handleActivateSeller = async (user) => {
    try {
      const res = await dispatch(updateSellerGoLive({ sellerId: user._id, goLiveStatus: "live" })).unwrap();
      toast.success(res?.message || "Seller moved live");
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(
        err?.details?.onboardingStatus
          ? `Cannot activate. Onboarding: ${err.details.onboardingStatus}`
          : err?.message || "Failed to activate seller"
      );
    }
  };

  const rowActions = useCallback(
    (row) => [
      { label: "View", onClick: () => navigate(`/app/seller/view/${row._id}`) },
      {
        label: "Edit",
        onClick: () => {
          setFormData({ _id: row._id, full_name: row.full_name || "", userName: row.userName || "", email: row.email || "", phone: row.phone || "", password: "", confirmPassword: "", isDisable: row.isDisable || false });
          setModalMode("edit");
        },
      },
      {
        label: "KYC Approve",
        onClick: () => { setKycForm({ sellerId: row._id, verificationStatus: "verified", rejectionReason: "" }); setIsKycReviewOpen(true); },
      },
      {
        label: "KYC Reject",
        onClick: () => { setKycForm({ sellerId: row._id, verificationStatus: "rejected", rejectionReason: "" }); setIsKycReviewOpen(true); },
        danger: true,
      },
      {
        label: "Bank Verify",
        onClick: () => { setBankForm({ sellerId: row._id, bankVerificationStatus: "verified", bankRejectionReason: "" }); setIsBankReviewOpen(true); },
      },
      {
        label: "Bank Reject",
        onClick: () => { setBankForm({ sellerId: row._id, bankVerificationStatus: "rejected", bankRejectionReason: "" }); setIsBankReviewOpen(true); },
        danger: true,
      },
      {
        label: "Go Live",
        onClick: () => handleActivateSeller(row),
      },
      {
        label: row.isDisable ? "Enable" : "Disable",
        onClick: () => { setToggleTarget(row); setConfirmOpen(true); },
        danger: !row.isDisable,
      },
    ],
    [navigate]
  );

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Sellers"
        subtitle="Manage seller accounts and onboarding"
        breadcrumbs={[{ label: "User Management" }, { label: "Sellers" }]}
        actions={
          <PermissionGuard module="sellers" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setModalMode("add")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add Seller
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={sellerList}
        loading={selector.loading}
        totalCount={totalSellers}
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
        emptyText="No sellers found."
        emptyIcon={<MdStore size={40} className="text-gray-200" />}
        requiredModule="sellers"
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
              {modalMode === "add" ? "Add Seller" : "Edit Seller"}
            </h2>
            <form onSubmit={modalMode === "add" ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Full Name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} error={errors.full_name} maxLength={50} required />
                <FormInput label="Username" name="userName" type="text" value={formData.userName} onChange={handleInputChange} error={errors.userName} maxLength={30} required disabled={modalMode === "edit"} />
              </div>
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} error={errors.email} maxLength={100} required />
              {modalMode === "add" && (
                <>
                  <FormInput label="Phone" name="phone" type="text" value={formData.phone} onChange={handleInputChange} error={errors.phone} maxLength={15} required />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Password" name="password" type="password" value={formData.password} onChange={handleInputChange} error={errors.password} maxLength={50} required />
                    <FormInput label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} maxLength={50} required />
                  </div>
                </>
              )}
              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Account Active</span>
                <ToggleButton isToggle={!formData.isDisable} handleClick={() => setFormData((p) => ({ ...p, isDisable: !p.isDisable }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : modalMode === "add" ? "Create Seller" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC Review Modal */}
      {isKycReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-4 flex items-center gap-2">
              <MdVerified size={20} /> KYC Review
            </h2>
            <form onSubmit={handleSubmitKycReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                <select value={kycForm.verificationStatus} onChange={(e) => setKycForm((f) => ({ ...f, verificationStatus: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="verified">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>
              {kycForm.verificationStatus === "rejected" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                  <textarea value={kycForm.rejectionReason} onChange={(e) => setKycForm((f) => ({ ...f, rejectionReason: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Explain why KYC is rejected" />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsKycReviewOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] transition-colors">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Review Modal */}
      {isBankReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-4 flex items-center gap-2">
              <MdAccountBalance size={20} /> Bank Verification
            </h2>
            <form onSubmit={handleSubmitBankReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                <select value={bankForm.bankVerificationStatus} onChange={(e) => setBankForm((f) => ({ ...f, bankVerificationStatus: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="verified">Verify</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              {bankForm.bankVerificationStatus === "rejected" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                  <textarea value={bankForm.bankRejectionReason} onChange={(e) => setBankForm((f) => ({ ...f, bankRejectionReason: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Explain why bank verification failed" />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsBankReviewOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] transition-colors">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToggleTarget(null); }}
        onConfirm={handleDisableConfirm}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Seller`}
        message={`Are you sure you want to ${toggleTarget?.isDisable ? "enable" : "disable"} ${toggleTarget?.full_name || "this seller"}?`}
        variant={toggleTarget?.isDisable ? "default" : "danger"}
        confirmText={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />
    </div>
  );
};

export default Sellers;
