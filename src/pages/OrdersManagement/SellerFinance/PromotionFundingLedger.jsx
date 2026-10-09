import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  MdAccountBalance,
  MdLocalOffer,
  MdPayments,
  MdRefresh,
  MdStorefront,
  MdUndo,
} from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import SummaryCard from "../../../components/Shared/SummaryCard";
import DataTable from "../../../components/Shared/DataTable";
import { OrderLink } from "../../../components/Shared/EntityLink";
import { FilterBar, SellerIdentity } from "../../../components/Shared";
import { isSellerPanel } from "../../../_helpers/panelConfig";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import {
  getMyPromotionFundingLedger,
  getPromotionFundingLedger,
} from "../../../Redux/sellerCommissionsSlice";

const money = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(Number(value || 0));

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

  const navigate = useNavigate();

  const state = useSelector(
    (store) => store.sellerCommissions?.promotionLedgerData,
  );

  const payload = state?.data?.data || state?.data || {};

  const rows = useMemo(
    () => (Array.isArray(payload?.items) ? payload.items : []),
    [payload?.items],
  );

  const totals = payload?.totals || {};

  const [filters, setFilters] = useState({
    search: "",
    fundingType: "",
    limit: 20,
    offset: 0,
  });

  const [loading, setLoading] = useState(false);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [storeMap, setStoreMap] = useState({});

  // Fetch seller dropdown options
  useEffect(() => {
    if (sellerMode) return;

    dropdownApi
      .getSellers({ limit: 100 })
      .then((data) => {
        setSellerOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, [sellerMode]);

  // Map seller IDs to seller names
  const sellerMap = useMemo(() => {
    const map = new Map();

    (sellerOptions || []).forEach((item) => {
      const label = item?.label;

      if (item?.value) {
        map.set(String(item.value), label);
      }

      if (item?.id) {
        map.set(String(item.id), label);
      }
    });

    return map;
  }, [sellerOptions]);

  // Fetch missing seller names
  useEffect(() => {
    if (sellerMode || !rows.length) return;

    const missingSellerIds = [
      ...new Set(
        rows
          .map((row) => row.sellerId || row.seller_id)
          .filter((id) => id && !sellerMap.has(String(id))),
      ),
    ];

    if (missingSellerIds.length === 0) return;

    Promise.all(
      missingSellerIds.map((id) =>
        dropdownApi.getSellers({ keyWord: id, limit: 10 }).catch(() => []),
      ),
    ).then((results) => {
      const newItems = results.flat().filter(Boolean);

      if (newItems.length) {
        setSellerOptions((prev) => {
          const existingIds = new Set(
            prev.map((item) => String(item.value || item.id)),
          );

          const uniqueNew = newItems.filter(
            (item) => !existingIds.has(String(item.value || item.id)),
          );

          return uniqueNew.length ? [...prev, ...uniqueNew] : prev;
        });
      }
    });
  }, [rows, sellerMode, sellerMap]);

  // Fetch store names using seller organizations
  useEffect(() => {
    if (sellerMode || !rows.length) return;

    const sellerIds = [
      ...new Set(
        rows
          .map((row) => row.sellerId || row.seller_id)
          .filter(Boolean)
          .map(String),
      ),
    ];

    if (!sellerIds.length) return;

    let cancelled = false;

    const fetchStoreNames = async () => {
      const results = await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const organizations =
              await dropdownApi.getSellerOrganizations(sellerId);

            return {
              sellerId,
              organizations,
            };
          } catch (error) {
            console.error(
              `Failed to fetch organizations for seller ${sellerId}:`,
              error,
            );

            return {
              sellerId,
              organizations: [],
            };
          }
        }),
      );

      if (cancelled) return;

      setStoreMap((prev) => {
        const updated = { ...prev };

        results.forEach(({ sellerId, organizations }) => {
          const storeNames = organizations
            .map((organization) => organization?.label)
            .filter(Boolean);

          if (storeNames.length) {
            updated[sellerId] = [...new Set(storeNames)].join(", ");
          }
        });

        return updated;
      });
    };

    fetchStoreNames();

    return () => {
      cancelled = true;
    };
  }, [rows, sellerMode]);

  // Table columns
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
              <OrderLink
                orderId={orderId}
                orderNumber={row?.orderNumber || row?.order_number}
              >
                {orderDisplay}
              </OrderLink>

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
              render: (value, row) => {
                const sellerId = value || row?.sellerId || row?.seller_id;

                const sellerName =
                  row?.sellerName ||
                  row?.seller?.name ||
                  row?.seller?.displayName ||
                  row?.seller?.businessName ||
                  (sellerId ? sellerMap.get(String(sellerId)) : null);

                const storeName = sellerId ? storeMap[String(sellerId)] : null;

                return (
                  <SellerIdentity
                    row={row}
                    sellerId={sellerId}
                    storeName={storeName}
                    loginName={sellerName}
                  />
                );
              },
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
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              statusClass[value] || statusClass.reserved
            }`}
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
    [sellerMode, sellerMap, storeMap],
  );

  // Load promotion funding ledger
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

  // Summary cards
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
          {
            label: "Promotion Funding Ledger",
          },
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
            icon={<Icon aria-hidden="true" size={18} />}
          />
        ))}
      </section>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        totalCount={payload?.totalCount || payload?.total || payload?.count || rows.length}
        page={
          Math.floor(
            Number(filters.offset || 0) / Number(filters.limit || 50),
          ) + 1
        }
        pageSize={Number(filters.limit || 50)}
        onPageChange={(page) =>
          setFilters((current) => ({
            ...current,
            offset: (page - 1) * Number(current.limit || 20),
          }))
        }
        onPageSizeChange={(limit) =>
          setFilters((current) => ({
            ...current,
            limit,
            offset: 0,
          }))
        }
        rowKey="id"
        emptyText="No funded discounts found."
        onRefresh={load}
        onSearch={(value) =>
          setFilters((current) => ({
            ...current,
            search: value,
            offset: 0,
          }))
        }
        searchPlaceholder="Search order, product, or SKU"
        filterBar={
          <FilterBar
            filters={[
              {
                key: "fundingType",
                label: "Funding Source",
                type: "select",
                options: FUNDING_OPTIONS,
                placeholder: "All Funding Sources",
                isSearchable: false,
                isClearable: true,
              },
            ]}
            values={{ fundingType: filters.fundingType }}
            onChange={(key, value) =>
              setFilters((current) => ({
                ...current,
                [key]: value,
                offset: 0,
              }))
            }
            loading={loading}
          />
        }
      />
    </div>
  );
};

export default PromotionFundingLedger;
