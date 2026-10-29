import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdCheckCircle } from "react-icons/md";
import { toast } from "sonner";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, OrderLink, PageHeader, StatusBadge } from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { ACTIONS } from "../../../_helpers/usePermission";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");
const EMPTY_FORM = { open: false, row: null, confirmed: false, notes: "" };

export default function SellerCodCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [form, setForm] = useState(EMPTY_FORM);

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

  const submit = useCallback(async () => {
    if (!form.row?.shipment_id || !form.confirmed) {
      toast.error("Confirm that you collected and retained the full COD amount");
      return;
    }
    try {
      setLoading(true);
      await axiosProvider.post(ENDPOINTS.payments.confirmCodCollection(form.row.shipment_id), {
        confirmation: true, notes: form.notes.trim() || null,
      });
      toast.success("COD cash retention confirmed; awaiting Admin verification");
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to confirm COD collection");
    } finally { setLoading(false); }
  }, [form, load]);

  const columns = useMemo(() => [
    { key: "order_number", label: "Order / Shipment", render: (_, row) => (
      <div><OrderLink orderId={row.order_id} orderNumber={row.order_number} /><div className="text-xs text-gray-500">{row.awb_number || "Shipment"}</div></div>
    ) },
    { key: "expected_amount", label: "COD cash", render: (value) => money(value) },
    { key: "status", label: "Collection", render: (value) => <StatusBadge status={value} label={label(value)} /> },
    { key: "recovered_amount", label: "Recovered", render: (value) => money(value) },
    { key: "remaining_amount", label: "Still owed", render: (value) => <span className={Number(value) > 0 ? "font-semibold text-red-700" : "text-emerald-700"}>{money(value)}</span> },
    { key: "recovery_status", label: "Recovery", render: (value) => <StatusBadge status={value} label={label(value)} /> },
  ], []);

  return <div>
    <PageHeader title="COD Collections" subtitle="Confirm customer COD cash retained by you. It remains owed and is recovered automatically from current or future payouts." breadcrumbs={[{ label: "Seller Finance" }, { label: "COD Collections" }]} />
    {items.some((row) => row.seller_action_required) && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <strong>Confirmation required</strong><p className="mt-1 text-xs leading-5">Confirm the full COD amount after delivery. Confirmation does not clear the amount owed; payout recovery remains automatic.</p>
    </div>}
    <DataTable columns={columns} data={filteredItems} loading={loading} totalCount={filteredItems.length}
      page={pagination.page} pageSize={pagination.pageSize}
      onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
      onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
      onSearch={(value) => { setSearch(value); setPagination((current) => ({ ...current, page: 1 })); }}
      onSort={() => {}} onRefresh={load} requiredModule="sellers/commissions"
      rowActions={(row) => row.status === "pending" ? [{ label: "Confirm cash retained", icon: <MdCheckCircle size={16} className="text-blue-600" />,
        requiredModule: "sellers/commissions", requiredAction: ACTIONS.UPDATE,
        onClick: () => setForm({ open: true, row, confirmed: false, notes: "" }) }] : []} />
    <DefaultModal isOpen={form.open} onClose={() => setForm(EMPTY_FORM)} title="Confirm COD cash retained" onSubmit={submit} submitButtonText={loading ? "Confirming..." : "Confirm cash retained"}>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4"><div className="text-xs font-medium uppercase text-gray-500">Full COD amount</div><div className="mt-1 text-xl font-semibold">{money(form.row?.expected_amount)}</div><p className="mt-2 text-xs text-gray-600">This amount was booked as owed at delivery and will be deducted from eligible payouts.</p></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.confirmed} onChange={(event) => setForm((current) => ({ ...current, confirmed: event.target.checked }))} /><span>I confirm that I collected and retained the full COD amount shown above from the customer.</span></label>
        <Input labelName="Notes (optional)" type="textarea" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Add an internal note" />
      </div>
    </DefaultModal>
  </div>;
}
