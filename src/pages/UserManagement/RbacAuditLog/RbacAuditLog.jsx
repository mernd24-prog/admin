import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DataTable,
  FilterBar,
  PageHeader,
} from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const ACTION_COLORS = {
  grant: "bg-green-100 text-green-700",
  revoke: "bg-red-100 text-red-600",
  role_assign: "bg-blue-100 text-blue-700",
  role_remove: "bg-orange-100 text-orange-700",
  module_add: "bg-teal-100 text-teal-700",
  module_remove: "bg-yellow-100 text-yellow-700",
  template_apply: "bg-purple-100 text-purple-700",
  force_logout: "bg-pink-100 text-pink-700",
  copy_permissions: "bg-indigo-100 text-indigo-700",
};

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "grant", label: "Grant" },
  { value: "revoke", label: "Revoke" },
  { value: "role_assign", label: "Role Assign" },
  { value: "role_remove", label: "Role Remove" },
  { value: "template_apply", label: "Template Apply" },
  { value: "force_logout", label: "Force Logout" },
  { value: "copy_permissions", label: "Copy Permissions" },
];

const EMPTY_FILTERS = {
  targetUserId: "",
  actorId: "",
  action: "",
  moduleSlug: "",
  from: "",
  to: "",
};

const PAGE_SIZE = 50;

const userOptions = (search) =>
  dropdownApi.getUsers({
    keyWord: search,
    searchFields: "full_name,email",
    limit: 20,
  });

const FILTER_FIELDS = [
  {
    key: "action",
    type: "select",
    label: "Action",
    placeholder: "All actions",
    options: ACTION_OPTIONS,
    isSearchable: false,
  },
  {
    key: "moduleSlug",
    type: "text",
    label: "Module",
    placeholder: "e.g. products",
  },
  {
    key: "actorId",
    type: "asyncDropdown",
    label: "Actor",
    placeholder: "Search actor…",
    load: userOptions,
  },
  {
    key: "targetUserId",
    type: "asyncDropdown",
    label: "Target User",
    placeholder: "Search target user…",
    load: userOptions,
  },
  {
    key: "auditDateRange",
    type: "daterange",
    label: "Date Range",
    placeholder: "All date ranges",
    startKey: "from",
    endKey: "to",
  },
];

const personCell = (row, prefix) => {
  const person = row[prefix];
  const name =
    row[`${prefix}Name`] ||
    person?.name ||
    person?.full_name ||
    person?.email ||
    String(row[`${prefix}Id`] || "N/A").slice(0, 14);
  const role = row[prefix === "actor" ? "actorRole" : "targetRole"];

  return (
    <div>
      <div className="text-xs font-medium text-gray-700">{name}</div>
      {role ? (
        <div className="text-[10px] capitalize text-gray-400">{role}</div>
      ) : null}
    </div>
  );
};

const RbacAuditLog = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const params = { page: currentPage, limit: PAGE_SIZE };
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params[key] = value;
        });
        if (search) params.search = search;
        const response = await axiosProvider.get("/rbac/audit-logs", {
          params,
        });
        const data = response.data?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
      } catch {
        toast.error("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [filters, search],
  );

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  const columns = useMemo(
    () => [
      {
        key: "created_at",
        label: "Timestamp",
        render: (value) => (
          <span className="whitespace-nowrap font-mono text-xs text-gray-500">
            {value
              ? new Date(value).toLocaleString("en-IN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "N/A"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        render: (value) => (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTION_COLORS[value] || "bg-gray-100 text-gray-600"}`}
          >
            {value?.replace(/_/g, " ") || "N/A"}
          </span>
        ),
      },
      { key: "actor", label: "Actor", render: (_, row) => personCell(row, "actor") },
      {
        key: "targetUser",
        label: "Target User",
        render: (_, row) => personCell(row, "targetUser"),
      },
      {
        key: "moduleSlug",
        label: "Module / Permission",
        render: (value, row) => (
          <div className="flex items-center gap-1">
            {value ? (
              <span className="rounded bg-[var(--admin-blue)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--admin-blue)]">
                {value}
              </span>
            ) : null}
            {row.permissionSlug ? (
              <span className="font-mono text-[10px] text-gray-500">
                {row.permissionSlug}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "changes",
        label: "Changes",
        render: (_, row) => {
          if (!row.oldValue && !row.newValue) return "N/A";
          const open = expanded === row.id;
          return (
            <div className="min-w-[100px]">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : row.id)}
                className="text-xs font-semibold text-[var(--admin-blue)] hover:underline"
              >
                {open ? "Hide changes" : "View changes"}
              </button>
              {open ? (
                <div className="mt-2 grid min-w-[360px] grid-cols-2 gap-2">
                  {[row.oldValue, row.newValue].map((value, index) =>
                    value ? (
                      <pre
                        key={index}
                        className="max-h-40 overflow-auto rounded border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-2 text-[10px]"
                      >
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [expanded],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="RBAC Audit Log"
        subtitle="Track all permission grants, revocations, role changes, and force logouts"
        breadcrumbs={[{ label: "Users & Access" }, { label: "RBAC Audit Log" }]}
      />

      <DataTable
        columns={columns}
        data={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={(nextPage) => {
          setPage(nextPage);
          load(nextPage);
        }}
        onSearch={setSearch}
        searchPlaceholder="Search audit logs…"
        rowKey={(row) => row.id}
        showSerialNumber={false}
        emptyMessage="No audit log entries found"
        filterBar={
          <FilterBar
            fields={FILTER_FIELDS}
            values={filters}
            loading={loading}
            onChange={(key, value) =>
              setFilters((current) => ({ ...current, [key]: value }))
            }
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        }
      />
    </div>
  );
};

export default RbacAuditLog;
