import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MdAccountBalanceWallet,
  MdCheckCircle,
  MdHourglassEmpty,
  MdPauseCircle,
  MdPayments,
  MdVisibility,
  MdWarningAmber,
} from "react-icons/md";
import Cards from "../../../components/Cards/Cards";
import Loader from "../../../components/Loader/Loader";

import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { OrderLink } from "../../../components/Shared/EntityLink";

import { getSellerCommissions } from "../../../Redux/sellerCommissionsSlice";

import {
  CalculationRows,
  FinanceDateRangeFilter,
  // FinanceNav,
  FinanceStatusBadge,
  financeDateTime,
  financeList,
  financeMoney,
  financeValue,
  sellerFinanceStatus,
  unwrapFinance,
  useFinanceDateRange,
} from "./financeUi";

export default function FinanceEarnings() {
  const dispatch = useDispatch();

  const state = useSelector(
    (store) => store.sellerCommissions?.myCommissionsData || {},
  );

  const rows = financeList(state);
  const codReconciliation = unwrapFinance(state).codReconciliation || {};

  const [params, setParams] = useSearchParams();

  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

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
        }),
      ).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Unable to load earnings");
    }
  }, [dateFilters, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = params.get("earning");

    if (id && rows.length) {
      setDetail(
        rows.find((row) => String(row.id || row.commissionId) === id) || null,
      );
    }
  }, [params, rows]);

  /*
   * FILTERED ROWS
   */
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      const mapped = sellerFinanceStatus(row).key;

      const statusMatch = !status || mapped === status;

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

      return statusMatch && searchMatch;
    });
  }, [rows, search, status]);

  const sortedFiltered = useMemo(() => {
    if (!["orderAmount", "net"].includes(sortKey)) return filtered;
    const getAmount = (row) => {
      if (sortKey === "net") {
        return Number(financeValue(row, "net_amount", "netAmount") || 0);
      }
      const amountKey = [
        "order_amount",
        "orderAmount",
        "amount",
        "gross_amount",
        "grossAmount",
        "item_amount",
        "itemAmount",
        "total_amount",
        "totalAmount",
      ].find(
        (key) => row[key] !== undefined && row[key] !== null && row[key] !== "",
      );
      return Number((amountKey ? row[amountKey] : 0) || 0);
    };
    return [...filtered].sort((left, right) => {
      const difference = getAmount(left) - getAmount(right);
      return sortDir === "desc" ? -difference : difference;
    });
  }, [filtered, sortDir, sortKey]);

  const pagedFiltered = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, page, pageSize]);

  const statusOptions = useMemo(() => {
    const availableStatuses = new Map();
    rows.forEach((row) => {
      const mapped = sellerFinanceStatus(row);
      availableStatuses.set(mapped.key, mapped.label);
    });
    return [
      { value: "", label: "All statuses" },
      ...Array.from(availableStatuses, ([value, label]) => ({
        value,
        label,
      })).sort((left, right) => left.label.localeCompare(right.label)),
    ];
  }, [rows]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  /*
   * FILTERED SUMMARY
   */
  const filteredSummary = useMemo(() => {
    return filtered.reduce(
      (result, row) => {
        const key = sellerFinanceStatus(row).key;

        const amount = Number(
          financeValue(row, "net_amount", "netAmount") || 0,
        );

        result.total += amount;

        result[key] = {
          count: (result[key]?.count || 0) + 1,
          amount: (result[key]?.amount || 0) + amount,
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
      },
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
            orderId={row.orderId || row.order_id}
            orderNumber={row.orderNumber || row.order_number}
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
                row.metadata?.productTitle ||
                "Order earning"}
            </strong>

            <span className="text-xs text-[var(--admin-muted)]">
              Qty : {row.quantity || 1}
            </span>
          </div>
        ),
      },

      {
        key: "orderAmount",
        label: "Order amount",
        sortable: true,
        render: (_, row) => {
          const amountKey = [
            "order_amount",
            "orderAmount",
            "amount",
            "gross_amount",
            "grossAmount",
            "item_amount",
            "itemAmount",
            "total_amount",
            "totalAmount",
          ].find(
            (key) =>
              row[key] !== undefined && row[key] !== null && row[key] !== "",
          );
          const amount = amountKey ? row[amountKey] : undefined;

          return amount !== undefined && amount !== null ? (
            <span>{financeMoney(amount, row.currency)}</span>
          ) : (
            <span className="text-[var(--admin-muted)]">—</span>
          );
        },
      },

      {
        key: "net",
        label: "Your earning",
        sortable: true,
        render: (_, row) => (
          <strong>
            {financeMoney(
              financeValue(row, "net_amount", "netAmount"),
              row.currency,
            )}
          </strong>
        ),
      },

      {
        key: "status",
        label: "Status",
        render: (_, row) => <FinanceStatusBadge row={row} />,
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
                  row.return_window_ends_at,
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
                const next = new URLSearchParams(previous);

                next.set("earning", String(row.id || row.commissionId));

                return next;
              });
            }}
          >
            <MdVisibility aria-hidden="true" />
            View details
          </button>
        ),
      },
    ],
    [setParams],
  );

  return (
    <div className="space-y-5">
      <Loader loading={Boolean(state.loading)} />
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
          </div>
        }
      />

      {/* <FinanceNav /> */}

      {Number(codReconciliation.totalOrders || 0) > 0 && (
        <section>
          <div className="rounded-xl border border-[#EADDBF] bg-[#FFFCF5] px-5 py-4">
            <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[1.8fr_2.2fr]">
              {/* Heading & Description */}
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--admin-text)]">
                  COD order reconciliation
                </h2>

                <p className="mt-1.5 max-w-xl text-xs leading-5 text-[var(--admin-muted)]">
                  COD orders and earnings are different records. Earnings are
                  created after delivery, while collected cash is tracked
                  separately as a COD liability.
                </p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-y-4 lg:grid-cols-4">
                {/* COD Orders */}
                <div className="text-center lg:border-l lg:border-[#EADDBF] lg:px-3">
                  <p className="text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                    {codReconciliation.totalOrders || 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    COD orders
                  </p>
                </div>

                {/* Delivered */}
                <div className="text-center lg:border-l lg:border-[#EADDBF] lg:px-3">
                  <p className="text-2xl font-semibold tabular-nums text-[var(--admin-success)]">
                    {codReconciliation.deliveredOrders || 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Delivered
                  </p>
                </div>

                {/* Awaiting Delivery */}
                <div className="text-center lg:border-l lg:border-[#EADDBF] lg:px-3">
                  <p className="text-2xl font-semibold tabular-nums text-[var(--admin-text)]">
                    {codReconciliation.awaitingDeliveryOrders || 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Awaiting delivery
                  </p>
                </div>

                {/* Cash Liabilities */}
                <div className="text-center lg:border-l lg:border-[#EADDBF] lg:px-3">
                  <p className="text-2xl font-semibold tabular-nums text-[var(--admin-gold-dark)]">
                    {codReconciliation.ordersWithLiability || 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Cash liabilities
                  </p>
                </div>
              </div>
            </div>
          </div>

          {Number(codReconciliation.missingEarningOrders || 0) > 0 && (
            <div className="mt-4 flex items-start gap-2 border-t border-amber-200 pt-3 text-xs text-amber-800">
              <MdWarningAmber className="mt-0.5 shrink-0" size={15} />
              <p className="leading-relaxed">
                <strong>
                  {codReconciliation.missingEarningOrders} delivered COD
                  order(s)
                </strong>{" "}
                still need an earning calculation. Refresh to retry; if this
                remains, an administrator should review the order pricing data.
              </p>
            </div>
          )}
        </section>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Cards
          label="Total earnings"
          value={financeMoney(filteredSummary.total, rows[0]?.currency)}
          helper={`${filtered.length} earning${filtered.length !== 1 ? "s" : ""}`}
          icon={<MdAccountBalanceWallet aria-hidden="true" size={18} />}
          iconBg="#e3d4ff"
          iconColor="#8d5cf6"
          onClick={() => {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.delete("status");
              return next;
            });
          }}
        />

        <Cards
          label="Waiting"
          value={financeMoney(
            filteredSummary.waiting.amount,
            rows[0]?.currency,
          )}
          helper={`${filteredSummary.waiting.count} order${filteredSummary.waiting.count !== 1 ? "s" : ""}`}
          icon={<MdHourglassEmpty aria-hidden="true" size={18} />}
          iconBg="#ffe5b5"
          iconColor="#f5a300"
          onClick={() => {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("status", "waiting");
              return next;
            });
          }}
        />

        <Cards
          label="Available"
          value={financeMoney(
            filteredSummary.available.amount,
            rows[0]?.currency,
          )}
          helper={`${filteredSummary.available.count} earning${filteredSummary.available.count !== 1 ? "s" : ""}`}
          icon={<MdCheckCircle aria-hidden="true" size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("status", "available");
              return next;
            });
          }}
        />

        <Cards
          label="On hold"
          value={financeMoney(filteredSummary.held.amount, rows[0]?.currency)}
          helper={`${filteredSummary.held.count} earning${filteredSummary.held.count !== 1 ? "s" : ""}`}
          icon={<MdPauseCircle aria-hidden="true" size={18} />}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
          onClick={() => {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("status", "held");
              return next;
            });
          }}
        />

        <Cards
          label="Paid"
          value={financeMoney(filteredSummary.paid.amount, rows[0]?.currency)}
          helper={`${filteredSummary.paid.count} earning${filteredSummary.paid.count !== 1 ? "s" : ""}`}
          icon={<MdPayments aria-hidden="true" size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("status", "paid");
              return next;
            });
          }}
        />
      </div>

      {/* SEARCH, FILTERS + TABLE */}
      <DataTable
        columns={columns}
        data={pagedFiltered}
        loading={Boolean(state.loading)}
        totalCount={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onRefresh={load}
        pageSizeOptions={[10, 20, 50, 100]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key, direction) => {
          setSortKey(key);
          setSortDir(direction);
          setPage(1);
        }}
        filterBar={
          <div className="flex flex-wrap items-end gap-4 border-b border-[var(--admin-line)] bg-[var(--admin-card)] px-4 py-3">
            <div className="w-full max-w-xs">
              <label className="admin-label mb-1 block">Status</label>
              <FilterSelect
                options={statusOptions}
                value={
                  statusOptions.find((option) => option.value === status) ||
                  statusOptions[0]
                }
                onChange={(option) => {
                  setParams((previous) => {
                    const next = new URLSearchParams(previous);
                    if (option?.value) next.set("status", option.value);
                    else next.delete("status");
                    return next;
                  });
                  setPage(1);
                }}
                isSearchable={false}
                isClearable={false}
              />
            </div>
          </div>
        }
        rowKey={(row) => row.id || row.commissionId}
        searchPlaceholder="Search order or product"
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        emptyText={
          status === "waiting"
            ? "Nothing is waiting. All eligible earnings have moved out of the waiting period."
            : Number(codReconciliation.awaitingDeliveryOrders || 0) > 0
              ? `${codReconciliation.awaitingDeliveryOrders} COD order(s) are not delivered yet, so no earning exists for them.`
              : "No earnings found for the selected filters."
        }
      />

      {/* DETAILS MODAL */}
      <DefaultModal
        isOpen={Boolean(detail)}
        onClose={() => {
          setDetail(null);

          setParams((previous) => {
            const next = new URLSearchParams(previous);

            next.delete("earning");

            return next;
          });
        }}
        title={`Order #${
          detail?.orderNumber ||
          String(detail?.orderId || detail?.order_id || "").slice(0, 12)
        }`}
        isButtonView={false}
      >
        {detail && (
          <div className="space-y-5 border border-golden/45 p-4 rounded-lg">
            {/* EARNING SUMMARY */}
            {/* EARNING SUMMARY */}
            <div className="rounded-lg border border-[var(--admin-line)] bg-[#FFFCF7] p-4">
              <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-[1fr_1fr_auto]">
                {/* PRODUCT */}
                <div className="min-w-0">
                  <span className="text-xs text-[var(--admin-muted)]">
                    Product
                  </span>

                  <p className="mt-1 truncate text-sm font-medium text-[var(--admin-ink)]">
                    {detail.productTitle ||
                      detail.productName ||
                      detail.metadata?.productTitle ||
                      "Order earning"}
                  </p>
                </div>

                {/* YOUR EARNING */}
                <div>
                  <span className="text-xs text-[var(--admin-muted)]">
                    Your earning
                  </span>

                  <strong className="mt-1 block text-base font-bold text-emerald-700">
                    {financeMoney(
                      financeValue(detail, "net_amount", "netAmount"),
                      detail.currency,
                    )}
                  </strong>
                </div>

                {/* QUANTITY */}
                <div className="text-right">
                  <span className="text-xs text-[var(--admin-muted)]">
                    Quantity
                  </span>

                  <strong className="mt-1 block text-base font-medium text-[var(--admin-ink)]">
                    {detail.quantity || 1}
                  </strong>
                </div>
              </div>
            </div>

            {/* AVAILABILITY INFORMATION */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-golden/45 p-3">
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
                      detail.return_window_ends_at,
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-golden/45 p-3">
                <span className="text-xs text-[var(--admin-muted)]">
                  Status
                </span>

                <div className="mt-2">
                  <FinanceStatusBadge row={detail} />
                </div>
              </div>
            </div>

            {/* CALCULATION */}
            <div>
              <h3 className="mb-3 font-semibold">
                How your earning was calculated
              </h3>

              <CalculationRows row={detail} />
            </div>
          </div>
        )}
      </DefaultModal>
    </div>
  );
}
