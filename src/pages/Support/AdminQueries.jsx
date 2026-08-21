import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MdCheckCircle, MdDelete, MdVisibility } from "react-icons/md";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import {
  BulkActionBar,
  ConfirmModal,
  DataTable,
  PageHeader,
  StatusBadge,
  UserLink,
} from "../../components/Shared";
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
import { ACTIONS } from "../../_helpers/usePermission";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";
import { QueryDetailsSkeleton } from "../../components/Loader/SkeletonLoader";

const TABS = [
  { key: "customer", label: "Customer Queries" },
  { key: "seller", label: "Seller Queries" },
];

const getStatusHistory = (query = {}) =>
  Array.isArray(query.statusHistory)
    ? query.statusHistory
    : Array.isArray(query.metadata?.statusHistory)
      ? query.metadata.statusHistory
      : [];

const getConversationItems = (query = {}) => {
  const userLabel = query.userType === "seller" ? "Seller message" : "Customer message";
  const items = [
    {
      key: "user-message",
      type: "user",
      title: userLabel,
      message: query.message || query.messagePreview || "N/A",
      status: query.status || "pending",
      timestamp: query.createdAt,
    },
  ];

  const followUpMessages = Array.isArray(query.messages)
    ? query.messages
    : Array.isArray(query.metadata?.messages)
      ? query.metadata.messages
      : [];

  followUpMessages.forEach((item, index) => {
    const senderType = item.senderType === "seller" ? "Seller" : item.senderType === "customer" ? "Customer" : "Support";
    items.push({
      key: `reply-${item.createdAt || index}`,
      type: item.senderType === "admin" ? "admin" : "user",
      title: `${senderType} reply`,
      message: item.message || "",
      status: query.status || "pending",
      timestamp: item.createdAt,
    });
  });

  getStatusHistory(query).forEach((item, index) => {
    items.push({
      key: `admin-history-${item.changedAt || index}`,
      type: "admin",
      title: `Admin updated status to ${statusLabel(item.status)}`,
      message: item.note || "",
      status: item.status,
      timestamp: item.changedAt,
    });
  });

  const hasLatestNote = String(query.adminNotes || "").trim();
  const latestNoteAlreadyIncluded = items.some(
    (item) => item.type === "admin" && item.message.trim() === hasLatestNote,
  );

  if (hasLatestNote && !latestNoteAlreadyIncluded) {
    items.push({
      key: "admin-latest-note",
      type: "admin",
      title: "Latest admin note",
      message: hasLatestNote,
      status: query.status || "pending",
      timestamp: query.lastStatusChangedAt || query.updatedAt,
    });
  }

  return items.sort((first, second) => {
    const firstTime = new Date(first.timestamp || 0).getTime();
    const secondTime = new Date(second.timestamp || 0).getTime();
    return firstTime - secondTime;
  });
};

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
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
      setSelectedKeys((keys) =>
        keys.filter((key) => list.some((query) => query.queryId === key)),
      );
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
    setStatusForm({
      status: query.status || "pending",
      adminNotes: "",
    });
    try {
      setDetailLoading(true);
      const response = await axiosProvider.get(
        ENDPOINTS.support.adminDetail(query.queryId),
      );
      const detail = response?.data?.data || query;
      setSelectedQuery(detail);
      setStatusForm({
        status: detail.status || "pending",
        adminNotes: "",
      });
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
      setStatusForm({
        status: updated.status || "pending",
        adminNotes: "",
      });
      toast.success("Query status updated");
      await fetchQueries();
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to update query status");
    } finally {
      setSavingStatus(false);
    }
  }, [fetchQueries, selectedQuery, statusForm]);

  const markResolved = useCallback(async (query, adminNotes = query?.adminNotes || "") => {
    if (!query?.queryId || query.status === "resolved") return;
    try {
      setSavingStatus(true);
      const response = await axiosProvider.patch(
        ENDPOINTS.support.adminStatus(query.queryId),
        {
          status: "resolved",
          adminNotes,
        },
      );
      const updated = response?.data?.data || query;
      if (selectedQuery?.queryId === query.queryId) {
        setSelectedQuery(updated);
        setStatusForm({
          status: updated.status || "resolved",
          adminNotes: "",
        });
      }
      toast.success("Query marked as resolved");
      await fetchQueries();
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to mark query as resolved");
    } finally {
      setSavingStatus(false);
    }
  }, [fetchQueries, selectedQuery]);

  const deleteQuery = useCallback(async () => {
    if (!deleteTarget?.queryId) return;
    try {
      setDeleteLoading(true);
      await axiosProvider.delete(ENDPOINTS.support.adminDelete(deleteTarget.queryId));
      toast.success("Query deleted");
      if (selectedQuery?.queryId === deleteTarget.queryId) {
        setSelectedQuery(null);
      }
      setSelectedKeys((keys) => keys.filter((key) => key !== deleteTarget.queryId));
      setDeleteTarget(null);
      await fetchQueries();
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to delete query");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchQueries, selectedQuery]);

  const deleteSelectedQueries = useCallback(async () => {
    if (!selectedKeys.length) return;
    try {
      setDeleteLoading(true);
      const response = await axiosProvider.delete(
        ENDPOINTS.support.adminBulkDelete,
        { data: { queryIds: selectedKeys } },
      );
      const deletedCount = response?.data?.data?.deletedCount || selectedKeys.length;
      toast.success(`${deletedCount} quer${deletedCount === 1 ? "y" : "ies"} deleted`);
      if (selectedQuery?.queryId && selectedKeys.includes(selectedQuery.queryId)) {
        setSelectedQuery(null);
      }
      setBulkDeleteOpen(false);
      setSelectedKeys([]);
      await fetchQueries();
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to delete selected queries");
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchQueries, selectedKeys, selectedQuery]);

  const columns = useMemo(
    () => [
      {
        key: "queryId",
        label: "Query ID",
        render: (value) => (
          <span className="font-semibold text-[var(--admin-ink)]">{value}</span>
        ),
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
                <UserLink userId={row.userId} userName={value} />
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
        render: (value) => (
          <StatusBadge status={value} label={statusLabel(value)} dot />
        ),
      },
      {
        key: "createdAt",
        label: "Created Date",
        render: (value) => formatDateTime(value),
      },
    ],
    [isSeller],
  );

  return (
    <div>
      <PageHeader
        title="Queries"
        subtitle="Customer and seller support queries are listed separately."
        breadcrumbs={[{ label: "Support" }, { label: "Queries" }]}
        // actions={
        //   <button
        //     type="button"
        //     className="inline-flex min-h-[38px] items-center gap-2 rounded-md bg-[var(--admin-gold)] px-4 text-sm font-semibold text-[var(--admin-navy)] transition hover:bg-[var(--admin-gold-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        //     onClick={fetchQueries}
        //     disabled={loading}
        //   >
        //     <MdRefresh size={18} /> Refresh
        //   </button>
        // }
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
              setSelectedKeys([]);
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
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        bulkActionBar={
          <BulkActionBar
            selectedCount={selectedKeys.length}
            totalCount={queries.length}
            onClear={() => setSelectedKeys([])}
            onSelectAll={() =>
              setSelectedKeys(queries.map((row) => row.queryId).filter(Boolean))
            }
            module="queries"
            loading={loading || deleteLoading}
            actions={[
              {
                label: "Delete Selected",
                icon: <MdDelete />,
                action: ACTIONS.DELETE,
                variant: "danger",
                onClick: () => setBulkDeleteOpen(true),
              },
            ]}
          />
        }
        rowActions={(row) => [
          {
            label: "View",
            icon: <MdVisibility />,
            onClick: () => openQuery(row),
          },
          ...(row.status !== "resolved"
            ? [
                {
                  label: "Mark as Resolved",
                  icon: <MdCheckCircle className="text-green-600" />,
                  onClick: () => markResolved(row),
                },
              ]
            : []),
          {
            label: "Delete Query",
            icon: <MdDelete className="text-red-600" />,
            danger: true,
            onClick: () => setDeleteTarget(row),
          },
        ]}
      />

      <DefaultModal
        isOpen={Boolean(selectedQuery)}
        onClose={() => setSelectedQuery(null)}
        onSubmit={updateStatus}
        title={
          selectedQuery?.queryId
            ? `Query ${selectedQuery.queryId}`
            : "Query Details"
        }
        submitButtonText="Update Status"
        closeButtonText="Close"
        loading={savingStatus}
      >
        {detailLoading ? (
          <QueryDetailsSkeleton />
        ) : selectedQuery ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4 text-sm sm:grid-cols-2">
              <Info label="User" value={selectedQuery.userName || "N/A"} />
              <Info label="User Type" value={selectedQuery.userType || "N/A"} />
              <Info label="Email" value={selectedQuery.userEmail || "N/A"} />
              <Info label="Phone" value={selectedQuery.userPhone || "N/A"} />
              {selectedQuery.userType === "seller" ? (
                <Info
                  label="Organization"
                  value={
                    selectedQuery.sellerOrganizationName ||
                    selectedQuery.sellerOrganizationId ||
                    "N/A"
                  }
                />
              ) : null}
              <Info
                label="Created"
                value={formatDateTime(selectedQuery.createdAt)}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Category
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">
                {categoryLabel(selectedQuery.category)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Subject
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">
                {selectedQuery.subject}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Ticket Conversation
              </p>
              <div className="mt-3 space-y-3">
                {getConversationItems(selectedQuery).map((item) => {
                  const isAdminMessage = item.type === "admin";
                  return (
                    <div
                      key={item.key}
                      className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-md border px-3 py-2 text-sm shadow-sm ${
                          isAdminMessage
                            ? "border-[var(--admin-blue)] bg-[var(--admin-blue)] text-white"
                            : "border-[var(--admin-line)] bg-white text-[var(--admin-ink)]"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-semibold ${isAdminMessage ? "text-white" : "text-[var(--admin-ink)]"}`}>
                            {item.title}
                          </span>
                          {isAdminMessage ? (
                            <StatusBadge status={item.status} label={statusLabel(item.status)} dot />
                          ) : null}
                        </div>
                        <p className={`whitespace-pre-wrap leading-6 ${isAdminMessage ? "text-white" : "text-[var(--admin-ink)]"}`}>
                          {item.message || "No note added."}
                        </p>
                        <p className={`mt-1 text-[11px] ${isAdminMessage ? "text-white/80" : "text-[var(--admin-muted)]"}`}>
                          {formatDateTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label="Status"
                options={SUPPORT_STATUSES}
                value={
                  SUPPORT_STATUSES.find(
                    (item) => item.value === statusForm.status,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setStatusForm((prev) => ({
                    ...prev,
                    status: selectedOption?.value || "",
                  }))
                }
                isSearchable={false}
                isClearable={false}
              />
              {statusForm.status !== "resolved" ? (
                <div className="flex items-end">
                  <button
                    type="button"
                    className="inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-md border border-green-600 px-4 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => markResolved(selectedQuery, statusForm.adminNotes)}
                    disabled={savingStatus}
                  >
                    <MdCheckCircle size={18} />
                    Mark as Resolved
                  </button>
                </div>
              ) : null}
            </div>


            <label className="block text-sm font-semibold text-[var(--admin-ink)]">
              New Admin Note
              <textarea
                className="mt-1 min-h-[110px] w-full rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 text-sm focus:outline-none"
                value={statusForm.adminNotes}
                onChange={(event) =>
                  setStatusForm((prev) => ({
                    ...prev,
                    adminNotes: event.target.value,
                  }))
                }
                placeholder="Add a new note for this status update"
              />
            </label>

          </div>
        ) : null}
      </DefaultModal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Query"
        message={`Are you sure you want to delete ${deleteTarget?.queryId || "this query"}? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={deleteQuery}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title="Delete Selected Queries"
        message={`Are you sure you want to delete ${selectedKeys.length} selected quer${selectedKeys.length === 1 ? "y" : "ies"}? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Selected"
        loading={deleteLoading}
        onConfirm={deleteSelectedQueries}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
      {label}
    </p>
    <p className="mt-1 break-words text-sm text-[var(--admin-ink)]">{value}</p>
  </div>
);

export default AdminQueries;
