import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdMarkEmailRead,
  MdNotifications,
  MdSend,
  MdVisibility,
} from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "../../../utils/toast";
import { useListPage } from "../../../hooks/useListPage";
import { useDispatch, useSelector } from "react-redux";
import {
  isNotificationUnread,
  markNotificationRead,
  setNotificationsSeenAt,
} from "../../../Redux/notificationsSlice";

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

const firstValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

const getNotificationDetailRoute = (notification = {}) => {
  const meta =
    notification.payload || notification.meta || notification.metadata || {};
  const orderId = firstValue(
    meta.orderId,
    meta.order_id,
    notification.orderId,
    notification.order_id,
  );
  const returnId = firstValue(
    meta.returnId,
    meta.return_id,
    notification.returnId,
    notification.return_id,
  );
  const shipmentId = firstValue(
    meta.shipmentId,
    meta.shipment_id,
    notification.shipmentId,
    notification.shipment_id,
  );
  const invoiceId = firstValue(
    meta.invoiceId,
    meta.invoice_id,
    meta.taxInvoiceId,
    notification.invoiceId,
    notification.invoice_id,
  );
  const creditNoteId = firstValue(
    meta.creditNoteId,
    meta.credit_note_id,
    notification.creditNoteId,
    notification.credit_note_id,
  );
  const dealId = firstValue(
    meta.dealId,
    meta.deal_id,
    notification.dealId,
    notification.deal_id,
  );
  const payoutId = firstValue(
    meta.payoutId,
    meta.payout_id,
    notification.payoutId,
    notification.payout_id,
  );

  if (invoiceId) return `/app/tax-invoices/${encodeURIComponent(invoiceId)}`;
  if (creditNoteId)
    return `/app/credit-notes?creditNoteId=${encodeURIComponent(creditNoteId)}`;
  if (payoutId)
    return `/app/seller-payouts?payoutId=${encodeURIComponent(payoutId)}`;
  if (returnId) return `/app/returns?returnId=${encodeURIComponent(returnId)}`;
  if (shipmentId) {
    const params = new URLSearchParams({ shipmentId: String(shipmentId) });
    if (orderId) params.set("orderId", String(orderId));
    return `/app/shipment-tracking?${params.toString()}`;
  }
  if (dealId)
    return `/app/deal-management?dealId=${encodeURIComponent(dealId)}`;
  if (orderId) return `/app/orders/view/${encodeURIComponent(orderId)}`;
  return null;
};

const FILTER_FIELDS = [
  {
    key: "type",
    type: "select",
    label: "Channel",
    width: "w-36",
    options: CHANNEL_OPTIONS,
  },
];

const BASE_COLUMNS = [
  {
    key: "userId",
    label: "Recipient",
    render: (v, row) => {
      const name =
        row.recipientName ||
        row.user?.name ||
        row.user?.full_name ||
        row.userName;
      return name ? (
        <span className="text-sm font-medium text-gray-700">{name}</span>
      ) : (
        <span className="text-xs font-mono text-gray-400">
          {v ? `${String(v).slice(0, 12)}…` : "—"}
        </span>
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
  const { isSeller } = usePermission();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const readNotificationIds = useSelector(
    (state) => state.notifications.readNotificationIds || [],
  );
  const notificationReadBaselineAt = useSelector(
    (state) => state.notifications.notificationReadBaselineAt || 0,
  );
  const markAsSeen = useCallback(
    (notification) => dispatch(markNotificationRead(notification)),
    [dispatch],
  );
  const columns = useMemo(
    () => {
      const baseColumns = (
        isSeller
          ? BASE_COLUMNS.filter((column) => column.key !== "userId")
          : BASE_COLUMNS
      ).map((column) => {
        if (column.key !== "channel") return column;
        return {
          ...column,
          render: (value, row) => {
            const unread = isNotificationUnread(
              row,
              readNotificationIds,
              notificationReadBaselineAt,
            );
            return (
              <span className="inline-flex items-center gap-1.5">
                <span className="rounded-full bg-[#F4F1ED] px-2 py-0.5 text-xs font-medium capitalize text-[var(--admin-navy)]">
                  {String(value || "in_app").replace(/_/g, " ")}
                </span>
                <span
                  className={`h-2 w-2 flex-none rounded-full ${
                    unread
                      ? "bg-[var(--admin-navy)] shadow-[0_0_0_3px_rgba(31,27,95,0.12)]"
                      : "bg-transparent"
                  }`}
                  aria-label={unread ? "Unseen notification" : undefined}
                />
              </span>
            );
          },
        };
      });

      return [
        ...baseColumns,
        {
          key: "_actions",
          label: "Action",
          render: (_, row) => {
            const detailRoute = getNotificationDetailRoute(row);
            const unread = isNotificationUnread(
              row,
              readNotificationIds,
              notificationReadBaselineAt,
            );
            if (!detailRoute && !unread) return null;
            return (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--admin-muted)] transition hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue)]"
                title={detailRoute ? "View detail" : "Mark as seen"}
                aria-label={detailRoute ? "View notification detail" : "Mark notification as seen"}
                onClick={(event) => {
                  event.stopPropagation();
                  markAsSeen(row);
                  if (detailRoute) navigate(detailRoute);
                }}
              >
                {detailRoute ? <MdVisibility size={18} /> : <MdMarkEmailRead size={18} />}
              </button>
            );
          },
        },
      ];
    },
    [
      isSeller,
      markAsSeen,
      navigate,
      notificationReadBaselineAt,
      readNotificationIds,
    ],
  );
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

  useEffect(() => {
    dispatch(setNotificationsSeenAt(Date.now()));
  }, [dispatch]);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const params = toQueryParams();
      const endpoint = isSeller
        ? ENDPOINTS.notifications.mine
        : ENDPOINTS.notifications.admin;
      const res = await axiosProvider.get(endpoint, {
        params: {
          page: params.page,
          limit: params.limit,
          type: params.type || undefined,
          search: params.search || undefined,
        },
      });
      const data = res?.data?.data;
      const items = Array.isArray(data)
        ? data
        : data?.items || data?.list || data?.notifications || [];
      const totalCount = Number(
        res?.data?.pagination?.total ?? res?.data?.meta?.total ?? items.length,
      );
      setNotifications(items);
      setTotal(totalCount);
      dispatch(setNotificationsSeenAt(Date.now()));
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Failed to load notifications";
      if (!silent) {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dispatch, isSeller, toQueryParams]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => fetchNotifications({ silent: true }),
      15_000,
    );
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

  const handleSend = async () => {
    if (isSeller) {
      toast.error("Sending notifications is admin-only");
      return;
    }
    if (!form.userId.trim())
      return toast.error("Recipient User ID is required");
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
      toast.error(
        err?.response?.data?.message || "Failed to send notification",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={isSeller ? "View and manage all your notifications." : "Send and manage user notifications"}
        breadcrumbs={[{ label: isSeller ? "Marketing" : "User Management" }, { label: "Notifications" }]}
        actions={
          <div className="flex items-center gap-2">
            {!isSeller && (
              <PermissionGuard
                module="notifications"
                action={ACTIONS.CREATE}
                hide
              >
                <button onClick={() => setModalOpen(true)}>
                  <MdSend size={16} /> Send Notification
                </button>
              </PermissionGuard>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
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
        rowClassName={(row) =>
          isNotificationUnread(
            row,
            readNotificationIds,
            notificationReadBaselineAt,
          )
            ? "bg-blue-50/40 font-semibold"
            : ""
        }
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            listPage={list}
            loading={loading}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, userId: e.target.value }))
                  }
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, channel: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <select
                    value={form.template}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, template: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {TEMPLATE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
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
