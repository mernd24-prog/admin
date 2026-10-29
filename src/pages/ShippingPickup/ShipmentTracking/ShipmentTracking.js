import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormik } from "formik";

import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdLocalShipping,
  MdLocationOn,
  MdOpenInNew,
  MdPayments,
  MdPerson,
  MdStorefront,
  MdTimeline,
  MdVisibility,
} from "react-icons/md";
import { ButtonLoader } from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  OrderLink,
  SellerIdentity,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  addShipmentTracking,
  getShipment,
  getShipments,
} from "../../../Redux/deliverySlice";
import { usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import { exportToExcelWorkbook } from "../../../_helpers/exportToCsv";
import { shipmentTrackingActionValidationSchema } from "../../../_helpers/validationSchemas";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const STATUS_OPTIONS = [
  "initiated",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
  "rto",
  "lost",
  "damaged",
];
const FULFILLMENT_STATUS_OPTIONS = [
  { value: "initiated", label: "Initiated" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed delivery" },
  { value: "rto", label: "Return to origin" },
  { value: "cancelled", label: "Cancelled" },
];
const DELIVERY_METHOD_OPTIONS = [
  { value: "manual", label: "Manual / Seller Delivery" },
  { value: "Local Same Day", label: "Local Same Day" },
  {
    value: "Prepaid Heavy and High Value",
    label: "Prepaid Heavy and High Value",
  },
  { value: "Express Metro", label: "Express Metro" },
  { value: "Standard All India", label: "Standard All India" },
  { value: "Ecom Express", label: "Ecom Express" },
];
const FULFILLMENT_TRANSITIONS = {
  initiated: ["in_transit", "failed"],
  manifested: ["in_transit", "failed"],
  picked_up: ["in_transit", "failed", "rto"],
  in_transit: ["delivered", "failed", "rto"],
  out_for_delivery: ["delivered", "failed", "rto"],
  failed: ["in_transit", "rto"],
};
// const COURIER_METHOD_OPTIONS = [
//   {
//     value: "Manual / seller delivery",
//     label: "Manual / seller delivery",
//     hint: "Seller handles delivery directly",
//   },
//   { value: "Delhivery", label: "Delhivery", hint: "Courier partner" },
//   { value: "Blue Dart", label: "Blue Dart", hint: "Courier partner" },
//   { value: "DTDC", label: "DTDC", hint: "Courier partner" },
//   { value: "Ecom Express", label: "Ecom Express", hint: "Courier partner" },
//   { value: "India Post", label: "India Post", hint: "Postal shipment" },
//   { value: "Xpressbees", label: "Xpressbees", hint: "Courier partner" },
//   {
//     value: "Other courier",
//     label: "Other courier",
//     hint: "Use tracking reference below",
//   },
// ];
const unwrapList = (payload = {}) => {
  const data = payload?.data?.data || payload?.data || payload;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || [],
    total: Number(
      data?.total ??
        payload?.meta?.total ??
        data?.list?.length ??
        data?.items?.length ??
        0,
    ),
  };
};
const unwrapResult = (payload = {}) =>
  payload?.data?.data || payload?.data || payload || {};

// const orderIdOf = (row) =>
//   row.order_id || row.orderId || row.order?._id || row.order?.id;

const displayStatus = (value = "") =>
  String(value || "N/A")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const sellerNameFromSnapshot = (snapshot = {}) =>
  snapshot.sellerName ||
  snapshot.seller_name ||
  snapshot.displayName ||
  snapshot.businessName ||
  snapshot.name ||
  snapshot.email ||
  "";
const shipmentStepLabel = (value = "") =>
  FULFILLMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label ||
  displayStatus(value);
const isCodPayment = (codValue, row = {}) =>
  Boolean(codValue) ||
  codValue === "true" ||
  codValue === 1 ||
  String(row?.payment_provider || row?.paymentProvider || "").toLowerCase() ===
    "cod";

const paymentTypeLabel = (codValue, row = {}) =>
  isCodPayment(codValue, row) ? "COD" : "Prepaid";

const isCancelledBeforeShipment = (shipment = {}) =>
  String(shipment?.status || "").toLowerCase() === "cancelled" &&
  !(
    shipment?.shipped_at ||
    shipment?.shippedAt ||
    shipment?.delivered_at ||
    shipment?.deliveredAt
  );
const getTrackingActionOptions = (currentStatus = "initiated") => {
  const nextStatuses = FULFILLMENT_TRANSITIONS[currentStatus] || [];
  const options = FULFILLMENT_STATUS_OPTIONS.filter(
    (option) =>
      nextStatuses.includes(option.value) && option.value !== "cancelled",
  );
  if (currentStatus === "in_transit") {
    return [
      { value: "in_transit", label: "Update in-transit ETA" },
      ...options,
    ];
  }
  return options;
};
const getDefaultTrackingStatus = (currentStatus = "initiated") =>
  getTrackingActionOptions(currentStatus)[0]?.value || currentStatus;
const getInitialQuery = (key) =>
  new URLSearchParams(window.location.search).get(key) || "";
const initialShipmentId = getInitialQuery("shipmentId");
const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const ShipmentFact = ({ icon, label, children }) => (
  <div className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-white p-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="mt-0.5 break-words  text-sm font-medium text-gray-800">
        {children || "—"}
      </div>
    </div>
  </div>
);

const ShipmentTracking = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((state) => state.delivery);
  const shipmentPayload = unwrapList(selector.shipmentsData);
  const [exporting, setExporting] = useState(false);
  const initialOrderId = getInitialQuery("orderId");
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
   defaultFilters: {
  orderNumber: getInitialQuery("orderNumber"),
  sellerId: getInitialQuery("sellerId"),
  search: initialShipmentId,
},
  });

  const handleExport = async () => {
    const query = toQueryParams();
    setExporting(true);
    try {
      const pageLimit = 100;
      const shipmentRows = [];
      const seenIds = new Set();
      let offset = 0;
      let total = shipmentPayload.total;

      while (true) {
        const response = await axiosPrivate.get(ENDPOINTS.delivery.shipments, {
          params: {
            ...query,
            page: undefined,
            limit: pageLimit,
            offset,
          },
        });
        const pageResult = unwrapList(response.data);
        const pageRows = pageResult.list;
        if (pageResult.total) total = pageResult.total;
        if (!pageRows.length) break;

        pageRows.forEach((row) => {
          const id = row?.id || row?._id;
          if (id && seenIds.has(String(id))) return;
          if (id) seenIds.add(String(id));
          shipmentRows.push(row);
        });

        offset += pageRows.length;
        if (pageRows.length < pageLimit) break;
        if (total && offset >= total) break;
      }

      if (!shipmentRows.length) {
        toast.info("No shipment data available to export.");
        return;
      }

      const excelColumns = [
        ...columns.map((column) => ({
          key: column.key,
          label: column.label,
        })),
        { key: "shipment_id", label: "Shipment ID" },
        { key: "awb_number", label: "AWB / Tracking Number" },
        { key: "tracking_url", label: "Tracking URL" },
        { key: "recipient_name", label: "Recipient Name" },
        { key: "recipient_phone", label: "Recipient Phone" },
        { key: "delivery_address", label: "Delivery Address" },
        { key: "shipped_at", label: "Shipped At" },
        { key: "delivered_at", label: "Delivered At" },
        { key: "payment_provider", label: "Payment Provider" },
        { key: "payment_status", label: "Payment Status" },
        { key: "shipping_mode", label: "Shipping Mode" },
      ];

      const data = shipmentRows.map((row) => {
        const exportRow = {};

        excelColumns.forEach(({ key, label }) => {
          // Export the order/shipment reference instead of the raw ID.
          if (
            String(key).toLowerCase() === "shipment" ||
            String(label).toLowerCase() === "shipment"
          ) {
            exportRow[key] =
              row?.orderNumber ||
              row?.order_number ||
              row?.label_data?.orderNumber ||
              row?.orderId ||
              row?.order_id ||
              "";
            return;
          }

          // Export seller name instead of seller ID.
          if (key === "seller_id") {
            const sellerId = String(
              row?.seller_id ||
                row?.sellerId ||
                row?.seller?._id ||
                row?.seller?.id ||
                "",
            );

            const sellerName =
              row?.sellerName ||
              row?.seller?.businessName ||
              row?.seller?.companyName ||
              row?.seller?.displayName ||
              row?.seller?.name ||
              sellerOptions.find((seller) => String(seller.value) === sellerId)
                ?.label;

            exportRow[key] = sellerName || "Sam Global";
            return;
          }

          if (key === "shipment_id") {
            exportRow[key] = row?.id || row?._id || "";
            return;
          }

          if (key === "awb_number") {
            exportRow[key] = row?.awb_number || row?.tracking_number || "";
            return;
          }

          if (key === "recipient_name") {
            exportRow[key] = row?.ship_to_snapshot?.fullName || "";
            return;
          }

          if (key === "recipient_phone") {
            exportRow[key] = row?.ship_to_snapshot?.phone || "";
            return;
          }

          if (key === "delivery_address") {
            const address = row?.ship_to_snapshot || {};
            exportRow[key] = [
              address.line1,
              address.line2,
              address.city,
              address.state,
              address.postalCode,
              address.country,
            ]
              .filter(Boolean)
              .join(", ");
            return;
          }

          if (key === "shipped_at" || key === "delivered_at") {
            const value =
              row?.[key] ||
              row?.[
                key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
              ];
            exportRow[key] = formatDateTime12Hour(value, "");
            return;
          }

          if (key === "expected_delivery_at") {
            const value =
              row?.status === "delivered"
                ? row?.delivered_at ||
                  row?.deliveredAt ||
                  row?.expected_delivery_at ||
                  row?.expectedDeliveryAt
                : row?.expected_delivery_at || row?.expectedDeliveryAt;
            exportRow[key] = formatDateTime12Hour(value, "N/A");
            return;
          }

          const value = row?.[key];
          exportRow[key] = value === null || value === undefined ? "" : value;
        });

        return exportRow;
      });

      const exported = exportToExcelWorkbook(
        [
          {
            name: "Shipments",
            title: "Shipment Tracking Report",
            data,
            columns: excelColumns,
          },
        ],
        "Shipment_Tracking_Report.xlsx",
      );

      if (exported) {
        toast.success("Shipment report exported successfully.");
      } else {
        toast.error("Unable to export shipment report.");
      }
    } catch (error) {
      console.error("Shipment export error:", error);
      toast.error("Failed to export shipment report.");
    } finally {
      setExporting(false);
    }
  };

  const { toQueryParams, filters, setFilter } = list;

  const hasResolvedInitialRef = useRef(false);

useEffect(() => {
  if (
    hasResolvedInitialRef.current ||
    initialShipmentId ||
    !initialOrderId ||
    !shipmentPayload.list.length
  ) {
    return;
  }

  const match = shipmentPayload.list.find((item) => {
    const orderId =
      item?.order_id ??
      item?.orderId ??
      item?.order?._id ??
      item?.order?.id ??
      item?.orderSnapshot?._id ??
      item?.orderSnapshot?.id ??
      item?.order_snapshot?._id ??
      item?.order_snapshot?.id;

    return (
      orderId != null &&
      String(orderId) === String(initialOrderId)
    );
  });

  // Do not select the first shipment when no matching order is found.
  if (!match) return;

  const realOrderNumber =
    match.orderNumber ??
    match.order_number ??
    match.order?.orderNumber ??
    match.order?.order_number ??
    match.orderSnapshot?.orderNumber ??
    match.orderSnapshot?.order_number ??
    match.order_snapshot?.orderNumber ??
    match.order_snapshot?.order_number;

  if (!realOrderNumber) return;

  hasResolvedInitialRef.current = true;
  setFilter("orderNumber", realOrderNumber);
}, [
  shipmentPayload.list,
  initialOrderId,
  initialShipmentId,
  setFilter,
]);
  const [organizationOptions, setOrganizationOptions] = useState([]);

  const FILTER_FIELDS = [
    { key: "orderNumber", type: "text", label: "Order #", width: "w-48" },
    { key: "returnId", type: "text", label: "Return #", width: "w-44" },
    {
      key: "shipmentType",
      type: "select",
      label: "Type",
      options: [
        { value: "forward", label: "Forward" },
        { value: "return", label: "Return" },
      ],
    },
    {
      key: "sellerId",
      type: "asyncDropdown",
      label: "Seller",
      width: "w-52",
      load: (search) =>
        dropdownApi.getSellers({
          keyWord: search,
          searchFields: "full_name,email,businessName",
        }),
    },
    {
      key: "organizationId",
      type: "select",
      label: "Organization",
      width: "w-56",
      placeholder: filters.sellerId
        ? "All Organizations"
        : "First Select The Seller",
      disabled: !filters.sellerId,
      options: filters.sellerId
        ? organizationOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : [],
    },
    {
      key: "awbNumber",
      type: "text",
      label: "AWB / Tracking",
      width: "w-44",
    },
    {
      key: "courierName",
      type: "text",
      label: "Courier",
      width: "w-40",
    },
    {
      key: "status",
      type: "select",
      label: "Status",
      options: STATUS_OPTIONS.map((value) => ({
        value,
        label: shipmentStepLabel(value),
      })),
    },
    { key: "fromDate", type: "date", label: "From" },
    { key: "toDate", type: "date", label: "To" },
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => {
    dropdownApi
      .getSellers({ limit: 100 })
      .then(setSellerOptions)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const sellerId = filters.sellerId;
    if (!sellerId) {
      setOrganizationOptions([]);
      if (filters.organizationId) setFilter("organizationId", "");
      return undefined;
    }
    let active = true;
    dropdownApi
      .getSellerOrganizations(sellerId, { limit: 100 })
      .then((options) => {
        if (active) setOrganizationOptions(options || []);
      })
      .catch(() => {
        if (active) setOrganizationOptions([]);
      });
    return () => {
      active = false;
    };
  }, [filters.sellerId, filters.organizationId, setFilter]);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingAction, setTrackingAction] = useState({
    status: "in_transit",
    note: "",
    location: "",
    courierName: "",
    awbNumber: "",
    trackingUrl: "",
    expectedDeliveryAt: "",
  });
  const [trackingSubmitAttempted, setTrackingSubmitAttempted] = useState(false);
  const selectedPaymentStatus = String(
    selectedShipment?.payment_status || selectedShipment?.paymentStatus || "",
  ).toLowerCase();
  const selectedPaymentProvider = String(
    selectedShipment?.payment_provider ||
      selectedShipment?.paymentProvider ||
      "",
  ).toLowerCase();
  const selectedShipmentPaid =
    selectedPaymentStatus === "captured" ||
    (selectedPaymentProvider === "cod" &&
      selectedPaymentStatus === "authorized");
  const trackingActionOptions = useMemo(
    () =>
      selectedShipmentPaid
        ? getTrackingActionOptions(selectedShipment?.status || "initiated")
        : [],
    [selectedShipment?.status, selectedShipmentPaid],
  );
  const trackingFormik = useFormik({
    initialValues: {
      status: "in_transit",
      note: "",
      location: "",
      courierName: "",
      awbNumber: "",
      trackingUrl: "",
      expectedDeliveryAt: "",
    },
    validationSchema: shipmentTrackingActionValidationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values) => {
      if (!selectedShipment?.id) return;
      try {
        setLoading(true);
        const eventTime = new Date().toISOString();
        await dispatch(
          addShipmentTracking({
            shipmentId: selectedShipment.id,
            status: values.status,
            note: values.note.trim(),
            location: values.location.trim(),
            source: "seller_panel",
            courierName: values.courierName.trim(),
            awbNumber: values.awbNumber.trim(),
            trackingNumber: values.awbNumber.trim(),
            trackingUrl: values.trackingUrl.trim(),
            expectedDeliveryAt: values.expectedDeliveryAt
              ? new Date(values.expectedDeliveryAt).toISOString()
              : undefined,
            eventTime,
            shippedAt: values.status === "in_transit" ? eventTime : undefined,
          }),
        ).unwrap();

        toast.success(
          `Shipment status updated to ${shipmentStepLabel(values.status)}.`,
        );
        await refreshSelectedShipment(selectedShipment.id);
        if (["in_transit", "delivered"].includes(values.status)) {
          setDetailModal(false);
        }
      } catch (requestError) {
        toast.error(
          requestError?.message ||
            requestError ||
            "Failed to update shipment status",
        );
      } finally {
        setLoading(false);
      }
    },
  });
  const trackingFormikResetRef = useRef(trackingFormik.resetForm);
  trackingFormikResetRef.current = trackingFormik.resetForm;
  const trackingFormikSetFieldValueRef = useRef(trackingFormik.setFieldValue);
  trackingFormikSetFieldValueRef.current = trackingFormik.setFieldValue;
  const updateTrackingField = (field, value) => {
    trackingFormik.setFieldValue(field, value);
    setTrackingAction((prev) => ({ ...prev, [field]: value }));
  };
  const handleTrackingSubmit = async () => {
    setTrackingSubmitAttempted(true);
    const validationErrors = await trackingFormik.validateForm();
    trackingFormik.setTouched(
      {
        status: true,
        note: true,
        location: true,
        courierName: true,
        awbNumber: true,
        trackingUrl: true,
        expectedDeliveryAt: true,
      },
      false,
    );
    if (Object.keys(validationErrors).length > 0) return;
    await trackingFormik.submitForm();
  };
  const filterFields = isSeller
    ? FILTER_FIELDS.filter((field) => field.key !== "sellerId")
    : FILTER_FIELDS;

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getShipments({
          ...params,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (error) {
      const message = error?.message || error || "Failed to load shipments";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const openDetail = useCallback(
    async (row) => {
      setSelectedShipment(row);
      setDetailModal(true);
      setTrackingSubmitAttempted(false);
      const initialAction = {
        status: getDefaultTrackingStatus(row.status || "initiated"),
        note: "",
        location: "",
        courierName: row.courier_name || "",
        awbNumber: row.awb_number || row.tracking_number || "",
        trackingUrl: row.tracking_url || "",
        expectedDeliveryAt: toDateTimeLocal(
          row.expected_delivery_at || row.expectedDeliveryAt,
        ),
      };
      setTrackingAction(initialAction);
      trackingFormikResetRef.current({ values: initialAction });
      try {
        setLoading(true);
        const response = await dispatch(
          getShipment({ shipmentId: row.id }),
        ).unwrap();
        const nextShipment = unwrapResult(response);
        setSelectedShipment(nextShipment);
        const nextAction = {
          status: getDefaultTrackingStatus(nextShipment.status || "initiated"),
          note: "",
          location: "",
          courierName: nextShipment.courier_name || "",
          awbNumber:
            nextShipment.awb_number || nextShipment.tracking_number || "",
          trackingUrl: nextShipment.tracking_url || "",
          expectedDeliveryAt: toDateTimeLocal(
            nextShipment.expected_delivery_at ||
              nextShipment.expectedDeliveryAt,
          ),
        };
        setTrackingAction(nextAction);
        trackingFormikResetRef.current({ values: nextAction });
      } catch (requestError) {
        toast.error(
          requestError?.message ||
            requestError ||
            "Failed to load shipment detail",
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (!initialShipmentId) return;
    openDetail({ id: initialShipmentId });
  }, [openDetail]);

  const refreshSelectedShipment = useCallback(
    async (shipmentId) => {
      const response = await dispatch(getShipment({ shipmentId })).unwrap();
      const nextShipment = unwrapResult(response);
      setSelectedShipment(nextShipment);
      const nextStatus = getDefaultTrackingStatus(
        nextShipment.status || "initiated",
      );
      setTrackingAction((prev) => ({
        ...prev,
        status: nextStatus,
      }));
      trackingFormikSetFieldValueRef.current("status", nextStatus, false);
      await fetchShipments();
      return nextShipment;
    },
    [dispatch, fetchShipments],
  );

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "shipment",
        label: "Shipment",
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <MdLocalShipping aria-hidden="true" size={18} />
            </span>
            <div>
              <div className="font-semibold text-gray-800">
                {row.awb_number || row.tracking_number || row.id}
              </div>
              <div className="text-xs text-gray-400">
                <OrderLink
                  orderId={row.order_id || row.orderId}
                  orderNumber={row.orderNumber || row.order_number}
                  prefix="Order #"
                />

                {row.return_id && (
                  <span className="text-gray-400">
                    {" "}
                    · Return #{String(row.return_id).slice(-8)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ),
      },

      {
        key: "seller_id",
        label: "Seller / Org",
        sortable: true,
        render: (value, row) => {
          const seller =
            row.relations?.sellers?.[0] ||
            row.relations?.seller ||
            row.seller ||
            row.vendor ||
            {};
          const sellerId =
            row.sellerId ||
            row.seller_id ||
            seller.id ||
            seller._id ||
            seller.sellerId ||
            value;
          const organization =
            row.organization ||
            row.store ||
            row.organizationSnapshot ||
            row.organization_snapshot ||
            {};
          const organizationName =
            row.organizationName ||
            row.organization_name ||
            row.storeName ||
            row.store_name ||
            row.seller?.businessName ||
            row.seller?.companyName ||
            row.organization?.legalName ||
            row.organizationSnapshot?.legalName ||
            row.organization_snapshot?.legalName ||
            row.organizationSnapshot?.storeDisplayName ||
            row.organization_snapshot?.storeDisplayName ||
            organization.organizationName ||
            organization.organization_name ||
            organization.legalBusinessName ||
            organization.legalName ||
            organization.legal_name ||
            organization.storeDisplayName ||
            organization.store_display_name ||
            organization.name;
          const order =
            row.order || row.orderSnapshot || row.order_snapshot || {};
          const sellerGroup =
            row.relations?.sellerFulfillmentGroups?.[0] ||
            order.relations?.sellerFulfillmentGroups?.[0] ||
            {};
          const itemSellerSnapshot = [
            ...(Array.isArray(row.items) ? row.items : []),
            ...(Array.isArray(order.items) ? order.items : []),
          ]
            .filter((item) => {
              const itemSellerId =
                item.sellerId ||
                item.seller_id ||
                item.sellerSnapshot?.sellerId ||
                item.seller_snapshot?.sellerId;
              return !itemSellerId || String(itemSellerId) === String(sellerId);
            })
            .map((item) => item.sellerSnapshot || item.seller_snapshot)
            .find(Boolean);
          const sellerName =
            seller.displayName ||
            seller.fullName ||
            seller.profile?.name ||
            row.sellerSnapshot?.displayName ||
            row.seller_snapshot?.displayName ||
            row.sellerName ||
            row.seller_name ||
            sellerGroup.sellerName ||
            sellerGroup.seller_name ||
            seller.sellerName ||
            seller.seller_name ||
            seller.businessName ||
            seller.name ||
            seller.sellerProfile?.displayName ||
            seller.sellerProfile?.businessName ||
            seller.sellerProfile?.legalBusinessName ||
            seller.profile?.name ||
            seller.email ||
            sellerNameFromSnapshot(row.sellerSnapshot || row.seller_snapshot) ||
            sellerNameFromSnapshot(
              sellerGroup.sellerSnapshot || sellerGroup.seller_snapshot,
            ) ||
            row.sellerSnapshot?.name ||
            row.seller_snapshot?.name ||
            sellerNameFromSnapshot(itemSellerSnapshot) ||
            sellerOptions.find(
              (option) => String(option.value) === String(sellerId),
            )?.label;

          return (
            <SellerIdentity
              row={row}
              sellerId={sellerId}
              storeName={organizationName}
              loginName={sellerName}
            />
          );
        },
      },

      {
        key: "courier_name",
        label: "Delivery Method",
        sortable: true,
        headerClassName: "text-center",
        render: (value) => (
          <span className="block w-full text-center">
            {value || "Seller delivery"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusBadge status={value} dot />,
      },
      {
        key: "cod",
        label: "Payment Type",
        sortable: true,
        headerClassName: "text-center",
        value: (row) => paymentTypeLabel(row?.cod, row),
        render: (value, row) => (
          <span className="block w-full text-center">
            {paymentTypeLabel(value, row)}
          </span>
        ),
      },
      {
        key: "expected_delivery_at",
        label: "Expected / Delivered",
        sortable: true,
        headerClassName: "text-center",
        render: (value, row) => (
          <span className="block w-full text-center">
            {formatDateTime12Hour(
              row.status === "delivered"
                ? row.delivered_at || row.deliveredAt || value
                : value,
              "N/A",
            )}
          </span>
        ),
      },
    ];
    return isSeller
      ? baseColumns.filter((column) => column.key !== "seller_id")
      : baseColumns;
  }, [isSeller, sellerOptions]);

  return (
    <div>
      <PageHeader
        title="Shipments Tracking"
        subtitle="Manage seller-packed, shipped, and manually delivered orders with courier tracking details."
        breadcrumbs={[{ label: "Shipping" }, { label: "Shipments Tracking" }]}
      />

      <DataTable
        columns={columns}
        data={shipmentPayload.list}
        loading={loading}
        totalCount={shipmentPayload.total || shipmentPayload.list.length}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search shipment, AWB, courier, or order..."
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchShipments}
        exportConfig={{
          onClick: handleExport,
          disabled: loading || !shipmentPayload.list.length,
          loading: exporting,
        }}
        error={error}
        filterBar={
          <FilterBar
            filters={filterFields}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
        selectable={false}
        selectedKeys={[]}
        rowKey="id"
        requiredModule="delivery"
        rowActions={(row) => [
          {
            label: "View Shipment Details",
            icon: (
              <MdVisibility
                aria-hidden="true"
                size={16}
                className="text-blue-600"
              />
            ),
            onClick: () => openDetail(row),
          },
        ]}
      />

      <DefaultModal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title="Shipment Detail"
        isButtonView={false}
      >
        <div className="space-y-4 text-sm">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <MdLocalShipping aria-hidden="true" size={23} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500">
                    Order Shipment
                  </div>
                  <div className="truncate text-lg font-semibold text-gray-950">
                    <OrderLink
                      orderId={
                        selectedShipment?.order_id || selectedShipment?.orderId
                      }
                      orderNumber={
                        selectedShipment?.orderNumber ||
                        selectedShipment?.order_number
                      }
                      className="block text-lg"
                    />
                  </div>
                </div>
              </div>
              <StatusBadge
                status={shipmentStepLabel(
                  selectedShipment?.status || "initiated",
                )}
                dot
              />
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              <ShipmentFact
                icon={<MdStorefront aria-hidden="true" size={17} />}
                label="Seller"
              >
                {selectedShipment?.sellerName ||
                  selectedShipment?.seller?.displayName ||
                  selectedShipment?.seller?.businessName ||
                  "Seller"}
              </ShipmentFact>
              <ShipmentFact
                icon={<MdPerson aria-hidden="true" size={17} />}
                label="Customer"
              >
                {selectedShipment?.buyerName ||
                  selectedShipment?.buyer?.displayName ||
                  selectedShipment?.buyer?.email ||
                  "Customer"}
              </ShipmentFact>
              <ShipmentFact
                icon={<MdLocalShipping aria-hidden="true" size={17} />}
                label="Delivery"
              >
                <div className="capitalize">
                  {selectedShipment?.courier_name || "Seller delivery"}
                </div>
                <div className="mt-0.5 text-xs font-normal text-gray-500">
                  {selectedShipment?.tracking_number ||
                    selectedShipment?.awb_number ||
                    "Tracking number not added"}
                </div>
              </ShipmentFact>
              <ShipmentFact
                icon={<MdPayments aria-hidden="true" size={17} />}
                label="Shipment"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {paymentTypeLabel(
                      selectedShipment?.cod,
                      selectedShipment,
                    ) === "COD"
                      ? "Cash on delivery (COD)"
                      : "Prepaid"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span>
                    {displayStatus(
                      selectedShipment?.shipment_type ||
                        selectedShipment?.direction ||
                        "forward",
                    )}
                  </span>
                </div>
              </ShipmentFact>
            </div>
            {!isCancelledBeforeShipment(selectedShipment) && (
              <div className="grid grid-cols-1 gap-2 border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 sm:grid-cols-2">
                <div>
                  Shipment date:{" "}
                  <strong className="font-medium text-gray-700">
                    {formatDateTime12Hour(
                      selectedShipment?.shipped_at ||
                        selectedShipment?.shippedAt,
                      "Not shipped",
                    )}
                  </strong>
                </div>
                <div className="sm:text-right">
                  {selectedShipment?.status === "delivered"
                    ? "Delivered at"
                    : "Expected delivery"}
                  :{" "}
                  <strong className="font-medium text-gray-700">
                    {formatDateTime12Hour(
                      selectedShipment?.status === "delivered"
                        ? selectedShipment?.delivered_at ||
                            selectedShipment?.deliveredAt
                        : selectedShipment?.expected_delivery_at ||
                            selectedShipment?.expectedDeliveryAt,
                      "Not added",
                    )}
                  </strong>
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  Tracking URL:{" "}
                  {selectedShipment?.tracking_url ? (
                    <a
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                      href={selectedShipment.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Live Tracking{" "}
                      <MdOpenInNew aria-hidden="true" size={14} />
                    </a>
                  ) : (
                    <strong className="font-medium text-gray-700">
                      Not added
                    </strong>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {/* Section Header */}
            <div className="flex items-start gap-3 border-b border-gray-200 bg-gray-50/70 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <MdLocalShipping aria-hidden="true" size={19} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    Seller delivery action
                  </h3>

                  {/* <StatusBadge
        status={selectedShipment?.status || "initiated"}
        dot
      /> */}
                </div>

                <p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">
                  Select the next valid shipment stage and provide the relevant
                  details. Update time is recorded automatically.
                </p>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {trackingActionOptions.length > 0 ? (
                <div className="space-y-4">
                  {/* Next Shipment Status */}
                  <div>
                    <FilterSelect
                      label="Next Status"
                      name="trackingStatus"
                      options={trackingActionOptions.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      value={
                        trackingActionOptions
                          .map((option) => ({
                            label: option.label,
                            value: option.value,
                          }))
                          .find(
                            (option) => option.value === trackingAction.status,
                          ) || null
                      }
                      onChange={(option) => {
                        updateTrackingField("status", option?.value || "");
                      }}
                      placeholder="Select next status"
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>

                  {/* Checkpoint Details */}
                  {["in_transit", "delivered", "failed", "rto"].includes(
                    trackingAction.status,
                  ) && (
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      {trackingAction.status !== "delivered" && (
                        <div className="sm:col-span-2">
                          <FormInput
                            label="Checkpoint Location (optional)"
                            name="location"
                            type="textarea"
                            limitMessage="Checkpoint Location is limited to 200 characters"
                            minLength={3}
                            maxLength={200}
                            rows={3}
                            className="!mb-0"
                            placeholder="Hub, city, or delivery area"
                            value={trackingAction.location}
                            error={
                              trackingSubmitAttempted &&
                              trackingFormik.errors.location
                            }
                            onChange={(event) =>
                              updateTrackingField(
                                "location",
                                event.target.value,
                              )
                            }
                            onBlur={trackingFormik.handleBlur}
                          />
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <FormInput
                          label={
                            ["failed", "rto"].includes(trackingAction.status)
                              ? "Note"
                              : "Note (optional)"
                          }
                          name="note"
                          limitMessage="Note is limited to 500 characters"
                          type="textarea"
                          minLength={3}
                          maxLength={500}
                          rows={3}
                          className="!mb-0"
                          required={["failed", "rto"].includes(
                            trackingAction.status,
                          )}
                          placeholder={
                            ["failed", "rto"].includes(trackingAction.status)
                              ? "Explain the reason"
                              : trackingAction.status === "delivered"
                                ? "Add delivery details, recipient name, or proof reference"
                                : "Add an update for this checkpoint"
                          }
                          value={trackingAction.note}
                          error={
                            trackingSubmitAttempted &&
                            trackingFormik.errors.note
                          }
                          onChange={(event) =>
                            updateTrackingField("note", event.target.value)
                          }
                          onBlur={trackingFormik.handleBlur}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dispatch Details */}
                  {trackingAction.status === "in_transit" && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-gray-200">
                          <MdLocalShipping aria-hidden="true" size={17} />
                        </span>

                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Dispatch Details
                          </h4>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Enter courier and tracking information.
                          </p>
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                        <FilterSelect
                          label="Courier / Delivery Method"
                          name="courierName"
                          options={[
                            ...(trackingAction.courierName &&
                            !DELIVERY_METHOD_OPTIONS.some(
                              (option) =>
                                option.value === trackingAction.courierName,
                            )
                              ? [
                                  {
                                    value: trackingAction.courierName,
                                    label: trackingAction.courierName,
                                  },
                                ]
                              : []),
                            ...DELIVERY_METHOD_OPTIONS,
                          ]}
                          value={
                            [
                              ...(trackingAction.courierName &&
                              !DELIVERY_METHOD_OPTIONS.some(
                                (option) =>
                                  option.value === trackingAction.courierName,
                              )
                                ? [
                                    {
                                      value: trackingAction.courierName,
                                      label: trackingAction.courierName,
                                    },
                                  ]
                                : []),
                              ...DELIVERY_METHOD_OPTIONS,
                            ].find(
                              (option) =>
                                option.value === trackingAction.courierName,
                            ) || null
                          }
                          onChange={(option) => {
                            updateTrackingField(
                              "courierName",
                              option?.value || "",
                            );
                          }}
                          placeholder="Select delivery method"
                          required
                          isClearable={false}
                          isSearchable={false}
                          error={
                            trackingSubmitAttempted &&
                            trackingFormik.errors.courierName
                          }
                        />

                        <FormInput
                          label="AWB / Tracking Reference"
                          name="awbNumber"
                          required
                          className="!mb-0"
                          value={trackingAction.awbNumber}
                          showLengthCount={false}
                          maxLength={100}
                          limitMessage="Tracking reference must be 5–100 characters."
                          pattern="[A-Za-z0-9/-]{5,100}"
                          title="Use 5–100 letters, numbers, hyphens, or forward slashes. Spaces are not allowed."
                          autoCapitalize="characters"
                          spellCheck={false}
                          error={
                            trackingSubmitAttempted &&
                            trackingFormik.errors.awbNumber
                          }
                          onChange={(event) =>
                            updateTrackingField("awbNumber", event.target.value)
                          }
                          onBlur={(event) => {
                            const trimmedValue = event.target.value.trim();
                            if (trimmedValue !== event.target.value) {
                              updateTrackingField("awbNumber", trimmedValue);
                            }
                            trackingFormik.handleBlur(event);
                          }}
                        />

                        <FormInput
                          label="Expected Delivery Date"
                          name="expectedDeliveryAt"
                          type="datetime-local"
                          required
                          className="!mb-0"
                          min={toDateTimeLocal(new Date())}
                          value={trackingAction.expectedDeliveryAt}
                          error={
                            trackingSubmitAttempted &&
                            trackingFormik.errors.expectedDeliveryAt
                          }
                          onChange={(event) =>
                            updateTrackingField(
                              "expectedDeliveryAt",
                              event.target.value,
                            )
                          }
                          onBlur={trackingFormik.handleBlur}
                        />

                        <FormInput
                          label="Tracking URL (optional)"
                          name="trackingUrl"
                          type="url"
                          showLengthCount={false}
                          maxLength={2048}
                          limitMessage="Tracking URL cannot exceed 2048 characters."
                          className="!mb-0"
                          placeholder="https://..."
                          value={trackingAction.trackingUrl}
                          error={
                            trackingSubmitAttempted &&
                            trackingFormik.errors.trackingUrl
                          }
                          onChange={(event) =>
                            updateTrackingField(
                              "trackingUrl",
                              event.target.value,
                            )
                          }
                          onBlur={trackingFormik.handleBlur}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="admin-btn-primary inline-flex min-h-10 items-center justify-center gap-2 !px-4 !py-2"
                      onClick={handleTrackingSubmit}
                      disabled={trackingFormik.isSubmitting || loading}
                    >
                      {trackingFormik.isSubmitting ? (
                        <>
                          <ButtonLoader />
                          Updating shipment...
                        </>
                      ) : (
                        "Update Shipment Status"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  {!selectedShipmentPaid ? (
                    <div>
                      <p className="font-semibold text-amber-800">
                        Awaiting Payment
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Shipment processing is locked until online payment is
                        captured or COD is authorized.
                      </p>
                    </div>
                  ) : (
                    <p className="leading-5 text-gray-600">
                      This shipment is{" "}
                      <strong className="font-semibold text-gray-900">
                        {shipmentStepLabel(selectedShipment?.status)}
                      </strong>
                      . No further seller action is currently required.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-1">
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <MdLocationOn aria-hidden="true" size={18} />
                </span>
                <div className="font-semibold text-gray-900">
                  Delivery address
                </div>
              </div>
              {selectedShipment?.ship_to_snapshot ? (
                <div className="mt-3 space-y-1 text-sm leading-5 text-gray-600">
                  <div className="font-semibold text-gray-800">
                    {selectedShipment.ship_to_snapshot.fullName || "Customer"}
                  </div>
                  {selectedShipment.ship_to_snapshot.phone && (
                    <div>{selectedShipment.ship_to_snapshot.phone}</div>
                  )}
                  <div>
                    {[
                      selectedShipment.ship_to_snapshot.line1,
                      selectedShipment.ship_to_snapshot.line2,
                      selectedShipment.ship_to_snapshot.city,
                      selectedShipment.ship_to_snapshot.state,
                      selectedShipment.ship_to_snapshot.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Address not available"}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-500">
                  Address not available
                </div>
              )}
            </section>

            {/* <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <MdInventory2 size={18} />
                </span>
                <div className="font-semibold text-gray-900">Package</div>
              </div>
              <div className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Weight
                </div>
                <div className="mt-0.5 font-semibold text-gray-800">
                  {selectedShipment?.package_snapshot?.weightGrams
                    ? `${selectedShipment.package_snapshot.weightGrams} g`
                    : "Not entered"}
                </div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Dimensions
                </div>
                <div className="mt-0.5 font-semibold text-gray-800">
                  {selectedShipment?.package_snapshot?.length
                    ? `${selectedShipment.package_snapshot.length} × ${selectedShipment.package_snapshot.width || "—"} × ${selectedShipment.package_snapshot.height || "—"} ${selectedShipment.package_snapshot.unit || "cm"}`
                    : "Not entered"}
                </div>
              </div>
            </section> */}
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <MdTimeline aria-hidden="true" size={18} />
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  Tracking Timeline
                </div>
                <div className="text-xs text-gray-500">
                  Shipment updates in chronological order
                </div>
              </div>
            </div>
            <div className="mt-4">
              {(selectedShipment?.trackingEvents || []).map((event) => (
                <div
                  key={event.id}
                  className="relative ml-2 border-l-2 border-blue-100 pb-5 pl-6 last:border-transparent last:pb-0"
                >
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-100" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">
                      {shipmentStepLabel(event.status)}
                    </div>
                    <time className="text-xs text-gray-500">
                      {formatDateTime12Hour(
                        event.event_time,
                        "Time not available",
                      )}
                    </time>
                  </div>
                  {event.location && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-semibold">Location:</span>{" "}
                      {event.location}
                    </div>
                  )}
                  {event.note && (
                    <div className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                      <span className="font-semibold">Note:</span>{" "}
                      {formatLabel(event.note)}
                    </div>
                  )}
                </div>
              ))}
              {!selectedShipment?.trackingEvents?.length && (
                <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  No tracking events found.
                </div>
              )}
            </div>
          </section>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ShipmentTracking;
