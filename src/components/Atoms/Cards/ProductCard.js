/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback } from 'react';
import { FiPackage } from 'react-icons/fi';
import { LuEye } from 'react-icons/lu';
import DefaultModal from '../Modal/DefaultRightSideModal';
import { useDispatch } from 'react-redux';
import { getProductStocks } from '../../../Redux/productSlice';
import { toast } from 'sonner';
import { TitleValue } from '../TitleValue/TitleValue';

const ProductTableRow = ({ product, onAdd }) => {
  const dispatch = useDispatch();
  const [addingId, setAddingId] = useState(null);
  const [stockData, setStockData] = useState([]);
  const [isViewingStock, setIsViewingStock] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

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

  const handleViewStock = useCallback(async (productData, optionData) => {
    if (!productData?._id || !optionData?.type || isLoadingStock) return;
    setIsLoadingStock(true);

    try {
      const response = await dispatch(
        getProductStocks({
          product_id: productData._id,
          type: optionData.type,
          store_id: product?.store_id?._id
        })
      ).unwrap();

      setStockData(response?.data?.head || []);
      setIsViewingStock(true);
    } catch (error) {
      toast.error(error?.message || 'Error fetching stock data');
    } finally {
      setIsLoadingStock(false);
    }
  }, [dispatch, isLoadingStock]);

  const closeStockModal = useCallback(() => {
    setIsViewingStock(false);
    setStockData([]);
  }, []);

  const renderStockModal = () => (
    <DefaultModal isOpen={isViewingStock} onClose={closeStockModal} isButtonView={false}>
      <div className="p-4 space-y-4">
        {stockData.length > 0 ? (
          stockData.map((stock, index) => (
            <div key={index} className="space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className='text-center font-semibold text-sm'>Batch Details</h3>
              <TitleValue title="Type" value={stock?.type} className="text-sm" />
              <TitleValue title="Received Qty" value={stock?.received_qty} className="text-sm" />
              <TitleValue title="Net Qty" value={stock?.net_qty} className="text-sm" />
              <TitleValue title="Price" value={`₹${stock?.price?.toLocaleString('en-IN')}`} className="text-sm" />
              <TitleValue title="Sell Qty" value={stock?.sell_qty} className="text-sm" />
              <TitleValue title="Batch No" value={stock?.batch_no} className="text-sm" />
              <TitleValue title="Expiry Date" value={stock?.expriy} className="text-sm" />
              <TitleValue title="Manufacture Date" value={stock?.manufacture} className="text-sm" />
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FiPackage className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No stock data available</p>
          </div>
        )}
      </div>
    </DefaultModal>
  );

  const renderStockInfo = (option) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-700">{option.stocks ?? 0} in stock</span>
      <button
        onClick={() => handleViewStock(product, option)}
        disabled={isLoadingStock}
        className="p-1 hover:bg-gray-100 rounded-full transition text-gray-600 hover:text-black"
        title="View stock details"
      >
        {isLoadingStock ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <LuEye className="w-4 h-4" />
        )}
      </button>
    </div>
  );

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
            <td className="px-2 py-3 sm:px-4">{renderStockInfo(option)}</td>
            <td className="px-2 py-3 sm:px-4">{renderAddButton(option)}</td>
          </tr>
        ))}
        {renderStockModal()}
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
        {renderStockModal()}
      </>
    );
  }
};

export default ProductTableRow;
