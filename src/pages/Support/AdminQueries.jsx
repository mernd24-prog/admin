import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MdRefresh, MdVisibility } from "react-icons/md";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import { DataTable, PageHeader, StatusBadge, UserLink } from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  categoryLabel,
  formatDateTime,
  getPaginationTotal,
  statusLabel,
  SUPPORT_STATUSES,
} from "./supportUtils";

import { isSellerPanel } from "../../_helpers/panelConfig";

const TABS = [
  { key: "customer", label: "Customer Queries" },
  { key: "seller", label: "Seller Queries" },
];

const AdminQueries = () => {
  const [activeTab, setActiveTab] = useState("customer");
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "", adminNotes: "" });
  const [savingStatus, setSavingStatus] = useState(false);
  const isSeller = isSellerPanel();

  const fetchQueries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axiosProvider.get(ENDPOINTS.support.adminList, {
        params: {
          user_type: activeTab,
          search: search || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      });
      const payload = response?.data || {};
      const list = Array.isArray(payload?.data) ? payload.data : [];
      setQueries(list);
      setTotal(getPaginationTotal(payload, list.length));
    } catch (requestError) {
      const message = requestError?.message || "Failed to load support queries";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, search]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const openQuery = useCallback(async (query) => {
    setSelectedQuery(query);
    setStatusForm({ status: query.status || "pending", adminNotes: query.adminNotes || "" });
    try {
      setDetailLoading(true);
      const response = await axiosProvider.get(ENDPOINTS.support.adminDetail(query.queryId));
      const detail = response?.data?.data || query;
      setSelectedQuery(detail);
      setStatusForm({ status: detail.status || "pending", adminNotes: detail.adminNotes || "" });
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to load query details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async () => {
    if (!selectedQuery?.queryId) return;
    try {
      setSavingStatus(true);
      const response = await axiosProvider.patch(
        ENDPOINTS.support.adminStatus(selectedQuery.queryId),
        statusForm,
      );
      const updated = response?.data?.data || selectedQuery;
      setSelectedQuery(updated);
      setStatusForm({ status: updated.status || "pending", adminNotes: updated.adminNotes || "" });
      toast.success("Query status updated");
      await fetchQueries();
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to update query status");
    } finally {
      setSavingStatus(false);
    }
  }, [fetchQueries, selectedQuery, statusForm]);

  const columns = useMemo(() => [
    {
      key: "queryId",
      label: "Query ID",
      render: (value) => <span className="font-semibold text-[var(--admin-ink)]">{value}</span>,
    },
  {
  key: "userName",
  label: "User Name",
  render: (value, row) => {
    return (
      <div>
        {isSeller ? (
          <span className="font-medium text-[var(--admin-ink)]">
            {value || "N/A"}
          </span>
        ) : (
          <UserLink
            userId={row.userId}
            userName={value}
          />
        )}

        {row.userEmail ? (
          <div className="text-xs text-[var(--admin-muted)]">
            {row.userEmail}
          </div>
        ) : null}
      </div>
    );
  },
},
    {
      key: "userType",
      label: "User Type",
      render: (value) => <span className="capitalize">{value}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (value) => categoryLabel(value),
    },
   {
  key: "messagePreview",
  label: "Message Preview",
  className: "w-[250px] max-w-[250px]",
  render: (value, row) => (
    <div className="w-[200px] max-w-[200px] overflow-hidden">
      <div className="truncate font-medium text-[var(--admin-ink)]">
        {row.subject || "N/A"}
      </div>

      <div className="truncate text-xs text-[var(--admin-muted)]">
        {value || row.message || "No message"}
      </div>
    </div>
  ),
},
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} label={statusLabel(value)} dot />,
    },
    {
      key: "createdAt",
      label: "Created Date",
      render: (value) => formatDateTime(value),
    },
  ], []);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Queries"
        subtitle="Customer and seller support queries are listed separately."
        actions={
          <button
            type="button"
            className="inline-flex min-h-[38px] items-center gap-2 rounded-md bg-[var(--admin-gold)] px-4 text-sm font-semibold text-[var(--admin-navy)] transition hover:bg-[var(--admin-gold-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={fetchQueries}
            disabled={loading}
          >
            <MdRefresh size={18} /> Refresh
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-[var(--admin-gold)] bg-[var(--admin-gold)] text-[var(--admin-navy)]"
                : "border-[var(--admin-line)] bg-white text-[var(--admin-ink)] hover:border-[var(--admin-gold)] hover:bg-[var(--admin-gold-soft)]"
            }`}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
              setSearch("");
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={queries}
        loading={loading}
        error={error}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onRefresh={fetchQueries}
        searchPlaceholder={`Search ${activeTab} queries`}
        rowKey="queryId"
        emptyText={`No ${activeTab} queries found.`}
        onRowClick={openQuery}
        rowActions={(row) => [
          {
            label: "View",
            icon: <MdVisibility />,
            onClick: () => openQuery(row),
          },
        ]}
      />

      <DefaultModal
        isOpen={Boolean(selectedQuery)}
        onClose={() => setSelectedQuery(null)}
        onSubmit={updateStatus}
        title={selectedQuery?.queryId ? `Query ${selectedQuery.queryId}` : "Query Details"}
        submitButtonText="Update Status"
        closeButtonText="Close"
        loading={savingStatus}
      >
        {detailLoading ? (
          <div className="py-10 text-center text-sm text-[var(--admin-muted)]">Loading query details...</div>
        ) : selectedQuery ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4 text-sm sm:grid-cols-2">
              <Info label="User" value={selectedQuery.userName || "N/A"} />
              <Info label="User Type" value={selectedQuery.userType || "N/A"} />
              <Info label="Email" value={selectedQuery.userEmail || "N/A"} />
              <Info label="Phone" value={selectedQuery.userPhone || "N/A"} />
              {selectedQuery.userType === "seller" ? (
                <Info label="Organization" value={selectedQuery.sellerOrganizationName || selectedQuery.sellerOrganizationId || "N/A"} />
              ) : null}
              <Info label="Created" value={formatDateTime(selectedQuery.createdAt)} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Category</p>
              <p className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">{categoryLabel(selectedQuery.category)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Subject</p>
              <p className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">{selectedQuery.subject}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Message</p>
              <p className="mt-2 whitespace-pre-wrap rounded-md border border-[var(--admin-line)] bg-white p-3 text-sm leading-6 text-[var(--admin-ink)]">
                {selectedQuery.message}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[var(--admin-ink)]">
                Status
                <select
                  className="mt-1 w-full rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 text-sm"
                  value={statusForm.status}
                  onChange={(event) => setStatusForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {SUPPORT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-semibold text-[var(--admin-ink)]">
              Admin Notes
              <textarea
                className="mt-1 min-h-[110px] w-full rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 text-sm"
                value={statusForm.adminNotes}
                onChange={(event) => setStatusForm((prev) => ({ ...prev, adminNotes: event.target.value }))}
                placeholder="Optional internal note"
              />
            </label>
          </div>
        ) : null}
      </DefaultModal>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">{label}</p>
    <p className="mt-1 break-words text-sm text-[var(--admin-ink)]">{value}</p>
  </div>
);

export default AdminQueries;
