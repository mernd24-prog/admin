import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
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
} from "../../../Redux/sellerCommissionsSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const PAYOUT_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "failed",
];

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "imps", label: "IMPS" },
  { value: "cheque", label: "Cheque" },
  { value: "manual", label: "Manual" },
];

const ACTION_TITLES = {
  approve: "Approve Payout",
  hold: "Hold Payout",
  release: "Release Payout Hold",
  retry: "Retry Payout",
  complete: "Complete Payout",
  fail: "Fail Payout",
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
    options: PAYOUT_STATUSES.map((value) => ({
      value,
      label: value.replace(/_/g, " "),
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
      ...(data.pendingApproval || []).map((row) => ({ ...row, status: row.status || "pending" })),
      ...(data.processing || []).map((row) => ({ ...row, status: row.status || "processing" })),
      ...(data.onHold || []).map((row) => ({ ...row, status: row.status || "on_hold" })),
      ...(data.failed || []).map((row) => ({ ...row, status: row.status || "failed" })),
    ];
    if (list.length || data.counts) {
      return {
        list,
        total: Number(
          (data.counts?.pendingApproval || 0) +
          (data.counts?.processing || 0) +
          (data.counts?.onHold || 0) +
          (data.counts?.failed || 0)
        ) || list.length,
      };
    }
  }
  return {
    list: data?.items || data?.list || data || [],
    total: Number(
      data?.total || data?.items?.length || data?.list?.length || 0
    ),
  };
};

const display = (value = "") =>
  String(value || "N/A").replace(/_/g, " ");
const money = (value) => `INR ${Number(value || 0).toFixed(2)}`;
const payoutId = (row) => row?._id || row?.id || row?.payoutId;

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

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getPayoutOperationsQueue({
          ...params,
          offset: (params.page - 1) * params.limit,
        })
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
    fetchQueue();
  }, [fetchQueue]);

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
    if (action.type === "complete" && !action.paymentReference.trim())
      return "Payment reference is required before completion";
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
    const base = { payoutId: payoutId(action.payout), id: payoutId(action.payout) };

    const buildBody = () => {
      switch (action.type) {
        case "approve":
          return {
            ...base,
            note: action.note,
            paymentMethod: action.paymentMethod || undefined,
          };
        case "hold":
          return { ...base, reason: action.reason };
        case "release":
          return {
            ...base,
            approve: action.approve,
            note: action.note,
          };
        case "retry":
          return {
            ...base,
            paymentReference: action.paymentReference || undefined,
            paymentMethod: action.paymentMethod || undefined,
          };
        case "complete":
          return {
            ...base,
            paymentReference: action.paymentReference || undefined,
            paymentMethod: action.paymentMethod || undefined,
            notes: action.notes,
          };
        case "fail":
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
        requestError?.message || requestError || "Failed to update payout"
      );
    } finally {
      setLoading(false);
    }
  }, [action, dispatch, fetchQueue]);

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
          const value = row.sellerId || row.seller_id;
          return (
            <div>
              {name && (
                <div className="text-sm font-medium text-gray-800">
                  {name}
                </div>
              )}
              {email && (
                <div className="text-xs text-gray-400">{email}</div>
              )}
              {!name && !email && <span className="text-xs text-gray-500">Seller details unavailable</span>}
            </div>
          );
        },
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (_, row) => money(row.net_amount || row.amount),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusBadge status={value} dot />,
      },
      {
        key: "paymentMethod",
        label: "Method",
        sortable: false,
        render: (_, row) => row.paymentMethod || row.payment_method ? display(row.paymentMethod || row.payment_method) : "—",
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (value, row) => {
          const createdAt = value || row.created_at;
          return createdAt ? moment(createdAt).format("DD-MM-YYYY HH:mm") : "N/A";
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => {
          const status = row.status;
          return (
            <div className="flex flex-wrap items-center gap-2">
              {status === "pending" && (
                <>
                  <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
                    <button
                      type="button"
                      className="admin-btn-secondary !px-2 !py-1"
                      onClick={() => openAction("approve", row)}
                    >
                      Approve
                    </button>
                  </PermissionGuard>
                  <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
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
                <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
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
                <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
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
                  <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
                    <button
                      type="button"
                      className="admin-btn-secondary !px-2 !py-1"
                      onClick={() => openAction("complete", row)}
                    >
                      Complete
                    </button>
                  </PermissionGuard>
                  <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
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
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Payout Operations Queue"
        subtitle="Approve, hold, release, retry, complete, or fail seller payout operations"
        breadcrumbs={[
          { label: "Seller Finance & Payouts" },
          { label: "Payout Ops Queue" },
        ]}
        actions={
          <button
            type="button"

            onClick={fetchQueue}
          >
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
        requiredModule="sellers"
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
              <div><strong>Seller:</strong> {action.payout.sellerName || action.payout.seller?.displayName || "Seller"}</div>
              <div><strong>Net amount:</strong> {money(action.payout.net_amount || action.payout.amount)}</div>
              <div><strong>Current status:</strong> {display(action.payout.status)}</div>
            </div>
          )}
          {/* Approve */}
          {action.type === "approve" && (
            <>
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
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
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
            </>
          )}

          {/* Retry */}
          {action.type === "retry" && (
            <>
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
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                Retrying creates a new payout request. Required approval still applies.
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
                  {PAYMENT_METHODS.map((m) => (
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
          {action.type === "fail" && (
            <Input
              labelName="Failure Reason"
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
          action.type === "fail" || action.type === "hold"
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
