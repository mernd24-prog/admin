import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, OrderLink, PageHeader, StatusBadge } from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");

export default function SellerCodCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(ENDPOINTS.payments.myCodCollections);
      const data = response?.data?.data;
      setItems(data?.items || data?.list || data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load COD collections");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/^#+\s*/, "");
    if (!query) return items;
    return items.filter((row) => [row.order_number, row.order_id, row.shipment_id, row.awb_number, row.collection_mode, row.status, row.recovery_status]
      .some((value) => String(value ?? "").toLowerCase().replace(/^#+\s*/, "").includes(query)));
  }, [items, search]);

  const columns = useMemo(() => [
    { key: "order_number", label: "Order / Shipment", render: (_, row) => (
      <div><OrderLink orderId={row.order_id} orderNumber={row.order_number} /><div className="text-xs text-gray-500">{row.awb_number || "Shipment"}</div></div>
    ) },
    { key: "expected_amount", label: "COD cash held", render: (value) => money(value) },
    { key: "status", label: "Collection", render: (value, row) => <span title={row.status === "verified" ? "Automatically recorded when delivery was confirmed." : row.status === "disputed" ? "This collection is under review." : "Collection status requires review."}><StatusBadge status={value} label={label(value)} /></span> },
    { key: "recovered_amount", label: "Recovered", render: (value) => money(value) },
    { key: "remaining_amount", label: "Still owed", render: (value) => <span className={Number(value) > 0 ? "font-semibold text-red-700" : "text-emerald-700"}>{money(value)}</span> },
    { key: "recovery_status", label: "Recovery", render: (value, row) => <span title={Number(row.remaining_amount) > 0 ? "The remaining COD balance will be recovered from current or future eligible payouts." : "The COD balance has been fully recovered."}><StatusBadge status={value} label={label(value)} /></span> },
  ], []);

  return <div>
    <>
    <PageHeader title="COD Collections" subtitle="The cash held includes the seller's allocated customer payment, such as product value and customer platform fee. It is recovered from current or future eligible earnings." breadcrumbs={[{ label: "Seller Finance" }, { label: "COD Collections" }]} />
    </>
    <DataTable columns={columns} data={filteredItems} loading={loading} totalCount={filteredItems.length}
      page={pagination.page} pageSize={pagination.pageSize}
      onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
      onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
      onSearch={(value) => { setSearch(value); setPagination((current) => ({ ...current, page: 1 })); }}
      onSort={() => {}} onRefresh={load} requiredModule="sellers/commissions" />
  </div>;
}
