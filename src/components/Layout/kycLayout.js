import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronDown, Headphones, Info, LogOut, X } from "lucide-react";
import BrandLogo from "../BrandLogo";
import { useKYC } from "../../context/KycContext";
import NeedHelpCard from "../Shared/NeedHelpCard";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { clearStoredAuth } from "../../_helpers/authStorage";
import { AUTH_ROUTES } from "../../pages/auth/authRoutes";
import { logout as logoutAuth } from "../../Redux/auth-Slice";
import { clearSellerOnboarding } from "../../Redux/seller-slice";
import LogoutConfirmModal from "../Atoms/logoutPopup/LogoutConfirmModal";
const readStoredJson = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const formatLabel = (value = "") =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSellerHeaderName = (...sources) => {
  for (const source of sources) {
    const profile = source?.sellerProfile || {};
    const profileName =
      profile.displayName ||
      profile.legalBusinessName ||
      profile.businessName ||
      profile.primaryContactName;

    const userName =
      source?.fullName ||
      source?.full_name ||
      source?.name ||
      source?.userName ||
      source?.legalName ||
      source?.email?.split("@")?.[0];

    const name = profileName || userName;

    if (name) return name;
  }

  return "Seller Account";
};

const getSellerHeaderSubtitle = (...sources) => {
  for (const source of sources) {
    const profile = source?.sellerProfile || {};
    const subtitle =
      profile.businessType ||
      source?.role ||
      source?.roleName ||
      source?.onboardingStatus;

    if (subtitle) return formatLabel(subtitle);
  }

  return "Vendor Applicant";
};

const getSellerHeaderEmail = (...sources) => {
  for (const source of sources) {
    const email =
      source?.email ||
      source?.userEmail ||
      source?.primaryEmail ||
      source?.sellerProfile?.email ||
      source?.sellerProfile?.primaryEmail ||
      source?.contactEmail;

    if (email) return email;
  }

  return "";
};

const getInitials = (name = "") => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "SG";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const ONBOARDING_SUPPORT_CATEGORY = "ONBOARDING_ISSUE";

const isSupportTicketLocked = (issue) => ["resolved", "closed"].includes(String(issue.status || "").toLowerCase());

const getOnboardingConversation = (issue) => {
  const history = issue.statusHistory || issue.metadata?.statusHistory || [];
  const replies = issue.messages || issue.metadata?.messages || [];
  const entries = history.map((entry, index) => ({
    key: `status-${index}`, sender: "Support", message: entry.note || "",
    status: entry.status, timestamp: entry.changedAt,
  }));
  replies.forEach((entry, index) => entries.push({
    key: `reply-${index}`, sender: ["seller", "customer"].includes(entry.senderType) ? "Seller" : "Support",
    message: entry.message || "", timestamp: entry.createdAt,
  }));
  if (issue.adminNotes && !entries.some((entry) => entry.sender === "Support" && entry.message.trim() === issue.adminNotes.trim())) {
    entries.push({ key: "latest-note", sender: "Support", message: issue.adminNotes, timestamp: issue.lastStatusChangedAt || issue.updatedAt });
  }
  return entries.sort((a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0));
};

const OnboardingSupportModal = ({
  open,
  message,
  submitting,
  onChange,
  onClose,
  onSubmit,
}) => {
  const [tab, setTab] = useState("new");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  useEffect(() => {
    if (open) { setTab("new"); setPage(0); }
  }, [open]);
  useEffect(() => {
    if (!open || tab !== "previous") return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("sellerOnboardingToken") || sessionStorage.getItem("accessToken");
        if (!token) throw new Error("Please login again to view your issues.");
        const response = await axiosProvider.get(ENDPOINTS.support.mine, {
          params: { category: ONBOARDING_SUPPORT_CATEGORY, limit: 20, offset: page * 20 },
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = response?.data;
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (!cancelled) {
          setIssues(rows);
          const total = payload?.meta?.total;
          setHasMore(total != null ? (page + 1) * 20 < total : rows.length === 20);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Unable to load previous issues.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, tab, page, retry]);
  const sendReply = async (issue) => {
    const queryId = issue.queryId;
    const text = String(replyDrafts[queryId] || "").trim();
    if (!text || replyingTo || isSupportTicketLocked(issue)) return;
    setReplyingTo(queryId);
    try {
      const token = localStorage.getItem("sellerOnboardingToken") || sessionStorage.getItem("accessToken");
      if (!token) throw new Error("Please login again to reply.");
      const response = await axiosProvider.post(ENDPOINTS.support.reply(queryId), { message: text }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = response?.data?.data;
      if (updated) setIssues((current) => current.map((item) => item.queryId === queryId ? updated : item));
      setReplyDrafts((current) => ({ ...current, [queryId]: "" }));
      setRetry((value) => value + 1);
      toast.success("Reply sent");
    } catch (err) {
      toast.error(err?.message || "Unable to send reply.");
    } finally {
      setReplyingTo(null);
    }
  };
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] bg-white p-5 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#082f91]">
              <Headphones size={20} aria-hidden="true" />
            </span>
            <p className="text-[17px] font-bold text-[#082f91]">
              Onboarding Support
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5f6678] transition hover:bg-[#f1f4fb]"
            aria-label="Close support popup"
          >
            <X size={18} />
          </button>
        </div>

        <div role="tablist" aria-label="Onboarding support" className="mt-4 flex shrink-0 gap-5 border-b border-[#eadfcb]">
          {[ ["new", "Create Ticket"], ["previous", "Ticket History"] ].map(([id, label]) => (
            <button type="button" role="tab" key={id} aria-selected={tab === id} onClick={() => setTab(id)}
              className={`border-b-2 px-1 py-3 text-sm font-semibold ${tab === id ? "border-[#082f91] text-[#082f91]" : "border-transparent text-[#5f6678]"}`}>{label}</button>
          ))}
        </div>
        {tab === "new" ? <>
        <p className="mt-4 text-sm leading-5 text-[#71809b]">
          Tell us what you need help with and our team will assist you.
        </p>
        <label className="mt-5 block text-sm font-semibold text-[#30384d]">
          Describe Your Issue <span className="text-red-500">*</span>
          <textarea
            className="mt-2 min-h-[150px] w-full resize-y rounded-md border border-[#E6E6E6] px-3 py-2 text-sm outline-none transition focus:border-[#082f91] focus:ring-2 focus:ring-[#082f91]/10"
            value={message}
            onChange={(event) => onChange(event.target.value)}
            maxLength={5000}
            placeholder="Describe the issue you’re experiencing during onboarding. Include the affected step and any relevant details."
            autoFocus
          />
        </label>
        <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-[#71809b]">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Please don’t include passwords or sensitive banking details.
        </p>

        <div className="-mx-5 mt-5 flex flex-col-reverse gap-3 border-t border-[#edf0f6] px-5 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary min-w-[120px]"
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="admin-btn-primary min-w-[150px]"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </div>
        </> : <div role="tabpanel" className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="flex justify-end">
            <button type="button" className="admin-btn-secondary" disabled={loading || Boolean(replyingTo)} onClick={() => setRetry((value) => value + 1)}>Refresh replies</button>
          </div>
          {loading ? <p className="py-8 text-center text-sm">Loading previous issues...</p> : error ? <div role="alert" className="py-6 text-center text-sm">
            <p className="text-red-600">{error}</p>
            <button type="button" className="admin-btn-secondary mt-3" onClick={() => setRetry((value) => value + 1)}>Retry</button>
          </div> : <>
            {issues.length === 0 ? <p className="py-8 text-center text-sm text-[#5f6678]">No previous onboarding issues found.</p> : issues.map((issue) => (
              <article key={issue.id || issue.queryId} className="rounded-lg border border-[#eadfcb] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all text-sm font-semibold text-[#082f91]">{issue.queryId || "Onboarding issue"}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${String(issue.status || "").toLowerCase() === "resolved" ? "bg-green-100 text-green-800" : "bg-[#fff5db] text-[#7a5610]"}`}>{formatLabel(issue.status)}</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-[#5f6678]">Seller — Original message</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#30384d]">{issue.message}</p>
                {issue.createdAt && <p className="mt-3 text-xs text-[#5f6678]">{new Date(issue.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>}
                <div className="mt-4 space-y-3 border-t border-[#eadfcb] pt-3">
                  {getOnboardingConversation(issue).map((entry) => (
                    <div key={entry.key} className={`rounded-md border-l-4 p-3 text-sm ${entry.sender === "Seller" ? "border-gray-300 bg-gray-50" : "border-blue-400 bg-blue-50"}`}>
                      <p className="font-semibold">{entry.sender}{entry.status ? ` — ${formatLabel(entry.status)}` : ""}</p>
                      {entry.message && <p className="mt-1 whitespace-pre-wrap break-words">{entry.message}</p>}
                      {entry.timestamp && <p className="mt-1 text-xs text-[#5f6678]">{new Date(entry.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>}
                    </div>
                  ))}
                  {isSupportTicketLocked(issue) ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">This ticket is {formatLabel(issue.status)}. Replies are disabled. Please create a new ticket for further help.</p> : <>
                  <label className="block text-sm font-semibold">
                    Reply to this ticket
                    <textarea className="mt-2 min-h-[80px] w-full rounded-md border p-2 font-normal" maxLength={5000}
                      value={replyDrafts[issue.queryId] || ""} disabled={Boolean(replyingTo)}
                      onChange={(event) => setReplyDrafts((current) => ({ ...current, [issue.queryId]: event.target.value }))} />
                  </label>
                  <button type="button" className="admin-btn-primary" disabled={Boolean(replyingTo) || !String(replyDrafts[issue.queryId] || "").trim()} onClick={() => sendReply(issue)}>
                    {replyingTo === issue.queryId ? "Sending..." : "Send Reply"}
                  </button>
                  </>}
                </div>
              </article>
            ))}
            {(page > 0 || hasMore) && <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="admin-btn-secondary disabled:opacity-50">Previous</button>
              <span className="text-sm">Page {page + 1}</span>
              <button type="button" disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="admin-btn-secondary disabled:opacity-50">Next</button>
            </div>}
          </>}
        </div>}
      </form>
    </div>
  );
};

const KYCStatusLayout = ({
  children,
  currentSection = "status",
  logo = "/logo.png",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setStep } = useKYC();

  const stepsNavRef = useRef(null);
  const activeStepRef = useRef(null);
  const contentRef = useRef(null);
  const userMenuRef = useRef(null);

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Logout confirmation modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { seller, authSlice } = useSelector((state) => state || {});

  const storedUser = readStoredJson("currentUser");
  const storedOnboardingUser = readStoredJson("sellerOnboardingUser");
  const storedFlowState = readStoredJson("authFlowState");

  const flowState = seller?.flowState || storedFlowState || {};

  const headerName = getSellerHeaderName(
    authSlice?.user,
    seller?.onboardingUser,
    flowState,
    storedUser,
    storedOnboardingUser,
  );

  const headerSubtitle = getSellerHeaderSubtitle(
    authSlice?.user,
    seller?.onboardingUser,
    flowState,
    storedUser,
    storedOnboardingUser,
  );

  const headerEmail = getSellerHeaderEmail(
    authSlice?.user,
    seller?.onboardingUser,
    flowState,
    storedUser,
    storedOnboardingUser,
  );

  const headerInitials = getInitials(headerName);

  const menuItems = [
    { id: "personal", label: "Personal / Owner Details" },
    { id: "business", label: "Business Details" },
    { id: "bank", label: "Bank Details" },
    { id: "review", label: "Review Details" },
    { id: "status", label: "Status" },
  ];

  const currentIndex = menuItems.findIndex(
    (item) => item.id === currentSection,
  );

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const closeMenuOnOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
    };
  }, [userMenuOpen]);

  const closeSupportModal = () => {
    if (supportSubmitting) return;

    setSupportOpen(false);
    setSupportMessage("");
  };

  // Existing logout logic remains unchanged
  const handleLogout = () => {
    clearStoredAuth();
    dispatch(clearSellerOnboarding());
    dispatch(logoutAuth());
    setUserMenuOpen(false);
    toast.success("Logged out");
    navigate(AUTH_ROUTES.LOGIN, { replace: true });
  };

  
  const openLogoutConfirmation = () => {
    setUserMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  const submitOnboardingSupport = async (event) => {
    event.preventDefault();

    const message = supportMessage.trim();

    if (message.length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("sellerOnboardingToken");

    if (!token) {
      toast.error("Please login again to submit support request.");
      return;
    }

    try {
      setSupportSubmitting(true);

      await axiosProvider.post(
        ENDPOINTS.support.create,
        {
          category: ONBOARDING_SUPPORT_CATEGORY,
          subject: "Onboarding issue",
          message,
          metadata: {
            source: "seller_onboarding_need_help",
            onboardingStep: currentSection,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Support request submitted");
      setSupportOpen(false);
      setSupportMessage("");
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to submit support request");
    } finally {
      setSupportSubmitting(false);
    }
  };

  const scrollContentToTop = useCallback(() => {
    const content = contentRef.current;

    if (!content) return;

    const startTop = content.scrollTop;

    if (startTop <= 0) return;

    const duration = 280;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);

      content.scrollTop = startTop * (1 - eased);

      if (elapsed < 1) {
        window.requestAnimationFrame(animate);
      }
    };

    window.requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const nav = stepsNavRef.current;
    const activeStep = activeStepRef.current;

    if (
      !nav ||
      !activeStep ||
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      return;
    }

    nav.scrollTo({
      left:
        activeStep.offsetLeft - (nav.clientWidth - activeStep.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [currentSection]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      scrollContentToTop();

      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  }, [currentSection, scrollContentToTop]);

  return (
    <div className="min-h-screen bg-[#f6f3ef] font-inter text-[#17213a] lg:grid lg:grid-cols-[350px_minmax(0,1fr)]">
      {/* Shared logout confirmation modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />

      <OnboardingSupportModal
        open={supportOpen}
        message={supportMessage}
        submitting={supportSubmitting}
        onChange={setSupportMessage}
        onClose={closeSupportModal}
        onSubmit={submitOnboardingSupport}
      />

      <aside className="sidebar-scrollbar min-h-screen w-full bg-[#FCF5E8] lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto">
        <div className="flex h-full flex-col">
          <div className="bg-[#FCF5E8] pb-5 sm:pb-7 lg:pb-10">
            <div className="flex h-[118px] items-center justify-center px-4 sm:h-[140px] lg:h-[165px]">
              <BrandLogo
                src={logo}
                className="m-0 h-[96px] w-[240px] rounded-[10px] border border-[#DB971A] bg-white p-[9px] shadow-[0_8px_18px_rgba(78,53,23,0.16)] sm:h-[112px] sm:w-[276px] lg:h-[124px] lg:w-[306px] lg:p-[10px]"
                imageClassName="rounded-[7px] border border-[#DB971A]/70 object-contain p-[10px] lg:p-[12px]"
              />
            </div>

            {/*
            <div className="flex min-h-[54px] w-full items-center justify-center border-y border-[#012B6B1F] bg-[#F3E9D9] px-4 py-3 sm:min-h-[60px] lg:h-[65px] lg:justify-start lg:px-7 lg:py-0">
              <h2 className="text-center text-[16px] font-bold capitalize leading-[18px] tracking-[1.4px] text-[#042586] sm:text-[18px] sm:tracking-[1.8px] lg:text-left lg:text-[20px] lg:leading-[15px] lg:tracking-[2.2px]">
                Verification Steps
              </h2>
            </div>
            */}

            <div className="px-4 pt-4 sm:px-6 sm:pt-5 lg:px-[31px] lg:pt-[22px]">
              <nav
                ref={stepsNavRef}
                className="sidebar-scrollbar relative flex gap-3 overflow-x-auto pb-3 lg:flex lg:flex-col lg:gap-[34px] lg:overflow-visible lg:pb-0"
              >
                <span className="absolute left-[25px] top-[20px] hidden h-[310px] w-[2.5px] rounded-full bg-[#E49E1C] lg:block" />

                {menuItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={item.id === currentSection ? activeStepRef : null}
                    className="relative z-10 min-w-[205px] sm:min-w-[225px] lg:min-w-0"
                  >
                    <button
                      type="button"
                      disabled={currentIndex >= 4 || index >= currentIndex}
                      onClick={() => setStep(index + 1)}
                      aria-current={item.id === currentSection ? "step" : undefined}
                      className={`w-full text-left disabled:cursor-default enabled:cursor-pointer enabled:hover:brightness-95 relative flex items-center gap-[10px] transition ${
                        item.id === currentSection
                          ? "h-[46px] rounded-l-[4px] rounded-r-[12px] border-l-[4px] border-[#E49E1C] bg-[#042586] px-[8px] text-white shadow-[0_8px_16px_rgba(8,47,145,0.18)] lg:h-[50px]"
                          : "h-[42px] bg-transparent pl-[11px] pr-[2px] text-[#042586]"
                      }`}
                    >
                      <span
                        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                          index < currentIndex
                            ? "border-[#042586] bg-white text-[#042586]"
                            : item.id === currentSection
                              ? "border-[#E49E1C] bg-[#E49E1C] text-white"
                              : "border-[#042586] bg-white text-[#042586]"
                        }`}
                      >
                        {index < currentIndex ? (
                          <Check size={14} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>

                      <span className="flex min-w-0 flex-col justify-center">
                        <span
                          className={`block h-[17px] w-[78px] whitespace-nowrap font-[Inter] text-[13px] font-semibold uppercase leading-[16.5px] tracking-[0.28px] ${
                            item.id === currentSection
                              ? "text-white"
                              : "text-[#042586]"
                          }`}
                        >
                          Step {String(index + 1).padStart(2, "0")}
                        </span>

                        <span
                          className={`mt-[2px] block max-w-[170px] truncate text-[11px] font-semibold leading-[12px] ${
                            item.id === currentSection
                              ? "text-white"
                              : "text-[#000000]"
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
              </nav>

              <NeedHelpCard
                title="Need Help?"
                description="Our verification team is available 24/7 to help you complete KYC."
                buttonText="Contact Support"
                onClick={() => setSupportOpen(true)}
                className="mx-auto mt-5 hidden max-w-[285px] lg:mt-8 lg:block lg:max-w-none"
              />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-[#FCF5E8]">
        <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-[10px] bg-[#FCF5E8] px-4 py-4 text-[#111827] sm:px-6 lg:h-[75px] lg:px-[48px] lg:pb-[17px] lg:pt-[18px]">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold leading-[16px] text-[#111827] sm:text-[14px] lg:text-[16px]">
            <span>Onboarding</span>
            <span className="mx-1 sm:mx-[10px]">›</span>
            <span className="truncate">
              {menuItems[currentIndex]?.label || "Status"}
            </span>
          </div>

          <div ref={userMenuRef} className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-[8px] px-2 py-1.5 text-left transition hover:bg-white/60"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E49E1C] bg-white text-[11px] font-bold text-[#082f91]">
                {headerInitials}
              </span>

              <span className="hidden text-left  sm:block">
                <span className="block max-w-[130px] capitalize truncate text-left text-[14px] font-bold leading-[20px] text-[#111827]">
                  {headerName}
                </span>

                <span className="mt-1 block max-w-[130px] truncate text-left text-[10px] font-medium leading-[15px] text-[#5f6575]">
                  {headerEmail || headerSubtitle}
                </span>
              </span>

              <ChevronDown
                size={16}
                className={`text-[#082f91] transition ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[210px] rounded-[8px] border border-[#eadfcb] bg-white py-2 shadow-xl "
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={openLogoutConfirmation}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-[#1B1D60] transition "
                >
                  <LogOut size={16} className="text-[#1B1D60]" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="kyc-content-wrapper">
          <div
            ref={contentRef}
            className="kyc-content-scroll bg-[#F7F8FC] px-4 py-6 sm:px-8 lg:px-10"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default KYCStatusLayout;
