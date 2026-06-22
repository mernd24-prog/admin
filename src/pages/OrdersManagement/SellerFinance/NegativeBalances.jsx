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
  getNegativeBalances,
  resolveNegativeBalance,
} from "../../../Redux/sellerCommissionsSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const NEGATIVE_BALANCE_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "completed",
];

const RESOLVE_ACTIONS = [
  {
    value: "offset_future_payout",
    label: "Offset from future payouts",
  },
  {
    value: "collected_from_seller",
    label: "Collected directly from seller",
  },
  {
    value: "platform_write_off",
    label: "Platform write-off",
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
    options: NEGATIVE_BALANCE_STATUSES.map((value) => ({
      value,
      label: value.replace(/_/g, " "),
    })),
  },
  { key: "search", type: "text", label: "Search", width: "w-52" },
];

const EMPTY_ACTION = {
  open: false,
  settlement: null,
  resolveAction: "offset_future_payout",
  referenceId: "",
  note: "",
};

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.items || data?.list || data || [],
    total: Number(
      data?.total || data?.items?.length || data?.list?.length || 0
    ),
  };
};

const money = (value) => `INR ${Number(value || 0).toFixed(2)}`;
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
        })
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

  const openResolve = (row) => {
    setAction({
      ...EMPTY_ACTION,
      open: true,
      settlement: row,
    });
  };

  const validateAction = () => {
    if (!settlementId(action.settlement)) return "Settlement ID is missing";
    if (!action.note.trim()) return "Note is required";
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
      title: "Resolve Negative Balance?",
      message: `This will resolve the negative balance for settlement ${settlementId(action.settlement)}.`,
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
        })
      ).unwrap();
      toast.success("Negative balance recovery updated");
      setAction(EMPTY_ACTION);
      setConfirmAction({ open: false });
      await fetchBalances();
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          requestError ||
          "Failed to resolve negative balance"
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
            row.sellerName ||
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
        key: "negativeAmount",
        label: "Negative Amount",
        sortable: true,
        render: (value, row) =>
          money(value || row.balance || row.net_amount || row.amount),
      },
      {
        key: "resolvedAmount",
        label: "Resolved",
        sortable: false,
        render: (value) => (value != null ? money(value) : "—"),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusBadge status={value} dot />,
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
          if (status === "completed") return null;
          return (
            <PermissionGuard module="sellers" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1"
                onClick={() => openResolve(row)}
              >
                Resolve
              </button>
            </PermissionGuard>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Loader loading={loading} />
      <PageHeader
        title="Negative Balances"
        subtitle="Review and resolve seller accounts with negative payout balances"
        breadcrumbs={[
          { label: "Seller Finance & Payouts" },
          { label: "Negative Balances" },
        ]}
        actions={
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={fetchBalances}
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
        requiredModule="sellers"
        exportConfig={{
          filename: "negative-balances",
          columns,
          data: payload.list,
        }}
      />

      {/* Resolve modal */}
      <DefaultModal
        isOpen={action.open}
        onClose={() => setAction(EMPTY_ACTION)}
        title="Resolve Negative Balance"
        onSubmit={prepareAction}
        submitButtonText="Continue"
        closeButtonText="Cancel"
        loading={loading}
      >
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">
              Resolution Action
            </span>
            <div className="space-y-2">
              {RESOLVE_ACTIONS.map((opt) => (
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
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Input
            labelName="Reference ID (optional)"
            value={action.referenceId}
            onChange={(e) =>
              setAction((prev) => ({
                ...prev,
                referenceId: e.target.value,
              }))
            }
          />

          <Input
            labelName="Note"
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
