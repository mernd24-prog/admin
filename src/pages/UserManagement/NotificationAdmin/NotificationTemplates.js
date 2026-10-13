/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { MdAdd, MdRefresh, MdSend } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, PageHeader, StatusBadge } from "../../../components/Shared";
import { axiosPrivate as api } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";

import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import OrangeButton from "../../../components/Atoms/buttons/OrangeButton";

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "in_app", label: "In-App" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "buyers", label: "Buyers" },
  { value: "sellers", label: "Sellers" },
  { value: "specific_users", label: "Specific Users" },
];

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY, h:mm A") : "—");

const EMPTY_FORM = {
  title: "",
  body: "",
  channel: "in_app",
  audience: "all",
  userIds: "",
  data: "",
};

const NotificationTemplates = () => {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [campaignId, setCampaignId] = useState(() => localStorage.getItem("notificationCampaignId") || "");
  const [campaignProgress, setCampaignProgress] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      const response = await api.get(`/notifications/campaigns/${campaignId}`);
      setCampaignProgress(response?.data?.data);
    } catch { /* Keep the last known progress during transient network failures. */ }
  }, [campaignId]);
  useEffect(() => {
    loadCampaign();
    if (!campaignId) return undefined;
    const timer = window.setInterval(loadCampaign, 10000);
    return () => window.clearInterval(timer);
  }, [campaignId, loadCampaign]);
  const retryCampaign = async () => {
    setRetrying(true);
    try {
      await api.post(`/notifications/campaigns/${campaignId}/retry`);
      toast.success("Failed recipients queued for retry");
      await loadCampaign();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Retry failed");
    } finally { setRetrying(false); }
  };
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(ENDPOINTS.notifications.admin, {
        params: { limit: 20, offset: 0 },
      });
      const data = res?.data?.data;
      setNotifications(data?.list || data?.notifications || data || []);
      setTotal(data?.total || 0);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSend = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Title required");
      return;
    }
    if (!form.body.trim()) {
      toast.error("Message body required");
      return;
    }
    try {
      setSending(true);
      let extraData = {};
      if (form.data.trim()) {
        try {
          extraData = JSON.parse(form.data);
        } catch {
          toast.error("Data must be valid JSON");
          return;
        }
      }
      const response = await api.post(ENDPOINTS.notifications.send, {
        title: form.title,
        body: form.body,
        channel: form.channel,
        audience: form.audience,
        userIds: form.userIds
          ? form.userIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          : undefined,
        data: Object.keys(extraData).length ? extraData : undefined,
      });
      const queuedId = response?.data?.data?.campaignId;
      if (queuedId) {
        setCampaignId(queuedId);
        localStorage.setItem("notificationCampaignId", queuedId);
      }
      toast.success("Notification campaign queued. Sending will continue in the background.");
      setShowSend(false);
      setForm(EMPTY_FORM);
      fetchNotifications();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to send notification",
      );
    } finally {
      setSending(false);
    }
  }, [form, fetchNotifications]);

  const COLUMNS = [
    {
      key: "title",
      label: "Title",
      render: (v) => (
        <span className="font-medium text-gray-800">{v || "—"}</span>
      ),
    },
    {
      key: "body",
      label: "Message",
      render: (v) => (
        <span className="text-sm text-gray-600 truncate max-w-[200px] block">
          {v || "—"}
        </span>
      ),
    },
    {
      key: "channel",
      label: "Channel",
      render: (v) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${v === "push" ? "bg-blue-100 text-blue-700" : v === "email" ? "bg-purple-100 text-purple-700" : v === "sms" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
        >
          {v || "push"}
        </span>
      ),
    },
    {
      key: "audience",
      label: "Audience",
      render: (v) => (
        <span className="text-sm capitalize">
          {String(v || "all").replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <StatusBadge
          status={v || "sent"}
          color={v === "failed" ? "red" : "green"}
        />
      ),
    },
    {
      key: "createdAt",
      label: "Sent",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Send and manage admin notifications"
        breadcrumbs={[{ label: "User Management" }, { label: "Notifications" }]}
        actions={
          <div className="flex gap-2">
            {/* <button onClick={fetchNotifications}>
              <MdRefresh size={16} /> Refresh
            </button> */}
            <button onClick={() => setShowSend(true)}>
              <MdAdd size={16} /> Send Notification
            </button>
          </div>
        }
      />

      {campaignProgress && (
        <div className="mb-4 rounded border bg-white p-4 text-sm">
          <div className="font-semibold">Latest campaign: {campaignProgress.campaign?.title}</div>
          <div>Preparation: {campaignProgress.campaign?.status}</div>
          <div className="my-2 flex flex-wrap gap-4">
            {Object.entries(campaignProgress.counts || {}).map(([status, count]) => (
              <span key={status}>{status.replace(/_/g, " ")}: {count}</span>
            ))}
          </div>
          {campaignProgress.campaign?.lastError && <p>{campaignProgress.campaign.lastError}</p>}
          {(campaignProgress.counts?.failed > 0 || campaignProgress.campaign?.status === "failed") && (
            <button type="button" disabled={retrying} onClick={retryCampaign} className="rounded border px-3 py-2">
              {retrying ? "Queueing…" : "Retry failed recipients / resume campaign"}
            </button>
          )}
          {campaignProgress.failed?.map(item => (
            <div key={item._id}>{item.userId}: {item.lastError}</div>
          ))}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={notifications}
          total={total}
          emptyMessage="No notifications sent yet"
        />
      )}

      <DefaultModal
        isOpen={showSend}
        onClose={() => {
          setShowSend(false);
          setForm(EMPTY_FORM);
        }}
        title="Send Notification"
        isButtonView={false}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Notification title..."
          />
          <Input
            type="textarea"
            label="Message"
            required
            rows={3}
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder="Notification message..."
          />
          <div className="grid grid-cols-2 gap-4">
            <FilterSelect
              label="Channel"
              options={CHANNEL_OPTIONS}
              value={
                CHANNEL_OPTIONS.find((c) => c.value === form.channel) || null
              }
              onChange={(opt) =>
                setForm((p) => ({ ...p, channel: opt?.value || "push" }))
              }
              isSearchable={false}
            />
            <FilterSelect
              label="Audience"
              options={AUDIENCE_OPTIONS}
              value={
                AUDIENCE_OPTIONS.find((a) => a.value === form.audience) ||
                null
              }
              onChange={(opt) =>
                setForm((p) => ({ ...p, audience: opt?.value || "all" }))
              }
              isSearchable={false}
            />
          </div>
          {form.audience === "specific_users" && (
            <Input
              label="User IDs (comma separated)"
              value={form.userIds}
              onChange={(e) =>
                setForm((p) => ({ ...p, userIds: e.target.value }))
              }
              placeholder="uuid1, uuid2, uuid3..."
            />
          )}
          <Input
            type="textarea"
            label="Extra Data (JSON, optional)"
            rows={2}
            value={form.data}
            onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
            placeholder='{"action": "open_order", "orderId": "..."}'
            inputClassName="font-mono"
          />
          <div className="pt-2">
            <OrangeButton
              onClick={handleSend}
              disabled={sending}
              className="w-full justify-center py-2 text-sm"
            >
              <MdSend size={16} />
              {sending ? "Sending..." : "Send Notification"}
            </OrangeButton>
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default NotificationTemplates;
