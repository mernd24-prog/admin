import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import {
  MdBlock,
  MdCheckCircle,
  MdClose,
  MdPause,
  MdPlayArrow,
  MdRefresh,
  MdReplay,
  MdSync,
} from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
  SellerIdentity,
} from "../../../components/Shared";
import {
  getPayoutOperationsQueue,
  approveSellerPayout,
  holdSellerPayout,
  releaseSellerPayoutHold,
  retrySellerPayout,
  completeSellerPayout,
  failSellerPayout,
  cancelSellerPayout,
  syncRazorpayXPayout,
} from "../../../Redux/sellerCommissionsSlice";
import { usePermission, ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import {
  formatDateTime12Hour,
  formatIndianNumber,
  formatLabel,
} from "../../../utils/formatters";
import { apiRequest } from "../../../_helpers/apiConfig";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import {
  payoutCancellationValidationSchema,
  payoutReleaseValidationSchema,
  payoutRetryValidationSchema,
} from "../../../_helpers/validationSchemas";

const PAYOUT_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "failed",
  "cancelled",
];

const PAYMENT_METHODS = [
  { value: "razorpayx", label: "RazorpayX bank payout" },
  { value: "seller_wallet", label: "Seller Wallet" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "imps", label: "IMPS" },
  { value: "cheque", label: "Cheque" },
  { value: "manual", label: "Manual" },
];

const availablePaymentMethods = (razorpayXEnabled) =>
  PAYMENT_METHODS.filter(
    (method) => method.value !== "razorpayx" || razorpayXEnabled,
  );

const ACTION_TITLES = {
  approve: "Approve Payout",
  hold: "Hold Payout",
  release: "Release Payout Hold",
  retry: "Retry Payout",
  complete: "Complete Payout",
  fail: "Fail Payout",
  cancel: "Cancel Payout",
};

const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller Store name",
    width: "w-52",
    load: (search) =>
      dropdownApi.getStoreName({
        keyWord: search,
        searchFields: "organizationName,businessName,legalBusinessName",
      }),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: PAYOUT_STATUSES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const EMPTY_ACTION = {
  open: false,
  type: "",
  title: "",
  payout: null,
  note: "",
  reason: "",
  paymentMethod: "",
  paymentReference: "",
  approve: true,
  notes: "",
};

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  if (data && typeof data === "object") {
    const list = [
      ...(data.pendingApproval || []).map((row) => ({
        ...row,
        status: row.status || "pending",
      })),
      ...(data.processing || []).map((row) => ({
        ...row,
        status: row.status || "processing",
      })),
      ...(data.onHold || []).map((row) => ({
        ...row,
        status: row.status || "on_hold",
      })),
      ...(data.failed || []).map((row) => ({
        ...row,
        status: row.status || "failed",
      })),
    ];
    if (list.length || data.counts) {
      return {
        list,
        total:
          Number(
            (data.counts?.pendingApproval || 0) +
              (data.counts?.processing || 0) +
              (data.counts?.onHold || 0) +
              (data.counts?.failed || 0),
          ) || list.length,
      };
    }
  }
  return {
    list: data?.items || data?.list || data || [],
    total: Number(
      data?.total || data?.items?.length || data?.list?.length || 0,
    ),
  };
};

const display = (value = "") => String(value || "N/A").replace(/_/g, " ");
const valueOf = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "")
      return row[key];
  }
  return 0;
};

const payoutId = (row) => row?._id || row?.id || row?.payoutId;
const metadataOf = (row = {}) => {
  const metadata = row.metadata || row.meta || {};
  if (!metadata || typeof metadata !== "string") return metadata || {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};
const razorpayXOf = (row = {}) => metadataOf(row).razorpayX || {};
const replacementPayoutIdOf = (row = {}) =>
  metadataOf(row).replacementPayoutId || null;
const razorpayXStatusOf = (row = {}) =>
  String(
    razorpayXOf(row).status || metadataOf(row).providerStatus || "",
  ).toLowerCase();
const isSafeRazorpayXRetry = (row = {}) =>
  ["reversed", "rejected", "cancelled"].includes(razorpayXStatusOf(row));
const hasRazorpayXProviderPayout = (row = {}) =>
  Boolean(
    razorpayXOf(row).payoutId ||
    valueOf(row, "paymentReference", "payment_reference"),
  );
const payoutMethodText = (row = {}) => {
  const method = valueOf(row, "paymentMethod", "payment_method");
  return method === "razorpayx"
    ? "RazorpayX bank payout"
    : method
      ? display(method)
      : "—";
};
const payoutDurationText = (row = {}) => {
  if (replacementPayoutIdOf(row))
    return `Replaced by payout ${replacementPayoutIdOf(row)}`;
  const rx = razorpayXOf(row);
  if (rx.status === "processed" || row.status === "completed")
    return "Completed by provider";
  if (rx.status === "queued") return "Queued by RazorpayX";
  if (rx.status === "failed" || row.status === "failed")
    return "Failed — retry needed";
  if (rx.payoutId || row.payment_method === "razorpayx")
    return "Usually minutes via IMPS";
  return "";
};
const payoutFailureReason = (row = {}) => {
  const metadata = metadataOf(row);
  const rx = metadata.razorpayX || {};
  const reason =
    metadata.failedReason ||
    metadata.cancellationReason ||
    rx.rawWebhook?.failure_reason ||
    rx.rawWebhook?.status_details?.description ||
    rx.rawWebhook?.error?.description ||
    rx.raw?.failure_reason ||
    rx.raw?.status_details?.description ||
    rx.raw?.error?.description ||
    "";
  const providerReason =
    rx.rawWebhook?.status_details?.reason ||
    rx.rawWebhook?.error?.reason ||
    rx.raw?.status_details?.reason ||
    rx.raw?.error?.reason ||
    "";
  const providerSource =
    rx.rawWebhook?.status_details?.source ||
    rx.rawWebhook?.error?.source ||
    rx.raw?.status_details?.source ||
    rx.raw?.error?.source ||
    "";
  const providerDetail = [providerReason, providerSource]
    .filter(Boolean)
    .join(" / ");
  return [reason, providerDetail ? `RazorpayX: ${providerDetail}` : ""]
    .filter(Boolean)
    .join(" · ");
};

const PayoutOpsQueue = () => {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const canUpdate = can("sellers/commissions", ACTIONS.UPDATE);
  const selector = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(selector.payoutOperationsQueueData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "asc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState(EMPTY_ACTION);
  const [confirmAction, setConfirmAction] = useState({ open: false });

  const actionFormik = useFormik({
    initialValues: {
      paymentReference: "",
      paymentMethod: "",
      reason: "",
      approve: true,
      note: "",
    },
    validationSchema: () =>
      action.type === "retry"
        ? payoutRetryValidationSchema
        : action.type === "release"
          ? payoutReleaseValidationSchema
          : payoutCancellationValidationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: (values) => {
      const validationMessage = validateAction({ ...action, ...values });
      if (validationMessage) {
        toast.error(validationMessage);
        return;
      }
      setConfirmAction({
        open: true,
        title: `${action.title || ACTION_TITLES[action.type] || "Update Payout"}?`,
        message: `This will move ${action.payout?.sellerName || action.payout?.seller?.displayName || "the seller"}'s payout to the next lifecycle state.`,
      });
    },
  });
  const [runtime, setRuntime] = useState({
    razorpayX: { enabled: false, mode: "disabled", missingKeys: [] },
  });
  const razorpayXEnabled = runtime?.razorpayX?.enabled === true;
  const defaultPayoutMethod = razorpayXEnabled ? "razorpayx" : "";
  const payoutMethods = useMemo(
    () => availablePaymentMethods(razorpayXEnabled),
    [razorpayXEnabled],
  );

  const fetchRuntime = useCallback(async () => {
    try {
      const response = await apiRequest(
        "GET",
        ENDPOINTS.commerceSettings.detail,
      );
      const data = response?.data || response || {};
      setRuntime(data.runtime || {});
    } catch {
      setRuntime({
        razorpayX: { enabled: false, mode: "disabled", missingKeys: [] },
      });
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getPayoutOperationsQueue({
          ...params,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (requestError) {
      const message =
        requestError?.message ||
        requestError ||
        "Failed to load payout operations queue";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchRuntime();
    fetchQueue();
  }, [fetchQueue, fetchRuntime]);

  const openAction = useCallback(
    (type, payout) => {
      const existingMethod = valueOf(payout, "paymentMethod", "payment_method");
      const paymentMethod = existingMethod || defaultPayoutMethod;
      const isCancelledReopen =
        type === "retry" && String(payout?.status || "").toLowerCase() === "cancelled";
      setAction({
        ...EMPTY_ACTION,
        open: true,
        type,
        title: isCancelledReopen ? "Reopen for Payout" : ACTION_TITLES[type] || "Update Payout",
        payout,
        paymentMethod,
        paymentReference: paymentMethod === "razorpayx" ? "" : "",
      });
      actionFormik.resetForm({
        values: {
          paymentReference: "",
          paymentMethod,
          reason: "",
          approve: true,
          note: "",
        },
      });
    },
    [actionFormik, defaultPayoutMethod],
  );

  const validateAction = (values = action) => {
    if (!payoutId(values.payout)) return "Payout ID is missing";
    if (values.type === "hold" && !values.reason.trim())
      return "Hold reason is required";
    if (values.type === "fail" && !values.reason.trim())
      return "Failure reason is required";
    if (values.type === "cancel" && !values.reason.trim())
      return "Cancellation reason is required";
    if (
      values.type === "complete" &&
      values.paymentMethod !== "razorpayx" &&
      !values.paymentReference.trim()
    )
      return "Payment reference is required before completion";
    if (["approve", "retry", "release"].includes(values.type)) {
      const existingMethod = valueOf(
        values.payout,
        "paymentMethod",
        "payment_method",
      );
      const selectedMethod = values.paymentMethod || existingMethod;
      if (selectedMethod === "razorpayx" && !razorpayXEnabled) {
        return "RazorpayX is disabled. Configure RazorpayX keys or enable mock mode before starting bank payout.";
      }
    }
    if (values.type === "release") {
      const existingMethod = valueOf(
        values.payout,
        "paymentMethod",
        "payment_method",
      );
      if (
        (values.paymentMethod || existingMethod) === "razorpayx" &&
        !values.approve
      ) {
        return "Enable approve on release to send a held payout through RazorpayX";
      }
    }
    return "";
  };

  const prepareAction = () => {
    if (["retry", "cancel", "release"].includes(action.type)) {
      actionFormik.handleSubmit();
      return;
    }
    const validationMessage = validateAction();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setConfirmAction({
      open: true,
      title: `${action.title || ACTION_TITLES[action.type] || "Update Payout"}?`,
      message: `This will move ${action.payout?.sellerName || action.payout?.seller?.displayName || "the seller"}'s payout to the next lifecycle state.`,
    });
  };

  const executeAction = useCallback(async () => {
    const base = {
      payoutId: payoutId(action.payout),
      id: payoutId(action.payout),
    };

    const buildBody = () => {
      switch (action.type) {
        case "approve": {
          const existingMethod = valueOf(
            action.payout,
            "paymentMethod",
            "payment_method",
          );
          const paymentMethod = action.paymentMethod || existingMethod;
          return {
            ...base,
            note: action.note,
            paymentMethod: paymentMethod || undefined,
            autoProcess: paymentMethod === "razorpayx",
          };
        }
        case "hold":
          return { ...base, reason: action.reason };
        case "release":
          return {
            ...base,
            approve: actionFormik.values.approve,
            note: actionFormik.values.note.trim(),
            paymentMethod:
              actionFormik.values.paymentMethod ||
              valueOf(action.payout, "paymentMethod", "payment_method") ||
              undefined,
            autoProcess:
              actionFormik.values.approve === true &&
              (actionFormik.values.paymentMethod ||
                valueOf(action.payout, "paymentMethod", "payment_method")) ===
                "razorpayx",
          };
        case "retry":
          return {
            ...base,
            paymentReference:
              actionFormik.values.paymentReference.trim() || undefined,
            paymentMethod: actionFormik.values.paymentMethod || undefined,
            autoProcess: actionFormik.values.paymentMethod === "razorpayx",
          };
        case "complete":
          return {
            ...base,
            paymentReference: action.paymentReference || undefined,
            paymentMethod: action.paymentMethod || undefined,
            notes: action.notes,
          };
        case "fail":
        case "cancel":
          return {
            ...base,
            reason:
              action.type === "cancel"
                ? actionFormik.values.reason.trim()
                : action.reason,
          };
        default:
          return base;
      }
    };

    const thunkMap = {
      approve: approveSellerPayout,
      hold: holdSellerPayout,
      release: releaseSellerPayoutHold,
      retry: retrySellerPayout,
      complete: completeSellerPayout,
      fail: failSellerPayout,
      cancel: cancelSellerPayout,
    };

    try {
      setLoading(true);
      await dispatch(thunkMap[action.type](buildBody())).unwrap();
      toast.success("Payout updated successfully");
      setAction(EMPTY_ACTION);
      setConfirmAction({ open: false });
      await fetchQueue();
    } catch (requestError) {
      toast.error(
        requestError?.message || requestError || "Failed to update payout",
      );
    } finally {
      setLoading(false);
    }
  }, [action, actionFormik.values, dispatch, fetchQueue]);

  const handleSyncRazorpayX = useCallback(
    async (row) => {
      const id = payoutId(row);
      if (!id) {
        toast.error("Payout ID is missing");
        return;
      }
      try {
        setLoading(true);
        await dispatch(syncRazorpayXPayout({ payoutId: id })).unwrap();
        toast.success("RazorpayX status synced");
        await fetchQueue();
      } catch (requestError) {
        toast.error(
          requestError?.message ||
            requestError ||
            "Failed to sync RazorpayX payout",
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch, fetchQueue],
  );

  const columns = useMemo(
    () => [
      {
        key: "sellerId",
        label: "Seller Store Name",
        sortable: false,
        render: (_, row) => {
          const name =
            row.sellerName ||
            row.seller?.displayName ||
            row.seller?.name ||
            row.seller?.businessName;
          const email = row.sellerEmail || row.seller?.email;
          return (
            <SellerIdentity row={row} storeName={name} loginName={email} />
          );
        },
      },
      {
        key: "amount",
        label: "Amount",
        sortable: false,
        render: (_, row) =>
          formatIndianNumber(valueOf(row, "net_amount", "netAmount", "amount")),
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        cellClassName: "whitespace-normal",
        render: (value, row) => (
          <div className="min-w-0 max-w-[250px]">
            <StatusBadge
              status={replacementPayoutIdOf(row) ? "superseded" : value}
              label={replacementPayoutIdOf(row) ? "Superseded" : undefined}
              dot
            />
            {replacementPayoutIdOf(row) && (
              <div className="mt-1 break-words text-xs leading-4 text-gray-500">
                Replacement: {replacementPayoutIdOf(row)}. Further retries are
                blocked.
              </div>
            )}
            {payoutFailureReason(row) && (
              <div className="mt-1 break-words whitespace-normal text-xs leading-4 text-red-600">
                {payoutFailureReason(row)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "paymentMethod",
        label: "Method",
        sortable: false,
        render: (_, row) => {
          const rx = razorpayXOf(row);
          return (
            <div>
              <div className="font-medium">{payoutMethodText(row)}</div>
              {rx.payoutId && (
                <div className="text-xs text-gray-400">
                  Provider ID: {rx.payoutId}
                </div>
              )}
              {payoutDurationText(row) && (
                <div className="text-xs text-gray-500">
                  {payoutDurationText(row)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: false,
        render: (value, row) => {
          const createdAt = value || valueOf(row, "created_at", "createdAt");
          return formatDateTime12Hour(createdAt, "N/A");
        },
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (row) => {
      if (!canUpdate) return [];

      const status = row.status;
      const method = valueOf(row, "paymentMethod", "payment_method");
      const isRazorpayX = method === "razorpayx";
      const pendingActionLabel = isRazorpayX
        ? "Start RazorpayX"
        : method === "seller_wallet"
          ? "Approve to Wallet"
          : "Approve Offline Payout";
      const providerPayoutExists = hasRazorpayXProviderPayout(row);
      const replacementPayoutId = replacementPayoutIdOf(row);

      const items = [];

      if (replacementPayoutId) return items;

      if (status === "pending") {
        items.push({
          label: pendingActionLabel,
          icon: (
            <MdPlayArrow
              aria-hidden="true"
              size={16}
              className="text-emerald-600"
            />
          ),
          disabled: loading,
          onClick: () => openAction("approve", row),
        });
        items.push({
          label: "Hold",
          icon: (
            <MdPause aria-hidden="true" size={16} className="text-yellow-600" />
          ),
          disabled: loading,
          onClick: () => openAction("hold", row),
        });
      }

      if (status === "on_hold") {
        items.push({
          label: "Release Hold",
          icon: (
            <MdPlayArrow
              aria-hidden="true"
              size={16}
              className="text-emerald-600"
            />
          ),
          disabled: loading,
          onClick: () => openAction("release", row),
        });
      }

      if (status === "failed") {
        if (isRazorpayX && providerPayoutExists) {
          items.push({
            label: "Sync Status",
            icon: (
              <MdSync aria-hidden="true" size={16} className="text-blue-600" />
            ),
            disabled: loading,
            onClick: () => handleSyncRazorpayX(row),
          });
        }
        if (!isRazorpayX || !providerPayoutExists || isSafeRazorpayXRetry(row)) {
          items.push({
            label: "Retry",
            icon: (
              <MdReplay
                aria-hidden="true"
                size={16}
                className="text-blue-600"
              />
            ),
            disabled: loading,
            onClick: () => openAction("retry", row),
          });
        }
      }

      if (status === "processing") {
        if (isRazorpayX && providerPayoutExists) {
          items.push({
            label: "Sync Status",
            icon: (
              <MdSync aria-hidden="true" size={16} className="text-blue-600" />
            ),
            disabled: loading,
            onClick: () => handleSyncRazorpayX(row),
          });
        } else if (isRazorpayX) {
          items.push({
            label: "Retry RazorpayX",
            icon: (
              <MdReplay
                aria-hidden="true"
                size={16}
                className="text-blue-600"
              />
            ),
            disabled: loading,
            onClick: () => openAction("approve", row),
          });
        } else {
          items.push({
            label: "Complete",
            icon: (
              <MdCheckCircle
                aria-hidden="true"
                size={16}
                className="text-emerald-600"
              />
            ),
            disabled: loading,
            onClick: () => openAction("complete", row),
          });
        }

        items.push({
          label: "Fail",
          icon: (
            <MdBlock aria-hidden="true" size={16} className="text-red-600" />
          ),
          danger: true,
          disabled: loading,
          onClick: () => openAction("fail", row),
        });
      }

      if (!["completed", "cancelled"].includes(status)) {
        items.push({
          label: "Cancel",
          icon: (
            <MdClose aria-hidden="true" size={16} className="text-red-600" />
          ),
          danger: true,
          disabled: loading,
          onClick: () => openAction("cancel", row),
        });
      }

      return items;
    },
    [canUpdate, handleSyncRazorpayX, loading, openAction],
  );

  return (
    <div>
      <PageHeader
        title="Payout Operations Queue"
        subtitle="Approve, hold, release, retry, complete, or fail seller payout operations"
        breadcrumbs={[
          { label: "My Finance & Payouts" },
          { label: "Payout Ops Queue" },
        ]}
        // actions={
        //   <button type="button" onClick={fetchQueue}>
        //     <MdRefresh size={17} /> Refresh
        //   </button>
        // }
      />

      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total || payload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search seller, email, payout/provider ID, method, status, or amount..."
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchQueue}
        rowActions={rowActions}
        rowKey={payoutId}
        error={error}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
        requiredModule="sellers/commissions"
        exportConfig={{
          filename: "payout-ops-queue",
          columns,
          data: payload.list,
        }}
      />

      {/* Action modal */}
   <DefaultModal
  isOpen={action.open}
  onClose={() => setAction(EMPTY_ACTION)}
  title={action.title}
  onSubmit={prepareAction}
  submitButtonText="Continue"
  closeButtonText="Cancel"
  loading={loading}
>
  <div className="space-y-5">
    {/* Payout Summary */}
    {action.payout && (
      <FormSection
        title="Payout Summary"
        description="Review the seller and transaction details before proceeding."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="admin-label">Seller</p>
            <p className="mt-1 break-words text-sm font-medium text-gray-800">
              {action.payout.sellerName ||
                action.payout.seller?.displayName ||
                "Seller"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="admin-label">Net Amount</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatIndianNumber(
                valueOf(action.payout, "net_amount", "netAmount", "amount"),
              )}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="admin-label">Current Status</p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              {display(action.payout.status)}
            </p>
          </div>

          {payoutMethodText(action.payout) !== "—" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="admin-label">Payment Method</p>
              <p className="mt-1 break-words text-sm text-gray-800">
                {payoutMethodText(action.payout)}
              </p>
            </div>
          )}

          {razorpayXOf(action.payout).payoutId && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
              <p className="admin-label">Provider ID</p>
              <p className="mt-1 break-all text-sm text-gray-700">
                {razorpayXOf(action.payout).payoutId}
              </p>
            </div>
          )}
        </div>

        {payoutFailureReason(action.payout) && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">
              Failure Reason
            </p>
            <p className="mt-1 break-words text-sm text-red-600">
              {payoutFailureReason(action.payout)}
            </p>
          </div>
        )}
      </FormSection>
    )}

    {/* RazorpayX Configuration Warning */}
    {!razorpayXEnabled && (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-800">
          RazorpayX bank payout is currently disabled.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Enable live RazorpayX keys or mock mode in the backend environment
          before using automatic seller bank payouts.
        </p>

        {runtime?.razorpayX?.missingKeys?.length > 0 && (
          <p className="mt-2 text-xs font-medium text-amber-800">
            Missing: {runtime.razorpayX.missingKeys.join(", ")}
          </p>
        )}
      </div>
    )}

    {/* Approve */}
    {action.type === "approve" && (
      <FormSection
        title="Approval Details"
        description="Choose the payment method and add any relevant notes."
      >
        <div className="space-y-4">
          <div>
            <label className="admin-label">Payment Method</label>
            <select
              className="admin-input w-full"
              value={action.paymentMethod}
              onChange={(e) =>
                setAction((prev) => ({
                  ...prev,
                  paymentMethod: e.target.value,
                }))
              }
            >
              <option value="">-- Use seller preference --</option>
              {payoutMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {action.paymentMethod === "razorpayx" && (
              <p className="mt-1.5 text-xs text-gray-500">
                Sends money to the seller's verified onboarding bank account
                through RazorpayX.
              </p>
            )}

            {action.paymentMethod === "seller_wallet" && (
              <p className="mt-1.5 text-xs text-gray-500">
                Credits this payout to the seller's internal wallet and does
                not validate bank IFSC.
              </p>
            )}

            {action.paymentMethod &&
              !["razorpayx", "seller_wallet"].includes(
                action.paymentMethod,
              ) && (
                <p className="mt-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                  Approval moves this payout to Processing. Transfer the funds
                  externally, then use Complete and enter the UTR or transaction
                  reference.
                </p>
              )}
          </div>

          <Input
            labelName="Note (optional)"
            type="textarea"
            value={action.note}
            onChange={(e) =>
              setAction((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </div>
      </FormSection>
    )}

    {/* Hold */}
    {action.type === "hold" && (
      <FormSection
        title="Hold Details"
        description="Provide the reason for placing this payout on hold."
      >
        <Input
          labelName="Hold Reason"
          type="textarea"
          value={action.reason}
          onChange={(e) =>
            setAction((prev) => ({ ...prev, reason: e.target.value }))
          }
          required
        />
      </FormSection>
    )}

    {/* Release Hold */}
    {action.type === "release" && (
      <FormSection
        title="Release Details"
        description="Configure how the payout should proceed after release."
      >
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              name="approve"
              checked={actionFormik.values.approve}
              onChange={(e) =>
                actionFormik.setFieldValue("approve", e.target.checked)
              }
              onBlur={actionFormik.handleBlur}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />

            <span>
              <span className="block text-sm font-medium text-gray-800">
                Approve on release
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Automatically approve the payout when it is released.
              </span>
            </span>
          </label>
          {actionFormik.touched.approve && actionFormik.errors.approve && (
            <p className="text-xs text-red-600">{actionFormik.errors.approve}</p>
          )}

          <Input
            labelName="Note (optional)"
            type="textarea"
            name="note"
            value={actionFormik.values.note}
            onChange={actionFormik.handleChange}
            onBlur={actionFormik.handleBlur}
            error={actionFormik.touched.note && actionFormik.errors.note}
          />

          {actionFormik.values.approve && (
            <div>
  <label className="admin-label">Payment Method After Release</label>

  <FilterSelect
    options={[
      { value: "", label: "-- Keep manual / existing --" },
      ...payoutMethods,
    ]}
    value={
      [
        { value: "", label: "-- Keep manual / existing --" },
        ...payoutMethods,
      ].find((option) => option.value === action.paymentMethod) || null
    }
    onChange={(selectedOption) =>
      setAction((prev) => ({
        ...prev,
        paymentMethod:
          typeof selectedOption === "object"
            ? selectedOption?.value ?? ""
            : selectedOption ?? "",
      }))
    }
    placeholder="Select payment method"
  />
</div>
          )}
        </div>
      </FormSection>
    )}

    {/* Retry */}
    {action.type === "retry" && (
      <FormSection
        title={
          String(action.payout?.status || "").toLowerCase() === "cancelled"
            ? "Reopen Payout Details"
            : "Retry Details"
        }
        description={
          String(action.payout?.status || "").toLowerCase() === "cancelled"
            ? "A new payout will be created from the eligible earnings; the cancelled payout remains as history."
            : "Review the payment reference and method before retrying."
        }
      >
        <div className="space-y-4">
          <Input
            labelName={
              actionFormik.values.paymentMethod === "razorpayx"
                ? "Payment Reference (not required for RazorpayX)"
                : "Payment Reference *"
            }
            name="paymentReference"
            value={actionFormik.values.paymentReference}
            onChange={actionFormik.handleChange}
            onBlur={actionFormik.handleBlur}
            error={
              actionFormik.touched.paymentReference &&
              actionFormik.errors.paymentReference
            }
          />

        <div>
  <label className="admin-label">Payment Method (optional)</label>

  <FilterSelect
    options={payoutMethods}
    value={
      payoutMethods.find(
        (method) => method.value === actionFormik.values.paymentMethod,
      ) || null
    }
    onChange={(selectedOption) =>
      actionFormik.setFieldValue(
        "paymentMethod",
        typeof selectedOption === "object"
          ? selectedOption?.value ?? ""
          : selectedOption ?? "",
      )
    }
    placeholder="Select payment method"
    isClearable
  />

  {actionFormik.values.paymentMethod === "razorpayx" && (
    <p className="mt-1.5 text-xs text-gray-500">
      A fresh RazorpayX payout will be created. The provider ID will appear
      after initiation.
    </p>
  )}
</div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-800">
              Before retrying
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Retrying creates a new payout request. Required approval still
              applies.
            </p>
          </div>
        </div>
      </FormSection>
    )}

    {/* Complete */}
    {action.type === "complete" && (
      <FormSection
        title="Completion Details"
        description="Enter the transaction reference to mark this payout as completed."
      >
        <div className="space-y-4">
          <Input
            labelName="Payment Reference *"
            value={action.paymentReference}
            onChange={(e) =>
              setAction((prev) => ({
                ...prev,
                paymentReference: e.target.value,
              }))
            }
          />

          <div>
            <label className="admin-label">
              Payment Method (optional)
            </label>
            <select
              className="admin-input w-full"
                value={actionFormik.values.paymentMethod}
                onChange={(e) =>
                  actionFormik.setFieldValue("paymentMethod", e.target.value)
                }
            >
              <option value="">-- Select --</option>
              {payoutMethods
                .filter((m) => m.value !== "razorpayx")
                .map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
            </select>
          </div>

          <Input
            labelName="Notes (optional)"
            type="textarea"
            value={action.notes}
            onChange={(e) =>
              setAction((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </div>
      </FormSection>
    )}

    {/* Fail / Cancel */}
    {["fail", "cancel"].includes(action.type) && (
      <FormSection
        title={
          action.type === "cancel" ? "Cancellation Details" : "Failure Details"
        }
        description={
          action.type === "cancel"
            ? "Provide the reason for cancelling this payout."
            : "Provide the reason for marking this payout as failed."
        }
      >
        <Input
          labelName={
            action.type === "cancel" ? "Cancellation Reason" : "Failure Reason"
          }
          type="textarea"
          name={action.type === "cancel" ? "reason" : undefined}
          value={
            action.type === "cancel" ? actionFormik.values.reason : action.reason
          }
          onChange={
            action.type === "cancel"
              ? actionFormik.handleChange
              : (e) =>
                  setAction((prev) => ({ ...prev, reason: e.target.value }))
          }
          onBlur={action.type === "cancel" ? actionFormik.handleBlur : undefined}
          error={
            action.type === "cancel" &&
            actionFormik.touched.reason &&
            actionFormik.errors.reason
          }
          required
        />
      </FormSection>
    )}
  </div>
</DefaultModal>

      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false })}
        onConfirm={executeAction}
        title={confirmAction.title}
        message={confirmAction.message}
        variant={
          action.type === "fail" ||
          action.type === "hold" ||
          action.type === "cancel"
            ? "danger"
            : "warning"
        }
        confirmLabel="Confirm"
        loading={loading}
      />
    </div>
  );
};

export default PayoutOpsQueue;
