import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdCheckCircle } from "react-icons/md";
import { toast } from "sonner";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { DataTable, OrderLink, SellerIdentity, PageHeader, StatusBadge } from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { ACTIONS } from "../../../_helpers/usePermission";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormSection from "../../../components/Atoms/FormSection/FormSection";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");

export default function CodCollections() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [sellerMap, setSellerMap] = useState({});
  const [decision, setDecision] = useState({ open: false, row: null, notes: "" });

  const load = useCallback(async (page = pagination.page, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(ENDPOINTS.payments.codCollections, { params: { page, limit: pageSize } });
      const data = response?.data?.data;
      setItems(Array.isArray(data) ? data : data?.items || data?.list || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load COD collections");
    } finally { setLoading(false); }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => { load(pagination.page, pagination.pageSize); }, [load, pagination.page, pagination.pageSize, refreshKey]);
  useEffect(() => { dropdownApi.getSellers({ limit: 100 }).then((sellers) => {
    const map = {}; (sellers || []).forEach((seller) => { if (seller?.value) map[seller.value] = seller.label; }); setSellerMap(map);
  }).catch(() => {}); }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");
    if (!term) return items;
    return items.filter((row) => [row.id, row.order_id, row.order_number, row.shipment_id, row.awb_number,
      row.sellerName, row.storeName, sellerMap[row.seller_id], row.collection_mode, row.status, row.recovery_status]
      .some((value) => String(value ?? "").toLowerCase().replace(/_/g, " ").includes(term)));
  }, [items, search, sellerMap]);

  const verify = useCallback(async () => {
    if (!decision.row?.id) return;
    try {
      setLoading(true);
      await axiosProvider.post(ENDPOINTS.payments.verifyCodCollection(decision.row.id), { notes: decision.notes.trim() || null });
      toast.success("COD collection verified; payout recovery remains active");
      setDecision({ open: false, row: null, notes: "" });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to verify COD collection");
    } finally { setLoading(false); }
  }, [decision]);

  const columns = useMemo(() => [
    { key: "order_number", label: "Order / Shipment", render: (_, row) => <div><OrderLink orderId={row.order_id} orderNumber={row.order_number} /><div className="text-xs text-gray-500">{row.awb_number || "AWB not assigned"}</div></div> },
    { key: "seller_id", label: "Seller", render: (value, row) => <SellerIdentity row={row} sellerId={value} storeName={row.storeName || row.organizationName || sellerMap[value]} loginName={row.sellerName || row.seller?.name || row.seller?.email} /> },
    { key: "expected_amount", label: "COD cash", render: (value) => money(value) },
    { key: "status", label: "Collection", render: (value) => <StatusBadge status={value} label={label(value)} /> },
    { key: "recovered_amount", label: "Recovered", render: (value) => money(value) },
    { key: "remaining_amount", label: "Still owed", render: (value) => <span className={Number(value) > 0 ? "font-semibold text-red-700" : "text-emerald-700"}>{money(value)}</span> },
    { key: "recovery_status", label: "Recovery", render: (value) => <StatusBadge status={value} label={label(value)} /> },
  ], [sellerMap]);

  return <div>
    <PageHeader title="COD Collections" subtitle="Verify seller-retained COD cash. Verification confirms collection but never clears the amount owed; payouts recover it automatically." breadcrumbs={[{ label: "Payments & Finance" }, { label: "COD Collections" }]} />
    <DataTable columns={columns} data={filteredItems} searchPlaceholder="Search Shipment..." loading={loading}
      totalCount={filteredItems.length} page={pagination.page} pageSize={pagination.pageSize}
      onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
      onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
      onSearch={(value) => { setSearch(value); setPagination((current) => ({ ...current, page: 1 })); }}
      onSort={() => {}} onRefresh={() => setRefreshKey((value) => value + 1)} requiredModule="payments"
      rowActions={(row) => ["confirmed", "submitted"].includes(row.status) ? [{ label: "Verify collection",
        icon: <MdCheckCircle size={16} className="text-blue-600" />, requiredModule: "payments", requiredAction: ACTIONS.APPROVE,
        onClick: () => setDecision({ open: true, row, notes: row.notes || "" }) }] : []} />
    <DefaultModal isOpen={decision.open} onClose={() => !loading && setDecision({ open: false, row: null, notes: "" })}
      title="Verify COD collection" onSubmit={verify} submitButtonText={loading ? "Verifying..." : "Verify collection"}>
      <div className="space-y-5">
        <FormSection title="Seller-retained cash" description="Verify that delivery and the seller's full-amount confirmation are present. This action does not clear the liability.">
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-xs font-medium uppercase text-gray-500">Expected and confirmed COD</div><div className="mt-1 text-lg font-semibold">{money(decision.row?.expected_amount)}</div></div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">After verification, {money(decision.row?.remaining_amount ?? decision.row?.expected_amount)} remains owed and will be recovered from payouts.</div>
            <FormInput label="Internal verification note (optional)" name="notes" type="textarea" value={decision.notes} onChange={(event) => setDecision((current) => ({ ...current, notes: event.target.value }))} placeholder="Add audit context" />
          </div>
        </FormSection>
      </div>
    </DefaultModal>
  </div>;
}
