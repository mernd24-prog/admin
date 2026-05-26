import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import useDropdownOptions from '../../../../hooks/useDropdownOptions';

const AddEditCoupons = ({ isOpen, onClose }) => {
  const discountTypes = useDropdownOptions('discount-types');
  const today = new Date().toISOString().split('T')[0];
  const maxDate = '2099-12-31';

  const [formData, setFormData] = useState({
    couponType: '',
    couponTitle: '',
    couponCode: '',
    couponDescription: '',
    dateFrom: '',
    dateTo: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    maxDiscountValue: '',
    usesPerCoupon: '1',
    usesPerCustomer: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const preparedData = {
      ...formData,
      dateFrom: formData.dateFrom || today,
      dateTo: formData.dateTo || maxDate,
    };

    console.log('Coupon Data:', preparedData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-3xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Coupon Setup</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Coupon Title"
              name="couponTitle"
              value={formData.couponTitle}
              onChange={handleChange}
              placeholder="Enter coupon title"
            />

            <FormInput
              label="Coupon Code"
              name="couponCode"
              value={formData.couponCode}
              onChange={handleChange}
              placeholder="Enter unique coupon code"
            />
          </div>

          <FormInput
            label="Coupon Description"
            name="couponDescription"
            type="textarea"
            value={formData.couponDescription}
            onChange={handleChange}
            placeholder="Optional description"
            rows={3}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Date From"
              name="dateFrom"
              type="date"
              value={formData.dateFrom}
              onChange={handleChange}
            />

            <FormInput
              label="Date To"
              name="dateTo"
              type="date"
              value={formData.dateTo}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Discount In"
              name="discountType"
              type="select"
              value={formData.discountType}
              onChange={handleChange}
              options={discountTypes.options}
            />

            <FormInput
              label="Discount Value"
              name="discountValue"
              value={formData.discountValue}
              onChange={handleChange}
              placeholder="e.g. 10"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Minimum Order Value"
              name="minOrderValue"
              value={formData.minOrderValue}
              onChange={handleChange}
              placeholder="e.g. 500"
            />

            <FormInput
              label="Maximum Discount Value"
              name="maxDiscountValue"
              value={formData.maxDiscountValue}
              onChange={handleChange}
              placeholder="e.g. 1000"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Uses Per Coupon"
              name="usesPerCoupon"
              value={formData.usesPerCoupon}
              onChange={handleChange}
              placeholder="e.g. 1"
            />

            <FormInput
              label="Uses Per Customer"
              name="usesPerCustomer"
              value={formData.usesPerCustomer}
              onChange={handleChange}
              placeholder="e.g. 1"
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <ButtonTransparent type="button" onClick={onClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">Submit</NewButton>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AddEditCoupons;
