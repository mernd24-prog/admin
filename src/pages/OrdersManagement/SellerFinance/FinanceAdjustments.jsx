import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MdAccountBalanceWallet,
  MdArrowForward,
  MdAssignmentReturn,
  MdLocalOffer,
  MdPauseCircle,
  MdWarningAmber,
  MdVisibility,
} from "react-icons/md";
import Cards from "../../../components/Cards/Cards";
import Loader from "../../../components/Loader/Loader";
import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import FormSection from "../../../components/Shared/FormSection";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { OrderLink } from "../../../components/Shared/EntityLink";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import {
  getMyPromotionFundingLedger,
  getSellerPayouts,
  getMySellerWalletSummary,
} from "../../../Redux/sellerCommissionsSlice";
import {
  FinanceStatusCell,
  financeDateTime,
  financeMoney,
  financeAmounts,
  sellerFinanceStatus,
  signedFinanceMoney,
  unwrapFinance,
} from "./financeUi";
import Tabs from "../../../components/Shared/Tabs";
import { formatDateTime12Hour } from "../../../utils/formatters";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "returns", label: "Returns & refunds" },
  { value: "promotions", label: "Promotions" },
  { value: "cod", label: "COD" },
  { value: "holds", label: "Holds" },
  { value: "recoveries", label: "Recoveries" },
  { value: "other", label: "Other" },
];
export default function FinanceAdjustments() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const category = params.get("type") || "";
  const promotionState = useSelector(
    (store) => store.sellerCommissions?.promotionLedgerData || {},
  );
  const walletState = useSelector(
    (store) => store.sellerCommissions?.walletSummaryData || {},
  );
  const payoutsState = useSelector(
    (store) => store.sellerCommissions?.myPayoutsData || {},
  );
  const promotionPayload = unwrapFinance(promotionState);
  const wallet = unwrapFinance(walletState);
  const payoutPayload = unwrapFinance(payoutsState);
  const totals = promotionPayload.totals || {};
  const balances = wallet.balances || {};
  const [codRows, setCodRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [, , , codResponse] = await Promise.all([
        dispatch(
          getMyPromotionFundingLedger({ limit: 100, offset: 0 }),
        ).unwrap(),
        dispatch(getMySellerWalletSummary({ limit: 100, offset: 0 })).unwrap(),
        dispatch(getSellerPayouts({ limit: 100, offset: 0 })).unwrap(),
        axiosProvider.get(ENDPOINTS.payments.myCodCollections),
      ]);
      const codData = codResponse?.data?.data;
      setCodRows(
        Array.isArray(codData)
          ? codData
          : codData?.items || codData?.list || [],
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load adjustments",
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch]);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const promotionRows = Array.isArray(promotionPayload.items)
      ? promotionPayload.items
      : [];
    const walletItems = Array.isArray(wallet.items) ? wallet.items : [];
    const payoutItems = Array.isArray(payoutPayload.items) ? payoutPayload.items : [];
    const promotions = promotionRows.map((row) => ({
      ...row,
      adjustmentType: "promotions",
      title:
        Number(row.reversalAmount || 0) > 0
          ? "Reversed Promotion"
          : "Marketplace Funded Promotion",
      amount: Number(row.netPlatformContributionAmount || 0),
      description:
        "The customer promotion is split by funding source. Marketplace contribution is included toward your receivable, not charged as commission.",
    }));
    const cod = codRows.map((row) => ({
      ...row,
      adjustmentType: "cod",
      title: "COD cash collected by you",
      amount: -Math.abs(
        Number(row.expected_amount ?? row.collected_amount ?? 0),
      ),
      description:
        "You received this cash directly from the customer. The same amount is owed to the marketplace and is recovered from your eligible earnings.",
      nextStep:
        Number(row.remaining_amount || 0) > 0
          ? "The remaining amount will be recovered from future eligible earnings."
          : "No action is required for this collection.",
    }));
    const holds = walletItems
      .filter((row) =>
        ["held", "blocked", "on_hold"].includes(
          String(row.releaseStatus || row.status || "").toLowerCase(),
        ),
      )
      .map((row) => ({
        ...row,
        adjustmentType: "holds",
        title: "Earning temporarily held",
        amount: Number(financeAmounts(row).sellerEarning ?? row.netAmount ?? row.net_amount ?? 0),
        description: String(
          row.releaseReason || row.reason || "",
        ).includes("cod_collection")
          ? "This is not another COD charge. This earning is unavailable while the related COD recovery is active."
          : "This earning is temporarily unavailable while a return, refund, dispute, or another hold is active.",
        nextStep: String(
          row.releaseReason || row.reason || "",
        ).includes("cod_collection")
          ? "The COD amount is recovered automatically when earnings become eligible."
          : "Resolve the hold condition before this earning can become payable.",
      }));
    const refunds = walletItems
      .filter((row) => Number(row.refundAmount || row.refund_amount || 0) !== 0)
      .map((row) => ({
        ...row,
        adjustmentType: "returns",
        title: "Return or refund adjustment",
        amount: -Math.abs(Number(financeAmounts(row).refundAdjustment ?? row.refundAmount ?? row.refund_amount ?? 0)),
        description:
          "The related earning was reduced because an item was returned or refunded.",
        nextStep: "Open the related order to review the return or refund.",
      }));
    const other = walletItems
      .filter(
        (row) =>
          Number(financeAmounts(row).otherAdjustment ?? row.adjustmentAmount ?? row.adjustment_amount ?? 0) !== 0,
      )
      .map((row) => ({
        ...row,
        adjustmentType: "other",
        title: "Other adjustment",
        amount: Number(financeAmounts(row).otherAdjustment ?? row.adjustmentAmount ?? row.adjustment_amount ?? 0),
        description:
          "An adjustment recorded by the existing settlement calculation.",
        nextStep: "Open the details to review the recorded adjustment.",
      }));
    const recoveries = payoutItems
      .filter((row) => Number(row.adjustment_amount ?? row.adjustmentAmount ?? 0) < 0)
      .map((row) => ({
        ...row,
        adjustmentType: "recoveries",
        title: "COD recovery from payout",
        orderNumber: row.orderNumber || row.order_number || row.earningsBreakdown?.orderNumber || null,
        amount: Number(row.adjustment_amount ?? row.adjustmentAmount ?? 0),
        description:
          "This amount was recovered from a seller payout against collected COD. The remaining COD balance will be recovered from future eligible earnings.",
        nextStep:
          "This recovery is complete. Check COD collections for any amount still owed.",
      }));
    return [...refunds, ...promotions, ...cod, ...recoveries, ...holds, ...other].filter(
      (row) => !category || row.adjustmentType === category,
    );
  }, [category, codRows, payoutPayload.items, promotionPayload.items, wallet.items]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && sellerFinanceStatus(row).key !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const visibleValues = [
        row.title,
        row.description,
        row.orderNumber,
        row.order_number,
        row.orderId,
        row.order_id,
        row.amount,
        row.currency,
        row.status,
        row.releaseStatus,
        row.lifecycleStatus,
        row.payoutStatus,
        row.adjustmentType,
        sellerFinanceStatus(row).label,
        financeMoney(row.amount, row.currency),
        signedFinanceMoney(row.amount, row.currency),
        financeDateTime(row.createdAt || row.created_at || row.updatedAt, ""),
      ];

      return visibleValues
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter]);
  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((left, right) => {
        const difference = Number(left.amount || 0) - Number(right.amount || 0);
        return sortDir === "desc" ? -difference : difference;
      }),
    [filteredRows, sortDir],
  );
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [page, pageSize, sortedRows]);
  useEffect(() => {
    setPage(1);
  }, [category, search, statusFilter]);
  const statusOptions = useMemo(() => {
    const availableStatuses = new Map();
    rows.forEach((row) => {
      const status = sellerFinanceStatus(row);
      availableStatuses.set(status.key, status.label);
    });
    return [
      { value: "", label: "All statuses" },
      ...Array.from(availableStatuses, ([value, label]) => ({
        value,
        label,
      })).sort((left, right) => left.label.localeCompare(right.label)),
    ];
  }, [rows]);
  const owed = Math.abs(Number(balances.codLiabilityBalance || 0));
  const availableEarnings = Math.max(
    0,
    Number(balances.availableBalance || 0),
  );
  const payableNow = Math.max(
    0,
    Number(balances.effectiveAvailablePayout || 0),
  );
  const deductionsApplied = Math.max(0, availableEarnings - payableNow);
  const codStatus = (row) => {
    const status = String(row.status || "").toLowerCase();
    if (status === "pending") {
      return {
        label: "Automatic verification pending",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    }
    if (["confirmed", "submitted"].includes(status)) {
      return {
        label: "Automatic verification pending",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    }
    if (["verified", "remitted"].includes(status)) {
      return {
        label:
          Number(row.remaining_amount || 0) > 0
            ? "Recovery in progress"
            : "Reconciled",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    }
    return null;
  };
  const adjustmentStatus = (row) => {
    if (row.adjustmentType === "cod") return codStatus(row);
    if (row.adjustmentType === "holds") {
      const reason = String(row.releaseReason || row.reason || "");
      return {
        label: reason.includes("cod_collection")
          ? "Held for COD recovery"
          : "Temporarily on hold",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    }
    return null;
  };
  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Adjustment",
        cellClassName: "whitespace-normal align-top",
        render: (value, row) => (
          <div className="min-w-[240px] max-w-sm whitespace-normal">
            <strong className="block text-sm font-semibold text-[var(--admin-ink)]">
              {value}
            </strong>
            <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-[var(--admin-muted)]">
              {row.description}
            </p>
          </div>
        ),
      },
      {
        key: "order",
        label: "Reference",
        cellClassName: "align-top",
        render: (_, row) => (
          <div className="min-w-[140px]">
            <div>
              {row.orderId || row.order_id ? (
                <OrderLink
                  orderId={row.orderId || row.order_id}
                  orderNumber={row.orderNumber || row.order_number}
                />
              ) : row.orderNumber || row.order_number ? (
                row.orderNumber || row.order_number
              ) : row.adjustmentType === "recoveries" ? (
                "Multiple orders"
              ) : (
                "—"
              )}
            </div>
            <span className="mt-1 block text-xs text-[var(--admin-muted)]">
              {formatDateTime12Hour(
                row.createdAt || row.created_at || row.updatedAt,
              )}
            </span>
          </div>
        ),
      },
      {
        key: "amount",
        label: "Financial effect",
        sortable: true,
        cellClassName: "align-top",
        render: (value, row) => (
          <strong
            className={
              Number(value) < 0
                ? "text-red-700"
                : row.adjustmentType === "holds"
                  ? "text-amber-700"
                  : "text-emerald-700"
            }
          >
            {row.adjustmentType === "cod"
              ? `${financeMoney(Math.abs(Number(value || 0)), row.currency)} owed`
              : row.adjustmentType === "holds"
                ? `${financeMoney(value, row.currency)} unavailable`
                : signedFinanceMoney(value, row.currency)}
          </strong>
        ),
      },
      {
        key: "status",
        label: "Current state",
        cellClassName: "align-top",
        render: (_, row) => {
          const status = adjustmentStatus(row);
          return status ? (
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          ) : (
            <FinanceStatusCell row={row} />
          );
        },
      },
      {
        key: "nextStep",
        label: "What happens next",
        cellClassName: "whitespace-normal align-top",
        render: (value) => (
          <p className="min-w-[200px] max-w-xs whitespace-normal text-xs leading-5 text-[var(--admin-muted)]">
            {value || "No further action is required."}
          </p>
        ),
      },
      {
        key: "action",
        label: "Action",
        cellClassName: "align-top",
        render: (_, row) => (
          <button
            type="button"
            className="admin-btn-secondary !px-2 !py-1"
            onClick={() => setDetail(row)}
          >
            <MdVisibility aria-hidden="true" /> View details
          </button>
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-5">
      <Loader loading={Boolean(loading)} />
      <PageHeader
        title="Adjustments"
        subtitle="See what reduced, delayed, or recovered your earnings and what happens next."
        breadcrumbs={[
          { label: "My Finance & Payouts" },
          { label: "Adjustments" },
        ]}
      />

      {(owed > 0 || deductionsApplied > 0) && (
        <section className="rounded-lg border border-red-200 bg-red-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <MdWarningAmber aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-[var(--admin-ink)]">
                Why your payable balance is lower
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                COD cash collected directly from customers is money already held
                by you. It is recorded as an amount owed and recovered from your
                eligible earnings.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <div className="rounded-md border border-[var(--admin-line)] bg-white p-3">
                  <span className="block text-xs text-[var(--admin-muted)]">
                    Eligible earnings
                  </span>
                  <strong className="mt-1 block text-base text-[var(--admin-ink)]">
                    {financeMoney(availableEarnings)}
                  </strong>
                </div>
                <span className="hidden text-lg font-semibold text-[var(--admin-muted)] sm:block">
                  −
                </span>
                <div className="rounded-md border border-red-200 bg-white p-3">
                  <span className="block text-xs text-[var(--admin-muted)]">
                    Adjustments applied now
                  </span>
                  <strong className="mt-1 block text-base text-red-700">
                    {financeMoney(deductionsApplied)}
                  </strong>
                </div>
                <span className="hidden text-lg font-semibold text-[var(--admin-muted)] sm:block">
                  =
                </span>
                <div className="rounded-md border border-emerald-200 bg-white p-3">
                  <span className="block text-xs text-[var(--admin-muted)]">
                    Payable now
                  </span>
                  <strong className="mt-1 block text-base text-emerald-700">
                    {financeMoney(payableNow)}
                  </strong>
                </div>
              </div>
              {owed > 0 && (
                <div className="mt-3 flex flex-col gap-2 rounded-md bg-white p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="leading-5 text-[var(--admin-muted)]">
                    <strong className="text-red-700">
                      {financeMoney(owed)} COD still owed.
                    </strong>{" "}
                    Any amount not recovered now carries forward to future
                    eligible earnings.
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/app/seller-cod-collections")}
                    className="admin-btn-secondary shrink-0 !px-3 !py-1.5"
                  >
                    Review COD collections
                    <MdArrowForward aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cards
          label="Returns & Refunds"
          value={financeMoney(wallet.refundAdjustmentTotal || 0)}
          description="Earnings reversed because of returns or refunds."
          icon={<MdAssignmentReturn aria-hidden="true" size={18} />}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
          onClick={() => setParams({ type: "returns" })}
        />
        <Cards
          label="Promotion Contribution"
          value={financeMoney(totals.netPlatformContributionAmount)}
          description="Marketplace contribution remaining after reversals."
          icon={<MdLocalOffer aria-hidden="true" size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => setParams({ type: "promotions" })}
        />
        <Cards
          label="COD Cash Still Owed"
          value={financeMoney(owed)}
          description="Customer cash held by you that still needs to be recovered from eligible earnings."
          icon={<MdAccountBalanceWallet aria-hidden="true" size={18} />}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
          onClick={() => setParams({ type: "cod" })}
        />
        <Cards
          label="Temporary Holds"
          value={financeMoney(balances.blockedBalance)}
          description="Unavailable while an issue is active."
          icon={<MdPauseCircle aria-hidden="true" size={18} />}
          iconBg="#ffe5b5"
          iconColor="#f5a300"
          onClick={() => setParams({ type: "holds" })}
        />
      </div>
      <Tabs
        tabs={CATEGORIES}
        activeTab={category}
        onChange={(key) => setParams(key ? { type: key } : {})}
      />
      {category === "cod" && (
        <button
          type="button"
          onClick={() => navigate("/app/seller-cod-collections")}
          className="admin-card flex w-full items-center justify-between p-4 text-left"
        >
          <div>
            <strong>Review COD collections</strong>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              See automatically verified customer cash and track how much
              remains to be recovered.
            </p>
          </div>
          <MdArrowForward aria-hidden="true" />
        </button>
      )}
      <DataTable
        columns={columns}
        data={pagedRows}
        loading={loading}
        totalCount={sortedRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        pageSizeOptions={[10, 20, 50, 100]}
        sortKey="amount"
        sortDir={sortDir}
        onSort={(key, direction) => {
          if (key === "amount") {
            setSortDir(direction);
            setPage(1);
          }
        }}
        filterBar={
          <div className="flex flex-wrap items-end gap-4 border-b border-[var(--admin-line)] bg-[var(--admin-card)] px-4 py-3">
            <div className="w-full max-w-xs">
              <label className="admin-label mb-1 block">Status</label>
              <FilterSelect
                options={statusOptions}
                value={
                  statusOptions.find(
                    (option) => option.value === statusFilter,
                  ) || statusOptions[0]
                }
                onChange={(option) => setStatusFilter(option?.value || "")}
                isSearchable={false}
                isClearable={false}
              />
            </div>
          </div>
        }
        onRefresh={load}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search adjustment, order, amount, status, or date..."
        rowKey={(row) =>
          `${row.adjustmentType}-${row.id || row.orderId || row.shipment_id}`
        }
        emptyText={
          category === "returns"
            ? "No return or refund adjustments found for the selected filters."
            : category === "promotions"
              ? "No promotion adjustments found for the selected filters."
              : category === "cod"
                ? "No COD adjustments found for the selected filters."
                : category === "holds"
                  ? "No temporary holds found for the selected filters."
                  : category === "recoveries"
                    ? "No recoveries found for the selected filters."
                    : category === "other"
                      ? "No other adjustments found for the selected filters."
                      : "No adjustments found for the selected filters."
        }
      />
      <DefaultModal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title || "Adjustment details"}
        isButtonView={false}
      >
        {detail && (
          <div className="space-y-5">
            <FormSection
              title="Adjustment details"
              subtitle="Summary of this change to your earnings."
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-[var(--admin-muted)]">
                    {detail.adjustmentType === "cod"
                      ? "COD amount owed"
                      : detail.adjustmentType === "holds"
                        ? "Earning affected"
                        : "Amount"}
                  </span>
                  <strong
                    className={`text-xl ${Number(detail.amount) > 0 ? "text-emerald-700" : Number(detail.amount) < 0 ? "text-red-700" : "text-[var(--admin-ink)]"}`}
                  >
                    {detail.adjustmentType === "cod"
                      ? financeMoney(Math.abs(Number(detail.amount || 0)), detail.currency)
                      : detail.adjustmentType === "holds"
                        ? financeMoney(detail.amount, detail.currency)
                        : signedFinanceMoney(detail.amount, detail.currency)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[var(--admin-line)] pt-3 text-sm">
                  <span className="text-[var(--admin-muted)]">Category</span>
                  <span className="font-medium capitalize text-[var(--admin-ink)]">
                    {CATEGORIES.find(
                      (item) => item.value === detail.adjustmentType,
                    )?.label || "Other"}
                  </span>
                </div>
                {(detail.orderNumber ||
                  detail.order_number ||
                  detail.orderId ||
                  detail.order_id) && (
                  <div className="flex items-center justify-between gap-4 border-t border-[var(--admin-line)] pt-3 text-sm">
                    <span className="text-[var(--admin-muted)]">Order</span>
                    <OrderLink
                      orderId={detail.orderId || detail.order_id}
                      orderNumber={detail.orderNumber || detail.order_number}
                    />
                  </div>
                )}
                <p className="border-t border-[var(--admin-line)] pt-3 text-sm leading-6 text-[var(--admin-muted)]">
                  {detail.description}
                </p>
              </div>
            </FormSection>
            {detail.adjustmentType === "promotions" && (
              <FormSection
                title="Funding breakdown"
                subtitle="How this promotion was funded."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Customer Discount</span>
                    <span>
                      {financeMoney(
                        detail.customerDiscountAmount,
                        detail.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marketplace Funded</span>
                    <span>
                      {financeMoney(
                        detail.marketplaceContributionAmount,
                        detail.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seller Funded</span>
                    <span>
                      {financeMoney(
                        detail.sellerFundedDiscountAmount,
                        detail.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Partner Funded</span>
                    <span>
                      {financeMoney(
                        detail.paymentPartnerContributionAmount,
                        detail.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reversed</span>
                    <span>
                      {financeMoney(detail.reversalAmount, detail.currency)}
                    </span>
                  </div>
                </div>
              </FormSection>
            )}
            {detail.adjustmentType === "cod" && (
              <FormSection
                title="COD recovery breakdown"
                subtitle="How customer cash held by you affects your payouts."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--admin-muted)]">
                      COD cash collected
                    </span>
                    <strong>
                      {financeMoney(
                        detail.expected_amount ?? detail.collected_amount,
                        detail.currency,
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[var(--admin-line)] pt-3">
                    <span className="text-[var(--admin-muted)]">
                      Recovered from earnings
                    </span>
                    <strong className="text-emerald-700">
                      {financeMoney(detail.recovered_amount, detail.currency)}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[var(--admin-line)] pt-3">
                    <span className="text-[var(--admin-muted)]">
                      Still owed
                    </span>
                    <strong className="text-red-700">
                      {financeMoney(
                        detail.remaining_amount ??
                          detail.expected_amount ??
                          detail.collected_amount,
                        detail.currency,
                      )}
                    </strong>
                  </div>
                  <div className="border-t border-[var(--admin-line)] pt-3">
                    <span className="block text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
                      Next step
                    </span>
                    <p className="mt-1 leading-6 text-[var(--admin-ink)]">
                      {detail.nextStep}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-btn-secondary w-full justify-center"
                    onClick={() => {
                      setDetail(null);
                      navigate("/app/seller-cod-collections");
                    }}
                  >
                    Review COD collections
                    <MdArrowForward aria-hidden="true" />
                  </button>
                </div>
              </FormSection>
            )}
          </div>
        )}
      </DefaultModal>
    </div>
  );
}
