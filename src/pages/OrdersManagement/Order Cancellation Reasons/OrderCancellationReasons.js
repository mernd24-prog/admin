/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";
import { FaDownload, FaMoneyBillTransfer, FaRotate } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import TableData from "../../../components/Atoms/TableData/TableData";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Loader from "../../../components/Loader/Loader";
import Pagination from "../../../components/Pagination/Pagination";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import StatusBadge from "../../../components/Shared/StatusBadge";
import {
  completeCancellationRefund,
  getCancellationList,
  retryCancellation,
} from "../../../Redux/orderSlice";

const PAGE_SIZE = 10;
const statusOptions = ["processing", "refund_pending", "manual_review", "completed", "failed"]
  .map((value) => ({ value, label: value.replace(/_/g, " ") }));
const money = (value) => `₹ ${Number(value || 0).toFixed(2)}`;

const OrderCancellationReasons = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const payload = useSelector((state) => state.order?.cancellationListData?.data?.data || {});
  const list = payload.list || payload.items || [];
  const total = Number(payload.total || 0);
  const [filters, setFilters] = useState({ search: "", activationStatus: "", dateFrom: "", dateTo: "" });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [manualRefund, setManualRefund] = useState(null);
  const [manualForm, setManualForm] = useState({ referenceId: "", proofUrl: "", note: "" });

  const fetchCancellations = useCallback(async () => {
    try {
      setIsLoading(true);
      await dispatch(getCancellationList({
        status: filters.activationStatus || undefined,
        fromDate: filters.dateFrom || undefined,
        toDate: filters.dateTo || undefined,
        search: filters.search || undefined,
        limit: PAGE_SIZE,
        offset: Math.max(pageNo - 1, 0) * PAGE_SIZE,
      })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Failed to fetch cancellations");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, filters, pageNo]);

  useEffect(() => { fetchCancellations(); }, [fetchCancellations]);

  const runRetry = useCallback(async (cancellation) => {
    if (!window.confirm(`Retry recovery for ${cancellation.cancellation_number}?`)) return;
    try {
      setIsLoading(true);
      await dispatch(retryCancellation({ cancellationId: cancellation.id, note: "Retried from Admin cancellation queue" })).unwrap();
      toast.success("Cancellation recovery processed");
      await fetchCancellations();
    } catch (error) {
      toast.error(error?.message || error || "Cancellation retry failed");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, fetchCancellations]);

  const confirmManualRefund = useCallback(async () => {
    if (!manualForm.referenceId.trim()) {
      toast.error("Refund reference is required");
      return;
    }
    try {
      setIsLoading(true);
      await dispatch(completeCancellationRefund({
        cancellationId: manualRefund.id,
        ...manualForm,
      })).unwrap();
      toast.success("Manual refund confirmed");
      setManualRefund(null);
      setManualForm({ referenceId: "", proofUrl: "", note: "" });
      await fetchCancellations();
    } catch (error) {
      toast.error(error?.message || error || "Manual refund confirmation failed");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, fetchCancellations, manualForm, manualRefund]);

  const exportCsv = useCallback(() => {
    const header = ["Cancellation", "Order", "Scope", "Status", "Refund Status", "Refund Amount", "Reason", "Created"];
    const rows = list.map((item) => [
      item.cancellation_number, item.order_id, item.scope, item.status, item.refund_status,
      item.refund_amount, item.reason, item.created_at,
    ]);
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([[header, ...rows].map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `order-cancellations-${moment().format("YYYY-MM-DD")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [list]);

  const tableHeadings = ["Cancellation", "Order", "Scope", "Recovery", "Refund", "Reason", "Created", "Actions"];
  const tableRows = useMemo(() => list.map((item) => [
    <button type="button" className="font-medium text-[#2f6fed]" onClick={() => navigate(`/app/orders/view/${item.order_id}`)}>{item.cancellation_number}</button>,
    <span>{item.order_id}</span>,
    <span className="capitalize">{item.scope}</span>,
    <div className="space-y-1"><StatusBadge status={item.status} size="sm" dot /><div className="text-xs text-gray-500">Stock: {item.inventory_status} · Shipment: {item.shipment_status}</div></div>,
    <div className="space-y-1"><StatusBadge status={item.refund_status} size="sm" dot /><div className="text-xs font-medium">{money(item.refund_amount)}</div></div>,
    <span className="block max-w-[220px] whitespace-normal">{item.reason}</span>,
    <span>{item.created_at ? moment(item.created_at).format("DD-MM-YYYY HH:mm") : "N/A"}</span>,
    <div className="flex items-center gap-2">
      {["failed", "refund_pending"].includes(item.status) && (
        <PermissionGuard module="orders" action="update" hide>
          <button type="button" title="Retry cancellation recovery" className="rounded border p-2 text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => runRetry(item)}><FaRotate /></button>
        </PermissionGuard>
      )}
      {item.refund_status === "manual_review" && (
        <PermissionGuard module="orders" action="update" hide>
          <button type="button" title="Confirm manual refund" className="rounded border p-2 text-[#2ea84a] hover:bg-[#effbf4]" onClick={() => setManualRefund(item)}><FaMoneyBillTransfer /></button>
        </PermissionGuard>
      )}
    </div>,
  ]), [list, navigate, runRetry]);

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-3 max-w-7xl mx-auto">
        <h3 className="text-gray-500 text-sm font-semibold py-6"><Link to="/app/home">Home</Link> / <span className="text-[#181c32]">Order Cancellations</span></h3>
        <section className="bg-white p-2">
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={exportCsv} disabled={!list.length} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"><FaDownload /> Export</button>
          </div>
          <SearchComponent
            tableHeadings={tableHeadings} data={tableRows} selectedRow={selectedRow} setSelectedRow={setSelectedRow}
            loading={isLoading} filters={filters} setFilters={setFilters} isSearchShow isActivationStatus
            isApprovalOptions={false} isProduct={false} isUser={false} isActionButton={false} isSearchDown
            isStatusAction={false} isDelete={false} activationStatus="Cancellation Status" dateFrom dateTo
            applyFilters={() => { setPageNo(1); fetchCancellations(); }}
            handleSearchRemove={() => { setFilters({ search: "", activationStatus: "", dateFrom: "", dateTo: "" }); setPageNo(1); }}
            activationStatusOptions={statusOptions}
            handleFilterChange={(field, option) => { setFilters((prev) => ({ ...prev, [field]: option?.value || "" })); setPageNo(1); }}
          />
          <div className="bg-white border border-[#E6E6E6]">
            <TableData Heading="Order Cancellations" tableHeadings={tableHeadings} data={tableRows} showSearch placeholder="Search cancellation, order, or reason" showFilter={false} showSummary={false} showAddButton={false} isHeaderCheckbox={false} totalData={total} />
          </div>
        </section>
        {total > PAGE_SIZE && <Pagination totalPages={Math.ceil(total / PAGE_SIZE)} currentPage={pageNo} onPageChange={setPageNo} />}
      </div>

      <DefaultModal isOpen={Boolean(manualRefund)} onClose={() => setManualRefund(null)} title="Confirm Manual Refund" onSubmit={confirmManualRefund} loading={isLoading}>
        <div className="space-y-4">
          <div className="rounded-md border bg-gray-50 p-3 text-sm">Refund due: <strong>{money(manualRefund?.refund_amount)}</strong></div>
          <Input labelName="Refund Reference" value={manualForm.referenceId} onChange={(event) => setManualForm((prev) => ({ ...prev, referenceId: event.target.value }))} name="referenceId" placeholder="Bank / UPI / transaction reference" maxLength={180} required />
          <Input labelName="Proof URL" value={manualForm.proofUrl} onChange={(event) => setManualForm((prev) => ({ ...prev, proofUrl: event.target.value }))} name="proofUrl" placeholder="https://..." maxLength={1000} />
          <Input type="textarea" labelName="Note" value={manualForm.note} onChange={(event) => setManualForm((prev) => ({ ...prev, note: event.target.value }))} name="note" placeholder="Reconciliation note" maxLength={1000} />
        </div>
      </DefaultModal>
    </>
  );
};

export default OrderCancellationReasons;
