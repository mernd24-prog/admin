/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import TableData from "../../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import { useDispatch, useSelector } from "react-redux";
import StatusPopup from "../../../components/Atoms/PopupData/StatusPopup";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import {
  createSeller,
  enableDisableSeller,
  getSellerList,
  reviewSellerKyc,
  updateSeller,
  updateSellerBankStatus,
  updateSellerGoLive,
} from "../../../Redux/userManagementSlice";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { toast } from "sonner";
import Pagination from "../../../components/Pagination/Pagination";
import Loader from "../../../components/Loader/Loader";
import AddButton from "../../../components/Button/AddButton";
import DefaultMiddleModal from "../../../components/Atoms/Modal/DefaultMiddleModal ";
import { useNavigate } from "react-router";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

const SellerActionButton = ({ children, color, onClick }) => {
  const colorClasses = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <button
      className={`rounded px-2 py-1 text-xs ${colorClasses[color] || colorClasses.blue}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const Sellers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [toggleStates, setToggleStates] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    full_name: "",
    userName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    isDisable: false,
  });
  const [errors, setErrors] = useState({});
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isKycReviewOpen, setIsKycReviewOpen] = useState(false);
  const [isBankReviewOpen, setIsBankReviewOpen] = useState(false);
  const [kycForm, setKycForm] = useState({
    sellerId: "",
    verificationStatus: "verified",
    rejectionReason: "",
  });
  const [bankForm, setBankForm] = useState({
    sellerId: "",
    bankVerificationStatus: "verified",
    bankRejectionReason: "",
  });
  const size = 10;
  const kycOptions = useDropdownOptions("kyc-review-statuses");
  const bankOptions = useDropdownOptions("bank-review-statuses");

  // Fetch seller list on component mount and when dependencies change
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const reqData = {
          page: pageNo.toString(),
          size: size.toString(),
          keyWord: filters.search,
          searchFields: "full_name,userName,email",
          select: "full_name userName email isDisable",
        };
        await dispatch(getSellerList(reqData)).unwrap();
      } catch (error) {
        toast.error(error.message || "Failed to fetch sellers");
      }
    };

    fetchSellers();
  }, [size, pageNo, dispatch, isRefresh]);

  const selector = useSelector((state) => state.user);
  const getListData = selector?.getSellerListData?.data?.data;
  const totalUsers = getListData?.total || 0;
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };
  const validateForm = (isEdit = false) => {
    const newErrors = {};
    let isValid = true;
    if (!formData?.full_name?.trim()) {
      newErrors.full_name = "Full name is required";
      isValid = false;
    } else if (formData?.full_name.length < 3) {
      newErrors.full_name = "Full name must be at least 3 characters";
      isValid = false;
    } else if (formData?.full_name.length > 50) {
      newErrors.full_name = "Full name must be less than 50 characters";
      isValid = false;
    }
    if (!isEdit) {
      if (!formData?.userName?.trim()) {
        newErrors.userName = "Username is required";
        isValid = false;
      } else if (formData?.userName.length < 5) {
        newErrors.userName = "Username must be at least 5 characters";
        isValid = false;
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.userName)) {
        newErrors.userName =
          "Username can only contain letters, numbers and underscores";
        isValid = false;
      }
    }
    if (!formData?.email?.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.com$/.test(formData.email)) {
      newErrors.email = "Please enter a valid .com email address";
      isValid = false;
    }
    if (!isEdit) {
      if (!formData?.phone?.trim()) {
        newErrors.phone = "Phone number is required";
        isValid = false;
      } else if (!/^\d{10,15}$/.test(formData.phone.trim())) {
        newErrors.phone = "Phone number must be 10 to 15 digits";
        isValid = false;
      }
      if (!formData?.password?.trim()) {
        newErrors.password = "Password is required";
        isValid = false;
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
        isValid = false;
      } else if (formData.password.length > 15) {
        newErrors.password = "Password should be maximum 15 characters long";
        isValid = false;
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password =
          "Password must contain at least one uppercase letter";
        isValid = false;
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password =
          "Password must contain at least one lowercase letter";
        isValid = false;
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one number";
        isValid = false;
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        newErrors.password =
          "Password must contain at least one special character";
        isValid = false;
      }
      if (!formData?.confirmPassword?.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };
  const handleClose = () => {
    setIsOpenAddModal(false);
    setForm({
      full_name: "",
      userName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      isDisable: false,
    });
    setErrors({});
  };

  const handleEditClose = () => {
    setIsEditModal(false);
    setForm({
      full_name: "",
      userName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      isDisable: false,
    });
    setErrors({});
  };
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const reqData = {
        full_name: formData.full_name.trim(),
        userName: formData.userName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        isDisable: formData.isDisable,
      };

      const res = await dispatch(createSeller(reqData)).unwrap();

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Seller created successfully");
        handleClose();
        setIsRefresh(!isRefresh);
      }
    } catch (error) {
      console.error("Error creating seller:", error);
      toast.error(error || "Error in creating seller");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };
  const handleEditUserSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(true)) return;

    try {
      const reqData = {
        _id: formData._id,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        isDisable: formData.isDisable,
      };

      const res = await dispatch(updateSeller(reqData)).unwrap();

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Seller updated successfully");
        setIsEditModal(false);
        setIsRefresh(!isRefresh);
      }
    } catch (error) {
      console.error("Error updating seller:", error);
      toast.error(error.message || "Error in updating seller");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };
  const handleToggleAdd = () => {
    setForm((prev) => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  const handleToggle = (user) => {
    setToggleStates(user);
    setIsConfirmModalOpen(true);
  };

  const handleDisableFunc = async () => {
    if (!toggleStates) return;

    try {
      const obj = {
        _id: [toggleStates._id],
        isDisable: !toggleStates.isDisable,
      };

      const res = await dispatch(enableDisableSeller(obj)).unwrap();

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Status updated successfully");
        setIsConfirmModalOpen(false);
        setToggleStates(null);
        setIsRefresh(!isRefresh);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Error in updating status");
    }
  };
  const handleBulkAction = async (action) => {
    if (!selectedRow.length) {
      toast.warning("Please select at least one seller");
      return;
    }

    if (action === "Active" || action === "Inactive") {
      try {
        const apiPayload = {
          _id: selectedRow,
          isDisable: action === "Inactive",
        };

        const res = await dispatch(enableDisableSeller(apiPayload)).unwrap();

        if (res) {
          toast.success(res.message || "Bulk action completed successfully");
          setIsRefresh(!isRefresh);
          setSelectedRow([]);
        }
      } catch (error) {
        console.error("Bulk action error:", error);
        toast.error(error.message || "Failed to perform bulk action");

        if (error.errors) {
          setErrors(error.errors);
        }
      }
    }
  };
  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData?.list?.map((user) => user._id) || [];
      setSelectedRow(allIds);
    } else {
      setSelectedRow([]);
    }
  };
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const handleApplySearchFilters = () => {
    setPageNo(1);
    setIsRefresh(!isRefresh);
  };

  const handleSearchRemove = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
    setKeyword("");
    setPageNo(1);
    setIsRefresh(!isRefresh);
  }, [isRefresh]);
  const handleOpenKycReview = (user, nextStatus) => {
    setKycForm({
      sellerId: user._id,
      verificationStatus: nextStatus,
      rejectionReason: "",
    });
    setIsKycReviewOpen(true);
  };

  const handleSubmitKycReview = async (e) => {
    e.preventDefault();
    if (
      kycForm.verificationStatus === "rejected" &&
      !kycForm.rejectionReason.trim()
    ) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      const res = await dispatch(reviewSellerKyc(kycForm)).unwrap();
      toast.success(res?.message || "KYC status updated");
      setIsKycReviewOpen(false);
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(error?.message || error || "Failed to update KYC");
    }
  };

  const handleOpenBankReview = (user, nextStatus) => {
    setBankForm({
      sellerId: user._id,
      bankVerificationStatus: nextStatus,
      bankRejectionReason: "",
    });
    setIsBankReviewOpen(true);
  };

  const handleSubmitBankReview = async (e) => {
    e.preventDefault();
    if (
      bankForm.bankVerificationStatus === "rejected" &&
      !bankForm.bankRejectionReason.trim()
    ) {
      toast.error("Bank rejection reason is required");
      return;
    }
    try {
      const res = await dispatch(updateSellerBankStatus(bankForm)).unwrap();
      toast.success(res?.message || "Bank status updated");
      setIsBankReviewOpen(false);
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(error?.message || error || "Failed to update bank status");
    }
  };

  const handleActivateSeller = async (user) => {
    try {
      const res = await dispatch(
        updateSellerGoLive({
          sellerId: user._id,
          goLiveStatus: "live",
        }),
      ).unwrap();
      toast.success(res?.message || "Seller moved live");
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(
        error?.details?.onboardingStatus
          ? `Cannot activate yet. Onboarding: ${error.details.onboardingStatus}`
          : error?.message || error || "Failed to activate seller",
      );
    }
  };

  const statusPill = (value, good = "active") => {
    const normalized = String(value || "").toLowerCase();
    const isGood = normalized === good;
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${isGood ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
      >
        {value || "N/A"}
      </span>
    );
  };

  const getGoLiveStatus = (user = {}) => {
    if (
      user?.accountStatus === "active" ||
      user?.sellerProfile?.goLiveStatus === "live"
    ) {
      return "live";
    }
    return (
      user?.onboarding?.goLiveStatus ||
      user?.sellerProfile?.goLiveStatus ||
      "pending"
    );
  };

  // Table data preparation
  const tableRows = getListData?.list?.map((user) => [
    <input
      type="checkbox"
      className="w-4 h-4 border border-[#4a4a4f] rounded bg-transparent peer-checked:bg-[#0055ff] peer-checked:border-[#0055ff] transition-all duration-300"
      checked={selectedRow.includes(user._id)}
      onChange={(e) => handleRowCheckboxChange(e, user._id)}
      key={`checkbox-${user._id}`}
    />,

    <div key={`name-${user._id}`} className="flex items-center gap-2">
      <img
        src={user?.profile?.avatarUrl || "/Img/noData.png"}
        alt=""
        className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50 object-cover"
      />
      <span className="capitalize">
        {user?.full_name ||
          user?.sellerProfile?.displayName ||
          user?.profile?.firstName ||
          "N/A"}
      </span>
    </div>,
    <span key={`business-${user._id}`}>
      {user?.sellerProfile?.businessName ||
        user?.sellerProfile?.legalBusinessName ||
        "N/A"}
    </span>,
    <span key={`email-${user._id}`}>{user?.email}</span>,
    <span key={`phone-${user._id}`}>{user?.phone || "N/A"}</span>,
    <span key={`gst-${user._id}`}>
      {user?.sellerProfile?.gstNumber || "N/A"}
    </span>,
    <span key={`pan-${user._id}`}>
      {user?.sellerProfile?.panNumber || "N/A"}
    </span>,
    <span key={`onboarding-${user._id}`}>
      {statusPill(
        user?.onboarding?.status || user?.sellerProfile?.onboardingStatus,
        "ready_for_go_live",
      )}
    </span>,
    <span key={`kyc-${user._id}`}>
      {statusPill(
        user?.onboarding?.kycStatus ||
          user?.sellerProfile?.kycStatus ||
          "pending",
        "verified",
      )}
    </span>,
    <span key={`bank-${user._id}`}>
      {statusPill(
        user?.onboarding?.bankVerificationStatus ||
          user?.sellerProfile?.bankVerificationStatus ||
          "not_submitted",
        "verified",
      )}
    </span>,
    <span key={`go-live-${user._id}`}>
      {statusPill(getGoLiveStatus(user), "live")}
    </span>,

    <ToggleButton
      key={`toggle-${user._id}`}
      isToggle={!user.isDisable}
      handleClick={() => handleToggle(user)}
    />,
    <span key={`actions-${user._id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <ActionButtons
          onEdit={() => {
            setForm({
              _id: user._id,
              full_name: user.full_name,
              userName: user.userName,
              email: user.email,
              isDisable: user.isDisable,
            });
            setIsEditModal(true);
          }}
          showDeleteButton={false}
          showLinkButton={false}
          showPasswordButton={false}
          showEditButton={true}
          viewButton={true}
          onViewClick={() => navigate(`/app/seller/view/${user._id}`)}
        />
        <SellerActionButton
          color="green"
          onClick={() => handleOpenKycReview(user, "verified")}
        >
          KYC Approve
        </SellerActionButton>
        <SellerActionButton
          color="red"
          onClick={() => handleOpenKycReview(user, "rejected")}
        >
          KYC Reject
        </SellerActionButton>
        <SellerActionButton
          color="emerald"
          onClick={() => handleOpenBankReview(user, "verified")}
        >
          Bank Verify
        </SellerActionButton>
        <SellerActionButton
          color="orange"
          onClick={() => handleOpenBankReview(user, "rejected")}
        >
          Bank Reject
        </SellerActionButton>
        <SellerActionButton
          color="blue"
          onClick={() => handleActivateSeller(user)}
        >
          Go Live
        </SellerActionButton>
      </div>
    </span>,
  ]);
  return (
    <>
      <Loader loading={selector.loading} />
      <div className="max-w-7xl mx-auto">
        <div className="overflow-hidden overflow-y-auto py-6">
          <div className="flex justify-between items-center">
            <h3>
              Home / <b>Sellers</b>
            </h3>
            <AddButton
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => setIsOpenAddModal(true)}
            >
              Add Seller
            </AddButton>
          </div>
          <div className="overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]">
            <div className="max-w-auto mx-auto space-y-6">
              <div className="bg-white p-2">
                <div className="border-b mb-4">
                  <SearchComponent
                    isSearchShow={true}
                    filters={filters}
                    setFilters={setFilters}
                    isActionButton={true}
                    selectedRow={selectedRow}
                    setSelectedRow={setSelectedRow}
                    handleAction={handleBulkAction}
                    isStatusAction={true}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Search By Full Name, Username or Email"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>
            <TableData
              Heading="Sellers"
              tableHeadings={[
                <input
                  type="checkbox"
                  className="w-4 h-4  border border-[#4a4a4f] rounded bg-transparent peer-checked:bg-[#0055ff] peer-checked:border-[#0055ff] transition-all duration-300"
                  checked={
                    selectedRow.length > 0 &&
                    selectedRow.length === (getListData?.list?.length || 0)
                  }
                  onChange={handleSelectAllChange}
                  ref={(el) => {
                    if (el) {
                      if (
                        selectedRow.length > 0 &&
                        selectedRow.length < (getListData?.list?.length || 0)
                      ) {
                        el.indeterminate = false; // show minus
                      } else {
                        el.indeterminate = false; // no minus
                      }
                    }
                  }}
                  key="select-all"
                />,
                "Full Name",
                "Business",
                "Email",
                "Phone",
                "GST",
                "PAN",
                "Onboarding",
                "KYC",
                "Bank",
                "Go Live",
                "Status",
                "Actions",
              ]}
              data={tableRows}
              showSearch={true}
              placeholder="Search by..."
              showFilter={false}
              showSummary={false}
              totalData={totalUsers}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={onPageChange}
              searchTerm={keyword}
              setSearchTerm={setKeyword}
            />
          </div>
          <div className="flex justify-center my-6">
            {getListData?.total &&
              size &&
              Math.ceil(getListData.total / size) > 1 && (
                <Pagination
                  totalPages={Math.ceil(getListData.total / size)}
                  currentPage={pageNo}
                  onPageChange={onPageChange}
                />
              )}
          </div>
        </div>
        {/* Add Seller Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={handleClose}
          onSubmit={handleAddUserSubmit}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Reset"
          title="Add New Seller"
          titleClassName="mt-5 font-medium"
        >
          <div className="p-4 flex space-x-4">
            <div className="w-1/2">
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
            </div>
            <div className="w-1/2">
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
          </div>
          <div className="p-4">
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
          </div>
          <div className="p-4">
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
          </div>
          <div className="p-4 flex space-x-4">
            <div className="w-1/2">
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                maxLength={15}
                required
                helperText="Password must be 8-15 characters with uppercase, lowercase, number and special character"
              />
            </div>
            <div className="w-1/2">
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
          </div>
          <div className="flex justify-between items-center border p-3">
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAdd}
            />
          </div>
        </DefaultModal>

        <DefaultMiddleModal
          isOpen={isKycReviewOpen}
          onClose={() => setIsKycReviewOpen(false)}
          title="Review Seller KYC"
        >
          <form onSubmit={handleSubmitKycReview} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Decision
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={kycForm.verificationStatus}
                onChange={(e) =>
                  setKycForm((prev) => ({
                    ...prev,
                    verificationStatus: e.target.value,
                  }))
                }
              >
                {kycOptions.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {kycForm.verificationStatus === "rejected" && (
              <FormInput
                label="Rejection reason"
                name="rejectionReason"
                value={kycForm.rejectionReason}
                onChange={(e) =>
                  setKycForm((prev) => ({
                    ...prev,
                    rejectionReason: e.target.value,
                  }))
                }
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded border"
                onClick={() => setIsKycReviewOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#3E4094] text-white"
              >
                Update KYC
              </button>
            </div>
          </form>
        </DefaultMiddleModal>

        <DefaultMiddleModal
          isOpen={isBankReviewOpen}
          onClose={() => setIsBankReviewOpen(false)}
          title="Review Seller Bank"
        >
          <form onSubmit={handleSubmitBankReview} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Decision
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={bankForm.bankVerificationStatus}
                onChange={(e) =>
                  setBankForm((prev) => ({
                    ...prev,
                    bankVerificationStatus: e.target.value,
                  }))
                }
              >
                {bankOptions.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {bankForm.bankVerificationStatus === "rejected" && (
              <FormInput
                label="Rejection reason"
                name="bankRejectionReason"
                value={bankForm.bankRejectionReason}
                onChange={(e) =>
                  setBankForm((prev) => ({
                    ...prev,
                    bankRejectionReason: e.target.value,
                  }))
                }
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded border"
                onClick={() => setIsBankReviewOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#3E4094] text-white"
              >
                Update Bank
              </button>
            </div>
          </form>
        </DefaultMiddleModal>

        {/* Edit Seller Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={handleEditClose}
          onSubmit={handleEditUserSubmit}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Seller"
          titleClassName="mt-5 font-medium"
        >
          <div className="p-4 flex space-x-4">
            <div className="w-1/2">
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
            </div>
            <div className="w-1/2">
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
          </div>
          <div className="p-4">
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
          </div>
          <div className="flex justify-between items-center border p-3">
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleAdd}
            />
          </div>
        </DefaultModal>

        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${toggleStates?.isDisable ? "enable" : "disable"} this seller?`}
        />
      </div>
    </>
  );
};

export default Sellers;
