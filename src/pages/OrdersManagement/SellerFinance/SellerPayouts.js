import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdDownload, MdReceiptLong, MdVisibility } from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  getAdminSellerPayouts,
  getMySellerSettlements,
  getSellerPayouts,
} from "../../../Redux/sellerCommissionsSlice";
import { usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { downloadApiFile } from "../../../_helpers/downloadApi";
import { exportToCsv } from "../../../_helpers/exportToCsv";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";
import {
  FinanceMetricCard,
  FinanceNav,
  FinanceStatusBadge,
  financeDateTime,
  financeMoney,
  sellerFinanceStatus,
  shortReference,
} from "./financeUi";

const STATUSES = [
  "pending",
  "processing",
  "approved",
  "on_hold",
  "completed",
  "failed",
  "cancelled",
];
const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields: "full_name,email,businessName",
      }),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: STATUSES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data || payload?.data || {};
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data.items || data.list || [],
    total: Number(data.total || data.items?.length || data.list?.length || 0),
    summary: data.summary || {},
  };
};

const valueOf = (row, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "")
      return row[key];
  }
  return 0;
};
const fmt = (value) => formatDateTime12Hour(value, "—");
const money = (value, currency = "INR") =>
  `${currency} ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sellerName = (row = {}) =>
  row.sellerName ||
  row.seller?.displayName ||
  row.seller?.businessName ||
  row.seller?.email ||
  "Seller";
const jsonOf = (value) => {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};
const breakdownOf = (row = {}) =>
  jsonOf(row.metadata).financialBreakdown || jsonOf(row.metadata);
const signedMoney = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${money(numeric, currency)}`;
  if (numeric < 0) return `-${money(Math.abs(numeric), currency)}`;
  return money(0, currency);
};

const payoutExplanation = (row = {}) => {
  const metadata = jsonOf(row.metadata);
  const recovery = Number(metadata.recoveryAppliedAmount || 0);
  const remaining = (metadata.recoveryApplications || []).reduce(
    (sum, item) => sum + Number(item?.remainingAmount || 0),
    0,
  );
  const net = Number(valueOf(row, "net_amount", "netAmount") || 0);
  const method = String(valueOf(row, "payment_method", "paymentMethod") || "").toLowerCase();
  if (metadata.offsetOnly || method === "ledger_offset") {
    return {
      title: "No bank transfer",
      detail: `${money(recovery, row.currency)} of earnings adjusted against seller-collected COD${remaining > 0 ? `; ${money(remaining, row.currency)} still owed to platform` : ""}.`,
      tone: "amber",
    };
  }
  if (recovery > 0) {
    return {
      title: `${money(net, row.currency)} payable after adjustment`,
      detail: `${money(recovery, row.currency)} adjusted against COD/negative balance; the remainder is transferable.`,
      tone: "amber",
    };
  }
  if (["completed", "processed"].includes(String(row.status || "").toLowerCase())) {
    return { title: "Transfer completed", detail: "Net payout was released through the selected payout destination.", tone: "green" };
  }
  return { title: "Transfer not completed", detail: "This payout is waiting for approval, processing, or provider confirmation.", tone: "gray" };
};

const settlementExplanation = (row = {}) => {
  const metadata = jsonOf(row.metadata);
  const source = String(metadata.source || "").toLowerCase();
  const amount = Math.abs(Number(valueOf(row, "net_amount", "netAmount") || 0));
  if (source === "negative_balance_offset_application") {
    return `Applied ${money(amount, row.currency)} of earnings to seller-collected COD liability.`;
  }
  if (source === "ledger_offset_only") {
    return "Payout closed with no transfer because all available earnings were used for COD/negative balance.";
  }
  if (source === "seller_direct_cod_recovery" || metadata.adjustmentType === "cod_recovery") {
    const remaining = Number(metadata.remainingAmount ?? metadata.recoveryAmount ?? amount);
    return `${money(remaining, row.currency)} seller-collected COD is still owed to the platform and will carry forward.`;
  }
  return row.notes || "Settlement movement created from the payout calculation.";
};

const getInitialPayoutFilters = () => {
  const params = new URLSearchParams(window.location.search);
  return ["sellerId", "status", "fromDate", "toDate"].reduce((filters, key) => {
    const value = params.get(key);
    if (value) filters[key] = value;
    return filters;
  }, {});
};

const SellerPayouts = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const finance = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(
    isSeller ? finance.myPayoutsData : finance.adminPayoutsData,
  );
  const settlementsPayload = unwrapList(finance.mySettlementsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: getInitialPayoutFilters(),
  });
  const { toQueryParams } = list;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const filterFields = useMemo(
    () =>
      isSeller
        ? FILTER_FIELDS.filter((field) => field.key !== "sellerId")
        : FILTER_FIELDS,
    [isSeller],
  );

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      const query = { ...params, offset: (params.page - 1) * params.limit };
      const action = isSeller ? getSellerPayouts : getAdminSellerPayouts;
      await dispatch(action(query)).unwrap();
      if (isSeller) {
        await dispatch(getMySellerSettlements(query)).unwrap();
      }
    } catch (requestError) {
      const message =
        requestError?.message ||
        requestError ||
        "Failed to load seller payouts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, isSeller, toQueryParams]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const downloadFile = useCallback(
    async (endpoint, params, filename, id = endpoint) => {
      try {
        setDownloadingId(id);
        await downloadApiFile(endpoint, params, {
          filename,
          format: params?.format,
        });
        toast.success("Download started");
      } catch (downloadError) {
        toast.error(downloadError?.message || "Unable to download file");
      } finally {
        setDownloadingId(null);
      }
    },
    [],
  );

  const columns = useMemo(() => {
    if (isSeller) {
      return [
        {
          key: "id",
          label: "Payout",
          render: (value, row) => <span className="font-mono text-xs">{shortReference(value || row.payoutId, "#")}</span>,
        },
        {
          key: "created_at",
          label: "Date",
          render: (value, row) => financeDateTime(row.processed_at || row.processedAt || value || row.createdAt),
        },
        {
          key: "net_amount",
          label: "Amount",
          render: (value, row) => <strong>{financeMoney(value ?? row.netAmount, row.currency)}</strong>,
        },
        {
          key: "destination",
          label: "Destination",
          render: (_, row) => {
            const metadata = jsonOf(row.metadata);
            const bank = metadata.bankName || row.bankName || (String(row.payment_method || row.paymentMethod || "").includes("wallet") ? "Seller wallet" : "Bank account");
            const account = String(metadata.accountNumber || row.accountNumber || "");
            return <span>{bank}{account ? ` ••••${account.slice(-4)}` : ""}</span>;
          },
        },
        {
          key: "status",
          label: "Status",
          render: (_, row) => <div><FinanceStatusBadge row={row} /><div className="mt-1 text-xs text-[var(--admin-muted)]">{sellerFinanceStatus(row).detail}</div></div>,
        },
        {
          key: "actions",
          label: "Action",
          render: (_, row) => <button type="button" onClick={() => setDetail(row)} className="admin-btn-secondary !px-2 !py-1"><MdVisibility size={15} /> {sellerFinanceStatus(row).key === "failed" ? "View issue" : "View payout"}</button>,
        },
      ];
    }
    const base = [
      ...(!isSeller
        ? [
            {
              key: "seller_id",
              label: "Seller",
              render: (_, row) => (
                <div>
                  <div className="font-medium text-gray-800">
                    {sellerName(row)}
                  </div>
                  {row.seller?.email && (
                    <div className="text-xs text-gray-400">
                      {row.seller.email}
                    </div>
                  )}
                </div>
              ),
            },
          ]
        : []),
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusBadge status={value || "pending"} dot />,
      },
      {
        key: "total_amount",
        label: "Seller receivable",
        render: (value, row) => money(value ?? row.totalAmount, row.currency),
      },
      {
        key: "deductions",
        label: "Fees & deductions",
        render: (_, row) => {
          const breakdown = breakdownOf(row);
          const commission = Number(valueOf(row, "commission_amount", "commissionAmount"));
          const commissionTax = Number(valueOf(row, "tax_amount", "taxAmount"));
          const withholding =
            Number(breakdown.gstTcsAmount || 0) +
            Number(breakdown.incomeTaxTdsAmount || 0);
          const refund = Number(valueOf(row, "refund_amount", "refundAmount"));
          const shipping =
            Number(breakdown.shippingReimbursementAmount || 0) -
            Number(breakdown.shippingDeductionAmount || 0);
          return (
            <div className="min-w-[190px] space-y-0.5 text-xs">
              <div className="flex justify-between gap-4"><span className="text-[var(--admin-muted)]">Commission + GST</span><span className="font-medium text-red-600">−{money(commission + commissionTax, row.currency)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[var(--admin-muted)]">TCS / TDS</span><span className="text-red-600">−{money(withholding, row.currency)}</span></div>
              {(refund !== 0 || shipping !== 0) && <div className="flex justify-between gap-4"><span className="text-[var(--admin-muted)]">Refund / shipping</span><span className={shipping - refund >= 0 ? "text-green-700" : "text-red-600"}>{signedMoney(shipping - refund, row.currency)}</span></div>}
            </div>
          );
        },
      },
      {
        key: "adjustment_amount",
        label: "COD / other adjustment",
        render: (value, row) => {
          const amount = Number(value ?? row.adjustmentAmount ?? 0);
          return <span className={amount < 0 ? "font-medium text-red-600" : "text-green-700"}>{signedMoney(amount, row.currency)}</span>;
        },
      },
      {
        key: "net_amount",
        label: "Amount to transfer",
        render: (value, row) => (
          <span className="font-semibold text-green-700">
            {money(value ?? row.netAmount, row.currency)}
          </span>
        ),
      },
      {
        key: "outcome",
        label: "Outcome / reason",
        render: (_, row) => {
          const explanation = payoutExplanation(row);
          return (
            <div>
              <div className={explanation.tone === "green" ? "font-semibold text-green-700" : explanation.tone === "amber" ? "font-semibold text-amber-700" : "font-semibold text-gray-700"}>{explanation.title}</div>
              <div className="mt-0.5 text-xs leading-5 text-gray-500">{explanation.detail}</div>
            </div>
          );
        },
      },
      {
        key: "period_start",
        label: "Period",
        render: (value, row) => (
          <span className="text-xs text-gray-500">
            {fmt(value ?? row.periodStart)} –{" "}
            {fmt(valueOf(row, "period_end", "periodEnd"))}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => setDetail(row)}
            className="admin-btn-secondary !px-2 !py-1"
          >
            <MdVisibility size={15} /> View
          </button>
        ),
      },
    ];
    return base;
  }, [isSeller]);

  const payoutExportColumns = useMemo(
    () => [
      ...(!isSeller
        ? [{ label: "Seller", value: (row) => sellerName(row) }]
        : []),
      { label: "Status", value: (row) => formatLabel(row.status || "pending") },
      {
        label: "Seller receivable",
        value: (row) =>
          money(valueOf(row, "total_amount", "totalAmount"), row.currency),
      },
      {
        label: "Platform commission",
        value: (row) =>
          `-${money(valueOf(row, "commission_amount", "commissionAmount"), row.currency)}`,
      },
      {
        label: "GST on commission",
        value: (row) =>
          `-${money(valueOf(row, "tax_amount", "taxAmount"), row.currency)}`,
      },
      {
        label: "TCS/TDS",
        value: (row) => {
          const breakdown = breakdownOf(row);
          return `-${money(Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0), row.currency)}`;
        },
      },
      {
        label: "Shipping net",
        value: (row) => {
          const breakdown = breakdownOf(row);
          return signedMoney(
            Number(breakdown.shippingReimbursementAmount || 0) -
              Number(breakdown.shippingDeductionAmount || 0),
            row.currency,
          );
        },
      },
      {
        label: "Refunds",
        value: (row) =>
          `-${money(valueOf(row, "refund_amount", "refundAmount"), row.currency)}`,
      },
      {
        label: "COD / other adjustment",
        value: (row) =>
          signedMoney(valueOf(row, "adjustment_amount", "adjustmentAmount"), row.currency),
      },
      {
        label: "Amount to transfer",
        value: (row) =>
          money(valueOf(row, "net_amount", "netAmount"), row.currency),
      },
      { label: "Outcome / reason", value: (row) => payoutExplanation(row).detail },
      {
        label: "Period",
        value: (row) =>
          `${fmt(valueOf(row, "period_start", "periodStart"))} – ${fmt(valueOf(row, "period_end", "periodEnd"))}`,
      },
      {
        label: "Transfer date",
        value: (row) => fmt(valueOf(row, "processed_at", "processedAt")),
      },
    ],
    [isSeller],
  );

  const exportPayoutTable = () => {
    if (!payload.list.length) {
      toast.error("No payout records available to export", {
        id: "export-payout-error",
      });
      return;
    }

    exportToCsv(payload.list, {
      filename: "seller-payouts.csv",
      columns: payoutExportColumns,
    });

    toast.success(
      `${payload.list.length} payout record${payload.list.length === 1 ? "" : "s"} exported`,
      {
        id: "export-payout-success",
      },
    );
  };

  const settlementExportColumns = useMemo(
    () => [
      {
        label: "Settlement",
        value: (row) => `#${String(row.id || "").slice(0, 8) || "—"}`,
      },
      {
        label: "Payout",
        value: (row) =>
          `#${String(valueOf(row, "payout_id", "payoutId") || "—").slice(0, 8)}`,
      },
      {
        label: "Seller receivable",
        value: (row) =>
          money(valueOf(row, "gross_amount", "grossAmount"), row.currency),
      },
      {
        label: "Platform commission",
        value: (row) =>
          `-${money(valueOf(row, "commission_amount", "commissionAmount"), row.currency)}`,
      },
      {
        label: "GST on commission",
        value: (row) =>
          `-${money(valueOf(row, "tax_amount", "taxAmount"), row.currency)}`,
      },
      {
        label: "TCS/TDS",
        value: (row) => {
          const breakdown = breakdownOf(row);
          return `-${money(Number(breakdown.gstTcsAmount || 0) + Number(breakdown.incomeTaxTdsAmount || 0), row.currency)}`;
        },
      },
      {
        label: "Shipping net",
        value: (row) => {
          const breakdown = breakdownOf(row);
          return signedMoney(
            Number(breakdown.shippingReimbursementAmount || 0) -
              Number(breakdown.shippingDeductionAmount || 0),
            row.currency,
          );
        },
      },
      {
        label: "Net",
        value: (row) =>
          money(valueOf(row, "net_amount", "netAmount"), row.currency),
      },
      { label: "Movement / reason", value: (row) => settlementExplanation(row) },
      { label: "Status", value: (row) => formatLabel(row.status || "pending") },
      {
        label: "Recorded on",
        value: (row) =>
          fmt(
            valueOf(row, "settlement_date", "settlementDate") ?? row.created_at,
          ),
      },
    ],
    [],
  );

  const exportSettlementTable = () => {
    if (!settlementsPayload.list.length) {
      toast.error("No settlement records available to export");
      return;
    }
    exportToCsv(settlementsPayload.list, {
      filename: "seller-settlements.csv",
      columns: settlementExportColumns,
    });
    toast.success(
      `${settlementsPayload.list.length} settlement record${settlementsPayload.list.length === 1 ? "" : "s"} exported`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSeller ? "Payouts" : "Seller Payouts"}
        subtitle={
          isSeller
            ? "Track every transfer made to your payout account."
            : "Calculated seller payouts. Use Payout Operations to approve or complete them."
        }
        breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Payouts" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportPayoutTable}>
              <MdDownload size={16} />
              Export
            </button>
          </div>
        }
      />

      {isSeller && <FinanceNav />}

      {isSeller && (
        <div className="grid gap-3 sm:grid-cols-3">
          <FinanceMetricCard tone="green" label="Paid to date" value={financeMoney(payload.summary?.paidAmount || payload.list.filter((row) => sellerFinanceStatus(row).key === "paid").reduce((sum, row) => sum + Number(valueOf(row, "net_amount", "netAmount")), 0))} description="Successfully transferred." />
          <FinanceMetricCard tone="blue" label="Processing" value={financeMoney(payload.summary?.processingAmount || payload.list.filter((row) => sellerFinanceStatus(row).key === "processing").reduce((sum, row) => sum + Number(valueOf(row, "net_amount", "netAmount")), 0))} description="Currently being transferred." />
          <FinanceMetricCard tone="red" label="Failed" value={financeMoney(payload.summary?.failedAmount || payload.list.filter((row) => sellerFinanceStatus(row).key === "failed").reduce((sum, row) => sum + Number(valueOf(row, "net_amount", "netAmount")), 0))} description="Transfers that did not complete." />
        </div>
      )}

      {isSeller && (
        <div className="admin-card border-l-4 border-l-[var(--admin-gold)] px-4 py-3 text-sm text-[var(--admin-ink)]">
          <strong>Receivable − fees − COD/other adjustments = amount transferred.</strong>
          <span className="ml-1 text-[var(--admin-muted)]">A completed ₹0 payout means earnings were fully adjusted; check the outcome column.</span>
        </div>
      )}

      {/* <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        Payout amounts come from delivered orders and their checkout fee snapshots. They cannot be typed manually.
      </div> */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search seller or payment reference"
        emptyText="No calculated payouts found"
        filterBar={
          <FilterBar
            filters={filterFields}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {false && isSeller && (
        <section className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
                <MdReceiptLong size={18} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--admin-ink)]">
                  Settlement Statements
                </h2>
                <p className="text-xs text-[var(--admin-muted)]">
                  Download the payout slip generated from commissions, payouts,
                  and settlements.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportSettlementTable}
              className="admin-btn-secondary shrink-0"
            >
              <MdDownload size={16} />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="admin-table-head text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-4 py-3">Earnings</th>
                  <th className="px-4 py-3">Fees & Taxes</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded On</th>
                  <th className="px-4 py-3 text-right">Statement</th>
                </tr>
              </thead>
              <tbody>
                {settlementsPayload.list.length ? (
                  settlementsPayload.list.map((row) => {
                    const isDownloading = downloadingId === row.id;
                    const breakdown = breakdownOf(row);
                    const taxWithheld =
                      Number(breakdown.gstTcsAmount || 0) +
                      Number(breakdown.incomeTaxTdsAmount || 0);
                    const shippingNet =
                      Number(breakdown.shippingReimbursementAmount || 0) -
                      Number(breakdown.shippingDeductionAmount || 0);
                    const feesAndTaxes =
                      Number(valueOf(row, "commission_amount", "commissionAmount")) +
                      Number(valueOf(row, "tax_amount", "taxAmount")) +
                      taxWithheld - shippingNet;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-[var(--admin-line)] last:border-0 hover:bg-[var(--admin-surface-soft)]"
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            title={row.id}
                            className="rounded bg-[var(--admin-canvas)] px-1.5 py-0.5 font-mono text-xs text-[var(--admin-ink)]"
                          >
                            #{String(row.id || "").slice(0, 8) || "—"}
                          </span>
                          <div className="mt-1 text-[10px] text-[var(--admin-muted)]">Payout #{String(valueOf(row, "payout_id", "payoutId") || "—").slice(0, 8)}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {money(
                            valueOf(row, "gross_amount", "grossAmount"),
                            row.currency,
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-red-600">
                          −{money(Math.max(feesAndTaxes, 0), row.currency)}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 font-semibold ${Number(valueOf(row, "net_amount", "netAmount")) < 0 ? "text-red-600" : "text-green-700"}`}>
                          {money(
                            valueOf(row, "net_amount", "netAmount"),
                            row.currency,
                          )}
                        </td>
                        <td className="min-w-[260px] max-w-[340px] px-4 py-3 text-xs leading-5 text-[var(--admin-muted)]">
                          {settlementExplanation(row)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge status={row.status || "pending"} dot />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--admin-muted)]">
                          {fmt(
                            valueOf(row, "settlement_date", "settlementDate") ??
                              row.created_at,
                            true,
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Download statement"
                            onClick={() =>
                              downloadFile(
                                ENDPOINTS.payouts.mySettlementStatement(row.id),
                                { format: "pdf" },
                                `settlement-${row.id}.pdf`,
                                row.id,
                              )
                            }
                            disabled={isDownloading}
                            className="admin-btn-secondary !min-h-0 !px-2.5 !py-1.5 !text-xs"
                          >
                            {isDownloading ? (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                            ) : (
                              <MdDownload size={14} />
                            )}
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-[var(--admin-muted)]">
                        <MdReceiptLong
                          size={28}
                          className="text-[var(--admin-line-strong)]"
                        />
                        <span className="text-sm">
                          No settlement statements yet
                        </span>
                        <span className="text-xs">
                          Statements appear here once a payout for this period
                          is completed.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DefaultModal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Payout Calculation"
        isButtonView={false}
      >
        {detail && (
          <div className="space-y-4 p-2 text-sm">
            {(() => {
              const breakdown = breakdownOf(detail);
              const taxWithheld =
                Number(breakdown.gstTcsAmount || 0) +
                Number(breakdown.incomeTaxTdsAmount || 0);
              const shippingNet =
                Number(breakdown.shippingReimbursementAmount || 0) -
                Number(breakdown.shippingDeductionAmount || 0);
              return (
                <>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="font-semibold text-gray-800">
                      {sellerName(detail)}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={detail.status || "pending"} dot />
                    </div>
                    <div className="mt-2 text-gray-600">
                      Earning period:{" "}
                      {fmt(valueOf(detail, "period_start", "periodStart"))} –{" "}
                      {fmt(valueOf(detail, "period_end", "periodEnd"))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg border border-gray-100 p-4">
                    <div className="flex justify-between">
                      <span>Seller receivable</span>
                      <span>
                        {money(
                          valueOf(detail, "total_amount", "totalAmount"),
                          detail.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform commission</span>
                      <span className="text-red-600">
                        -
                        {money(
                          valueOf(
                            detail,
                            "commission_amount",
                            "commissionAmount",
                          ),
                          detail.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST on commission</span>
                      <span className="text-red-600">
                        -
                        {money(
                          valueOf(detail, "tax_amount", "taxAmount"),
                          detail.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST TCS / income-tax TDS</span>
                      <span className="text-red-600">
                        -{money(taxWithheld, detail.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping collected / reimbursed</span>
                      <span
                        className={
                          shippingNet >= 0 ? "text-green-700" : "text-red-600"
                        }
                      >
                        {signedMoney(shippingNet, detail.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Refund adjustments</span>
                      <span className="text-red-600">
                        -
                        {money(
                          valueOf(detail, "refund_amount", "refundAmount"),
                          detail.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other adjustments</span>
                      <span>
                        {signedMoney(
                          valueOf(
                            detail,
                            "adjustment_amount",
                            "adjustmentAmount",
                          ),
                          detail.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-semibold">
                      <span>Amount to transfer</span>
                      <span className="text-green-700">
                        {money(
                          valueOf(detail, "net_amount", "netAmount"),
                          detail.currency,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-lg border p-4 ${payoutExplanation(detail).tone === "green" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <div className="font-semibold">{payoutExplanation(detail).title}</div>
                    <p className="mt-1 text-xs leading-5">{payoutExplanation(detail).detail}</p>
                  </div>
                </>
              );
            })()}
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 p-4 md:grid-cols-2">
              <div>
                <strong>Payment method:</strong>{" "}
                {String(
                  valueOf(detail, "payment_method", "paymentMethod") ||
                    "Not selected",
                ).replace(/_/g, " ")}
              </div>
              <div>
                <strong>Payment reference:</strong>{" "}
                {valueOf(detail, "payment_reference", "paymentReference") ||
                  "Not paid yet"}
              </div>
              <div>
                <strong>Processed:</strong>{" "}
                {fmt(valueOf(detail, "processed_at", "processedAt"), true)}
              </div>
              <div>
                <strong>Created:</strong>{" "}
                {fmt(valueOf(detail, "created_at", "createdAt"), true)}
              </div>
            </div>
          </div>
        )}
      </DefaultModal>
    </div>
  );
};

export default SellerPayouts;
