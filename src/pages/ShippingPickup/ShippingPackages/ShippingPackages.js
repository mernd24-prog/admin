import React, { useCallback, useEffect, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdLocalShipping, MdRefresh } from "react-icons/md";
import { toast } from "sonner";
import Input from "../../../components/Atoms/Input/Input";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import {
  ConfirmModal,
  DataTable,
  ExportButton,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ACTIONS } from "../../../_helpers/usePermission";

const ENDPOINT = "/admin/shipping/packages";

const EMPTY_FORM = {
  _id: "",
  name: "",
  code: "",
  length: "",
  width: "",
  height: "",
  unit: "cm",
  maxWeight: "",
  active: true,
};

const UNIT_OPTIONS = [
  { label: "Centimeter", value: "cm" },
  { label: "Inch", value: "inch" },
  { label: "Millimeter", value: "mm" },
];

const unwrapList = (response) => {
  const data = response?.data?.data ?? response?.data ?? {};
  return {
    items: Array.isArray(data) ? data : data.items || data.list || [],
    total: Number(
      response?.data?.meta?.total ?? data.total ?? data.length ?? 0,
    ),
  };
};

const PackageFormModal = ({
  open,
  form,
  errors,
  submitting,
  onClose,
  onChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998]  flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 "
        onClick={submitting ? undefined : onClose}
      />
      <div className="relative w-full max-w-2xl  max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl mx-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {form._id ? "Edit Shipping Package" : "Add Shipping Package"}
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700"
            onClick={onClose}
            disabled={submitting}
          >
            x
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Input
            labelName="Package Name"
            name="name"
            value={form.name}
            onChange={onChange}
            error={errors.name}
            required
          />
          <Input
            labelName="Code"
            name="code"
            value={form.code}
            onChange={onChange}
            error={errors.code}
            placeholder="Optional"
          />
          <Input
            labelName="Length"
            type="number"
            name="length"
            value={form.length}
            onChange={onChange}
            error={errors.length}
            min={0}
            required
          />
          <Input
            labelName="Width"
            type="number"
            name="width"
            value={form.width}
            onChange={onChange}
            error={errors.width}
            min={0}
            required
          />
          <Input
            labelName="Height"
            type="number"
            name="height"
            value={form.height}
            onChange={onChange}
            error={errors.height}
            min={0}
            required
          />
          <Input
            labelName="Unit"
            type="select"
            name="unit"
            value={form.unit}
            onChange={(option) =>
              onChange({
                target: { name: "unit", value: option?.value || "cm" },
              })
            }
            options={UNIT_OPTIONS}
            error={errors.unit}
            required
          />
          <Input
            labelName="Max Weight"
            type="number"
            name="maxWeight"
            value={form.maxWeight}
            onChange={onChange}
            error={errors.maxWeight}
            min={0}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
            <input
              type="checkbox"
              name="active"
              checked={Boolean(form.active)}
              onChange={onChange}
              className="w-4 h-4 accent-[var(--admin-gold)]"
            />
            Active package
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary"
            >
              {submitting ? "Saving..." : "Save Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ShippingPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosProvider.get(ENDPOINT, {
        params: { page, limit: 20, search },
      });
      const payload = unwrapList(res);
      setPackages(payload.items);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error?.message || "Failed to load shipping packages");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const applyFilters = useCallback(() => {
    setSearch(filters.search?.trim() || "");
    setPage(1);
  }, [filters.search]);

  const handleSearchRemove = useCallback(() => {
    setFilters({ search: "" });
    setSearch("");
    setPage(1);
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      _id: item._id,
      name: item.name || "",
      code: item.code || "",
      length: item.length ?? "",
      width: item.width ?? "",
      height: item.height ?? "",
      unit: item.unit || "cm",
      maxWeight: item.maxWeight ?? "",
      active: item.active !== false,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name])
      setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    ["name", "length", "width", "height", "unit"].forEach((field) => {
      if (!String(form[field] ?? "").trim()) nextErrors[field] = "Required";
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const payload = {
      ...form,
      length: Number(form.length || 0),
      width: Number(form.width || 0),
      height: Number(form.height || 0),
      maxWeight: Number(form.maxWeight || 0),
    };
    delete payload._id;

    try {
      if (form._id) {
        await axiosProvider.patch(`${ENDPOINT}/${form._id}`, payload);
        toast.success("Shipping package updated");
      } else {
        await axiosProvider.post(ENDPOINT, payload);
        toast.success("Shipping package created");
      }
      setShowForm(false);
      fetchPackages();
    } catch (error) {
      toast.error(error?.message || "Failed to save shipping package");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setSubmitting(true);
    try {
      await axiosProvider.delete(`${ENDPOINT}/${deleteTarget._id}`);
      toast.success("Shipping package deleted");
      setDeleteTarget(null);
      fetchPackages();
    } catch (error) {
      toast.error(error?.message || "Failed to delete shipping package");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Package",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <MdLocalShipping size={18} />
          </span>
          <div>
            <div className="font-semibold text-gray-800">{row.name}</div>
            <div className="text-xs text-gray-400 font-mono">
              {row.code || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "dimensions",
      label: "Dimensions",
      render: (_, row) => (
        <span className="font-mono">
          {row.length} x {row.width} x {row.height} {row.unit}
        </span>
      ),
    },
    {
      key: "maxWeight",
      label: "Max Weight",
      render: (value) => (value ? `${value} kg` : "—"),
    },
    {
      key: "active",
      label: "Status",
      render: (value) => (
        <StatusBadge status={value === false ? "inactive" : "active"} dot />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <PermissionGuard module="delivery" action={ACTIONS.EDIT}>
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Edit shipping package"
            >
              <MdEdit size={16} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="delivery" action={ACTIONS.DELETE}>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
              title="Delete shipping package"
            >
              <MdDelete size={16} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto  mt-8">
      <PageHeader
        title="Shipping Rules"
        subtitle="Manage parcel dimensions used for shipping calculations"
        breadcrumbs={[
          { label: "Tax & Compliance" },
          { label: "Shipping Rules" },
        ]}
        actions={
          <PermissionGuard module="delivery" action={ACTIONS.CREATE}>
            <button onClick={openCreate} className="admin-btn-primary">
              <MdAdd size={16} /> Add Package
            </button>
          </PermissionGuard>
        }
      />

      <div className="mb-3 bg-white rounded-lg">
        <SearchComponent
          isSearchShow={true}
          filters={filters}
          setFilters={setFilters}
          placeholder="Search packages..."
          applyFilters={applyFilters}
          handleSearchRemove={handleSearchRemove}
          searchDebounce={400}
          searchActions={
            <>
              <ExportButton
                filename="shipping-packages"
                columns={columns}
                data={packages}
                requiredModule="delivery"
              />
              <button
                type="button"
                onClick={fetchPackages}
                className="admin-btn-secondary"
                aria-label="Refresh shipping packages"
              >
                <MdRefresh size={17} /> Refresh
              </button>
            </>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={packages}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        requiredModule="delivery"
      />

      <PackageFormModal
        open={showForm}
        form={form}
        errors={errors}
        submitting={submitting}
        onClose={() => setShowForm(false)}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={submitting}
        variant="danger"
        title="Delete Shipping Package?"
        message={`This will permanently remove "${deleteTarget?.name || "this package"}".`}
        confirmLabel="Delete Package"
      />
    </div>
  );
};

export default ShippingPackages;
