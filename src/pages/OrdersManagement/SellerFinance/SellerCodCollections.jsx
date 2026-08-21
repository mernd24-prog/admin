import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdDeleteOutline, MdOpenInNew, MdRefresh, MdUpload } from "react-icons/md";
import { toast } from "sonner";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, OrderLink, PageHeader, StatusBadge } from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { uploadDocumentFile } from "../../../_helpers/globalFunctions";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");

export default function SellerCodCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
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

  const uploadProof = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Upload a PDF, JPG, PNG, or WebP collection proof");
      return;
    }
    try {
      setUploadingProof(true);
      const proofUrl = await uploadDocumentFile(file, "COD_COLLECTIONS");
      setForm((current) => ({ ...current, proofUrl }));
      toast.success("Collection proof uploaded");
    } catch (error) {
      toast.error(error?.message || error || "Unable to upload collection proof");
    } finally {
      setUploadingProof(false);
    }
  }, []);

  const submit = useCallback(async () => {
    if (uploadingProof) {
      toast.error("Please wait for the proof upload to finish");
      return;
    }
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
  }, [form, load, uploadingProof]);

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
    { key: "actions", label: "Action", render: (_, row) => row.status === "pending" ? <PermissionGuard module="sellers/commissions" action={ACTIONS.UPDATE} hide><button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setForm({ open: true, row, amount: row.expected_amount || "", referenceId: "", proofUrl: "", notes: "" })}><MdUpload size={14} /> Submit collection</button></PermissionGuard> : row.status === "submitted" ? "Awaiting Admin verification" : ["verified", "remitted"].includes(row.status) ? "Completed" : "No action required" },
  ], []);

  return <div>
    <PageHeader title="My COD Collections" subtitle="COD is enabled per product. Submit cash collected from delivered COD orders for Admin verification before settlement." breadcrumbs={[{ label: "Seller Finance" }, { label: "COD Collections" }]} actions={<button type="button" onClick={load}><MdRefresh size={17} /> Refresh</button>} />
    <DataTable columns={columns} data={items} loading={loading} totalCount={items.length} page={1} pageSize={100} onPageChange={() => {}} onPageSizeChange={() => {}} onSearch={() => {}} onSort={() => {}} onRefresh={load} requiredModule="sellers/commissions" />
    <DefaultModal isOpen={form.open} onClose={() => setForm({ open: false, row: null, amount: "", referenceId: "", proofUrl: "", notes: "" })} title="Submit COD Collection" onSubmit={submit}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Expected COD: {money(form.row?.expected_amount)}</p>
        <Input labelName="Collected amount" type="number" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} required />
        <div>
          <Input labelName="Collection reference" value={form.referenceId} onChange={(event) => setForm((prev) => ({ ...prev, referenceId: event.target.value }))} placeholder="Cash receipt / courier / deposit reference" required />
          <p className="mt-1 text-xs text-gray-500">Enter the unique receipt, courier collection, bank deposit, or internal cash collection number.</p>
        </div>
        <div className="rounded-lg border border-dashed border-[#d8caa6] bg-[#fffaf0] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase text-gray-600">Collection proof (optional)</div>
              <div className="mt-1 text-xs text-gray-500">Upload a PDF, JPG, PNG, or WebP receipt.</div>
            </div>
            <label className={`admin-btn-secondary inline-flex cursor-pointer items-center gap-2 ${uploadingProof ? "pointer-events-none opacity-60" : ""}`}>
              <MdUpload size={15} />
              {uploadingProof ? "Uploading…" : form.proofUrl ? "Replace file" : "Upload proof"}
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingProof} onChange={uploadProof} />
            </label>
          </div>
          {form.proofUrl && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-green-200 bg-white px-3 py-2 text-xs">
              <a href={form.proofUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 font-semibold text-green-700 hover:underline"><MdOpenInNew size={14} /> View uploaded proof</a>
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline" onClick={() => setForm((current) => ({ ...current, proofUrl: "" }))}><MdDeleteOutline size={14} /> Remove</button>
            </div>
          )}
        </div>
        <Input labelName="Notes" type="textarea" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
      </div>
    </DefaultModal>
  </div>;
}
