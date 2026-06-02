import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdFileDownload, MdLocalShipping, MdRefresh, MdTimeline } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  addShipmentTracking,
  createShipment,
  createShipmentManifest,
  getShipments,
} from "../../../Redux/deliverySlice";
import { ACTIONS } from "../../../_helpers/usePermission";

const STATUS_OPTIONS = [
  "initiated",
  "manifested",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
  "rto",
  "lost",
  "damaged",
];

const EMPTY_SHIPMENT = {
  orderId: "",
  sellerId: "",
  courierName: "",
  awbNumber: "",
  trackingNumber: "",
  shippingMode: "standard",
  cod: false,
  idempotencyKey: "",
  packageSnapshot: {
    weightGrams: "",
    length: "",
    width: "",
    height: "",
    unit: "cm",
  },
};

const EMPTY_TRACKING = {
  shipmentId: "",
  status: "in_transit",
  location: "",
  note: "",
  deliveryException: "",
};

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const displayStatus = (value = "") => String(value || "N/A").replace(/_/g, " ");
const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const getInitialQuery = (key) => new URLSearchParams(window.location.search).get(key) || "";

const ShipmentTracking = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.delivery);
  const shipmentPayload = unwrapList(selector.shipmentsData);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    orderId: getInitialQuery("orderId"),
    sellerId: "",
    status: "",
    courierName: "",
    awbNumber: "",
    fromDate: "",
    toDate: "",
  });
  const [shipmentModal, setShipmentModal] = useState(false);
  const [trackingModal, setTrackingModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [trackingForm, setTrackingForm] = useState(EMPTY_TRACKING);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(getShipments({
        ...filters,
        limit: 20,
        offset: (page - 1) * 20,
      })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, page]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      orderId: "",
      sellerId: "",
      status: "",
      courierName: "",
      awbNumber: "",
      fromDate: "",
      toDate: "",
    });
    setPage(1);
  };

  const submitShipment = useCallback(async () => {
    if (!shipmentForm.orderId.trim()) {
      toast.error("Order ID is required");
      return;
    }
    try {
      setLoading(true);
      await dispatch(createShipment({
        ...shipmentForm,
        idempotencyKey: shipmentForm.idempotencyKey || `${shipmentForm.orderId}:${shipmentForm.sellerId || "seller"}:${shipmentForm.awbNumber || Date.now()}`,
        packageSnapshot: {
          ...shipmentForm.packageSnapshot,
          weightGrams: Number(shipmentForm.packageSnapshot.weightGrams || 0),
          length: Number(shipmentForm.packageSnapshot.length || 0),
          width: Number(shipmentForm.packageSnapshot.width || 0),
          height: Number(shipmentForm.packageSnapshot.height || 0),
        },
      })).unwrap();
      toast.success("Shipment created");
      setShipmentModal(false);
      setShipmentForm(EMPTY_SHIPMENT);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, shipmentForm]);

  const submitTracking = useCallback(async () => {
    if (!trackingForm.shipmentId || !trackingForm.status) {
      toast.error("Shipment and status are required");
      return;
    }
    try {
      setLoading(true);
      await dispatch(addShipmentTracking(trackingForm)).unwrap();
      toast.success("Tracking updated");
      setTrackingModal(false);
      setTrackingForm(EMPTY_TRACKING);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to update tracking");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, trackingForm]);

  const createManifest = useCallback(async () => {
    if (!selectedRows.length) {
      toast.error("Select at least one shipment");
      return;
    }
    try {
      setLoading(true);
      const res = await dispatch(createShipmentManifest({
        shipmentIds: selectedRows,
        manifestNumber: `MAN-${moment().format("YYYYMMDD-HHmmss")}`,
      })).unwrap();
      toast.success("Manifest created");
      const manifest = res?.data || {};
      const csv = [
        ["Manifest", "Shipment ID"],
        ...selectedRows.map((shipmentId) => [manifest.manifest_number || manifest.manifestNumber || "", shipmentId]),
      ].map((row) => row.map(csvValue).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `manifest-${moment().format("YYYYMMDD-HHmm")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setSelectedRows([]);
      await fetchShipments();
    } catch (error) {
      toast.error(error?.message || error || "Failed to create manifest");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchShipments, selectedRows]);

  const openTracking = (row) => {
    setTrackingForm({ ...EMPTY_TRACKING, shipmentId: row.id });
    setTrackingModal(true);
  };

  const columns = useMemo(() => [
    {
      key: "shipment",
      label: "Shipment",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <MdLocalShipping size={18} />
          </span>
          <div>
            <div className="font-semibold text-gray-800">{row.awb_number || row.tracking_number || row.id}</div>
            <div className="text-xs text-gray-400">Order {row.order_id}</div>
          </div>
        </div>
      ),
    },
    { key: "seller_id", label: "Seller" },
    { key: "courier_name", label: "Courier", render: (value) => value || "Manual" },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={displayStatus(value)} dot />,
    },
    {
      key: "cod",
      label: "COD",
      render: (value) => (value ? "Yes" : "No"),
    },
    {
      key: "expected_delivery_at",
      label: "Expected",
      render: (value) => value ? moment(value).format("DD-MM-YYYY") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="admin-btn-secondary !px-2 !py-1"
            onClick={() => {
              setSelectedShipment(row);
              setDetailModal(true);
            }}
          >
            View
          </button>
          <PermissionGuard module="delivery" action={ACTIONS.STATUS_CHANGE} hide>
            <button
              type="button"
              className="admin-btn-secondary !px-2 !py-1"
              onClick={() => openTracking(row)}
            >
              <MdTimeline size={15} /> Track
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ], []);

  const updatePackageField = (field, value) => {
    setShipmentForm((prev) => ({
      ...prev,
      packageSnapshot: { ...prev.packageSnapshot, [field]: value },
    }));
  };

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Loader loading={loading} />
      <PageHeader
        title="Shipment Tracking"
        subtitle="Create manual shipments, update tracking, and generate manifests"
        breadcrumbs={[{ label: "Tax & Compliance" }, { label: "Shipment Tracking" }]}
        actions={
          <div className="flex gap-2">
            <PermissionGuard module="delivery" action={ACTIONS.CREATE} hide>
              <button type="button" className="admin-btn-primary" onClick={() => setShipmentModal(true)}>
                <MdAdd size={16} /> Create Shipment
              </button>
            </PermissionGuard>
            <PermissionGuard module="delivery" action={ACTIONS.EXPORT} hide>
              <button type="button" className="admin-btn-secondary" onClick={createManifest}>
                <MdFileDownload size={16} /> Manifest
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="admin-card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="admin-input" placeholder="Order ID" value={filters.orderId} onChange={(event) => setFilter("orderId", event.target.value)} />
          <input className="admin-input" placeholder="Seller ID" value={filters.sellerId} onChange={(event) => setFilter("sellerId", event.target.value)} />
          <input className="admin-input" placeholder="AWB / tracking" value={filters.awbNumber} onChange={(event) => setFilter("awbNumber", event.target.value)} />
          <select className="admin-input" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
          </select>
          <input className="admin-input" placeholder="Courier" value={filters.courierName} onChange={(event) => setFilter("courierName", event.target.value)} />
          <input className="admin-input" type="date" value={filters.fromDate} onChange={(event) => setFilter("fromDate", event.target.value)} />
          <input className="admin-input" type="date" value={filters.toDate} onChange={(event) => setFilter("toDate", event.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="admin-btn-secondary" onClick={resetFilters}>Reset</button>
            <button type="button" className="admin-btn-secondary" onClick={fetchShipments}><MdRefresh size={17} /> Refresh</button>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={shipmentPayload.list}
        loading={loading}
        totalCount={shipmentPayload.total || shipmentPayload.list.length}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        selectable
        selectedKeys={selectedRows}
        onSelectionChange={setSelectedRows}
        rowKey="id"
        requiredModule="delivery"
        exportConfig={{ filename: "shipments", columns, data: shipmentPayload.list }}
      />

      <DefaultModal isOpen={shipmentModal} onClose={() => setShipmentModal(false)} title="Create Shipment" onSubmit={submitShipment}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input labelName="Order ID" name="orderId" value={shipmentForm.orderId} onChange={(event) => setShipmentForm((prev) => ({ ...prev, orderId: event.target.value }))} required />
          <Input labelName="Seller ID" name="sellerId" value={shipmentForm.sellerId} onChange={(event) => setShipmentForm((prev) => ({ ...prev, sellerId: event.target.value }))} />
          <Input labelName="Courier" name="courierName" value={shipmentForm.courierName} onChange={(event) => setShipmentForm((prev) => ({ ...prev, courierName: event.target.value }))} />
          <Input labelName="AWB Number" name="awbNumber" value={shipmentForm.awbNumber} onChange={(event) => setShipmentForm((prev) => ({ ...prev, awbNumber: event.target.value }))} />
          <Input labelName="Tracking Number" name="trackingNumber" value={shipmentForm.trackingNumber} onChange={(event) => setShipmentForm((prev) => ({ ...prev, trackingNumber: event.target.value }))} />
          <select className="admin-input mt-7" value={shipmentForm.shippingMode} onChange={(event) => setShipmentForm((prev) => ({ ...prev, shippingMode: event.target.value }))}>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
            <option value="same_day">Same day</option>
            <option value="hyperlocal">Hyperlocal</option>
          </select>
          <Input type="number" labelName="Weight grams" value={shipmentForm.packageSnapshot.weightGrams} onChange={(event) => updatePackageField("weightGrams", event.target.value)} />
          <Input type="number" labelName="Length" value={shipmentForm.packageSnapshot.length} onChange={(event) => updatePackageField("length", event.target.value)} />
          <Input type="number" labelName="Width" value={shipmentForm.packageSnapshot.width} onChange={(event) => updatePackageField("width", event.target.value)} />
          <Input type="number" labelName="Height" value={shipmentForm.packageSnapshot.height} onChange={(event) => updatePackageField("height", event.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
            <input type="checkbox" checked={shipmentForm.cod} onChange={(event) => setShipmentForm((prev) => ({ ...prev, cod: event.target.checked }))} />
            COD shipment
          </label>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={trackingModal} onClose={() => setTrackingModal(false)} title="Update Tracking" onSubmit={submitTracking}>
        <div className="space-y-3">
          <select className="admin-input" value={trackingForm.status} onChange={(event) => setTrackingForm((prev) => ({ ...prev, status: event.target.value }))}>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
          </select>
          <Input labelName="Location" value={trackingForm.location} onChange={(event) => setTrackingForm((prev) => ({ ...prev, location: event.target.value }))} />
          <Input labelName="Exception" value={trackingForm.deliveryException} onChange={(event) => setTrackingForm((prev) => ({ ...prev, deliveryException: event.target.value }))} />
          <Input type="textarea" labelName="Note" value={trackingForm.note} onChange={(event) => setTrackingForm((prev) => ({ ...prev, note: event.target.value }))} />
        </div>
      </DefaultModal>

      <DefaultModal isOpen={detailModal} onClose={() => setDetailModal(false)} title="Shipment Detail">
        <div className="space-y-3 text-sm">
          <div><strong>Shipment:</strong> {selectedShipment?.id}</div>
          <div><strong>Order:</strong> {selectedShipment?.order_id}</div>
          <div><strong>AWB:</strong> {selectedShipment?.awb_number || "N/A"}</div>
          <div><strong>Status:</strong> {displayStatus(selectedShipment?.status)}</div>
          <div><strong>Label/Manifest:</strong> {selectedShipment?.manifest_id || "N/A"}</div>
          <div className="border-t pt-3">
            <strong>Raw References</strong>
            <pre className="mt-2 bg-gray-50 p-3 rounded overflow-auto text-xs">{JSON.stringify(selectedShipment || {}, null, 2)}</pre>
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ShipmentTracking;
