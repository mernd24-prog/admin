import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdAdd, MdDelete, MdEdit, MdLocationOn, MdWarehouse } from 'react-icons/md';
import { toast } from 'react-toastify';
import FilterSelect from '../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../components/Atoms/Input/Input';
import PermissionGuard from '../../components/Atoms/PermissionGuard/PermissionGuard';
import { ConfirmModal, DataTable, PageHeader, StatusBadge } from '../../components/Shared';
import { axiosPrivate as axiosProvider } from '../../_helpers/axiosProvider';
import { ACTIONS } from '../../_helpers/usePermission';
import useDropdownOptions from '../../hooks/useDropdownOptions';

const ENDPOINT = '/admin/inventory/warehouses';

const EMPTY_FORM = {
  _id: '',
  name: '',
  code: '',
  managerName: '',
  managerPhone: '',
  managerEmail: '',
  addressLine1: '',
  addressLine2: '',
  countryId: '',
  stateId: '',
  cityId: '',
  zipCodeId: '',
  pincode: '',
  capacity: 0,
  skuCount: 0,
  active: true,
};

const toIdOptions = (options = []) =>
  options.map((option) => ({
    ...option,
    rawValue: option.value,
    value: option.id || option.value,
  }));

const unwrapList = (response) => {
  const data = response?.data?.data ?? response?.data ?? {};
  return {
    items: Array.isArray(data) ? data : data.items || data.list || [],
    total: Number(response?.data?.meta?.total ?? data.total ?? data.length ?? 0),
  };
};

const getId = (value) => value?._id || value?.id || value || '';
const getName = (value) => value?.name || value?.label || value || '—';
const getZip = (value, fallback = '') => value?.zipCode || value?.label || value || fallback || '—';

const WarehouseFormModal = ({
  open,
  form,
  errors,
  submitting,
  onClose,
  onChange,
  onSelect,
  onSubmit,
  countryOptions,
  stateOptions,
  cityOptions,
  pincodeOptions,
  loadingStates,
  loadingCities,
  loadingPincodes,
}) => {
  if (!open) return null;

  const selectedCountry = countryOptions.find((option) => String(option.value) === String(form.countryId)) || null;
  const selectedState = stateOptions.find((option) => String(option.value) === String(form.stateId)) || null;
  const selectedCity = cityOptions.find((option) => String(option.value) === String(form.cityId)) || null;
  const selectedPincode = pincodeOptions.find((option) => String(option.value) === String(form.zipCodeId)) || null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl mx-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {form._id ? 'Edit Warehouse' : 'Add Warehouse'}
          </h2>
          <button type="button" className="text-gray-400 hover:text-gray-700" onClick={onClose} disabled={submitting}>
            x
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input labelName="Warehouse Name" name="name" value={form.name} onChange={onChange} error={errors.name} required />
          <Input labelName="Warehouse Code" name="code" value={form.code} onChange={onChange} error={errors.code} required />
          <Input labelName="Manager Name" name="managerName" value={form.managerName} onChange={onChange} error={errors.managerName} />
          <Input labelName="Manager Phone" name="managerPhone" value={form.managerPhone} onChange={onChange} error={errors.managerPhone} />
          <Input labelName="Manager Email" type="email" name="managerEmail" value={form.managerEmail} onChange={onChange} error={errors.managerEmail} />
          <Input labelName="SKU Count" type="number" name="skuCount" value={form.skuCount} onChange={onChange} error={errors.skuCount} min={0} />
          <Input labelName="Capacity" type="number" name="capacity" value={form.capacity} onChange={onChange} error={errors.capacity} min={0} />
          <Input labelName="Pin / Zip Code" name="pincode" value={form.pincode} onChange={onChange} error={errors.pincode} required />

          <div className="md:col-span-2">
            <Input labelName="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={onChange} error={errors.addressLine1} required />
          </div>
          <div className="md:col-span-2">
            <Input labelName="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={onChange} error={errors.addressLine2} />
          </div>

          <FilterSelect
            label="Country"
            name="countryId"
            options={countryOptions}
            value={selectedCountry}
            onChange={(option) => onSelect('countryId', option)}
            error={errors.countryId}
            required
            placeholder="Select country"
          />
          <FilterSelect
            label="State"
            name="stateId"
            options={stateOptions}
            value={selectedState}
            onChange={(option) => onSelect('stateId', option)}
            error={errors.stateId}
            required
            isDisabled={!form.countryId}
            isLoading={loadingStates}
            placeholder="Select state"
          />
          <FilterSelect
            label="City"
            name="cityId"
            options={cityOptions}
            value={selectedCity}
            onChange={(option) => onSelect('cityId', option)}
            error={errors.cityId}
            required
            isDisabled={!form.stateId}
            isLoading={loadingCities}
            placeholder="Select city"
          />
          <FilterSelect
            label="Serviceable Pin"
            name="zipCodeId"
            options={pincodeOptions}
            value={selectedPincode}
            onChange={(option) => onSelect('zipCodeId', option)}
            isDisabled={!form.cityId}
            isLoading={loadingPincodes}
            placeholder="Optional linked pin code"
            isClearable
          />

          <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="active"
              checked={Boolean(form.active)}
              onChange={onChange}
              className="w-4 h-4 accent-[#989AFF]"
            />
            Active warehouse
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={submitting} className="admin-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="admin-btn-primary">
              {submitting ? 'Saving...' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const countries = useDropdownOptions('countries', { limit: 250 });
  const countryOptions = useMemo(() => toIdOptions(countries.options), [countries.options]);
  const states = useDropdownOptions('states', { parentId: form.countryId, limit: 250 }, { enabled: Boolean(form.countryId) });
  const stateOptions = useMemo(() => toIdOptions(states.options), [states.options]);
  const cities = useDropdownOptions('cities', { parentId: form.stateId, limit: 250 }, { enabled: Boolean(form.stateId) });
  const cityOptions = useMemo(() => toIdOptions(cities.options), [cities.options]);
  const pincodes = useDropdownOptions('pincodes', { parentId: form.cityId, limit: 250 }, { enabled: Boolean(form.cityId) });
  const pincodeOptions = useMemo(() => toIdOptions(pincodes.options), [pincodes.options]);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosProvider.get(ENDPOINT, { params: { page, limit: 20, search } });
      const payload = unwrapList(res);
      setWarehouses(payload.items);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error?.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (warehouse) => {
    setForm({
      _id: warehouse._id,
      name: warehouse.name || '',
      code: warehouse.code || '',
      managerName: warehouse.managerName || '',
      managerPhone: warehouse.managerPhone || '',
      managerEmail: warehouse.managerEmail || '',
      addressLine1: warehouse.addressLine1 || '',
      addressLine2: warehouse.addressLine2 || '',
      countryId: getId(warehouse.countryId),
      stateId: getId(warehouse.stateId),
      cityId: getId(warehouse.cityId),
      zipCodeId: getId(warehouse.zipCodeId),
      pincode: warehouse.pincode || warehouse.zipCodeId?.zipCode || '',
      capacity: warehouse.capacity || 0,
      skuCount: warehouse.skuCount || 0,
      active: warehouse.active !== false,
    });
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const nextErrors = {};
    ['name', 'code', 'addressLine1', 'countryId', 'stateId', 'cityId', 'pincode'].forEach((field) => {
      if (!String(form[field] ?? '').trim()) nextErrors[field] = 'Required';
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSelect = (name, option) => {
    setForm((current) => {
      const next = { ...current, [name]: option?.value || '' };
      if (name === 'countryId') {
        next.stateId = '';
        next.cityId = '';
        next.zipCodeId = '';
        next.pincode = '';
      }
      if (name === 'stateId') {
        next.cityId = '';
        next.zipCodeId = '';
        next.pincode = '';
      }
      if (name === 'cityId') {
        next.zipCodeId = '';
        next.pincode = '';
      }
      if (name === 'zipCodeId') {
        next.pincode = option?.rawValue || '';
      }
      return next;
    });
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const payload = {
      ...form,
      capacity: Number(form.capacity || 0),
      skuCount: Number(form.skuCount || 0),
      zipCodeId: form.zipCodeId || null,
    };
    delete payload._id;

    try {
      if (form._id) {
        await axiosProvider.patch(`${ENDPOINT}/${form._id}`, payload);
        toast.success('Warehouse updated');
      } else {
        await axiosProvider.post(ENDPOINT, payload);
        toast.success('Warehouse created');
      }
      setShowForm(false);
      fetchWarehouses();
    } catch (error) {
      toast.error(error?.message || 'Failed to save warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setSubmitting(true);
    try {
      await axiosProvider.delete(`${ENDPOINT}/${deleteTarget._id}`);
      toast.success('Warehouse deleted');
      setDeleteTarget(null);
      fetchWarehouses();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Warehouse',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#F0F0F3] flex items-center justify-center text-[#989AFF]">
            <MdWarehouse size={18} />
          </span>
          <div>
            <div className="font-semibold text-gray-800">{row.name}</div>
            <div className="text-xs text-gray-400 font-mono">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (_, row) => (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <MdLocationOn size={15} className="text-gray-300" />
          {getName(row.cityId)}, {getName(row.stateId)} - {getZip(row.zipCodeId, row.pincode)}
        </span>
      ),
    },
    { key: 'managerName', label: 'Manager', render: (value) => value || '—' },
    { key: 'skuCount', label: 'SKUs', render: (value) => <span className="font-mono">{Number(value || 0).toLocaleString()}</span> },
    { key: 'capacity', label: 'Capacity', render: (value) => <span className="font-mono">{Number(value || 0).toLocaleString()}</span> },
    { key: 'active', label: 'Status', render: (value) => <StatusBadge status={value === false ? 'inactive' : 'active'} dot /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <PermissionGuard module="inventory" action={ACTIONS.EDIT}>
            <button type="button" onClick={() => openEdit(row)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Edit warehouse">
              <MdEdit size={16} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="inventory" action={ACTIONS.DELETE}>
            <button type="button" onClick={() => setDeleteTarget(row)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-100 text-red-500 hover:bg-red-50" title="Delete warehouse">
              <MdDelete size={16} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Warehouse Management"
        subtitle="Manage fulfilment centres and stock locations"
        breadcrumbs={[{ label: 'Inventory Management' }, { label: 'Warehouse Management' }]}
        actions={
          <PermissionGuard module="inventory" action={ACTIONS.CREATE}>
            <button onClick={openCreate} className="admin-btn-primary">
              <MdAdd size={16} /> Add Warehouse
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={warehouses}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onSearch={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search warehouses..."
        onRefresh={fetchWarehouses}
        requiredModule="inventory"
        exportConfig={{ filename: 'warehouses', columns }}
      />

      <WarehouseFormModal
        open={showForm}
        form={form}
        errors={errors}
        submitting={submitting}
        onClose={() => setShowForm(false)}
        onChange={handleChange}
        onSelect={handleSelect}
        onSubmit={handleSubmit}
        countryOptions={countryOptions}
        stateOptions={stateOptions}
        cityOptions={cityOptions}
        pincodeOptions={pincodeOptions}
        loadingStates={states.loading}
        loadingCities={cities.loading}
        loadingPincodes={pincodes.loading}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={submitting}
        variant="danger"
        title="Delete Warehouse?"
        message={`This will permanently remove "${deleteTarget?.name || 'this warehouse'}".`}
        confirmLabel="Delete Warehouse"
      />
    </div>
  );
};

export default WarehouseManagement;
