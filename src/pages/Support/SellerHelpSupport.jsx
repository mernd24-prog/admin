import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MdAdd,
  MdArrowBack,
  MdCheckCircle,
  MdInfoOutline,
  MdSend,
  MdSupportAgent,
  MdVisibility,
} from "react-icons/md";

import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import { DataTable, FormSection, PageHeader, StatusBadge } from "../../components/Shared";
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
  category: "",
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

  return text.length > limit
    ? `${text.slice(0, limit).trim()}...`
    : text;
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
      item.senderType === "seller" ||
      item.senderType === "customer";

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
    (item) =>
      item.type === "admin" &&
      item.message.trim() === hasLatestNote,
  );

  if (hasLatestNote && !latestNoteAlreadyIncluded) {
    items.push({
      key: "admin-latest-note",
      type: "admin",
      title: "Latest support note",
      message: hasLatestNote,
      status: query.status || "pending",
      timestamp:
        query.lastStatusChangedAt || query.updatedAt,
    });
  }

  return items.sort((first, second) => {
    const firstTime = new Date(
      first.timestamp || 0,
    ).getTime();

    const secondTime = new Date(
      second.timestamp || 0,
    ).getTime();

    return firstTime - secondTime;
  });
};

const SellerHelpSupport = () => {
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
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

      const response = await axiosProvider.get(
        ENDPOINTS.support.mine,
        {
          params: {
            search: search || undefined,
            limit: pageSize,
            offset: (page - 1) * pageSize,
          },
        },
      );

      const payload = response?.data || {};
      const list = Array.isArray(payload?.data)
        ? payload.data
        : [];

      setQueries(list);
      setTotal(
        getPaginationTotal(payload, list.length),
      );
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          "Failed to load support queries",
      );
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

    if (
      form.category === "ORDER_ISSUE" &&
      !form.orderNumber.trim()
    ) {
      return "Order number is required.";
    }

    if (
      form.category === "PRODUCT_LISTING_ISSUE" &&
      !form.product.trim()
    ) {
      return "Product number or ID is required.";
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

    await axiosProvider.post(
      ENDPOINTS.support.create,
      {
        category: form.category,
        orderNumber: form.orderNumber.trim() || undefined,
        product: form.product.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
      },
    );

    toast.success("Support query submitted");

    setSelectedCategory("");
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

  const handleViewDetails = useCallback(
    async (query) => {
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

        setSelectedQuery(
          response?.data?.data || query,
        );
      } catch (requestError) {
        toast.error(
          requestError?.message ||
            "Failed to load query details",
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

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
        ENDPOINTS.support.reply(
          selectedQuery.queryId,
        ),
        { message },
      );

      setSelectedQuery(
        response?.data?.data || selectedQuery,
      );

      setReplyMessage("");

      toast.success("Reply sent");

      await fetchQueries();
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          "Failed to send reply",
      );
    } finally {
      setReplySubmitting(false);
    }
  }, [
    fetchQueries,
    replyMessage,
    selectedQuery,
  ]);

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
          <StatusBadge
            status={value}
            label={statusLabel(value)}
            dot
          />
        ),
      },

      {
        key: "createdAt",
        label: "Created Date",
        render: (value) =>
          formatDateTime12Hour(value),
      },

      {
        key: "_actions",
        label: "Actions",
        render: (_, row) => (
          <button
            type="button"
            onClick={() =>
              handleViewDetails(row)
            }
            className="admin-btn-secondary inline-flex min-h-[34px] items-center gap-1.5 px-3 py-1.5 text-xs transition-all hover:border-[var(--admin-gold)] hover:bg-[var(--admin-gold-soft)] hover:text-[var(--admin-gold-dark)]"
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
    setSelectedCategory("");
    setForm(initialForm);
  };

  /* Render                                                                     */

  return (
    <div className="admin-page space-y-5">
      <PageHeader
        title="Help & Support"
        breadcrumbs={[
          { label: "Support" },
          { label: "Help & Support" },
        ]}
        subtitle={
          showQueryForm
            ? "Select a category and provide the details of your issue."
            : "Track your support queries and view responses from the support team."
        }
        actions={
          <button
            type="button"
            className="admin-btn-primary inline-flex items-center gap-2"
            onClick={() => {
              if (showQueryForm) {
                resetForm();
              }

              setShowQueryForm(
                (current) => !current,
              );
            }}
          >
            {showQueryForm ? (
              <MdArrowBack size={17} />
            ) : (
              <MdAdd size={18} />
            )}

            {showQueryForm
              ? "Back to Queries"
              : "Add Query"}
          </button>
        }
      />

      {showQueryForm ? (
        <div className="space-y-5">
        
          {/* Category Section                                                 */}
         
          <FormSection
            title="Select Query Category"
            subtitle="Choose the category that best matches your issue."
            icon={<MdSupportAgent size={19} />}
            className="support-category-section"
          >
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {SELLER_QUERY_CATEGORIES.map(
                  (category) => {
                    const isSelected =
                      selectedCategory ===
                      category.value;

                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(
                            category.value,
                          );

                          setForm({
                            ...initialForm,
                            category:
                              category.value,
                          });
                        }}
                        className={`group relative min-h-[52px] rounded-[var(--admin-radius-sm)] border px-3 py-2.5 text-left transition-all ${
                          isSelected
                            ? "border-[var(--admin-gold)] bg-[var(--admin-gold)] text-[var(--admin-navy)] shadow-[0_5px_12px_rgba(214,163,35,0.18)]"
                            : "border-[var(--admin-line)] bg-[var(--admin-surface-soft)] hover:border-[var(--admin-gold)] hover:bg-[var(--admin-surface-soft)]"
                        }`}
                      >
                        <div className="flex h-full items-center justify-between gap-3">
                          <span
                            className={`text-sm font-semibold ${
                              isSelected
                                ? "text-[var(--admin-navy)]"
                                : "text-[var(--admin-ink)]"
                            }`}
                          >
                            {category.label}
                          </span>

                          {/* <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center d rounded-full border ${
                              isSelected
                                ? "border-[var(--admin-gold)] bg-[var(--admin-gold)] text-white"
                                : "border-[var(--admin-line)] bg-[var(--admin-surface)] text-transparent"
                            }`}
                          >
                            {isSelected && (
                              <MdCheckCircle
                                size={15}
                              />
                            )}
                          </span> */}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
          </FormSection>

          {/* ---------------------------------------------------------------- */}
          {/* Query Form                                                       */}
          {/* ---------------------------------------------------------------- */}

          <form
            onSubmit={submitQuery}
            className="admin-card overflow-hidden"
          >
            <div className="border-b border-[var(--admin-line)] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
                  <MdInfoOutline size={20} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-[var(--admin-navy)]">
                    Submit Query Details
                  </h2>

                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Provide enough information so the
                    support team can resolve your issue
                    quickly.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Selected Category */}
              {form.category && (
                <div className="flex items-center justify-between rounded-[var(--admin-radius-sm)] border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] px-4 py-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-muted)]">
                      Selected Category
                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-[var(--admin-gold-dark)]">
                      {categoryLabel(
                        form.category,
                      )}
                    </p>
                  </div>

                  <MdCheckCircle
                    size={21}
                    className="text-[var(--admin-gold-dark)]"
                  />
                </div>
              )}

              {/* Reference Fields */}
              {(form.category ===
                "ORDER_ISSUE" ||
                form.category ===
                  "PRODUCT_LISTING_ISSUE") && (
                <div className="rounded-[var(--admin-radius-sm)] border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-[var(--admin-navy)]">
                      Issue Reference
                    </p>

                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      Add the relevant reference so we
                      can identify the issue.
                    </p>
                  </div>

                  {form.category ===
                    "ORDER_ISSUE" && (
                    <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                      Order Number / ID
                      <span className="ml-1 text-[var(--admin-gold-dark)]">
                        *
                      </span>

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
  placeholder="Enter order number or ID"
/>

{showValidation && !form.orderNumber.trim() && (
  <p className="mt-1 text-xs text-red-500">
    Order number is required.
  </p>
)}

                      <span className="mt-1 block text-[11px] font-normal text-[var(--admin-muted)]">
                        Enter the order number related
                        to the issue.
                      </span>
                    </label>
                  )}

                  {form.category ===
                    "PRODUCT_LISTING_ISSUE" && (
                    <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                      Product Number / ID
                      <span className="ml-1 text-[var(--admin-gold-dark)]">
                        *
                      </span>

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
  placeholder="Enter product number or ID"
/>

{showValidation && !form.product.trim() && (
  <p className="mt-1 text-xs text-red-500">
    Product number or ID is required.
  </p>
)}

                      <span className="mt-1 block text-[11px] font-normal text-[var(--admin-muted)]">
                        Enter the product number or ID
                        related to the issue.
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-[var(--admin-ink)]">
                  Subject
                  <span className="ml-1 text-[var(--admin-gold-dark)]">
                    *
                  </span>
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
                    Keep the subject short and clear.
                  </span>

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
    showValidation &&
    getPlainText(form.message).length < 10
      ? "Message is required and must be at least 10 characters."
      : ""
  }
  placeholder="Explain what happened and include relevant references or screenshots."
  maxLength={5000}
  height="220px"
  className="[&_.ql-container]:h-[220px] [&_.ql-editor]:min-h-[180px]"
/>

                <p className="mt-1.5 text-[11px] text-[var(--admin-muted)]">
                  You can add screenshots directly inside
                  the message using the image option.
                </p>
              </div>

              {/* Form Hint */}
              <div className="flex items-start gap-2 rounded-[var(--admin-radius-sm)] border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-3.5 py-3">
                <MdInfoOutline
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--admin-gold-dark)]"
                />

                <p className="text-xs leading-5 text-[var(--admin-muted)]">
                  Please provide accurate details and
                  relevant references. This helps the
                  support team investigate your query
                  faster.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--admin-line)] pt-4 sm:flex-row sm:justify-end">
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
                  disabled={
                    submitting || !form.category
                  }
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
          </form>
        </div>
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
>
  {detailLoading ? (
    <QueryDetailsSkeleton />
  ) : selectedQuery ? (
    <div className="space-y-5 py-2">
      {/* Query Header */}
      <div className="rounded-xl border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
              Support Query
            </p>

            <h3 className="mt-1 text-base font-bold text-[var(--admin-navy)]">
              {selectedQuery.subject || "No subject"}
            </h3>

            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              {selectedQuery.queryId}
            </p>
          </div>

          <StatusBadge
            status={selectedQuery.status}
            label={statusLabel(selectedQuery.status)}
            dot
          />
        </div>
      </div>

      {/* Query Information */}
      <FormSection  
        title="Query Information"
        description="View the basic details and current status of this support query."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info
            label="Query ID"
            value={selectedQuery.queryId || "N/A"}
          />

          <Info
            label="Category"
            value={categoryLabel(selectedQuery.category)}
          />

          <Info
            label="Created"
            value={formatDateTime12Hour(selectedQuery.createdAt)}
          />

          <Info
            label="Updated"
            value={formatDateTime12Hour(selectedQuery.updatedAt)}
          />

          <Info
            label="Resolved"
            value={formatDateTime12Hour(selectedQuery.resolvedAt)}
          />
        </div>
      </FormSection>

      {/* Issue Reference */}
      {(selectedQuery.orderNumber || selectedQuery.product) && (
        <FormSection
          title="Issue Reference"
          description="Related order or product information associated with this query."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      )}

      {/* Subject */}
      <FormSection
        title="Subject"
        description="The main subject of the support query."
      >
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-sm font-semibold leading-6 text-[var(--admin-navy)]">
            {selectedQuery.subject || "N/A"}
          </p>
        </div>
      </FormSection>

      {/* Conversation */}
      <FormSection
        title="Ticket Conversation"
        description="View the messages and support responses related to this query."
      >
        <div className="space-y-3 ">
          {getConversationItems(selectedQuery).map((item) => {
            const isSellerMessage = item.type === "seller";

            return (
              <div
                key={item.key}
                className={`flex ${
                  isSellerMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%]  rounded-xl border px-4 py-3 shadow-sm ${
                    isSellerMessage
                      ? "border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]"
                      : "border-[var(--admin-line)] bg-[var(--admin-surface)]"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs dfont-semibold ${
                        isSellerMessage
                          ? "text-[var(--admin-gold-dark)]"
                          : "text-[var(--admin-navy)]"
                      }`}
                    >
                      {item.title}
                    </span>

                    {!isSellerMessage && (
                      <StatusBadge
                        status={item.status}
                        label={statusLabel(item.status)}
                        dot
                      />
                    )}
                  </div>

                  <div
                    className="text-sm leading-6 text-[var(--admin-ink)] [&_img]:my-2 [&_img]:max-h-[300px] [&_img]:rounded-lg"
                    dangerouslySetInnerHTML={{
                      __html: item.message || "<p>No note added.</p>",
                    }}
                  />

                  <p className="mt-2 text-[11px] text-[var(--admin-muted)]">
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
        description="Send a follow-up message to support."
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
              disabled={
                replySubmitting || !replyMessage.trim()
              }
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