import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdRefresh, MdUpload } from "react-icons/md";
import { toast } from "sonner";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, OrderLink, PageHeader, StatusBadge } from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");

export default function SellerCodCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ open: false, row: null, amount: "", referenceId: "", proofUrl: "", notes: "" });

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

  const submit = useCallback(async () => {
    if (!form.row?.shipment_id || Number(form.amount) <= 0 || form.referenceId.trim().length < 3) {
      toast.error("Collected amount and reference are required");
      return;
    }
    try {
      setLoading(true);
      await axiosProvider.post(ENDPOINTS.payments.submitCodCollection(form.row.shipment_id), {
        collectedAmount: Number(form.amount), referenceId: form.referenceId, proofUrl: form.proofUrl || null, notes: form.notes || null,
      });
      toast.success("COD collection submitted to Admin for verification");
      setForm({ open: false, row: null, amount: "", referenceId: "", proofUrl: "", notes: "" });
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to submit COD collection");
    } finally { setLoading(false); }
  }, [form, load]);

  const columns = useMemo(() => [
   {
  key: "order_number",
  label: "Order / Shipment",
  render: (_, row) => {
    const orderId = row?.order_id || row?.orderId;
    const orderDisplay = row?.order_number ? `#${row.order_number}` : (row?.order_id || "—");

    return (
      <div>
        <OrderLink orderId={orderId} orderNumber={row?.order_number} className="block">
          {orderDisplay}
        </OrderLink>

        <div className="text-xs text-gray-500">
          {row?.awb_number || "Shipment"}
        </div>
      </div>
    );
  },
},
    { key: "collection_mode", label: "Mode", render: (value) => label(value) },
    { key: "expected_amount", label: "Expected", render: (value) => money(value) },
    { key: "collected_amount", label: "Collected", render: (value) => money(value) },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} label={label(value)} /> },
    { key: "actions", label: "Action", render: (_, row) => ["seller_direct", "hybrid"].includes(row.collection_mode) && row.status === "pending" ? <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setForm({ open: true, row, amount: row.expected_amount || "", referenceId: "", proofUrl: "", notes: "" })}><MdUpload size={14} /> Submit collection</button> : row.status === "submitted" ? "Awaiting Admin verification" : "-" },
  ], []);

  return <div>
    <PageHeader title="My COD Collections" subtitle="Submit seller-direct cash collection for Admin verification before settlement" breadcrumbs={[{ label: "Seller Finance" }, { label: "COD Collections" }]} actions={<button type="button" onClick={load}><MdRefresh size={17} /> Refresh</button>} />
    <DataTable columns={columns} data={items} loading={loading} totalCount={items.length} page={1} pageSize={100} onPageChange={() => {}} onPageSizeChange={() => {}} onSearch={() => {}} onSort={() => {}} onRefresh={load} requiredModule="sellers/commissions" />
    <DefaultModal isOpen={form.open} onClose={() => setForm({ open: false, row: null, amount: "", referenceId: "", proofUrl: "", notes: "" })} title="Submit COD Collection" onSubmit={submit}>
      <div className="space-y-3"><p className="text-sm text-gray-600">Expected COD: {money(form.row?.expected_amount)}</p><Input labelName="Collected amount" type="number" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} required /><Input labelName="Collection reference" value={form.referenceId} onChange={(event) => setForm((prev) => ({ ...prev, referenceId: event.target.value }))} required /><Input labelName="Proof URL (optional)" value={form.proofUrl} onChange={(event) => setForm((prev) => ({ ...prev, proofUrl: event.target.value }))} /><Input labelName="Notes" type="textarea" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></div>
    </DefaultModal>
  </div>;
}
