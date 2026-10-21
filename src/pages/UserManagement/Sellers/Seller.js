/* eslint-disable react-hooks/exhaustive-deps */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { MdStorefront, MdVisibility } from "react-icons/md";

import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";

import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";

import {
  enableDisableSeller,
  getSellerList,
} from "../../../Redux/userManagementSlice";

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Account",
    width: "w-40",
    options: [
      { value: "active", label: "Active" },
      { value: "pending_approval", label: "Pending approval" },
      { value: "suspended", label: "Suspended" },
    ],
  },
  {
    key: "onboardingStatus",
    type: "select",
    label: "Onboarding",
    width: "w-44",
    options: [
      { value: "initiated", label: "Initiated" },
      { value: "in_progress", label: "In progress" },
      { value: "under_review", label: "Under review" },
      { value: "ready_for_go_live", label: "Ready for go live" },
      { value: "rejected", label: "Rejected" },
    ],
  },
  {
    key: "kycStatus",
    type: "select",
    label: "KYC",
    width: "w-40",
    options: [
      { value: "not_submitted", label: "Not submitted" },
      { value: "submitted", label: "Submitted" },
      { value: "under_review", label: "Under review" },
      { value: "verified", label: "Verified" },
      { value: "rejected", label: "Rejected" },
    ],
  },
  {
    key: "bankVerificationStatus",
    type: "select",
    label: "Bank",
    width: "w-40",
    options: [
      { value: "not_submitted", label: "Not submitted" },
      { value: "submitted", label: "Submitted" },
      { value: "verified", label: "Verified" },
      { value: "rejected", label: "Rejected" },
    ],
  },
  {
    key: "goLiveStatus",
    type: "select",
    label: "Go live",
    width: "w-40",
    options: [
      { value: "not_created", label: "Not created" },
      { value: "pending", label: "Pending" },
      { value: "approval_pending", label: "Approval pending" },
      { value: "ready", label: "Ready" },
      { value: "partially_live", label: "Partially live" },
      { value: "live", label: "Live" },
      { value: "blocked", label: "Blocked" },
      { value: "rejected", label: "Rejected" },
    ],
  },
];

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

const getSellerInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const SellerAvatar = ({ name, src }) => {
  const [imageFailed, setImageFailed] = useState(false);

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setImageFailed(true)}
        className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-gray-50 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-[var(--admin-surface-soft)] text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-navy)]"
    >
      {getSellerInitials(name)}
    </span>
  );
};

const Sellers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [statusTarget, setStatusTarget] = useState(null);

  const selector = useSelector((state) => state.user);

  const getListData = selector?.getSellerListData?.data?.data;
  const sellerList = getListData?.list || [];
  const totalSellers = getListData?.total || 0;

  // Fetch sellers
  const load = useCallback(async () => {
    try {
      console.log("Seller filters sent to API:", {
        page: pageNo.toString(),
        size: pageSize.toString(),
        keyWord: search,
        ...filters,
      });
      const response = await dispatch(
        getSellerList({
          page: pageNo.toString(),
          size: pageSize.toString(),
          keyWord: search,
          ...filters,
        }),
      ).unwrap();
      console.log("Seller API response:", response);
    } catch (err) {
      toast.error(err?.message || "Failed to fetch sellers");
    }
  }, [dispatch, pageNo, pageSize, search, filters]);

  const setFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPageNo(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPageNo(1);
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  // Load data when page, page size, or search changes
  useEffect(() => {
    load();
  }, [load]);

  // Enable / Disable seller
  const handleStatusConfirm = useCallback(async () => {
    if (!statusTarget) return;

    try {
      const res = await dispatch(
        enableDisableSeller({
          _id: [statusTarget._id],
          isDisable: !statusTarget.isDisable,
        }),
      ).unwrap();

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message || "Status updated successfully");
      setStatusTarget(null);

      await load();
    } catch (err) {
      toast.error(err?.message || "Error updating seller status");
    }
  }, [statusTarget, dispatch, load]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: "full_name",
        label: "Name",
        render: (v, row) => {
          const sellerName =
            `${row?.profile?.firstName || ""} ${
              row?.profile?.lastName || ""
            }`.trim() ||
            v ||
            "N/A";
          const avatarUrl = row?.profile?.avatarUrl;

          return (
            <button
              type="button"
              onClick={() => {
                const sellerId = row?._id || row?.id;

                if (sellerId) {
                  navigate(`/app/seller/view/${sellerId}`);
                }
              }}
              className="group flex items-center gap-2 text-left"
              aria-label={`View ${sellerName} details`}
            >
              <SellerAvatar
                key={`${avatarUrl || "initials"}-${sellerName}`}
                name={sellerName}
                src={avatarUrl}
              />

              <div className="min-w-0">
                <p className="truncate font-medium capitalize text-gray-800">
                  {sellerName}
                </p>

                <p className="truncate text-xs text-gray-400">
                  {row?.userName || ""}
                </p>
              </div>
            </button>
          );
        },
      },
      {
        key: "email",
        label: "Email",
        render: (v) => (
          <span className="text-sm text-gray-600">{v || "—"}</span>
        ),
      },
      {
        key: "phone",
        label: "Phone",
        render: (v) => (
          <span className="text-sm text-gray-600">{v || "—"}</span>
        ),
      },
      {
        key: "_business",
        label: "Business",
        render: (_, row) => (
          <div className="text-sm text-gray-700">
            <p className="max-w-[140px] truncate font-medium">
              {row?.sellerProfile?.businessName ||
                row?.sellerProfile?.legalBusinessName ||
                "—"}
            </p>

            {row?.sellerProfile?.gstNumber && (
              <p className="text-xs text-gray-400">
                GST: {row.sellerProfile.gstNumber}
              </p>
            )}

            {row?.sellerProfile?.panNumber && (
              <p className="text-xs text-gray-400">
                PAN: {row.sellerProfile.panNumber}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "_onboarding",
        label: "Onboarding",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (_, row) => (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const sellerId = row?._id || row?.id;

                if (sellerId) {
                  navigate(`/app/seller/view/${sellerId}`);
                }
              }}
              className="inline-flex rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none"
              title="View seller onboarding details"
            >
              <StatusBadge
                status={
                  row?.onboarding?.status ||
                  row?.sellerProfile?.onboardingStatus ||
                  "pending"
                }
                // size="sm"
                dot
                className="min-w-[108px] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </button>
          </div>
        ),
      },
      {
        key: "_kyc",
        label: "KYC",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (_, row) => (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const sellerId = row?._id || row?.id;

                if (sellerId) {
                  navigate(`/app/seller/view/${sellerId}`);
                }
              }}
              className="inline-flex rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none"
              title="View seller KYC details"
            >
              <StatusBadge
                status={
                  row?.onboarding?.kycStatus ||
                  row?.sellerProfile?.kycStatus ||
                  "pending"
                }
                // size="sm"
                dot
                className="min-w-[108px] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </button>
          </div>
        ),
      },
      {
        key: "_bank",
        label: "Bank",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (_, row) => (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const sellerId = row?._id || row?.id;

                if (sellerId) {
                  navigate(`/app/seller/view/${sellerId}`);
                }
              }}
              className="inline-flex rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none"
              title="View seller bank details"
            >
              <StatusBadge
                status={
                  row?.onboarding?.bankVerificationStatus ||
                  row?.sellerProfile?.bankVerificationStatus ||
                  "pending"
                }
                // size="sm"
                dot
                className="min-w-[108px] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </button>
          </div>
        ),
      },
      {
        key: "_golive",
        label: "Go Live",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (_, row) => (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const sellerId = row?._id || row?.id;

                if (sellerId) {
                  navigate(`/app/seller/view/${sellerId}`);
                }
              }}
              className="inline-flex rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none"
              title="View seller go-live details"
            >
              <StatusBadge
                status={getGoLiveStatus(row)}
                label={getGoLiveLabel(row)}
                // size="sm"
                dot
                className="min-w-[108px] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </button>
          </div>
        ),
      },
      {
        key: "isDisable",
        label: "Status",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (v, row) => (
          <PermissionGuard module="sellers" action={ACTIONS.STATUS_CHANGE} hide>
            <div className="flex justify-center">
              <ToggleButton
                isToggle={!v}
                handleClick={() => setStatusTarget(row)}
                size="sm"
              />
            </div>
          </PermissionGuard>
        ),
      },
    ],
    [navigate],
  );

  // Row actions
  const rowActions = useCallback(
    (row) => [
      {
        label: "View Seller",
        icon: (
          <MdVisibility
            aria-hidden="true"
            size={16}
            className="text-blue-600"
          />
        ),
        requiredModule: "sellers",
        requiredAction: ACTIONS.VIEW,
        onClick: () => navigate(`/app/seller/view/${row._id}`),
      },
    ],
    [navigate],
  );

  return (
    <div>
      <PageHeader
        title="Sellers"
        subtitle="Manage seller accounts and onboarding"
        breadcrumbs={[{ label: "User Control & Access" }, { label: "Sellers" }]}
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
        onSearch={(val) => {
          setSearch(val);
          setPageNo(1);
        }}
        onRefresh={load}
        rowActions={rowActions}
        searchPlaceholder="Search name, username or email…"
        emptyText="No sellers found."
        emptyIcon={
          <MdStorefront
            aria-hidden="true"
            size={40}
            className="text-gray-200"
          />
        }
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={filters}
            onChange={setFilter}
            onClear={clearFilters}
            loading={selector.loading}
            activeCount={activeFilterCount}
          />
        }
        requiredModule="sellers"
      />

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
        title={`${statusTarget?.isDisable ? "Enable" : "Disable"} Seller`}
        message={`${
          statusTarget?.isDisable ? "Enable" : "Disable"
        } "${statusTarget?.full_name || "this seller"}"?`}
        variant={statusTarget?.isDisable ? "success" : "warning"}
        confirmLabel={statusTarget?.isDisable ? "Enable" : "Disable"}
      />
    </div>
  );
};

export default Sellers;
