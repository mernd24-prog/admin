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
  FinanceStatusBadge,
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
      title: "COD Amount Collected",
      amount: -Math.abs(
        Number(row.collected_amount || row.expected_amount || 0),
      ),
      description:
        `You collected this amount directly from the customer. ${financeMoney(Math.abs(Number(balances.codLiabilityBalance || 0)), row.currency || "INR")} remains to be recovered. Once the COD balance is fully recovered, the remaining eligible earnings can be paid to you.`,
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
        title: "Temporary Hold",
        amount: Number(financeAmounts(row).sellerEarning ?? row.netAmount ?? row.net_amount ?? 0),
        description:
          "This earning is temporarily unavailable while a return, refund, dispute, or another hold is active.",
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
      }));
    return [...refunds, ...promotions, ...cod, ...recoveries, ...holds, ...other].filter(
      (row) => !category || row.adjustmentType === category,
    );
  }, [balances.codLiabilityBalance, category, codRows, payoutPayload.items, promotionPayload.items, wallet.items]);
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
        label: "Order",
        cellClassName: "align-top",
        render: (_, row) =>
          row.orderId || row.order_id ? (
            <OrderLink
              orderId={row.orderId || row.order_id}
              orderNumber={row.orderNumber || row.order_number}
            />
          ) : row.orderNumber || row.order_number ? (
            row.orderNumber || row.order_number
          ) : (
            row.adjustmentType === "recoveries"
              ? "Multiple orders"
              : "—"
          ),
      },
      {
        key: "amount",
        label: "Amount",
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
            {row.adjustmentType === "holds"
              ? financeMoney(value, row.currency)
              : signedFinanceMoney(value, row.currency)}
          </strong>
        ),
      },
      {
        key: "status",
        label: "Status",
        cellClassName: "align-top",
        render: (_, row) => <FinanceStatusBadge row={row} />,
      },
      {
        key: "created",
        label: "Date",
        cellClassName: "align-top",
        render: (_, row) =>
          formatDateTime12Hour(
            row.createdAt || row.created_at || row.updatedAt,
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
        subtitle="Understand why your earnings changed."
        breadcrumbs={[
          { label: "My Finance & Payouts" },
          { label: "Adjustments" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cards
          label="Returns & refunds"
          value={financeMoney(wallet.refundAdjustmentTotal || 0)}
          description="Earnings reversed because of returns or refunds."
          icon={<MdAssignmentReturn aria-hidden="true" size={18} />}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
          onClick={() => setParams({ type: "returns" })}
        />
        <Cards
          label="Promotion contribution"
          value={financeMoney(totals.netPlatformContributionAmount)}
          description="Marketplace contribution remaining after reversals."
          icon={<MdLocalOffer aria-hidden="true" size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => setParams({ type: "promotions" })}
        />
        <Cards
          label="COD amount owed"
          value={financeMoney(owed)}
          description={`${financeMoney(owed)} remains to be recovered from available or future earnings. After full recovery, eligible earnings can be paid out.`}
          icon={<MdAccountBalanceWallet aria-hidden="true" size={18} />}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
          onClick={() => setParams({ type: "cod" })}
        />
        <Cards
          label="Temporary holds"
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
            <strong>Submit or manage a COD collection</strong>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              Upload collection proof and send it for Admin verification.
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
                    Amount
                  </span>
                  <strong
                    className={`text-xl ${Number(detail.amount) > 0 ? "text-emerald-700" : Number(detail.amount) < 0 ? "text-red-700" : "text-[var(--admin-ink)]"}`}
                  >
                    {signedFinanceMoney(detail.amount, detail.currency)}
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
          </div>
        )}
      </DefaultModal>
    </div>
  );
}
