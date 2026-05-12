import React, { useEffect, useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';

const AddEditSimilarProducts = ({ isOpen, onClose, onSubmit, productOptions = [] }) => {
  const [formData, setFormData] = useState({
    productId: '',
    relatedProductIds: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({ productId: '', relatedProductIds: [] });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMultiChange = (e) => {
    const values = Array.from(e.target.selectedOptions || []).map((option) => option.value);
    setFormData((prev) => ({
      ...prev,
      relatedProductIds: values,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productId) return;
    onSubmit?.(formData);
    onClose?.();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Similar Products Bought Together</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="">Select product</option>
              {productOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Related products</label>
            <select
              multiple
              className="w-full border border-gray-300 rounded p-2 min-h-[140px]"
              value={formData.relatedProductIds}
              onChange={handleMultiChange}
            >
              {productOptions
                .filter((item) => item.value !== formData.productId)
                .map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
            </select>
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

export default AddEditSimilarProducts;
