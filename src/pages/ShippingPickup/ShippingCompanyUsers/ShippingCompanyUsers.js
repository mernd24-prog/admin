import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdEdit, MdLocalShipping, MdRefresh } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  createDeliveryAgent,
  getDeliveryAgents,
  updateDeliveryAgent,
} from "../../../Redux/deliverySlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const VERIFICATION_STATUSES = ["pending", "verified", "rejected"];

const EMPTY_FORM = {
  id: "",
  sellerId: "",
  name: "",
  phone: "",
  email: "",
  vehicleType: "",
  vehicleNumber: "",
  licenseNumber: "",
  verificationStatus: "pending",
  active: true,
  documentsText: "{}",
  metadataText: "{}",
};

const FILTER_FIELDS = [
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  {
    key: "verificationStatus",
    type: "select",
    label: "Verification",
    width: "w-44",
    options: VERIFICATION_STATUSES.map((value) => ({
      value,
      label: value.replace(/_/g, " "),
    })),
  },
  {
    key: "active",
    type: "select",
    label: "Active",
    width: "w-32",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.items || data?.list || [],
    total: Number(data?.total || data?.items?.length || data?.list?.length || 0),
  };
};

const display = (value = "") => String(value || "N/A").replace(/_/g, " ");
const agentIdOf = (agent = {}) => agent.id || agent._id || agent.deliveryAgentId;
const dateText = (value) => value ? moment(value).format("DD MMM YYYY HH:mm") : "N/A";

const stringifyJson = (value) => {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

const parseJsonField = (value, label) => {
  const text = String(value || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed;
  } catch (error) {
    throw new Error(error?.message || `${label} must be valid JSON`);
  }
};

const toForm = (agent = {}) => ({
  id: agentIdOf(agent),
  sellerId: agent.seller_id || agent.sellerId || "",
  name: agent.name || "",
  phone: agent.phone || "",
  email: agent.email || "",
  vehicleType: agent.vehicle_type || agent.vehicleType || "",
  vehicleNumber: agent.vehicle_number || agent.vehicleNumber || "",
  licenseNumber: agent.license_number || agent.licenseNumber || "",
  verificationStatus: agent.verification_status || agent.verificationStatus || "pending",
  active: agent.active !== false,
  documentsText: stringifyJson(agent.documents),
  metadataText: stringifyJson(agent.metadata),
});

const SellerSelectField = ({ value, onChange, required }) => {
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    dropdownApi.getSellers({ limit: 100 }).then(setOptions).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <label className="block text-sm text-gray-700">
      <span className="mb-1 block font-medium">Seller {required && <span className="text-red-500">*</span>}</span>
      <select
        className="admin-input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">— Select seller —</option>
        {loading && <option disabled>Loading…</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
};

const ShippingCompanyUsers = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.delivery);
  const payload = unwrapList(selector.agentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getDeliveryAgents({
        sellerId: params.sellerId,
        active: params.active,
        verificationStatus: params.verificationStatus,
        search: params.search,
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      })).unwrap();
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to load delivery agents";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const updateForm = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((agent) => {
    setForm(toForm(agent));
    setModalOpen(true);
  }, []);

  const buildPayload = useCallback(() => {
    if (!form.sellerId.trim()) throw new Error("Seller ID is required");
    if (form.name.trim().length < 2) throw new Error("Agent name must be at least 2 characters");
    if (form.phone.trim().length < 7) throw new Error("Phone number must be at least 7 characters");

    return {
      ...(form.id ? { deliveryAgentId: form.id } : {}),
      sellerId: form.sellerId.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      vehicleType: form.vehicleType.trim() || null,
      vehicleNumber: form.vehicleNumber.trim() || null,
      licenseNumber: form.licenseNumber.trim() || null,
      verificationStatus: form.verificationStatus,
      active: Boolean(form.active),
      documents: parseJsonField(form.documentsText, "Documents"),
      metadata: parseJsonField(form.metadataText, "Metadata"),
    };
  }, [form]);

  const submitAgent = useCallback(async () => {
    let body;
    try {
      body = buildPayload();
    } catch (validationError) {
      toast.error(validationError.message);
      return;
    }

    try {
      setLoading(true);
      if (form.id) {
        await dispatch(updateDeliveryAgent(body)).unwrap();
        toast.success("Delivery agent updated");
      } else {
        await dispatch(createDeliveryAgent(body)).unwrap();
        toast.success("Delivery agent created");
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await fetchAgents();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to save delivery agent");
    } finally {
      setLoading(false);
    }
  }, [buildPayload, dispatch, fetchAgents, form.id]);

  const columns = useMemo(() => [
    {
      key: "name",
      label: "Agent",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <MdLocalShipping size={18} />
          </span>
          <div>
            <div className="font-semibold text-gray-800">{value || "N/A"}</div>
            <div className="text-xs text-gray-400">{row.phone || "No phone"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "seller_id",
      label: "Seller",
      render: (value) => <span className="font-mono text-xs">{value || "N/A"}</span>,
    },
    {
      key: "vehicle_number",
      label: "Vehicle",
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-700">{value || "N/A"}</div>
          <div className="text-xs text-gray-400">{display(row.vehicle_type)}</div>
        </div>
      ),
    },
    {
      key: "license_number",
      label: "License",
      render: (value) => value || "N/A",
    },
    {
      key: "verification_status",
      label: "Verification",
      render: (value) => <StatusBadge status={value || "pending"} dot />,
    },
    {
      key: "active",
      label: "Active",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} dot />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (value) => <span className="text-xs text-gray-500">{dateText(value)}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <PermissionGuard module="delivery" action={ACTIONS.UPDATE} hide>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="admin-btn-secondary !px-2 !py-1"
          >
            <MdEdit size={15} /> Edit
          </button>
        </PermissionGuard>
      ),
    },
  ], [openEdit]);

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <PageHeader
        title="Delivery Agents"
        subtitle="Manage seller delivery agents, verification, vehicle details, and active assignment eligibility"
        breadcrumbs={[{ label: "Shipping & Fulfilment" }, { label: "Delivery Agents" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-btn-secondary" onClick={fetchAgents}>
              <MdRefresh size={17} /> Refresh
            </button>
            <PermissionGuard module="delivery" action={ACTIONS.CREATE} hide>
              <button type="button" className="admin-btn-primary" onClick={openCreate}>
                <MdAdd size={16} /> Add Agent
              </button>
            </PermissionGuard>
          </div>
        }
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
        searchPlaceholder="Search agent, phone, vehicle, or license"
        error={error}
        onRefresh={fetchAgents}
        emptyText="No delivery agents found."
        requiredModule="delivery"
        exportConfig={{ filename: "delivery-agents", columns, data: payload.list }}
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
      />

      <DefaultModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Delivery Agent" : "Add Delivery Agent"}
        onSubmit={submitAgent}
        submitButtonText={form.id ? "Update" : "Create"}
        loading={loading}
        width="620px"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SellerSelectField
            value={form.sellerId}
            onChange={(value) => updateForm("sellerId", value)}
            required
          />
          <Input labelName="Agent Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
          <Input labelName="Phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} required />
          <Input labelName="Email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
          <Input labelName="Vehicle Type" value={form.vehicleType} onChange={(event) => updateForm("vehicleType", event.target.value)} placeholder="Bike, van, truck" />
          <Input labelName="Vehicle Number" value={form.vehicleNumber} onChange={(event) => updateForm("vehicleNumber", event.target.value)} />
          <Input labelName="License Number" value={form.licenseNumber} onChange={(event) => updateForm("licenseNumber", event.target.value)} />
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">Verification Status</span>
            <select
              className="admin-input w-full"
              value={form.verificationStatus}
              onChange={(event) => updateForm("verificationStatus", event.target.value)}
            >
              {VERIFICATION_STATUSES.map((status) => (
                <option key={status} value={status}>{display(status)}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
            />
            Active and assignable
          </label>
          <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              type="textarea"
              labelName="Documents JSON"
              rows={6}
              value={form.documentsText}
              onChange={(event) => updateForm("documentsText", event.target.value)}
              placeholder='{"licenseUrl":"https://..."}'
            />
            <Input
              type="textarea"
              labelName="Metadata JSON"
              rows={6}
              value={form.metadataText}
              onChange={(event) => updateForm("metadataText", event.target.value)}
              placeholder='{"shift":"day"}'
            />
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ShippingCompanyUsers;
