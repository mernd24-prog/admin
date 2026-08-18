import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MdAccountBalanceWallet,
  MdHourglassTop,
  MdLock,
  MdPayments,
  MdRefresh,
} from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import StatusBadge from "../../../components/Shared/StatusBadge";
import Loader from "../../../components/Loader/Loader";
import SummaryCard from "../../../components/Shared/SummaryCard";
import DataTable from "../../../components/Shared/DataTable";
import {OrderLink} from "../../../components/Shared/EntityLink";
import { getMySellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import {
  formatCurrency,
  formatDateTime12Hour,
  formatLabel,
} from "../../../utils/formatters";
import { toast } from "sonner";
import { apiRequest } from "../../../_helpers/apiConfig";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const unwrap = (value = {}) => value?.data?.data || value?.data || {};
const money = (value, currency = "INR") =>
  formatCurrency(Number(value || 0), "₹0", currency);
const label = (value = "") =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const emptyBankDetails = {
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  branchName: "",
};
const listFrom = (response = {}) => {
  const root = unwrap(response);
  return root.items || root.list || root.rows || root.data || [];
};
const clean = (value = "") => String(value || "").trim();
const normalizeBankDetails = (bankDetails = {}) => ({
  accountHolderName: clean(bankDetails.accountHolderName),
  accountNumber: clean(bankDetails.accountNumber).replace(/\D/g, ""),
  ifscCode: clean(bankDetails.ifscCode).toUpperCase(),
  bankName: clean(bankDetails.bankName),
  branchName: clean(bankDetails.branchName),
});
const organizationIdOf = (organization) => {
  const source = organization || {};
  return source.id || source._id || source.organizationId || source.organization_id || "";
};

export default function SellerWallet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const walletState = useSelector(
    (state) => state.sellerCommissions?.walletSummaryData || {},
  );
  const wallet = unwrap(walletState);
  const balances = wallet.balances || {};
  const counts = wallet.counts || {};
  const currency = wallet.currency || "INR";
  const items = Array.isArray(wallet.items) ? wallet.items : [];
  const loading = Boolean(walletState.loading);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [bankDetails, setBankDetails] = useState(emptyBankDetails);
  const [bankErrors, setBankErrors] = useState({});
  const payoutPreference = wallet.payoutPreference || {};
  const payoutDestination = payoutPreference.destination || "razorpayx";
  const walletOrganizationId =
    payoutPreference.organizationId ||
    wallet.organizationId ||
    wallet.organization_id ||
    items.find((item) => item.organizationId || item.organization_id)?.organizationId ||
    items.find((item) => item.organizationId || item.organization_id)?.organization_id ||
    "";
  const sellerWallet = wallet.sellerWallet || {};
  const walletTransactions = Array.isArray(sellerWallet.transactions)
    ? sellerWallet.transactions
    : [];
  const ledgerColumns = useMemo(
    () => [
      {
        key: "orderId",
        label: "Order",
        render: (value, row) => (
          <OrderLink orderId={value || row.order_id} orderNumber={row.orderNumber || row.order_number} />
        ),
      },
      {
        key: "netAmount",
        label: "Net receivable",
        cellClassName: "font-semibold",
        render: (value, item) => money(value, item.currency || currency),
      },
      {
        key: "releaseStatus",
        label: "Status",
        render: (value, item) => (
          <StatusBadge status={value || item.status} dot />
        ),
      },
      {
        key: "releaseReason",
        label: "Reason / release",
        render: (value, item) => (
          <div>
            <div className="max-w-xs text-xs text-gray-600">
              {formatLabel(value || label(item.releaseStatus))}
            </div>
            {item.eligibleAt && (
              <div className="mt-1 text-[11px] text-gray-400">
                Eligible {formatDateTime12Hour(item.eligibleAt)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "updatedAt",
        label: "Updated",
        cellClassName: "whitespace-nowrap text-xs text-gray-500",
        render: (value, item) => formatDateTime12Hour(value || item.createdAt),
      },
    ],
    [currency],
  );

  const load = useCallback(async () => {
    try {
      const [walletResponse, organizationResponse] = await Promise.all([
        dispatch(
        getMySellerWalletSummary({ limit: 100, offset: 0 }),
        ).unwrap(),
        apiRequest("GET", ENDPOINTS.sellers.myOrganizations, { limit: 50 }),
      ]);
      const loadedWallet = unwrap(walletResponse);
      const loadedPreference = loadedWallet.payoutPreference || {};
      const organizationRows = listFrom(organizationResponse);
      setOrganizations(organizationRows);
      const activeOrganization =
        organizationRows.find((org) => String(organizationIdOf(org)) === String(loadedPreference.organizationId || payoutPreference.organizationId)) ||
        organizationRows.find((org) => org.isDefault || org.is_default) ||
        organizationRows[0] ||
        null;
      if (activeOrganization) {
        setSelectedOrganizationId(organizationIdOf(activeOrganization));
      } else if (loadedPreference.organizationId) {
        setSelectedOrganizationId(loadedPreference.organizationId);
      }
      setBankDetails(normalizeBankDetails(loadedPreference.bankDetails || {}));
    } catch (error) {
      toast.error(error?.message || error || "Unable to load seller wallet");
    }
  }, [dispatch, payoutPreference.organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePayoutPreference = async (destination) => {
    try {
      setSavingPreference(true);
      await apiRequest("PATCH", ENDPOINTS.payouts.myPayoutPreference, {
        payoutDestination: destination,
        organizationId: payoutPreference.organizationId || undefined,
      });
      toast.success("Payout preference updated");
      await load();
    } catch (error) {
      toast.error(error?.message || error || "Unable to update payout preference");
    } finally {
      setSavingPreference(false);
    }
  };

  const selectedOrganization = useMemo(
    () =>
      organizations.find((org) => String(organizationIdOf(org)) === String(selectedOrganizationId)) ||
      null,
    [organizations, selectedOrganizationId],
  );

  const updateSelectedOrganization = (organizationId) => {
    setSelectedOrganizationId(organizationId);
    setBankDetails((current) => normalizeBankDetails(current));
    setBankErrors({});
  };

  const updateBankField = (field, value) => {
    setBankDetails((current) => ({
      ...current,
      [field]: field === "ifscCode"
        ? value.toUpperCase()
        : field === "accountNumber"
          ? value.replace(/\D/g, "")
          : value,
    }));
    setBankErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateBankDetails = () => {
    const next = {};
    const payload = normalizeBankDetails(bankDetails);
    if (!payload.accountHolderName) next.accountHolderName = "Account holder name is required";
    if (!/^\d{9,18}$/.test(payload.accountNumber)) next.accountNumber = "Enter 9 to 18 digit account number";
    if (!IFSC_REGEX.test(payload.ifscCode)) next.ifscCode = "Enter valid IFSC, e.g. HDFC0001234";
    if (!payload.bankName) next.bankName = "Bank name is required";
    setBankErrors(next);
    return Object.keys(next).length ? null : payload;
  };

  const saveBankDetails = async () => {
    const targetOrganizationId =
      selectedOrganizationId ||
      organizationIdOf(selectedOrganization) ||
      walletOrganizationId;
    if (!targetOrganizationId) {
      toast.error("Seller store is not linked yet. Please refresh once or complete seller store setup first.");
      return;
    }
    const payload = validateBankDetails();
    if (!payload) {
      toast.error("Please fix payout bank details");
      return;
    }
    try {
      setSavingBank(true);
      await apiRequest("PATCH", ENDPOINTS.payouts.myPayoutPreference, {
        organizationId: targetOrganizationId,
        payoutDestination: "razorpayx",
        bankDetails: payload,
      });
      toast.success("Payout bank details saved");
      await load();
    } catch (error) {
      toast.error(error?.message || error || "Unable to save payout bank details");
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Wallet"
        subtitle="Track receivables, holds, payout processing, adjustments, and released earnings."
        breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Wallet" }]}
        actions={
          <button
            type="button"
            className="admin-btn-secondary inline-flex items-center gap-2"
            onClick={load}
          >
            <MdRefresh /> Refresh
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Available for payout"
          value={money(balances.availableBalance, currency)}
          description={`${counts.available || 0} eligible order entries`}
          icon={<MdAccountBalanceWallet size={22} />}
        />

        <SummaryCard
          title="Seller wallet balance"
          value={money(sellerWallet.availableBalance, currency)}
          description={`${walletTransactions.length || 0} wallet payout credits`}
          icon={<MdAccountBalanceWallet size={22} />}
        />

        <SummaryCard
          title="Pending receivable"
          value={money(balances.pendingBalance, currency)}
          description={
            wallet.nextEligibleAt
              ? `Next release ${formatDateTime12Hour(wallet.nextEligibleAt)}`
              : "Waiting for delivery or return window"
          }
          icon={<MdHourglassTop size={22} />}
        />

        <SummaryCard
          title="On hold"
          value={money(balances.blockedBalance, currency)}
          description={`${counts.blocked || 0} entries under return, refund, or dispute hold`}
          icon={<MdLock size={22} />}
        />

        <SummaryCard
          title="Payout in process"
          value={money(balances.inProcessBalance, currency)}
          description={`${wallet.payouts?.inProcessCount || 0} payout requests processing`}
          icon={<MdPayments size={22} />}
        />

        <SummaryCard
          title="Total paid"
          value={money(balances.paidBalance, currency)}
          description={`${wallet.payouts?.paidCount || 0} completed payouts`}
          icon={<MdPayments size={22} />}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-[18px] font-medium text-gray-900">
                Receivable ledger
              </h2>
              <p className="text-xs text-gray-500">
                Order-level movement from pending to payout.
              </p>
            </div>
            <span className="text-xs text-gray-500">
              {wallet.total || items.length} entries
            </span>
          </div>
          <DataTable
            columns={ledgerColumns}
            data={items}
            loading={loading}
            totalCount={items.length}
            pageSize={Math.max(items.length, 1)}
            rowKey={(item) => item.commissionId || item.orderId}
            emptyText="No seller wallet entries yet."
            cardClassName="overflow-hidden"
          />
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Payout preference
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Choose where released seller earnings should go.
            </p>
            <div className="mt-3 space-y-2">
              {[
                { value: "razorpayx", label: "Bank / RazorpayX", helper: "Transfer to verified bank account." },
                { value: "seller_wallet", label: "Seller Wallet", helper: "Credit this internal seller wallet." },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${payoutDestination === option.value ? "border-blue-200 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700"}`}
                >
                  <input
                    type="radio"
                    name="sellerPayoutDestination"
                    className="mt-1"
                    checked={payoutDestination === option.value}
                    disabled={savingPreference || payoutPreference.sellerCanChoose === false}
                    onChange={() => updatePayoutPreference(option.value)}
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.helper}</span>
                  </span>
                </label>
              ))}
            </div>
            {payoutPreference.sellerCanChoose === false && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                Admin has locked payout destination to {payoutPreference.platformDefault === "seller_wallet" ? "Seller Wallet" : "Bank / RazorpayX"}.
              </p>
            )}
          </div>
          {payoutDestination === "razorpayx" && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-[18px] font-medium text-gray-900">
                Payout bank account
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Add or update the bank account where RazorpayX payouts should be received.
              </p>
              {organizations.length > 1 && (
                <label className="mt-3 block text-xs font-medium text-gray-600">
                  Organization
                  <select
                    className="admin-input mt-1 w-full"
                    value={selectedOrganizationId}
                    onChange={(event) => updateSelectedOrganization(event.target.value)}
                  >
                    {organizations.map((organization) => (
                      <option key={organizationIdOf(organization)} value={organizationIdOf(organization)}>
                        {organization.storeDisplayName || organization.legalBusinessName || organizationIdOf(organization)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="mt-3 space-y-3">
                {[
                  ["accountHolderName", "Account holder name", "Sachin Singh"],
                  ["accountNumber", "Account number", "123456789012"],
                  ["ifscCode", "IFSC code", "HDFC0001234"],
                  ["bankName", "Bank name", "HDFC Bank"],
                  ["branchName", "Branch name", "Optional"],
                ].map(([field, fieldLabel, placeholder]) => (
                  <label key={field} className="block text-xs font-medium text-gray-600">
                    {fieldLabel}
                    <input
                      className={`admin-input mt-1 w-full ${bankErrors[field] ? "border-red-300" : ""}`}
                      value={bankDetails[field] || ""}
                      placeholder={placeholder}
                      maxLength={field === "ifscCode" ? 11 : undefined}
                      onChange={(event) => updateBankField(field, event.target.value)}
                    />
                    {bankErrors[field] && (
                      <span className="mt-1 block text-[11px] text-red-600">
                        {bankErrors[field]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-[#2f6fed] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245bd3] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                disabled={savingBank}
                onClick={saveBankDetails}
              >
                {savingBank ? "Saving..." : "Save payout bank"}
              </button>
              {selectedOrganization?.bankVerificationStatus && (
                <p className="mt-3 text-xs text-gray-500">
                  Verification status: {formatLabel(selectedOrganization.bankVerificationStatus)}.
                </p>
              )}
            </div>
          )}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Payout readiness
            </h2>
            <div
              className={`mt-3 rounded-lg p-3 text-sm ${wallet.canRequestPayout ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              <strong>
                {wallet.canRequestPayout
                  ? "Ready for payout"
                  : "Not yet eligible"}
              </strong>
              <p className="mt-1 text-xs">
                {wallet.canRequestPayout
                  ? "The available balance meets the payout policy."
                  : wallet.minimumPayoutShortfall > 0
                    ? `${money(wallet.minimumPayoutShortfall, currency)} more is needed to meet the minimum payout.`
                    : "Wait for pending or held amounts to become available."}
              </p>
            </div>
            <button
              type="button"
              className="admin-btn mt-4 w-full"
              onClick={() => navigate("/app/seller-payouts")}
            >
              View payouts
            </button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Wallet payout credits
            </h2>
            <div className="mt-3 space-y-2">
              {walletTransactions.length ? walletTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {money(transaction.amount, currency)}
                    </span>
                    <StatusBadge status={transaction.status} dot />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {transaction.referenceId || "Seller payout"} · {formatDateTime12Hour(transaction.createdAt)}
                  </p>
                </div>
              )) : (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                  No wallet payout credits yet.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Adjustments
            </h2>
            <p className="mt-2 font-medium text-gray-900">
              {money(balances.refundAdjustmentBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Refunds, chargebacks, corrections, and negative balance recovery.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Total open balance
            </h2>
            <p className="mt-2 font-medium text-gray-900">
              {money(balances.totalOpenBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Pending, available, processing, and held receivables.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
