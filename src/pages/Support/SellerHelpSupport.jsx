import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MdAdd, MdArrowBack, MdSend, MdVisibility } from "react-icons/md";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import { DataTable, PageHeader, StatusBadge } from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  categoryLabel,
  getPaginationTotal,
  SELLER_QUERY_CATEGORIES,
  statusLabel,
} from "./supportUtils";
import { formatDateTime12Hour } from "../../utils/formatters";
import { QueryDetailsSkeleton } from "../../components/Loader/SkeletonLoader";

const initialForm = {
  category: "",
  subject: "",
  message: "",
};

const truncateText = (value, limit = 70) => {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
};

const getStatusHistory = (query = {}) =>
  Array.isArray(query.statusHistory)
    ? query.statusHistory
    : Array.isArray(query.metadata?.statusHistory)
      ? query.metadata.statusHistory
      : [];

const getConversationItems = (query = {}) => {
  const items = [
    {
      key: "seller-message",
      type: "seller",
      title: "Your message",
      message: query.message || query.messagePreview || "N/A",
      status: query.status || "pending",
      timestamp: query.createdAt,
    },
  ];

  getStatusHistory(query).forEach((item, index) => {
    items.push({
      key: `admin-history-${item.changedAt || index}`,
      type: "admin",
      title: `Support updated status to ${statusLabel(item.status)}`,
      message: item.note || "",
      status: item.status,
      timestamp: item.changedAt,
    });
  });

  const followUpMessages = Array.isArray(query.messages)
    ? query.messages
    : Array.isArray(query.metadata?.messages)
      ? query.metadata.messages
      : [];

  followUpMessages.forEach((item, index) => {
    const isSeller = item.senderType === "seller" || item.senderType === "customer";
    items.push({
      key: `reply-${item.createdAt || index}`,
      type: isSeller ? "seller" : "admin",
      title: isSeller ? "Your reply" : "Support reply",
      message: item.message || "",
      status: query.status || "pending",
      timestamp: item.createdAt,
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
      title: "Latest support note",
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

const SellerHelpSupport = () => {
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const fetchQueries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(ENDPOINTS.support.mine, {
        params: {
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
      toast.error(requestError?.message || "Failed to load support queries");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const validationError = useMemo(() => {
    if (!form.category) return "Select a query category first.";
    if (form.subject.trim().length < 5) return "Subject must be at least 5 characters.";
    if (form.message.trim().length < 10) return "Message must be at least 10 characters.";
    return "";
  }, [form]);

  const submitQuery = async (event) => {
    event.preventDefault();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      setSubmitting(true);
      await axiosProvider.post(ENDPOINTS.support.create, {
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      toast.success("Support query submitted");
      setSelectedCategory("");
      setForm(initialForm);
      setPage(1);
      await fetchQueries();
      setShowQueryForm(false);
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to submit support query");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = useCallback(async (query) => {
    if (!query?.queryId) {
      toast.error("Query ID is missing");
      return;
    }
    setSelectedQuery(query);
    try {
      setDetailLoading(true);
      const response = await axiosProvider.get(ENDPOINTS.support.myDetail(query.queryId));
      setSelectedQuery(response?.data?.data || query);
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to load query details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitReply = useCallback(async () => {
    if (!selectedQuery?.queryId) return;
    const message = replyMessage.trim();
    if (!message) {
      toast.error("Please type a message");
      return;
    }
    try {
      setReplySubmitting(true);
      const response = await axiosProvider.post(
        ENDPOINTS.support.reply(selectedQuery.queryId),
        { message },
      );
      setSelectedQuery(response?.data?.data || selectedQuery);
      setReplyMessage("");
      toast.success("Reply sent");
      await fetchQueries();
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to send reply");
    } finally {
      setReplySubmitting(false);
    }
  }, [fetchQueries, replyMessage, selectedQuery]);

  const columns = useMemo(() => [
    { key: "queryId", label: "Query ID", render: (value) => <span className="font-semibold">{value}</span> },
    { key: "category", label: "Category", render: (value) => categoryLabel(value) },
    { key: "subject", label: "Subject" },
    {
      key: "messagePreview",
      label: "Message Preview",
      render: (value, row) => {
        const preview = value || row.message || "";
        return (
          <span className="block max-w-xs truncate" >
            {truncateText(preview)}
          </span>
        );
      },
    },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} label={statusLabel(value)} dot /> },
    { key: "createdAt", label: "Created Date", render: (value) => formatDateTime12Hour(value) },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleViewDetails(row)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--admin-navy)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-navy)] transition-colors hover:bg-[var(--admin-navy)] hover:text-white"
        >
          <MdVisibility size={15} />
          View Details
        </button>
      ),
    },
  ], [handleViewDetails]);

  return (
    <div>
      <PageHeader
        title="Help & Support"
        breadcrumbs={[{ label: "Support" }, { label: "Help & Support" }]}
        subtitle={
          showQueryForm
            ? "Select a category and tell us how we can help."
            : "Track your submitted support queries and their current status."
        }
        actions={
          <button
            type="button"
            onClick={() => {
              if (showQueryForm) {
                setSelectedCategory("");
                setForm(initialForm);
              }
              setShowQueryForm((current) => !current);
            }}
          >
            {showQueryForm ? <MdArrowBack size={16} /> : <MdAdd size={18} />}
            {showQueryForm ? "Back to Queries" : "Add Query"}
          </button>
        }
      />

      {showQueryForm ? (
        <>
          <div className="mb-6 rounded-md border border-[var(--admin-line)] bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--admin-ink)]">1. Select Query Category</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SELLER_QUERY_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={`rounded-md border px-3 py-3 text-left text-sm font-semibold transition ${
                    selectedCategory === category.value
                      ? "border-[var(--admin-blue)] bg-[var(--admin-blue)] text-white"
                      : "border-[var(--admin-line)] bg-[var(--admin-surface-soft)] text-[var(--admin-ink)] hover:bg-[var(--admin-blue-soft)]"
                  }`}
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setForm((prev) => ({ ...prev, category: category.value }));
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submitQuery} className="rounded-md border border-[var(--admin-line)] bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-base font-semibold text-[var(--admin-ink)]">2. Submit Query Details</h2>
            <div className="grid gap-4">
              <label className="text-sm font-semibold text-[var(--admin-ink)]">
                Selected Category
                <input
                  className="mt-1 w-full rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm"
                  value={categoryLabel(form.category)}
                  readOnly
                />
              </label>
              <label className="text-sm font-semibold text-[var(--admin-ink)]">
                Subject
                <input
                  className="mt-1 w-full rounded-md border border-[var(--admin-line)] px-3 py-2 text-sm"
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  maxLength={220}
                  placeholder="Short summary of the issue"
                />
              </label>
              <label className="text-sm font-semibold text-[var(--admin-ink)]">
                Message
                <textarea
                  className="mt-1 min-h-[140px] w-full rounded-md border border-[var(--admin-line)] px-3 py-2 text-sm"
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  maxLength={5000}
                  placeholder="Explain what happened and include order/product/payment references when relevant."
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setSelectedCategory("");
                    setForm(initialForm);
                    setShowQueryForm(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Query"}
                </button>
              </div>
            </div>
          </form>
        </>
      ) : (
        <DataTable
          columns={columns}
          data={queries}
          loading={loading}
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
          searchPlaceholder="Search your support queries"
          rowKey="queryId"
          emptyText="No support queries submitted yet."
        />
      )}

      <DefaultModal
        isOpen={Boolean(selectedQuery)}
        onClose={() => {
          setSelectedQuery(null);
          setReplyMessage("");
        }}
        title={selectedQuery?.queryId ? `Query ${selectedQuery.queryId}` : "Query Details"}
        isButtonView={false}
      >
        {detailLoading ? (
          <QueryDetailsSkeleton />
        ) : selectedQuery ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4 text-sm sm:grid-cols-2">
              <Info label="Query ID" value={selectedQuery.queryId || "N/A"} />
              <Info label="Status" value={statusLabel(selectedQuery.status)} />
              <Info label="Category" value={categoryLabel(selectedQuery.category)} />
              <Info label="Created" value={formatDateTime12Hour(selectedQuery.createdAt)} />
              <Info label="Updated" value={formatDateTime12Hour(selectedQuery.updatedAt)} />
              <Info label="Resolved" value={formatDateTime12Hour(selectedQuery.resolvedAt)} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Subject</p>
              <p className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">{selectedQuery.subject || "N/A"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Ticket Conversation</p>
              <div className="mt-3 space-y-3">
                {getConversationItems(selectedQuery).map((item) => {
                  const isSellerMessage = item.type === "seller";
                  return (
                    <div
                      key={item.key}
                      className={`flex ${isSellerMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-md border px-3 py-2 text-sm shadow-sm ${
                          isSellerMessage
                            ? "border-[var(--admin-blue)] bg-[var(--admin-blue)] text-white"
                            : "border-[var(--admin-line)] bg-white text-[var(--admin-ink)]"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-semibold ${isSellerMessage ? "text-white" : "text-[var(--admin-ink)]"}`}>
                            {item.title}
                          </span>
                          {!isSellerMessage ? (
                            <StatusBadge status={item.status} label={statusLabel(item.status)} dot />
                          ) : null}
                        </div>
                        <p className={`whitespace-pre-wrap leading-6 ${isSellerMessage ? "text-white" : "text-[var(--admin-ink)]"}`}>
                          {item.message || "No note added."}
                        </p>
                        <p className={`mt-1 text-[11px] ${isSellerMessage ? "text-white/80" : "text-[var(--admin-muted)]"}`}>
                          {formatDateTime12Hour(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-[var(--admin-line)] bg-white p-3">
              <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                Add Reply
                <textarea
                  className="mt-2 min-h-[96px] w-full rounded-md border border-[var(--admin-line)] px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20"
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  maxLength={5000}
                  placeholder="Type your follow-up message for support"
                  disabled={replySubmitting}
                />
              </label>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="button-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={submitReply}
                  disabled={replySubmitting || !replyMessage.trim()}
                >
                  <MdSend size={16} />
                  {replySubmitting ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
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

export default SellerHelpSupport;
