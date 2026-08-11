import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { MdRefresh } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
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
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";
import { apiRequest } from "../../../_helpers/apiConfig";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const PAYOUT_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "failed",
  "cancelled",
];

const PAYMENT_METHODS = [
  { value: "razorpayx", label: "RazorpayX bank payout" },
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
    label: "Seller",
    width: "w-52",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields: "full_name,email,businessName",
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
  { key: "search", type: "text", label: "Search", width: "w-52" },
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
const money = (value) => `INR ${Number(value || 0).toFixed(2)}`;
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
const payoutMethodText = (row = {}) => {
  const method = valueOf(row, "paymentMethod", "payment_method");
  return method === "razorpayx"
    ? "RazorpayX bank payout"
    : method
      ? display(method)
      : "—";
};
const payoutDurationText = (row = {}) => {
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
  return (
    metadata.failedReason ||
    metadata.cancellationReason ||
    rx.rawWebhook?.failure_reason ||
    rx.raw?.failure_reason ||
    rx.raw?.status_details?.description ||
    ""
  );
};

const PayoutOpsQueue = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(selector.payoutOperationsQueueData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState(EMPTY_ACTION);
  const [confirmAction, setConfirmAction] = useState({ open: false });
  const [runtime, setRuntime] = useState({
    razorpayX: { enabled: false, mode: "disabled", missingKeys: [] },
  });
  const razorpayXEnabled = runtime?.razorpayX?.enabled === true;
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

  const openAction = (type, payout) => {
    setAction({
      ...EMPTY_ACTION,
      open: true,
      type,
      title: ACTION_TITLES[type] || "Update Payout",
      payout,
    });
  };

  const validateAction = () => {
    if (!payoutId(action.payout)) return "Payout ID is missing";
    if (action.type === "hold" && !action.reason.trim())
      return "Hold reason is required";
    if (action.type === "fail" && !action.reason.trim())
      return "Failure reason is required";
    if (action.type === "cancel" && !action.reason.trim())
      return "Cancellation reason is required";
    if (action.type === "complete" && !action.paymentReference.trim())
      return "Payment reference is required before completion";
    if (["approve", "retry", "release"].includes(action.type)) {
      const existingMethod = valueOf(
        action.payout,
        "paymentMethod",
        "payment_method",
      );
      const selectedMethod =
        existingMethod === "razorpayx" ? "razorpayx" : action.paymentMethod;
      if (selectedMethod === "razorpayx" && !razorpayXEnabled) {
        return "RazorpayX is disabled. Configure RazorpayX keys or enable mock mode before starting bank payout.";
      }
    }
    if (
      ["approve", "retry", "release"].includes(action.type) &&
      action.paymentMethod === "razorpayx" &&
      action.type === "release" &&
      !action.approve
    )
      return "Enable approve on release to send a held payout through RazorpayX";
    return "";
  };

  const prepareAction = () => {
    const validationMessage = validateAction();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setConfirmAction({
      open: true,
      title: `${ACTION_TITLES[action.type] || "Update Payout"}?`,
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
          const paymentMethod =
            existingMethod === "razorpayx" ? "razorpayx" : action.paymentMethod;
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
            approve: action.approve,
            note: action.note,
            paymentMethod: action.paymentMethod || undefined,
            autoProcess: action.paymentMethod === "razorpayx",
          };
        case "retry":
          return {
            ...base,
            paymentReference: action.paymentReference || undefined,
            paymentMethod: action.paymentMethod || undefined,
            autoProcess: action.paymentMethod === "razorpayx",
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
          return { ...base, reason: action.reason };
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
  }, [action, dispatch, fetchQueue]);

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
        label: "Seller",
        sortable: true,
        render: (_, row) => {
          const name =
            row.sellerName ||
            row.seller?.displayName ||
            row.seller?.name ||
            row.seller?.businessName;
          const email = row.sellerEmail || row.seller?.email;
          return (
            <div>
              {name && (
                <div className="text-sm font-medium text-gray-800">{name}</div>
              )}
              {email && <div className="text-xs text-gray-400">{email}</div>}
              {!name && !email && (
                <span className="text-xs text-gray-500">
                  Seller details unavailable
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (_, row) =>
          money(valueOf(row, "net_amount", "netAmount", "amount")),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value, row) => (
          <div>
            <StatusBadge status={value} dot />
            {payoutFailureReason(row) && (
              <div className="mt-1 max-w-[220px] text-xs text-red-600">
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
        sortable: true,
        render: (value, row) => {
          const createdAt = value || valueOf(row, "created_at", "createdAt");
          return formatDateTime12Hour(createdAt, "N/A");
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => {
          const status = row.status;
          const method = valueOf(row, "paymentMethod", "payment_method");
          const isRazorpayX = method === "razorpayx";
          return (
            <div className="flex flex-wrap items-center gap-2">
              {status === "pending" && (
                <>
                  <PermissionGuard
                    module="sellers/commissions"
                    action={ACTIONS.UPDATE}
                    hide
                  >
                    <button
                      type="button"
                      className="admin-btn-secondary !px-2 !py-1"
                      onClick={() => openAction("approve", row)}
                    >
                      {isRazorpayX ? "Start Payout" : "Approve"}
                    </button>
                  </PermissionGuard>
                  <PermissionGuard
                    module="sellers/commissions"
                    action={ACTIONS.UPDATE}
                    hide
                  >
                    <button
                      type="button"
                      className="admin-btn-secondary !px-2 !py-1 text-yellow-600"
                      onClick={() => openAction("hold", row)}
                    >
                      Hold
                    </button>
                  </PermissionGuard>
                </>
              )}
              {status === "on_hold" && (
                <PermissionGuard
                  module="sellers/commissions"
                  action={ACTIONS.UPDATE}
                  hide
                >
                  <button
                    type="button"
                    className="admin-btn-secondary !px-2 !py-1"
                    onClick={() => openAction("release", row)}
                  >
                    Release Hold
                  </button>
                </PermissionGuard>
              )}
              {status === "failed" && (
                <PermissionGuard
                  module="sellers/commissions"
                  action={ACTIONS.UPDATE}
                  hide
                >
                  <button
                    type="button"
                    className="admin-btn-secondary !px-2 !py-1"
                    onClick={() => openAction("retry", row)}
                  >
                    Retry
                  </button>
                </PermissionGuard>
              )}
              {status === "processing" && (
                <>
                  {isRazorpayX ? (
                    <PermissionGuard
                      module="sellers/commissions"
                      action={ACTIONS.UPDATE}
                      hide
                    >
                      <button
                        type="button"
                        className="admin-btn-secondary !px-2 !py-1"
                        onClick={() => handleSyncRazorpayX(row)}
                      >
                        Sync Status
                      </button>
                    </PermissionGuard>
                  ) : (
                    <PermissionGuard
                      module="sellers/commissions"
                      action={ACTIONS.UPDATE}
                      hide
                    >
                      <button
                        type="button"
                        className="admin-btn-secondary !px-2 !py-1"
                        onClick={() => openAction("complete", row)}
                      >
                        Complete
                      </button>
                    </PermissionGuard>
                  )}
                  <PermissionGuard
                    module="sellers/commissions"
                    action={ACTIONS.UPDATE}
                    hide
                  >
                    <button
                      type="button"
                      className="admin-btn-secondary !px-2 !py-1 text-red-600"
                      onClick={() => openAction("fail", row)}
                    >
                      Fail
                    </button>
                  </PermissionGuard>
                </>
              )}
              {!["completed", "cancelled"].includes(status) && (
                <PermissionGuard
                  module="sellers/commissions"
                  action={ACTIONS.UPDATE}
                  hide
                >
                  <button
                    type="button"
                    className="admin-btn-secondary !px-2 !py-1 text-red-600"
                    onClick={() => openAction("cancel", row)}
                  >
                    Cancel
                  </button>
                </PermissionGuard>
              )}
            </div>
          );
        },
      },
    ],
    [handleSyncRazorpayX],
  );

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Payout Operations Queue"
        subtitle="Approve, hold, release, retry, complete, or fail seller payout operations"
        breadcrumbs={[
          { label: "My Finance & Payouts" },
          { label: "Payout Ops Queue" },
        ]}
        actions={
          <button type="button" onClick={fetchQueue}>
            <MdRefresh size={17} /> Refresh
          </button>
        }
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
        searchPlaceholder="Search seller or payment reference"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchQueue}
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
        <div className="space-y-3">
          {action.payout && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
              <div>
                <strong>Seller:</strong>{" "}
                {action.payout.sellerName ||
                  action.payout.seller?.displayName ||
                  "Seller"}
              </div>
              <div>
                <strong>Net amount:</strong>{" "}
                {money(
                  valueOf(action.payout, "net_amount", "netAmount", "amount"),
                )}
              </div>
              <div>
                <strong>Current status:</strong> {display(action.payout.status)}
              </div>
              {payoutMethodText(action.payout) !== "—" && (
                <div>
                  <strong>Method:</strong> {payoutMethodText(action.payout)}
                </div>
              )}
              {razorpayXOf(action.payout).payoutId && (
                <div>
                  <strong>Provider ID:</strong>{" "}
                  {razorpayXOf(action.payout).payoutId}
                </div>
              )}
              {payoutFailureReason(action.payout) && (
                <div className="text-red-600">
                  <strong>Failure reason:</strong>{" "}
                  {payoutFailureReason(action.payout)}
                </div>
              )}
            </div>
          )}
          {!razorpayXEnabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              RazorpayX bank payout is currently disabled. Enable live RazorpayX
              keys or mock mode in backend env before using automatic seller
              bank payouts.
              {runtime?.razorpayX?.missingKeys?.length ? (
                <span className="mt-1 block">
                  Missing: {runtime.razorpayX.missingKeys.join(", ")}
                </span>
              ) : null}
            </div>
          )}
          {/* Approve */}
          {action.type === "approve" && (
            <>
              {valueOf(action.payout, "paymentMethod", "payment_method") ===
              "razorpayx" ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                  RazorpayX was already selected while creating this payout.
                  Continuing will start the bank payout using the seller's
                  verified onboarding bank details.
                </div>
              ) : (
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block">Payment Method (optional)</span>
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
                    <option value="">-- Select --</option>
                    {payoutMethods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {action.paymentMethod === "razorpayx" && (
                    <span className="mt-1 block text-xs text-gray-500">
                      Sends money to the seller's verified onboarding bank
                      account through RazorpayX.
                    </span>
                  )}
                </label>
              )}
              <Input
                labelName="Note (optional)"
                type="textarea"
                value={action.note}
                onChange={(e) =>
                  setAction((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </>
          )}

          {/* Hold */}
          {action.type === "hold" && (
            <Input
              labelName="Hold Reason"
              type="textarea"
              value={action.reason}
              onChange={(e) =>
                setAction((prev) => ({ ...prev, reason: e.target.value }))
              }
              required
            />
          )}

          {/* Release Hold */}
          {action.type === "release" && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Approve on release?
                </label>
                <input
                  type="checkbox"
                  checked={action.approve}
                  onChange={(e) =>
                    setAction((prev) => ({
                      ...prev,
                      approve: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </div>
              <Input
                labelName="Note (optional)"
                type="textarea"
                value={action.note}
                onChange={(e) =>
                  setAction((prev) => ({ ...prev, note: e.target.value }))
                }
              />
              {action.approve && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block">
                    Payment method after release
                  </span>
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
                    <option value="">-- Keep manual / existing --</option>
                    {payoutMethods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          {/* Retry */}
          {action.type === "retry" && (
            <>
              <Input
                labelName={
                  action.paymentMethod === "razorpayx"
                    ? "Payment Reference (not required for RazorpayX)"
                    : "Payment Reference *"
                }
                value={action.paymentReference}
                onChange={(e) =>
                  setAction((prev) => ({
                    ...prev,
                    paymentReference: e.target.value,
                  }))
                }
              />
              <label className="block text-sm text-gray-700">
                <span className="mb-1 block">Payment Method (optional)</span>
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
                  <option value="">-- Select --</option>
                  {payoutMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {action.paymentMethod === "razorpayx" && (
                  <span className="mt-1 block text-xs text-gray-500">
                    A fresh RazorpayX payout will be created. Provider ID will
                    appear after initiation.
                  </span>
                )}
              </label>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                Retrying creates a new payout request. Required approval still
                applies.
              </div>
            </>
          )}

          {/* Complete */}
          {action.type === "complete" && (
            <>
              <Input
                labelName="Payment Reference (optional)"
                value={action.paymentReference}
                onChange={(e) =>
                  setAction((prev) => ({
                    ...prev,
                    paymentReference: e.target.value,
                  }))
                }
              />
              <label className="block text-sm text-gray-700">
                <span className="mb-1 block">Payment Method (optional)</span>
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
                  <option value="">-- Select --</option>
                  {payoutMethods
                    .filter((m) => m.value !== "razorpayx")
                    .map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                </select>
              </label>
              <Input
                labelName="Notes (optional)"
                type="textarea"
                value={action.notes}
                onChange={(e) =>
                  setAction((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </>
          )}

          {/* Fail */}
          {["fail", "cancel"].includes(action.type) && (
            <Input
              labelName={
                action.type === "cancel"
                  ? "Cancellation Reason"
                  : "Failure Reason"
              }
              type="textarea"
              value={action.reason}
              onChange={(e) =>
                setAction((prev) => ({ ...prev, reason: e.target.value }))
              }
              required
            />
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
