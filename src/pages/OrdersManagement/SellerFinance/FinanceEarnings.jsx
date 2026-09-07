import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MdRefresh,
  MdTrendingUp,
  MdVisibility,
} from "react-icons/md";

import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { OrderLink } from "../../../components/Shared/EntityLink";

import {
  getSellerCommissions,
} from "../../../Redux/sellerCommissionsSlice";

import {
  CalculationRows,
  FinanceDateRangeFilter,
  FinanceChoiceFilters,
  FinanceNav,
  FinancePageGuide,
  FinanceStatusBadge,
  financeDateTime,
  financeList,
  financeMoney,
  financeValue,
  sellerFinanceStatus,
  useFinanceDateRange,
} from "./financeUi";

const FILTERS = [
  ["", "All"],
  ["waiting", "Waiting"],
  ["available", "Available"],
  ["held", "On hold"],
  ["paid", "Paid"],
];

const getRowDate = (row) => {
  return (
    row.processedAt ||
    row.processed_at ||
    row.eligibleAt ||
    row.eligible_at ||
    row.returnWindowEndsAt ||
    row.return_window_ends_at ||
    row.createdAt ||
    row.created_at
  );
};

export default function FinanceEarnings() {
  const dispatch = useDispatch();

  const state = useSelector(
    (store) =>
      store.sellerCommissions?.myCommissionsData || {}
  );

  const rows = financeList(state);

  const [params, setParams] = useSearchParams();

  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");

  const dateRange = useFinanceDateRange();
  const { dateFilters } = dateRange;

  const status = params.get("status") || "";

  const load = useCallback(async () => {
    try {
      await dispatch(
        getSellerCommissions({
          fromDate: dateFilters.fromDate,
          toDate: dateFilters.toDate,
          limit: 100,
          offset: 0,
        })
      ).unwrap();
    } catch (error) {
      toast.error(
        error?.message ||
          error ||
          "Unable to load earnings"
      );
    }
  }, [dateFilters, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = params.get("earning");

    if (id && rows.length) {
      setDetail(
        rows.find(
          (row) =>
            String(
              row.id || row.commissionId
            ) === id
        ) || null
      );
    }
  }, [params, rows]);

  /*
   * FILTERED ROWS
   */
  const filtered = useMemo(() => {
    const needle = search
      .trim()
      .toLowerCase();

    return rows.filter((row) => {
      const mapped =
        sellerFinanceStatus(row).key;

      const statusMatch =
        !status || mapped === status;

      const searchMatch =
        !needle ||
        [
          row.orderNumber,
          row.order_number,
          row.orderId,
          row.order_id,
          row.productTitle,
          row.productName,
          row.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return (
        statusMatch &&
        searchMatch
      );
    });
  }, [
    rows,
    search,
    status,
  ]);

  /*
   * STATUS SUMMARY
   */
  const statusSummary = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        const key =
          sellerFinanceStatus(row).key;

        const amount = Number(
          financeValue(
            row,
            "net_amount",
            "netAmount"
          ) || 0
        );

        result[key] = {
          count:
            (result[key]?.count || 0) + 1,
          amount:
            (result[key]?.amount || 0) +
            amount,
        };

        result.all = {
          count:
            (result.all?.count || 0) + 1,
          amount:
            (result.all?.amount || 0) +
            amount,
        };

        return result;
      },
      {
        all: {
          count: 0,
          amount: 0,
        },
      }
    );
  }, [rows]);

  /*
   * FILTERED SUMMARY
   */
  const filteredSummary = useMemo(() => {
    return filtered.reduce(
      (result, row) => {
        const key =
          sellerFinanceStatus(row).key;

        const amount = Number(
          financeValue(
            row,
            "net_amount",
            "netAmount"
          ) || 0
        );

        result.total += amount;

        result[key] = {
          count:
            (result[key]?.count || 0) + 1,
          amount:
            (result[key]?.amount || 0) +
            amount,
        };

        return result;
      },
      {
        total: 0,
        waiting: {
          count: 0,
          amount: 0,
        },
        available: {
          count: 0,
          amount: 0,
        },
        held: {
          count: 0,
          amount: 0,
        },
        paid: {
          count: 0,
          amount: 0,
        },
      }
    );
  }, [filtered]);

  /*
   * TABLE COLUMNS
   */
  const columns = useMemo(
    () => [
      {
        key: "order",
        label: "Order",
        render: (_, row) => (
          <OrderLink
            orderId={
              row.orderId ||
              row.order_id
            }
            orderNumber={
              row.orderNumber ||
              row.order_number
            }
          />
        ),
      },

      {
        key: "product",
        label: "Product",
        render: (_, row) => (
          <div>
            <strong className="block max-w-[260px] truncate">
              {row.productTitle ||
                row.productName ||
                row.metadata
                  ?.productTitle ||
                "Order earning"}
            </strong>

            <span className="text-xs text-[var(--admin-muted)]">
              Qty {row.quantity || 1}
            </span>
          </div>
        ),
      },

      {
        key: "orderAmount",
        label: "Order amount",
        render: (_, row) => {
          const amount = financeValue(
            row,
            "order_amount",
            "orderAmount",
            "gross_amount",
            "grossAmount",
            "item_amount",
            "itemAmount"
          );

          return amount !== undefined &&
            amount !== null ? (
            <span>
              {financeMoney(
                amount,
                row.currency
              )}
            </span>
          ) : (
            <span className="text-[var(--admin-muted)]">
              —
            </span>
          );
        },
      },

      {
        key: "net",
        label: "Your earning",
        render: (_, row) => (
          <strong>
            {financeMoney(
              financeValue(
                row,
                "net_amount",
                "netAmount"
              ),
              row.currency
            )}
          </strong>
        ),
      },

      {
        key: "status",
        label: "Status",
        render: (_, row) => (
          <FinanceStatusBadge row={row} />
        ),
      },

      {
        key: "date",
        label: "Available / paid on",
        render: (_, row) => (
          <div className="text-xs">
            <span>
              {financeDateTime(
                row.processedAt ||
                  row.processed_at ||
                  row.eligibleAt ||
                  row.eligible_at ||
                  row.returnWindowEndsAt ||
                  row.return_window_ends_at
              )}
            </span>

            <span className="mt-1 block text-[var(--admin-muted)]">
              {sellerFinanceStatus(row).detail}
            </span>
          </div>
        ),
      },

      {
        key: "action",
        label: "Action",
        render: (_, row) => (
          <button
            type="button"
            className="admin-btn-secondary !px-2 !py-1"
            onClick={() => {
              setDetail(row);

              setParams((previous) => {
                const next =
                  new URLSearchParams(
                    previous
                  );

                next.set(
                  "earning",
                  String(
                    row.id ||
                      row.commissionId
                  )
                );

                return next;
              });
            }}
          >
            <MdVisibility />
            View details
          </button>
        ),
      },
    ],
    [setParams]
  );

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <PageHeader
        title="Earnings"
        subtitle="See what you earned from every order and when it becomes payable."
        breadcrumbs={[
          {
            label: "My Finance & Payouts",
          },
          {
            label: "Earnings",
          },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FinanceDateRangeFilter
              dateRange={dateRange}
              loading={Boolean(state.loading)}
            />

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={load}
              disabled={Boolean(state.loading)}
            >
              <MdRefresh />
              Refresh
            </button>
          </div>
        }
      />

      <FinanceNav />

      {/* PAGE GUIDE */}
      <FinancePageGuide
        step="2"
        icon={MdTrendingUp}
        title="Understand every order earning"
        description="Each row explains the amount earned from an order and when that money becomes available or gets paid."
        points={[
          "Use status and date filters to find money",
          "View details for the full calculation",
        ]}
      />

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
            Total earnings
          </p>

          <h3 className="mt-2 text-xl font-bold text-[var(--admin-ink)]">
            {financeMoney(
              filteredSummary.total,
              rows[0]?.currency
            )}
          </h3>

          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {filtered.length} earning
            {filtered.length !== 1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
            Waiting
          </p>

          <h3 className="mt-2 text-xl font-bold text-[var(--admin-ink)]">
            {financeMoney(
              filteredSummary.waiting.amount,
              rows[0]?.currency
            )}
          </h3>

          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {filteredSummary.waiting.count}{" "}
            order
            {filteredSummary.waiting.count !==
            1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
            Available
          </p>

          <h3 className="mt-2 text-xl font-bold text-[var(--admin-ink)]">
            {financeMoney(
              filteredSummary.available.amount,
              rows[0]?.currency
            )}
          </h3>

          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {filteredSummary.available.count}{" "}
            earning
            {filteredSummary.available.count !==
            1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
            On hold
          </p>

          <h3 className="mt-2 text-xl font-bold text-[var(--admin-ink)]">
            {financeMoney(
              filteredSummary.held.amount,
              rows[0]?.currency
            )}
          </h3>

          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {filteredSummary.held.count}{" "}
            earning
            {filteredSummary.held.count !==
            1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
            Paid
          </p>

          <h3 className="mt-2 text-xl font-bold text-[var(--admin-ink)]">
            {financeMoney(
              filteredSummary.paid.amount,
              rows[0]?.currency
            )}
          </h3>

          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {filteredSummary.paid.count}{" "}
            earning
            {filteredSummary.paid.count !==
            1
              ? "s"
              : ""}
          </p>
        </div>
      </div>

      {/* STATUS FILTERS */}
      <FinanceChoiceFilters
        label="Filter earnings"
        value={status}
        onChange={(key) =>
          setParams((previous) => {
            const next =
              new URLSearchParams(
                previous
              );

            if (key) {
              next.set("status", key);
            } else {
              next.delete("status");
            }

            return next;
          })
        }
        options={FILTERS.map(
          ([key, label]) => {
            const summary =
              key === ""
                ? statusSummary.all
                : statusSummary[key] || {
                    count: 0,
                    amount: 0,
                  };

            return [
              key,
              label,
              summary.count,
              financeMoney(
                summary.amount,
                rows[0]?.currency
              ),
            ];
          }
        )}
      />

      {/* SEARCH + TABLE */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={Boolean(state.loading)}
        totalCount={filtered.length}
        pageSize={20}
        rowKey={(row) =>
          row.id || row.commissionId
        }
        searchPlaceholder="Search order or product"
        onSearch={setSearch}
        emptyText={
          status === "waiting"
            ? "Nothing is waiting. All eligible earnings have moved out of the waiting period."
            : "No earnings found for the selected filters."
        }
      />

      {/* DETAILS MODAL */}
      <DefaultModal
        isOpen={Boolean(detail)}
        onClose={() => {
          setDetail(null);

          setParams((previous) => {
            const next =
              new URLSearchParams(
                previous
              );

            next.delete("earning");

            return next;
          });
        }}
        title={`Order #${
          detail?.orderNumber ||
          String(
            detail?.orderId ||
              detail?.order_id ||
              ""
          ).slice(0, 12)
        }`}
        isButtonView={false}
      >
        {detail && (
          <div className="space-y-5 p-2">
            {/* EARNING SUMMARY */}
            <div className="rounded-lg bg-[var(--admin-soft)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs text-[var(--admin-muted)]">
                    Product
                  </span>

                  <p className="mt-1 font-semibold">
                    {detail.productTitle ||
                      detail.productName ||
                      detail.metadata
                        ?.productTitle ||
                      "Order earning"}
                  </p>
                </div>

                <FinanceStatusBadge
                  row={detail}
                />
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="text-xs text-[var(--admin-muted)]">
                    Your earning
                  </span>

                  <strong className="mt-1 block text-2xl">
                    {financeMoney(
                      financeValue(
                        detail,
                        "net_amount",
                        "netAmount"
                      ),
                      detail.currency
                    )}
                  </strong>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[var(--admin-muted)]">
                    Quantity
                  </span>

                  <strong className="mt-1 block">
                    {detail.quantity || 1}
                  </strong>
                </div>
              </div>

              <p className="mt-3 text-xs text-[var(--admin-muted)]">
                {sellerFinanceStatus(
                  detail
                ).detail}
              </p>
            </div>

            {/* AVAILABILITY INFORMATION */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--admin-border)] p-3">
                <span className="text-xs text-[var(--admin-muted)]">
                  Available / Paid On
                </span>

                <p className="mt-1 text-sm font-semibold">
                  {financeDateTime(
                    detail.processedAt ||
                      detail.processed_at ||
                      detail.eligibleAt ||
                      detail.eligible_at ||
                      detail.returnWindowEndsAt ||
                      detail.return_window_ends_at
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--admin-border)] p-3">
                <span className="text-xs text-[var(--admin-muted)]">
                  Status
                </span>

                <div className="mt-2">
                  <FinanceStatusBadge
                    row={detail}
                  />
                </div>
              </div>
            </div>

            {/* CALCULATION */}
            <div>
              <h3 className="mb-3 font-semibold">
                How your earning was calculated
              </h3>

              <CalculationRows
                row={detail}
              />
            </div>
          </div>
        )}
      </DefaultModal>
    </div>
  );
}