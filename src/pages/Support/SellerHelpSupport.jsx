import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { MdAdd, MdSend, MdVisibility } from "react-icons/md";

import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import {
  DataTable,
  FilterBar,
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
import { ButtonLoader } from "../../components/Loader/Loader";
import { sellerHelpSupportValidationSchema } from "../../_helpers/validationSchemas";

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
  const [submitting, setSubmitting] = useState(false);

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [dateFilters, setDateFilters] = useState({ fromDate: "", toDate: "" });

  const [selectedQuery, setSelectedQuery] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  /* Fetch Queries */

  const fetchQueries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axiosProvider.get(ENDPOINTS.support.mine, {
        params: {
          search: search || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          fromDate: dateFilters.fromDate || undefined,
          toDate: dateFilters.toDate
            ? `${dateFilters.toDate}T23:59:59.999`
            : undefined,
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
  }, [dateFilters.fromDate, dateFilters.toDate, page, pageSize, search]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  /* Plain-text helper for rich-text message validation */

  const getPlainText = (html = "") =>
    String(html)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  /* Formik Validation and Submission */

  const formik = useFormik({
    initialValues: initialForm,
    validationSchema: sellerHelpSupportValidationSchema,

    onSubmit: async (values, { resetForm }) => {
      try {
        setSubmitting(true);

        await axiosProvider.post(ENDPOINTS.support.create, {
          category: values.category,
          otherCategory:
            values.category === "OTHER"
              ? values.otherCategory.trim() || undefined
              : undefined,
          orderNumber: values.orderNumber.trim() || undefined,
          product: values.product.trim() || undefined,
          subject: values.subject.trim(),
          message: values.message.trim(),
        });

        toast.success("Support query submitted");

        resetForm();
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
    },
  });

  /* View Details */

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

  /* Submit Reply */

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

  /* Table Columns */

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
      // {
      //   key: "_actions",
      //   label: "Actions",
      //   render: (_, row) => (
      //     <button
      //       type="button"
      //       onClick={() => handleViewDetails(row)}
      //       className="admin-btn-secondary inline-flex min-h-[34px] items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
      //     >
      //       <MdVisibility size={15} />
      //       View Details
      //     </button>
      //   ),
      // },
    ],
    [handleViewDetails],
  );

  /* Form Reset */

  const resetForm = () => {
    formik.resetForm();
  };

  /* Render */

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
              onClick={() => {
                resetForm();
                setShowQueryForm(true);
              }}
            >
              <MdAdd size={18} />
              Add Query
            </button>
          )
        }
      />

      {showQueryForm ? (
        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="admin-card support-query-form flex flex-col overflow-hidden"
        >
          {/* Category Section */}

          <section
            className="support-query-category"
            aria-labelledby="support-category-heading"
          >
            <div className="m-4">
              <Tabs
                tabs={SELLER_QUERY_CATEGORIES}
                activeTab={formik.values.category}
                onChange={(category) => {
                  formik.setValues({
                    ...initialForm,
                    category,
                  });
                  formik.setTouched({});
                }}
              />

              {formik.touched.category && formik.errors.category && (
                <p className="admin-field-error mt-2" role="alert">
                  {formik.errors.category}
                </p>
              )}
            </div>
          </section>

          {/* Query Form */}

          <section className="support-query-details">
            <div className="support-query-details__body flex flex-col gap-4 p-5 sm:gap-[18px] sm:p-6">
              {/* Other Category */}

              {formik.values.category === "OTHER" && (
                <FormInput
                  label="Issue Category / Type"
                  name="otherCategory"
                  type="text"
                  value={formik.values.otherCategory}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.otherCategory && formik.errors.otherCategory
                  }
                  required
                  maxLength={100}
                  placeholder="e.g. Technical Issue, Feature Request"
                />
              )}

              {/* Order ID */}

              {formik.values.category === "ORDER_ISSUE" && (
                <FormInput
                  label="Order ID"
                  name="orderNumber"
                  type="text"
                  value={formik.values.orderNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.orderNumber && formik.errors.orderNumber
                  }
                  required
                  placeholder="Enter order ID"
                />
              )}

              {/* Product ID */}

              {formik.values.category === "PRODUCT_LISTING_ISSUE" && (
                <FormInput
                  label="Product ID"
                  name="product"
                  type="text"
                  value={formik.values.product}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.product && formik.errors.product}
                  required
                  placeholder="Enter product ID"
                />
              )}

              {/* Subject */}

              <FormInput
                label="Subject"
                name="subject"
                type="text"
                value={formik.values.subject}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.subject && formik.errors.subject}
                required
                maxLength={220}
                limitMessage="Maximum 220 characters allowed."
                placeholder="Briefly describe your issue"
              />

              {/* Message */}

              <TextEditor
                label="Message"
                value={formik.values.message || ""}
                onChange={(content) => formik.setFieldValue("message", content)}
                onBlur={() => formik.setFieldTouched("message", true)}
                required
                showErrorBorder={false}
                error={formik.touched.message ? formik.errors.message : ""}
                placeholder="Explain what happened and include relevant references or screenshots."
                maxLength={5000}
                limitMessage="Maximum 5000 characters allowed."
                height="190px"
                className="[&_.ql-container]:h-[190px] [&_.ql-editor]:min-h-[150px]"
              />

              {/* Actions */}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                  disabled={submitting || !formik.values.category}
                >
                  {submitting ? (
                    <>
                      <ButtonLoader />
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
        /* Query List */

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
            filterBar={
              <FilterBar
                filters={[
                  {
                    key: "fromDate",
                    type: "date",
                    label: "From Date",
                    disableFuture: true,
                  },
                  {
                    key: "toDate",
                    type: "date",
                    label: "To Date",
                    disableFuture: true,
                  },
                ]}
                values={dateFilters}
                onChange={(key, value) => {
                  setDateFilters((current) => ({ ...current, [key]: value }));
                  setPage(1);
                }}
                onClear={() => {
                  setDateFilters({ fromDate: "", toDate: "" });
                  setPage(1);
                }}
                loading={loading}
                activeCount={Number(Boolean(dateFilters.fromDate || dateFilters.toDate))}
              />
            }
            onRefresh={fetchQueries}
            searchPlaceholder="Search your support queries"
            rowKey="queryId"
            emptyText="No support queries submitted yet."
            rowActions={(row) => [
              {
                label: "View Details",
                icon: (
                  <MdVisibility
                    aria-hidden="true"
                    size={16}
                    className="text-[var(--admin-blue)]"
                  />
                ),
                onClick: () => handleViewDetails(row),
              },
            ]}
          />
        </div>
      )}

      {/* Query Details Modal */}

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
                <TextEditor
                  label="Message"
                  value={replyMessage}
                  onChange={(content) => setReplyMessage(content)}
                  onBlur={() => {}}
                  required
                  showErrorBorder={false}
                  placeholder="Type your reply to the support team..."
                  maxLength={5000}
                  limitMessage="Maximum 5000 characters allowed."
                  height="190px"
                  className="[&_.ql-container]:h-[190px] [&_.ql-editor]:min-h-[150px]"
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] text-[var(--admin-muted)]">
                    {
                      replyMessage
                        .replace(/<[^>]*>/g, " ")
                        .replace(/&nbsp;/g, " ")
                        .trim().length
                    }
                    /5000
                  </span>

                  <button
                    type="button"
                    className="admin-btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={submitReply}
                    disabled={
                      replySubmitting ||
                      !replyMessage
                        .replace(/<[^>]*>/g, " ")
                        .replace(/&nbsp;/g, " ")
                        .trim()
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

/* Info Component */

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
