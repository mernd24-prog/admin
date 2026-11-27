import ReturnQcDecisionField from "./components/ReturnQcDecisionField";
import { updateDoorstepChecklist } from "../../../utils/doorstepQcDecision";
import { returnPickupInitialValues } from "../../../utils/returnPickupForm";
import ReturnAcceptedQuantityField from "./components/ReturnAcceptedQuantityField";
import { returnItemQuantities, validateReturnApprovalQuantities } from "../../../utils/returnItemQuantities";
import { returnDetailPresentation, returnDetailStages, returnDecisionDetails } from "../../../utils/returnDetailPresentation";
import DoorstepExchangePanel from "./components/DoorstepExchangePanel";
import { DELIVERY_METHOD_OPTIONS } from "../../../constants/shippingOptions";
import { formatReturnDuration } from "../../../components/Shared/ReturnDurationInput";
import { reverseTrackingOptions, getAllowedReturnResolutions, getReturnShipmentLinks, isDoorstepReturn, isDoorstepExchange, doorstepReturnActions, canConfirmDoorstepCollection, doorstepCollectionStatusLabel } from "../../../utils/returnTrackingOptions";
import useRealtimeRefresh from "../../../hooks/useRealtimeRefresh";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "../../../utils/toast";
import { EmptyState } from "../Orders/components/ViewOrders";
import {
  formatLabel,
  formatCurrency,
  formatDateTime12Hour,
} from "../../../utils/formatters";
import {
  RETURN_STATUS_OPTIONS,
  RETURN_REASON_OPTIONS,
  REFUND_STATUS_OPTIONS,
} from "../../../constants/statusConstants";
import { useDispatch, useSelector } from "react-redux";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import {
  MdAssignmentReturn,
  MdCheckCircle,
  MdClose,
  MdLocalShipping,
  MdRefresh,
  MdReplay,
  MdVisibility,
  MdDoneAll,
  MdFactCheck,
  MdRateReview,
  MdSwapHoriz,
  MdUploadFile,
} from "react-icons/md";

import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  StatusBadge,
  UserLink,
  CustomerIdentity,
} from "../../../components/Shared";
import {
  approveReturn,
  closeReturn,
  getAdminReturn,
  getAdminReturns,
  qcReturn,
  startReturnCollectionVisit,
  submitReturnQcEvidence,
  decideReturnQcFailure,
  arrangeReturnToCustomer,
  updateReturnToCustomerTracking,
  receiveReturn,
  refundReturn,
  rejectReturn,
  replaceReturn,
  retryReturnRefund,
  scheduleReturn,
  syncReturnRefund,
  updateReturnReverseTracking,
} from "../../../Redux/adminCoreSlice";

import { usePermission } from "../../../_helpers/usePermission";
import {
  closeReturnValidationSchema,
  approveReturnValidationSchema,
  rejectReturnValidationSchema,
  replacementRequestValidationSchema,
  reverseShipmentTrackingValidationSchema,
  returnQualityControlValidationSchema,
  returnDoorstepQualityControlValidationSchema,
  returnQcEvidenceValidationSchema,
  scheduleReturnValidationSchema,
} from "../../../_helpers/validationSchemas";
import { useListPage } from "../../../hooks/useListPage";
import { uploadFileMulti } from "../../../_helpers/globalFunctions";
import { useNavigate } from "react-router";
import Button from "../../../components/Atoms/buttons/button";
import moment from "moment";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormSelectGroup from "../../../components/Atoms/FormSelectGroup/FormSelectGroup";
import FormToggleRow from "../../../components/Atoms/FormToggleRow/FormToggleRow";
import { exportToExcelWorkbook } from "../../../_helpers/exportToCsv";

// const MODAL_SECTION_CLASS = "rounded-xl border border-gray-200 bg-white p-4";
const INFO_CARD_CLASS = "rounded-lg border border-gray-100 bg-gray-50 p-3";
const ITEM_CARD_CLASS = "rounded-lg border border-gray-200 bg-white p-3";
const LABEL_CLASS = "text-xs text-gray-500";
const VALUE_CLASS = "mt-1 font-regular text-[#252238] font-inter";
const QC_DISPOSITION_OPTIONS = [
  { value: "sellable", label: "Sellable - restock" },
  { value: "damaged", label: "Damaged - quarantine" },
  { value: "missing", label: "Missing" },
  { value: "rejected", label: "Rejected by QC" },
];

const DOORSTEP_QC_DISPOSITION_OPTIONS = [
  { value: "sellable", label: "Eligible — sellable after warehouse receipt" },
  { value: "damaged", label: "Eligible reported damage — quarantine after receipt" },
  { value: "missing", label: "Missing item — do not collect" },
  { value: "rejected", label: "Not eligible — do not collect" },
];

const ACTION_TITLES = {
  visit: "Confirm Courier Arrival",
  exchange: "Arrange Doorstep Exchange",
  approve: "Approve Return",
  reject: "Reject Return",
  schedule: "Schedule Pickup",
  tracking: "Update Reverse Shipment",
  receive: "Receive Return",
  qc: "Record Item QC",
  qc_evidence: "Submit Additional QC Evidence",
  qc_decision: "Review Failed Quality Check",
  return_customer: "Return Product to Customer",
  return_customer_tracking: "Update Customer Return Shipment",
  refund: "Process Refund",
  retry_refund: "Retry Refund",
  sync_refund: "Sync Provider Refund",
  replacement_request: "Request Replacement",
  replacement_approve: "Approve Replacement",
  replacement_ship: "Ship Replacement",
  replacement_deliver: "Confirm Replacement Delivery",
  replacement_complete: "Complete Replacement",
  close: "Close Return",
};

const FILTER_FIELDS = [
  { key: "returnNumber", type: "text", label: "Return #", width: "w-48" },

  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Store Name",
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
    options: RETURN_STATUS_OPTIONS,
  },
  {
    key: "refundStatus",
    type: "select",
    label: "Refund Status",
    options: REFUND_STATUS_OPTIONS,
  },
  {
    key: "shipmentStatus",
    type: "text",
    label: "Reverse Shipment",
    width: "w-44",
  },
  {
    key: "reason",
    type: "select",
    label: "Reason",
    options: RETURN_REASON_OPTIONS,
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const EMPTY_ACTION = {
  open: false,
  type: "",
  title: "",
  returnRequest: null,
  refundAmount: "",
  reason: "",
  note: "",
  trackingNumber: "",
  provider: "manual",
  courierName: "",
  mode: "reverse_pickup",
  shippingMode: "standard",
  pickupScheduledAt: "",
  expectedDeliveryAt: "",
  shipmentStatus: "picked_up",
  location: "",
  referenceId: "",
  method: "auto",
  walletAmount: "",
  providerAmount: "",
  itemActions: [],
  decision: "uphold",
  returnToCustomerRequired: true,
  trackingUrl: "",
};

const ADMIN_ONLY_RETURN_ACTIONS = new Set([
  "reject",
  "refund",
  "retry_refund",
  "sync_refund",
  "replacement_approve",
  "replacement_deliver",
  "replacement_complete",
]);
const isAdminOnlyReturnAction = (type, request) => ADMIN_ONLY_RETURN_ACTIONS.has(type) &&
  !(isDoorstepReturn(request) && ["replacement_approve", "replacement_deliver"].includes(type));

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.items || data?.list || data || [],
    total: Number(
      data?.total || data?.items?.length || data?.list?.length || 0,
    ),
  };
};

const unwrapResult = (payload = {}) =>
  payload?.data?.data || payload?.data || payload || {};
const display = (value) => formatLabel(value);
const money = (value) => formatCurrency(value, "—");
const returnId = (row) => row?._id || row?.id || row?.returnId;
const getInitialQuery = (key) =>
  new URLSearchParams(window.location.search).get(key) || "";
const personName = (person = {}) =>
  person?.displayName ||
  person?.fullName ||
  person?.name ||
  [
    person?.firstName || person?.profile?.firstName,
    person?.lastName || person?.profile?.lastName,
  ]
    .filter(Boolean)
    .join(" ") ||
  person?.businessName ||
  person?.email ||
  "";
const buyerName = (row = {}) =>
  row?.buyerName || personName(row?.buyer) || personName(row?.buyerSnapshot);
const buyerContact = (row = {}) =>
  row?.buyerEmail ||
  row?.buyer?.email ||
  row?.buyerSnapshot?.email ||
  row?.buyerPhone ||
  row?.buyer?.phone ||
  row?.buyerSnapshot?.phone ||
  "";
const orderNumber = (row = {}) =>
  row?.orderNumber ||
  row?.order_number ||
  row?.order?.orderNumber ||
  row?.order?.order_number;
const sellerName = (item = {}, row = {}) =>
  item?.sellerName ||
  personName(item?.seller) ||
  row?.sellerName ||
  personName(row?.seller);

const splitEvidenceUrls = (value = "") =>
  String(value || "")
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);

const joinEvidenceUrls = (urls = []) =>
  [...new Set((urls || []).filter(Boolean))].join("\n");

function QCEvidenceUploader({
  value = "",
  required = false,
  onChange,
  onBlur,
  error = "",
}) {
  const [uploading, setUploading] = useState(false);
  const urls = splitEvidenceUrls(value);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const invalid = files.find(
      (file) => !String(file.type || "").startsWith("image/"),
    );
    if (invalid) {
      toast.error("Please upload image files only");
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls = await uploadFileMulti(files, "RETURN_QC");
      onChange(joinEvidenceUrls([...urls, ...uploadedUrls]));
      toast.success(
        `${uploadedUrls.length} evidence image${uploadedUrls.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (error) {
      toast.error(
        error?.message || error || "Failed to upload QC evidence image",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeUrl = (url) => {
    onChange(joinEvidenceUrls(urls.filter((item) => item !== url)));
  };

  const CLASS_SECTION = "rounded-xl border border-gray-200 bg-white p-4";

  const CLASS_SECTION_HEADER = "mb-4";

  const CLASS_SECTION_TITLE = "text-sm font-semibold text-gray-900";

  const CLASS_SECTION_DESCRIPTION = "mt-1 text-xs text-gray-500";

  const CLASS_DETAIL_GRID = "grid grid-cols-1 gap-3 md:grid-cols-2";

  const CLASS_DETAIL_CARD = "rounded-lg border border-gray-100 bg-gray-50 p-3";

  const CLASS_DETAIL_LABEL = "text-xs text-gray-500";

  const CLASS_DETAIL_VALUE = "mt-1 font-medium text-gray-900";

  const CLASS_MONO_VALUE = "mt-1 break-all font-inter text-xs text-gray-800";

  const CLASS_ITEM_CARD = "rounded-xl border border-gray-200 bg-gray-50 p-4";

  const CLASS_ITEM_DETAIL_CARD =
    "rounded-lg border border-gray-200 bg-white p-3";

  const CLASS_ITEM_DETAIL_VALUE = "mt-1 text-xs font-medium text-gray-800";

  const CLASS_EMPTY_STATE =
    "rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500";

  const CLASS_ATTEMPT_CARD =
    "rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600";

  const CLASS_INNER_WHITE_CARD =
    "rounded-lg border border-gray-100 bg-white p-3";

  return (
    <div className="md:col-span-2 rounded-lg border border-dashed border-[#d8caa6] bg-[#fffaf0] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">
            QC evidence images{" "}
            {required ? <span className="text-red-500">*</span> : null}
          </div>
          <div className="text-xs text-gray-500">
            Upload product condition photos. URLs are saved automatically after
            upload.
          </div>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center rounded-md border border-[#CE9F2D] px-3 py-2 text-xs font-semibold text-[#8A5A00] ${uploading ? "pointer-events-none opacity-60" : "bg-white hover:bg-[#fff3d6]"}`}
        >
          {uploading ? "Uploading..." : "Upload images"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {urls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {urls.map((url) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-md border border-gray-200 bg-white"
            >
              <img
                src={url}
                alt="QC evidence"
                className="h-24 w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-red-600 shadow"
                onClick={() => removeUrl(url)}
              >
                Remove
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block truncate px-2 py-1 text-[10px] text-blue-600"
              >
                View image
              </a>
            </div>
          ))}
        </div>
      )}

      <Input
        type="textarea"
        labelName="Or paste inspection photo links (one per line)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        maxLength={2048}
        showLengthCount={true}
        limitMessage="Each evidence URL must be a valid HTTP/HTTPS URL of at most 2048 characters."
        error={error}
        required={required}
      />
    </div>
  );
}

const sellerQcGuidance = (row = {}) => {
  if (!row) return null;
  if (row.status === "qc_failed") {
    const reviewStatus =
      row.qcReview?.status || "awaiting_customer_or_admin_review";
    if (reviewStatus === "evidence_requested")
      return { label: "Action required: submit QC evidence", tone: "amber" };
    if (reviewStatus === "customer_disputed")
      return {
        label: "Customer disputed · admin review pending",
        tone: "blue",
      };
    if (reviewStatus === "admin_review")
      return {
        label: "Evidence submitted · admin decision pending",
        tone: "blue",
      };
    return {
      label: "No seller action · dispute/admin review pending",
      tone: "blue",
    };
  }
  if (row.status === "qc_failure_upheld") {
    if (row.returnToCustomer?.required === false)
      return { label: "QC upheld · item payout hold released", tone: "green" };
    if (!row.returnToCustomer?.trackingNumber)
      return {
        label: "Action required: return item to customer",
        tone: "amber",
      };
    if (row.returnToCustomer?.status !== "delivered")
      return {
        label: "Action required: update customer shipment",
        tone: "amber",
      };
    return {
      label: "Returned to customer · payout hold released",
      tone: "green",
    };
  }
  return null;
};

const SellerReturnOverview = ({ returnRequest = {} }) => {
  const status = String(returnRequest.status || "requested").toLowerCase();
  const doorstep = isDoorstepReturn(returnRequest);
  const flowStages = returnDetailStages(returnRequest);
  const currentIndex = flowStages.findIndex(stage => !stage.complete);
  const presentation = returnDetailPresentation(returnRequest);
  const [nextLabel, nextDescription] = presentation.next;

  const terminal = ["refunded", "replaced", "closed", "rejected", "qc_failure_upheld"].includes(status);

  return (
    <div className="rounded-xl border border-[#eadfbd] bg-[#fffdf8] p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-[#202337]">
            What happens next
          </div>

          <div className="mt-0.5 text-xs text-[#65718b]">
            {presentation.resolution} — {doorstep ? "inspection at collection" : "warehouse inspection"}
          </div>
        </div>

        <StatusBadge
          label={doorstepCollectionStatusLabel(returnRequest)}
          status={
            status === "requested"
              ? "return_requested"
              : status === "approved"
                ? "return_approved"
                : status === "rejected"
                  ? "return_rejected"
                  : status
          }
          dot
        />
      </div>

      {/* Return Flow */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {flowStages.map((stage, index) => {
          const complete = stage.complete;

          const active = !terminal && index === currentIndex;

          return (
            <div
              key={stage.label}
              className={`
                min-h-[72px]
                rounded-md
                border
                px-2
                py-1.5
                transition
                ${
                  active
                    ? "border-[#2f6fed] bg-[#eef4ff]"
                    : complete
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-200 bg-white"
                }
              `}
            >
              <div
                className={`
                  flex h-4 w-4 items-center justify-center rounded-full
                  text-[11px] font-bold
                  ${
                    active
                      ? "bg-[#2f6fed] text-white"
                      : complete
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                  }
                `}
              >
                {complete ? "✓" : index + 1}
              </div>

              <div
                className={`
                  mt-1 text-xs font-semibold leading-4
                  ${
                    active
                      ? "text-[#1f4fc9]"
                      : complete
                        ? "text-emerald-700"
                        : "text-gray-500"
                  }
                `}
              >
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Step + Money Impact */}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {/* Next Step */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
            Your next step
          </div>

          <div className="mt-0.5 text-xs font-semibold text-blue-950">
            {nextLabel}
          </div>

          <div className="mt-1 text-xs leading-4 text-blue-800">
            {nextDescription}
          </div>
        </div>

        {/* Money Impact */}
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            {presentation.amountLabel}
          </div>

          <div className="mt-0.5 text-xs font-semibold text-emerald-950">
            {money(presentation.amount)}
          </div>

          <div className="mt-1 text-xs leading-4 text-emerald-800">
            {presentation.moneyDescription}
          </div>
        </div>
      </div>
    </div>
  );
};
const Returns = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isSeller, canRoute } = usePermission();
  const canViewShipments = canRoute("/app/shipment-tracking");
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.adminReturnsData);
  const filterFields = useMemo(
    () =>
      isSeller
        ? FILTER_FIELDS.filter(
            (field) =>
              ![
                "orderId",
                "sellerId",
                "buyerId",
                "refundStatus",
                "shipmentStatus",
              ].includes(field.key),
          )
        : FILTER_FIELDS,
    [isSeller],
  );
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
    defaultFilters: {
      orderId: getInitialQuery("orderId"),
      returnNumber: getInitialQuery("returnNumber"),
      status: getInitialQuery("status"),
      reason: getInitialQuery("reason"),
      fromDate: getInitialQuery("fromDate"),
      toDate: getInitialQuery("toDate"),
    },
  });
  const { toQueryParams } = list;
  const realtimeRevision = useRealtimeRefresh(["return", "shipment"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailReturn, setDetailReturn] = useState(null);
  const [exchangeReturn, setExchangeReturn] = useState(null);
  const [exchangeContextId, setExchangeContextId] = useState("");
  const [exchangeError, setExchangeError] = useState("");
  const [action, setAction] = useState(EMPTY_ACTION);
  const [qcInitialItemActions, setQcInitialItemActions] = useState([]);
  const [closeFormVersion, setCloseFormVersion] = useState(0);
  const closeReturnInitialValues = useMemo(
    () => ({ reason: "", note: "" }),
    [closeFormVersion],
  );
  const [rejectFormVersion, setRejectFormVersion] = useState(0);
  const rejectReturnInitialValues = useMemo(
    () => ({ reason: "", note: "" }),
    [rejectFormVersion],
  );
  const [scheduleReturnInitialValues, setScheduleReturnInitialValues] = useState(() => returnPickupInitialValues());
  const [replacementRequestFormVersion, setReplacementRequestFormVersion] =
    useState(0);
  const [reverseTrackingFormVersion, setReverseTrackingFormVersion] =
    useState(0);
  const replacementRequestInitialValues = useMemo(
    () => ({ note: "" }),
    [replacementRequestFormVersion],
  );
  const reverseTrackingInitialValues = useMemo(
    () => ({ note: "" }),
    [reverseTrackingFormVersion],
  );
  const qcInitialValues = useMemo(
    () => ({ note: "", itemActions: qcInitialItemActions, returnReason: action.returnRequest?.reason }),
    [qcInitialItemActions, action.returnRequest?.reason],
  );
  const [confirmAction, setConfirmAction] = useState({ open: false });
  const visibleReturns = payload.list;

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();

      await dispatch(
        getAdminReturns({
          ...params,
          limit: params.limit,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (requestError) {
      const message =
        requestError?.message || requestError || "Failed to load returns";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns, realtimeRevision]);

  const openExchange = useCallback(async row => {
    const id = returnId(row);
    setExchangeContextId(id);
    setExchangeReturn(row);
    setExchangeError("");
    try {
      setLoading(true);
      const response = await dispatch(getAdminReturn({ returnId: id })).unwrap();
      setExchangeReturn(unwrapResult(response));
    } catch (requestError) {
      setExchangeError(requestError?.message || "Unable to load the latest exchange. Refresh before continuing.");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const openDetail = useCallback(
    async (row) => {
      setDetailReturn(row);
      try {
        setLoading(true);
        const response = await dispatch(
          getAdminReturn({ returnId: returnId(row) }),
        ).unwrap();
        setDetailReturn(unwrapResult(response));
      } catch (requestError) {
        toast.error(
          requestError?.message ||
            requestError ||
            "Failed to load return detail",
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  const openAction = useCallback(
    (type, returnRequest) => {
      if (isSeller && isAdminOnlyReturnAction(type, returnRequest)) {
        toast.error("This return action is admin-only");
        return;
      }
      const trackingOptions =
        type === "tracking" ? reverseTrackingOptions(returnRequest) : [];
      if (type === "close") {
        setCloseFormVersion((version) => version + 1);
      }
      if (type === "reject") {
        setRejectFormVersion((version) => version + 1);
      }
      if (type === "schedule") {
        setScheduleReturnInitialValues(returnPickupInitialValues(returnRequest));
      }
      if (type === "replacement_request") {
        setReplacementRequestFormVersion((version) => version + 1);
      }
      if (type === "tracking") {
        setReverseTrackingFormVersion((version) => version + 1);
      }
      const savedInspections = new Map((returnRequest?.collectionQc?.items || []).map(item => [String(item.orderItemId), item]));
      const itemActions = (returnRequest?.items || [])
        .filter(item => !(type === "qc" && isDoorstepReturn(returnRequest)) || Number(item.approvedQuantity) > 0)
        .map((item) => ({
        orderItemId: item.orderItemId || "",
        productId: item.productId || "",
        variantSku: item.variantSku || "",
        label: item.productTitle || item.productId || "Item",
        ...returnItemQuantities(item, type),
        quantity: Number(
          item.receivedQuantity ||
            item.approvedQuantity ||
            item.requestedQuantity ||
            item.quantity ||
            0,
        ),
        result:
          isDoorstepReturn(returnRequest) && type === "qc" ? savedInspections.get(String(item.orderItemId))?.result || ""
            : item.qcResult === "pending" || !item.qcResult ? "" : item.qcResult,
        acceptedQuantity: isDoorstepReturn(returnRequest) ? savedInspections.get(String(item.orderItemId))?.acceptedQuantity ?? "" : undefined,
        checks: savedInspections.get(String(item.orderItemId))?.checks || {},
        condition: isDoorstepReturn(returnRequest) && type === "qc" ? savedInspections.get(String(item.orderItemId))?.condition || "" : item.condition || "",
        notes: isDoorstepReturn(returnRequest) && type === "qc" ? savedInspections.get(String(item.orderItemId))?.notes || "" : item.qcNotes || "",
        photos: (isDoorstepReturn(returnRequest) && type === "qc" ? savedInspections.get(String(item.orderItemId))?.photos || [] : item.qcPhotos || []).join("\n"),
      }));
      if (["qc", "qc_evidence", "qc_decision"].includes(type)) {
        setQcInitialItemActions(itemActions);
      }
      setAction({
        ...EMPTY_ACTION,
        courierAtDoorstep: false,
        collectionConfirmed: type === "qc" && !!returnRequest.collectionQc?.exchangeCompletionConfirmed,
        replacementReady: type === "qc" && !!returnRequest.collectionQc?.exchangeCompletionConfirmed,
        replacementInspected: type === "qc" && !!returnRequest.collectionQc?.replacementInspected,
        customerAccepted: type === "qc" && !!returnRequest.collectionQc?.customerAccepted,
        exchangeReference: returnRequest.collectionQc?.exchangeReference || "",
        handoverConfirmed: false,
        pickupTrackingNumber: "",
        replacementTrackingNumber: "",
        open: true,
        type,
        title: isDoorstepExchange(returnRequest)
          ? ({
              approve: "Approve Replacement",
              qc: ["passed", "partially_passed"].includes(returnRequest.collectionQc?.status) ? "Confirm Exchange Completed" : "Record Exchange Inspection",
              exchange_failure: "Record Exchange Failure",
              exchange: returnRequest.status === "pickup_failed" ? "Reschedule Exchange" : "Schedule Doorstep Exchange",
              replacement_deliver: "Confirm Replacement Handover",
              replacement_complete: "Complete Exchange",
              close: "Close Exchange",
              reject: "Reject Exchange",
            }[type] || ACTION_TITLES[type] || "Update Exchange")
          : type === "tracking" && isDoorstepReturn(returnRequest) && !returnRequest.collectionQc?.collectedAt ? "Report Pickup Failure"
          : type === "schedule" && returnRequest.status === "pickup_failed" ? "Reschedule Pickup"
          : isSeller && type === "approve" ? "Accept Return" : ACTION_TITLES[type] || "Update Return",
        returnRequest,
        refundAmount:
          returnRequest?.refundAmount ||
          returnRequest?.refundBreakup?.totalRefundAmount ||
          "",
        trackingNumber: type === "replacement_ship"
          ? returnRequest?.replacement?.trackingNumber || ""
          : returnRequest?.trackingNumber || "",
        trackingUrl: returnRequest?.returnToCustomer?.trackingUrl || "",
        provider: returnRequest?.reverseShipment?.provider || "manual",
        courierName: type === "replacement_ship"
          ? returnRequest?.replacement?.courierName || ""
          : returnRequest?.reverseShipment?.courierName || "",
        referenceId: ["refund", "retry_refund"].includes(type)
          ? returnRequest?.refund?.referenceId ||
            `return_${returnId(returnRequest)}`
          : "",
        shipmentStatus:
          type === "return_customer_tracking"
            ? "in_transit"
            : type === "tracking"
              ? trackingOptions[0]?.value || ""
              : EMPTY_ACTION.shipmentStatus,
        method: returnRequest?.refund?.method || "auto",
        walletAmount: returnRequest?.refundBreakup?.walletRefundAmount || "",
        providerAmount:
          returnRequest?.refundBreakup?.originalPaymentRefundAmount || "",
        itemActions,
      });
      if (type === "approve") {
        approveReturnFormik.resetForm({
          values: {
            refundAmount:
              returnRequest?.refundAmount ||
              returnRequest?.refundBreakup?.totalRefundAmount ||
              "",
            itemActions,
            note: "",
          },
        });
      }
    },
    [isSeller],
  );

  const updateItemAction = (index, key, value) => {
    if (action.type === "approve") approveReturnFormik.setFieldValue(`itemActions[${index}].${key}`, value);
    if (["qc", "qc_evidence", "qc_decision"].includes(action.type)) {
      qcFormik.setFieldValue(`itemActions[${index}].${key}`, value);
      return;
    }
    setAction((prev) => ({
      ...prev,
      itemActions: prev.itemActions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const validateAction = () => {
    if (!returnId(action.returnRequest)) return "Return ID is missing";
    if (collectionConfirmationOnly && !action.collectionConfirmed) return "Confirm physical collection of the inspected items";
    if (action.type === "visit" && !action.courierAtDoorstep) return "Confirm the courier is physically at the customer’s address";
    if (action.type === "approve") {
      const message = validateReturnApprovalQuantities(currentItemActions);
      if (message) return message;
    }
    if (action.type === "replacement_deliver" && isDoorstepReturn(action.returnRequest) && !action.handoverConfirmed)
      return "Confirm physical handover of the replacement";
    if (action.type === "exchange") {
      if (!action.courierName?.trim()) return "Select the exchange courier";
      if (!action.exchangeReference?.trim() || action.exchangeReference.trim().length < 3) return "Enter the exchange booking reference";
    }
    if (action.type === "exchange_failure" && (action.note || "").trim().length < 3) return "Explain why the exchange could not be completed";
    const allowed = getAllowedReturnResolutions(action.returnRequest);
    if (action.type === "qc" && isDoorstepReturn(action.returnRequest)) {
      if (action.collectionConfirmed && isDoorstepExchange(action.returnRequest) && (!action.replacementInspected || !action.customerAccepted))
        return "Confirm the replacement was checked with the customer and accepted";
      if (action.collectionConfirmed && ["replacement", "exchange"].includes(action.returnRequest.resolution) && !action.replacementReady)
        return "Confirm the replacement is with the courier before collecting the old item";
      for (const item of collectionConfirmationOnly ? [] : currentItemActions) {
        if (["identity", "serialNumber", "accessories", "packaging", "condition"].some(key => !item.checks?.[key]))
          return "Complete every doorstep check for each item";
        if (item.acceptedQuantity === "" || !Number.isInteger(Number(item.acceptedQuantity)) || Number(item.acceptedQuantity) < 0 || Number(item.acceptedQuantity) > Number(item.approvedQuantity))
          return "Enter the accepted quantity from zero to the approved quantity";
        if (!item.notes.trim() || !item.photos.trim()) return "Inspection notes and photos are required for every item";
      }
    }
    if (["replacement_request", "replacement_approve"].includes(action.type) &&
      !["replacement", "exchange"].includes(action.returnRequest.resolution))
      return "The customer selected a refund; replacement is not available";
    if (["replacement_request", "replacement_approve"].includes(action.type) && !allowed.includes("replacement"))
      return "The product policy does not allow replacement";
    if (action.type === "refund" && !allowed.includes("refund"))
      return "The product policy does not allow refund";
    if (
      ["refund", "retry_refund"].includes(action.type) &&
      Number(action.refundAmount || 0) <= 0
    ) {
      return "Refund amount must be greater than zero";
    }
    if (action.type === "reject" && !action.reason.trim())
      return "Rejection reason is required";
    if (
      ["refund", "retry_refund"].includes(action.type) &&
      action.referenceId.trim().length < 3
    )
      return "Refund reference ID is required";
    if (
      action.type === "schedule" &&
      formAction.mode === "reverse_pickup" &&
      (!formAction.courierName.trim() || !formAction.trackingNumber.trim())
    ) {
      return "Courier and tracking number are required";
    }
    if (
      (action.type === "replacement_ship" ||
        (action.type === "schedule" && formAction.mode === "reverse_pickup")) &&
      formAction.expectedDeliveryAt
    ) {
      const arrival = new Date(formAction.expectedDeliveryAt).getTime();
      if (!Number.isFinite(arrival) || arrival <= Date.now())
        return "Expected arrival must be a valid future date";
      if (action.type === "schedule" && formAction.pickupScheduledAt &&
        arrival <= new Date(formAction.pickupScheduledAt).getTime())
        return "Expected warehouse arrival must be after pickup";
    }
    if (action.type === "tracking" && ["pickup_failed", "failed"].includes(action.shipmentStatus) && !action.note?.trim())
      return "Explain why the pickup could not be completed";
    if (action.type === "tracking" && !action.shipmentStatus)
      return "Shipment status is required";
    if (
      ["approve", "receive", "qc"].includes(action.type) &&
      !currentItemActions.length
    )
      return "Return items are missing";
    if (
      ["qc_evidence", "qc_decision"].includes(action.type) &&
      !action.reason.trim() &&
      !formAction.note.trim()
    )
      return "A review reason or note is required";
    if (
      action.type === "qc_evidence" &&
      currentItemActions.some(
        (item) => !item.notes.trim() || !item.photos.trim(),
      )
    )
      return "Each rejected item requires notes and at least one evidence image";
    if (
      action.type === "return_customer" &&
      (!formAction.courierName.trim() || !formAction.trackingNumber.trim())
    )
      return "Courier and tracking number are required";
    if (
      action.type === "replacement_ship" &&
      (!formAction.courierName.trim() || !formAction.trackingNumber.trim())
    ) {
      return "Courier and tracking number are required";
    }
    if (action.type === "close" && !action.reason.trim())
      return "Close reason is required";
    return "";
  };

  const prepareAction = () => {
    if (isSeller && isAdminOnlyReturnAction(action.type, action.returnRequest)) {
      toast.error("This return action is admin-only");
      return;
    }
    const validationMessage = validateAction();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setConfirmAction({
      open: true,
      title: `${action.title || ACTION_TITLES[action.type] || "Update Return"}?`,
      message: action.type === "tracking" && isDoorstepReturn(action.returnRequest) && !action.returnRequest.collectionQc?.collectedAt
        ? "Record this visit as failed. The item stays with the customer. You can then reschedule pickup from Returns."
        : isDoorstepExchange(action.returnRequest) && action.type === "qc"
        ? action.collectionConfirmed
          ? "Confirm the old item passed inspection and was collected, and the replacement was opened, accepted and handed to the customer during the same visit."
          : "Save the inspection results only. The item remains with the customer until collection is confirmed."
        : isDoorstepExchange(action.returnRequest) && action.type === "replacement_deliver"
          ? "Confirm the replacement was physically handed to the customer after collecting the old item."
          : isDoorstepExchange(action.returnRequest) ? "Confirm this action for the exchange."
          : "Are you sure you want to move this return request to the next stage of its lifecycle?",
    });
  };

  const closeReturnFormik = useFormik({
    initialValues: closeReturnInitialValues,
    enableReinitialize: true,
    validationSchema: closeReturnValidationSchema,
    onSubmit: prepareAction,
  });
  const rejectReturnFormik = useFormik({
    initialValues: rejectReturnInitialValues,
    enableReinitialize: true,
    validationSchema: rejectReturnValidationSchema,
    onSubmit: prepareAction,
  });
  const scheduleReturnFormik = useFormik({
    initialValues: scheduleReturnInitialValues,
    enableReinitialize: true,
    validationSchema: scheduleReturnValidationSchema,
    onSubmit: prepareAction,
  });
  const replacementRequestFormik = useFormik({
    initialValues: replacementRequestInitialValues,
    enableReinitialize: true,
    validationSchema: replacementRequestValidationSchema,
    onSubmit: prepareAction,
  });
  const reverseTrackingFormik = useFormik({
    initialValues: reverseTrackingInitialValues,
    enableReinitialize: true,
    validationSchema: reverseShipmentTrackingValidationSchema,
    onSubmit: prepareAction,
  });
  const qcFormik = useFormik({
    initialValues: qcInitialValues,
    enableReinitialize: true,
    validationSchema:
      action.type === "qc_evidence"
        ? returnQcEvidenceValidationSchema
        : action.type === "qc" && isDoorstepReturn(action.returnRequest)
          ? returnDoorstepQualityControlValidationSchema
          : returnQualityControlValidationSchema,
    onSubmit: prepareAction,
  });
  const approveReturnFormik = useFormik({
    initialValues: { refundAmount: "", itemActions: [], note: "" },
    validationSchema: approveReturnValidationSchema,
    onSubmit: prepareAction,
  });
  const collectionConfirmationOnly = action.type === "qc" && (canConfirmDoorstepCollection(action.returnRequest) || (isDoorstepExchange(action.returnRequest) && action.returnRequest.collectionQc?.exchangeCompletionConfirmed && action.returnRequest.status === "replacement_shipped"));
  const formAction = action.type === "schedule" ? { ...action, ...scheduleReturnFormik.values } : action;
  const currentItemActions = ["qc", "qc_evidence", "qc_decision"].includes(action.type)
    ? qcFormik.values.itemActions : action.itemActions;

  const closeActionModal = useCallback(() => {
    closeReturnFormik.resetForm();
    rejectReturnFormik.resetForm();
    scheduleReturnFormik.resetForm();
    replacementRequestFormik.resetForm();
    approveReturnFormik.resetForm();
    reverseTrackingFormik.resetForm();
    qcFormik.resetForm();
    setAction(EMPTY_ACTION);
  }, [
    closeReturnFormik.resetForm,
    rejectReturnFormik.resetForm,
    replacementRequestFormik.resetForm,
    scheduleReturnFormik.resetForm,
    approveReturnFormik.resetForm,
    reverseTrackingFormik.resetForm,
    qcFormik.resetForm,
  ]);

  const executeAction = useCallback(async () => {
    if (isSeller && isAdminOnlyReturnAction(action.type, action.returnRequest)) {
      toast.error("This return action is admin-only");
      return;
    }
    const base = {
      returnId: returnId(action.returnRequest),
      refundAmount: Number(action.refundAmount || 0),
      reason: action.reason || formAction.note,
      note: formAction.note,
      trackingNumber: formAction.trackingNumber,
      notes: formAction.note,
      referenceId: action.referenceId,
      method: action.method,
      walletAmount:
        action.method === "split"
          ? Number(action.walletAmount || 0)
          : undefined,
      providerAmount:
        action.method === "split"
          ? Number(action.providerAmount || 0)
          : undefined,
      provider: action.provider,
      courierName: formAction.courierName,
      mode: formAction.mode,
      shippingMode: formAction.shippingMode,
      pickupScheduledAt: formAction.pickupScheduledAt || undefined,
      expectedDeliveryAt: formAction.expectedDeliveryAt
        ? new Date(formAction.expectedDeliveryAt).toISOString() : undefined,
      status: action.shipmentStatus,
      location: action.location,
      exchangeReference: action.exchangeReference,
      pickupTrackingNumber: action.pickupTrackingNumber,
      replacementTrackingNumber: action.replacementTrackingNumber,
      action: action.type === "exchange_failure" ? "exchange_failure" : action.type === "exchange" ? "arrange_exchange" : action.type.startsWith("replacement_")
        ? action.type.replace("replacement_", "")
        : undefined,
      inspectionMode: action.type === "qc" && isDoorstepReturn(action.returnRequest) ? "doorstep" : undefined,
      courierAtDoorstep: action.courierAtDoorstep === true,
      confirmCollectionOnly: collectionConfirmationOnly || undefined,
      collectionConfirmed: action.type === "qc" && isDoorstepReturn(action.returnRequest) ? action.collectionConfirmed === true : undefined,
      replacementReady: action.replacementReady === true,
      exchangeCompleted: action.type === "qc" && isDoorstepExchange(action.returnRequest) && action.collectionConfirmed || undefined,
      replacementInspected: action.replacementInspected === true,
      customerAccepted: action.customerAccepted === true,
      handoverConfirmed: isDoorstepExchange(action.returnRequest) && action.type === "qc" ? action.collectionConfirmed === true : action.handoverConfirmed === true,
      advanceExchange: action.type === "replacement_approve" && isDoorstepReturn(action.returnRequest) ? true : undefined,
      decision: action.decision,
      returnToCustomerRequired: action.returnToCustomerRequired,
      trackingUrl: action.trackingUrl,
      items:
        collectionConfirmationOnly ? undefined : action.type === "approve"
          ? currentItemActions.map((item) => ({
              orderItemId: item.orderItemId,
              productId: item.productId,
              variantSku: item.variantSku,
              approvedQuantity: Number(item.approvedQuantity || 0),
            }))
          : action.type === "receive"
            ? currentItemActions.map((item) => ({
                orderItemId: item.orderItemId,
                productId: item.productId,
                variantSku: item.variantSku,
                receivedQuantity: Number(item.receivedQuantity || 0),
              }))
            : action.type === "qc"
              ? currentItemActions.map((item) => ({
                  orderItemId: item.orderItemId,
                  productId: item.productId,
                  variantSku: item.variantSku,
                  quantity: Number(item.quantity || 0),
                  ...(isDoorstepReturn(action.returnRequest) ? {
                    acceptedQuantity: Number(item.acceptedQuantity), checks: item.checks,
                  } : {}),
                  result: item.result,
                  condition: item.condition,
                  notes: item.notes,
                  photos: item.photos
                    .split(/[\n,]/)
                    .map((value) => value.trim())
                    .filter(Boolean),
                }))
              : action.type === "qc_evidence"
                ? currentItemActions.map((item) => ({
                    orderItemId: item.orderItemId,
                    productId: item.productId,
                    variantSku: item.variantSku,
                    notes: item.notes,
                    photos: item.photos
                      .split(/[\n,]/)
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                : action.type === "qc_decision" && !isDoorstepReturn(action.returnRequest)
                  ? currentItemActions.map((item) => ({
                      orderItemId: item.orderItemId,
                      productId: item.productId,
                      variantSku: item.variantSku,
                      approvedQuantity: Number(item.approvedQuantity || 0),
                      disposition:
                        item.result === "sellable" ? "sellable" : "damaged",
                    }))
                  : undefined,
    };
    const actionMap = {
      visit: startReturnCollectionVisit,
      exchange: replaceReturn,
      exchange_failure: replaceReturn,
      approve: approveReturn,
      reject: rejectReturn,
      schedule: scheduleReturn,
      tracking: updateReturnReverseTracking,
      receive: receiveReturn,
      qc: qcReturn,
      qc_evidence: submitReturnQcEvidence,
      qc_decision: decideReturnQcFailure,
      return_customer: arrangeReturnToCustomer,
      return_customer_tracking: updateReturnToCustomerTracking,
      refund: refundReturn,
      retry_refund: retryReturnRefund,
      sync_refund: syncReturnRefund,
      replacement_request: replaceReturn,
      replacement_approve: replaceReturn,
      replacement_ship: replaceReturn,
      replacement_deliver: replaceReturn,
      replacement_complete: replaceReturn,
      close: closeReturn,
    };
    const actionCreator = actionMap[action.type];
    if (typeof actionCreator !== "function") {
      toast.error(
        "The return action is no longer available. Please open it again.",
      );
      setConfirmAction({ open: false });
      return;
    }
    try {
      setLoading(true);
      await dispatch(actionCreator(base)).unwrap();
      toast.success(action.type === "exchange_failure" ? "Exchange marked failed. Resolve the issue, then reschedule." : action.type === "qc" && isDoorstepReturn(action.returnRequest)
        ? action.collectionConfirmed ? "Collection confirmed" : "Inspection saved. Collection has not been confirmed."
        : "Return updated");
      closeActionModal();
      setConfirmAction({ open: false });
      await fetchReturns();
      if (exchangeContextId) await openExchange({ _id: exchangeContextId });
    } catch (requestError) {
      toast.error(
        requestError?.message || requestError || "Failed to update return",
      );
      if (action.type === "exchange") {
        closeActionModal();
        setConfirmAction({ open: false });
        await fetchReturns();
        if (exchangeContextId) await openExchange({ _id: exchangeContextId });
      }
    } finally {
      setLoading(false);
    }
  }, [action, formAction, currentItemActions, collectionConfirmationOnly, closeActionModal, dispatch, fetchReturns, isSeller, exchangeContextId, openExchange]);

  const columns = useMemo(
    () => [
      {
        key: "orderId",
        label: "Return",
        sortable: false,
        render: (_, row) => (
          <div>
            <div className="font-semibold text-gray-800">
              {row.returnNumber || returnId(row)}
            </div>
            <OrderLink
              orderId={row.orderId || row.order_id}
              orderNumber={row.orderNumber || row.order_number}
              prefix="#"
            />
          </div>
        ),
      },
      {
        key: "buyerId",
        label: "Customer",
        sortable: true,
        render: (value, row) => {
          const name = buyerName(row);
          const email =
            row.buyerEmail || row.buyer?.email || row.buyerSnapshot?.email;
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
        key: "reason",
        label: "Reason",
        sortable: false,
        render: (value) => <span className="capitalize">{display(value)}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (value, row) => (
          <StatusBadge
            label={doorstepCollectionStatusLabel(row)}
            status={
              value === "requested"
                ? "return_requested"
                : value === "approved"
                  ? "return_approved"
                  : value === "rejected"
                    ? "return_rejected"
                    : value
            }
            dot
          />
        ),
      },
      {
        key: "refundAmount",
        label: "Refund / Resolution",
        sortable: true,
        render: (value, row) =>
          ["replacement", "exchange"].includes(row.resolution)
            ? "Replacement" : money(value || row.refundBreakup?.totalRefundAmount),
      },
      {
        key: "createdAt",
        label: "Requested At",
        sortable: false,
        render: (value) => formatDateTime12Hour(value),
      },
    ],
    [isSeller, openAction, openDetail],
  );

  const handleExport = () => {
    const returnRows = visibleReturns || [];

    if (!returnRows.length) {
      toast.info("No return data available to export.");
      return;
    }

    try {
      const excelColumns = columns.map(({ key, label }) => ({
        key,
        label,
      }));

      const data = returnRows.map((row) => {
        const exportRow = {};

        excelColumns.forEach(({ key }) => {
          let value;

          switch (key) {
            case "orderId":
              value = row.returnNumber || returnId(row) || "";
              break;
            case "buyerId":
              value = buyerName(row);
              break;
            case "refundAmount":
              value = ["replacement", "exchange"].includes(row.resolution)
                ? "Replacement"
                : money(row.refundAmount || row.refundBreakup?.totalRefundAmount);
              break;
            case "createdAt":
              value = formatDateTime12Hour(row.createdAt);
              break;
            default:
              value = row?.[key];
          }

          exportRow[key] =
            value === null || value === undefined
              ? ""
              : typeof value === "object"
                ? JSON.stringify(value)
                : value;
        });

        return exportRow;
      });

      const exported = exportToExcelWorkbook(
        [
          {
            name: "Returns",
            title: "Returns and Refunds Report",
            data,
            columns: excelColumns,
          },
        ],
        "Returns_Refunds_Report.xlsx",
      );

      if (exported) {
        toast.success("Returns report exported successfully.");
      } else {
        toast.error("Unable to export returns report.");
      }
    } catch (error) {
      console.error("Returns export error:", error);
      toast.error("Failed to export returns report.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Returns & Refunds"
        subtitle="Review RMA requests, QC, refunds, and replacement lifecycle."
        breadcrumbs={[
          { label: isSeller ? "Orders" : "Returns & Cancellations" },
          { label: isSeller ? "Returns" : "Returns & Refunds" },
        ]}
      />

      <DataTable
        columns={columns}
        data={visibleReturns}
        loading={loading}
        totalCount={payload.total ?? payload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search return or order"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchReturns}
        error={error}
        filterBar={
          <div className="returns-filter-bar">
            <FilterBar
              filters={filterFields}
              values={list.filters}
              onChange={list.setFilter}
              onClear={list.clearFilters}
              loading={loading}
              activeCount={list.activeFilterCount}
            />
          </div>
        }
        rowActions={(row) => {
          if (isDoorstepExchange(row)) return [{
            label: "Manage Doorstep Exchange",
            icon: <MdSwapHoriz aria-hidden="true" size={16} className="text-violet-600" />,
            onClick: () => openExchange(row),
          }];
          const actions = [
            {
              label: row.status === "qc_failed" ? "View QC Review" : "View Details",
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

          if (row.status === "requested") {
            actions.push({
              label: isSeller ? "Accept Return" : "Approve Return",
              icon: (
                <MdCheckCircle
                  aria-hidden="true"
                  size={16}
                  className="text-green-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("approve", row),
            });

            if (!isSeller) {
              actions.push({
                label: "Reject Return",
                icon: (
                  <MdClose
                    aria-hidden="true"
                    size={16}
                    className="text-red-600"
                  />
                ),
                requiredModule: "returns",
                requiredAction: "update",
                onClick: () => openAction("reject", row),
              });
            }
          }

          if (canViewShipments && !(isDoorstepReturn(row) && !row.collectionQc?.collectedAt && !["replacement", "exchange"].includes(row.resolution))) {
            getReturnShipmentLinks(row).forEach(link => actions.push({
              label: link.label,
              icon: (
                <MdLocalShipping aria-hidden="true" size={16} className="text-indigo-600" />
              ),
              onClick: () => navigate(link.path),
            }));
          }

          if (
            !(isDoorstepReturn(row) && ["replacement", "exchange"].includes(row.resolution)) && (
              row.status === "pickup_failed" ||
              (row.status === "approved" && !row.reverseShipment?.shipmentId)
            )
          ) {
            actions.push({
              label: row.status === "pickup_failed"
                ? "Reschedule Pickup"
                : "Arrange Pickup",
              icon: (
                <MdLocalShipping
                  aria-hidden="true"
                  size={16}
                  className="text-indigo-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("schedule", row),
            });
          }

          if (isDoorstepReturn(row) && !["replacement", "exchange"].includes(row.resolution) &&
              row.status === "reverse_pickup_scheduled" && !row.collectionQc?.collectedAt && row.reverseShipment?.shipmentId) {
            actions.push({
              label: "Report Pickup Failure",
              icon: <MdClose aria-hidden="true" size={16} className="text-red-600" />,
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("tracking", row),
            });
          }

          // Shipment details already provides status updates. Keep the inline
          // editor only for roles that cannot open the shipment screen.
          if (
            !canViewShipments &&
            !(isDoorstepReturn(row) && !row.collectionQc?.collectedAt && !["replacement", "exchange"].includes(row.resolution)) &&
            ([
              "reverse_pickup_scheduled",
              "pickup_failed",
              "in_reverse_transit",
            ].includes(row.status) || (isDoorstepReturn(row) && !!row.collectionQc?.collectedAt)) &&
            row.reverseShipment?.shipmentId &&
            reverseTrackingOptions(row).length > 0
          ) {
            actions.push({
              label: row.collectionQc?.collectedAt ? "Track Return to Warehouse" : "Manage Return Shipment",
              icon: (
                <MdLocalShipping
                  aria-hidden="true"
                  size={16}
                  className="text-blue-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("tracking", row),
            });
          }

          if (row.status === "shipped_back") {
            actions.push({
              label: "Confirm Receipt",
              icon: (
                <MdAssignmentReturn
                  aria-hidden="true"
                  size={16}
                  className="text-green-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("receive", row),
            });
          }

          doorstepReturnActions(row).forEach(type => actions.push({
            label: {
              exchange: row.status === "pickup_failed" ? "Retry Doorstep Exchange" : "Arrange Doorstep Exchange",
              visit: "Confirm Courier Arrival",
              qc: canConfirmDoorstepCollection(row) ? "Confirm Collection" : "Record Doorstep QC",
              replacement_approve: "Prepare Doorstep Replacement",
              replacement_ship: "Dispatch Doorstep Replacement",
              replacement_deliver: "Confirm Replacement Handover",
            }[type],
            icon: <MdFactCheck aria-hidden="true" size={16} className="text-amber-600" />,
            requiredModule: "returns", requiredAction: "update",
            onClick: () => openAction(type, row),
          }));

          if (row.status === "received" && !isDoorstepReturn(row)) {
            actions.push({
              label: "Record QC",
              icon: (
                <MdFactCheck
                  aria-hidden="true"
                  size={16}
                  className="text-amber-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("qc", row),
            });
          }

          if (
            row.status === "qc_failed" &&
            row.qcReview?.status === "evidence_requested"
          ) {
            actions.push({
              label: "Submit QC Evidence",
              icon: (
                <MdUploadFile
                  aria-hidden="true"
                  size={16}
                  className="text-violet-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("qc_evidence", row),
            });
          }

          if (!isSeller && row.status === "qc_failed") {
            actions.push({
              label: "Review QC Failure",
              icon: (
                <MdRateReview
                  aria-hidden="true"
                  size={16}
                  className="text-amber-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("qc_decision", row),
            });
          }

          if (
            row.status === "qc_failure_upheld" &&
            row.returnToCustomer?.required !== false &&
            !row.returnToCustomer?.trackingNumber
          ) {
            actions.push({
              label: "Return to Customer",
              icon: (
                <MdAssignmentReturn
                  aria-hidden="true"
                  size={16}
                  className="text-orange-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("return_customer", row),
            });
          }

          if (
            row.status === "qc_failure_upheld" &&
            row.returnToCustomer?.trackingNumber
          ) {
            actions.push({
              label: "Update Customer Shipment",
              icon: (
                <MdLocalShipping
                  aria-hidden="true"
                  size={16}
                  className="text-blue-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("return_customer_tracking", row),
            });
          }

          if (["qc_passed", "qc_completed"].includes(row.status)) {
            if (!isSeller && getAllowedReturnResolutions(row).includes("refund")) {
              actions.push({
                label: "Process Refund",
                icon: (
                  <MdReplay
                    aria-hidden="true"
                    size={16}
                    className="text-orange-600"
                  />
                ),
                requiredModule: "returns",
                requiredAction: "update",
                onClick: () => openAction("refund", row),
              });
            }

            if (
              !isDoorstepReturn(row) && getAllowedReturnResolutions(row).includes("replacement") &&
              ["replacement", "exchange"].includes(row.resolution)
            ) {
              actions.push({
                label: "Request Replacement",
                icon: (
                  <MdSwapHoriz
                    aria-hidden="true"
                    size={16}
                    className="text-violet-600"
                  />
                ),
                requiredModule: "returns",
                requiredAction: "update",
                onClick: () => openAction("replacement_request", row),
              });
            }
          }

          if (!isDoorstepReturn(row) && !isSeller && row.status === "replacement_requested" &&
            ["replacement", "exchange"].includes(row.resolution) &&
            getAllowedReturnResolutions(row).includes("replacement")) {
            actions.push({
              label: "Approve Replacement",
              icon: (
                <MdCheckCircle
                  aria-hidden="true"
                  size={16}
                  className="text-green-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("replacement_approve", row),
            });
          }

          if (!isDoorstepReturn(row) && row.status === "replacement_created") {
            actions.push({
              label: "Ship Replacement",
              icon: (
                <MdLocalShipping
                  aria-hidden="true"
                  size={16}
                  className="text-indigo-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("replacement_ship", row),
            });
          }

          if (!isDoorstepReturn(row) && !isSeller && row.status === "replacement_shipped") {
            actions.push({
              label: "Confirm Replacement Delivery",
              icon: (
                <MdCheckCircle
                  aria-hidden="true"
                  size={16}
                  className="text-green-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("replacement_deliver", row),
            });
          }

          if (!isSeller && row.status === "replacement_delivered") {
            actions.push({
              label: "Complete Replacement",
              icon: (
                <MdDoneAll
                  aria-hidden="true"
                  size={16}
                  className="text-green-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("replacement_complete", row),
            });
          }

          if (!isSeller && row.status === "refund_failed") {
            actions.push({
              label: "Retry Refund",
              icon: (
                <MdReplay
                  aria-hidden="true"
                  size={16}
                  className="text-orange-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("retry_refund", row),
            });
          }

          if (
            !isSeller &&
            ["refund_pending", "refund_failed"].includes(row.status) &&
            row.refund?.providerRefundId
          ) {
            actions.push({
              label: "Sync Refund Status",
              icon: (
                <MdRefresh
                  aria-hidden="true"
                  size={16}
                  className="text-blue-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("sync_refund", row),
            });
          }

          if (
            !isSeller &&
            !["closed", "refunded", "replaced"].includes(row.status) &&
            !(
              row.status === "qc_failure_upheld" &&
              row.returnToCustomer?.required !== false &&
              row.returnToCustomer?.status !== "delivered"
            )
          ) {
            actions.push({
              label: "Close Return",
              icon: (
                <MdClose
                  aria-hidden="true"
                  size={16}
                  className="text-gray-600"
                />
              ),
              requiredModule: "returns",
              requiredAction: "update",
              onClick: () => openAction("close", row),
            });
          }

          return actions;
        }}
        requiredModule="returns"
        tableContainerClassName="overflow-x-auto overscroll-x-contain"
        tableClassName="min-w-[1480px]"
        exportConfig={{
          onClick: handleExport,
          disabled: loading || !visibleReturns.length,
        }}
      />
      <DefaultModal isOpen={Boolean(exchangeReturn)} title="Manage Doorstep Exchange" isButtonView={false}
        onClose={() => { setExchangeReturn(null); setExchangeContextId(""); setExchangeError(""); }}>
        {exchangeReturn && <>
          {exchangeError && <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p>{exchangeError}</p><Button className="mt-3" onClick={() => openExchange(exchangeReturn)}>Refresh Exchange</Button>
          </div>}
          <DoorstepExchangePanel request={exchangeReturn} isSeller={isSeller} canViewShipments={canViewShipments}
            loading={loading || !!exchangeError}
            onAction={type => { setExchangeReturn(null); openAction(type, exchangeReturn); }}
            onDetails={() => { setExchangeReturn(null); openDetail(exchangeReturn); }}
            onShipment={path => { setExchangeReturn(null); setExchangeContextId(""); navigate(path); }} />
        </>}
      </DefaultModal>
      <DefaultModal
        isOpen={Boolean(detailReturn)}
        onClose={() => {
          setDetailReturn(null);
          if (exchangeContextId) openExchange({ _id: exchangeContextId });
        }}
        title={returnDetailPresentation(detailReturn || {}).title}
        isButtonView={false}
      >
        <div className="space-y-5 text-sm">
          {/* Seller Overview */}
          {isSeller && (
            <SellerReturnOverview returnRequest={detailReturn || {}} />
          )}

          {/* Seller QC Guidance */}
          {isSeller && sellerQcGuidance(detailReturn) && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-900">
                    Next step: {sellerQcGuidance(detailReturn).label}
                  </p>

                  {detailReturn?.status === "qc_failed" && (
                    <p className="mt-1.5 text-xs leading-5 text-blue-800">
                      Only this returned item's payout remains held. Do not
                      release a refund or change the payout manually. The
                      customer may dispute the QC result, and an admin must
                      uphold, override, partially approve, or request more
                      evidence.
                    </p>
                  )}

                  {detailReturn?.status === "qc_failure_upheld" &&
                    detailReturn?.returnToCustomer?.required !== false && (
                      <p className="mt-1.5 text-xs leading-5 text-blue-800">
                        Ship the rejected product back to the customer and keep
                        its tracking updated. This item's payout hold is
                        released after delivery is confirmed.
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Return Information */}
          <FormSection
            title="Return Information"
            description="Basic information and current status of this return request."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                {
                  label: "Return Number",
                  value: detailReturn?.returnNumber || "Not assigned",
                  className: "break-all",
                },
                {
                  label: "Order",
                  custom: (
                    <OrderLink
                      orderId={detailReturn?.orderId || detailReturn?.order_id}
                      orderNumber={orderNumber(detailReturn)}
                    />
                  ),
                },
                {
                  label: "Buyer",
                  value: buyerName(detailReturn) || "Not assigned",
                  subtext: buyerContact(detailReturn),
                },
                {
                  label: "Customer’s requested resolution",
                  value: returnDetailPresentation(detailReturn || {}).resolution,
                },
                {
                  label: "Request status",
                  value: formatLabel(detailReturn?.status || "Not recorded"),
                  className: "capitalize",
                },
                { label: "Requested at", value: formatDateTime12Hour(detailReturn?.createdAt || detailReturn?.created_at) },
                ...(detailReturn?.approvedAt ? [{ label: "Accepted at", value: formatDateTime12Hour(detailReturn.approvedAt) }] : []),
                {
                  label: "Customer’s return reason",
                  value: formatLabel(detailReturn?.reason || "Not provided"),
                },
              ].map((item, index) => (
                <div key={index} className={INFO_CARD_CLASS}>
                  <p className={LABEL_CLASS}>{item.label}</p>

                  {item.custom ? (
                    <div className="mt-1">{item.custom}</div>
                  ) : (
                    <p className={` ${item.className || ""}`}>{item.value}</p>
                  )}

                  {item.subtext && (
                    <p className="mt-1 text-xs text-gray-500">{item.subtext}</p>
                  )}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Customer’s explanation and evidence" description="Information supplied with this request; inspection findings are recorded separately.">
            <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{detailReturn?.description || "No additional explanation provided."}</p>
            <div className="mt-3 flex flex-wrap gap-3">{(detailReturn?.photos || []).map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Customer evidence {index + 1}</a>
            ))}</div>
          </FormSection>
          <details className="rounded-lg border border-gray-200 p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Purchased Product Policy</summary>
            <p className="mt-3 text-gray-600">Policy-supported options: {getAllowedReturnResolutions(detailReturn || {}).map(formatLabel).join(" / ") || "None recorded"}. These describe the purchased product policy. This request follows the customer’s selected resolution shown above.</p>
          </details>

          {returnDecisionDetails(detailReturn || {}).length > 0 && (
            <FormSection title="Decision and exception details" description="These are review or processing reasons, separate from the customer’s original return reason.">
              <div className="space-y-3">{returnDecisionDetails(detailReturn).map(entry => (
                <div key={entry.label} className={INFO_CARD_CLASS}><p className={LABEL_CLASS}>{entry.label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{entry.value}</p></div>
              ))}</div>
            </FormSection>
          )}

          {/* Refund Information */}

          <FormSection
            title={returnDetailPresentation(detailReturn || {}).replacement ? "Replacement Information" : "Refund Information"}
            description={["replacement", "exchange"].includes(detailReturn?.resolution)
              ? "The item value is recorded for accounting; it is not a scheduled customer refund."
              : "Details about the refund amount, method, reference, and processing status."}
          >
            {(() => {
              const presentation = returnDetailPresentation(detailReturn || {});
              const refund = detailReturn?.refund || {};
              const refundInfo = [
                { label: presentation.amountLabel, value: money(presentation.amount) },
                ...(presentation.replacement ? [
                  { label: "Replacement status", value: detailReturn?.replacement?.status ? formatLabel(detailReturn.replacement.status) : "Not prepared yet" },
                  { label: "Replacement order", value: detailReturn?.replacement?.orderNumber || detailReturn?.replacementOrderId },
                  { label: "Replacement delivery tracking number", value: detailReturn?.replacement?.trackingNumber },
                ] : [
                  { label: "Refund status", value: refund.status ? formatLabel(refund.status) : "Not started" },
                  { label: "Refund method", value: refund.method || detailReturn?.refundMethod ? formatLabel(refund.method || detailReturn.refundMethod) : null },
                  { label: "Refund reference", value: refund.referenceId || detailReturn?.refundReferenceId },
                  { label: "Payment provider refund reference", value: refund.providerRefundId || detailReturn?.providerRefundId },
                ]),
              ].filter(
                (item) =>
                  item.value != null &&
                  String(item.value).trim() !== "" &&
                  String(item.value).toLowerCase() !== "not available",
              );

              return refundInfo.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {refundInfo.map((item) => (
                    <div
                      key={item.label}
                      className={`${INFO_CARD_CLASS} ${
                        item.fullWidth ? "md:col-span-2" : ""
                      }`}
                    >
                      <p className={LABEL_CLASS}>{item.label}</p>
                      <p className={`${VALUE_CLASS} ${item.className || ""}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
          </FormSection>

          {/* Eligibility & Reverse Shipping */}
          <FormSection
            title="Eligibility & Reverse Shipping"
            description="Return eligibility and reverse shipment information."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                {
                  label: "Return Window",
                  value: detailReturn?.policySnapshot?.returnWindowDays
                    ? formatReturnDuration(detailReturn.policySnapshot.returnWindowDays)
                    : "Not available",
                },
                {
                  label: "Eligible Until",
                  value: formatDateTime12Hour(
                    detailReturn?.policySnapshot?.eligibleUntil,
                  ),
                },
                {
                  label: "Courier booking reference",
                  value:
                    detailReturn?.reverseShipment?.awbNumber ||
                    detailReturn?.reverseShipment?.shipment?.awb_number ||
                    "Not assigned",
                  className: "break-all text-sm font-regular text-[#252238]",
                },
                {
                  label: "Courier",
                  value:
                    detailReturn?.reverseShipment?.courierName ||
                    detailReturn?.reverseShipment?.provider ||
                    "Not assigned",
                },
                {
                  label: "Return pickup tracking number",
                  value:
                    detailReturn?.reverseShipment?.trackingNumber ||
                    detailReturn?.reverseShipment?.shipment?.tracking_number ||
                    detailReturn?.trackingNumber ||
                    "Not available",
                  className: "break-all text-sm font-regular text-[#252238]",
                },
                {
                  label: "Scheduled Pickup",
                  value: formatDateTime12Hour(detailReturn?.reverseShipment?.pickupScheduledAt),
                },
                {
                  label: "Expected Warehouse Arrival",
                  value: formatDateTime12Hour(detailReturn?.reverseShipment?.shipment?.expected_delivery_at),
                },
                {
                  label: "Shipment Status",
                  value: display(detailReturn?.reverseShipment?.status),
                  className: "capitalize",
                },
              ].map((item, index) => (
                <div key={index} className={INFO_CARD_CLASS}>
                  <p className={LABEL_CLASS}>{item.label}</p>
                  <p className={`${VALUE_CLASS} ${item.className || ""}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            {canViewShipments && getReturnShipmentLinks(detailReturn || {}).map(link => (
              <Button
                key={link.label}
                onClick={() => navigate(link.path)}
                requiredModule="delivery"
                requiredAction="view"
                className="mt-3 mr-3 inline-flex items-center gap-2"
              >
                <MdLocalShipping aria-hidden="true" size={16} />
                {link.label}
              </Button>
            ))}
            {(detailReturn?.replacementOrderId || detailReturn?.replacement?.orderId) &&
              !getReturnShipmentLinks(detailReturn || {}).some(link => link.label === "View Replacement Shipment") && (
                <p className="mt-3 text-sm text-gray-500">
                  Replacement order created. Use Ship Replacement to book its shipment.
                </p>
              )}
          </FormSection>

          {detailReturn?.collectionQc?.required && (
            <FormSection title="Doorstep QC and collection" description="Inspection is recorded before collection. Warehouse inventory is updated only after physical receipt.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[["Inspection", display(detailReturn.collectionQc.status)], ["Collected", formatDateTime12Hour(detailReturn.collectionQc.collectedAt)], ["Warehouse received", formatDateTime12Hour(detailReturn.collectionQc.warehouseReceivedAt)]].map(([label, value]) => (
                  <div key={label} className={INFO_CARD_CLASS}><p className={LABEL_CLASS}>{label}</p><p className={VALUE_CLASS}>{value || "Pending"}</p></div>
                ))}
              </div>
              {(detailReturn.collectionQc.items || []).map(item => (
                <div key={item.orderItemId} className="mt-3 rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-semibold">{detailReturn.items?.find(entry => entry.orderItemId === item.orderItemId)?.productTitle || item.orderItemId}</p>
                  <p>Inspected: {item.quantity} · Accepted: {item.acceptedQuantity}</p>
                  <p className="mt-1 text-gray-600">{item.notes}</p>
                  <div className="mt-2 flex flex-wrap gap-2">{Object.entries(item.checks || {}).map(([key, value]) => <span key={key}>{({ identity: "Product identity", serialNumber: "Serial number / IMEI", accessories: "Accessories", packaging: "Packaging", condition: "Condition eligibility" })[key] || formatLabel(key)}: {formatLabel(value)}</span>)}</div>
                  <div className="mt-2 flex flex-wrap gap-2">{(item.photos || []).map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View inspection photo</a>)}</div>
                </div>
              ))}
            </FormSection>
          )}

          {/* Items */}
          <FormSection
            title="Returned Items"
            description="Products, quantities, refund, and quality check information."
          >
            <div className="space-y-3">
              {(detailReturn?.items || []).map((item, index) => {
                const productLabel =
                  item.productTitle ||
                  item.productName ||
                  item.product?.title ||
                  item.product?.name;

                const sellerLabel = sellerName(item, detailReturn);

                const itemPolicy =
                  item.policySnapshot || item.policy_snapshot || {};

                const itemReturnWindow =
                  item.returnWindowDays ??
                  item.return_window_days ??
                  itemPolicy.returnWindowDays ??
                  itemPolicy.return_window_days;

                const itemEligibleUntil =
                  item.returnEligibleUntil ||
                  item.return_eligible_until ||
                  itemPolicy.eligibleUntil ||
                  itemPolicy.returnUntil;

                const requiresImages =
                  item.requiresImages ??
                  item.requires_images ??
                  itemPolicy.requiresImages ??
                  itemPolicy.requires_images;

                const inspectionRequired =
                  item.inspectionRequired ??
                  item.inspection_required ??
                  itemPolicy.inspectionRequired ??
                  itemPolicy.inspection_required;

                const itemFields = [
                  {
                    label: "Return Window",
                    value: itemReturnWindow
                      ? formatReturnDuration(itemReturnWindow)
                      : "Not available",
                  },
                  {
                    label: "Eligible Until",
                    value: formatDateTime12Hour(itemEligibleUntil),
                  },
                  {
                    label: "Images",
                    value: requiresImages ? "Required" : "Optional",
                  },
                  {
                    label: "Inspection",
                    value:
                      inspectionRequired === false
                        ? "Not required"
                        : "Required",
                  },
                  {
                    label: "Quantity",
                    value: `Requested ${
                      item.requestedQuantity || item.quantity || 0
                    } · Approved ${item.approvedQuantity || 0}${detailReturn?.collectionQc?.required ? ` · Collected ${item.collectedQuantity ?? 0}` : ""} · Warehouse received ${item.receivedQuantity || 0}`,

                  },
                  {
                    label: ["replacement", "exchange"].includes(detailReturn?.resolution) ? "Item Value" : "Refund",
                    value: money(item.refundAmount),
                    className: "font-regular text-sm text-[#252238]",
                  },
                  {
                    label: "QC Result",
                    value: display(item.qcResult),
                  },
                  {
                    label: "Condition",
                    value: display(item.condition),
                  },
                  {
                    label: "Restocked",
                    value: item.restockedQuantity || 0,
                  },
                  {
                    label: "Damaged",
                    value: item.damagedQuantity || 0,
                  },
                ];

                return (
                  <div
                    key={`${item.productId}-${index}`}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    {/* Product Header */}
                    <div className="mb-4 border-b border-gray-200 pb-3">
                      <p className="font-semibold text-gray-900">
                        {productLabel || "Product details unavailable"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Seller: {sellerLabel || "Not assigned"} · SKU:{" "}
                        {item.variantSku || item.productSku || "Not available"}
                      </p>
                    </div>

                    {/* Item Details */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {itemFields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className={ITEM_CARD_CLASS}>
                          <p className={LABEL_CLASS}>{field.label}</p>
                          <p
                            className={`${VALUE_CLASS} ${
                              field.className || ""
                            }`}
                          >
                            {field.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!detailReturn?.items?.length && (
                <EmptyState>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    No returned items available.
                  </p>
                </EmptyState>
              )}
            </div>
          </FormSection>

          {/* Refund Processing Attempts */}
          {!isSeller && (
            <FormSection
              title="Refund Processing Attempts"
              description="History of payment provider attempts made while processing the refund."
            >
              <div className="space-y-2">
                {(detailReturn?.refund?.attempts || []).map(
                  (attempt, index) => (
                    <div
                      key={attempt.attemptId || index}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="font-medium capitalize text-gray-900">
                            {display(attempt.status)}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-xs text-gray-500">Refund Amount</p>
                          <p className="font-semibold text-gray-900">
                            {money(attempt.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                        <div>
                          <span className="font-medium text-gray-700">
                            Method:
                          </span>{" "}
                          {display(attempt.method)}
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            Provider:
                          </span>{" "}
                          {display(attempt.provider)}
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            Wallet:
                          </span>{" "}
                          {money(attempt.walletAmount)}
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            Provider Amount:
                          </span>{" "}
                          {money(attempt.providerAmount)}
                        </div>

                        {attempt.providerRefundId && (
                          <div className="break-all sm:col-span-2">
                            <span className="font-medium text-gray-700">
                              Provider Refund ID:
                            </span>{" "}
                            {attempt.providerRefundId}
                          </div>
                        )}

                        {attempt.startedAt && (
                          <div>
                            <span className="font-medium text-gray-700">
                              Started:
                            </span>{" "}
                            {formatDateTime12Hour(attempt.startedAt)}
                          </div>
                        )}
                      </div>

                      {attempt.failureReason && (
                        <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-2.5 text-xs text-red-600">
                          <span className="font-medium">Failure:</span>{" "}
                          {attempt.failureReason}
                        </div>
                      )}
                    </div>
                  ),
                )}

                {!detailReturn?.refund?.attempts?.length && (
                  <EmptyState>
                    <p className="mt-2 text-center text-xs text-gray-500">
                      No refund attempts.
                    </p>
                  </EmptyState>
                )}
              </div>
            </FormSection>
          )}

          {/* QC Review */}
          {detailReturn?.qcReview &&
            Object.keys(detailReturn.qcReview).length > 0 && (
              <FormSection
                title="QC Review"
                description="Quality check and dispute information for the returned item."
              >
                <div className="space-y-2">
                  <div className={ITEM_CARD_CLASS}>
                    <p className={LABEL_CLASS}>Status</p>
                    <p className={`${VALUE_CLASS} capitalize`}>
                      {display(detailReturn.qcReview.status)}
                    </p>
                  </div>

                  <div className={ITEM_CARD_CLASS}>
                    <p className={LABEL_CLASS}>Dispute Deadline</p>
                    <p className={VALUE_CLASS}>
                      {formatDateTime12Hour(
                        detailReturn.qcReview.disputeDeadline,
                      )}
                    </p>
                  </div>

                  {detailReturn.qcReview.customerDispute?.reason && (
                    <div className={ITEM_CARD_CLASS}>
                      <p className={LABEL_CLASS}>Customer Dispute</p>
                      <p className={VALUE_CLASS}>
                        {detailReturn.qcReview.customerDispute.reason}
                      </p>
                    </div>
                  )}

                  {detailReturn.qcReview.evidenceRequestReason && (
                    <div className={ITEM_CARD_CLASS}>
                      <p className={LABEL_CLASS}>Evidence Requested</p>
                      <p className={VALUE_CLASS}>
                        {detailReturn.qcReview.evidenceRequestReason}
                      </p>
                    </div>
                  )}

                  {detailReturn.qcReview.adminDecision && (
                    <div className={ITEM_CARD_CLASS}>
                      <p className={LABEL_CLASS}>Admin Decision</p>
                      <p className={VALUE_CLASS}>
                        {display(detailReturn.qcReview.adminDecision)}
                        {detailReturn.qcReview.decisionReason && (
                          <span className="text-gray-500">
                            {" "}
                            — {detailReturn.qcReview.decisionReason}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {(detailReturn.qcReview.sellerEvidence || []).map(
                    (evidence, index) => (
                      <div
                        key={evidence.orderItemId || index}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <p className="text-xs font-medium text-gray-900">
                          {display(evidence.result)}
                        </p>

                        <p className="mt-1 text-xs text-gray-600">
                          {evidence.notes || "No note"}
                        </p>

                        {(evidence.photos || []).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {evidence.photos.map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-gray-50"
                              >
                                View Evidence
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </FormSection>
            )}

          {/* Return To Customer Shipment */}
          {detailReturn?.returnToCustomer?.trackingNumber && (
            <FormSection
              title="Return-to-Customer Shipment"
              description="Shipment details for the rejected product being returned to the customer."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Courier",
                    value:
                      detailReturn.returnToCustomer.courierName ||
                      "Not available",
                  },
                  {
                    label: "Tracking Number",
                    value: detailReturn.returnToCustomer.trackingNumber,
                    className: "break-all font-inter text-xs",
                  },
                  {
                    label: "Status",
                    value: display(detailReturn.returnToCustomer.status),
                    className: "capitalize",
                    fullWidth: true,
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={`${INFO_CARD_CLASS} ${
                      item.fullWidth ? "sm:col-span-2" : ""
                    }`}
                  >
                    <p className={LABEL_CLASS}>{item.label}</p>
                    <p className={`${VALUE_CLASS} ${item.className || ""}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          {/* Timeline */}
          <FormSection
            title="Timeline"
            description="Track the progress and activity history of this return."
          >
            <div className="space-y-3">
              {(detailReturn?.timeline || []).map((item, index) => (
                <div
                  key={`${item.status}-${index}`}
                  className="relative rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium capitalize text-gray-900">
                      {display(item.status)}
                    </p>

                    <p className="text-xs text-gray-500">
                      {formatDateTime12Hour(item.at)}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    Actor: {display(item.actorRole)}
                  </p>

                  {item.reason && (
                    <div className="mt-2 rounded-md capitalize border border-gray-200 bg-white p-2 text-xs text-gray-600">
                      <span className="font-medium text-gray-700">Reason:</span>{" "}
                      {formatLabel(item.reason)}
                    </div>
                  )}

                  {item.note && (
                    <div className="mt-2 rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-600">
                      <span className="font-medium text-gray-700">Note:</span>{" "}
                      {item.note}
                    </div>
                  )}
                </div>
              ))}

              {!detailReturn?.timeline?.length && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                  No timeline activity available.
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </DefaultModal>
      <DefaultModal
        isOpen={action.open}
        onClose={() => {
          closeActionModal();
          if (exchangeContextId) openExchange({ _id: exchangeContextId });
        }}
        title={action.title}
        onSubmit={
          collectionConfirmationOnly || (action.type === "qc_decision" && isDoorstepReturn(action.returnRequest))
            ? prepareAction
            : action.type === "approve" && !isSeller
            ? approveReturnFormik.handleSubmit
            : action.type === "schedule"
              ? scheduleReturnFormik.handleSubmit
              : action.type === "close"
                ? closeReturnFormik.handleSubmit
                : action.type === "reject"
                  ? rejectReturnFormik.handleSubmit
                  : action.type === "replacement_request"
                    ? replacementRequestFormik.handleSubmit
                    : action.type === "tracking"
                      ? reverseTrackingFormik.handleSubmit
                      : ["qc", "qc_evidence", "qc_decision"].includes(
                            action.type,
                          )
                        ? qcFormik.handleSubmit
                        : prepareAction
        }
        submitButtonText={action.type === "tracking" && isDoorstepReturn(action.returnRequest) && !action.returnRequest.collectionQc?.collectedAt ? "Report Pickup Failure" : action.type === "visit" ? "Confirm Arrival" : action.type === "qc" && isDoorstepReturn(action.returnRequest) ? collectionConfirmationOnly ? isDoorstepExchange(action.returnRequest) ? "Confirm Exchange Completed" : "Confirm Collection" : isDoorstepExchange(action.returnRequest) ? "Save Exchange Inspection" : "Save Inspection" : "Continue"}
        submitDisabled={(action.type === "visit" && !action.courierAtDoorstep) || (collectionConfirmationOnly && (!action.collectionConfirmed || (isDoorstepExchange(action.returnRequest) && (!action.replacementReady || !action.replacementInspected || !action.customerAccepted))))}
        closeButtonText={exchangeContextId ? "Back to Exchange" : "Cancel"}
        loading={loading}
      >
        <div className="space-y-5">
          {/* =====================================================
        REFUND DETAILS
    ====================================================== */}
          {((!isSeller && action.type === "approve") ||
            ["refund", "retry_refund"].includes(action.type)) && (
            <FormSection
              title={["replacement", "exchange"].includes(action.returnRequest?.resolution) ? "Item Value" : "Refund Details"}
              description="Review the approved item value and payment information."
            >
              <div className="space-y-4">
                <FormInput
                  label={["replacement", "exchange"].includes(action.returnRequest?.resolution) ? "Item Value" : "Refund Amount"}
                  disabled
                  name="refundAmount"
                  type="number"
                  min="0"
                  value={action.refundAmount}
                  onChange={(event) => {
                    approveReturnFormik.handleChange(event);
                    setAction((prev) => ({
                      ...prev,
                      refundAmount: event.target.value,
                    }));
                  }}
                  onBlur={approveReturnFormik.handleBlur}
                  error={
                    action.type === "approve" &&
                    approveReturnFormik.touched.refundAmount
                      ? approveReturnFormik.errors.refundAmount
                      : ""
                  }
                  required
                />

                {["refund", "retry_refund"].includes(action.type) && (
                  <FormInput
                    label="Reference ID"
                    name="referenceId"
                    value={action.referenceId}
                    onChange={(event) =>
                      setAction((prev) => ({
                        ...prev,
                        referenceId: event.target.value,
                      }))
                    }
                    placeholder="Enter refund reference ID"
                    required
                  />
                )}

                {["refund", "retry_refund"].includes(action.type) && (
                  <FormSelectGroup wrapSingleValue
                    label="Refund Method"
                    value={
                      [
                        {
                          value: "auto",
                          label: "Automatic allocation",
                        },
                        {
                          value: "original_payment",
                          label: "Original payment",
                        },
                        {
                          value: "wallet",
                          label: "Wallet credit",
                        },
                        {
                          value: "split",
                          label: "Wallet + original payment",
                        },
                        {
                          value: "manual",
                          label: "Manual bank/cash refund",
                        },
                      ].find((option) => option.value === action.method) || null
                    }
                    options={[
                      {
                        value: "auto",
                        label: "Automatic allocation",
                      },
                      {
                        value: "original_payment",
                        label: "Original payment",
                      },
                      {
                        value: "wallet",
                        label: "Wallet credit",
                      },
                      {
                        value: "split",
                        label: "Wallet + original payment",
                      },
                      {
                        value: "manual",
                        label: "Manual bank/cash refund",
                      },
                    ]}
                    onChange={(selectedOption) =>
                      setAction((prev) => ({
                        ...prev,
                        method: selectedOption?.value || "",
                      }))
                    }
                    placeholder="Select refund method"
                  />
                )}

                {action.method === "split" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormInput
                      label="Wallet Amount"
                      name="walletAmount"
                      type="number"
                      min="0"
                      value={action.walletAmount}
                      onChange={(event) =>
                        setAction((prev) => ({
                          ...prev,
                          walletAmount: event.target.value,
                        }))
                      }
                    />

                    <FormInput
                      label="Provider Amount"
                      name="providerAmount"
                      type="number"
                      min="0"
                      value={action.providerAmount}
                      onChange={(event) =>
                        setAction((prev) => ({
                          ...prev,
                          providerAmount: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {/* =====================================================
        SELLER APPROVAL INFORMATION
    ====================================================== */}
          {isSeller && action.type === "approve" && (
            <FormSection
              title="Approval Information"
              description="Important information about accepting this return."
            >
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm leading-6 text-blue-900">
                  {isDoorstepExchange(action.returnRequest)
                    ? "Accept the quantities for a doorstep exchange. Next, arrange the courier visit. The old item must pass doorstep QC and be collected before replacement handover."
                    : isDoorstepReturn(action.returnRequest)
                      ? "Accept the quantities eligible for a return pickup. This does not confirm collection or a refund. The courier will inspect the item before collection; platform finance handles the approved refund afterward."
                      : "Accept the quantities eligible to be sent back. This does not confirm warehouse receipt or a refund. Record receipt and warehouse QC separately before refund or replacement processing."}
                </p>
              </div>
            </FormSection>
          )}

          {/* =====================================================
        QC DECISION
    ====================================================== */}
          {action.type === "qc_decision" && (
            <FormSection
              title="QC Decision"
              description="Review the seller QC result and select the appropriate decision."
            >
              <div className="space-y-4">
                <ReturnQcDecisionField
                  doorstep={isDoorstepReturn(action.returnRequest)}
                  value={action.decision}
                  onChange={decision => setAction(prev => ({ ...prev, decision }))}
                />

                {isDoorstepReturn(action.returnRequest) && (
                  <p className="text-sm text-gray-600">The item is still with the customer. Review may confirm rejection or allow reinspection; it cannot authorize a refund or replacement handover before collection.</p>
                )}
                {action.decision === "uphold" && !isDoorstepReturn(action.returnRequest) && (
                  <FormToggleRow
                    title="Return rejected product to customer"
                    description="Seller must ship the rejected product back to the customer."
                    isToggle={action.returnToCustomerRequired}
                    handleClick={() =>
                      setAction((prev) => ({
                        ...prev,
                        returnToCustomerRequired:
                          !prev.returnToCustomerRequired,
                      }))
                    }
                  />
                )}

                <FormInput
                  label="Decision Reason"
                  name="decisionReason"
                  type="textarea"
                  value={action.reason}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Enter the reason for this decision"
                  required
                />
              </div>
            </FormSection>
          )}

          {/* =====================================================
        REJECT / CLOSE
    ====================================================== */}
          {["reject", "close"].includes(action.type) && (
            <FormSection
              title={
                action.type === "reject" ? "Rejection Details" : "Close Details"
              }
              description={
                action.type === "reject"
                  ? "Provide the reason for rejecting this return."
                  : "Provide a reason for closing this return."
              }
            >
              <FormInput
                label={action.type === "reject" ? "Reason" : "Close Reason"}
                name="reason"
                value={action.reason}
                onChange={(event) => {
                  if (action.type === "close") {
                    closeReturnFormik.handleChange(event);
                  }
                  if (action.type === "reject") {
                    rejectReturnFormik.handleChange(event);
                  }
                  setAction((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }));
                }}
                onBlur={
                  action.type === "close"
                    ? closeReturnFormik.handleBlur
                    : action.type === "reject"
                      ? rejectReturnFormik.handleBlur
                      : undefined
                }
                error={
                  action.type === "close" && closeReturnFormik.touched.reason
                    ? closeReturnFormik.errors.reason
                    : action.type === "reject" &&
                        rejectReturnFormik.touched.reason
                      ? rejectReturnFormik.errors.reason
                      : ""
                }
                placeholder="Enter reason"
                required={["reject", "close"].includes(action.type)}
              />
              {action.type === "reject" && (
                <FormInput
                  label="Note"
                  name="note"
                  type="textarea"
                  value={formAction.note}
                  onChange={(event) => {
                    rejectReturnFormik.handleChange(event);
                    setAction((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }));
                  }}
                  onBlur={rejectReturnFormik.handleBlur}
                  error={
                    rejectReturnFormik.touched.note
                      ? rejectReturnFormik.errors.note
                      : ""
                  }
                  placeholder="Add an optional note..."
                />
              )}
              {action.type === "close" && (
                <FormInput
                  label="Note"
                  name="note"
                  type="textarea"
                  value={formAction.note}
                  onChange={(event) => {
                    closeReturnFormik.handleChange(event);
                    setAction((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }));
                  }}
                  onBlur={closeReturnFormik.handleBlur}
                  error={
                    closeReturnFormik.touched.note
                      ? closeReturnFormik.errors.note
                      : ""
                  }
                  placeholder="Add an optional note..."
                />
              )}
            </FormSection>
          )}

          {action.type === "exchange_failure" && <FormSection title="Exchange not completed"
            description="Leave the old item with the customer and do not hand over the replacement. Explain the issue below. Resolve replacement condition or customer acceptance before rescheduling." />}
          {action.type === "exchange" && (
            <FormSection title="One visit, one exchange" description="Prepare the replacement and arrange collection together. The courier must inspect and collect the old item before handing over the replacement during the same visit.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormSelectGroup wrapSingleValue label="Courier / delivery service" name="courierName"
                  options={formAction.courierName && !DELIVERY_METHOD_OPTIONS.some(option => option.value === formAction.courierName)
                    ? [{ value: formAction.courierName, label: formAction.courierName }, ...DELIVERY_METHOD_OPTIONS] : DELIVERY_METHOD_OPTIONS}
                  value={formAction.courierName ? { value: formAction.courierName, label: DELIVERY_METHOD_OPTIONS.find(option => option.value === formAction.courierName)?.label || formAction.courierName } : null}
                  onChange={option => setAction(previous => ({ ...previous, courierName: option?.value || "" }))}
                  placeholder="Select courier" required />
                <FormInput label="Exchange tracking / booking reference" name="exchangeReference"
                  helperText="One reference for this same-visit exchange. The courier brings the replacement and collects the old item together."
                  value={action.exchangeReference || ""}
                  onChange={event => setAction(previous => ({ ...previous, exchangeReference: event.target.value }))} required />
                {["approved", "pickup_failed"].includes(action.returnRequest.status) && (
                  <FormInput label="Exchange visit scheduled at" name="pickupScheduledAt" type="datetime-local" value={formAction.pickupScheduledAt || ""}
                    onChange={event => setAction(previous => ({ ...previous, pickupScheduledAt: event.target.value }))} />
                )}
              </div>
              <p className="mt-3 text-xs text-gray-600">Use the exchange reference supplied by the courier. Existing replacement stock and parcel records are reused when rescheduling; no second replacement is prepared.</p>
            </FormSection>
          )}

          {action.type === "schedule" && (
            <FormSection
              title="Arrange Return Collection"
              description={action.returnRequest?.status === "pickup_failed"
                ? "Create a new pickup attempt. The previous courier booking remains in history; arrival and QC must be confirmed again for the new visit."
                : "Choose how the item will return to the seller. Booking a pickup does not confirm inspection or collection."}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {formAction.mode === "reverse_pickup" && (
                    <FormSelectGroup wrapSingleValue
                      label="Shipping Mode"
                      value={
                        [
                          { value: "standard", label: "Standard" },
                          { value: "express", label: "Express" },
                          { value: "same_day", label: "Same day" },
                          { value: "hyperlocal", label: "Hyperlocal" },
                        ].find(
                          (option) => option.value === formAction.shippingMode,
                        ) || null
                      }
                      options={[
                        { value: "standard", label: "Standard" },
                        { value: "express", label: "Express" },
                        { value: "same_day", label: "Same day" },
                        { value: "hyperlocal", label: "Hyperlocal" },
                      ]}
                      onChange={option => scheduleReturnFormik.setFieldValue("shippingMode", option?.value || "")}
                      placeholder="Select shipping mode"
                    />
                  )}
                </div>

                {formAction.mode === "reverse_pickup" ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormSelectGroup wrapSingleValue
                      label="Courier"
                      className="md:col-span-2"
                      name="courierName"
                      options={formAction.courierName && !DELIVERY_METHOD_OPTIONS.some(option => option.value === formAction.courierName)
                        ? [{ value: formAction.courierName, label: formAction.courierName }, ...DELIVERY_METHOD_OPTIONS]
                        : DELIVERY_METHOD_OPTIONS}
                      value={formAction.courierName ? {
                        value: formAction.courierName,
                        label: DELIVERY_METHOD_OPTIONS.find(option => option.value === formAction.courierName)?.label || formAction.courierName,
                      } : null}
                      onChange={option => {
                        const courierName = option?.value || "";
                        scheduleReturnFormik.setFieldValue("courierName", courierName);
                        scheduleReturnFormik.setFieldTouched("courierName", true, false);
                        setAction(previous => ({ ...previous, courierName }));
                      }}
                      error={scheduleReturnFormik.touched.courierName ? scheduleReturnFormik.errors.courierName : ""}
                      placeholder="Select courier"
                      isClearable={false}
                      onBlur={() => scheduleReturnFormik.setFieldTouched("courierName", true)}
                      required
                    />

                    <FormInput
                      label={action.returnRequest?.status === "pickup_failed" ? "New pickup tracking number" : "Return pickup tracking number"}
                      helperText={action.returnRequest?.status === "pickup_failed" ? "Enter the tracking number supplied for the new courier booking. The failed attempt keeps its original tracking history." : undefined}
                      name="trackingNumber"
                      maxLength={100}
                      minLength={3}
                      limitMessage="Tracking number must be between 3 and 100 characters."
                      showLengthCount={false}
                      value={formAction.trackingNumber}
                      onChange={(event) => {
                        scheduleReturnFormik.handleChange(event);
                        setAction((prev) => ({
                          ...prev,
                          trackingNumber: event.target.value,
                        }));
                      }}
                      onBlur={scheduleReturnFormik.handleBlur}
                      error={
                        scheduleReturnFormik.touched.trackingNumber
                          ? scheduleReturnFormik.errors.trackingNumber
                          : ""
                      }
                      placeholder="Enter courier tracking number"
                      required
                    />

                    <FormInput
                      label="Pickup Date"
                      name="pickupScheduledAt"
                      type="datetime-local"
                      value={formAction.pickupScheduledAt}
                      min={moment().format("YYYY-MM-DDTHH:mm")}
                      onChange={(event) => {
                        const selectedValue = event.target.value;
                        const selectedDate = moment(selectedValue);
                        const currentDate = moment();

                        if (selectedDate.isBefore(currentDate)) {
                          toast.error(
                            "Pickup date and time cannot be in the past.",
                          );
                          return;
                        }

                        scheduleReturnFormik.setFieldValue("pickupScheduledAt", selectedValue);
                      }}
                    />
                    <FormInput
                      label="Expected Warehouse Arrival (optional)"
                      name="expectedDeliveryAt"
                      type="datetime-local"
                      min={formAction.pickupScheduledAt || moment().format("YYYY-MM-DDTHH:mm")}
                      value={formAction.expectedDeliveryAt}
                      onChange={event => scheduleReturnFormik.setFieldValue("expectedDeliveryAt", event.target.value)}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm leading-6 text-blue-900">
                      The customer will provide the return courier and tracking
                      details. Confirm receipt only after the customer marks the
                      package as shipped and it reaches you.
                    </p>
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {/* =====================================================
        TRACKING
    ====================================================== */}
          {action.type === "tracking" && (
            <FormSection
              title={isDoorstepReturn(action.returnRequest) && !action.returnRequest.collectionQc?.collectedAt ? "Report Pickup Failure" : "Return Shipment Tracking"}
              description={isDoorstepReturn(action.returnRequest) && !action.returnRequest.collectionQc?.collectedAt ? "Use this only when the courier visit could not be completed. The item remains with the customer. After saving, reschedule pickup from Returns. Product inspection failures must be recorded in Doorstep QC." : "Track the existing return parcel back to the warehouse."}
            >
              {isDoorstepReturn(action.returnRequest) && !action.returnRequest.collectionQc?.collectedAt ? (
                <p className="text-sm text-gray-700">Explain the failed visit in the required note below.</p>
              ) : (<FormSelectGroup wrapSingleValue
                label="Shipment Status"
                value={
                  reverseTrackingOptions(action.returnRequest).find(
                    (option) => option.value === action.shipmentStatus,
                  ) || null
                }
                options={reverseTrackingOptions(action.returnRequest)}
                onChange={(selectedOption) =>
                  setAction((prev) => ({
                    ...prev,
                    shipmentStatus: selectedOption?.value || "",
                  }))
                }
                placeholder="Select shipment status"
              />)}
            </FormSection>
          )}

          {action.type === "replacement_deliver" && isDoorstepReturn(action.returnRequest) && (
            <FormSection title="Confirm doorstep handover" description="The old item has passed QC and been collected. Record delivery only after the replacement is physically given to the customer.">
              <FormSelectGroup wrapSingleValue label="Replacement handed over"
                options={[{ value: false, label: "Not handed over" }, { value: true, label: "Replacement physically handed to customer" }]}
                value={{ value: action.handoverConfirmed === true, label: action.handoverConfirmed ? "Replacement physically handed to customer" : "Not handed over" }}
                onChange={option => setAction(previous => ({ ...previous, handoverConfirmed: option?.value === true }))} isClearable={false} />
            </FormSection>
          )}
          {action.type === "visit" && (
            <FormSection title="Start the actual doorstep visit" description="Booking a shipment does not mean the courier has arrived. Confirm this only when the courier is physically with the customer and ready to inspect the item.">
              <Input type="checkbox" name="courierAtDoorstep" value={action.courierAtDoorstep === true}
                onChange={event => setAction(previous => ({ ...previous, courierAtDoorstep: event.target.checked }))}
                required>
                <span className="text-sm leading-6">I confirm the courier is at the customer’s address and ready to inspect the item. <span className="text-red-500" aria-hidden="true">*</span></span>
              </Input>
              <p className="mt-3 text-xs leading-5 text-gray-500">If the courier has not arrived, close this form and wait. Use the pickup-failure action only when the scheduled visit could not be completed.</p>
            </FormSection>
          )}

          {action.type === "qc" && isDoorstepReturn(action.returnRequest) && (
            <FormSection title={isDoorstepExchange(action.returnRequest) ? collectionConfirmationOnly ? "Complete the doorstep exchange" : "Inspect the old item" : collectionConfirmationOnly ? "Confirm physical collection" : "Record doorstep inspection"}
              description={isDoorstepExchange(action.returnRequest) ? collectionConfirmationOnly ? "Check the replacement with the customer. Confirm completion only after both collection and handover happen together. If either item fails or the customer refuses the replacement, close this form and record an exchange failure." : "Inspect the old item first and save the required notes and photos. Do not collect it unless the replacement also passes inspection and the customer accepts the exchange." : collectionConfirmationOnly ? "Your inspection is already saved. Confirm only after the courier physically takes the accepted units. You do not need to repeat QC." : "Record the checks, accepted quantities, notes and photos first. Saving inspection does not confirm physical collection or start a refund."}>
              <p className="mb-3 text-sm text-gray-700">Customer's reported reason: {formatLabel(action.returnRequest?.reason)}. {action.returnRequest?.description || ""}</p>
              {collectionConfirmationOnly ? <>
                <div className="mb-4 space-y-3">{(action.returnRequest.collectionQc.items || []).map(item => (
                  <div key={item.orderItemId} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                    <p className="font-semibold">{action.returnRequest.items?.find(entry => entry.orderItemId === item.orderItemId)?.productTitle || "Inspected item"}</p>
                    <p className="mt-1">Inspected: {item.quantity} · Eligible for collection: {item.acceptedQuantity}</p>
                    <p className="mt-2 whitespace-pre-wrap text-gray-600">{item.notes}</p>
                  </div>
                ))}</div>
                <Input type="checkbox" name="collectionConfirmed" value={action.collectionConfirmed === true} required
                  onChange={event => setAction(previous => ({ ...previous, collectionConfirmed: event.target.checked }))}>
                  <span>{isDoorstepExchange(action.returnRequest) ? "I confirm the old item was collected and the replacement was handed to the customer during the same visit." : "I confirm the courier physically collected the accepted units. Rejected units remain with the customer."}</span>
                </Input>
                {["replacement", "exchange"].includes(action.returnRequest?.resolution) && (
                  <Input type="checkbox" name="replacementReady" value={action.replacementReady === true} required
                    onChange={event => setAction(previous => ({ ...previous, replacementReady: event.target.checked }))}>
                    <span>The replacement is with the courier for this exchange.</span>
                  </Input>
                )}
                {isDoorstepExchange(action.returnRequest) && <>
                  <Input type="checkbox" name="replacementInspected" value={action.replacementInspected === true} required
                    onChange={event => setAction(previous => ({ ...previous, replacementInspected: event.target.checked }))}>
                    <span>The replacement was opened with the customer, and its product, variant and condition were checked.</span>
                  </Input>
                  <Input type="checkbox" name="customerAccepted" value={action.customerAccepted === true} required
                    onChange={event => setAction(previous => ({ ...previous, customerAccepted: event.target.checked }))}>
                    <span>The customer accepted the replacement. No exchange takes place if either item fails inspection.</span>
                  </Input>
                </>}
              </> : <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{isDoorstepExchange(action.returnRequest) ? "Save the old item inspection first. Next, check the replacement with the customer and confirm the exchange together. If either item fails, leave the old item with the customer." : "Save the inspection below. If QC passes, confirm physical collection in the next step. If QC fails, leave the item with the customer for review."}</p>}
            </FormSection>
          )}

          {/* =====================================================
        ITEM DECISIONS
    ====================================================== */}
          {["approve", "receive", "qc", "qc_evidence", "qc_decision"].includes(
            action.type,
          ) && !collectionConfirmationOnly && !(action.type === "qc_decision" && isDoorstepReturn(action.returnRequest)) && (
            <FormSection
              title={action.type === "approve" ? "Items to Accept" : "Item Decisions"}
              description={action.type === "approve" ? "Review the requested quantities. Nothing is marked collected or received by accepting this request." : "Review and update the decision for each returned item."}
            >
              <div className="space-y-4">
                {currentItemActions.map((item, index) => (
                  <div
                    key={`${item.orderItemId || item.productId}-${index}`}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.label}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        {[
                          ["Requested", item.requestedQuantity],
                          ...(action.type === "approve" ? [] : [["Accepted", item.recordedApprovedQuantity]]),
                          ["Collected", item.recordedCollectedQuantity],
                          ["Warehouse received", item.recordedReceivedQuantity],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                            <p className="text-gray-500">{label}</p><p className="mt-1 font-semibold text-gray-900">{value ?? 0}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {action.type === "approve" && (
                      <FormInput label="Quantity being accepted" name={`approvedQuantity-${index}`} type="text"
                        value={item.approvedQuantity} readOnly
                        helperText="Prefilled from the customer’s requested quantity. Collection and QC are recorded separately." />
                    )}

                    {action.type === "receive" && (
                      <FormInput
                        label={`Received Quantity${
                          item.approvedQuantity ||
                          item.requestedQuantity ||
                          item.quantity
                            ? ` (max ${
                                item.approvedQuantity ||
                                item.requestedQuantity ||
                                item.quantity
                              })`
                            : ""
                        }`}
                        name={`receivedQuantity-${index}`}
                        type="number"
                        min="0"
                        max={
                          item.approvedQuantity ||
                          item.requestedQuantity ||
                          item.quantity ||
                          undefined
                        }
                        value={item.receivedQuantity}
                        onChange={(event) =>
                          updateItemAction(
                            index,
                            "receivedQuantity",
                            event.target.value,
                          )
                        }
                        required
                      />
                    )}

                    {action.type === "qc" && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {isDoorstepReturn(action.returnRequest) && (
                          <div className="space-y-4 md:col-span-2">
                            <p className="text-sm font-semibold text-gray-800">1. Inspect all {item.approvedQuantity} approved unit(s)</p>
                            <p className="text-xs leading-5 text-gray-500">For partial acceptance, these checks must pass for every accepted unit. Explain why the remaining units failed in the inspection notes.</p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {[["identity", "Product / variant identity"], ["serialNumber", "Serial number / IMEI"], ["accessories", "Required accessories"], ["packaging", "Required packaging"], ["condition", "Condition eligible under return policy"]].map(([key, label]) => (
                                <FormSelectGroup wrapSingleValue key={key} label={label}
                                  options={[{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }, ...(["identity", "condition"].includes(key) ? [] : [{ value: "not_applicable", label: "Not required by policy" }])]}
                                  value={item.checks?.[key] ? { value: item.checks[key], label: item.checks[key] === "not_applicable" ? "Not required by policy" : item.checks[key] === "pass" ? "Pass" : "Fail" } : null}
                                  error={qcFormik.submitCount > 0 || qcFormik.touched.itemActions?.[index]?.checks?.[key] ? qcFormik.errors.itemActions?.[index]?.checks?.[key] : ""}
                                  onChange={option => {
                                    qcFormik.setFieldTouched(`itemActions[${index}].checks.${key}`, true, false);
                                    qcFormik.setFieldValue(`itemActions[${index}]`, updateDoorstepChecklist(item, key, option?.value || ""));
                                  }}
                                  placeholder="Record inspection result" required />
                              ))}
                            </div>
                            <p className="text-sm font-semibold text-gray-800">2. Record eligible units and the inspection decision</p>
                            <ReturnAcceptedQuantityField formik={qcFormik} index={index} maximum={item.approvedQuantity} automatic />
                          </div>
                        )}
                        {!isDoorstepReturn(action.returnRequest) && <FormInput
                          label={`QC Quantity${
                            item.receivedQuantity ||
                            item.approvedQuantity ||
                            item.quantity
                              ? ` (max ${
                                  item.receivedQuantity ||
                                  item.approvedQuantity ||
                                  item.quantity
                                })`
                              : ""
                          }`}
                          name={`qcQuantity-${index}`}
                          type="number"
                          min="1"
                          maxLength={10}
                          showLengthCount={false}
                          step="1"
                          max={
                            item.receivedQuantity ||
                            item.approvedQuantity ||
                            item.quantity ||
                            undefined
                          }
                          helperText={`Enter a whole number from 1 to ${
                            item.receivedQuantity ||
                            item.approvedQuantity ||
                            item.quantity
                          }.`}
                          value={item.quantity}
                          disabled
                          onChange={(event) =>
                            updateItemAction(
                              index,
                              "quantity",
                              event.target.value,
                            )
                          }
                          onBlur={() =>
                            qcFormik.setFieldTouched(
                              `itemActions[${index}].quantity`,
                              true,
                            )
                          }
                          error={
                            qcFormik.touched.itemActions?.[index]?.quantity
                              ? qcFormik.errors.itemActions?.[index]?.quantity
                              : ""
                          }
                          required
                        />}

                        <div>
                          <FormSelectGroup wrapSingleValue
                            label={isDoorstepReturn(action.returnRequest) ? "Inspection decision" : "Disposition"}
                            value={
                              (isDoorstepReturn(action.returnRequest) ? DOORSTEP_QC_DISPOSITION_OPTIONS : QC_DISPOSITION_OPTIONS).find(
                                (option) => option.value === item.result,
                              ) || null
                            }
                            options={isDoorstepReturn(action.returnRequest) ? DOORSTEP_QC_DISPOSITION_OPTIONS : QC_DISPOSITION_OPTIONS}
                            onChange={(selectedOption) => {
                              qcFormik.setFieldTouched(
                                `itemActions[${index}].result`,
                                true,
                              );
                              updateItemAction(
                                index,
                                "result",
                                selectedOption?.value || selectedOption || "",
                              );
                            }}
                            error={
                              qcFormik.touched.itemActions?.[index]?.result
                                ? qcFormik.errors.itemActions?.[index]?.result
                                : ""
                            }
                            required
                            placeholder={isDoorstepReturn(action.returnRequest) ? "Select inspection decision" : "Select disposition"}
                          />
                        </div>
                        <FormInput
                          label="Condition"
                          name={`condition-${index}`}
                          value={item.condition}
                          onChange={(event) =>
                            updateItemAction(
                              index,
                              "condition",
                              event.target.value,
                            )
                          }
                          onBlur={() =>
                            qcFormik.setFieldTouched(
                              `itemActions[${index}].condition`,
                              true,
                            )
                          }
                          minLength={3}
                          maxLength={200}
                          limitMessage="Condition must be between 3 and 200 characters."
                          showLengthCount={false}
                          error={
                            qcFormik.touched.itemActions?.[index]?.condition
                              ? qcFormik.errors.itemActions?.[index]?.condition
                              : ""
                          }
                          placeholder="Enter item condition"
                        />

                        {isDoorstepReturn(action.returnRequest) && <p className="text-sm font-semibold text-gray-800 md:col-span-2">3. Add inspection notes and photos</p>}
                        <FormInput
                          label="Inspection notes"
                          type="textarea"
                          rows={4}
                          className="md:col-span-2"
                          required={isDoorstepReturn(action.returnRequest) || ["missing", "rejected"].includes(item.result)}
                          helperText={isDoorstepReturn(action.returnRequest) || ["missing", "rejected"].includes(item.result) ? "Required for this item. Explain the inspection result and any rejected units." : "Add details about the inspection result."}
                          name={`itemNote-${index}`}
                          value={item.notes}
                          onChange={(event) =>
                            updateItemAction(index, "notes", event.target.value)
                          }
                          onBlur={() =>
                            qcFormik.setFieldTouched(
                              `itemActions[${index}].notes`,
                              true,
                            )
                          }
                          minLength={3}
                          maxLength={500}
                          showLengthCount={true}
                          limitMessage="Inspection notes must be between 3 and 500 characters."
                          error={
                            qcFormik.touched.itemActions?.[index]?.notes
                              ? qcFormik.errors.itemActions?.[index]?.notes
                              : ""
                          }
                          placeholder="Describe what was checked, the item’s condition, and the reason for any failed checks or rejected units."
                        />

                        <div className="md:col-span-2">
                          <QCEvidenceUploader
                            required={isDoorstepReturn(action.returnRequest) || ["missing", "rejected"].includes(item.result)}
                            value={item.photos}
                            onChange={(value) =>
                              updateItemAction(index, "photos", value)
                            }
                            onBlur={() =>
                              qcFormik.setFieldTouched(
                                `itemActions[${index}].photos`,
                                true,
                              )
                            }
                            error={
                              qcFormik.touched.itemActions?.[index]?.photos
                                ? qcFormik.errors.itemActions?.[index]?.photos
                                : ""
                            }
                          />
                        </div>
                      </div>
                    )}

                    {action.type === "qc_evidence" && (
                      <div className="space-y-4">
                        <FormInput
                          label="Additional Inspection Notes"
                          name={`inspectionNotes-${index}`}
                          type="textarea"
                          value={item.notes}
                          onChange={(event) =>
                            updateItemAction(index, "notes", event.target.value)
                          }
                          onBlur={() =>
                            qcFormik.setFieldTouched(
                              `itemActions[${index}].notes`,
                              true,
                            )
                          }
                          minLength={3}
                          maxLength={500}
                          limitMessage="Inspection note must be between 3 and 500 characters."
                          error={
                            qcFormik.touched.itemActions?.[index]?.notes
                              ? qcFormik.errors.itemActions?.[index]?.notes
                              : ""
                          }
                          placeholder="Enter additional inspection notes"
                          required
                        />

                        <QCEvidenceUploader
                          value={item.photos}
                          onChange={(value) =>
                            updateItemAction(index, "photos", value)
                          }
                          onBlur={() =>
                            qcFormik.setFieldTouched(
                              `itemActions[${index}].photos`,
                              true,
                            )
                          }
                          error={
                            qcFormik.touched.itemActions?.[index]?.photos
                              ? qcFormik.errors.itemActions?.[index]?.photos
                              : ""
                          }
                          required
                        />
                      </div>
                    )}

                    {action.type === "qc_decision" &&
                      ["override", "partial"].includes(action.decision) && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormInput
                            label={`Approved Quantity${
                              item.receivedQuantity ||
                              item.requestedQuantity ||
                              item.quantity
                                ? ` (max ${
                                    item.receivedQuantity ||
                                    item.requestedQuantity ||
                                    item.quantity
                                  })`
                                : ""
                            }`}
                            name={`refundApprovedQuantity-${index}`}
                            type="number"
                            min="0"
                            max={
                              item.receivedQuantity ||
                              item.requestedQuantity ||
                              item.quantity ||
                              undefined
                            }
                            value={item.approvedQuantity}
                            onChange={(event) =>
                              updateItemAction(
                                index,
                                "approvedQuantity",
                                event.target.value,
                              )
                            }
                            required
                          />

                          <FormSelectGroup wrapSingleValue
                            label="Inventory Disposition"
                            value={
                              item.result === "sellable"
                                ? "sellable"
                                : "damaged"
                            }
                            options={[
                              {
                                value: "damaged",
                                label: "Damaged / quarantine",
                              },
                              {
                                value: "sellable",
                                label: "Sellable / restock",
                              },
                            ]}
                            onChange={(selectedOption) =>
                              updateItemAction(
                                index,
                                "result",
                                selectedOption?.value || selectedOption || "",
                              )
                            }
                            placeholder="Select disposition"
                          />
                        </div>
                      )}
                  </div>
                ))}
                {action.type === "approve" &&
                  approveReturnFormik.touched.itemActions &&
                  approveReturnFormik.errors.itemActions && (
                    <p className="text-xs text-red-600">
                      {approveReturnFormik.errors.itemActions}
                    </p>
                  )}
              </div>
            </FormSection>
          )}

          {/* =====================================================
        RETURN TO CUSTOMER
    ====================================================== */}
          {action.type === "return_customer" && (
            <FormSection
              title="Return-to-Customer Shipment"
              description="Enter the courier and tracking information for the rejected product."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput
                  label="Courier"
                  name="courierName"
                  value={formAction.courierName}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      courierName: event.target.value,
                    }))
                  }
                  placeholder="Enter courier name"
                  required
                />

                <FormInput
                  label="Delivery tracking number for rejected item"
                  name="trackingNumber"
                  value={formAction.trackingNumber}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      trackingNumber: event.target.value,
                    }))
                  }
                  placeholder="Enter courier tracking number"
                  required
                />

                <FormInput
                  label="Tracking URL"
                  name="trackingUrl"
                  value={action.trackingUrl}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      trackingUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
            </FormSection>
          )}

          {/* =====================================================
        RETURN CUSTOMER TRACKING
    ====================================================== */}
          {action.type === "return_customer_tracking" && (
            <FormSection
              title="Return Shipment Tracking"
              description="Update the shipment status and current location."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormSelectGroup wrapSingleValue
                  label="Shipment Status"
                  value={action.shipmentStatus}
                  options={[
                    {
                      value: "in_transit",
                      label: "In transit",
                    },
                    {
                      value: "delivered",
                      label: "Delivered to customer",
                    },
                    {
                      value: "failed",
                      label: "Delivery failed",
                    },
                  ]}
                  onChange={(selectedOption) =>
                    setAction((prev) => ({
                      ...prev,
                      shipmentStatus:
                        selectedOption?.value || selectedOption || "",
                    }))
                  }
                  placeholder="Select shipment status"
                />

                <FormInput
                  label="Location"
                  name="location"
                  value={action.location}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Enter current location"
                />
              </div>
            </FormSection>
          )}

          {/* =====================================================
        REPLACEMENT SHIPMENT
    ====================================================== */}
          {action.type === "replacement_ship" && (
            <FormSection
              title="Replacement Shipment"
              description="Enter the courier and tracking information for the replacement."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput
                  label="Courier"
                  name="courierName"
                  value={formAction.courierName}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      courierName: event.target.value,
                    }))
                  }
                  placeholder="Enter courier name"
                  required
                />

                <FormInput
                  label="Replacement delivery tracking number"
                  name="trackingNumber"
                  value={formAction.trackingNumber}
                  onChange={(event) =>
                    setAction((prev) => ({
                      ...prev,
                      trackingNumber: event.target.value,
                    }))
                  }
                  placeholder="Enter courier tracking number"
                  required
                />
                <FormInput
                  label="Expected Customer Delivery (optional)"
                  name="expectedDeliveryAt"
                  type="datetime-local"
                  min={moment().format("YYYY-MM-DDTHH:mm")}
                  value={formAction.expectedDeliveryAt}
                  onChange={(event) => setAction((prev) => ({
                    ...prev, expectedDeliveryAt: event.target.value,
                  }))}
                />
              </div>
            </FormSection>
          )}

          {/* =====================================================
        COMMON NOTE
    ====================================================== */}
          {!["reject", "close"].includes(action.type) && (
            <FormSection
              title="Additional Notes"
              description="Add any additional information related to this action."
            >
              <FormInput
                label={action.type === "tracking" && ["pickup_failed", "failed"].includes(action.shipmentStatus) ? "Pickup failure reason" : "Note"}
                required={action.type === "exchange_failure" || (action.type === "tracking" && ["pickup_failed", "failed"].includes(action.shipmentStatus))}
                name="note"
                type="textarea"
                maxLength={500}
                minLength={3}
                limitMessage="Note must be between 3 and 500 characters."
                showLengthCount={true}
                value={formAction.note}
                onChange={(event) => {
                  if (action.type === "approve") {
                    approveReturnFormik.handleChange(event);
                  }
                  if (action.type === "schedule") {
                    scheduleReturnFormik.handleChange(event);
                  }
                  if (action.type === "close") {
                    closeReturnFormik.handleChange(event);
                  }
                  if (action.type === "reject") {
                    rejectReturnFormik.handleChange(event);
                  }
                  if (action.type === "replacement_request") {
                    replacementRequestFormik.handleChange(event);
                  }
                  if (action.type === "tracking") {
                    reverseTrackingFormik.handleChange(event);
                  }
                  if (
                    ["qc", "qc_evidence", "qc_decision"].includes(action.type)
                  ) {
                    qcFormik.handleChange(event);
                  }
                  setAction((prev) => ({
                    ...prev,
                    note: event.target.value,
                  }));
                }}
                onBlur={
                  action.type === "approve"
                    ? approveReturnFormik.handleBlur
                    : action.type === "schedule"
                      ? scheduleReturnFormik.handleBlur
                      : action.type === "close"
                        ? closeReturnFormik.handleBlur
                        : action.type === "reject"
                          ? rejectReturnFormik.handleBlur
                          : action.type === "replacement_request"
                            ? replacementRequestFormik.handleBlur
                            : action.type === "tracking"
                              ? reverseTrackingFormik.handleBlur
                              : ["qc", "qc_evidence", "qc_decision"].includes(
                                    action.type,
                                  )
                                ? qcFormik.handleBlur
                                : undefined
                }
                error={
                  action.type === "approve" && approveReturnFormik.touched.note
                    ? approveReturnFormik.errors.note
                    : action.type === "schedule" &&
                        scheduleReturnFormik.touched.note
                      ? scheduleReturnFormik.errors.note
                      : action.type === "close" &&
                          closeReturnFormik.touched.note
                        ? closeReturnFormik.errors.note
                        : action.type === "reject" &&
                            rejectReturnFormik.touched.note
                          ? rejectReturnFormik.errors.note
                          : action.type === "replacement_request" &&
                              replacementRequestFormik.touched.note
                            ? replacementRequestFormik.errors.note
                            : action.type === "tracking" &&
                                reverseTrackingFormik.touched.note
                              ? reverseTrackingFormik.errors.note
                              : ["qc", "qc_evidence", "qc_decision"].includes(
                                    action.type,
                                  ) && qcFormik.touched.note
                                ? qcFormik.errors.note
                                : ""
                }
                placeholder={action.type === "tracking" && ["pickup_failed", "failed"].includes(action.shipmentStatus) ? "Explain why the courier could not collect the item" : "Add an optional note..."}
              />
            </FormSection>
          )}
        </div>
      </DefaultModal>

      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false })}
        onConfirm={executeAction}
        title={confirmAction.title}
        message={confirmAction.message}
        variant={
          action.type === "reject" || action.type === "close"
            ? "danger"
            : "warning"
        }
        confirmLabel="Confirm"
        loading={loading}
      />
    </div>
  );
};

export default Returns;
