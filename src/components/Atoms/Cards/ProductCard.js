/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';

const ProductTableRow = ({ product, onAdd }) => {
  const [addingId, setAddingId] = useState(null);

  const options = product?.option_id?.options || [];
  const hasOptions = options.length > 0;

  const handleAddWithOption = useCallback((option) => {
    if (!option || addingId === option?._id) return;
    setAddingId(option._id);
    const productWithOption = {
      ...product,
      selectedOption: option,
      basePrice: option.mrp,
      salePrice: option.salePrice,
      selectedType: option.type,
      selectedRemark: option.remark,
      discount: option.discount,
      head_id: product?.option_id?._id,
      packaging: option?.packaging
    };

    setTimeout(() => {
      onAdd(productWithOption, option);
      setAddingId(null);
    }, 500);
  }, [product, onAdd, addingId]);

  const renderAddButton = (option) => {
    const isLoading = addingId === option._id;
    return (
      <button
        onClick={() => handleAddWithOption(option)}
        className={`flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-black text-xs transition ${
          isLoading ? 'opacity-60' : ''
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>Add</>
        )}
      </button>
    );
  };

  const renderPriceInfo = (option) => (
    <div className="flex flex-col text-xs">
      <span className="font-semibold text-gray-900">₹{option.salePrice?.toLocaleString('en-IN')}</span>
      <span className="line-through text-gray-400">₹{option.mrp?.toLocaleString('en-IN')}</span>
    </div>
  );

  if (hasOptions) {
    return (
      <>
        {options.map((option, index) => (
          <tr key={`${product._id}-${option._id || index}`} className="border-b hover:bg-gray-50 transition-all text-xs sm:text-sm">
            <td className="px-2 py-3 sm:px-4">
              <div className="flex flex-col">
                <span className="font-medium text-gray-800 capitalize">{product.name || 'Unnamed Product'}</span>
                <span className="text-gray-500 text-xs">{product.store_id?.name}</span>
                {product.category_id?.name && (
                  <span className="text-gray-400">{product.category_id.name}</span>
                )}
              </div>
            </td>

            <td className="px-2 py-3 sm:px-4">
              <div className="space-y-1">
                <div className=" ">
                  <p className=" text-gray-700 rounded">{option.type}</p>
                  {option.packaging && (
                    <span className="bg-blue-50">{option.packaging}</span>
                  )}
                </div>

              </div>
            </td>

            <td className="px-2 py-3 sm:px-4">{renderPriceInfo(option)}</td>
            <td className="px-2 py-3 sm:px-4 text-gray-700 text-xs">{option.stocks ?? 0} in stock</td>
            <td className="px-2 py-3 sm:px-4">{renderAddButton(option)}</td>
          </tr>
        ))}
      </>
    );
  } else {
    return (
      <>
        <tr className="border-b hover:bg-gray-50 transition-all text-xs sm:text-sm">
          <td className="px-2 py-3 sm:px-4">
            <div className="flex flex-col">
              <span className="font-medium text-gray-800 capitalize">{product.name || 'Unnamed Product'}</span>
              {product.category_id?.name && (
                <span className="text-gray-400 mt-0.5">Category: {product.category_id.name}</span>
              )}
              {product.description && (
                <span className="text-gray-500 mt-1 line-clamp-2">{product.description}</span>
              )}
            </div>
          </td>
          <td className="px-2 py-3 sm:px-4 text-gray-400 italic">No variants available</td>
          <td className="px-2 py-3 sm:px-4">
            {product.mrp ? (
              <span className="font-semibold text-gray-900">₹{product.mrp.toLocaleString('en-IN')}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>
          <td className="px-2 py-3 sm:px-4 text-gray-500">N/A</td>
        </tr>
      </>
    );
  }
};

export default ProductTableRow;
