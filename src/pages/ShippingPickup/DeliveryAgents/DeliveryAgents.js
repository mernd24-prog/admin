import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdAdd,
  MdCheckCircle,
  MdDownload,
  MdEdit,
  MdRefresh,
  MdToggleOff,
  MdToggleOn,
} from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { ACTIONS } from "../../../_helpers/usePermission";
import { downloadApiFile } from "../../../_helpers/downloadApi";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { useListPage } from "../../../hooks/useListPage";
import {
  createDeliveryAgent,
  getDeliveryAgents,
  updateDeliveryAgent,
} from "../../../Redux/deliverySlice";

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
  note: "",
};

const FILTER_FIELDS = [
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
    key: "verificationStatus",
    type: "select",
    label: "Verification",
    options: ["pending", "verified", "rejected"].map((value) => ({
      value,
      label: value.replace(/_/g, " "),
    })),
  },
  {
    key: "active",
    type: "select",
    label: "Active",
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
    list: data?.items || data?.list || data || [],
    total: Number(data?.total || data?.items?.length || data?.list?.length || 0),
  };
};

const agentId = (row = {}) => row.id || row._id || row.deliveryAgentId;
const display = (value = "") => String(value || "N/A").replace(/_/g, " ");
const dateTime = (value) => value ? moment(value).format("DD-MM-YYYY HH:mm") : "N/A";

const normalizeFormFromAgent = (agent = {}) => ({
  id: agentId(agent),
  sellerId: agent.seller_id || agent.sellerId || "",
  name: agent.name || "",
  phone: agent.phone || "",
  email: agent.email || "",
  vehicleType: agent.vehicle_type || agent.vehicleType || "",
  vehicleNumber: agent.vehicle_number || agent.vehicleNumber || "",
  licenseNumber: agent.license_number || agent.licenseNumber || "",
  verificationStatus: agent.verification_status || agent.verificationStatus || "pending",
  active: agent.active !== false,
  note: agent.metadata?.verificationNote || "",
});

const toAgentPayload = (form) => ({
  sellerId: form.sellerId,
  name: form.name.trim(),
  phone: form.phone.trim(),
  email: form.email.trim() || null,
  vehicleType: form.vehicleType.trim() || null,
  vehicleNumber: form.vehicleNumber.trim() || null,
  licenseNumber: form.licenseNumber.trim() || null,
  verificationStatus: form.verificationStatus,
  active: form.active,
  metadata: form.note ? { verificationNote: form.note } : {},
});

const DeliveryAgents = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.delivery);
  const payload = unwrapList(selector.agentsData);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirm, setConfirm] = useState({ open: false });

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getDeliveryAgents({
        ...params,
        active: params.active === undefined ? undefined : params.active === "true",
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

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setForm(normalizeFormFromAgent(row));
    setFormOpen(true);
  };

  const submitForm = useCallback(async () => {
    if (form.name.trim().length < 2) {
      toast.error("Agent name is required");
      return;
    }
    if (!form.sellerId) {
      toast.error("Seller is required for delivery agent management");
      return;
    }
    if (form.phone.trim().length < 7) {
      toast.error("Phone number is required");
      return;
    }

    try {
      setLoading(true);
      const body = toAgentPayload(form);
      if (form.id) {
        await dispatch(updateDeliveryAgent({ deliveryAgentId: form.id, ...body })).unwrap();
        toast.success("Delivery agent updated");
      } else {
        await dispatch(createDeliveryAgent(body)).unwrap();
        toast.success("Delivery agent created");
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      await fetchAgents();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to save delivery agent");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchAgents, form]);

  const runPatchAction = useCallback(async () => {
    const { row, patch, successMessage } = confirm;
    if (!row || !patch) return;
    try {
      setLoading(true);
      await dispatch(updateDeliveryAgent({
        deliveryAgentId: agentId(row),
        ...patch,
      })).unwrap();
      toast.success(successMessage || "Delivery agent updated");
      setConfirm({ open: false });
      await fetchAgents();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to update delivery agent");
    } finally {
      setLoading(false);
    }
  }, [confirm, dispatch, fetchAgents]);

  const exportAgents = useCallback(async () => {
    try {
      const params = {
        ...toQueryParams(),
        format: "csv",
        resource: "delivery-agents",
      };
      await downloadApiFile(ENDPOINTS.operationsReports.deliveryAgents, params, {
        filename: `delivery-agents-${moment().format("YYYY-MM-DD")}.csv`,
      });
      toast.success("Delivery agent export started");
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to export delivery agents");
    }
  }, [toQueryParams]);

  const columns = useMemo(() => [
    {
      key: "name",
      label: "Agent",
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-semibold text-gray-800">{value || "N/A"}</div>
          <div className="text-xs text-gray-400">{row.phone || "No phone"}{row.email ? ` · ${row.email}` : ""}</div>
        </div>
      ),
    },
    {
      key: "seller_id",
      label: "Seller",
      render: (value, row) => {
        const seller = row.sellerName || row.seller?.name || row.seller?.businessName || value || row.sellerId;
        return <span className="font-mono text-xs text-gray-500">{seller || "Platform"}</span>;
      },
    },
    {
      key: "vehicle_type",
      label: "Vehicle",
      render: (value, row) => (
        <div>
          <div>{value || row.vehicleType || "N/A"}</div>
          <div className="text-xs text-gray-400">{row.vehicle_number || row.vehicleNumber || "No vehicle number"}</div>
        </div>
      ),
    },
    {
      key: "verification_status",
      label: "Verification",
      sortable: true,
      render: (value, row) => (
        <StatusBadge
          status={display(value || row.verificationStatus || "pending")}
          dot
        />
      ),
    },
    {
      key: "active",
      label: "Active",
      sortable: true,
      render: (value) => value === false
        ? <StatusBadge status="Inactive" color="red" />
        : <StatusBadge status="Active" color="green" />,
    },
    {
      key: "updated_at",
      label: "Updated",
      sortable: true,
      render: (value, row) => dateTime(value || row.updatedAt),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const verified = (row.verification_status || row.verificationStatus) === "verified";
        const rejected = (row.verification_status || row.verificationStatus) === "rejected";
        return (
          <div className="flex flex-wrap items-center gap-2">
            <PermissionGuard module="delivery" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}>
                <MdEdit size={15} /> Edit
              </button>
            </PermissionGuard>
            {!verified && (
              <PermissionGuard module="delivery" action={ACTIONS.UPDATE} hide>
                <button
                  type="button"
                  className="admin-btn-secondary !px-2 !py-1"
                  onClick={() => setConfirm({
                    open: true,
                    row,
                    patch: { verificationStatus: "verified", metadata: { verificationNote: "Verified by admin" } },
                    title: "Verify delivery agent?",
                    message: "Verified active agents can be assigned to seller shipments.",
                    successMessage: "Delivery agent verified",
                  })}
                >
                  <MdCheckCircle size={15} /> Verify
                </button>
              </PermissionGuard>
            )}
            {!rejected && (
              <PermissionGuard module="delivery" action={ACTIONS.UPDATE} hide>
                <button
                  type="button"
                  className="admin-btn-secondary !px-2 !py-1 text-red-600"
                  onClick={() => setConfirm({
                    open: true,
                    row,
                    patch: { verificationStatus: "rejected", active: false, metadata: { verificationNote: "Rejected by admin" } },
                    title: "Reject delivery agent?",
                    message: "Rejected agents cannot be assigned to new shipments.",
                    successMessage: "Delivery agent rejected",
                    variant: "danger",
                  })}
                >
                  Reject
                </button>
              </PermissionGuard>
            )}
            <PermissionGuard module="delivery" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-btn-secondary !px-2 !py-1"
                onClick={() => setConfirm({
                  open: true,
                  row,
                  patch: { active: row.active === false },
                  title: row.active === false ? "Activate delivery agent?" : "Deactivate delivery agent?",
                  message: row.active === false
                    ? "Active verified agents can be selected for shipment assignment."
                    : "Inactive agents remain in history but cannot be selected for new assignments.",
                  successMessage: row.active === false ? "Delivery agent activated" : "Delivery agent deactivated",
                })}
              >
                {row.active === false ? <MdToggleOn size={15} /> : <MdToggleOff size={15} />}
                {row.active === false ? "Activate" : "Deactivate"}
              </button>
            </PermissionGuard>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <PageHeader
        title="Delivery Agents"
        subtitle="Manage in-house delivery agents and seller-specific shipment assignees"
        breadcrumbs={[{ label: "Delivery & Shipping" }, { label: "Delivery Agents" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-btn-secondary" onClick={fetchAgents} disabled={loading}>
              <MdRefresh size={17} /> Refresh
            </button>
            <PermissionGuard module="delivery" action={ACTIONS.EXPORT} hide>
              <button type="button" className="admin-btn-secondary" onClick={exportAgents} disabled={loading}>
                <MdDownload size={17} /> Export
              </button>
            </PermissionGuard>
            <PermissionGuard module="delivery" action={ACTIONS.CREATE} hide>
              <button type="button" className="admin-btn-primary" onClick={openCreate}>
                <MdAdd size={17} /> New Agent
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
        searchPlaceholder="Search delivery agent, phone, vehicle, or seller"
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchAgents}
        error={error}
        filterBar={(
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        )}
        requiredModule="delivery"
        rowKey={agentId}
      />

      <DefaultModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setForm(EMPTY_FORM);
        }}
        title={form.id ? "Edit Delivery Agent" : "Create Delivery Agent"}
        onSubmit={submitForm}
        submitButtonText={form.id ? "Save" : "Create"}
        loading={loading}
        width="620px"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-sm text-gray-700 md:col-span-2">
            <span className="mb-1 block font-medium">Seller *</span>
            <FilterSellerSelect
              value={form.sellerId}
              onChange={(sellerId) => setForm((prev) => ({ ...prev, sellerId }))}
            />
          </label>
          <FormInput label="Name" value={form.name} required onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <FormInput label="Phone" value={form.phone} required onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
          <FormInput label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
          <FormInput label="Vehicle Type" value={form.vehicleType} onChange={(value) => setForm((prev) => ({ ...prev, vehicleType: value }))} />
          <FormInput label="Vehicle Number" value={form.vehicleNumber} onChange={(value) => setForm((prev) => ({ ...prev, vehicleNumber: value }))} />
          <FormInput label="License Number" value={form.licenseNumber} onChange={(value) => setForm((prev) => ({ ...prev, licenseNumber: value }))} />
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">Verification</span>
            <select
              className="admin-input w-full"
              value={form.verificationStatus}
              onChange={(event) => setForm((prev) => ({ ...prev, verificationStatus: event.target.value }))}
            >
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Active
          </label>
          <label className="block text-sm text-gray-700 md:col-span-2">
            <span className="mb-1 block font-medium">Verification note</span>
            <textarea
              className="admin-input min-h-[84px] w-full"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>
        </div>
      </DefaultModal>

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm({ open: false })}
        onConfirm={runPatchAction}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant || "warning"}
        confirmLabel="Confirm"
        loading={loading}
      />
    </div>
  );
};

const FormInput = ({ label, value, onChange, required = false }) => (
  <label className="block text-sm text-gray-700">
    <span className="mb-1 block font-medium">{label}{required ? " *" : ""}</span>
    <input
      className="admin-input w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    />
  </label>
);

const FilterSellerSelect = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    dropdownApi.getSellers({ limit: 100 })
      .then(setOptions)
      .catch(() => setOptions([]));
  }, []);

  return (
    <select
      className="admin-input w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select seller</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
};

export default DeliveryAgents;
