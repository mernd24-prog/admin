import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdReceiptLong, MdVisibility } from "react-icons/md";

import {
  ConfirmModal,
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  UserLink,
} from "../../components/Shared";

import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";

import {
  createTaxCreditNote,
  createTaxInvoice,
  getTaxCreditNotes,
  getTaxInvoices,
  getTaxReports,
} from "../../Redux/adminCoreSlice";

import { ACTIONS } from "../../_helpers/usePermission";
import { useListPage } from "../../hooks/useListPage";
import useStoreNames from "../../hooks/useStoreNames";

import { formatDateTime12Hour } from "../../utils/formatters";
import { resolveStoreName } from "../../utils/storeNameUtils";

import { dropdownApi } from "../../_helpers/dropdownApi";

import FormSection from "../../components/Atoms/FormSection/FormSection";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import FormSelectGroup from "../../components/Atoms/FormSelectGroup/FormSelectGroup";
import Tabs from "../../components/Shared/Tabs";

const FILTER_FIELDS = [
  { key: "orderId", type: "text", label: "Order #", width: "w-56" },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller Store name",
    load: (search) =>
      dropdownApi.getStoreName({
        keyWord: search,
        searchFields: "organizationName,businessName,legalBusinessName",
      }),
  },
  {
    key: "referenceType",
    type: "select",
    label: "Credit Ref",
    width: "w-40",
    options: [
      { value: "manual", label: "Manual" },
      { value: "cancellation", label: "Cancellation" },
      { value: "return", label: "Return" },
      { value: "refund", label: "Refund" },
    ],
  },
  {
    key: "taxComponent",
    type: "select",
    label: "Component",
    width: "w-36",
    options: [
      { value: "cgst", label: "CGST" },
      { value: "sgst", label: "SGST" },
      { value: "igst", label: "IGST" },
      { value: "tcs", label: "TCS" },
    ],
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const EMPTY_INVOICE = { orderId: "" };

const EMPTY_CREDIT = {
  orderId: "",
  invoiceId: "",
  referenceType: "manual",
  referenceId: "",
  taxableAmount: "",
  taxAmount: "",
  reason: "",
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const money = (value) => Number(value || 0).toFixed(2);

const getListData = (payload = {}) => {
  const data = payload?.data?.data;

  if (Array.isArray(data)) {
    return { list: data, total: data.length };
  }

  return {
    list: data?.list || data?.items || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const TaxCompliance = () => {
  const dispatch = useDispatch();

  // Global store-name mapping
  const { storeNameMap } = useStoreNames();

  const selector = useSelector((state) => state.adminCore);

  const invoices = getListData(selector.taxInvoicesData);
  const creditNotes = getListData(selector.taxCreditNotesData);

  const reportEntries = useMemo(
    () => selector?.taxReportsData?.data?.data?.entries || [],
    [selector?.taxReportsData],
  );

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "issued_at",
    defaultSortDir: "desc",
  });

  const { toQueryParams } = list;

  const [activeTab, setActiveTab] = useState("invoices");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE);
  const [creditForm, setCreditForm] = useState(EMPTY_CREDIT);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = toQueryParams();

      const paging = {
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      };

      await Promise.all([
        dispatch(getTaxInvoices({ ...params, ...paging })).unwrap(),
        dispatch(getTaxCreditNotes({ ...params, ...paging })).unwrap(),
        dispatch(getTaxReports({ ...params, limit: 200, offset: 0 })).unwrap(),
      ]);
    } catch (requestError) {
      const message =
        requestError?.message || requestError || "Failed to fetch tax data";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportRows = useMemo(() => {
    if (activeTab === "creditNotes") return creditNotes.list;
    if (activeTab === "report") return reportEntries;
    return invoices.list;
  }, [activeTab, creditNotes.list, invoices.list, reportEntries]);

  const createInvoice = useCallback(async () => {
    if (!invoiceForm.orderId.trim()) {
      toast.error("Order ID is required");
      return;
    }

    try {
      setLoading(true);

      await dispatch(
        createTaxInvoice({ orderId: invoiceForm.orderId.trim() }),
      ).unwrap();

      toast.success("Invoice generated successfully");

      setInvoiceModal(false);
      setConfirmAction(null);
      setInvoiceForm(EMPTY_INVOICE);

      await fetchData();
    } catch (requestError) {
      toast.error(
        requestError?.message || requestError || "Failed to generate invoice",
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchData, invoiceForm.orderId]);

  const createCredit = useCallback(async () => {
    if (!creditForm.orderId.trim() || !creditForm.taxableAmount) {
      toast.error("Order ID and taxable amount are required");
      return;
    }

    if (Number(creditForm.taxableAmount) <= 0) {
      toast.error("Taxable amount must be greater than zero");
      return;
    }

    try {
      setLoading(true);

      await dispatch(
        createTaxCreditNote({
          ...creditForm,
          orderId: creditForm.orderId.trim(),
          referenceId: creditForm.referenceId || creditForm.orderId.trim(),
          taxableAmount: Number(creditForm.taxableAmount),
          ...(creditForm.invoiceId
            ? { invoiceId: creditForm.invoiceId.trim() }
            : {}),
          ...(creditForm.taxAmount
            ? { taxAmount: Number(creditForm.taxAmount) }
            : {}),
        }),
      ).unwrap();

      toast.success("Credit note generated successfully");

      setCreditModal(false);
      setConfirmAction(null);
      setCreditForm(EMPTY_CREDIT);

      await fetchData();
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          requestError ||
          "Failed to generate credit note",
      );
    } finally {
      setLoading(false);
    }
  }, [creditForm, dispatch, fetchData]);

  // ==================== Invoice Columns ====================

  const invoiceColumns = useMemo(
    () => [
      {
        key: "invoice_number",
        label: "Invoice",
        sortable: true,
        render: (value) => <span className="font-mono text-xs">{value}</span>,
      },
      {
        key: "order_id",
        label: "Order",
        render: (value, row) => (
          <OrderLink
            orderId={value || row.orderId}
            orderNumber={row.orderNumber || row.order_number}
          />
        ),
      },
      {
        key: "organization_id",
        label: "Store Name",
        render: (_, row) => {
          const { name, id } = resolveStoreName(row, storeNameMap);

          return (
            <span className="font-medium text-[var(--admin-navy)]" title={id}>
              {name}
            </span>
          );
        },
      },
      {
        key: "buyer_id",
        label: "Customer",
        render: (_, row) => {
          const buyer = row?.metadata?.buyer;

          const firstName = buyer?.profile?.firstName || "";
          const lastName = buyer?.profile?.lastName || "";

          const customerName =
            [firstName, lastName].filter(Boolean).join(" ") ||
            buyer?.shippingAddress?.fullName ||
            "N/A";

          const customerEmail = buyer?.email || "N/A";

          return (
            <div className="flex min-w-[160px] flex-col gap-1">
              <span
                className="text-sm font-medium text-[var(--admin-navy)]"
                title={customerName}
              >
                {customerName}
              </span>

              <span className="text-xs text-gray-500" title={customerEmail}>
                {customerEmail}
              </span>
            </div>
          );
        },
      },
      ,
      {
        key: "taxable_amount",
        label: "Taxable",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-xs">₹ {money(value)}</span>
        ),
      },
      {
        key: "cgst_amount",
        label: "CGST",
        render: (value) => (
          <span className="font-mono text-xs">₹ {money(value)}</span>
        ),
      },
      {
        key: "sgst_amount",
        label: "SGST",
        render: (value) => (
          <span className="font-mono text-xs">₹ {money(value)}</span>
        ),
      },
      {
        key: "igst_amount",
        label: "IGST",
        render: (value) => (
          <span className="font-mono text-xs">₹ {money(value)}</span>
        ),
      },
      {
        key: "total_amount",
        label: "Total",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm font-medium">
            ₹ {money(value)}
          </span>
        ),
      },
      {
        key: "issued_at",
        label: "Issued",
        sortable: true,
        render: (value) => (
          <span className="text-xs text-gray-500">
            {formatDateTime12Hour(value, "N/A")}
          </span>
        ),
      },
    ],
    [storeNameMap],
  );

  // ==================== Credit Note Columns ====================

  const creditColumns = useMemo(
    () => [
      {
        key: "credit_note_number",
        label: "Credit Note",
        sortable: true,
        render: (value) => <span className="font-mono text-xs">{value}</span>,
      },
      {
        key: "order_id",
        label: "Order",
        render: (value, row) => (
          <OrderLink
            orderId={value || row.orderId}
            orderNumber={row.orderNumber || row.order_number}
          />
        ),
      },
      {
        key: "organization_id",
        label: "Store Name",
        render: (_, row) => {
          const { name, id } = resolveStoreName(row, storeNameMap);

          return (
            <span className="font-medium text-[var(--admin-navy)]" title={id}>
              {name}
            </span>
          );
        },
      },
      {
        key: "reference",
        label: "Reference",
        render: (_, row) => (
          <span className="text-xs text-gray-500">
            {[
              row.reference_type,
              row.reference_id
                ? `#${String(row.reference_id).slice(-8)}`
                : null,
            ]
              .filter(Boolean)
              .join(" ") || "—"}
          </span>
        ),
      },
      {
        key: "taxable_amount",
        label: "Taxable",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-xs">₹ {money(value)}</span>
        ),
      },
      {
        key: "tax_amount",
        label: "Tax",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-xs">₹ {money(value)}</span>
        ),
      },
      {
        key: "total_amount",
        label: "Total",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm font-medium">
            ₹ {money(value)}
          </span>
        ),
      },
      {
        key: "issued_at",
        label: "Issued",
        sortable: true,
        render: (value) => (
          <span className="text-xs text-gray-500">
            {formatDateTime12Hour(value, "N/A")}
          </span>
        ),
      },
    ],
    [storeNameMap],
  );

  // ==================== Tax Report Columns ====================

  const reportColumns = useMemo(
    () => [
      {
        key: "organization_id",
        label: "Store Name",
        render: (_, row) => {
          const { name, id } = resolveStoreName(row, storeNameMap);

          return (
            <span className="font-medium text-[var(--admin-navy)]" title={id}>
              {name}
            </span>
          );
        },
      },
      {
        key: "tax_component",
        label: "Component",
        render: (value) => (
          <span className="font-medium">{firstDefined(value, "N/A")}</span>
        ),
      },
      {
        key: "entry_type",
        label: "Entry Type",
        render: (value) => (
          <span className="text-sm text-gray-600">
            {firstDefined(value, "N/A")}
          </span>
        ),
      },
      {
        key: "entry_count",
        label: "Count",
        render: (value) => (
          <span className="font-mono text-sm">{value || 0}</span>
        ),
      },
      {
        key: "total_amount",
        label: "Amount",
        render: (value) => (
          <span className="font-mono text-sm font-medium">
            ₹ {money(value)}
          </span>
        ),
      },
    ],
    [storeNameMap],
  );

  const activeColumns =
    activeTab === "creditNotes"
      ? creditColumns
      : activeTab === "report"
        ? reportColumns
        : invoiceColumns;

  const activeRows =
    activeTab === "creditNotes"
      ? creditNotes.list
      : activeTab === "report"
        ? reportEntries
        : invoices.list;

  const activeTotal =
    activeTab === "creditNotes"
      ? creditNotes.total
      : activeTab === "report"
        ? reportEntries.length
        : invoices.total;

  const rowActions = useCallback(
    (row) => {
      if (activeTab === "invoices") {
        return [
          {
            label: "View",
            icon: (
              <MdVisibility
                aria-hidden="true"
                size={16}
                className="text-blue-600"
              />
            ),
            onClick: () => setSelectedDoc({ type: "invoice", row }),
          },
        ];
      }

      if (activeTab === "creditNotes") {
        return [
          {
            label: "View",
            icon: (
              <MdVisibility
                aria-hidden="true"
                size={16}
                className="text-blue-600"
              />
            ),
            onClick: () => setSelectedDoc({ type: "credit note", row }),
          },
        ];
      }

      return [];
    },
    [activeTab],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tax Documents"
        subtitle="Manage tax compliance invoices, credit notes, and tax summaries"
        breadcrumbs={[
          { label: "Invoices & Taxation" },
          { label: "Tax Documents" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGuard module="tax" action={ACTIONS.UPDATE} hide>
              <button type="button" onClick={() => setInvoiceModal(true)}>
                <MdReceiptLong aria-hidden="true" size={16} /> Generate Invoice
              </button>

              <button type="button" onClick={() => setCreditModal(true)}>
                <MdAdd aria-hidden="true" size={16} /> Credit Note
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <Tabs
        tabs={[
          { value: "invoices", label: "Invoices" },
          { value: "creditNotes", label: "Credit Notes" },
          { value: "report", label: "Tax Report" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <DataTable
        columns={activeColumns}
        data={activeRows}
        loading={loading}
        totalCount={activeTotal}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search invoice, credit note, order, or reference"
        onSort={activeTab === "report" ? undefined : list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchData}
        error={error}
        emptyText="No tax documents found."
        requiredModule="tax"
        rowActions={activeTab !== "report" ? rowActions : undefined}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
        exportConfig={{
          filename: `tax-${activeTab}`,
          columns: activeColumns,
          data: exportRows,
        }}
      />

      {/* Generate Invoice Modal */}
      <DefaultModal
        isOpen={invoiceModal}
        onClose={() => {
          setInvoiceModal(false);
          setInvoiceForm({ orderId: "" });
        }}
        title="Generate Invoice"
        submitButtonText={loading ? "Generating..." : "Generate"}
        closeButtonText="Cancel"
        onSubmit={(e) => {
          e.preventDefault();
          setConfirmAction("invoice");
        }}
        isButtonView={true}
      >
        <div className="space-y-5">
          <FormSection
            title="Invoice Information"
            description="Enter the order details to generate the invoice."
          >
            <div className="grid grid-cols-1 gap-4">
              <FormInput
                label="Order ID"
                name="orderId"
                value={invoiceForm.orderId}
                onChange={(event) =>
                  setInvoiceForm({
                    orderId: event.target.value,
                  })
                }
                placeholder="Enter order ID"
                required
                error={!invoiceForm.orderId ? "" : undefined}
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>

      {/* Create Credit Note Modal */}
      <DefaultModal
        isOpen={creditModal}
        onClose={() => setCreditModal(false)}
        title="Create Credit Note"
        submitButtonText="Create"
        closeButtonText="Cancel"
        onSubmit={() => setConfirmAction("credit")}
        isButtonView={true}
      >
        <div className="space-y-5">
          <FormSection
            title="Credit Note Information"
            description="Enter the order and reference details for the credit note."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormInput
                  label="Order ID"
                  name="orderId"
                  value={creditForm.orderId}
                  onChange={(event) =>
                    setCreditForm((prev) => ({
                      ...prev,
                      orderId: event.target.value,
                    }))
                  }
                  placeholder="Enter order ID"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <FormInput
                  label="Invoice ID"
                  name="invoiceId"
                  value={creditForm.invoiceId}
                  onChange={(event) =>
                    setCreditForm((prev) => ({
                      ...prev,
                      invoiceId: event.target.value,
                    }))
                  }
                  placeholder="Optional invoice ID"
                />
              </div>

              <FormSelectGroup
                label="Reference Type"
                name="referenceType"
                value={creditForm.referenceType}
                options={[
                  { label: "Manual", value: "manual" },
                  { label: "Cancellation", value: "cancellation" },
                  { label: "Return", value: "return" },
                  { label: "Refund", value: "refund" },
                ]}
                onChange={(selectedOption) =>
                  setCreditForm((prev) => ({
                    ...prev,
                    referenceType:
                      selectedOption?.value || selectedOption || "manual",
                  }))
                }
                placeholder="Select reference type"
              />

              <FormInput
                label="Reference ID"
                name="referenceId"
                value={creditForm.referenceId}
                onChange={(event) =>
                  setCreditForm((prev) => ({
                    ...prev,
                    referenceId: event.target.value,
                  }))
                }
                placeholder="Optional reference ID"
              />
            </div>
          </FormSection>

          <FormSection
            title="Amount Details"
            description="Enter the taxable and applicable tax amounts for the credit note."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Taxable Amount"
                name="taxableAmount"
                type="number"
                min="0"
                value={creditForm.taxableAmount}
                onChange={(event) =>
                  setCreditForm((prev) => ({
                    ...prev,
                    taxableAmount: event.target.value,
                  }))
                }
                placeholder="0.00"
                required
              />

              <FormInput
                label="Tax Amount"
                name="taxAmount"
                type="number"
                min="0"
                value={creditForm.taxAmount}
                onChange={(event) =>
                  setCreditForm((prev) => ({
                    ...prev,
                    taxAmount: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </FormSection>

          <FormSection
            title="Additional Information"
            description="Provide the reason for creating this credit note."
          >
            <FormInput
              label="Reason"
              name="reason"
              type="textarea"
              rows={3}
              value={creditForm.reason}
              onChange={(event) =>
                setCreditForm((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              placeholder="Enter the reason for this credit note..."
            />
          </FormSection>
        </div>
      </DefaultModal>

      {/* Document Details Modal */}
      <DefaultModal
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        title={`${selectedDoc?.type || "Document"} Detail`}
      >
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(selectedDoc?.row || {}, null, 2)}
        </pre>
      </DefaultModal>

      {/* Invoice Confirmation */}
      <ConfirmModal
        open={confirmAction === "invoice"}
        onClose={() => setConfirmAction(null)}
        onConfirm={createInvoice}
        title="Generate invoice?"
        message="The invoice will be generated from the immutable order snapshot."
        variant="warning"
        confirmLabel="Generate invoice"
        loading={loading}
      />

      {/* Credit Note Confirmation */}
      <ConfirmModal
        open={confirmAction === "credit"}
        onClose={() => setConfirmAction(null)}
        onConfirm={createCredit}
        title="Create credit note?"
        message="This will create tax reversal ledger entries from the original invoice/order snapshot."
        variant="warning"
        confirmLabel="Create credit note"
        loading={loading}
      />
    </div>
  );
};

export default TaxCompliance;
