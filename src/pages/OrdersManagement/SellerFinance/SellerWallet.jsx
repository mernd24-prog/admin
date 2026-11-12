import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdAccountBalanceWallet, MdRefresh } from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import StatusBadge from "../../../components/Shared/StatusBadge";
import Loader from "../../../components/Loader/Loader";
import DataTable from "../../../components/Shared/DataTable";
import SummaryCard from "../../../components/Shared/SummaryCard";
import ContentPanel from "../../../components/Shared/ContentPanel";
import { OrderLink } from "../../../components/Shared/EntityLink";
import {
  getMySellerWalletSummary,
  getSellerWalletSummary,
} from "../../../Redux/sellerCommissionsSlice";
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
import { EmptyState } from "../Orders/components/ViewOrders";

const unwrap = (value = {}) => value?.data?.data || value?.data || {};
const money = (value, currency = "INR") =>
  formatCurrency(Number(value || 0), "₹0", currency);
const owedMoney = (value, currency = "INR") =>
  money(Math.abs(Number(value || 0)), currency);
const releaseLabel = (item = {}) => {
  const status = String(
    item.releaseStatus || item.status || "pending",
  ).toLowerCase();
  const reason = String(item.releaseReason || "").toLowerCase();
  if (["released", "paid", "completed"].includes(status)) return "Paid";
  if (["processing", "approved", "in_process"].includes(status))
    return "Payout processing";
  if (["held", "blocked", "on_hold"].includes(status)) return "On hold";
  if (["eligible", "available"].includes(status)) return "Available now";
  if (reason.includes("return_window")) return "Return window open";
  return "Waiting for release";
};
const receivableMeaning = (item = {}) => {
  const status = String(
    item.releaseStatus || item.status || "pending",
  ).toLowerCase();
  const reason = String(item.releaseReason || "").toLowerCase();
  if (["released", "paid", "completed"].includes(status))
    return "This earning has already been settled.";
  if (["processing", "approved", "in_process"].includes(status))
    return "A payout containing this earning is being processed.";
  if (["held", "blocked", "on_hold"].includes(status))
    return "Temporarily unavailable because of a return, refund, dispute, or payment hold.";
  if (["eligible", "available"].includes(status))
    return "Ready to cover an amount owed or be included in your next payout.";
  if (reason.includes("return_window"))
    return "Becomes available after the product return window closes.";
  return "Recorded, but the order has not yet reached its payout release date.";
};
const listFrom = (response = {}) => {
  const root = unwrap(response);
  return root.items || root.list || root.rows || root.data || [];
};
const organizationIdOf = (organization) => {
  const source = organization || {};
  return (
    source.id ||
    source._id ||
    source.organizationId ||
    source.organization_id ||
    ""
  );
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
  const otherAmountOwed = Math.abs(
    Number(balances.otherAdjustmentBalance || 0),
  );
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
          <OrderLink
            orderId={value || row.order_id}
            orderNumber={row.orderNumber || row.order_number}
          />
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
            <div
              className="truncate text-xs leading-5 text-gray-600"
              title={receivableMeaning(item)}
            >
              {receivableMeaning(item)}
            </div>

            {item.eligibleAt && (
              <div className="mt-1 truncate text-[11px] text-gray-400">
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
        await dispatch(
          getSellerWalletSummary({ sellerId: selectedSellerId }),
        ).unwrap();
        return;
      }
      const [walletResponse, organizationResponse] = await Promise.all([
        dispatch(getMySellerWalletSummary({ limit: 100, offset: 0 })).unwrap(),
        apiRequest("GET", ENDPOINTS.sellers.myOrganizations, { limit: 50 }),
      ]);
      const loadedWallet = unwrap(walletResponse);
      const loadedPreference = loadedWallet.payoutPreference || {};
      const organizationRows = listFrom(organizationResponse);
      setOrganizations(organizationRows);
      const activeOrganization =
        organizationRows.find(
          (org) =>
            String(organizationIdOf(org)) ===
            String(
              loadedPreference.organizationId ||
                payoutPreference.organizationId,
            ),
        ) ||
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
    dropdownApi
      .getSellers({ limit: 100 })
      .then((sellers) => {
        const options = Array.isArray(sellers) ? sellers : [];
        setSellerOptions(options);
        setSelectedSellerId((prev) => {
          if (prev) return prev;
          return options[0]?.value ? String(options[0].value) : "";
        });
      })
      .catch(() => {
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
      toast.error(
        error?.message || error || "Unable to update payout preference",
      );
    } finally {
      setSavingPreference(false);
    }
  };

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (org) =>
          String(organizationIdOf(org)) === String(selectedOrganizationId),
      ) || null,
    [organizations, selectedOrganizationId],
  );
  const savedBankDetails =
    selectedOrganization?.bankDetails || payoutPreference.bankDetails || {};
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
        subtitle={
          isSeller
            ? "Track earnings from order delivery through the return window to your final payout."
            : "Select a seller to see what is waiting, what is owed, and what can be paid."
        }
        breadcrumbs={[
          {
            label: isSeller
              ? "My Finance & Payouts"
              : "Seller Finance & Payouts",
          },
          { label: "Seller Wallet" },
        ]}
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-busy={loading}
          >
            <MdRefresh size={17} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      {!isSeller && (
        <ContentPanel className="mb-5" bodyClassName="p-4 sm:p-5">
          <div className="max-w-xl">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-ink)]">
              Seller
            </label>
            <p className="mb-3 text-xs text-[var(--admin-muted)]">
              Choose the seller whose earnings and payout activity you want to
              review.
            </p>
            <FilterSelect
              options={sellerOptions}
              value={
                sellerOptions.find(
                  (option) => String(option.value) === String(selectedSellerId),
                ) || null
              }
              onChange={(option) => setSelectedSellerId(option?.value || "")}
              placeholder="Search or select a seller"
              isSearchable
              isClearable
            />
          </div>
          {!selectedSellerId && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--admin-line)] bg-[#fffaf0] px-4 py-4 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#ead8a9] bg-white text-[var(--admin-gold-dark)]">
                <MdAccountBalanceWallet size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">
                  Seller wallet is ready to view
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--admin-muted)]">
                  Select a seller above to see their earnings, balances, and
                  payout activity.
                </p>
              </div>
            </div>
          )}
        </ContentPanel>
      )}

      {isSeller || selectedSellerId ? (
        <>
          <ContentPanel
            title={
              isSeller
                ? "Where your money stands"
                : "Where this seller’s money stands"
            }
            description={
              <>
                Only “Payable now” can be sent today. Waiting earnings are
                unavailable until their release conditions are met.
              </>
            }
            action={
              <span className="text-xs font-medium text-[var(--admin-muted)]">
                {wallet.total || items.length} order{" "}
                {(wallet.total || items.length) === 1 ? "entry" : "entries"}
              </span>
            }
            className="mb-5"
            bodyClassName="space-y-3 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Waiting to be released"
                value={money(pendingBalance, currency)}
                description={
                  <>
                    <span>
                      From delivered orders still waiting for their payout date
                      or return window.
                    </span>
                    {wallet.nextEligibleAt && (
                      <span className="mt-1 block font-medium text-[var(--admin-ink)]">
                        Next expected release:{" "}
                        {formatDateTime12Hour(wallet.nextEligibleAt)}
                      </span>
                    )}
                  </>
                }
              />
              <SummaryCard
                title="Available earnings"
                value={money(balances.availableBalance, currency)}
                description="Released earnings before amounts owed to the platform are deducted."
              />
              <SummaryCard
                title={isSeller ? "You owe" : "Seller owes"}
                value={money(totalAmountOwed, currency)}
                description={
                  <>
                    <span>
                      Deducted from available or future released earnings
                      before a payout is sent.
                    </span>
                    {totalAmountOwed > 0 && (
                      <span className="mt-1 block font-medium text-[var(--admin-ink)]">
                        COD: {owedMoney(codAmountOwed, currency)} · Other:{" "}
                        {owedMoney(otherAmountOwed, currency)}
                      </span>
                    )}
                  </>
                }
              />
              <SummaryCard
                title="Payable now"
                value={money(balances.effectiveAvailablePayout, currency)}
                description="The amount currently eligible to be sent using your payout preference."
              />
            </div>
            {pendingBalance > 0 && (
              <p className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-3 text-xs text-[var(--admin-muted)]">
                If all waiting earnings are released without returns or further
                adjustments, approximately{" "}
                <strong className="text-[var(--admin-ink)]">
                  {money(estimatedAfterRelease, currency)}
                </strong>{" "}
                would remain after the current amount owed is recovered.
              </p>
            )}
          </ContentPanel>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Temporarily on hold"
              value={money(balances.blockedBalance, currency)}
              description={`${counts.blocked || 0} order entries affected`}
            />
            <SummaryCard
              title="Payout being processed"
              value={money(balances.inProcessBalance, currency)}
              description={`${wallet.payouts?.inProcessCount || 0} payout requests`}
            />
            <SummaryCard
              title="Paid to date"
              value={money(balances.paidBalance, currency)}
              description={`${wallet.payouts?.paidCount || 0} completed payouts`}
            />
            <SummaryCard
              title="Internal seller wallet"
              value={money(sellerWallet.availableBalance, currency)}
              description="Only used when ‘Seller Wallet’ is the payout destination."
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
            <ContentPanel
              title="Earnings by order"
              description="See the release state and reason for every order earning."
              action={
                <span className="text-xs text-[var(--admin-muted)]">
                  {wallet.total || items.length} entries
                </span>
              }
              className="flex min-h-[550px] min-w-0 flex-col"
              bodyClassName="flex min-h-0 flex-1 flex-col [&>div]:flex-1"
            >
              <DataTable
                columns={ledgerColumns}
                data={items}
                loading={loading}
                totalCount={items.length}
                pageSize={Math.max(items.length, 1)}
                rowKey={(item) => item.commissionId || item.orderId}
                emptyText="No seller wallet entries yet."
                stretchEmptyState
                cardClassName="flex h-full flex-col overflow-hidden"
              />
            </ContentPanel>

            <aside className="space-y-4">
              {isSeller && (
                <>
                  <ContentPanel
                    title="Payout preference"
                    description="Choose where released seller earnings should go."
                    bodyClassName="space-y-2 p-4"
                  >
                      {[
                        {
                          value: "razorpayx",
                          label: "Bank / RazorpayX",
                          helper: "Transfer to verified bank account.",
                        },
                        {
                          value: "seller_wallet",
                          label: "Seller Wallet",
                          helper: "Credit this internal seller wallet.",
                        },
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
                            disabled={
                              savingPreference ||
                              payoutPreference.sellerCanChoose === false
                            }
                            onChange={() =>
                              updatePayoutPreference(option.value)
                            }
                          />
                          <span>
                            <span className="block font-medium">
                              {option.label}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {option.helper}
                            </span>
                          </span>
                        </label>
                      ))}
                    {payoutPreference.sellerCanChoose === false && (
                      <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                        Admin has locked payout destination to{" "}
                        {payoutPreference.platformDefault === "seller_wallet"
                          ? "Seller Wallet"
                          : "Bank / RazorpayX"}
                        .
                      </p>
                    )}
                  </ContentPanel>
                  {payoutDestination === "razorpayx" && (
                    <ContentPanel
                      title="Payout bank account"
                      description="RazorpayX uses the verified bank details saved in your store profile."
                      bodyClassName="p-4"
                    >
                      {organizations.length > 1 && (
                        <label className="mt-3 block text-xs font-medium text-gray-600">
                          Organization
                          <select
                            className="admin-input mt-1 w-full"
                            value={selectedOrganizationId}
                            onChange={(event) =>
                              setSelectedOrganizationId(event.target.value)
                            }
                          >
                            {organizations.map((organization) => (
                              <option
                                key={organizationIdOf(organization)}
                                value={organizationIdOf(organization)}
                              >
                                {organization.storeDisplayName ||
                                  organization.legalBusinessName ||
                                  organizationIdOf(organization)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <div
                        className={`mt-3 rounded-lg border p-3 text-sm ${hasSavedBank ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}
                      >
                        {hasSavedBank ? (
                          <dl className="space-y-2 text-gray-700">
                            <div>
                              <dt className="text-xs text-gray-500">
                                Account holder
                              </dt>
                              <dd className="font-medium">
                                {savedBankDetails.accountHolderName}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-500">
                                Bank account
                              </dt>
                              <dd className="font-medium">
                                {savedBankDetails.bankName} · ••••{" "}
                                {savedAccountNumber.slice(-4)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-500">IFSC</dt>
                              <dd className="font-medium">
                                {savedBankDetails.ifscCode}
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-amber-700">
                            Complete the bank details in My Store before
                            selecting RazorpayX payouts.
                          </p>
                        )}
                      </div>

                      {selectedOrganization?.bankVerificationStatus && (
                        <p className="mt-3 text-xs text-gray-500">
                          Verification status:{" "}
                          {formatLabel(
                            selectedOrganization.bankVerificationStatus,
                          )}
                          .
                        </p>
                      )}
                    </ContentPanel>
                  )}
                </>
              )}

              <ContentPanel
                title="Payout readiness"
                bodyClassName="p-4"
                action={
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      wallet.canRequestPayout
                        ? "bg-emerald-50 text-emerald-700"
                        : totalAmountOwed > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {wallet.canRequestPayout
                      ? "Ready"
                      : totalAmountOwed > 0
                        ? "Adjustment pending"
                        : "Not eligible"}
                  </span>
                }
              >

                <div
                  className={`rounded-lg border p-3 ${
                    wallet.canRequestPayout
                      ? "border-emerald-100 bg-emerald-50/70"
                      : totalAmountOwed > 0
                        ? "border-amber-100 bg-amber-50/70"
                        : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {wallet.canRequestPayout
                      ? "Ready for payout"
                      : totalAmountOwed > 0
                        ? "Payout reduced by amount owed"
                        : "Not yet eligible"}
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-gray-600">
                    {wallet.canRequestPayout
                      ? "Your available balance meets the payout requirements."
                      : totalAmountOwed > 0
                        ? `${money(totalAmountOwed, currency)} is still owed. Future released earnings will be used to recover this amount before any payout is sent.`
                        : wallet.minimumPayoutShortfall > 0
                          ? `${money(wallet.minimumPayoutShortfall, currency)} more is needed to meet the minimum payout.`
                          : "Your pending or held earnings must become available before you can receive a payout."}
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--admin-gold)] bg-[var(--admin-gold)] px-4 py-2.5 text-sm font-semibold text-[var(--admin-navy)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--admin-gold-dark)] hover:bg-[var(--admin-gold-dark)] hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-gold)] focus-visible:ring-offset-2"
                  onClick={() =>
                    navigate(
                      isSeller
                        ? "/app/seller-payouts"
                        : `/app/seller-payouts?sellerId=${selectedSellerId}`,
                    )
                  }
                >
                  View payouts
                </button>
              </ContentPanel>

              <ContentPanel
                title="Wallet payout credits"
                bodyClassName="space-y-2 p-4"
              >
                  {walletTransactions.length ? (
                    walletTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-lg border border-gray-100 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-900">
                            {money(transaction.amount, currency)}
                          </span>
                          <StatusBadge status={transaction.status} dot />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {transaction.referenceId || "Seller payout"} ·{" "}
                          {formatDateTime12Hour(transaction.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState>No wallet payout credits yet.</EmptyState>
                  )}
              </ContentPanel>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
