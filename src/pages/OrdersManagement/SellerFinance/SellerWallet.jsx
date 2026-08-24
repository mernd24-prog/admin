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
const receivableMeaning = (item = {}) => {
  const status = String(item.releaseStatus || item.status || "pending").toLowerCase();
  const reason = String(item.releaseReason || "").toLowerCase();
  if (["released", "paid", "completed"].includes(status)) return "Included in a completed payout or balance adjustment.";
  if (["processing", "approved"].includes(status)) return "Included in a payout that is currently being processed.";
  if (["held", "blocked", "on_hold"].includes(status)) return "Temporarily unavailable because of a return, refund, dispute, or payment hold.";
  if (["eligible", "available"].includes(status)) return "Return window is closed and this earning is available for payout or liability adjustment.";
  if (reason.includes("return_window")) return "Waiting for the product return window to close before this earning can be released.";
  return "Earning is recorded but has not reached its payout release milestone yet.";
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
        label: "What this amount means",
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
        title={isSeller ? "Wallet" : "Seller Wallet"}
        subtitle={isSeller ? "Understand what you earned, what is waiting, what you owe, and what can actually be paid out." : "Select a seller to review earnings, liabilities, adjustments, and payout readiness."}
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

      {Number(balances.codLiabilityBalance || 0) > 0 && (
        <div className="admin-card mb-4 border-l-4 border-l-[var(--admin-gold)] p-4 text-sm text-[var(--admin-ink)]">
          <div className="font-semibold">You currently hold {money(balances.codLiabilityBalance, currency)} of seller-collected COD cash.</div>
          <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">It is adjusted from released earnings; any unpaid remainder carries forward.</p>
        </div>
      )}

      <div className="admin-card mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div><span className="block text-xs text-[var(--admin-muted)]">Available earnings</span><strong className="text-[var(--admin-ink)]">{money(balances.availableBalance, currency)}</strong></div>
        <div><span className="block text-xs text-[var(--admin-muted)]">Less: COD liability</span><strong className="text-red-600">−{money(balances.codLiabilityBalance, currency)}</strong></div>
        <div><span className="block text-xs text-[var(--admin-muted)]">Less: other adjustments</span><strong className="text-red-600">−{money(balances.otherAdjustmentBalance, currency)}</strong></div>
        <div className="xl:border-l xl:border-[var(--admin-line)] xl:pl-4"><span className="block text-xs text-[var(--admin-muted)]">Payable now</span><strong className="text-[var(--admin-gold-dark)]">{money(balances.effectiveAvailablePayout, currency)}</strong></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Seller-collected COD liability
            </h2>
            <p className="mt-2 font-medium text-gray-900">
              {money(balances.codLiabilityBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {isSeller ? "COD cash held by you." : "COD cash held by this seller."} It is automatically deducted from released earnings and any remainder carries forward.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-[18px] font-medium text-gray-900">
              Other adjustments
            </h2>
            <p className="mt-2 font-medium text-gray-900">
              {money(balances.otherAdjustmentBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Refunds, chargebacks, corrections, and non-COD recoveries.
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
        </>
      )}
    </div>
  );
}
