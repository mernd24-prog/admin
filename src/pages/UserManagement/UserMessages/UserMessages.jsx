import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdDoneAll,
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
import { formatDateTime12Hour } from "../../../utils/formatters";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormSelectGroup from "../../../components/Atoms/FormSelectGroup/FormSelectGroup";

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

const CLASS_FORM_INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]";

const firstValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

const extractEntityFromText = (text = "") => {
  if (!text) return {};
  const str = String(text);

  // 1. Order ID or Order Number (e.g. ORD-260909-5AV72IJI)
  const orderNumMatch = str.match(/\b(ORD-[A-Za-z0-9-]+)\b/i);
  if (orderNumMatch) return { orderId: orderNumMatch[1] };

  // 2. UUID matching (36-character standard UUID)
  const uuidMatch = str.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i,
  );
  if (uuidMatch) {
    const uuid = uuidMatch[1];
    const lower = str.toLowerCase();
    if (
      lower.includes("payout") ||
      lower.includes("finance") ||
      lower.includes("wallet")
    ) {
      return { payoutId: uuid };
    }
    if (
      lower.includes("shipment") ||
      lower.includes("tracking") ||
      lower.includes("transit") ||
      lower.includes("courier")
    ) {
      return { shipmentId: uuid };
    }
    if (lower.includes("invoice") || lower.includes("tax")) {
      return { invoiceId: uuid, orderId: uuid };
    }
    if (lower.includes("product") || lower.includes("item")) {
      return { productId: uuid };
    }
    if (
      lower.includes("return") ||
      lower.includes("refund") ||
      lower.includes("rma")
    ) {
      return { returnId: uuid };
    }
    if (lower.includes("order") || lower.includes("payment")) {
      return { orderId: uuid };
    }
    return { genericId: uuid };
  }

  // 3. Fallback to topic based on keywords
  const lower = str.toLowerCase();
  if (
    lower.includes("payout") ||
    lower.includes("finance") ||
    lower.includes("wallet")
  ) {
    return { topic: "payout" };
  }
  if (lower.includes("invoice") || lower.includes("tax")) {
    return { topic: "invoice" };
  }
  if (
    lower.includes("shipment") ||
    lower.includes("delivery") ||
    lower.includes("delivered") ||
    lower.includes("transit")
  ) {
    return { topic: "shipment" };
  }
  if (
    lower.includes("product") ||
    lower.includes("catalog") ||
    lower.includes("inventory")
  ) {
    return { topic: "product" };
  }
  if (lower.includes("order") || lower.includes("payment")) {
    return { topic: "order" };
  }
  if (lower.includes("return") || lower.includes("refund")) {
    return { topic: "return" };
  }

  return {};
};

const getNotificationDetailRoute = (notification = {}, isSeller = false) => {
  const meta =
    notification.payload ||
    notification.meta ||
    notification.metadata ||
    notification.data ||
    {};

  const textCorpus = [
    notification.subject,
    notification.template,
    notification.message,
    notification.title,
    meta.title,
    meta.message,
    meta.subject,
    meta.description,
  ]
    .filter(Boolean)
    .join(" ");

  const extracted = extractEntityFromText(textCorpus);

  const orderId = firstValue(
    meta.orderId,
    meta.order_id,
    meta.orderNumber,
    meta.order_number,
    notification.orderId,
    notification.order_id,
    extracted.orderId,
  );
  const invoiceId = firstValue(
    meta.invoiceId,
    meta.invoice_id,
    meta.taxInvoiceId,
    notification.invoiceId,
    notification.invoice_id,
    extracted.invoiceId,
  );
  const shipmentId = firstValue(
    meta.shipmentId,
    meta.shipment_id,
    notification.shipmentId,
    notification.shipment_id,
    extracted.shipmentId,
  );
  const payoutId = firstValue(
    meta.payoutId,
    meta.payout_id,
    notification.payoutId,
    notification.payout_id,
    extracted.payoutId,
  );
  const productId = firstValue(
    meta.productId,
    meta.product_id,
    notification.productId,
    notification.product_id,
    extracted.productId,
  );
  const returnId = firstValue(
    meta.returnId,
    meta.return_id,
    notification.returnId,
    notification.return_id,
    extracted.returnId,
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

  if (invoiceId) return `/app/tax-invoices/${encodeURIComponent(invoiceId)}`;
  if (creditNoteId)
    return `/app/credit-notes?creditNoteId=${encodeURIComponent(creditNoteId)}`;
  if (payoutId)
    return isSeller
      ? `/app/seller-payouts?payoutId=${encodeURIComponent(payoutId)}`
      : `/app/payout-ops-queue?payoutId=${encodeURIComponent(payoutId)}`;
  if (returnId) return `/app/returns?returnId=${encodeURIComponent(returnId)}`;
  if (productId) return `/app/products/edit/${encodeURIComponent(productId)}`;
  if (shipmentId) {
    const params = new URLSearchParams({ shipmentId: String(shipmentId) });
    if (orderId) params.set("orderId", String(orderId));
    return `/app/shipment-tracking?${params.toString()}`;
  }
  if (dealId)
    return `/app/deal-management?dealId=${encodeURIComponent(dealId)}`;
  if (orderId) return `/app/orders/view/${encodeURIComponent(orderId)}`;

  // Module listing fallback
  if (extracted.topic === "payout")
    return isSeller ? "/app/seller-payouts" : "/app/payout-ops-queue";
  if (extracted.topic === "invoice") return "/app/tax-invoices";
  if (extracted.topic === "shipment") return "/app/shipment-tracking";
  if (extracted.topic === "product") return "/app/products";
  if (extracted.topic === "order") return "/app/orders";
  if (extracted.topic === "return") return "/app/returns";

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

  const columns = useMemo(() => {
    const cols = [];

    if (!isSeller) {
      cols.push({
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
      });
    }

    cols.push(
      {
        key: "template",
        label: "Template",
        render: (v, row) => (
          <span className="text-xs text-gray-700 line-clamp-2">
            {v || row.message || row.payload?.message || "—"}
          </span>
        ),
      },
      {
        key: "subject",
        label: "Subject",
        render: (v, row) => (
          <span className="text-sm font-semibold text-[var(--admin-ink)]">
            {v || row.payload?.title || "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (v, row) => {
          const unread = isNotificationUnread(
            row,
            readNotificationIds,
            notificationReadBaselineAt,
          );
          if (v === "failed" || v === "error") {
            return <StatusBadge status="failed" dot />;
          }
          if (unread) {
            return <StatusBadge status="unread" label="New" dot animate />;
          }
          return (
            <StatusBadge
              status="seen"
              label="Seen"
              dot
              className="opacity-75"
            />
          );
        },
      },
      {
        key: "createdAt",
        label: "Sent At",
        sortable: true,
        render: (v) => (
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {v ? formatDateTime12Hour(new Date(v)) : "—"}
          </span>
        ),
      },
    );

    return cols;
  }, [isSeller, notificationReadBaselineAt, readNotificationIds]);

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

  const fetchNotifications = useCallback(
    async ({ silent = false } = {}) => {
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
          res?.data?.pagination?.total ??
            res?.data?.meta?.total ??
            items.length,
        );
        setNotifications(items);
        setTotal(totalCount);
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
    },
    [isSeller, toQueryParams],
  );

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

  const handleMarkAllAsSeen = useCallback(() => {
    notifications.forEach((n) => markAsSeen(n));
    dispatch(setNotificationsSeenAt(Date.now()));
    toast.success("All notifications marked as seen");
  }, [dispatch, markAsSeen, notifications]);

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

  const hasUnread = notifications.some((n) =>
    isNotificationUnread(
      n,
      readNotificationIds,
      notificationReadBaselineAt,
    ),
  );

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={
          isSeller
            ? "View and manage all your notifications."
            : "Send and manage user notifications"
        }
        breadcrumbs={[
          { label: isSeller ? "Marketing" : "User Management" },
          { label: "Notifications" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                type="button"
                className="admin-btn-secondary text-xs flex items-center gap-1.5"
                onClick={handleMarkAllAsSeen}
              >
                <MdDoneAll size={16} /> Mark All as Seen
              </button>
            )}
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
        onRowClick={(row) => {
          markAsSeen(row);
          const detailRoute = getNotificationDetailRoute(row, isSeller);
          if (detailRoute) {
            navigate(detailRoute);
          }
        }}
        rowClassName={(row) => {
          const unread = isNotificationUnread(
            row,
            readNotificationIds,
            notificationReadBaselineAt,
          );
          return unread
            ? "bg-white font-semibold hover:bg-blue-50/40 cursor-pointer transition-colors"
            : "opacity-60 bg-gray-50/50 text-gray-500 font-normal hover:bg-gray-100/60 hover:opacity-85 cursor-pointer transition-all";
        }}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            listPage={list}
            loading={loading}
          />
        }
        rowActions={(row) => {
          const detailRoute = getNotificationDetailRoute(row, isSeller);
          const unread = isNotificationUnread(
            row,
            readNotificationIds,
            notificationReadBaselineAt,
          );

          const actions = [];

          if (detailRoute) {
            actions.push({
              label: "View Detail",
              icon: <MdVisibility size={16} className="text-blue-600" />,
              onClick: () => {
                markAsSeen(row);
                navigate(detailRoute);
              },
            });
          }

          if (unread) {
            actions.push({
              label: "Mark as Seen",
              icon: <MdMarkEmailRead size={16} className="text-emerald-600" />,
              onClick: () => markAsSeen(row),
            });
          }

          return actions;
        }}
      />

      {/* Send Notification Modal */}
      <DefaultModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSend}
        title="Send Notification"
        submitButtonText={sending ? "Sending…" : "Send Notification"}
        closeButtonText="Cancel"
        loading={sending}
        isButtonView={true}
      >
        <div className="space-y-5">
          {/* ==================== Recipient Information ==================== */}
          <FormSection
            title="Recipient Information"
            description="Select the user who should receive this notification."
          >
            <div className="space-y-4">
              <FormInput
                label="Recipient User ID"
                name="userId"
                value={form.userId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    userId: e.target.value,
                  }))
                }
                placeholder="Enter user ID or email"
                required
              />
            </div>
          </FormSection>

          {/* ==================== Notification Settings ==================== */}
          <FormSection
            title="Notification Settings"
            description="Choose the channel and template for this notification."
          >
            <div className="space-y-4">
              <FormSelectGroup
                label="Channel"
                options={CHANNEL_OPTIONS}
                value={
                  CHANNEL_OPTIONS.find((item) => item.value === form.channel) ||
                  null
                }
                onChange={(selectedOption) =>
                  setForm((prev) => ({
                    ...prev,
                    channel: selectedOption?.value ?? "",
                  }))
                }
                placeholder="Select channel"
              />

              <FormSelectGroup
                label="Template"
                options={TEMPLATE_OPTIONS}
                value={
                  TEMPLATE_OPTIONS.find(
                    (item) => item.value === form.template,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setForm((prev) => ({
                    ...prev,
                    template: selectedOption?.value ?? "",
                  }))
                }
                placeholder="Select template"
              />
            </div>
          </FormSection>

          {/* ==================== Notification Content ==================== */}
          <FormSection
            title="Notification Content"
            description="Add the subject and message for the notification."
          >
            <div className="space-y-4">
              <FormInput
                label="Subject"
                name="subject"
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="Notification subject"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>

                <textarea
                  name="message"
                  value={form.message}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={5}
                  className={`${CLASS_FORM_INPUT} resize-none`}
                  placeholder="Notification message (optional for templated notifications)"
                />
              </div>
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default UserMessages;
