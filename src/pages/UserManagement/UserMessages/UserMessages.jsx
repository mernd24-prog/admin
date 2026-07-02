import React, { useCallback, useEffect, useState } from "react";
import { MdNotifications, MdSend, MdRefresh } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "../../../utils/toast";
import { useListPage } from "../../../hooks/useListPage";

const CHANNEL_OPTIONS = [
  { value: "in_app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
];

const TEMPLATE_OPTIONS = [
  { value: "order_update", label: "Order Update" },
  { value: "payment_confirmation", label: "Payment Confirmation" },
  { value: "shipment_update", label: "Shipment Update" },
  { value: "review_request", label: "Review Request" },
  { value: "custom", label: "Custom" },
];

const FILTER_FIELDS = [
  {
    key: "type",
    type: "select",
    label: "Channel",
    width: "w-36",
    options: CHANNEL_OPTIONS,
  },
];

const COLUMNS = [
  {
    key: "userId",
    label: "Recipient",
    render: (v, row) => {
      const name = row.recipientName || row.user?.name || row.user?.full_name || row.userName;
      return name ? (
        <span className="text-sm font-medium text-gray-700">{name}</span>
      ) : (
        <span className="text-xs font-mono text-gray-400">{v ? `${String(v).slice(0, 12)}…` : "—"}</span>
      );
    },
  },
  {
    key: "channel",
    label: "Channel",
    render: (v) => (
      <span className="capitalize px-2 py-0.5 bg-[#F4F1ED] text-[var(--admin-navy)] text-xs rounded-full font-medium">
        {v || "in_app"}
      </span>
    ),
  },
  {
    key: "template",
    label: "Template",
    render: (v) => <span className="text-xs text-gray-600">{v || "—"}</span>,
  },
  {
    key: "subject",
    label: "Subject",
    render: (v, row) => (
      <span className="text-sm text-gray-700">
        {v || row.payload?.title || "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (v) => <StatusBadge status={v || "sent"} dot />,
  },
  {
    key: "createdAt",
    label: "Sent At",
    sortable: true,
    render: (v) => (
      <span className="text-xs text-gray-400">
        {v ? new Date(v).toLocaleString() : "—"}
      </span>
    ),
  },
];

const EMPTY_FORM = {
  userId: "",
  channel: "in_app",
  template: "custom",
  subject: "",
  message: "",
};

const UserMessages = () => {
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = toQueryParams();
      const res = await axiosProvider.get(ENDPOINTS.notifications.admin, {
        params: {
          page: params.page,
          limit: params.limit,
          type: params.type || undefined,
          search: params.search || undefined,
        },
      });
      const data = res?.data?.data;
      const items = Array.isArray(data) ? data : data?.items || [];
      const totalCount = Number(
        res?.data?.pagination?.total ?? res?.data?.meta?.total ?? items.length,
      );
      setNotifications(items);
      setTotal(totalCount);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load notifications";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toQueryParams]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSend = async () => {
    if (!form.userId.trim()) return toast.error("Recipient User ID is required");
    if (!form.template) return toast.error("Template is required");

    setSending(true);
    try {
      await axiosProvider.post(ENDPOINTS.notifications.send, {
        userId: form.userId.trim(),
        channel: form.channel,
        template: form.template,
        subject: form.subject.trim() || undefined,
        payload: form.message ? { message: form.message.trim() } : {},
      });
      toast.success("Notification sent");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      fetchNotifications();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Send and manage user notifications"
        breadcrumbs={[
          { label: "User Management" },
          { label: "Notifications" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="notifications" action={ACTIONS.CREATE} hide>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
              >
                <MdSend size={16} /> Send Notification
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={notifications}
        loading={loading}
        error={error}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search notifications…"
        emptyText="No notifications sent yet."
        emptyIcon={<MdNotifications size={40} className="text-gray-200" />}
        requiredModule="notifications"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {/* Send Notification Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5 flex items-center gap-2">
              <MdSend size={20} /> Send Notification
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient User ID *
                </label>
                <input
                  type="text"
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="User ID or email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <select
                    value={form.template}
                    onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {TEMPLATE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="Notification subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] resize-none"
                  placeholder="Notification message (optional for templated notifications)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors"
              >
                <MdSend size={16} />
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMessages;
