import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  StatusBadge,
  CustomerIdentity,
} from "../../../components/Shared";
import {
  approvePayment,
  getAdminPayments,
  rejectPayment,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import {
  formatDateTime12Hour,
  formatIndianNumber,
  formatLabel,
} from "../../../utils/formatters";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import { MdCheckCircle, MdVisibility, MdCancel } from "react-icons/md";
import { exportToExcelWorkbook } from "../../../_helpers/exportToCsv";
import {
  approvePaymentValidationSchema,
  rejectPaymentValidationSchema,
} from "../../../_helpers/validationSchemas";
const PROVIDERS = [
  "razorpay",
  "cod",
  "manual_bank_transfer",
  "manual_upi",
  "wallet_only",
];
const STATUSES = [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "partially_refunded",
  "refunded",
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const display = (value = "") => String(value || "N/A").replace(/_/g, " ");

const FILTER_FIELDS = [
  // { key: "orderId", type: "text", label: "Order #", width: "w-48" },
  // {
  //   key: "buyerId",
  //   type: "asyncDropdown",
  //   label: "Buyer",
  //   width: "w-52",
  //   load: (search) =>
  //     dropdownApi.getBuyers({
  //       keyWord: search,
  //       searchFields: "full_name,email",
  //     }),
  // },
  {
    key: "provider",
    type: "select",
    label: "Provider",
    options: PROVIDERS.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: STATUSES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const getInitialQuery = (key) =>
  new URLSearchParams(window.location.search).get(key) || "";
const getInitialPaymentFilters = () =>
  ["orderId", "buyerId", "provider", "status", "fromDate", "toDate"].reduce(
    (filters, key) => {
      const value = getInitialQuery(key);
      if (value) filters[key] = value;
      return filters;
    },
    {},
  );

const Payments = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.adminPaymentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: getInitialPaymentFilters(),
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailPayment, setDetailPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [decision, setDecision] = useState({
    open: false,
    type: "",
    payment: null,
  });

  const decisionFormik = useFormik({
    initialValues: { referenceId: "", reason: "" },
    validationSchema:
      decision.type === "approve"
        ? approvePaymentValidationSchema
        : rejectPaymentValidationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!decision.payment?.id) return;
      try {
        setLoading(true);
        const action =
          decision.type === "approve" ? approvePayment : rejectPayment;
        await dispatch(
          action({
            paymentId: decision.payment.id,
            referenceId: values.referenceId.trim(),
            reason: values.reason.trim(),
          }),
        ).unwrap();
        toast.success(
          decision.type === "approve" ? "Payment approved" : "Payment rejected",
        );
        setDecision({ open: false, type: "", payment: null });
        decisionFormik.resetForm();
        await fetchPayments();
      } catch (error) {
        toast.error(error?.message || error || "Failed to update payment");
      } finally {
        setLoading(false);
      }
    },
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getAdminPayments({
          ...params,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (error) {
      const message = error?.message || error || "Failed to load payments";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openDetail = useCallback(async (payment) => {
    setDetailPayment(payment);
    setDetailLoading(true);
    try {
      const response = await axiosProvider.get(
        ENDPOINTS.payments.detail(payment.id),
      );
      setDetailPayment(response?.data?.data || payment);
    } catch (requestError) {
      toast.error(
        requestError?.response?.data?.message ||
          "Failed to load payment detail",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const canManualDecision = (payment) =>
    ["manual_bank_transfer", "manual_upi", "cod"].includes(payment.provider) &&
    ["initiated", "authorized"].includes(payment.status);

  const columns = useMemo(
    () => [
      {
        key: "transaction_reference",
        label: "Payment",
        sortable: false,
        render: (_, row) => (
          <div>
            <div className="font-semibold text-gray-800">
              {display(row.provider)} payment
            </div>
            <div className="text-xs text-gray-400">
              <OrderLink
                orderId={row.orderId || row.order_id}
                orderNumber={row.orderNumber || row.order_number}
              />
            </div>
          </div>
        ),
      },
      {
        key: "buyer_id",
        label: "Buyer",
        sortable: true,
        render: (value, row) => {
          const name =
            row.buyerName ||
            row.buyer?.displayName ||
            row.buyer?.name ||
            row.buyerSnapshot?.name ||
            row.buyer_name;
          const email =
            row.buyerEmail ||
            row.buyer?.email ||
            row.buyerSnapshot?.email ||
            row.buyer_email;
          return (
            <CustomerIdentity
              row={row}
              userId={value}
              name={name}
              loginName={email}
            />
          );
        },
      },
      {
        key: "provider",
        label: "Provider",
        sortable: false,
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (value) => (
          <span className="block w-full text-center capitalize">
            {display(value)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (value) => <StatusBadge status={display(value)} dot />,
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (value, row) =>
          `${row.currency || "INR"} ${formatIndianNumber(value)}`,
      },
      {
        key: "created_at",
        label: "Date",
        sortable: false,
        render: (value) => formatDateTime12Hour(value, "N/A"),
      },
    ],
    [],
  );

  const handleExportPayments = useCallback(() => {
    if (!payload.list.length) {
      toast.info("No payments available to export.");
      return;
    }

    try {
      const exportColumns = [
        { key: "transaction_reference", label: "Payment" },
        { key: "buyerName", label: "Buyer Name" },
        { key: "provider", label: "Provider" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount" },
        { key: "created_at", label: "Date" },
      ];

      const exportRows = payload.list.map((row) => {
        const buyerName =
          row.buyerName ||
          row.buyer?.displayName ||
          row.buyer?.name ||
          row.buyerSnapshot?.name ||
          row.buyer_name ||
          "N/A";

        return {
          transaction_reference: row.provider
            ? `${display(row.provider)} payment`
            : "N/A",

          buyerName,

          provider: display(row.provider),

          status: display(row.status),

          amount: `${row.currency || "INR"} ${formatIndianNumber(row.amount)}`,

          created_at: formatDateTime12Hour(row.created_at, "N/A"),
        };
      });

      const exported = exportToExcelWorkbook(
        [
          {
            name: "Payments",
            title: "Payments",
            data: exportRows,
            columns: exportColumns,
          },
        ],
        "Payments.xlsx",
      );

      if (exported) {
        toast.success("Payments exported successfully.");
      } else {
        toast.error("Unable to export payments.");
      }
    } catch (error) {
      console.error("Payments export error:", error);
      toast.error("Failed to export payments.");
    }
  }, [payload.list]);

  return (
    <div>
      {/* <Loader loading={loading || detailLoading} /> */}
      <PageHeader
        title="Payments"
        subtitle="Reconcile online, COD, and manual payments"
        breadcrumbs={[{ label: "Payments & Finance" }, { label: "Payments" }]}
      />

      <DataTable
        columns={columns}
        data={payload.list}
        loading={loading}
        totalCount={payload.total || payload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search By Order Id"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchPayments}
        error={error}
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
        rowActions={(row) => {
          const actions = [
            {
              label: "View Details",
              icon: (
                <MdVisibility
                  aria-hidden="true"
                  size={16}
                  className="text-blue-600"
                />
              ),
              onClick: () => openDetail(row),
            },
          ];

          if (canManualDecision(row)) {
            actions.push({
              label: "Approve Payment",
              icon: (
                <MdCheckCircle
                  aria-hidden="true"
                  size={16}
                  className="text-blue-600"
                />
              ),
              requiredModule: "payments",
              requiredAction: ACTIONS.APPROVE,
              onClick: () =>
                (setDecision({
                  open: true,
                  type: "approve",
                  payment: row,
                }),
                decisionFormik.resetForm({
                  values: {
                    referenceId:
                      row.provider_payment_id || row.transaction_reference || "",
                    reason: "",
                  },
                })),
            });

            actions.push({
              label: "Reject Payment",
              icon: (
                <MdCancel
                  aria-hidden="true"
                  size={16}
                  className="text-red-600"
                />
              ),
              requiredModule: "payments",
              requiredAction: ACTIONS.APPROVE,
              onClick: () =>
                (setDecision({
                  open: true,
                  type: "reject",
                  payment: row,
                }), decisionFormik.resetForm()),
            });
          }

          return actions;
        }}
        requiredModule="payments"
        exportConfig={{
          onClick: handleExportPayments,
          label: "Export",
          disabled: loading || !payload.list.length,
        }}
      />

      <DefaultModal
        isOpen={Boolean(detailPayment)}
        onClose={() => setDetailPayment(null)}
        title="Payment Detail"
        isButtonView={false}
      >
        <div className="space-y-5" aria-busy={detailLoading}>
          <FormSection
            title="Payment Overview"
            description="Basic information about this payment."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="admin-label">Order</p>
                <OrderLink
                  orderId={detailPayment?.orderId || detailPayment?.order_id}
                  orderNumber={
                    detailPayment?.orderNumber || detailPayment?.order_number
                  }
                />
              </div>

              <div>
                <p className="admin-label">Customer</p>
                <p className="mt-1 text-sm text-gray-700">
                  {detailPayment?.buyerName ||
                    detailPayment?.buyer?.displayName ||
                    "Customer"}
                </p>
              </div>

              <div>
                <p className="admin-label">Email</p>
                <p className="mt-1 break-all text-sm text-gray-700">
                  {detailPayment?.buyer?.email || "Not available"}
                </p>
              </div>

              <div>
                <p className="admin-label">Provider</p>
                <p className="mt-1 text-sm font-medium capitalize text-gray-800">
                  {display(detailPayment?.provider)}
                </p>
              </div>

              <div>
                <p className="admin-label">Status</p>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      detailPayment?.status === "success" ||
                      detailPayment?.status === "completed" ||
                      detailPayment?.status === "paid"
                        ? "bg-green-50 text-green-700"
                        : detailPayment?.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : detailPayment?.status === "pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {display(detailPayment?.status)}
                  </span>
                </div>
              </div>

              <div>
                <p className="admin-label">Verification</p>
                <p className="mt-1 text-sm font-medium capitalize text-green">
                  {display(
                    detailPayment?.verification_method || "not verified",
                  )}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="mt-5 rounded-lg border border-[var(--admin-gold)]/20 bg-[var(--admin-gold-soft)]/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Payment Amount
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--admin-gold-dark)]">
                {detailPayment?.currency || "INR"}{" "}
                {formatIndianNumber(detailPayment?.amount)}
              </p>
            </div>

            <div className="mt-4">
              <p className="admin-label">Created</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatDateTime12Hour(detailPayment?.created_at, "N/A")}
              </p>
            </div>
          </FormSection>

          {(detailPayment?.provider_payment_id ||
            detailPayment?.transaction_reference) && (
            <FormSection
              title="Payment Reference"
              description="Reference details received from the payment provider."
            >
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-600">
                  Provider / Transaction Reference
                </p>

                <p className="mt-1 break-all font-mono text-sm text-blue-800">
                  {detailPayment.provider_payment_id ||
                    detailPayment.transaction_reference}
                </p>
              </div>
            </FormSection>
          )}

          {detailPayment?.failed_reason && (
            <FormSection
              title="Failure Information"
              description="Details about why the payment failed."
            >
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-xs font-medium text-red-600">
                  Failure Reason
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {detailPayment.failed_reason}
                </p>
              </div>
            </FormSection>
          )}

          {detailPayment?.metadata?.approvalReason && (
            <FormSection
              title="Approval Information"
              description="Additional approval information associated with this payment."
            >
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-600">
                  Approval Note
                </p>

                <p className="mt-1 text-sm leading-5 text-amber-700">
                  {detailPayment.metadata.approvalReason}
                </p>
              </div>
            </FormSection>
          )}
        </div>
      </DefaultModal>


<DefaultModal
  isOpen={decision.open}
  onClose={() =>
    (setDecision({ open: false, type: "", payment: null }),
    decisionFormik.resetForm())
  }
  title={
    decision.type === "approve" ? "Approve Payment" : "Reject Payment"
  }
  onSubmit={() => decisionFormik.handleSubmit()}
  submitButtonText={
    decision.type === "approve" ? "Approve Payment" : "Reject Payment"
  }
  closeButtonText="Cancel"
>
  <div className="space-y-5">
    <FormSection
      title="Payment Decision"
      description={
        decision.type === "approve"
          ? "Provide the collection or bank reference to approve this payment."
          : "Provide a reason for rejecting this payment."
      }
    >
      <div className="space-y-4">
        {decision.type === "approve" && (
          <div>
            <Input
              labelName="Collection / Bank Reference"
              name="referenceId"
              value={decisionFormik.values.referenceId}
              onChange={decisionFormik.handleChange}
              onBlur={decisionFormik.handleBlur}
              error={decisionFormik.touched.referenceId && decisionFormik.errors.referenceId}
              placeholder="Enter collection or bank reference"
              required
            />
          
          </div>
        )}

        <div>
          <Input
            type="textarea"
            labelName={
              decision.type === "reject"
                ? "Rejection Reason"
                : "Additional Notes (Optional)"
            }
            name="reason"
            minLength={3}
            maxLength={500}
            value={decisionFormik.values.reason}
            onChange={decisionFormik.handleChange}
            onBlur={decisionFormik.handleBlur}
            error={decisionFormik.touched.reason && decisionFormik.errors.reason}
            placeholder={
              decision.type === "reject"
                ? "Explain why this payment is being rejected"
                : "Add any relevant payment notes"
            }
            required={decision.type === "reject"}
          />
        
        </div>
      </div>
    </FormSection>
  </div>
</DefaultModal>

    </div>
  );
};

export default Payments;
