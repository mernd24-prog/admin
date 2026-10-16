import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdEdit } from "react-icons/md";

import { dropdownApi } from "../../../_helpers/dropdownApi";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import FormSection from "../../../components/Atoms/FormSection/FormSection";

import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
  SellerIdentity,
} from "../../../components/Shared";

import {
  getNegativeBalances,
  resolveNegativeBalance,
} from "../../../Redux/sellerCommissionsSlice";

import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import {
  formatDateTime12Hour,
  formatIndianNumber,
  formatLabel,
} from "../../../utils/formatters";
import { negativeBalanceRecoverySchema } from "../../../_helpers/validationSchemas";
import { exportToExcelWorkbook } from "../../../_helpers/exportToCsv";

const NEGATIVE_BALANCE_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "completed",
];

const RECOVERY_ACTIONS = [
  {
    value: "collected_from_seller",
    label: "Record external payment",
    description:
      "Use only when the seller paid separately by bank transfer, UPI, or another verified method.",
  },
  {
    value: "platform_write_off",
    label: "Write off remaining amount",
    description:
      "Stop recovery without collecting the balance. This should require an approved business reason.",
  },
];

const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller Store name",
    width: "w-52",
    load: (search) =>
      dropdownApi.getStoreName({
        keyWord: search,
        searchFields: "organizationName,businessName,legalBusinessName",
      }),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: NEGATIVE_BALANCE_STATUSES.map((status) => ({
      value: status,
      label: formatLabel(status),
    })),
  },
];

const EMPTY_ACTION = {
  open: false,
  settlement: null,
};

const INITIAL_FORM_VALUES = {
  resolveAction: "collected_from_seller",
  referenceId: "",
  note: "",
};

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;

  if (Array.isArray(data)) {
    return {
      list: data,
      total: data.length,
    };
  }

  return {
    list: data?.items || data?.list || data || [],
    total: Number(
      data?.total || data?.items?.length || data?.list?.length || 0,
    ),
  };
};

const valueOf = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
      return row[key];
    }
  }

  return 0;
};

const settlementId = (row) => row?._id || row?.id || row?.settlementId;

const NegativeBalances = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.sellerCommissions);
  const payload = unwrapList(selector.negativeBalancesData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const { toQueryParams } = list;

  const [sellerMap, setSellerMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState(EMPTY_ACTION);
  const [confirmAction, setConfirmAction] = useState({ open: false });

  const formik = useFormik({
    initialValues: INITIAL_FORM_VALUES,
    validationSchema: negativeBalanceRecoverySchema,
    validateOnBlur: true,
    validateOnChange: true,

    onSubmit: async (values) => {
      if (!settlementId(action.settlement)) {
        toast.error("Settlement ID is missing");
        return;
      }

      const isExternalPayment =
        values.resolveAction === "collected_from_seller";

      const amount = formatIndianNumber(
        action.settlement?.remainingAmount ?? action.settlement?.net_amount,
      );

      setConfirmAction({
        open: true,
        title: isExternalPayment
          ? "Confirm external payment?"
          : "Confirm write-off?",
        message: isExternalPayment
          ? `Confirm that ${amount} was received outside the payout system. This closes the amount owed.`
          : `This permanently stops recovery of ${amount}. The amount will not be collected from this seller.`,
      });
    },
  });

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = toQueryParams();

      await dispatch(
        getNegativeBalances({
          ...params,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (requestError) {
      const message =
        requestError?.message ||
        requestError ||
        "Failed to load negative balances";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    const loadSellers = async () => {
      try {
        const sellers = await dropdownApi.getSellers({
          limit: 100,
        });

        const map = {};

        (sellers || []).forEach((seller) => {
          if (seller?.value) {
            map[seller.value] = seller.label;
          }
        });

        setSellerMap(map);
      } catch (requestError) {
        console.error("Failed to load sellers", requestError);
      }
    };

    loadSellers();
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const openManageRecovery = useCallback(
    (row) => {
      setAction({
        open: true,
        settlement: row,
      });

      formik.resetForm({
        values: INITIAL_FORM_VALUES,
      });
    },
    [formik.resetForm],
  );

  const closeManageRecovery = useCallback(() => {
    setAction(EMPTY_ACTION);
    formik.resetForm({
      values: INITIAL_FORM_VALUES,
    });
  }, [formik.resetForm]);

  const handleRecoveryActionChange = useCallback(
    async (nextAction) => {
      // Update the selected recovery action and validate it immediately.
      await formik.setFieldValue("resolveAction", nextAction, true);

      // Clear the reference when a write-off does not require it.
      if (nextAction === "platform_write_off") {
        await formik.setFieldValue("referenceId", "", true);
        formik.setFieldTouched("referenceId", false, false);
      } else {
        // Revalidate the reference when switching back to external payment.
        await formik.validateField("referenceId");
      }

      // Refresh validation for the note under the selected action.
      await formik.validateField("note");
    },
    [formik.setFieldValue, formik.setFieldTouched, formik.validateField],
  );

  const executeAction = useCallback(async () => {
    try {
      setLoading(true);

      await dispatch(
        resolveNegativeBalance({
          settlementId: settlementId(action.settlement),
          id: settlementId(action.settlement),
          action: formik.values.resolveAction,
          referenceId: formik.values.referenceId.trim() || undefined,
          note: formik.values.note.trim(),
        }),
      ).unwrap();

      toast.success(
        formik.values.resolveAction === "collected_from_seller"
          ? "External seller payment recorded"
          : "Remaining amount written off",
      );

      setAction(EMPTY_ACTION);
      formik.resetForm({
        values: INITIAL_FORM_VALUES,
      });
      setConfirmAction({ open: false });

      await fetchBalances();
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          requestError ||
          "Failed to resolve negative balance",
      );
    } finally {
      setLoading(false);
    }
  }, [
    action.settlement,
    dispatch,
    fetchBalances,
    formik.values.resolveAction,
    formik.values.referenceId,
    formik.values.note,
    formik.resetForm,
  ]);

  const columns = useMemo(
    () => [
      {
        key: "settlementId",
        label: "Settlement",
        sortable: true,
        render: (_, row) => (
          <div>
            <div className="font-semibold text-gray-800">
              {row.settlementNumber || settlementId(row)}
            </div>

            {row.settlementNumber && (
              <div className="font-mono text-xs text-gray-400">
                {settlementId(row)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "sellerId",
        label: "Seller",
        sortable: true,
        render: (_, row) => {
          const sellerIdValue = row.sellerId || row.seller_id;

          const name =
            row.sellerName ||
            row.seller?.name ||
            row.seller?.businessName ||
            sellerMap[sellerIdValue];

          const email = row.sellerEmail || row.seller?.email;

          return (
            <SellerIdentity
              row={row}
              sellerId={sellerIdValue}
              storeName={name}
              loginName={email}
            />
          );
        },
      },
      {
        key: "liabilityType",
        label: "Type / Order",
        render: (value, row) => (
          <div>
            <div className="text-sm font-medium text-gray-800">
              {value === "seller_collected_cod"
                ? "Seller-collected COD"
                : "Other adjustment"}
            </div>

            {row.orderId && (
              <div className="text-xs text-gray-500">Order: {row.orderId}</div>
            )}
          </div>
        ),
      },
      {
        key: "negativeAmount",
        label: "Amount originally owed",
        sortable: true,
        render: (value, row) =>
          formatIndianNumber(
            valueOf(
              { value, ...row },
              "value",
              "originalLiabilityAmount",
              "balance",
              "net_amount",
              "netAmount",
              "amount",
            ),
          ),
      },
      {
        key: "remainingAmount",
        label: "Still owed",
        sortable: false,
        render: (value, row) => (
          <div>
            <div className="font-semibold text-red-600">
              {formatIndianNumber(
                value ??
                  row.remainingAmount ??
                  row.net_amount ??
                  row.netAmount ??
                  0,
              )}
            </div>

            {Number(row.recoveredAmount || 0) > 0 && (
              <div className="mt-1 text-xs text-emerald-600">
                {formatIndianNumber(row.recoveredAmount)} already recovered
              </div>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => (
          <StatusBadge
            status={value}
            label={value === "pending" ? "Auto recovery active" : undefined}
            dot
          />
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (value, row) => {
          const createdAt = valueOf(
            { value, ...row },
            "value",
            "created_at",
            "createdAt",
          );

          return formatDateTime12Hour(createdAt, "N/A");
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => {
          if (row.status === "completed") return null;

          return (
            <PermissionGuard
              module="sellers/commissions"
              action={ACTIONS.UPDATE}
              hide
            >
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1"
                onClick={() => openManageRecovery(row)}
              >
                <MdEdit size={15} />
                Manage recovery
              </button>
            </PermissionGuard>
          );
        },
      },
    ],
    [sellerMap, openManageRecovery],
  );

  const handleExport = () => {
    const rows = payload?.list || [];

    if (!rows.length) {
      toast.info("No negative balance data available to export.");
      return;
    }

    try {
      const excelColumns = columns
        .filter(Boolean)
        .map((column) => ({
          key: column.key,
          label: column.label,
        }))
        .filter((column) => column.key !== "actions");

      const data = rows.map((row) => {
        const exportRow = {};

        excelColumns.forEach(({ key }) => {
          switch (key) {
            case "settlementId":
              exportRow[key] = row.settlementNumber || settlementId(row) || "";
              break;

            case "sellerId": {
              const id = String(
                row.sellerId ||
                  row.seller_id ||
                  row.seller?._id ||
                  row.seller?.id ||
                  "",
              );

              exportRow[key] =
                row.sellerName ||
                row.seller?.businessName ||
                row.seller?.companyName ||
                row.seller?.name ||
                sellerMap[id] ||
                "Sam Global";
              break;
            }

            case "liabilityType":
              exportRow[key] =
                row.liabilityType === "seller_collected_cod"
                  ? "Seller-collected COD"
                  : "Other adjustment";
              break;

            case "negativeAmount":
              exportRow[key] = Number(
                valueOf(
                  row,
                  "negativeAmount",
                  "originalLiabilityAmount",
                  "balance",
                  "net_amount",
                  "netAmount",
                  "amount",
                ),
              );
              break;

            case "remainingAmount":
              exportRow[key] = Number(
                valueOf(row, "remainingAmount", "net_amount", "netAmount"),
              );
              break;

            case "status":
              exportRow[key] = formatLabel(row.status || "N/A");
              break;

            case "createdAt":
              exportRow[key] = formatDateTime12Hour(
                row.created_at || row.createdAt,
                "N/A",
              );
              break;

            default:
              exportRow[key] = row[key] ?? "";
          }
        });

        // Include order reference in the Type / Order column.
        if (row.orderId) {
          exportRow.liabilityType = `${exportRow.liabilityType} | Order: ${row.orderId}`;
        }

        return exportRow;
      });

      const exported = exportToExcelWorkbook(
        [
          {
            name: "Negative Balances",
            title: "Negative Balances Report",
            data,
            columns: excelColumns,
          },
        ],
        "Negative_Balances_Report.xlsx",
      );

      if (exported) {
        toast.success("Negative balances report exported successfully.");
      } else {
        toast.error("Unable to export negative balances report.");
      }
    } catch (error) {
      console.error("Negative balances export error:", error);
      toast.error("Failed to export negative balances report.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Negative Balances"
        subtitle="Money sellers owe the platform from collected COD, refunds, or other adjustments. These amounts reduce future payouts until recovered."
        breadcrumbs={[
          { label: "Seller Finance & Payouts" },
          { label: "Negative Balances" },
        ]}
      />

      <div className="admin-card mb-4 border-l-4 border-l-blue-500 bg-blue-50/40 p-4 text-sm text-[var(--admin-ink)]">
        <div className="font-semibold">Future-payout recovery is automatic</div>

        <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
          No admin action is needed for normal recovery. Use “Manage recovery”
          only when payment was received outside the platform or an authorized
          write-off is required.
        </p>
      </div>

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
        searchPlaceholder="Search settlement ID..."
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchBalances}
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
        requiredModule="sellers/commissions"
        emptyText="No sellers currently owe money to the platform."
        exportConfig={{
          onClick: handleExport,
          disabled: loading || !payload.list.length,
        }}
      />

      {/* Recovery Exception Modal */}
      <DefaultModal
        isOpen={action.open}
        onClose={closeManageRecovery}
        title="Manage Recovery Exception"
        onSubmit={formik.handleSubmit}
        submitButtonText="Continue"
        closeButtonText="Cancel"
        loading={loading}
        isButtonView={true}
      >
        <div className="space-y-5">
          <FormSection
            title="Recovery Action"
            description="Select how this recovery exception was resolved."
          >
            <div className="space-y-3">
              <span className="admin-label">What happened?</span>

              <div className="space-y-3">
                {RECOVERY_ACTIONS.map((opt) => {
                  const isSelected = formik.values.resolveAction === opt.value;

                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolveAction"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => handleRecoveryActionChange(opt.value)}
                        className="mt-1 h-4 w-4 accent-blue-600"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-700">
                          {opt.label}
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-gray-500">
                          {opt.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {formik.touched.resolveAction && formik.errors.resolveAction && (
                <p className="text-xs text-red-500">
                  {formik.errors.resolveAction}
                </p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Payment Information"
            description="Provide the payment reference and additional notes."
          >
            <div className="space-y-4">
              {formik.values.resolveAction === "collected_from_seller" && (
                <div>
                  <Input
                    labelName="Payment Reference ID"
                    name="referenceId"
                    value={formik.values.referenceId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                  />

                  {formik.touched.referenceId && formik.errors.referenceId && (
                    <p className="mt-1 text-xs text-red-500">
                      {formik.errors.referenceId}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Input
                  labelName={
                    formik.values.resolveAction === "platform_write_off"
                      ? "Approved Write-off Reason"
                      : "Payment Note"
                  }
                  type="textarea"
                  name="note"
                  value={formik.values.note}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                />

                {formik.touched.note && formik.errors.note && (
                  <p className="mt-1 text-xs text-red-500">
                    {formik.errors.note}
                  </p>
                )}
              </div>
            </div>
          </FormSection>
        </div>
      </DefaultModal>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false })}
        onConfirm={executeAction}
        title={confirmAction.title}
        message={confirmAction.message}
        variant="warning"
        confirmLabel="Confirm"
        loading={loading}
      />
    </div>
  );
};

export default NegativeBalances;
