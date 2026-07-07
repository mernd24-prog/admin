import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MdAdd, MdArrowBack } from "react-icons/md";
import { DataTable, PageHeader, StatusBadge } from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  categoryLabel,
  formatDateTime,
  getPaginationTotal,
  SELLER_QUERY_CATEGORIES,
  statusLabel,
} from "./supportUtils";

const initialForm = {
  category: "",
  subject: "",
  message: "",
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

  const columns = useMemo(() => [
    { key: "queryId", label: "Query ID", render: (value) => <span className="font-semibold">{value}</span> },
    { key: "category", label: "Category", render: (value) => categoryLabel(value) },
    { key: "subject", label: "Subject" },
    { key: "messagePreview", label: "Message Preview" },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} label={statusLabel(value)} dot /> },
    { key: "createdAt", label: "Created Date", render: (value) => formatDateTime(value) },
  ], []);

  return (
    <div>
      <PageHeader
        title="Help & Support"
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
    </div>
  );
};

export default SellerHelpSupport;
