import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  MdAccountBalance,
  MdLocalOffer,
  MdPayments,
  MdStorefront,
  MdUndo,
} from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import SummaryCard from "../../../components/Shared/SummaryCard";
import DataTable from "../../../components/Shared/DataTable";
import {OrderLink} from "../../../components/Shared/EntityLink";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { isSellerPanel } from "../../../_helpers/panelConfig";
import {
  getMyPromotionFundingLedger,
  getPromotionFundingLedger,
} from "../../../Redux/sellerCommissionsSlice";

const money = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    Number(value || 0),
  );

const statusClass = {
  reserved: "bg-gray-100 text-gray-700",
  earned: "bg-blue-100 text-blue-700",
  settled: "bg-green-100 text-green-700",
  reversed: "bg-red-100 text-red-700",
};

const FUNDING_OPTIONS = [
  { value: "marketplace", label: "Marketplace" },
  { value: "seller", label: "Seller" },
  { value: "shared", label: "Shared" },
  { value: "payment_partner", label: "Payment partner" },
];

const PromotionFundingLedger = () => {
  const dispatch = useDispatch();
  const sellerMode = isSellerPanel();
  const state = useSelector(
    (store) => store.sellerCommissions?.promotionLedgerData,
  );
  const payload = state?.data?.data || state?.data || {};
  const rows = Array.isArray(payload?.items) ? payload.items : [];
  const totals = payload?.totals || {};
  const [filters, setFilters] = useState({
    search: "",
    fundingType: "",
    limit: 50,
    offset: 0,
  });
  const [loading, setLoading] = useState(false);
  const columns = useMemo(
    () => [
      {
        key: "orderId",
        label: "Order / Item",
        render: (value, row) => {
          const orderId = row?.orderId || row?.order_id;
          const orderDisplay = row?.orderNumber || value || "—";

          return (
            <div className="flex flex-col">
              {/* Order Link / Number */}
              <OrderLink orderId={orderId} orderNumber={row?.orderNumber || row?.order_number}>
                {orderDisplay}
              </OrderLink>

              {/* Product Details */}
              <div className="mt-1 font-medium text-gray-900">
                {row?.productTitle || "Order item"}
              </div>
              <div className="text-xs text-gray-500">
                {row?.productSku || "No SKU"} · Qty {row?.quantity ?? 0}
              </div>
            </div>
          );
        },
      },
      ...(!sellerMode
        ? [
            {
              key: "sellerId",
              label: "Seller",
              cellClassName: "font-mono text-xs",
            },
          ]
        : []),
      {
        key: "fundingType",
        label: "Funding",
        cellClassName: "capitalize",
        render: (value) => String(value || "").replace(/_/g, " "),
      },
      {
        key: "customerDiscountAmount",
        label: "Customer Discount",
        headerClassName: "text-right",
        cellClassName: "text-right",
        render: (value, row) => money(value, row.currency),
      },
      {
        key: "sellerFundedDiscountAmount",
        label: "Seller-funded",
        headerClassName: "text-right",
        cellClassName: "text-right text-amber-700",
        render: (value, row) => money(value, row.currency),
      },
      {
        key: "marketplaceContributionAmount",
        label: "Platform / Partner",
        headerClassName: "text-right",
        cellClassName: "text-right text-blue-700",
        render: (value, row) =>
          money(
            Number(value || 0) +
              Number(row.paymentPartnerContributionAmount || 0),
            row.currency,
          ),
      },
      {
        key: "reversalAmount",
        label: "Reversed",
        headerClassName: "text-right",
        cellClassName: "text-right text-red-700",
        render: (value, row) => money(value, row.currency),
      },
      {
        key: "netPlatformContributionAmount",
        label: "Net Contribution",
        headerClassName: "text-right",
        cellClassName: "text-right font-semibold text-green-700",
        render: (value, row) => money(value, row.currency),
      },
      {
        key: "status",
        label: "Status",
        render: (value) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[value] || statusClass.reserved}`}
          >
            {value}
          </span>
        ),
      },
      {
        key: "payoutId",
        label: "Payout",
        cellClassName: "font-mono text-xs",
        render: (value) => value || "Not batched",
      },
    ],
    [sellerMode],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const action = sellerMode
        ? getMyPromotionFundingLedger
        : getPromotionFundingLedger;
      await dispatch(action(filters)).unwrap();
    } catch (error) {
      toast.error(error?.message || "Failed to load promotion funding ledger");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, sellerMode]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    [
      "Customer discounts",
      totals.customerDiscountAmount,
      "Total promotion shown to customers",
      MdLocalOffer,
    ],
    [
      "Marketplace contribution",
      totals.marketplaceContributionAmount,
      "Platform-funded seller invoice payment",
      MdStorefront,
    ],
    [
      "Payment partner contribution",
      totals.paymentPartnerContributionAmount,
      "Bank/payment-partner-funded payment",
      MdAccountBalance,
    ],
    [
      "Contribution reversals",
      totals.reversalAmount,
      "Reversed for refunded items",
      MdUndo,
    ],
    [
      "Net contribution",
      totals.netPlatformContributionAmount,
      "Still payable or already settled",
      MdPayments,
    ],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Promotion Funding Ledger"
        subtitle="Item-level proof of who funded each discount and how it reached the seller invoice."
        breadcrumbs={[
          {
            label: sellerMode
              ? "My Finance & Payouts"
              : "Seller Finance & Payouts",
          },
          { label: "Promotion Funding Ledger" },
        ]}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        A marketplace contribution is not extra commission. Example: for a
        ₹1,000 seller invoice with a ₹500 marketplace promotion, customer
        payment ₹500 + marketplace contribution ₹500 = seller invoice ₹1,000.
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, hint, Icon]) => (
          <SummaryCard
            key={label}
            title={label}
            value={money(value)}
            description={hint}
            icon={<Icon size={18} />}
          />
        ))}
      </section>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        totalCount={rows.length}
        page={
          Math.floor(
            Number(filters.offset || 0) / Number(filters.limit || 50),
          ) + 1
        }
        pageSize={Number(filters.limit || 50)}
        rowKey="id"
        emptyText="No funded discounts found."
        onRefresh={load}
        filterBar={
          <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_240px]">
            <input
              className="admin-input"
              placeholder="Search order, product, or SKU"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                  offset: 0,
                }))
              }
            />

            <FilterSelect
              options={FUNDING_OPTIONS}
              value={
                FUNDING_OPTIONS.find(
                  (opt) => opt.value === filters.fundingType,
                ) || null
              }
              onChange={(opt) =>
                setFilters((current) => ({
                  ...current,
                  fundingType: opt ? opt.value : "",
                  offset: 0,
                }))
              }
              placeholder="All funding sources"
              isSearchable={false}
              isClearable={true}
              className="!mb-0 w-full"
            />
          </div>
        }
      />
    </div>
  );
};

export default PromotionFundingLedger;
