import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MdRefresh,
} from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import StatusBadge from "../../../components/Shared/StatusBadge";
import Loader from "../../../components/Loader/Loader";
import DataTable from "../../../components/Shared/DataTable";
import {OrderLink} from "../../../components/Shared/EntityLink";
import { getMySellerWalletSummary, getSellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import {
  formatCurrency,
  formatDateTime12Hour,
  formatLabel,
} from "../../../utils/formatters";
import { toast } from "sonner";
import { apiRequest } from "../../../_helpers/apiConfig";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { usePermission } from "../../../_helpers/usePermission";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";

const unwrap = (value = {}) => value?.data?.data || value?.data || {};
const money = (value, currency = "INR") =>
  formatCurrency(Number(value || 0), "₹0", currency);
const owedMoney = (value, currency = "INR") =>
  money(Math.abs(Number(value || 0)), currency);
const releaseLabel = (item = {}) => {
  const status = String(item.releaseStatus || item.status || "pending").toLowerCase();
  const reason = String(item.releaseReason || "").toLowerCase();
  if (["released", "paid", "completed"].includes(status)) return "Paid";
  if (["processing", "approved", "in_process"].includes(status)) return "Payout processing";
  if (["held", "blocked", "on_hold"].includes(status)) return "On hold";
  if (["eligible", "available"].includes(status)) return "Available now";
  if (reason.includes("return_window")) return "Return window open";
  return "Waiting for release";
};
const receivableMeaning = (item = {}) => {
  const status = String(item.releaseStatus || item.status || "pending").toLowerCase();
  const reason = String(item.releaseReason || "").toLowerCase();
  if (["released", "paid", "completed"].includes(status)) return "This earning has already been settled.";
  if (["processing", "approved", "in_process"].includes(status)) return "A payout containing this earning is being processed.";
  if (["held", "blocked", "on_hold"].includes(status)) return "Temporarily unavailable because of a return, refund, dispute, or payment hold.";
  if (["eligible", "available"].includes(status)) return "Ready to cover an amount owed or be included in your next payout.";
  if (reason.includes("return_window")) return "Becomes available after the product return window closes.";
  return "Recorded, but the order has not yet reached its payout release date.";
};
const listFrom = (response = {}) => {
  const root = unwrap(response);
  return root.items || root.list || root.rows || root.data || [];
};
const organizationIdOf = (organization) => {
  const source = organization || {};
  return source.id || source._id || source.organizationId || source.organization_id || "";
};

export default function SellerWallet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSeller } = usePermission();
  const walletState = useSelector(
    (state) => state.sellerCommissions?.walletSummaryData || {},
  );
  const wallet = unwrap(walletState);
  const balances = wallet.balances || {};
  const counts = wallet.counts || {};
  const currency = wallet.currency || "INR";
  const codAmountOwed = Math.abs(Number(balances.codLiabilityBalance || 0));
  const otherAmountOwed = Math.abs(Number(balances.otherAdjustmentBalance || 0));
  const totalAmountOwed = codAmountOwed + otherAmountOwed;
  const pendingBalance = Math.max(0, Number(balances.pendingBalance || 0));
  const estimatedAfterRelease = Math.max(0, pendingBalance - totalAmountOwed);
  const items = Array.isArray(wallet.items) ? wallet.items : [];
  const loading = Boolean(walletState.loading);
  const [savingPreference, setSavingPreference] = useState(false);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState(
    () => new URLSearchParams(window.location.search).get("sellerId") || "",
  );
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const payoutPreference = wallet.payoutPreference || {};
  const payoutDestination = payoutPreference.destination || "razorpayx";
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
        label: "Your earning",
        cellClassName: "font-semibold",
        render: (value, item) => money(value, item.currency || currency),
      },
      {
        key: "releaseStatus",
        label: "Where it stands",
        render: (value, item) => (
          <StatusBadge
            status={value || item.status}
            label={releaseLabel(item)}
            dot
          />
        ),
      },
      {
        key: "releaseReason",
        label: "Why it is not paid yet",
        render: (value, item) => (
          <div className="min-w-[260px] max-w-[360px]">
            <div className="text-xs leading-5 text-gray-600">{receivableMeaning(item)}</div>
            {item.eligibleAt && (
              <div className="mt-1 text-[11px] text-gray-400">
                Release date: {formatDateTime12Hour(item.eligibleAt)}
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
      if (!isSeller) {
        if (!selectedSellerId) return;
        await dispatch(getSellerWalletSummary({ sellerId: selectedSellerId })).unwrap();
        return;
      }
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
    } catch (error) {
      toast.error(error?.message || error || "Unable to load seller wallet");
    }
  }, [dispatch, isSeller, payoutPreference.organizationId, selectedSellerId]);

  useEffect(() => {
    if (isSeller) return;
    dropdownApi.getSellers({ limit: 100 }).then(setSellerOptions).catch(() => {
      toast.error("Unable to load sellers");
    });
  }, [isSeller]);

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
  const savedBankDetails = selectedOrganization?.bankDetails || payoutPreference.bankDetails || {};
  const savedAccountNumber = String(savedBankDetails.accountNumber || "");
  const hasSavedBank = Boolean(
    savedBankDetails.accountHolderName &&
    savedAccountNumber &&
    savedBankDetails.ifscCode &&
    savedBankDetails.bankName,
  );

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title={isSeller ? "Earnings & payouts" : "Seller earnings & payouts"}
        subtitle={isSeller ? "Track earnings from order delivery through the return window to your final payout." : "Select a seller to see what is waiting, what is owed, and what can be paid."}
        breadcrumbs={[{ label: isSeller ? "My Finance & Payouts" : "Seller Finance & Payouts" }, { label: "Wallet" }]}
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

      {!isSeller && (
        <div className="admin-card mb-4 max-w-xl p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Seller</label>
          <FilterSelect
            options={sellerOptions}
            value={sellerOptions.find((option) => String(option.value) === String(selectedSellerId)) || null}
            onChange={(option) => setSelectedSellerId(option?.value || "")}
            placeholder="Select seller to view wallet"
            isSearchable
            isClearable
          />
        </div>
      )}

      {!isSeller && !selectedSellerId ? (
        <div className="admin-card p-10 text-center text-sm text-[var(--admin-muted)]">Select a seller above to view their wallet and balance movements.</div>
      ) : (
        <>

      <section className="admin-card mb-5 overflow-hidden">
        <div className="border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--admin-ink)]">{isSeller ? "Where your money stands" : "Where this seller’s money stands"}</h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">Only “Payable now” can be sent today. Waiting earnings are not available until their release conditions are met.</p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4">
          <div className="p-5 xl:border-r xl:border-[var(--admin-line)]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">1. Waiting to be released</div>
            <div className="mt-2 text-2xl font-bold text-[var(--admin-navy)]">{money(pendingBalance, currency)}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--admin-muted)]">From delivered orders still waiting for their payout date or return window.</p>
            {wallet.nextEligibleAt && <p className="mt-1 text-xs font-medium text-[var(--admin-ink)]">Next expected release: {formatDateTime12Hour(wallet.nextEligibleAt)}</p>}
          </div>
          <div className="border-t border-[var(--admin-line)] p-5 md:border-l md:border-t-0 xl:border-l-0 xl:border-r">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">2. Available earnings</div>
            <div className="mt-2 text-2xl font-bold text-[var(--admin-navy)]">{money(balances.availableBalance, currency)}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--admin-muted)]">Released earnings before amounts owed to the platform are deducted.</p>
          </div>
          <div className="border-t border-[var(--admin-line)] bg-red-50/50 p-5 xl:border-r xl:border-t-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-red-700">3. {isSeller ? "You owe" : "Seller owes"}</div>
            <div className="mt-2 text-2xl font-bold text-red-700">{money(totalAmountOwed, currency)}</div>
            <p className="mt-2 text-xs leading-5 text-red-700/80">Deducted from available or future released earnings before a payout is sent.</p>
            {totalAmountOwed > 0 && <p className="mt-1 text-xs text-red-700">COD: {owedMoney(codAmountOwed, currency)} · Other: {owedMoney(otherAmountOwed, currency)}</p>}
          </div>
          <div className="border-t border-[var(--admin-line)] bg-emerald-50/60 p-5 md:border-l xl:border-l-0 xl:border-t-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">4. Payable now</div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{money(balances.effectiveAvailablePayout, currency)}</div>
            <p className="mt-2 text-xs leading-5 text-emerald-700/80">The amount currently eligible to be sent using your payout preference.</p>
          </div>
        </div>
        {pendingBalance > 0 && (
          <div className="border-t border-[var(--admin-line)] bg-[var(--admin-soft)] px-5 py-3 text-xs text-[var(--admin-muted)]">
            If all waiting earnings are released without returns or further adjustments, approximately <strong className="text-[var(--admin-ink)]">{money(estimatedAfterRelease, currency)}</strong> would remain after the current amount owed is recovered.
          </div>
        )}
      </section>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="admin-card p-4"><span className="text-xs text-[var(--admin-muted)]">Temporarily on hold</span><strong className="mt-1 block text-lg text-[var(--admin-ink)]">{money(balances.blockedBalance, currency)}</strong><span className="text-xs text-[var(--admin-muted)]">{counts.blocked || 0} order entries affected</span></div>
        <div className="admin-card p-4"><span className="text-xs text-[var(--admin-muted)]">Payout being processed</span><strong className="mt-1 block text-lg text-[var(--admin-ink)]">{money(balances.inProcessBalance, currency)}</strong><span className="text-xs text-[var(--admin-muted)]">{wallet.payouts?.inProcessCount || 0} payout requests</span></div>
        <div className="admin-card p-4"><span className="text-xs text-[var(--admin-muted)]">Paid to date</span><strong className="mt-1 block text-lg text-[var(--admin-ink)]">{money(balances.paidBalance, currency)}</strong><span className="text-xs text-[var(--admin-muted)]">{wallet.payouts?.paidCount || 0} completed payouts</span></div>
        <div className="admin-card p-4"><span className="text-xs text-[var(--admin-muted)]">Internal seller wallet</span><strong className="mt-1 block text-lg text-[var(--admin-ink)]">{money(sellerWallet.availableBalance, currency)}</strong><span className="text-xs text-[var(--admin-muted)]">Only used when “Seller Wallet” is the payout destination</span></div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-[18px] font-medium text-gray-900">
                Earnings by order
              </h2>
              <p className="text-xs text-gray-500">
                See the release state and reason for every order earning.
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
          {isSeller && (
            <>
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
                RazorpayX uses the verified bank details saved in your store profile.
              </p>
              {organizations.length > 1 && (
                <label className="mt-3 block text-xs font-medium text-gray-600">
                  Organization
                  <select
                    className="admin-input mt-1 w-full"
                    value={selectedOrganizationId}
                    onChange={(event) => setSelectedOrganizationId(event.target.value)}
                  >
                    {organizations.map((organization) => (
                      <option key={organizationIdOf(organization)} value={organizationIdOf(organization)}>
                        {organization.storeDisplayName || organization.legalBusinessName || organizationIdOf(organization)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className={`mt-3 rounded-lg border p-3 text-sm ${hasSavedBank ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
                {hasSavedBank ? (
                  <dl className="space-y-2 text-gray-700">
                    <div><dt className="text-xs text-gray-500">Account holder</dt><dd className="font-medium">{savedBankDetails.accountHolderName}</dd></div>
                    <div><dt className="text-xs text-gray-500">Bank account</dt><dd className="font-medium">{savedBankDetails.bankName} · •••• {savedAccountNumber.slice(-4)}</dd></div>
                    <div><dt className="text-xs text-gray-500">IFSC</dt><dd className="font-medium">{savedBankDetails.ifscCode}</dd></div>
                  </dl>
                ) : (
                  <p className="text-amber-700">Complete the bank details in My Store before selecting RazorpayX payouts.</p>
                )}
              </div>
            
              {selectedOrganization?.bankVerificationStatus && (
                <p className="mt-3 text-xs text-gray-500">
                  Verification status: {formatLabel(selectedOrganization.bankVerificationStatus)}.
                </p>
              )}
            </div>
          )}
            </>
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
                  : totalAmountOwed > 0
                    ? "Payout reduced by amount owed"
                  : "Not yet eligible"}
              </strong>
              <p className="mt-1 text-xs">
                {wallet.canRequestPayout
                  ? "The available balance meets the payout policy."
                  : totalAmountOwed > 0
                    ? `${money(totalAmountOwed, currency)} is still owed. Future released earnings will be used to recover it before any payout is sent.`
                  : wallet.minimumPayoutShortfall > 0
                    ? `${money(wallet.minimumPayoutShortfall, currency)} more is needed to meet the minimum payout.`
                    : "Wait for pending or held amounts to become available."}
              </p>
            </div>
            <button
              type="button"
              className="admin-btn mt-4 w-full"
              onClick={() => navigate(isSeller ? "/app/seller-payouts" : `/app/seller-payouts?sellerId=${selectedSellerId}`)}
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
        </aside>
      </div>
        </>
      )}
    </div>
  );
}
