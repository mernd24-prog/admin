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
  { value: "push", label: "Push" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
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
  channel: "push",
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
      await api.post(ENDPOINTS.notifications.send, {
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
      toast.success("Notification sent");
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Send and manage admin notifications"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchNotifications}>
              <MdRefresh size={16} /> Refresh
            </button>
            <button onClick={() => setShowSend(true)}>
              <MdAdd size={16} /> Send Notification
            </button>
          </div>
        }
      />

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
