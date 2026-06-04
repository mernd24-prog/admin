/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { MdRefresh, MdVisibility } from "react-icons/md";
import { toast } from "react-toastify";
import TableData from "../../../components/Atoms/TableData/TableData";
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
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return `₹${numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const titleCase = (value = "") =>
  String(value || "-").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const UsersTransactions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const adminCoreSelector = useSelector((state) => state.adminCore);

  const [apiRes, setApiRes] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
  });

  const isRefundView = location.pathname.includes("/refunds");

  const loadTransactions = async (nextFilters = filters) => {
    try {
      const response = await dispatch(
        getWalletTransactions({
          ...nextFilters,
          referenceType: isRefundView ? "return_refund" : "",
          limit: 100,
        }),
      ).unwrap();
      setApiRes(extractList(response));
      setSummary(extractSummary(response));
    } catch (error) {
      toast.error(error?.message || "Failed to load transactions");
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [isRefundView]);

  const loading = adminCoreSelector?.loading;

  const tableHeadings = [
    "Transaction ID",
    "User",
    "Date",
    "Credit",
    "Debit",
    "Description",
    "Status",
    "Action",
  ];

  const tableRows = apiRes?.map((item) => {
    const metadata = parseMetadata(item?.metadata);
    const amount = Number(item?.amount || 0);
    const isCredit = String(item?.type || "").toLowerCase() === "credit";
    const timestamp = item?.created_at || item?.createdAt;
    const description = metadata.description ||
      metadata.reason ||
      metadata.method ||
      [item?.reference_type, item?.reference_id].filter(Boolean).join(" #") ||
      "-";

    return [
      item?.id || "-",
      item?.userLabel || item?.user?.name || item?.user_id || "-",
      timestamp ? new Date(timestamp).toLocaleString() : "-",
      isCredit ? formatCurrency(amount) : formatCurrency(0),
      !isCredit ? formatCurrency(amount) : formatCurrency(0),
      description,
      <span
        className="p-1 bg-sky-100 text-sky-600"
        key={`status-${item?.id}`}
      >
        {titleCase(item?.status)}
      </span>,
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-1 text-[#2f6fed] transition hover:bg-[#f3f6ff]"
        onClick={() => navigate(`/app/transactions/view/${encodeURIComponent(item?.id)}`)}
        aria-label="View payment detail"
      >
        <MdVisibility size={20} />
      </button>,
    ];
  });

  const metrics = useMemo(() => [
    { label: "Credits", value: formatCurrency(summary.creditAmount) },
    { label: "Debits", value: formatCurrency(summary.debitAmount) },
    { label: "Held", value: formatCurrency(summary.heldAmount) },
  ], [summary]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-[#E6E6E6] bg-white p-4">
              <p className="text-xs font-medium text-[#65718b]">{metric.label}</p>
              <p className="mt-1 text-xl font-semibold text-[#202337]">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#E6E6E6] bg-white p-3 md:flex-row md:items-center">
          <input
            className="min-h-[38px] flex-1 rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]"
            placeholder="Search user, reference, transaction..."
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
          <select
            className="min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]"
            value={filters.type}
            onChange={(event) => updateFilter("type", event.target.value)}
          >
            <option value="">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select
            className="min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="held">Held</option>
            <option value="released">Released</option>
          </select>
          <button
            type="button"
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md bg-[#2f6fed] px-4 text-sm font-medium text-white transition hover:bg-[#255bd1]"
            onClick={() => loadTransactions()}
          >
            <MdRefresh size={18} /> Refresh
          </button>
        </div>
        <div className=" overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]">
          <TableData
            Heading={isRefundView ? "Refund Transactions" : "Users Transactions"}
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder="Search by transaction..."
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isLoading={loading}
          />
        </div>
      </div>
    </>
  );
};

export default UsersTransactions;
