/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { MdRefresh, MdTrendingUp, MdVisibility } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { ConfirmModal, DataTable, PageHeader, StatusBadge } from "../../../components/Shared";
import Input from "../../../components/Atoms/Input/Input";
import { axiosPrivate as api } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const STATUS_COLOR = { active: "green", inactive: "gray", pending: "yellow", suspended: "red" };

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;

const InfluencerManagement = () => {
  const [influencers, setInfluencers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState({ open: false, item: null, newStatus: "" });
  const [promoteConfirm, setPromoteConfirm] = useState({ open: false, item: null, tier: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const fetchInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(ENDPOINTS.referral.influencers, {
        params: { limit: 20, offset: 0 },
      });
      const data = res?.data?.data;
      setInfluencers(data?.list || data?.influencers || data || []);
      setTotal(data?.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load influencers";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInfluencers(); }, [fetchInfluencers]);

  const handleStatusChange = useCallback(async () => {
    const { item, newStatus } = statusConfirm;
    if (!item) return;
    const influencerId = item._id || item.id;
    try {
      setActionLoading(true);
      await api.patch(ENDPOINTS.referral.influencerStatus(influencerId), { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setStatusConfirm({ open: false, item: null, newStatus: "" });
      fetchInfluencers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setActionLoading(false);
    }
  }, [statusConfirm, fetchInfluencers]);

  const handlePromote = useCallback(async () => {
    const { item, tier } = promoteConfirm;
    if (!item) return;
    const influencerId = item._id || item.id;
    try {
      setActionLoading(true);
      await api.patch(ENDPOINTS.referral.promoteInfluencer(influencerId), { tier });
      toast.success("Influencer promoted");
      setPromoteConfirm({ open: false, item: null, tier: "" });
      fetchInfluencers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Promotion failed");
    } finally {
      setActionLoading(false);
    }
  }, [promoteConfirm, fetchInfluencers]);

  const COLUMNS = [
    {
      key: "userId",
      label: "User",
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-800">{row.name || row.displayName || String(v || "—").slice(-8)}</p>
          <p className="text-xs text-gray-500 font-mono">{String(v || "—").slice(-8)}</p>
        </div>
      ),
    },
    {
      key: "referralCode",
      label: "Code",
      render: (v) => <span className="font-mono text-sm font-bold text-blue-700">{v || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} />,
    },
    {
      key: "tier",
      label: "Tier",
      render: (v) => <span className="capitalize text-sm">{v || "—"}</span>,
    },
    {
      key: "totalReferrals",
      label: "Referrals",
      render: (v) => <span className="text-sm font-medium">{v ?? 0}</span>,
    },
    {
      key: "totalEarnings",
      label: "Earnings",
      render: (v) => <span className="text-sm font-medium text-green-700">{money(v)}</span>,
    },
    {
      key: "joinedAt",
      label: "Joined",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => setDetail(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><MdVisibility size={18} /></button>
          <button
            onClick={() => setPromoteConfirm({ open: true, item: row, tier: "" })}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
            title="Promote"
          >
            <MdTrendingUp size={18} />
          </button>
          <button
            onClick={() => setStatusConfirm({ open: true, item: row, newStatus: row.status === "active" ? "suspended" : "active" })}
            className={`px-2 py-1 text-xs rounded ${row.status === "active" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
          >
            {row.status === "active" ? "Suspend" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Influencer Management"
        subtitle="Manage referral influencers and their performance"
        actions={
          <button onClick={fetchInfluencers} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}
      {loading ? <Loader /> : (
        <DataTable columns={COLUMNS} data={influencers} total={total} emptyMessage="No influencers found" />
      )}

      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Influencer Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Name</p><p className="font-medium">{detail.name || detail.displayName || "—"}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status} color={STATUS_COLOR[detail.status] || "gray"} /></div>
              <div><p className="text-gray-500">Referral Code</p><p className="font-mono font-bold text-blue-700">{detail.referralCode || "—"}</p></div>
              <div><p className="text-gray-500">Tier</p><p className="capitalize">{detail.tier || "—"}</p></div>
              <div><p className="text-gray-500">Total Referrals</p><p className="font-medium">{detail.totalReferrals ?? 0}</p></div>
              <div><p className="text-gray-500">Active Referrals</p><p>{detail.activeReferrals ?? 0}</p></div>
              <div><p className="text-gray-500">Total Earnings</p><p className="font-semibold text-green-700">{money(detail.totalEarnings)}</p></div>
              <div><p className="text-gray-500">Pending Payouts</p><p>{money(detail.pendingPayout)}</p></div>
              <div><p className="text-gray-500">User ID</p><p className="font-mono text-xs">{detail.userId || detail._id}</p></div>
              <div><p className="text-gray-500">Joined</p><p>{fmt(detail.joinedAt)}</p></div>
            </div>
          </div>
        )}
      </DefaultModal>

      <ConfirmModal
        isOpen={statusConfirm.open}
        title={statusConfirm.newStatus === "suspended" ? "Suspend Influencer" : "Activate Influencer"}
        description={`${statusConfirm.newStatus === "suspended" ? "Suspend" : "Activate"} this influencer's account?`}
        onConfirm={handleStatusChange}
        onCancel={() => setStatusConfirm({ open: false, item: null, newStatus: "" })}
        loading={actionLoading}
        confirmLabel={statusConfirm.newStatus === "suspended" ? "Suspend" : "Activate"}
        confirmVariant={statusConfirm.newStatus === "suspended" ? "danger" : "success"}
      />

      <ConfirmModal
        isOpen={promoteConfirm.open}
        title="Promote Influencer"
        description="Update this influencer's tier"
        onConfirm={handlePromote}
        onCancel={() => setPromoteConfirm({ open: false, item: null, tier: "" })}
        loading={actionLoading}
        confirmLabel="Promote"
        confirmVariant="primary"
      >
        <div className="mt-3">
          <Input
            label="New Tier"
            value={promoteConfirm.tier}
            onChange={(e) => setPromoteConfirm((p) => ({ ...p, tier: e.target.value }))}
            placeholder="e.g. silver, gold, platinum"
          />
        </div>
      </ConfirmModal>
    </div>
  );
};

export default InfluencerManagement;
