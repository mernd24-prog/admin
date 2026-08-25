import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { MdEdit, MdRefresh } from "react-icons/md";
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
  getNegativeBalances,
  resolveNegativeBalance,
} from "../../../Redux/sellerCommissionsSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";

const NEGATIVE_BALANCE_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "completed",
];

const RECOVERY_ACTIONS = [
  {
    value: "collected_from_seller",
    label: "Record external payment",
    description: "Use only when the seller paid separately by bank transfer, UPI, or another verified method.",
  },
  {
    value: "platform_write_off",
    label: "Write off remaining amount",
    description: "Stop recovery without collecting the balance. This should require an approved business reason.",
  },
];

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
    options: NEGATIVE_BALANCE_STATUSES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  { key: "search", type: "text", label: "Search", width: "w-52" },
];

const EMPTY_ACTION = {
  open: false,
  settlement: null,
  resolveAction: "collected_from_seller",
  referenceId: "",
  note: "",
};

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.items || data?.list || data || [],
    total: Number(
      data?.total || data?.items?.length || data?.list?.length || 0,
    ),
  };
};

const valueOf = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "")
      return row[key];
  }
  return 0;
};

const money = (value) => `INR ${Math.abs(Number(value || 0)).toFixed(2)}`;
const settlementId = (row) => row?._id || row?.id || row?.settlementId;

const NegativeBalances = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(selector.negativeBalancesData);
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

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getNegativeBalances({
          ...params,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (requestError) {
      const message =
        requestError?.message ||
        requestError ||
        "Failed to load negative balances";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const openManageRecovery = (row) => {
    setAction({
      ...EMPTY_ACTION,
      open: true,
      settlement: row,
    });
  };

  const validateAction = () => {
    if (!settlementId(action.settlement)) return "Settlement ID is missing";
    if (action.resolveAction === "collected_from_seller" && !action.referenceId.trim()) {
      return "Payment reference ID is required";
    }
    if (!action.note.trim()) return "Note is required";
    return "";
  };

  const prepareAction = () => {
    const validationMessage = validateAction();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    const isExternalPayment = action.resolveAction === "collected_from_seller";
    setConfirmAction({
      open: true,
      title: isExternalPayment ? "Confirm external payment?" : "Confirm write-off?",
      message: isExternalPayment
        ? `Confirm that ${money(action.settlement?.remainingAmount ?? action.settlement?.net_amount)} was received outside the payout system. This closes the amount owed.`
        : `This permanently stops recovery of ${money(action.settlement?.remainingAmount ?? action.settlement?.net_amount)}. The amount will not be collected from this seller.`,
    });
  };

  const executeAction = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(
        resolveNegativeBalance({
          settlementId: settlementId(action.settlement),
          id: settlementId(action.settlement),
          action: action.resolveAction,
          referenceId: action.referenceId.trim() || undefined,
          note: action.note,
        }),
      ).unwrap();
      toast.success(
        action.resolveAction === "collected_from_seller"
          ? "External seller payment recorded"
          : "Remaining amount written off",
      );
      setAction(EMPTY_ACTION);
      setConfirmAction({ open: false });
      await fetchBalances();
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          requestError ||
          "Failed to resolve negative balance",
      );
    } finally {
      setLoading(false);
    }
  }, [action, dispatch, fetchBalances]);

  const columns = useMemo(
    () => [
      {
        key: "settlementId",
        label: "Settlement",
        sortable: true,
        render: (_, row) => (
          <div>
            <div className="font-semibold text-gray-800">
              {row.settlementNumber || settlementId(row)}
            </div>
            {row.settlementNumber && (
              <div className="font-mono text-xs text-gray-400">
                {settlementId(row)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "sellerId",
        label: "Seller",
        sortable: true,
        render: (_, row) => {
          const name =
            row.sellerName || row.seller?.name || row.seller?.businessName;
          const email = row.sellerEmail || row.seller?.email;
          const value = row.sellerId || row.seller_id;
          return (
            <div>
              {name && (
                <div className="text-sm font-medium text-gray-800">{name}</div>
              )}
              {email && <div className="text-xs text-gray-400">{email}</div>}
              {!name && !email && value && (
                <span className="font-mono text-xs text-gray-500">
                  {String(value).slice(0, 16)}
                  {String(value).length > 16 ? "…" : ""}
                </span>
              )}
              {!name && !email && !value && "—"}
            </div>
          );
        },
      },
      {
        key: "liabilityType",
        label: "Type / Order",
        render: (value, row) => (
          <div>
            <div className="text-sm font-medium text-gray-800">
              {value === "seller_collected_cod" ? "Seller-collected COD" : "Other adjustment"}
            </div>
            {row.orderId ? <div className="text-xs text-gray-500">Order: {row.orderId}</div> : null}
          </div>
        ),
      },
      {
        key: "negativeAmount",
        label: "Amount originally owed",
        sortable: true,
        render: (value, row) =>
          money(
            valueOf(
              { value, ...row },
              "value",
              "originalLiabilityAmount",
              "balance",
              "net_amount",
              "netAmount",
              "amount",
            ),
          ),
      },
      {
        key: "remainingAmount",
        label: "Still owed",
        sortable: false,
        render: (value, row) => (
          <div>
            <div className="font-semibold text-red-600">
              {money(value ?? row.remainingAmount ?? row.net_amount ?? row.netAmount ?? 0)}
            </div>
            {Number(row.recoveredAmount || 0) > 0 && (
              <div className="mt-1 text-xs text-emerald-600">
                {money(row.recoveredAmount)} already recovered
              </div>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => (
          <StatusBadge
            status={value}
            label={value === "pending" ? "Auto recovery active" : undefined}
            dot
          />
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (value, row) => {
          const createdAt = valueOf(
            { value, ...row },
            "value",
            "created_at",
            "createdAt",
          );
          return formatDateTime12Hour(createdAt, "N/A");
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => {
          const status = row.status;
          if (status === "completed") return null;
          return (
            <PermissionGuard
              module="sellers/commissions"
              action={ACTIONS.UPDATE}
              hide
            >
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1"
                onClick={() => openManageRecovery(row)}
              >
                <MdEdit size={15} />
                Manage recovery
              </button>
            </PermissionGuard>
          );
        },
      },
    ],
    [],
  );

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Seller Amounts Owed"
        subtitle="Money sellers owe the platform from collected COD, refunds, chargebacks, or other adjustments. These amounts reduce future payouts until recovered."
        breadcrumbs={[
          { label: "Seller Finance & Payouts" },
          { label: "Seller Amounts Owed" },
        ]}
        actions={
          <button type="button" onClick={fetchBalances}>
            <MdRefresh size={17} /> Refresh
          </button>
        }
      />

      <div className="admin-card mb-4 border-l-4 border-l-blue-500 bg-blue-50/40 p-4 text-sm text-[var(--admin-ink)]">
        <div className="font-semibold">Future-payout recovery is automatic</div>
        <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
          No admin action is needed for normal recovery. Use “Manage recovery” only when payment was received outside the platform or an authorized write-off is required.
        </p>
      </div>

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
        searchPlaceholder="Search settlement ID or seller"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchBalances}
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
        emptyText="No sellers currently owe money to the platform."
        exportConfig={{
          filename: "negative-balances",
          columns,
          data: payload.list,
        }}
      />

      {/* Exception recovery modal */}
      <DefaultModal
        isOpen={action.open}
        onClose={() => setAction(EMPTY_ACTION)}
        title="Manage Recovery Exception"
        onSubmit={prepareAction}
        submitButtonText="Continue"
        closeButtonText="Cancel"
        loading={loading}
      >
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">
              What happened?
            </span>
            <div className="space-y-2">
              {RECOVERY_ACTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="resolveAction"
                    value={opt.value}
                    checked={action.resolveAction === opt.value}
                    onChange={(e) =>
                      setAction((prev) => ({
                        ...prev,
                        resolveAction: e.target.value,
                      }))
                    }
                    className="h-4 w-4 text-blue-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-700">{opt.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500">{opt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {action.resolveAction === "collected_from_seller" && (
            <Input
              labelName="Payment reference ID"
              value={action.referenceId}
              onChange={(e) =>
                setAction((prev) => ({
                  ...prev,
                  referenceId: e.target.value,
                }))
              }
              required
            />
          )}

          <Input
            labelName={action.resolveAction === "platform_write_off" ? "Approved write-off reason" : "Payment note"}
            type="textarea"
            value={action.note}
            onChange={(e) =>
              setAction((prev) => ({ ...prev, note: e.target.value }))
            }
            required
          />
        </div>
      </DefaultModal>

      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false })}
        onConfirm={executeAction}
        title={confirmAction.title}
        message={confirmAction.message}
        variant="warning"
        confirmLabel="Confirm"
        loading={loading}
      />
    </div>
  );
};

export default NegativeBalances;
