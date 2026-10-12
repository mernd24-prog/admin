import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { DataTable, FilterBar, PageHeader } from "../../components/Shared";
import { getTaxReports } from "../../Redux/adminCoreSlice";
import { useListPage } from "../../hooks/useListPage";
import useStoreNames from "../../hooks/useStoreNames";
import { resolveStoreName } from "../../utils/storeNameUtils";
import { formatIndianNumber } from "../../utils/formatters";

const FILTER_FIELDS = [
  {
    key: "taxComponent",
    type: "select",
    label: "Component",
    options: ["cgst", "sgst", "igst", "tcs"].map((value) => ({
      value,
      label: value.toUpperCase(),
    })),
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const TaxReports = () => {
  const dispatch = useDispatch();
  const { storeNameMap } = useStoreNames();
  const list = useListPage({ defaultPageSize: 20 });
  const { filters: reportFilters } = list;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const visibleEntries = useMemo(() => {
    const term = list.search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((row) => [
      resolveStoreName(row, storeNameMap).name,
      row.tax_component,
      String(row.entry_type || "").replace(/_/g, " "),
      row.entry_count,
      row.total_amount,
    ].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [entries, list.search, storeNameMap]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { ...reportFilters };
      // Search and pagination apply to the complete summarized report.
      delete params.search;
      const allEntries = [];
      let offset = 0;
      let batch;
      do {
        const result = await dispatch(getTaxReports({ ...params, limit: 1000, offset })).unwrap();
        batch = result?.data?.data?.entries || result?.data?.entries || result?.entries || [];
        allEntries.push(...batch);
        offset += batch.length;
      } while (batch.length === 1000);
      setEntries(allEntries);
    } catch (requestError) {
      const message = requestError?.message || "Failed to load tax reports";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, reportFilters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const columns = useMemo(
    () => [
      {
        key: "organization_id",
        label: "Store Name",
        render: (_, row) => resolveStoreName(row, storeNameMap).name,
      },
      {
        key: "tax_component",
        label: "Component",
        render: (value) => String(value || "N/A").toUpperCase(),
      },
      { key: "entry_type", label: "Entry Type" },
      { key: "entry_count", label: "Count", render: (value) => value || 0 },
      {
        key: "total_amount",
        label: "Amount",
        render: (value) => formatIndianNumber(value),
      },
    ],
    [storeNameMap],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Reports"
        subtitle="Review summarized tax ledger entries by store and component."
        breadcrumbs={[
          { label: "Invoices & Taxation" },
          { label: "Tax Reports" },
        ]}
      />
      <DataTable
        columns={columns}
        data={visibleEntries.slice((list.page - 1) * list.pageSize, list.page * list.pageSize)}
        loading={loading}
        total={visibleEntries.length}
        listPage={list}
        emptyMessage={error || "No tax report entries found"}
        onRefresh={fetchReports}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            listPage={list}
            loading={loading}
          />
        }
        exportConfig={{ filename: "tax-report", columns, data: visibleEntries }}
      />
    </div>
  );
};

export default TaxReports;
