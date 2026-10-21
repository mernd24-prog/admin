import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdDownload, MdReceiptLong, MdRefresh } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import { getMySellerSettlements } from "../../../Redux/sellerCommissionsSlice";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { downloadApiFile } from "../../../_helpers/downloadApi";
import {
  FinanceStatusBadge,
  financeDateTime,
  financeList,
  financeMoney,
  financeValue,
  sellerFinanceStatus,
  shortReference,
} from "./financeUi";

export default function FinanceStatements() {
  const dispatch = useDispatch();
  const state = useSelector(
    (store) => store.sellerCommissions?.mySettlementsData || {},
  );
  const rows = financeList(state);
  const [downloading, setDownloading] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const load = useCallback(async () => {
    try {
      await dispatch(
        getMySellerSettlements({ limit: 100, offset: 0 }),
      ).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Unable to load statements");
    }
  }, [dispatch]);
  useEffect(() => {
    load();
  }, [load]);
  const download = useCallback(async (row) => {
    try {
      setDownloading(row.id);
      await downloadApiFile(
        ENDPOINTS.payouts.mySettlementStatement(row.id),
        { format: "pdf" },
        { filename: `settlement-${row.id}.pdf`, format: "pdf" },
      );
      toast.success("Statement download started");
    } catch (error) {
      toast.error(error?.message || "Unable to download statement");
    } finally {
      setDownloading("");
    }
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const periodStart =
        row.period_start || row.periodStart || row.created_at;
      const periodEnd =
        row.period_end ||
        row.periodEnd ||
        row.settlement_date ||
        row.settlementDate;
      const payoutId = financeValue(row, "payout_id", "payoutId");
      const payoutAmount = financeValue(row, "net_amount", "netAmount");
      const adjustments = financeValue(
        row,
        "adjustment_amount",
        "adjustmentAmount",
      );
      const generatedOn =
        row.settlement_date || row.settlementDate || row.created_at;
      const visibleValues = [
        shortReference(row.id, "#"),
        row.id,
        shortReference(payoutId, "#"),
        payoutId,
        financeDateTime(periodStart),
        financeDateTime(periodEnd),
        financeMoney(payoutAmount, row.currency),
        financeMoney(adjustments, row.currency),
        row.status,
        row.releaseStatus,
        row.lifecycleStatus,
        sellerFinanceStatus(row).label,
        financeDateTime(generatedOn),
      ];

      return visibleValues.some((value) =>
        String(value || "").toLowerCase().includes(query),
      );
    });
  }, [rows, search]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [rows.length, search]);
  const columns = useMemo(
    () => [
      {
        key: "period",
        label: "Statement period",
        render: (_, row) =>
          `${financeDateTime(row.period_start || row.periodStart || row.created_at)} – ${financeDateTime(row.period_end || row.periodEnd || row.settlement_date || row.settlementDate)}`,
      },
      {
        key: "reference",
        label: "Reference",
        render: (_, row) => (
          <div>
            <strong className="font-mono">{shortReference(row.id, "#")}</strong>
            <span className="mt-1 block text-xs text-[var(--admin-muted)]">
              Payout{" "}
              {shortReference(financeValue(row, "payout_id", "payoutId"), "#")}
            </span>
          </div>
        ),
      },
      {
        key: "amount",
        label: "Payout amount",
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
        key: "adjustments",
        label: "Adjustments",
        render: (_, row) =>
          financeMoney(
            financeValue(row, "adjustment_amount", "adjustmentAmount"),
            row.currency,
          ),
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => <FinanceStatusBadge row={row} />,
      },
      {
        key: "generated",
        label: "Generated on",
        render: (_, row) =>
          financeDateTime(
            row.settlement_date || row.settlementDate || row.created_at,
          ),
      },
      {
        key: "download",
        label: "Statement",
        render: (_, row) => (
          <button
            type="button"
            disabled={downloading === row.id}
            className="admin-btn-secondary !px-2 !py-1"
            onClick={() => download(row)}
          >
            <MdDownload aria-hidden="true" />{" "}
            {downloading === row.id ? "Preparing…" : "PDF"}
          </button>
        ),
      },
    ],
    [download, downloading],
  );
  return (
    <div className="space-y-5">
      <Loader loading={Boolean(state.loading)} />
      <PageHeader
        title="Statements"
        subtitle="Download records of your completed payouts and financial adjustments."
        breadcrumbs={[
          { label: "My Finance & Payouts" },
          { label: "Statements" },
        ]}
      />
      {/* <FinanceNav /> */}
     
      <DataTable
        columns={columns}
        data={pagedRows}
        onRefresh={load}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search statement period, reference, amount, or status..."
        loading={Boolean(state.loading)}
        totalCount={filteredRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        pageSizeOptions={[10, 20, 50, 100]}
        rowKey="id"
        emptyText="No statements yet. Statements appear after a payout or settlement is completed."
      />
    </div>
  );
}
