/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdRefresh } from "react-icons/md";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { getWalletTransactions } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const TRANSACTION_TYPES = ["credit", "debit"];
const TRANSACTION_STATUSES = ["held", "completed", "released"];

const TYPE_COLOR = {
  credit: "green",
  debit: "red",
};

const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Search", width: "w-56" },
  {
    key: "userId",
    type: "asyncDropdown",
    label: "Buyer",
    width: "w-52",
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  {
    key: "type",
    type: "select",
    label: "Type",
    options: TRANSACTION_TYPES.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: TRANSACTION_STATUSES.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
  },
  { key: "referenceType", type: "text", label: "Ref. Type", width: "w-40" },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.transactions || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY, h:mm A") : "—");

const typeColorClass = (v) => {
  const c = TYPE_COLOR[v];
  if (c === "green") return "bg-green-100 text-green-700";
  if (c === "red") return "bg-red-100 text-red-700";
  if (c === "blue") return "bg-blue-100 text-blue-700";
  if (c === "orange") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-600";
};

const COLUMNS = [
  {
    key: "id",
    label: "Transaction ID",
    render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-12)}</span>,
  },
  {
    key: "userId",
    label: "User",
    render: (v, row) => (
      <span className="text-sm">
        {row.userName || row.user?.fullName || row.user?.name || row.user?.email || String(v || row.user_id || "—").slice(-8)}
      </span>
    ),
  },
  {
    key: "type",
    label: "Type",
    render: (v) => (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeColorClass(v)}`}>
        {v || "—"}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Amount",
    render: (v, row) => {
      const isDebit = ["debit", "payout"].includes(row.type);
      return (
        <span className={`text-sm font-semibold ${isDebit ? "text-red-600" : "text-green-700"}`}>
          {isDebit ? "−" : "+"}₹{Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (v) => <StatusBadge status={v} />,
  },
  {
    key: "referenceType",
    label: "Reference Type",
    render: (v, row) => <span className="text-xs capitalize text-gray-600">{String(v || row.reference_type || "—").replace(/_/g, " ")}</span>,
  },
  {
    key: "referenceId",
    label: "Reference ID",
    render: (v, row) => {
      const referenceId = v || row.reference_id;
      return <span className="font-mono text-xs text-gray-500">{referenceId ? String(referenceId).slice(-12) : "—"}</span>;
    },
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (v, row) => <span className="text-xs text-gray-500">{fmt(v || row.created_at)}</span>,
  },
];

const WalletTransactions = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.walletTransactionsData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getWalletTransactions({
          ...params,
          offset: ((params.page || 1) - 1) * (params.limit || 20),
        })
      ).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load wallet transactions";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <PermissionGuard module="wallets" action={ACTIONS.VIEW}>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          title="Wallet Transactions"
          subtitle="Platform-wide wallet credits, debits, cashbacks, refunds, and adjustments"
          breadcrumbs={[
            { label: "Home", to: "/app/home" },
            { label: "Payments & Finance" },
            { label: "Wallet Transactions" },
          ]}
          actions={
            <button
              type="button"
              onClick={fetchTransactions}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              <MdRefresh size={16} /> Refresh
            </button>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
            <button
              type="button"
              onClick={fetchTransactions}
              className="ml-4 underline text-red-700 hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <Loader />
        ) : (
          <DataTable
            columns={COLUMNS}
            data={payload.list}
            totalCount={payload.total || payload.list.length}
            page={list.page}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            onSearch={list.setSearch}
            searchPlaceholder="Search transaction ID, user, reference, or metadata"
            onSort={list.setSort}
            sortKey={list.sortKey}
            sortDir={list.sortDir}
            filterBar={(
              <FilterBar
                filters={FILTER_FIELDS}
                values={list.filters}
                onChange={list.setFilter}
                onClear={list.clearFilters}
                loading={loading}
                activeCount={list.activeFilterCount}
              />
            )}
            emptyText="No wallet transactions found"
          />
        )}
      </div>
    </PermissionGuard>
  );
};

export default WalletTransactions;
