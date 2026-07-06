/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { MdRefresh, MdVisibility, MdAccountBalanceWallet } from "react-icons/md";
import { toast } from "sonner";
import { PageHeader, DataTable } from "../../../components/Shared";
import { getWalletTransactions } from "../../../Redux/adminCoreSlice";

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  return root.list || root.items || root.rows || [];
};

const extractSummary = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  return root.summary || {};
};

const parseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return `₹${numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const titleCase = (value = "") =>
  String(value || "-").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const COLUMNS = [
  { key: "id", label: "Transaction ID", render: (v) => <span className="font-mono text-xs">{v || "—"}</span> },
  { key: "userLabel", label: "User", render: (v, row) => {
    const name = v || row?.user?.name || row?.user?.email || row?.userName;
    return name ? <span className="text-sm">{name}</span> : <span className="font-mono text-xs text-gray-400">{row?.user_id ? String(row.user_id).slice(0, 12) + "…" : "—"}</span>;
  } },
  {
    key: "created_at",
    label: "Date",
    render: (v, row) => {
      const ts = v || row?.createdAt;
      return <span className="text-xs text-gray-500">{ts ? new Date(ts).toLocaleString() : "—"}</span>;
    },
  },
  {
    key: "amount",
    label: "Credit",
    render: (v, row) => String(row?.type || "").toLowerCase() === "credit" ? <span className="text-green-600 font-mono text-sm">{formatCurrency(v)}</span> : <span className="text-gray-300">—</span>,
  },
  {
    key: "amount_debit",
    label: "Debit",
    render: (_, row) => String(row?.type || "").toLowerCase() !== "credit" ? <span className="text-red-500 font-mono text-sm">{formatCurrency(row.amount)}</span> : <span className="text-gray-300">—</span>,
  },
  {
    key: "description",
    label: "Description",
    render: (_, row) => {
      const meta = parseMetadata(row?.metadata);
      const desc = meta.description || meta.reason || meta.method || [row?.reference_type, row?.reference_id].filter(Boolean).join(" #") || "—";
      return <span className="text-xs text-gray-600 max-w-[200px] truncate block">{desc}</span>;
    },
  },
  {
    key: "status",
    label: "Status",
    render: (v) => <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-600 font-medium">{titleCase(v)}</span>,
  },
];

const UsersTransactions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const adminCoreSelector = useSelector((state) => state.adminCore);

  const [apiRes, setApiRes] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({ search: "", type: "", status: "" });

  const isRefundView = location.pathname.includes("/refunds");
  const loading = adminCoreSelector?.loading;

  const loadTransactions = async (nextFilters = filters) => {
    try {
      const response = await dispatch(
        getWalletTransactions({ ...nextFilters, referenceType: isRefundView ? "return_refund" : "", limit: 100 })
      ).unwrap();
      setApiRes(extractList(response));
      setSummary(extractSummary(response));
    } catch (error) {
      toast.error(error?.message || "Failed to load transactions");
    }
  };

  useEffect(() => { loadTransactions(); }, [isRefundView]);

  const metrics = useMemo(() => [
    { label: "Credits", value: formatCurrency(summary.creditAmount) },
    { label: "Debits", value: formatCurrency(summary.debitAmount) },
    { label: "Held", value: formatCurrency(summary.heldAmount) },
  ], [summary]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const rowActions = (row) => [
    {
      label: "View",
      icon: <MdVisibility size={14} />,
      onClick: () => navigate(`/app/transactions/view/${encodeURIComponent(row?.id)}`),
    },
  ];

  return (
    <div className="px-4 sm:px-0">
      <PageHeader
        title={isRefundView ? "Refund Transactions" : "Users Transactions"}
        subtitle="View wallet and payment transactions"
        breadcrumbs={[{ label: "User Management" }, { label: isRefundView ? "Refunds" : "Transactions" }]}
        actions={
          <button
            type="button"
            onClick={() => loadTransactions()}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-800">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          className="flex-1 min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
          placeholder="Search user, reference, transaction..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
        <select
          className="min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
          value={filters.type}
          onChange={(e) => updateFilter("type", e.target.value)}
        >
          <option value="">All Types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <select
          className="min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="held">Held</option>
          <option value="released">Released</option>
        </select>
        <button
          type="button"
          onClick={() => loadTransactions()}
          className="min-h-[38px] px-4 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)]"
        >
          Apply
        </button>
      </div>

      <DataTable
        columns={COLUMNS}
        data={apiRes}
        loading={loading}
        totalCount={apiRes.length}
        rowActions={rowActions}
        searchPlaceholder="Search transactions…"
        emptyText="No transactions found."
        emptyIcon={<MdAccountBalanceWallet size={40} className="text-gray-200" />}
        requiredModule="users"
      />
    </div>
  );
};

export default UsersTransactions;
