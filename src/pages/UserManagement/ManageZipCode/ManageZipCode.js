/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import Loader from '../../../components/Loader/Loader';
import Button from '../../../components/Atoms/buttons/button';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Pagination from '../../../components/Pagination/Pagination';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import Input from '../../../components/Atoms/Input/Input';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import { create, edit, enableDisableZipCode, getZipCodeList } from '../../../Redux/zipCodeSlice';
import { getAllCountryList } from '../../../Redux/CountrySlice';
import { getAllStateList } from '../../../Redux/stateSlice';
import { getAllCityList } from '../../../Redux/citySlice';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { Link } from 'react-router-dom';

const size = 10;

const extractListPayload = (payload = {}) => {
  const data = payload?.data || payload;
  const nestedData = data?.data || data;
  const list = nestedData?.list || nestedData?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(nestedData?.total || list.length || 0),
  };
};

const initialFormState = {
  _id: null,
  zipCode: '',
  areaName: '',
  countryId: null,
  stateId: null,
  cityId: null,
  serviceable: true,
  codAvailable: true,
  expressDelivery: false,
  deliveryCharge: 0,
  minOrderAmount: 0,
  estimatedDeliveryDays: 5,
};

const ManageZipCode = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state);
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: '', country: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const [filteredStates, setFilteredStates] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);

  const allCountries = selector?.country?.getAllCountryListData?.data?.data?.list?.map(e => ({
    value: e?._id,
    label: e?.name,
  })) || [];

  const allStates = selector?.state?.getAllStateListData?.data?.data?.list || [];
  const allCities = selector?.city?.getAllCityListData?.data?.data?.list || [];

  useEffect(() => {
    dispatch(getAllCountryList());
    dispatch(getAllStateList());
  }, [dispatch]);

  useEffect(() => {
    if (formData.countryId) {
      const states = allStates
        .filter(s => s.countryId === formData.countryId || s.countryId?._id === formData.countryId)
        .map(s => ({ value: s._id, label: s.name }));
      setFilteredStates(states);
    } else {
      setFilteredStates(allStates.map(s => ({ value: s._id, label: s.name })));
    }
  }, [formData.countryId, allStates.length]);

  useEffect(() => {
    if (formData.stateId) {
      dispatch(getAllCityList({ stateId: formData.stateId })).then(res => {
        const cities = extractListPayload(res?.payload).list.map(c => ({
          value: c._id,
          label: c.name,
        }));
        setFilteredCities(cities);
      });
    } else {
      setFilteredCities([]);
    }
  }, [formData.stateId]);

  const fetchList = useCallback(() => {
    const query = {
      page: pageNo,
      size,
      keyWord: filters?.search,
    };
    setIsLoading(true);
    dispatch(getZipCodeList(query))
      .then(res => setApiRes(extractListPayload(res?.payload)))
      .catch(() => setApiRes({ list: [], total: 0 }))
      .finally(() => setIsLoading(false));
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onPageChange = newPage => setPageNo(newPage);

  const getAllRowIds = useCallback(() => apiRes?.list?.map(r => r?._id) || [], [apiRes?.list]);

  const handleHeaderCheckboxChange = e => {
    setSelectedRow(e.target.checked ? getAllRowIds() : []);
  };

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange = (option, { name }) => {
    const val = option?.value || null;
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      if (name === 'countryId') { updated.stateId = null; updated.cityId = null; }
      if (name === 'stateId') { updated.cityId = null; }
      return updated;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
    setFilteredStates([]);
    setFilteredCities([]);
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked ? [...prev, rowId] : prev.filter(id => id !== rowId)
    );
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.zipCode) errs.zipCode = 'Zip/Pin code is required';
    if (!formData.countryId) errs.countryId = 'Country is required';
    if (!formData.stateId) errs.stateId = 'State is required';
    if (!formData.cityId) errs.cityId = 'City is required';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      if (isEditMode) {
        await dispatch(edit({ ...formData })).unwrap();
        toast.success('Zip code updated successfully');
      } else {
        await dispatch(create(formData)).unwrap();
        toast.success('Zip code created successfully');
      }
      closeModal();
      fetchList();
    } catch (error) {
      toast.error(error || 'Failed to save zip code');
      if (error.errors) setErrors(error.errors);
    }
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const handleToggle = async row => {
    try {
      const res = await dispatch(enableDisableZipCode({
        _id: [row?._id],
        isDisable: isRowActive(row),
      })).unwrap();
      if (res) toast.success(res?.message);
      fetchList();
    } catch (error) {
      toast.error(error?.message || error || 'Failed');
    }
  };

  const applyFilters = useCallback(() => {
    setPageNo(1);
    fetchList();
  }, [fetchList]);

  const handleSearchRemove = () => {
    setFilters({ search: '', country: '' });
    setPageNo(1);
  };

  const handleBulkAction = async action => {
    if (action === 'Active' || action === 'Inactive') {
      try {
        const res = await dispatch(enableDisableZipCode({
          _id: selectedRow,
          isDisable: action === 'Inactive',
        })).unwrap();
        if (res) toast.success(res?.message);
        setSelectedRow([]);
        fetchList();
      } catch (error) {
        toast.error(error?.message || error || 'Failed');
        setSelectedRow([]);
      }
    }
  };

  const tableHeadings = ['Zip/Pin Code', 'Area Name', 'City', 'State', 'Serviceable', 'COD', 'Status', 'Action'];

  const tableRows = apiRes?.list?.map(ele => [
    <input
      type="checkbox"
      checked={selectedRow.includes(ele._id)}
      onChange={e => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className="font-mono font-medium">{ele?.zipCode}</span>,
    <span>{ele?.areaName || '—'}</span>,
    <span className="capitalize">{ele?.cityId?.name || '—'}</span>,
    <span className="capitalize">{ele?.stateId?.name || '—'}</span>,
    <span className={`text-xs px-2 py-0.5 rounded-full ${ele?.serviceable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {ele?.serviceable ? 'Yes' : 'No'}
    </span>,
    <span className={`text-xs px-2 py-0.5 rounded-full ${ele?.codAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
      {ele?.codAvailable ? 'Yes' : 'No'}
    </span>,
    <div className="flex flex-col">
      <ToggleButton isToggle={isRowActive(ele)} handleClick={() => handleToggle(ele)} />
    </div>,
    <ActionButtons
      onEdit={() => {
        setFormData({
          _id: ele._id,
          zipCode: ele.zipCode,
          areaName: ele.areaName || '',
          countryId: ele.countryId?._id || ele.countryId || null,
          stateId: ele.stateId?._id || ele.stateId || null,
          cityId: ele.cityId?._id || ele.cityId || null,
          serviceable: ele.serviceable ?? true,
          codAvailable: ele.codAvailable ?? true,
          expressDelivery: ele.expressDelivery ?? false,
          deliveryCharge: ele.deliveryCharge ?? 0,
          minOrderAmount: ele.minOrderAmount ?? 0,
          estimatedDeliveryDays: ele.estimatedDeliveryDays ?? 5,
        });
        setIsEditMode(true);
        setIsAddModal(true);
      }}
      showLinkButton={false}
      showDeleteButton={false}
    />,
  ]);

  return (
    <>
      <div className="p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3">
        <Loader loading={isLoading} />
        <div className="flex justify-between items-center">
          <h3>Home / <Link to="/app/setting">Settings</Link> / Zip Codes</h3>
          <Button onClick={() => { setFormData(initialFormState); setIsEditMode(false); setIsAddModal(true); }}>
            Add
          </Button>
        </div>

        <div className="p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]">
          <SearchComponent
            isSearchShow={true}
            isActionButton={true}
            filters={filters}
            setFilters={setFilters}
            isStatusAction={true}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            placeholder="Search by zip code or area"
            handleAction={handleBulkAction}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
          />

          <TableData
            Heading="Manage Zip Codes"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            totalData={apiRes?.total}
            totalSize={size}
            currentPage={pageNo}
            onPageChange={onPageChange}
            isHeaderCheckbox={true}
            handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            allRowsSelected={selectedRow.length === apiRes?.list?.length && apiRes?.list?.length > 0}
          />
          {apiRes?.total > size && (
            <Pagination
              totalPages={Math.ceil(apiRes?.total / size)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )}
        </div>

        <DefaultModal
          title={isEditMode ? 'Edit Zip Code' : 'Add Zip Code'}
          isOpen={isAddModal}
          onClose={closeModal}
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
            <div>
              <Input
                labelName="Zip / Pin Code"
                type="text"
                value={formData.zipCode}
                name="zipCode"
                onChange={handleInputChange}
                error={errors.zipCode}
                required
                maxLength={10}
              />
            </div>
            <div>
              <Input
                labelName="Area Name"
                type="text"
                value={formData.areaName}
                name="areaName"
                onChange={handleInputChange}
                error={errors.areaName}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={allCountries}
                value={allCountries.find(o => o.value === formData.countryId) || null}
                onChange={handleSelectChange}
                name="countryId"
                isSearchable
                placeholder="Select Country"
              />
              {errors.countryId && <p className="mt-1 text-sm text-red-600">{errors.countryId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={filteredStates}
                value={filteredStates.find(o => o.value === formData.stateId) || null}
                onChange={handleSelectChange}
                name="stateId"
                isSearchable
                placeholder="Select State"
                isDisabled={!formData.countryId}
              />
              {errors.stateId && <p className="mt-1 text-sm text-red-600">{errors.stateId}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={filteredCities}
                value={filteredCities.find(o => o.value === formData.cityId) || null}
                onChange={handleSelectChange}
                name="cityId"
                isSearchable
                placeholder="Select City"
                isDisabled={!formData.stateId}
              />
              {errors.cityId && <p className="mt-1 text-sm text-red-600">{errors.cityId}</p>}
            </div>

            <div>
              <Input
                labelName="Delivery Charge (₹)"
                type="number"
                value={formData.deliveryCharge}
                name="deliveryCharge"
                onChange={handleInputChange}
                error={errors.deliveryCharge}
                min={0}
              />
            </div>
            <div>
              <Input
                labelName="Min Order Amount (₹)"
                type="number"
                value={formData.minOrderAmount}
                name="minOrderAmount"
                onChange={handleInputChange}
                error={errors.minOrderAmount}
                min={0}
              />
            </div>
            <div>
              <Input
                labelName="Est. Delivery Days"
                type="number"
                value={formData.estimatedDeliveryDays}
                name="estimatedDeliveryDays"
                onChange={handleInputChange}
                error={errors.estimatedDeliveryDays}
                min={1}
              />
            </div>

            <div className="col-span-2 flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="serviceable"
                  checked={!!formData.serviceable}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-gray-700">Serviceable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="codAvailable"
                  checked={!!formData.codAvailable}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-gray-700">COD Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="expressDelivery"
                  checked={!!formData.expressDelivery}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-gray-700">Express Delivery</span>
              </label>
            </div>
          </div>
        </DefaultModal>
      </div>
    </>
  );
};

export default ManageZipCode;
