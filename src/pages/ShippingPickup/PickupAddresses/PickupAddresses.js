import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdAdd, MdDelete, MdEdit, MdLocationOn } from 'react-icons/md';
import { toast } from 'sonner';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../components/Atoms/Input/Input';
import PermissionGuard from '../../../components/Atoms/PermissionGuard/PermissionGuard';
import { ConfirmModal, DataTable, PageHeader, StatusBadge } from '../../../components/Shared';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { ACTIONS } from '../../../_helpers/usePermission';
import useDropdownOptions from '../../../hooks/useDropdownOptions';

const ENDPOINT = '/admin/shipping/pickup-addresses';

const EMPTY_FORM = {
  _id: '',
  label: '',
  contactName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  countryId: '',
  stateId: '',
  cityId: '',
  zipCodeId: '',
  pincode: '',
  pickupInstructions: '',
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

const PickupAddressFormModal = ({
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
            {form._id ? 'Edit Pickup Address' : 'Add Pickup Address'}
          </h2>
          <button type="button" className="text-gray-400 hover:text-gray-700" onClick={onClose} disabled={submitting}>
            x
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input labelName="Address Label" name="label" value={form.label} onChange={onChange} error={errors.label} required />
          <Input labelName="Contact Name" name="contactName" value={form.contactName} onChange={onChange} error={errors.contactName} required />
          <Input labelName="Phone" name="phone" value={form.phone} onChange={onChange} error={errors.phone} required />
          <Input labelName="Email" type="email" name="email" value={form.email} onChange={onChange} error={errors.email} />
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
          <Input labelName="Pin / Zip Code" name="pincode" value={form.pincode} onChange={onChange} error={errors.pincode} required />
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
            <input type="checkbox" name="active" checked={Boolean(form.active)} onChange={onChange} className="w-4 h-4 accent-[#989AFF]" />
            Active pickup address
          </label>
          <div className="md:col-span-2">
            <Input
              labelName="Pickup Instructions"
              type="textarea"
              rows={3}
              name="pickupInstructions"
              value={form.pickupInstructions}
              onChange={onChange}
              error={errors.pickupInstructions}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={submitting} className="admin-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="admin-btn-primary">
              {submitting ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PickupAddresses = () => {
  const [addresses, setAddresses] = useState([]);
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

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosProvider.get(ENDPOINT, { params: { page, limit: 20, search } });
      const payload = unwrapList(res);
      setAddresses(payload.items);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error?.message || 'Failed to load pickup addresses');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      _id: item._id,
      label: item.label || '',
      contactName: item.contactName || '',
      phone: item.phone || '',
      email: item.email || '',
      addressLine1: item.addressLine1 || '',
      addressLine2: item.addressLine2 || '',
      countryId: getId(item.countryId),
      stateId: getId(item.stateId),
      cityId: getId(item.cityId),
      zipCodeId: getId(item.zipCodeId),
      pincode: item.pincode || item.zipCodeId?.zipCode || '',
      pickupInstructions: item.pickupInstructions || '',
      active: item.active !== false,
    });
    setErrors({});
    setShowForm(true);
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

  const validate = () => {
    const nextErrors = {};
    ['label', 'contactName', 'phone', 'addressLine1', 'countryId', 'stateId', 'cityId', 'pincode'].forEach((field) => {
      if (!String(form[field] ?? '').trim()) nextErrors[field] = 'Required';
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
      zipCodeId: form.zipCodeId || null,
      schedule: [],
    };
    delete payload._id;

    try {
      if (form._id) {
        await axiosProvider.patch(`${ENDPOINT}/${form._id}`, payload);
        toast.success('Pickup address updated');
      } else {
        await axiosProvider.post(ENDPOINT, payload);
        toast.success('Pickup address created');
      }
      setShowForm(false);
      fetchAddresses();
    } catch (error) {
      toast.error(error?.message || 'Failed to save pickup address');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setSubmitting(true);
    try {
      await axiosProvider.delete(`${ENDPOINT}/${deleteTarget._id}`);
      toast.success('Pickup address deleted');
      setDeleteTarget(null);
      fetchAddresses();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete pickup address');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'label',
      label: 'Address',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.label}</div>
          <div className="text-xs text-gray-500">{row.contactName}</div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (_, row) => (
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MdLocationOn size={15} className="text-gray-300" />
            {getName(row.cityId)}, {getName(row.stateId)} - {getZip(row.zipCodeId, row.pincode)}
          </div>
          <div className="text-xs text-gray-400 ml-5">{row.addressLine1}</div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (value) => value || '—' },
    { key: 'active', label: 'Status', render: (value) => <StatusBadge status={value === false ? 'inactive' : 'active'} dot /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <PermissionGuard module="delivery" action={ACTIONS.EDIT}>
            <button type="button" onClick={() => openEdit(row)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Edit pickup address">
              <MdEdit size={16} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="delivery" action={ACTIONS.DELETE}>
            <button type="button" onClick={() => setDeleteTarget(row)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-100 text-red-500 hover:bg-red-50" title="Delete pickup address">
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
        title="Pickup Addresses"
        subtitle="Manage fulfilment pickup locations with live location dependencies"
        breadcrumbs={[{ label: 'Tax & Compliance' }, { label: 'Pickup Addresses' }]}
        actions={
          <PermissionGuard module="delivery" action={ACTIONS.CREATE}>
            <button onClick={openCreate} className="admin-btn-primary">
              <MdAdd size={16} /> Add Address
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={addresses}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onSearch={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search pickup addresses..."
        onRefresh={fetchAddresses}
        requiredModule="delivery"
        exportConfig={{ filename: 'pickup-addresses', columns }}
      />

      <PickupAddressFormModal
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
        title="Delete Pickup Address?"
        message={`This will permanently remove "${deleteTarget?.label || 'this address'}".`}
        confirmLabel="Delete Address"
      />
    </div>
  );
};

export default PickupAddresses;
