/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import Loader from '../../../components/Loader/Loader'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import { Link } from 'react-router-dom'
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup'
import selectJson from '../../../_helpers/SelectJson.json'
import FormInput from '../../../components/Atoms/FormInput/FormInput'
import { createDiscountCoupons, editDiscountCoupons, enableDisableDiscountCoupons, getDiscountCoupons, softDeleteDiscountCoupons } from '../../../Redux/promotionsSlice'
import AddButton from '../../../components/Button/AddButton'
import moment from 'moment/moment'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'


const size = 10

const normalizeCouponType = (type) => type === 'flat' ? 'fixed' : type;

const formatCouponType = (type) => {
  const normalizedType = normalizeCouponType(type);
  if (normalizedType === 'percentage') return 'Percentage';
  if (normalizedType === 'fixed') return 'Fixed';
  return '-';
};

const normalizeCouponPayload = (data) => ({
  ...data,
  type: normalizeCouponType(data?.type)
});

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const toNumber = (value, fallback = null) => {
  if (value === '' || value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const normalizeCouponRecord = (coupon = {}) => ({
  ...coupon,
  _id: coupon?._id || coupon?.id,
  type: normalizeCouponType(coupon?.type),
  min_order_value: firstDefined(coupon?.min_order_value, coupon?.minOrderAmount, 0),
  max_discount_value: firstDefined(coupon?.max_discount_value, coupon?.maxDiscountAmount, ''),
  uses_per_coupon: firstDefined(coupon?.uses_per_coupon, coupon?.usageLimit, ''),
  uses_per_customer: firstDefined(coupon?.uses_per_customer, coupon?.usesPerCustomer, ''),
  valid_from: firstDefined(coupon?.valid_from, coupon?.startsAt),
  valid_to: firstDefined(coupon?.valid_to, coupon?.expiresAt),
  isDisable: typeof coupon?.isDisable === 'boolean'
    ? coupon.isDisable
    : coupon?.active === false
});

const normalizeCouponsResponse = (payload) => {
  const data = payload?.data ?? payload;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.list)
      ? data.list
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.coupons)
          ? data.coupons
          : Array.isArray(data?.data)
            ? data.data
            : [];

  return {
    ...data,
    list: list.map(normalizeCouponRecord),
    total: data?.total ?? payload?.meta?.total ?? list.length,
  };
};

const toCouponApiPayload = (data) => ({
  code: String(data?.code || '').trim().toUpperCase(),
  title: data?.title || '',
  description: data?.description || '',
  type: normalizeCouponType(data?.type),
  value: toNumber(data?.value, 0),
  minOrderAmount: toNumber(data?.min_order_value, 0),
  maxDiscountAmount: toNumber(data?.max_discount_value, null),
  usageLimit: toNumber(data?.uses_per_coupon, null),
  usesPerCustomer: toNumber(data?.uses_per_customer, null),
  startsAt: data?.valid_from || null,
  expiresAt: data?.valid_to || null,
  active: !data?.isDisable,
});

const DiscountCoupons = () => {
  const dispatch = useDispatch();
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "", country: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [isConfirmModal, setIsConfirmModal] = useState(false);
  const [rowData, setRowData] = useState(null);
  // const [isDeleteModal,setisDeletModal]

  const initialFormState = {
    title: '',
    code: '',
    description: "",
    valid_from: "",
    valid_to: "",
    type: "",
    value: "",
    min_order_value: "",
    max_discount_value: "",
    uses_per_coupon: "",
    uses_per_customer: "",
    _id: null,
    isDisable: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const fetchDiscounts = (overrides = {}) => {
    const nextFilters = overrides.filters || filters;
    const query = {
      page: overrides.page || pageNo,
      size: size,
      keyWord: overrides.search ?? nextFilters?.search ?? "",
      searchFields: "title,code,description",
      populate: '',
      query: JSON.stringify(nextFilters?.country?.value ? { country_code: nextFilters?.country?.value } : {})
    };
    setIsLoading(true);
    setListError("");
    dispatch(getDiscountCoupons(query))
      .unwrap()
      .then((payload) => {
        setApiRes(normalizeCouponsResponse(payload));
      })
      .catch((err) => {
        const message = err?.message || err || "Failed to fetch discount coupons";
        setListError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDiscounts();
  }, [pageNo]);

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const getAllRowIds = useCallback(() => {
    return apiRes?.list?.map(row => row?._id) || [];
  }, [apiRes?.list]);

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? getAllRowIds() : []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      type: normalizeCouponType(selectedOption?.value) || null
    }));
    if (errors.type) {
      setErrors(prev => ({ ...prev, type: undefined }));
    }
  };

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim() === '') {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (!formData.code || formData.code.trim() === '') {
      newErrors.code = 'Code is required';
    } else if (formData.code.trim().length < 5) {
      newErrors.code = 'Code must be at least 5 characters long';
    }
    const normalizedType = normalizeCouponType(formData.type);

    if (
      normalizedType === 'percentage' &&
      parseFloat(formData.value) > 100
    ) {
      newErrors.value = 'Max discount cannot exceed 100%';
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    if (!formData.valid_from) {
      newErrors.valid_from = 'Start Date is required';
    }

    if (!formData.valid_to) {
      newErrors.valid_to = 'End Date is required';
    } else if (formData.valid_from && new Date(formData.valid_to) < new Date(formData.valid_from)) {
      newErrors.valid_to = 'End Date must be after Start Date';
    }

    if (!normalizedType) {
      newErrors.type = 'Discount type is required';
    } else if (!['percentage', 'fixed'].includes(normalizedType)) {
      newErrors.type = 'Discount type must be percentage or fixed';
    }

    if (formData.value === '' || formData.value === null) {
      newErrors.value = 'Discount value is required';
    } else if (Number(formData.value) <= 0) {
      newErrors.value = 'Discount value must be greater than 0';
    }

    if (formData.min_order_value === '' || formData.min_order_value === null) {
      newErrors.min_order_value = 'Minimum order value is required';
    } else if (Number(formData.min_order_value) < 0) {
      newErrors.min_order_value = 'Minimum order value cannot be negative';
    }

    if (formData.max_discount_value === '' || formData.max_discount_value === null) {
      newErrors.max_discount_value = 'Maximum discount value is required';
    } else if (Number(formData.max_discount_value) <= 0) {
      newErrors.max_discount_value = 'Maximum discount value must be greater than 0';
    }

    if (formData.uses_per_coupon === '' || formData.uses_per_coupon === null) {
      newErrors.uses_per_coupon = 'Uses per coupon is required';
    } else if (Number(formData.uses_per_coupon) <= 0) {
      newErrors.uses_per_coupon = 'Uses per coupon must be greater than 0';
    }

    if (formData.uses_per_customer === '' || formData.uses_per_customer === null) {
      newErrors.uses_per_customer = 'Uses per customer is required';
    } else if (Number(formData.uses_per_customer) <= 0) {
      newErrors.uses_per_customer = 'Uses per customer must be greater than 0';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const apiData = toCouponApiPayload(normalizeCouponPayload(formData));

    try {
      if (isEditMode) {
        setIsLoading(true)
        await dispatch(editDiscountCoupons({ ...apiData, couponId: formData._id })).unwrap();
        setIsLoading(false)
        toast.success('Discount coupon updated successfully');
      } else {
        setIsLoading(true)
        const created = await dispatch(createDiscountCoupons(apiData)).unwrap();
        const createdCoupon = normalizeCouponRecord(created?.data || created?.raw?.data || created);
        if (createdCoupon?._id) {
          setApiRes((prev) => ({
            ...prev,
            list: [createdCoupon, ...(prev?.list || []).filter((coupon) => coupon?._id !== createdCoupon._id)],
            total: Number(prev?.total || 0) + 1,
          }));
        }
        setIsLoading(false)
        toast.success('Discount coupon created successfully');
      }
      closeModal();
      fetchDiscounts();
    } catch (error) {
      toast.error(error?.message || 'Failed to save discount coupon');
      setIsLoading(false)

    } finally {
      setIsLoading(false)
    }
  };

  const handleToggle = async (coupon) => {
    setRowData(coupon);
    setIsConfirmModal(true);
  };

  const applyFilters = () => {
    if (pageNo !== 1) {
      setPageNo(1);
      return;
    }
    fetchDiscounts({ page: 1, search: filters?.search });
  }
  const handleDelete = async (data) => {

    const apiPayload = {
      couponId: data?._id,
    };
    try {
      setIsLoading(true)
      const result = await dispatch(softDeleteDiscountCoupons(apiPayload)).unwrap();
      if (result) {
        toast.success(result?.data?.message || 'delete successfully')
        fetchDiscounts()
        setIsLoading(false)
      }
    } catch (error) {
      toast.error(error || 'failed to delete')
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  };

  const getDiscountStatus = (validFrom, validTo) => {
    const now = moment();


    if (now.isAfter(moment(validTo), 'day')) {
      return 'Expired';
    } else if (now.isBefore(moment(validFrom), 'day')) {
      return 'Upcoming';
    } else {
      return 'Active';
    }
  };

  const tableHeadings = ["Title", "Code", "Type", "Discount", "Available From", "Available to", "validity", "Status", "Action"];

  const tableRows = apiRes?.list?.map((ele) => [
    <CustomCheckbox checked={selectedRow.includes(ele._id)} onChange={(e) => handleRowCheckboxChange(e, ele._id)} />,
    <span key={`title-${ele._id}`} className='capitalize'>{ele?.title}</span>,
    <span key={`code-${ele._id}`}>{ele?.code}</span>,
    <span key={`type-${ele._id}`}>{formatCouponType(ele?.type)}</span>,
    <span key={`discount-${ele._id}`}>{normalizeCouponType(ele?.type) === "fixed" ? '₹' : ''}{ele?.value}{normalizeCouponType(ele?.type) === "percentage" ? '%' : ""}</span>,
    <span key={`valid-from-${ele._id}`}>{moment(ele?.valid_from).format('DD/MM/YYYY')}</span>,
    <span key={`valid-to-${ele._id}`}>{moment(ele?.valid_to).format('DD/MM/YYYY')}</span>,
    getDiscountStatus(ele?.valid_from, ele?.valid_to),
    <div key={`toggle-${ele._id}`} className='flex flex-col'>
      <ToggleButton isToggle={!ele?.isDisable} handleClick={() => handleToggle(ele)} />
    </div>,
    <ActionButtons
      key={`action-${ele._id}`}
      onEdit={() => {
        const coupon = normalizeCouponRecord(ele);
        setFormData({
          title: coupon?.title, isDisable: coupon?.isDisable, type: coupon?.type, description: coupon?.description,
          max_discount_value: coupon?.max_discount_value, min_order_value: coupon?.min_order_value, code: coupon?.code,
          uses_per_coupon: coupon?.uses_per_coupon, uses_per_customer: coupon?.uses_per_customer, value: coupon?.value,
          valid_from: toDateInputValue(coupon?.valid_from),
          valid_to: toDateInputValue(coupon?.valid_to), _id: coupon?._id
        });
        setIsEditMode(true);
        setIsAddModal(true);
      }}
      showLinkButton={false}
      showDeleteButton={true}
      onDelete={() => handleDelete(ele)}
    />
  ]);

  const handleBulkAction = async (action) => {
    if (selectedRow.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    if (action === "Active" || action === "Inactive") {
      const active = action === "Active";
      try {
        await Promise.all(selectedRow.map((couponId) =>
          dispatch(enableDisableDiscountCoupons({ couponId, active })).unwrap()
        ));
        toast.success("Status Update Successfully!");
        fetchDiscounts();
        setSelectedRow([]);
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
        if (error.errors) {
          setErrors(error.errors);
        }
      }
    }
  };

  const handleSearchRemove = () => {
    const clearedFilters = { search: "", country: "" };
    setFilters(clearedFilters);
    if (pageNo !== 1) {
      setPageNo(1);
      return;
    }
    fetchDiscounts({ page: 1, filters: clearedFilters, search: "" });
  };

  const handleConfirmToggle = async () => {
    let apiPayload = {
      couponId: rowData?._id,
      active: rowData?.isDisable
    };
    try {
      const res = await dispatch(enableDisableDiscountCoupons(apiPayload)).unwrap();
      toast.success(res?.message || 'Status update successfully');
      fetchDiscounts();
      setIsConfirmModal(false);
      setRowData(null);
    } catch (error) {
      toast.error(error?.message || error || "Failed...!");

    }
  };


  return (
    <>
      <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
        <Loader loading={isLoading} />
        <div className='flex justify-between items-center'>
          <h3><Link to="/app/home" className='cursor-pointer'>Home</Link> / <b>Discount Coupons</b></h3>
          <AddButton onClick={() => setIsAddModal(true)} />
        </div>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <SearchComponent
            isSearchShow={true}
            isActionButton={true}
            filters={filters}
            setFilters={setFilters}
            isStatusAction={true}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            placeholder={`Search by title`}
            handleAction={handleBulkAction}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}

          />

          {listError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {listError}
            </div>
          )}

          <TableData
            Heading='Manage Discount Coupons'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            totalData={apiRes?.total}
            totalSize={size}
            currentPage={pageNo}
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
          title={isEditMode ? 'Edit Discount Coupon' : 'Add Discount Coupon'}
          isOpen={isAddModal}
          onClose={closeModal}
          onSubmit={handleSubmit}
        >
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 p-2'>
            <div>
              <Input
                labelName='Title'
                type='text'
                value={formData.title}
                name='title'
                onChange={handleInputChange}
                error={errors.title}
                required
                maxLength={25}
              />
            </div>

            <div>
              <Input
                labelName='Code'
                type='text'
                value={formData.code}
                name='code'
                onChange={handleInputChange}
                error={errors.code}
                required
                maxLength={20}
              />
            </div>

            <div className='col-span-2'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Description <span className="text-red-500">*</span>
              </label>
              <FormInput
                type='textarea'
                value={formData.description}
                name='description'
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                maxLength={200}
                error={errors?.description}
              />
            </div>

            <div>
              <Input
                labelName='Start Date'
                type='date'
                value={formData.valid_from}
                name='valid_from'
                onChange={handleInputChange}
                error={errors.valid_from}
                required
              />
            </div>

            <div>
              <Input
                labelName='End Date'
                type='date'
                value={formData.valid_to}
                name='valid_to'
                onChange={handleInputChange}
                error={errors.valid_to}
                required
              />
            </div>

            <div>
              <FilterSelect
                options={selectJson?.discountType}
                value={selectJson?.discountType?.find((opt) => opt?.value === formData?.type)}
                placeholder={`Select Discount Type`}
                label={`Discount Type`}
                onChange={handleSelectChange}
                required
                error={errors?.type}
              />
            </div>

            <div>
              <Input
                labelName='Discount Value'
                type='number'
                value={formData.value}
                name='value'
                onChange={handleInputChange}
                error={errors.value}
                required
                min={0}
                step="0.01"
              />
            </div>

            <div>
              <Input
                labelName='Minimum Order Value'
                type='number'
                value={formData.min_order_value}
                name='min_order_value'
                onChange={handleInputChange}
                error={errors.min_order_value}
                min={0}
                required
                step="0.01"
              />
            </div>

            <div>
              <Input
                labelName='Maximum Discount Value'
                type='number'
                value={formData.max_discount_value}
                name='max_discount_value'
                onChange={handleInputChange}
                error={errors.max_discount_value}
                min={0} maxLength={formData?.type === 'percentage' ? 100 : 10000000}
                required
                step="0.01"
              />
            </div>

            <div>
              <Input
                labelName='Uses Per Coupon'
                type='number'
                value={formData.uses_per_coupon}
                name='uses_per_coupon'
                onChange={handleInputChange}
                error={errors.uses_per_coupon}
                min={1}
                required
              />
            </div>

            <div>
              <Input
                labelName='Uses Per Customer'
                type='number'
                value={formData.uses_per_customer}
                name='uses_per_customer'
                onChange={handleInputChange}
                error={errors.uses_per_customer}
                min={1}
                required
              />
            </div>

            <div className="flex items-center justify-between col-span-2 border p-2 rounded-md">
              <p className="text-sm font-medium text-gray-700">Status</p>
              <ToggleButton
                isToggle={!formData.isDisable}
                handleClick={() => {
                  setFormData({ ...formData, isDisable: !formData.isDisable });
                }}
              />
            </div>
          </div>
        </DefaultModal>

        <StatusPopup
          isOpen={isConfirmModal}
          onClose={() => {
            setIsConfirmModal(false);
            setRowData(null);
          }}
          onConfirm={handleConfirmToggle}
          heading={`Confirm this action?`}
        />
      </div>
    </>
  );
};

export default DiscountCoupons;
