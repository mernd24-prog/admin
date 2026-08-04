import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdInventory2,
  MdLocalShipping,
  MdLocationOn,
  MdOpenInNew,
  MdPayments,
  MdPerson,
  MdStorefront,
  MdTimeline,
  MdVisibility,
} from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  addShipmentTracking,
  getShipment,
  getShipments,
} from "../../../Redux/deliverySlice";
import { cancelSellerOrder } from "../../../Redux/sellerOrdersSlice";
import { usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";

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
  { value: "initiated", label: "Ready to Ship" },
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
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
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
const shipmentStepLabel = (value = "") =>
  FULFILLMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label ||
  displayStatus(value);
const getTrackingActionOptions = (currentStatus = "initiated") => {
  const nextStatuses = FULFILLMENT_TRANSITIONS[currentStatus] || [];
  return FULFILLMENT_STATUS_OPTIONS.filter(
    (option) =>
      nextStatuses.includes(option.value) && option.value !== "cancelled",
  );
};
const getDefaultTrackingStatus = (currentStatus = "initiated") =>
  getTrackingActionOptions(currentStatus)[0]?.value || currentStatus;
const getInitialQuery = (key) =>
  new URLSearchParams(window.location.search).get(key) || "";
const initialShipmentId = getInitialQuery("shipmentId");

const ActionButton = ({
  children,
  onClick,
  disabledReason = "",
  disabled = false,
  title = "",
}) => {
  const isDisabled = disabled || Boolean(disabledReason);
  return (
    <button
      type="button"
      className="admin-btn-secondary !px-2 !py-1"
      onClick={onClick}
      disabled={isDisabled}
      title={disabledReason || title}
      aria-disabled={isDisabled}
    >
      {children}
    </button>
  );
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
      <div className="mt-0.5 break-words text-sm font-medium text-gray-800">
        {children || "—"}
      </div>
    </div>
  </div>
);

const FieldError = ({ message }) => (
  <span
    className={`h-4 truncate text-[11px] font-normal leading-4 text-red-600 ${
      message ? "visible" : "invisible"
    }`}
    role={message ? "alert" : undefined}
    title={message || undefined}
  >
    {message || "Validation message"}
  </span>
);

const ShipmentTracking = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((state) => state.delivery);
  const shipmentPayload = unwrapList(selector.shipmentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: {
      orderId: getInitialQuery("orderId"),
      sellerId: getInitialQuery("sellerId"),
      search: initialShipmentId,
    },
  });
  const { toQueryParams } = list;

  const FILTER_FIELDS = isSeller
    ? [
        { key: "orderNumber", type: "text", label: "Order #", width: "w-48" },

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
          key: "status",
          type: "select",
          label: "Status",
          options: STATUS_OPTIONS.map((value) => ({
            value,
            label: shipmentStepLabel(value),
          })),
        },
        // { key: "fromDate", type: "date", label: "From" },
        // { key: "toDate", type: "date", label: "To" },
      ]
    : [
        { key: "orderId", type: "text", label: "Order #", width: "w-48" },
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
          key: "direction",
          type: "select",
          label: "Direction",
          options: [
            { value: "forward", label: "Forward" },
            { value: "reverse", label: "Reverse" },
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
          key: "awbNumber",
          type: "text",
          label: "AWB / Tracking",
          width: "w-44",
        },
        { key: "courierName", type: "text", label: "Courier", width: "w-40" },
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
      .getSellers({ limit: 200 })
      .then(setSellerOptions)
      .catch(() => {});
  }, []);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingAction, setTrackingAction] = useState({
    status: "in_transit",
    note: "",
    location: "",
    courierName: "",
    awbNumber: "",
    trackingUrl: "",
    shippedAt: "",
  });
  const [trackingErrors, setTrackingErrors] = useState({});
  const [cancellationAction, setCancellationAction] = useState({
    open: false,
    reasonCode: "seller_unavailable",
    reason: "",
  });
  const [lastCancellation, setLastCancellation] = useState(null);
  const trackingActionOptions = useMemo(
    () => getTrackingActionOptions(selectedShipment?.status || "initiated"),
    [selectedShipment?.status],
  );
  const filterFields = useMemo(
    () =>
      isSeller
        ? FILTER_FIELDS.filter((field) => field.key !== "sellerId")
        : FILTER_FIELDS,
    [isSeller],
  );

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
      setTrackingAction({
        status: getDefaultTrackingStatus(row.status || "initiated"),
        note: "",
        location: "",
        courierName: row.courier_name || "",
        awbNumber: row.awb_number || row.tracking_number || "",
        trackingUrl: row.tracking_url || "",
        shippedAt: row.shipped_at
          ? moment(row.shipped_at).format("YYYY-MM-DDTHH:mm")
          : "",
      });
      try {
        setLoading(true);
        const response = await dispatch(
          getShipment({ shipmentId: row.id }),
        ).unwrap();
        const nextShipment = unwrapResult(response);
        setSelectedShipment(nextShipment);
        setTrackingAction({
          status: getDefaultTrackingStatus(nextShipment.status || "initiated"),
          note: "",
          location: "",
          courierName: nextShipment.courier_name || "",
          awbNumber:
            nextShipment.awb_number || nextShipment.tracking_number || "",
          trackingUrl: nextShipment.tracking_url || "",
          shippedAt: nextShipment.shipped_at
            ? moment(nextShipment.shipped_at).format("YYYY-MM-DDTHH:mm")
            : "",
        });
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
      setTrackingAction((prev) => ({
        ...prev,
        status: getDefaultTrackingStatus(nextShipment.status || "initiated"),
      }));
      await fetchShipments();
      return nextShipment;
    },
    [dispatch, fetchShipments],
  );

  const handleTrackingStatus = useCallback(async () => {
    if (!selectedShipment?.id) return;
    const nextErrors = {};
    const location = trackingAction.location.trim();
    const note = trackingAction.note.trim();
    const trackingUrl = trackingAction.trackingUrl.trim();
    if (location && (/^\d+$/.test(location) || location.length < 3))
      nextErrors.location = "Enter a readable location, not only numbers.";
    if (
      ["failed", "rto", "cancelled"].includes(trackingAction.status) &&
      note.length < 3
    )
      nextErrors.note = "Add a reason of at least 3 characters.";
    if (trackingAction.status === "in_transit") {
      if (!trackingAction.courierName.trim())
        nextErrors.courierName = "Courier or delivery method is required.";
      if (!trackingAction.awbNumber.trim()) {
        nextErrors.awbNumber = "Tracking reference is required.";
      } else if (
        trackingAction.awbNumber.length < 5 ||
        trackingAction.awbNumber.length > 50
      ) {
        nextErrors.awbNumber = "Tracking reference must be 5–50 characters.";
      } else if (!/^[A-Za-z0-9_/-]+$/.test(trackingAction.awbNumber)) {
        nextErrors.awbNumber = "Allowed: letters, numbers, -, _, and / only.";
      }
      if (!trackingAction.shippedAt)
        nextErrors.shippedAt = "Shipment time is required.";
    }
    if (trackingUrl) {
      try {
        const parsedUrl = new URL(trackingUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol))
          throw new Error("Invalid protocol");
      } catch {
        nextErrors.trackingUrl =
          "Enter a valid http:// or https:// tracking URL.";
      }
    }
    if (
      trackingAction.shippedAt &&
      new Date(trackingAction.shippedAt).getTime() > Date.now()
    )
      nextErrors.shippedAt = "Shipment time cannot be in the future.";
    if (Object.keys(nextErrors).length) {
      setTrackingErrors(nextErrors);
      toast.error(
        "Please correct the highlighted shipment fields before updating.",
        { id: "shipment-tracking-validation-error" },
      );
      return;
    }
    try {
      setTrackingErrors({});
      setLoading(true);
      await dispatch(
        addShipmentTracking({
          shipmentId: selectedShipment.id,
          status: trackingAction.status,
          note: trackingAction.note,
          location: trackingAction.location,
          source: "seller_panel",
          courierName: trackingAction.courierName,
          awbNumber: trackingAction.awbNumber,
          trackingNumber: trackingAction.awbNumber,
          trackingUrl: trackingAction.trackingUrl,
          shippedAt: trackingAction.shippedAt || undefined,
        }),
      ).unwrap();
      toast.success(
        `Shipment status updated to ${shipmentStepLabel(trackingAction.status)}.`,
      );
      await refreshSelectedShipment(selectedShipment.id);
      if (["in_transit", "delivered"].includes(trackingAction.status)) {
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
  }, [dispatch, refreshSelectedShipment, selectedShipment?.id, trackingAction]);

  const handleSellerCancellation = useCallback(async () => {
    if (!selectedShipment?.order_id) return;
    const reason = cancellationAction.reason.trim();
    if (reason.length < 3) {
      toast.error("Enter a cancellation reason of at least 3 characters.");
      return;
    }
    try {
      setLoading(true);
      const response = await dispatch(
        cancelSellerOrder({
          orderId: selectedShipment.order_id,
          reasonCode: cancellationAction.reasonCode,
          reason,
          refundMethod: "auto",
        }),
      ).unwrap();
      const cancellation = unwrapResult(response);
      setLastCancellation(cancellation);
      setCancellationAction({
        open: false,
        reasonCode: "seller_unavailable",
        reason: "",
      });
      toast.success(
        cancellation?.refund_status === "manual_review"
          ? "Items cancelled. Customer refund is awaiting admin review."
          : "Seller items cancelled successfully.",
      );
      await refreshSelectedShipment(selectedShipment.id);
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          requestError ||
          "Failed to cancel seller items",
      );
    } finally {
      setLoading(false);
    }
  }, [
    cancellationAction,
    dispatch,
    refreshSelectedShipment,
    selectedShipment?.id,
    selectedShipment?.order_id,
  ]);
  const navigate = useNavigate();
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "shipment",
        label: "Shipment",
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <MdLocalShipping size={18} />
            </span>
            <div>
              <div className="font-semibold text-gray-800">
                {row.awb_number || row.tracking_number || row.id}
              </div>
              <div className="text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => navigate(`/app/orders/view/${row.order_id}`)}
                  className="font-medium text-[var(--admin-navy)] hover:underline"
                >
                  Order #
                  {row.orderNumber ||
                    row.order_number ||
                    String(row.order_id || "").slice(-8)}
                </button>

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
        label: "Seller",
        sortable: true,
        render: (value, row) => {
          const name =
            row.sellerName ||
            row.seller?.name ||
            row.seller?.companyName ||
            sellerOptions.find((o) => o.value === value)?.label;
          return name ? (
            <span className="text-sm font-medium text-gray-700">{name}</span>
          ) : (
            <span className="font-mono text-xs text-gray-400">
              {value ? String(value).slice(0, 10) + "…" : "—"}
            </span>
          );
        },
      },
      {
        key: "shipment_type",
        label: "Type",
        render: (value, row) => (
          <StatusBadge
            status={displayStatus(value || row.direction || "forward")}
            dot
          />
        ),
      },
      {
        key: "courier_name",
        label: "Delivery Method",
        sortable: true,
        render: (value) => value || "Seller delivery",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusBadge status={value} dot />,
      },
      {
        key: "cod",
        label: "COD",
        sortable: true,
        render: (value) => (value ? "Yes" : "No"),
      },
      {
        key: "expected_delivery_at",
        label: "Expected",
        sortable: true,
        render: (value) => formatDateTime12Hour(value, "N/A"),
      },
    ];
    return isSeller
      ? baseColumns.filter((column) => column.key !== "seller_id")
      : baseColumns;
  }, [isSeller, openDetail, sellerOptions, navigate]);

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Shipments"
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
        searchPlaceholder="Search shipment, AWB, courier, or order"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchShipments}
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
        exportConfig={{
          filename: "shipments",
          columns,
          data: shipmentPayload.list,
        }}
        rowActions={(row) => [
          {
            label: "View Shipment Details",
            icon: <MdVisibility size={16} className="text-blue-600" />,
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
                  <MdLocalShipping size={23} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500">
                    Order Shipment
                  </div>
                  <div className="truncate text-lg font-semibold text-gray-950">
                    <button 
                      type="button"
                      onClick={() => navigate(`/app/orders/view/${selectedShipment?.order_id}`, "_blank")}
                      className="font-medium hover:underline text-left block"
                    >
                      {selectedShipment?.orderNumber ||
                        selectedShipment?.order_number ||
                        String(selectedShipment?.order_id || "Order").slice(-8)}
                    </button>
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
              <ShipmentFact icon={<MdStorefront size={17} />} label="Seller">
                {selectedShipment?.sellerName ||
                  selectedShipment?.seller?.displayName ||
                  selectedShipment?.seller?.businessName ||
                  "Seller"}
              </ShipmentFact>
              <ShipmentFact icon={<MdPerson size={17} />} label="Customer">
                {selectedShipment?.buyerName ||
                  selectedShipment?.buyer?.displayName ||
                  selectedShipment?.buyer?.email ||
                  "Customer"}
              </ShipmentFact>
              <ShipmentFact
                icon={<MdLocalShipping size={17} />}
                label="Delivery"
              >
                <div>{selectedShipment?.courier_name || "Seller delivery"}</div>
                <div className="mt-0.5 text-xs font-normal text-gray-500">
                  {selectedShipment?.tracking_number ||
                    selectedShipment?.awb_number ||
                    "Tracking number not added"}
                </div>
              </ShipmentFact>
              <ShipmentFact icon={<MdPayments size={17} />} label="Shipment">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {selectedShipment?.cod ? "Cash on delivery" : "Prepaid"}
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
            <div className="grid grid-cols-1 gap-2 border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 sm:grid-cols-2">
              <div>
                Shipment date:{" "}
                <strong className="font-medium text-gray-700">
                  {formatDateTime12Hour(
                    selectedShipment?.shipped_at,
                    "Not shipped",
                  )}
                </strong>
              </div>
              <div className="sm:text-right">
                Tracking URL:{" "}
                {selectedShipment?.tracking_url ? (
                  <a
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                    href={selectedShipment.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Live Tracking <MdOpenInNew size={14} />
                  </a>
                ) : (
                  <strong className="font-medium text-gray-700">
                    Not added
                  </strong>
                )}
              </div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-800">
                  Seller delivery action
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Select the next valid shipment stage. Only relevant details
                  are requested.
                </p>
              </div>
              <StatusBadge
                status={selectedShipment?.status || "initiated"}
                dot
              />
            </div>
            {lastCancellation &&
              String(lastCancellation.order_id || lastCancellation.orderId) ===
                String(selectedShipment?.order_id) && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <div className="font-semibold">Seller items cancelled</div>
                  <div className="mt-1 text-xs">
                    Inventory processing:{" "}
                    {displayStatus(lastCancellation.inventory_status)}
                    {" · "}Customer refund:{" "}
                    {displayStatus(lastCancellation.refund_status)}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-green-800 underline"
                    onClick={() =>
                      navigate(
                        `/app/cancellations?orderId=${encodeURIComponent(selectedShipment.order_id)}`,
                      )
                    }
                  >
                    View cancellation
                  </button>
                </div>
              )}
            {trackingActionOptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                <div className="grid min-w-0 gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Next status
                  </label>
                  <select
                    className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={trackingAction.status}
                    onChange={(event) => {
                      setTrackingErrors({});
                      setTrackingAction((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }));
                    }}
                  >
                    {trackingActionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {["in_transit", "delivered", "failed", "rto"].includes(
                  trackingAction.status,
                ) && (
                  <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] items-start gap-4">
                    {trackingAction.status !== "delivered" && (
                      <label className="grid min-w-0 content-start gap-1.5 text-xs font-semibold text-gray-600">
                        <span>
                          Checkpoint Location{" "}
                          <span className="font-normal text-gray-400">
                            (optional)
                          </span>
                        </span>
                        <input
                          className={`h-20 min-w-0 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${trackingErrors.location ? "border-red-400" : "border-gray-200"}`}
                          placeholder="Hub, city, or delivery area"
                          value={trackingAction.location}
                          onChange={(event) =>
                            setTrackingAction((prev) => ({
                              ...prev,
                              location: event.target.value,
                            }))
                          }
                        />
                        <FieldError message={trackingErrors.location} />
                      </label>
                    )}
                    <label
                      className={`grid min-w-0 content-start gap-1.5 text-xs font-semibold text-gray-600 ${trackingAction.status === "delivered" ? "col-span-full" : ""}`}
                    >
                      <span>
                        Note{" "}
                        {["failed", "rto"].includes(trackingAction.status) ? (
                          <span className="text-red-500">Required</span>
                        ) : (
                          <span className="font-normal text-gray-400">
                            (optional)
                          </span>
                        )}
                      </span>
                      <textarea
                        className={`min-h-20 min-w-0 w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm font-normal shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${trackingErrors.note ? "border-red-400" : "border-gray-200"}`}
                        placeholder={
                          ["failed", "rto"].includes(trackingAction.status)
                            ? "Explain the reason"
                            : trackingAction.status === "delivered"
                              ? "Add delivery details, recipient name, or proof reference"
                              : "Add an update for this checkpoint"
                        }
                        value={trackingAction.note}
                        onChange={(event) =>
                          setTrackingAction((prev) => ({
                            ...prev,
                            note: event.target.value,
                          }))
                        }
                      />
                      <FieldError message={trackingErrors.note} />
                    </label>
                  </div>
                )}

                {trackingAction.status === "in_transit" && (
                  <div className="!mt-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dispatch details
                    </div>
                    <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-x-3 gap-y-1">
                      <label className="grid min-w-0 gap-1 text-xs text-gray-500">
                        <span>
                          Courier / Delivery Method{" "}
                          <span className="text-red-500" aria-hidden="true">
                            *
                          </span>
                        </span>
                        <select
                          className={`min-w-0 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${trackingErrors.courierName ? "border-red-400" : "border-gray-200"}`}
                          value={trackingAction.courierName}
                          required
                          aria-required="true"
                          aria-invalid={Boolean(trackingErrors.courierName)}
                          onChange={(event) => {
                            setTrackingAction((prev) => ({
                              ...prev,
                              courierName: event.target.value,
                            }));
                            setTrackingErrors((prev) => ({
                              ...prev,
                              courierName: "",
                            }));
                          }}
                        >
                          <option value="">Select delivery method</option>
                          {trackingAction.courierName &&
                            !DELIVERY_METHOD_OPTIONS.some(
                              (option) =>
                                option.value === trackingAction.courierName,
                            ) && (
                              <option value={trackingAction.courierName}>
                                {trackingAction.courierName}
                              </option>
                            )}
                          {DELIVERY_METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <FieldError message={trackingErrors.courierName} />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs text-gray-500">
                        <span>
                          AWB / Tracking Reference{" "}
                          <span className="text-red-500" aria-hidden="true">
                            *
                          </span>
                        </span>
                        <input
                          className={`min-w-0 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${trackingErrors.awbNumber ? "border-red-400" : "border-gray-200"}`}
                          value={trackingAction.awbNumber}
                          required
                          minLength={5}
                          maxLength={50}
                          pattern="[A-Za-z0-9_/-]{5,50}"
                          title="Use 5–50 letters, numbers, hyphens, underscores, or slashes. Spaces are not allowed."
                          autoCapitalize="characters"
                          spellCheck={false}
                          aria-required="true"
                          aria-invalid={Boolean(trackingErrors.awbNumber)}
                          onChange={(event) => {
                            setTrackingAction((prev) => ({
                              ...prev,
                              awbNumber: event.target.value,
                            }));
                            setTrackingErrors((prev) => ({
                              ...prev,
                              awbNumber: "",
                            }));
                          }}
                        />
                        <FieldError message={trackingErrors.awbNumber} />
                      </label>
                      <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-gray-600">
                        Tracking URL
                        <input
                          className={`min-w-0 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${trackingErrors.trackingUrl ? "border-red-400" : "border-gray-200"}`}
                          type="url"
                          placeholder="https://..."
                          value={trackingAction.trackingUrl}
                          onChange={(event) =>
                            setTrackingAction((prev) => ({
                              ...prev,
                              trackingUrl: event.target.value,
                            }))
                          }
                        />
                        <FieldError message={trackingErrors.trackingUrl} />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs text-gray-500">
                        <span>
                          Shipped At{" "}
                          <span className="text-red-500" aria-hidden="true">
                            *
                          </span>
                        </span>
                        <input
                          className={`min-w-0 w-full max-w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${trackingErrors.shippedAt ? "border-red-400" : "border-gray-200"}`}
                          type="datetime-local"
                          max={moment().format("YYYY-MM-DDTHH:mm")}
                          value={trackingAction.shippedAt}
                          required
                          aria-required="true"
                          aria-invalid={Boolean(trackingErrors.shippedAt)}
                          onChange={(event) => {
                            setTrackingAction((prev) => ({
                              ...prev,
                              shippedAt: event.target.value,
                            }));
                            setTrackingErrors((prev) => ({
                              ...prev,
                              shippedAt: "",
                            }));
                          }}
                        />
                        <FieldError message={trackingErrors.shippedAt} />
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
                    {isSeller &&
                      ["initiated", "manifested", "failed"].includes(
                        selectedShipment?.status,
                      ) && (
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          onClick={() =>
                            setCancellationAction((prev) => ({
                              ...prev,
                              open: true,
                            }))
                          }
                        >
                          Cancel seller items
                        </button>
                      )}
                    <button
                      type="button"
                      className="admin-btn-primary justify-center !px-4 !py-2.5"
                      onClick={handleTrackingStatus}
                    >
                      Update shipment status
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
                {isSeller &&
                selectedShipment?.status === "cancelled" &&
                String(
                  lastCancellation?.order_id || lastCancellation?.orderId || "",
                ) !== String(selectedShipment?.order_id || "") ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-amber-800">
                        Cancellation processing is not confirmed
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Complete the cancellation workflow to release inventory
                        and create the customer refund review.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      onClick={() =>
                        setCancellationAction((prev) => ({
                          ...prev,
                          open: true,
                        }))
                      }
                    >
                      Complete cancellation
                    </button>
                  </div>
                ) : (
                  <>
                    This shipment is{" "}
                    <strong>
                      {shipmentStepLabel(selectedShipment?.status)}
                    </strong>
                    . No further seller action is currently required.
                  </>
                )}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <MdLocationOn size={18} />
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

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
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
            </section>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <MdTimeline size={18} />
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  Tracking imeline
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

      <DefaultModal
        isOpen={cancellationAction.open}
        onClose={() =>
          setCancellationAction({
            open: false,
            reasonCode: "seller_unavailable",
            reason: "",
          })
        }
        title="Cancel seller items"
        isButtonView={false}
      >
        <div className="space-y-4 p-1 text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
            This cancels only your active items in this order. Inventory will be
            released and any customer refund will be sent to admin review.
          </div>
          <label className="grid gap-1.5 text-xs font-semibold text-gray-600">
            Reason category
            <select
              className="rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-800"
              value={cancellationAction.reasonCode}
              onChange={(event) =>
                setCancellationAction((prev) => ({
                  ...prev,
                  reasonCode: event.target.value,
                }))
              }
            >
              <option value="seller_unavailable">Item unavailable</option>
              <option value="inventory_unavailable">
                Inventory unavailable
              </option>
              <option value="pricing_issue">Pricing issue</option>
              <option value="delivery_delay">Unable to deliver on time</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-gray-600">
            Cancellation reason <span className="text-red-500">Required</span>
            <textarea
              className="min-h-24 resize-y rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
              placeholder="Explain why these items cannot be fulfilled"
              value={cancellationAction.reason}
              onChange={(event) =>
                setCancellationAction((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              onClick={() =>
                setCancellationAction({
                  open: false,
                  reasonCode: "seller_unavailable",
                  reason: "",
                })
              }
            >
              Keep shipment
            </button>
            <button
              type="button"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={loading || cancellationAction.reason.trim().length < 3}
              onClick={handleSellerCancellation}
            >
              {loading ? "Cancelling..." : "Confirm cancellation"}
            </button>
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ShipmentTracking;
