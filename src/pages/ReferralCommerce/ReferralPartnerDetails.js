import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BadgeIndianRupee,
  Check,
  Coins,
  Eye,
  FileText,
  GitBranch,
  Gift,
  Landmark,
  Link,
  ShieldCheck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import SharedDataTable from "../../components/Shared/DataTable";
import {
  FormSection,
  PageHeader,
  StatusBadge,
  SummaryCard,
} from "../../components/Shared";
import {
  getReferralBonusAchievements,
  getReferralBonusProgress,
  getReferralBrandAssociates,
  getReferralCodes,
  getReferralCommissions,
  getReferralInfluencers,
  getReferralOrders,
  getReferralPayouts,
  promoteReferralInfluencer,
  reviewReferralInfluencerVerification,
  updateReferralInfluencerChildPermission,
  updateReferralInfluencerStatus,
} from "../../Redux/referralCommerceSlice";
import { formatDateTime12Hour, formatLabel } from "../../utils/formatters";

const getBranchPayload = (branch = {}) =>
  branch?.normalized?.data || branch?.data?.data || branch?.data || {};

const getBranchList = (branch = {}) => {
  const payload = getBranchPayload(branch);
  if (Array.isArray(payload)) return payload;
  return payload?.list || payload?.items || [];
};

const getId = (record = {}) =>
  record.id || record._id || record.influencerId || record.codeId || record.payoutId;

const fullName = (user = {}) => {
  const profile = user.profile || {};
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Referral Partner"
  );
};

const shortId = (value) => (value ? String(value).slice(0, 12) : "-");

const formatAmount = (value) =>
  `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatCoins = (value) =>
  `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} coins`;

const formatDate = (value) => formatDateTime12Hour(value, "-");

const humanize = (value) => formatLabel(value, "-");

const firstValue = (...values) =>
  values.find((value) => String(value || "").trim().length > 0) || "";

const getVerificationData = (influencer = {}) => {
  const user = influencer.user || {};
  const profile = user.profile || {};
  const sellerProfile = influencer.sellerProfile || user.sellerProfile || {};
  const metadataDetails = influencer.metadata?.details || {};
  const kyc =
    influencer.kyc || user.kyc || influencer.sellerKyc || user.sellerKyc || {};
  const documents = {
    ...(metadataDetails.documents || {}),
    ...(sellerProfile.documents || {}),
    ...(sellerProfile.kycDocuments || {}),
    ...(kyc.documents || {}),
    ...(influencer.documents || {}),
    ...(influencer.kycDocuments || {}),
    ...(user.documents || {}),
    ...(user.kycDocuments || {}),
  };
  const payout = metadataDetails.payout || {};
  const bankDetails = {
    ...payout,
    ...(sellerProfile.bankDetails || {}),
    ...(user.bankDetails || {}),
    ...(influencer.bankDetails || {}),
    ...(influencer.bank || {}),
    ...(user.bank || {}),
  };

  return {
    documents,
    kyc,
    kycStatus: firstValue(
      influencer.kycStatus,
      influencer.kycVerificationStatus,
      kyc.verificationStatus,
      kyc.status,
      user.kycStatus,
      user.sellerProfile?.kycStatus,
      sellerProfile.kycStatus,
    ),
    bankStatus: firstValue(
      influencer.bankVerificationStatus,
      influencer.payoutProfileStatus,
      influencer.bankStatus,
      bankDetails.verificationStatus,
      bankDetails.status,
      user.bankVerificationStatus,
      user.sellerProfile?.bankVerificationStatus,
      sellerProfile.bankVerificationStatus,
    ),
    bankDetails,
    profile,
    panNumber: firstValue(
      influencer.pan,
      influencer.panNumber,
      user.pan,
      user.panNumber,
      profile.pan,
      profile.panNumber,
      kyc.pan,
      kyc.panNumber,
    ),
  };
};

const documentLabel = (key) =>
  String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());

const documentEntries = (documents = {}) =>
  Object.entries(documents)
    .map(([key, value]) => [
      key,
      typeof value === "object"
        ? value?.url || value?.fileUrl || value?.path || value?.name || ""
        : value,
    ])
    .filter(([, value]) => value);

const maskAccountNumber = (value) => {
  const accountNumber = String(value || "");
  return accountNumber.length > 4
    ? `****${accountNumber.slice(-4)}`
    : accountNumber || "-";
};

const refreshPartner = (dispatch, id) => {
  dispatch(getReferralInfluencers({ page: 1, limit: 200, influencerId: id }));
  dispatch(getReferralCodes({ page: 1, limit: 200, influencerId: id }));
  dispatch(getReferralOrders({ page: 1, limit: 200, influencerId: id }));
  dispatch(getReferralCommissions({ page: 1, limit: 200, influencerId: id }));
  dispatch(getReferralPayouts({ page: 1, limit: 200, influencerId: id }));
  dispatch(getReferralBonusProgress({ page: 1, limit: 200, influencerId: id }));
  dispatch(getReferralBonusAchievements({ page: 1, limit: 200, influencerId: id }));
};

const partnerTypeLabel = (value) =>
  value === "parent"
    ? "Growth Partner"
    : value === "child"
      ? "Brand Associate"
      : humanize(value);

const findInfluencer = (items = [], influencerId) =>
  items.find((item) => String(getId(item)) === String(influencerId)) || null;

const ReferralPartnerDetails = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const referralState = useSelector((state) => state.referralCommerce || {});
  const navigatedInfluencer = location.state?.influencer;
  const [activeActivityTab, setActiveActivityTab] = useState("codes");

  const influencers = useMemo(
    () => getBranchList(referralState.influencersData),
    [referralState.influencersData],
  );
  const brandAssociates = useMemo(
    () => getBranchList(referralState.brandAssociatesData),
    [referralState.brandAssociatesData],
  );
  const codes = useMemo(
    () =>
      getBranchList(referralState.codesData).filter(
        (code) => String(code.influencerId) === String(id),
      ),
    [id, referralState.codesData],
  );
  const orders = useMemo(
    () =>
      getBranchList(referralState.ordersData).filter(
        (order) => String(order.influencerId) === String(id),
      ),
    [id, referralState.ordersData],
  );
  const commissions = useMemo(
    () =>
      getBranchList(referralState.commissionsData).filter(
        (entry) => String(entry.influencerId) === String(id),
      ),
    [id, referralState.commissionsData],
  );
  const payouts = useMemo(
    () =>
      getBranchList(referralState.payoutsData).filter(
        (payout) => String(payout.influencerId) === String(id),
      ),
    [id, referralState.payoutsData],
  );
  const bonusProgress = useMemo(
    () =>
      getBranchList(referralState.bonusProgressData).filter(
        (row) => String(row.influencer?.id) === String(id),
      ),
    [id, referralState.bonusProgressData],
  );
  const bonusAchievements = useMemo(
    () =>
      getBranchList(referralState.bonusAchievementsData).filter(
        (achievement) => String(achievement.influencerId) === String(id),
      ),
    [id, referralState.bonusAchievementsData],
  );

  const influencer = useMemo(
    () => navigatedInfluencer || findInfluencer(influencers, id),
    [id, influencers, navigatedInfluencer],
  );

  useEffect(() => {
    if (!id) return;

    dispatch(getReferralInfluencers({ page: 1, limit: 200, influencerId: id }));
    dispatch(getReferralCodes({ page: 1, limit: 200, influencerId: id }));
    dispatch(getReferralOrders({ page: 1, limit: 200, influencerId: id }));
    dispatch(getReferralCommissions({ page: 1, limit: 200, influencerId: id }));
    dispatch(getReferralPayouts({ page: 1, limit: 200, influencerId: id }));
    dispatch(getReferralBonusProgress({ page: 1, limit: 200, influencerId: id }));
    dispatch(getReferralBonusAchievements({ page: 1, limit: 200, influencerId: id }));
  }, [dispatch, id]);

  useEffect(() => {
    if (!id || influencer?.influencerType !== "parent") return;
    dispatch(getReferralBrandAssociates({ parentId: id, page: 1, limit: 200 }));
  }, [dispatch, id, influencer?.influencerType]);

  const infoRows = useMemo(() => {
    if (!influencer) return [];
    const profileUser = influencer.user || {};
    const profile = profileUser.profile || {};
    return [
      { label: "Full name", value: fullName(profileUser) },
      { label: "Email", value: profileUser.email || "-" },
      { label: "Phone", value: profile.phone || profileUser.phone || "-" },
      { label: "Profile ID", value: shortId(getId(influencer)) },
      { label: "User ID", value: shortId(influencer.userId) },
      { label: "Role type", value: partnerTypeLabel(influencer.influencerType) },
      { label: "Status", value: <StatusBadge status={influencer.status} size="sm" /> },
      { label: "Primary code", value: influencer.primaryCode?.code || "-" },
      { label: "Hierarchy level", value: `Level ${influencer.level || 1}` },
      { label: "Available coins", value: formatCoins(influencer.wallet?.availableBalance) },
      { label: "Created", value: formatDate(influencer.createdAt) },
    ];
  }, [influencer]);

  const verificationData = useMemo(
    () => getVerificationData(influencer || {}),
    [influencer],
  );

  const runPartnerAction = async (action) => {
    if (!influencer) return;
    try {
      await action();
      refreshPartner(dispatch, id);
    } catch (error) {
      toast.error(error || "Unable to update referral partner");
    }
  };

  const reviewVerification = (section, decision) =>
    runPartnerAction(async () => {
      const reason = decision === "rejected"
        ? window.prompt(`Reason for rejecting ${section === "kyc" ? "KYC documents" : "bank details"}:`)
        : "";
      if (decision === "rejected" && !reason?.trim()) return;
      await dispatch(
        reviewReferralInfluencerVerification({
          influencerId: getId(influencer),
          section,
          decision,
          reason: reason?.trim() || null,
        }),
      ).unwrap();
      toast.success(`${section === "kyc" ? "KYC" : "Bank"} ${decision}`);
    });

  const updatePartnerStatus = () =>
    runPartnerAction(async () => {
      const nextStatus = influencer.status === "active" ? "suspended" : "active";
      await dispatch(
        updateReferralInfluencerStatus({ influencerId: getId(influencer), status: nextStatus }),
      ).unwrap();
      toast.success("Referral Partner status updated");
    });

  const togglePermission = () =>
    runPartnerAction(async () => {
      const canCreateChildren = !influencer.canCreateChildren;
      await dispatch(
        updateReferralInfluencerChildPermission({
          influencerId: getId(influencer),
          canCreateChildren,
          reason: canCreateChildren ? "Granted by Admin" : "Revoked by Admin",
        }),
      ).unwrap();
      toast.success(canCreateChildren ? "Child account permission granted" : "Child account permission revoked");
    });

  const promotePartner = () =>
    runPartnerAction(async () => {
      await dispatch(
        promoteReferralInfluencer({ influencerId: getId(influencer), canCreateChildren: true }),
      ).unwrap();
      toast.success("Brand Associate promoted to Growth Partner");
    });

  const copyRegistrationLink = async () => {
    const link = influencer?.childRegistration?.registrationUrl;
    if (!link || !influencer.childRegistration?.shareable) {
      toast.error("Grant child account permission before sharing this registration link");
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Associate registration link copied");
  };

  const codeRows = useMemo(
    () =>
      codes.map((code) => ({
        key: getId(code),
        code: code.code,
        status: <StatusBadge status={code.status} size="sm" />,
        usage: `${code.usageCount || 0}${code.usageLimit ? ` / ${code.usageLimit}` : ""}`,
        created: formatDate(code.createdAt),
      })),
    [codes],
  );

  const orderRows = useMemo(
    () =>
      orders.map((order) => ({
        key: getId(order),
        order: order.orderNumber || order.orderId || "-",
        code: order.code || "-",
        amount: formatAmount(order.eligibleAmount),
        status: <StatusBadge status={order.status} size="sm" />,
        created: formatDate(order.createdAt),
      })),
    [orders],
  );

  const commissionRows = useMemo(
    () =>
      commissions.map((entry) => ({
        key: getId(entry),
        order: entry.orderNumber || entry.orderId || "-",
        type: entry.commissionType || "-",
        amount: formatCoins(entry.amount),
        basis: formatAmount(entry.basisAmount),
        status: <StatusBadge status={entry.status} size="sm" />,
      })),
    [commissions],
  );

  const payoutRows = useMemo(
    () =>
      payouts.map((payout) => ({
        key: getId(payout),
        coins: formatCoins(payout.coinAmount ?? payout.amount),
        payable: formatAmount(
          payout.currencyAmount ??
            Number((payout.coinAmount ?? payout.amount) || 0) * Number(payout.coinValue || 1),
        ),
        method: payout.payoutMethod || "-",
        status: <StatusBadge status={payout.status} size="sm" />,
        requested: formatDate(payout.requestedAt || payout.createdAt),
      })),
    [payouts],
  );

  const brandAssociateRows = useMemo(
    () =>
      brandAssociates.map((associate) => ({
        key: getId(associate),
        associate: (
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-900">
              {fullName(associate.user)}
            </div>
            <div className="truncate text-xs text-gray-500">
              {associate.user?.email || "Linked account"}
            </div>
          </div>
        ),
        code: associate.primaryCode?.code || "-",
        level: `Level ${associate.level || 2}`,
        wallet: formatCoins(associate.wallet?.availableBalance),
        status: <StatusBadge status={associate.status} size="sm" />,
        created: formatDate(associate.createdAt),
        actions: (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded bg-[var(--admin-blue-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-blue)] transition hover:bg-[var(--admin-blue)] hover:text-white"
            onClick={() =>
              navigate(
                `/app/referral-commerce/influencers/view/${getId(associate)}`,
                { state: { influencer: associate } },
              )
            }
          >
            <Eye size={14} /> View
          </button>
        ),
      })),
    [brandAssociates, navigate],
  );

  const activeSummaryCards = [
    {
      label: "Status",
      value: influencer?.status ? formatLabel(influencer.status) : "-",
      icon: <ShieldCheck size={18} />,
      accent: "#e0f2fe",
      color: "#0284c7",
    },
    {
      label: "Wallet balance",
      value: formatCoins(influencer?.wallet?.availableBalance),
      icon: <Coins size={18} />,
      accent: "#dcfce7",
      color: "#15803d",
    },
    {
      label:
        influencer?.influencerType === "parent"
          ? "Brand Associates"
          : "Referral codes",
      value: String(
        influencer?.influencerType === "parent"
          ? brandAssociates.length
          : codes.length,
      ),
      icon:
        influencer?.influencerType === "parent" ? (
          <GitBranch size={18} />
        ) : (
          <Gift size={18} />
        ),
      accent: "#ede9fe",
      color: "#7c3aed",
    },
    {
      label: "Total orders",
      value: String(orders.length),
      icon: <BadgeIndianRupee size={18} />,
      accent: "#fef3c7",
      color: "#b45309",
    },
  ];

  if (!influencer && id) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Referral Partner Details"
          subtitle="Partner profile could not be found."
          breadcrumbs={[{ label: "Marketing" }, { label: "Referral Partners" }, { label: "Details" }]}
          actions={
            <button type="button" className="admin-btn-secondary" onClick={() => navigate("/app/referral-commerce/influencers")}>
              <ArrowLeft size={16} />
              Back
            </button>
          }
        />
        <div className="admin-card p-6 text-sm text-gray-500">No partner matches this profile ID.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Referral Partner Details"
        subtitle={fullName(influencer?.user || {})}
        breadcrumbs={[{ label: "Marketing" }, { label: "Referral Partners" }, { label: "Details" }]}
        actions={
          <button type="button" className="admin-btn-secondary" onClick={() => navigate("/app/referral-commerce/influencers")}>
            <ArrowLeft size={16} />
            Back to partners
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {activeSummaryCards.map((card) => (
          <SummaryCard
            key={card.label}
            title={card.label}
            value={card.value}
            icon={card.icon}
            iconStyle={{ background: card.accent, color: card.color }}
          />
        ))}
      </div>

      <FormSection
        title="Partner profile"
        subtitle="Basic identity and referral account information"
        icon={<UserRound size={18} />}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {infoRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{row.label}</div>
              <div className="mt-2 text-sm font-medium text-gray-800">{row.value}</div>
            </div>
          ))}
        </div>
      </FormSection>

      {influencer?.influencerType === "parent" && (
        <FormSection
          title="Associated Brands"
          subtitle="Brand Associates registered under this Growth Partner"
          icon={<GitBranch size={18} />}
        >
          <SharedDataTable
            columns={[
              { key: "associate", label: "Brand Associate" },
              { key: "code", label: "Referral Code" },
              { key: "level", label: "Hierarchy" },
              { key: "wallet", label: "Available Coins" },
              { key: "status", label: "Status" },
              { key: "created", label: "Associated On" },
              { key: "actions", label: "Actions" },
            ]}
            data={brandAssociateRows}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            onRowClick={(row) =>
              navigate(`/app/referral-commerce/influencers/view/${row.key}`, {
                state: {
                  influencer: brandAssociates.find(
                    (item) => String(getId(item)) === String(row.key),
                  ),
                },
              })
            }
            emptyText="No Brand Associates are linked to this Growth Partner."
            cardClassName="overflow-hidden"
          />
        </FormSection>
      )}

      <FormSection
        title="Partner actions"
        subtitle="Review access, verification, and partner status"
        icon={<ShieldCheck size={18} />}
      >
        <div className="mb-3 flex justify-end">
          <StatusBadge status={influencer?.status} size="sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(influencer?.kycStatus === "submitted" || influencer?.kycStatus === "rejected") && (
            <button type="button" className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100" onClick={() => reviewVerification("kyc", "verified")}>
              <Check size={14} /> Approve KYC
            </button>
          )}
          {(influencer?.kycStatus === "submitted" || influencer?.kycStatus === "verified") && (
            <button type="button" className="inline-flex items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100" onClick={() => reviewVerification("kyc", "rejected")}>
              <X size={14} /> Reject KYC
            </button>
          )}
          {(influencer?.payoutProfileStatus === "submitted" || influencer?.payoutProfileStatus === "rejected") && (
            <button type="button" className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100" onClick={() => reviewVerification("bank", "verified")}>
              <Check size={14} /> Verify Bank
            </button>
          )}
          {(influencer?.payoutProfileStatus === "submitted" || influencer?.payoutProfileStatus === "verified") && (
            <button type="button" className="inline-flex items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100" onClick={() => reviewVerification("bank", "rejected")}>
              <X size={14} /> Reject Bank
            </button>
          )}
          <button type="button" className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition ${influencer?.status === "active" ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`} onClick={updatePartnerStatus}>
            {influencer?.status === "active" ? <X size={14} /> : <Check size={14} />}
            {influencer?.status === "pending" ? "Approve account" : influencer?.status === "active" ? "Suspend partner" : "Reactivate partner"}
          </button>
          <button type="button" className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition ${influencer?.canCreateChildren ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"}`} onClick={togglePermission}>
            {influencer?.canCreateChildren ? <X size={14} /> : <UserPlus size={14} />}
            {influencer?.canCreateChildren ? "Revoke child creation" : "Grant child creation"}
          </button>
          {influencer?.childRegistration?.shareable && (
            <button type="button" className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100" onClick={copyRegistrationLink}>
              <Link size={14} /> Copy registration link
            </button>
          )}
          {!(influencer?.influencerType === "parent" && influencer?.canCreateChildren) && (
            <button type="button" className="inline-flex items-center gap-2 rounded border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100" onClick={promotePartner}>
              <GitBranch size={14} /> Promote to Growth Partner
            </button>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Documents, KYC & bank details"
        subtitle="Verification records and payout information"
        icon={<BadgeCheck size={18} />}
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FileText size={16} className="text-indigo-600" />
              Documents
            </div>
            <div className="space-y-2 text-sm">
              {documentEntries(verificationData.documents).length ? (
                documentEntries(verificationData.documents).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">{documentLabel(key)}</span>
                    {String(value).startsWith("http") ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-indigo-700 underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="max-w-[65%] truncate text-right font-medium text-gray-800">
                        {String(value)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-gray-500">No documents submitted.</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <BadgeCheck size={16} className="text-indigo-600" />
              KYC
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Verification status</span>
                <StatusBadge status={verificationData.kycStatus || "not_submitted"} size="sm" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">PAN</span>
                <span className="font-medium text-gray-800">
                  {verificationData.panNumber || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Landmark size={16} className="text-indigo-600" />
              Bank details
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Verification status</span>
                <StatusBadge status={verificationData.bankStatus || "not_submitted"} size="sm" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Bank</span>
                <span className="text-right font-medium text-gray-800">
                  {verificationData.bankDetails.method === "upi"
                    ? `UPI: ${verificationData.bankDetails.upiId || "-"}`
                    : firstValue(
                        verificationData.bankDetails.bankName,
                        verificationData.bankDetails.bank,
                      ) || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Account</span>
                <span className="font-medium text-gray-800">
                  {maskAccountNumber(
                    firstValue(
                      verificationData.bankDetails.accountNumber,
                      verificationData.bankDetails.bankAccountNumber,
                      verificationData.bankDetails.accountNo,
                    ),
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">IFSC</span>
                <span className="font-medium text-gray-800">
                  {firstValue(verificationData.bankDetails.ifscCode, verificationData.bankDetails.ifsc) || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] px-5 pt-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
              <Activity size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--admin-ink)]">Partner activity</h2>
              <p className="mt-0.5 text-xs text-[var(--admin-muted)]">Review this partner's referrals, earnings, payouts, and bonuses.</p>
            </div>
            <span className="ml-auto hidden rounded-full bg-[var(--admin-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--admin-muted)] sm:inline-flex">
              {codes.length + orders.length + commissions.length + payouts.length} records
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {[
              ["codes", "Referral codes", codeRows.length],
              ["orders", "Orders", orderRows.length],
              ["commissions", "Commissions", commissionRows.length],
              ["payouts", "Payouts", payoutRows.length],
              ["progress", "Bonus progress", bonusProgress.length],
              ["achievements", "Bonus history", bonusAchievements.length],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveActivityTab(value)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition ${activeActivityTab === value ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"}`}
              >
                {label} <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {activeActivityTab === "codes" && (
          <SharedDataTable
            columns={[
              { key: "code", label: "Referral Code" },
              { key: "status", label: "Status" },
              { key: "usage", label: "Usage" },
              { key: "created", label: "Created" },
            ]}
            data={codeRows}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            emptyText="No referral codes found for this partner."
            cardClassName="overflow-hidden"
          />
        )}

        {activeActivityTab === "orders" && (
          <SharedDataTable
            columns={[
              { key: "order", label: "Order" },
              { key: "code", label: "Code" },
              { key: "amount", label: "Amount" },
              { key: "status", label: "Status" },
              { key: "created", label: "Created" },
            ]}
            data={orderRows}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            emptyText="No partner orders yet."
            cardClassName="overflow-hidden"
          />
        )}

        {activeActivityTab === "commissions" && (
          <SharedDataTable
            columns={[
              { key: "type", label: "Type" },
              { key: "basis", label: "Basis" },
              { key: "amount", label: "Coins" },
              { key: "status", label: "Status" },
            ]}
            data={commissionRows}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            emptyText="No commission entries found."
            cardClassName="overflow-hidden"
          />
        )}

        {activeActivityTab === "payouts" && (
          <SharedDataTable
            columns={[
              { key: "coins", label: "Coins" },
              { key: "payable", label: "Payable" },
              { key: "method", label: "Method" },
              { key: "status", label: "Status" },
              { key: "requested", label: "Requested" },
            ]}
            data={payoutRows}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            emptyText="No payout requests for this partner."
            cardClassName="overflow-hidden"
          />
        )}

        {activeActivityTab === "progress" && (
          <SharedDataTable
            columns={[
              { key: "rule", label: "Rule" },
              { key: "cycle", label: "Cycle" },
              { key: "target", label: "Target" },
              { key: "progress", label: "Progress" },
              { key: "status", label: "Status" },
            ]}
            data={bonusProgress.map((row) => ({
              key: `${getId(row.rule)}-${row.influencer?.id}-${row.cycleKey}`,
              rule: row.rule?.ruleName || "-",
              cycle: row.cycleKey || "-",
              target: Number(row.targetValue || 0).toLocaleString("en-IN"),
              progress: `${Number(row.progressPercent || 0).toFixed(2)}%`,
              status: row.existingAchievement ? (
                <StatusBadge status={row.existingAchievement.status} size="sm" />
              ) : (
                <StatusBadge status={row.achieved ? "achieved" : "in_progress"} size="sm" />
              ),
            }))}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            emptyText="No bonus progress recorded."
            cardClassName="overflow-hidden"
          />
        )}

        {activeActivityTab === "achievements" && (
          <SharedDataTable
            columns={[
              { key: "rule", label: "Rule" },
              { key: "cycle", label: "Cycle" },
              { key: "bonus", label: "Bonus Coins" },
              { key: "status", label: "Status" },
              { key: "achievedAt", label: "Achieved At" },
            ]}
            data={bonusAchievements.map((achievement) => ({
              key: getId(achievement),
              rule: achievement.ruleName || "-",
              cycle: achievement.cycleKey || "-",
              bonus: `${Number(achievement.bonusCoins || 0).toLocaleString("en-IN")} coins`,
              status: <StatusBadge status={achievement.status} size="sm" />,
              achievedAt: formatDate(achievement.achievedAt || achievement.createdAt),
            }))}
            loading={Boolean(referralState.loading)}
            rowKey="key"
            emptyText="No bonus achievements for this partner."
            cardClassName="overflow-hidden"
          />
        )}
      </section>
    </div>
  );
};

export default ReferralPartnerDetails;
