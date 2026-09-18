import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdCheckCircle, MdRefresh } from "react-icons/md";
import { toast } from "sonner";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  OrderLink,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import FormToggleRow from "../../../components/Atoms/FormToggleRow/FormToggleRow";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormSection from "../../../components/Atoms/FormSection/FormSection";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");

export default function CodCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState({
    open: false,
    row: null,
    amount: "",
    referenceId: "",
    notes: "",
    markRemitted: false,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(
        ENDPOINTS.payments.codCollections,
      );
      const data = response?.data?.data;
      setItems(data?.items || data?.list || data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load COD collections",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verify = useCallback(async () => {
    if (!decision.row?.id || String(decision.referenceId).trim().length < 3) {
      toast.error("Collection reference is required");
      return;
    }
    try {
      setLoading(true);
      await axiosProvider.post(
        ENDPOINTS.payments.verifyCodCollection(decision.row.id),
        {
          collectedAmount: Number(
            decision.amount ||
              decision.row.collected_amount ||
              decision.row.expected_amount,
          ),
          referenceId: decision.referenceId,
          notes: decision.notes,
          markRemitted: decision.markRemitted,
        },
      );
      toast.success(
        decision.markRemitted
          ? "COD remittance verified"
          : "COD collection verified",
      );
      setDecision({
        open: false,
        row: null,
        amount: "",
        referenceId: "",
        notes: "",
        markRemitted: false,
      });
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to verify COD collection",
      );
    } finally {
      setLoading(false);
    }
  }, [decision, load]);

  const columns = useMemo(
    () => [
      {
        key: "order_number",
        label: "Order / Shipment",
        render: (_, row) => (
          <div>
            <OrderLink
              orderId={row.order_id || row.orderId}
              orderNumber={row.order_number || row.orderNumber}
            />
            <div className="text-xs text-gray-500">
              {row.awb_number || "AWB not assigned"}
            </div>
          </div>
        ),
      },
      {
        key: "seller_id",
        label: "Seller",
        render: (value) => <span className="text-xs">{value}</span>,
      },
      {
        key: "collection_mode",
        label: "Collection",
        render: (value, row) => (
          <div>
            <div className="capitalize">{label(value)}</div>
            <div className="text-xs text-gray-500">
              By: {label(row.collected_by)}
            </div>
          </div>
        ),
      },
      {
        key: "expected_amount",
        label: "Expected / Collected",
        render: (value, row) => (
          <div>
            <div>{money(value)}</div>
            <div className="text-xs text-gray-500">
              {money(row.collected_amount)}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (value) => <StatusBadge status={value} label={label(value)} />,
      },
      {
        key: "reference_id",
        label: "Reference",
        render: (value) => value || "-",
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) =>
          ["pending", "submitted"].includes(row.status) ? (
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() =>
                setDecision({
                  open: true,
                  row,
                  amount: row.collected_amount || row.expected_amount || "",
                  referenceId: row.reference_id || "",
                  notes: row.notes || "",
                  markRemitted: false,
                })
              }
            >
              <MdCheckCircle size={15} /> Verify
            </button>
          ) : (
            "-"
          ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="COD Collections"
        subtitle="Verify seller-collected COD payments before settlement"
        breadcrumbs={[
          { label: "Payments & Finance" },
          { label: "COD Collections" },
        ]}
        actions={
          <button type="button" onClick={load}>
            <MdRefresh size={17} /> Refresh
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        totalCount={items.length}
        page={1}
        pageSize={100}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onSearch={() => {}}
        onSort={() => {}}
        onRefresh={load}
        requiredModule="payments"
      />
   <DefaultModal
  isOpen={decision.open}
  onClose={() =>
    setDecision({
      open: false,
      row: null,
      amount: "",
      referenceId: "",
      notes: "",
      markRemitted: false,
    })
  }
  title="Verify COD Collection"
  onSubmit={verify}
  submitButtonText="Verify Collection"
  closeButtonText="Cancel"
  isButtonView={true}
>
  <div className="space-y-5">
    {/* ==================== Collection Information ==================== */}
    <FormSection
      title="Collection Information"
      description="Verify the cash collected for this COD order."
    >
      <div className="space-y-4">
        {/* Expected COD */}
        <div className="rounded-lg border border-[var(--admin-line)] bg-gray-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Expected COD Amount
          </div>

          <div className="mt-1 text-lg font-semibold text-[var(--admin-ink)]">
            {money(decision.row?.expected_amount)}
          </div>
        </div>

        {/* Collected Amount */}
        <FormInput
          label="Collected Amount"
          name="collectedAmount"
          type="number"
          value={decision.amount}
          onChange={(event) =>
            setDecision((prev) => ({
              ...prev,
              amount: event.target.value,
            }))
          }
          placeholder="Enter collected amount"
          required
        />

        {/* Collection Reference */}
        <FormInput
          label="Collection / Remittance Reference"
          name="referenceId"
          value={decision.referenceId}
          onChange={(event) =>
            setDecision((prev) => ({
              ...prev,
              referenceId: event.target.value,
            }))
          }
          placeholder="Enter collection or remittance reference"
          required
        />

        {/* Notes */}
        <FormInput
          label="Notes"
          name="notes"
          type="textarea"
          value={decision.notes}
          onChange={(event) =>
            setDecision((prev) => ({
              ...prev,
              notes: event.target.value,
            }))
          }
          placeholder="Add any additional notes..."
        />
      </div>
    </FormSection>

    {/* ==================== Remittance Settings ==================== */}
    {decision.row?.collected_by === "seller" && (
      <FormSection
        title="Remittance Confirmation"
        description="Confirm whether the platform has received the collected cash from the seller."
      >
        <FormToggleRow
          title="Mark as Remitted"
          description="Platform has actually received the full cash amount from the seller."
          isToggle={decision.markRemitted}
          handleClick={() =>
            setDecision((prev) => ({
              ...prev,
              markRemitted: !prev.markRemitted,
            }))
          }
        />

        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs leading-5 text-amber-700">
            Leave this disabled when you are only verifying that the seller
            collected cash from the customer.
          </p>
        </div>
      </FormSection>
    )}
  </div>
</DefaultModal>
    </div>
  );
}
