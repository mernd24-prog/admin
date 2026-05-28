import React, { useEffect, useState } from "react";
import { PageHeader, DataTable } from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";

const ACTION_BADGE = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-600",
  delete: "bg-red-100 text-red-600",
  login: "bg-purple-100 text-purple-600",
  logout: "bg-gray-100 text-gray-500",
  approve: "bg-yellow-100 text-yellow-700",
  reject: "bg-orange-100 text-orange-600",
};

const COLUMNS = [
  {
    key: "createdAt",
    label: "Timestamp",
    sortable: true,
    render: (v) =>
      v
        ? new Date(v).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—",
  },
  {
    key: "actor",
    label: "User",
    render: (_, row) => (
      <div>
        <div className="font-medium text-gray-700 text-xs">
          {row.actorName || "—"}
        </div>
        <div className="text-[10px] text-gray-400">{row.actorRole || ""}</div>
      </div>
    ),
  },
  {
    key: "action",
    label: "Action",
    render: (v) => (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${ACTION_BADGE[v?.toLowerCase()] || "bg-gray-100 text-gray-500"}`}
      >
        {v || "—"}
      </span>
    ),
  },
  {
    key: "module",
    label: "Module",
    render: (v) => (
      <span className="text-xs text-gray-600 capitalize">{v || "—"}</span>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (v) => (
      <span className="text-xs text-gray-500 line-clamp-2">{v || "—"}</span>
    ),
  },
  {
    key: "ip",
    label: "IP",
    render: (v) => (
      <span className="font-mono text-xs text-gray-400">{v || "—"}</span>
    ),
  },
];

const ACTION_FILTERS = [
  "all",
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "approve",
  "reject",
];

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axiosProvider.get("/admin/access/activity-logs", {
          params: {
            page,
            limit: 30,
            search,
            action: actionFilter !== "all" ? actionFilter : undefined,
          },
        });
        const data = res.data?.data;
        setLogs(Array.isArray(data) ? data : data?.logs || []);
        setTotal(res.data?.meta?.total || data?.total || 0);
      } catch {
        // Endpoint may not exist yet — show empty state gracefully
        setLogs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page, search, actionFilter]);

  return (
    <div className=" max-w-7xl mx-auto p-6">
      <PageHeader
        title="Activity Logs"
        subtitle="Audit trail of all admin actions"
        breadcrumbs={[{ label: "Users & Access" }, { label: "Activity Logs" }]}
      />

      {/* Action filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setActionFilter(f);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${actionFilter === f ? "bg-[#082f91] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#082f91]"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable
        columns={COLUMNS}
        data={logs}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={30}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        searchPlaceholder="Search by user, module, or description…"
        emptyText="No activity logs found for the selected filters."
        rowKey={(row) =>
          row._id || row.id || `${row.createdAt}-${row.action}-${row.ip}`
        }
        requiredModule="rbac"
        exportConfig={{ filename: "activity-logs", columns: COLUMNS }}
      />
    </div>
  );
};

export default ActivityLogs;
