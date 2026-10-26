import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MdAdd,
  MdInfoOutline,
  MdSend,
  MdSupportAgent,
  MdVisibility,
} from "react-icons/md";

import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FormSection,
  PageHeader,
  StatusBadge,
} from "../../components/Shared";
import Tabs from "../../components/Shared/Tabs";
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
import { TextEditor } from "../../components/Atoms/FormInput/TextEditor";

const initialForm = {
  category: SELLER_QUERY_CATEGORIES[0]?.value || "",
  otherCategory: "",
  orderNumber: "",
  product: "",
  subject: "",
  message: "",
};

const truncateText = (value, limit = 70) => {
  const text = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
    const isSeller =
      item.senderType === "seller" || item.senderType === "customer";

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
  const [form, setForm] = useState(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
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

  /* Fetch Queries                                                              */
  const getPlainText = (html = "") =>
    String(html)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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

  /* Validation                                                                 */

  const validationError = useMemo(() => {
    if (!form.category) {
      return "Select a query category first.";
    }

    if (form.category === "ORDER_ISSUE" && !form.orderNumber.trim()) {
      return "Order number is required.";
    }

    if (form.category === "PRODUCT_LISTING_ISSUE" && !form.product.trim()) {
      return "Product number or ID is required.";
    }
    if (form.category === "OTHER" && !form.otherCategory.trim()) {
      return "Issue category / type is required.";
    }
    if (form.subject.trim().length < 5) {
      return "Subject must be at least 5 characters.";
    }

    if (getPlainText(form.message).length < 10) {
      return "Message must be at least 10 characters.";
    }

    return "";
  }, [form]);

  /* Submit Query                                                               */

  const submitQuery = async (event) => {
    event.preventDefault();

    setShowValidation(true);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);

      await axiosProvider.post(ENDPOINTS.support.create, {
        category: form.category,
        otherCategory:
          form.category === "OTHER"
            ? form.otherCategory.trim() || undefined
            : undefined,
        orderNumber: form.orderNumber.trim() || undefined,
        product: form.product.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      toast.success("Support query submitted");

      setForm(initialForm);
      setShowValidation(false);
      setPage(1);

      await fetchQueries();

      setShowQueryForm(false);
    } catch (requestError) {
      toast.error(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to submit support query",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* View Details                                                               */

  const handleViewDetails = useCallback(async (query) => {
    if (!query?.queryId) {
      toast.error("Query ID is missing");
      return;
    }

    setSelectedQuery(query);

    try {
      setDetailLoading(true);

      const response = await axiosProvider.get(
        ENDPOINTS.support.myDetail(query.queryId),
      );

      setSelectedQuery(response?.data?.data || query);
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to load query details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /* Submit Reply                                                               */

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

  /* Table Columns                                                              */

  const columns = useMemo(
    () => [
      {
        key: "queryId",
        label: "Query ID",
        render: (value) => (
          <span className="font-semibold text-[var(--admin-navy)]">
            {value}
          </span>
        ),
      },

      {
        key: "category",
        label: "Category",
        render: (value) => (
          <span className="text-[var(--admin-ink)]">
            {categoryLabel(value)}
          </span>
        ),
      },

      {
        key: "subject",
        label: "Subject",
        render: (value) => (
          <span className="font-medium text-[var(--admin-ink)]">
            {value || "N/A"}
          </span>
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
        render: (value) => formatDateTime12Hour(value),
      },

      {
        key: "_actions",
        label: "Actions",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => handleViewDetails(row)}
            className="admin-btn-secondary inline-flex min-h-[34px] items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
          >
            <MdVisibility size={15} />
            View Details
          </button>
        ),
      },
    ],
    [handleViewDetails],
  );

  /* Form Reset                                                                 */

  const resetForm = () => {
    setForm(initialForm);
  };

  /* Render                                                                     */

  return (
    <div className="admin-page support-query-page space-y-5">
      <PageHeader
        title="Help & Support"
        breadcrumbs={
          showQueryForm
            ? []
            : [{ label: "Support" }, { label: "Help & Support" }]
        }
        subtitle={
          showQueryForm
            ? "Select a category and provide the details of your issue."
            : "Track your support queries and view responses from the support team."
        }
        showBack={showQueryForm}
        onBack={
          showQueryForm
            ? () => {
                resetForm();
                setShowQueryForm(false);
              }
            : undefined
        }
        actions={
          showQueryForm ? null : (
            <button
              type="button"
              className="admin-btn-primary inline-flex items-center gap-2"
              onClick={() => setShowQueryForm(true)}
            >
              <MdAdd size={18} />
              Add Query
            </button>
          )
        }
      />

      {showQueryForm ? (
        <form
          onSubmit={submitQuery}
          className="admin-card support-query-form flex flex-col overflow-hidden"
        >
          {/* Category Section                                                 */}

          <section
            className="support-query-category"
            aria-labelledby="support-category-heading"
          >
            {/* <div className="support-query-category__header flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
                <MdSupportAgent size={19} />
              </div>
              <div>
                <h2
                  id="support-category-heading"
                  className="text-sm font-semibold text-[var(--admin-navy)]"
                >
                  Select Query Category
                </h2>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  Choose the category that best matches your issue.
                </p>
              </div>
            </div> */}

            <div className="m-4">
              <Tabs
                tabs={SELLER_QUERY_CATEGORIES}
                activeTab={form.category}
                onChange={(category) =>
                  setForm({
                    ...initialForm,
                    category,
                  })
                }
              />
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Query Form                                                       */}
          {/* ---------------------------------------------------------------- */}

          <section className="support-query-details">
            {/* <div className="support-query-details__header border-b border-[var(--admin-line)] px-5 py-4">
              <div className="flex items-start gap-3 sm:items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
                  <MdInfoOutline size={20} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-[var(--admin-navy)]">
                    Submit Query Details
                  </h2>

                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Provide enough information so the support team can resolve
                    your issue quickly.
                  </p>
                </div>
              </div>
            </div> */}

            <div className="support-query-details__body flex flex-col gap-4 p-5 sm:gap-[18px] sm:p-6">
              {/* Other Category */}
              {form.category === "OTHER" && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                    Issue Category / Type
                    <span className="ml-1 text-[var(--admin-gold-dark)]">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    className="admin-input mt-1.5"
                    value={form.otherCategory}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        otherCategory: event.target.value,
                      }))
                    }
                    maxLength={100}
                    placeholder="e.g. Technical Issue, Feature Request"
                  />

                  {showValidation && !form.otherCategory.trim() && (
                    <p className="mt-1 text-xs text-red-500">
                      Issue category / type is required.
                    </p>
                  )}

                  <div className="mt-1 flex justify-between">
                    <span className="text-[11px] text-[var(--admin-muted)]">
                      {form.otherCategory.length}/100
                    </span>
                  </div>
                </div>
              )}

              {/* Reference fields */}
              {form.category === "ORDER_ISSUE" && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                    Order ID
                    <span className="ml-1 text-[var(--admin-gold-dark)]">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    className="admin-input mt-1.5"
                    value={form.orderNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        orderNumber: event.target.value,
                      }))
                    }
                    placeholder="Enter order ID"
                  />
                  {showValidation && !form.orderNumber.trim() && (
                    <p className="mt-1 text-xs text-red-500">
                      Order number is required.
                    </p>
                  )}
                </div>
              )}

              {form.category === "PRODUCT_LISTING_ISSUE" && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                    Product ID
                    <span className="ml-1 text-[var(--admin-gold-dark)]">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    className="admin-input mt-1.5"
                    value={form.product}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        product: event.target.value,
                      }))
                    }
                    placeholder="Enter product ID"
                  />
                  {showValidation && !form.product.trim() && (
                    <p className="mt-1 text-xs text-red-500">
                      Product number or ID is required.
                    </p>
                  )}
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                  Subject
                  <span className="ml-1 text-[var(--admin-gold-dark)]">*</span>
                </label>
                <input
                  type="text"
                  className="admin-input mt-1.5"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      subject: event.target.value,
                    }))
                  }
                  maxLength={220}
                  placeholder="Briefly describe your issue"
                />

                {showValidation && form.subject.trim().length < 5 && (
                  <p className="mt-1 text-xs text-red-500">
                    Subject is required and must be at least 5 characters.
                  </p>
                )}

                <div className="mt-1 flex justify-between">
                  <span className="text-[11px] text-[var(--admin-muted)]">
                    {form.subject.length}/220
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <TextEditor
                  label="Message"
                  value={form.message || ""}
                  onChange={(content) =>
                    setForm((prev) => ({
                      ...prev,
                      message: content,
                    }))
                  }
                  required
                  showErrorBorder={false}
                  error={
                    showValidation && getPlainText(form.message).length < 10
                      ? "Message is required and must be at least 10 characters."
                      : ""
                  }
                  placeholder="Explain what happened and include relevant references or screenshots."
                  maxLength={5000}
                  height="190px"
                  className="[&_.ql-container]:h-[190px] [&_.ql-editor]:min-h-[150px]"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2  sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    resetForm();
                    setShowQueryForm(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting || !form.category}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MdSend size={17} />
                      Submit Query
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>
      ) : (
        /* ------------------------------------------------------------------ */
        /* Query List                                                         */
        /* ------------------------------------------------------------------ */

        <div className="admin-card overflow-hidden">
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
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Query Details Modal                                                  */}
      {/* -------------------------------------------------------------------- */}

      <DefaultModal
        isOpen={Boolean(selectedQuery)}
        onClose={() => {
          setSelectedQuery(null);
          setReplyMessage("");
        }}
        title={
          selectedQuery?.queryId
            ? `Query ${selectedQuery.queryId}`
            : "Query Details"
        }
        isButtonView={false}
        showCloseButton
        closeButtonText="Close"
      >
        {detailLoading ? (
          <QueryDetailsSkeleton />
        ) : selectedQuery ? (
          <div className="space-y-5">
            {/* Requester Information */}
            <FormSection
              title="Requester Information"
              subtitle="User details associated with this support query."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="User" value={selectedQuery.userName || "N/A"} />

                <Info
                  label="User Type"
                  value={selectedQuery.userType || "seller"}
                />

                <Info label="Email" value={selectedQuery.userEmail || "N/A"} />

                <Info label="Phone" value={selectedQuery.userPhone || "N/A"} />

                <Info
                  label="Organization"
                  value={
                    selectedQuery.sellerOrganizationName ||
                    selectedQuery.sellerOrganizationId ||
                    "N/A"
                  }
                />

                <Info
                  label="Created"
                  value={formatDateTime12Hour(selectedQuery.createdAt)}
                />
              </div>
            </FormSection>

            {/* Query Information */}
            <FormSection
              title="Query Information"
              subtitle="Review the category and subject of this support request."
            >
              <div className="space-y-4">
                <Info
                  label="Category"
                  value={categoryLabel(selectedQuery.category)}
                />

                <Info label="Subject" value={selectedQuery.subject || "N/A"} />

                {selectedQuery.orderNumber && (
                  <Info
                    label="Order Number"
                    value={selectedQuery.orderNumber}
                  />
                )}

                {selectedQuery.product && (
                  <Info
                    label="Product Number / ID"
                    value={selectedQuery.product}
                  />
                )}
              </div>
            </FormSection>

            {/* Conversation */}
            <FormSection
              title="Ticket Conversation"
              subtitle="Review the conversation and previous responses."
            >
              <div className="h-[400px] space-y-2.5 overflow-y-auto pr-2">
                {getConversationItems(selectedQuery).map((item) => {
                  const isAdminMessage = item.type === "admin";

                  return (
                    <div
                      key={item.key}
                      className={`flex ${
                        isAdminMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`w-full max-w-[82%] rounded-xl px-3 py-2.5 ${
                          isAdminMessage
                            ? "bg-[#EEF0F6] text-[#30364B]"
                            : "bg-[var(--admin-surface-soft)] text-[var(--admin-ink)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                isAdminMessage
                                  ? "bg-[#DDE1ED] text-[#555D78]"
                                  : "bg-[var(--admin-blue)]/10 text-[var(--admin-blue)]"
                              }`}
                            >
                              {isAdminMessage ? "A" : "S"}
                            </div>

                            <p
                              className={`truncate text-xs font-semibold ${
                                isAdminMessage
                                  ? "text-[#30364B]"
                                  : "text-[var(--admin-ink)]"
                              }`}
                            >
                              {item.title}
                            </p>
                          </div>

                          {isAdminMessage && (
                            <div className="shrink-0">
                              <StatusBadge
                                status={item.status}
                                label={statusLabel(item.status)}
                                dot
                              />
                            </div>
                          )}
                        </div>

                        <div
                          className={`mt-2 text-[13px] leading-5 ${
                            isAdminMessage
                              ? "text-[#30364B]"
                              : "text-[var(--admin-ink)]"
                          } [&_img]:my-2 [&_img]:max-h-[300px] [&_img]:rounded-lg`}
                          dangerouslySetInnerHTML={{
                            __html: item.message || "<p>No note added.</p>",
                          }}
                        />

                        <p
                          className={`mt-1.5 text-[10px] ${
                            isAdminMessage
                              ? "text-[#777F95]"
                              : "text-[var(--admin-muted)]"
                          }`}
                        >
                          {formatDateTime12Hour(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormSection>

            {/* Reply */}
            <FormSection
              title="Add Reply"
              subtitle="Send a follow-up message to support."
            >
              <div className="space-y-3">
                <textarea
                  className="min-h-[110px] w-full resize-y rounded-lg border border-[var(--admin-field-line)] bg-[var(--admin-field)] px-3 py-2.5 text-sm leading-6 text-[var(--admin-ink)] outline-none transition placeholder:text-[var(--admin-muted)] focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[rgba(203,156,45,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  maxLength={5000}
                  placeholder="Type your follow-up message for support..."
                  disabled={replySubmitting}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] text-[var(--admin-muted)]">
                    {replyMessage.length}/5000
                  </span>

                  <button
                    type="button"
                    className="admin-btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={submitReply}
                    disabled={replySubmitting || !replyMessage.trim()}
                  >
                    <MdSend size={16} />

                    {replySubmitting ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        ) : null}
      </DefaultModal>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Info Component                                                             */
/* -------------------------------------------------------------------------- */

const Info = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
      {label}
    </p>

    <p className="mt-1 break-words text-sm font-medium text-[var(--admin-ink)]">
      {value || "N/A"}
    </p>
  </div>
);

export default SellerHelpSupport;
