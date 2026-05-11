import React, { useState, useEffect, useCallback } from 'react';
import { FiMinusCircle } from "react-icons/fi";
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';
import Button from '../../../../components/Atoms/buttons/button';

export default function VariantsOptionsTab({
    options,
    setVariantRows,
    setFormData,
    selectJson
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [variantRows, setLocalVariantRows] = useState([]);

    useEffect(() => {
        if (options && Array.isArray(options) && options.length > 0) {
            setLocalVariantRows(options);
            setVariantRows(options);
        } else {
            const initialRow = {
                id: Date.now(),
                sku: '',
                type: null,
                remark: '',
                packaging: '',
                mrp: '',
                discount: '',
                salePrice: '',
                stock: ''
            };
            setLocalVariantRows([initialRow]);
            setVariantRows([initialRow]);
        }
    }, [options, setVariantRows]);

    useEffect(() => {
        if (variantRows.length > 0) {
            setFormData(prev => ({
                ...prev,
                options: variantRows
            }));
        }
    }, [variantRows, setFormData]);


    const updateVariants = useCallback((updatedRows) => {
        setLocalVariantRows(updatedRows);
        setVariantRows(updatedRows);
        setFormData(prev => ({
            ...prev,
            options: updatedRows
        }));
    }, [setVariantRows, setFormData]);

    const handleAddRow = useCallback(async () => {
        setIsLoading(true);
        try {
            const newRow = {
                id: Date.now(),
                sku: '',
                type: null,
                remark: '',
                packaging: '',
                mrp: '',
                discount: '',
                salePrice: '',
                stock: ''
            };

            const updatedRows = [...variantRows, newRow];
            updateVariants(updatedRows);

            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[variantRows.length];
                return newErrors;
            });

        } catch (error) {
            console.error('Error adding variant row:', error);
        } finally {
            setIsLoading(false);
        }
    }, [variantRows, updateVariants]);

    const handleOptionSelect = useCallback((index, selectedOption) => {
        setIsLoading(true);
        try {
            const updatedRows = [...variantRows];
            updatedRows[index] = {
                ...updatedRows[index],
                type: selectedOption?.value || null
            };

            updateVariants(updatedRows);

            setErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[index]) {
                    delete newErrors[index].type;
                    if (Object.keys(newErrors[index]).length === 0) {
                        delete newErrors[index];
                    }
                }
                return newErrors;
            });

        } catch (error) {
            console.error('Error selecting option:', error);
        } finally {
            setIsLoading(false);
        }
    }, [variantRows, updateVariants]);

    const calculateSalePrice = (mrp, discount) => {
        const mrpValue = parseFloat(mrp) || 0;
        const discountValue = parseFloat(discount) || 0;

        if (mrpValue <= 0) return '';
        if (discountValue <= 0) return mrpValue.toFixed(2);

        const discountAmount = (mrpValue * discountValue) / 100;
        const salePrice = mrpValue - discountAmount;
        return salePrice.toFixed(2);
    };

    const handleVariantFieldChange = useCallback((index, fieldName, value) => {
        const updatedRows = [...variantRows];

        updatedRows[index] = {
            ...updatedRows[index],
            [fieldName]: value
        };

        if (fieldName === 'mrp' || fieldName === 'discount') {
            const mrp = fieldName === 'mrp' ? value : updatedRows[index].mrp;
            const discount = fieldName === 'discount' ? value : updatedRows[index].discount;

            updatedRows[index].salePrice = calculateSalePrice(mrp, discount);
        }

        updateVariants(updatedRows);

        setErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors[index]?.[fieldName]) {
                delete newErrors[index][fieldName];
                if (Object.keys(newErrors[index]).length === 0) {
                    delete newErrors[index];
                }
            }
            return newErrors;
        });
    }, [variantRows, updateVariants]);

    const handleRemoveRow = useCallback((index) => {
        if (variantRows.length <= 1) return;

        const updatedRows = [...variantRows];
        updatedRows.splice(index, 1);
        updateVariants(updatedRows);
        setErrors(prev => {
            const newErrors = {};
            Object.keys(prev).forEach(key => {
                const keyIndex = parseInt(key);
                if (keyIndex < index) {
                    newErrors[keyIndex] = prev[keyIndex];
                } else if (keyIndex > index) {
                    newErrors[keyIndex - 1] = prev[keyIndex];
                }
                // Skip the removed index
            });
            return newErrors;
        });
    }, [variantRows, updateVariants]);

    const getSelectedOption = (row) => {
        if (!row.type) return null;
        return selectJson?.HEADS_TYPE?.find(option => option.value === row.type) || null;
    };

    return (
        <div className="w-full bg-white">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Variants & Options</h3>
                    <p className="text-sm text-gray-500">Customize the product options, including size, color, etc.</p>
                </div>
                {isExpanded ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
            </div>

            {isExpanded && (
                <div className="pb-6 space-y-6 bg-white border-t border-gray-100">
                    <div className="space-y-4 mt-2">
                        {variantRows.map((row, index) => (
                            <div key={row.id || index} className="relative">
                                <div className="flex items-start justify-between p-2 border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                                        <div>
                                            <Input
                                                labelName="SKU"
                                                value={row.sku || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'sku', e.target.value)}
                                                placeholder="Enter variant SKU"
                                                isLoading={isLoading}
                                                name={`sku_${index}`}
                                            />
                                        </div>
                                        <div>
                                            <FilterSelect
                                                label="Options"
                                                options={selectJson?.HEADS_TYPE || []}
                                                value={getSelectedOption(row)}
                                                onChange={(val) => handleOptionSelect(index, val)}
                                                placeholder="Select option"
                                                isLoading={isLoading}
                                            />
                                            {errors[index]?.type && (
                                                <p className="mt-1 text-sm text-red-600">{errors[index].type}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Input
                                                labelName="Remark"
                                                value={row.remark || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'remark', e.target.value)}
                                                placeholder="Enter remark"
                                                isLoading={isLoading}
                                                name={`remark_${index}`}
                                            />
                                            {errors[index]?.remark && (
                                                <p className="mt-1 text-sm text-red-600">{errors[index].remark}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Input
                                                labelName="Packaging"
                                                value={row.packaging || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'packaging', e.target.value)}
                                                placeholder="Enter packaging"
                                                isLoading={isLoading}
                                                name={`packaging_${index}`}
                                            />
                                            {errors[index]?.packaging && (
                                                <p className="mt-1 text-sm text-red-600">{errors[index].packaging}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Input
                                                labelName="MRP *"
                                                value={row.mrp || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'mrp', e.target.value)}
                                                placeholder="Enter MRP"
                                                isLoading={isLoading}
                                                name={`mrp_${index}`}
                                                type="number"
                                            />
                                            {errors[index]?.mrp && (
                                                <p className="mt-1 text-sm text-red-600">{errors[index].mrp}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Input
                                                labelName="Discount (%)"
                                                value={row.discount || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'discount', e.target.value)}
                                                placeholder="Enter discount percentage"
                                                isLoading={isLoading}
                                                name={`discount_${index}`}
                                                type="number"
                                            />
                                            {errors[index]?.discount && (
                                                <p className="mt-1 text-sm text-red-600">{errors[index].discount}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Input
                                                labelName="Sale Price *"
                                                value={row.salePrice || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'salePrice', e.target.value)}
                                                placeholder="Enter sale price"
                                                isLoading={isLoading}
                                                name={`salePrice_${index}`}
                                                type="number"
                                                disable
                                            />
                                            {errors[index]?.salePrice && (
                                                <p className="mt-1 text-sm text-red-600">{errors[index].salePrice}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Input
                                                labelName="Stock"
                                                value={row.stock || ''}
                                                onChange={(e) => handleVariantFieldChange(index, 'stock', e.target.value)}
                                                placeholder="Enter variant stock"
                                                isLoading={isLoading}
                                                name={`stock_${index}`}
                                                type="number"
                                            />
                                        </div>
                                    </div>

                                    {variantRows.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(index)}
                                            className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                            aria-label="Remove variant row"
                                        >
                                            <FiMinusCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button onClick={handleAddRow} disabled={isLoading} type="button" className={`bg-white text-black`}>
                        {isLoading ? (
                            <>
                                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Adding...
                            </>
                        ) : (
                            'Add Variant'
                        )}
                    </Button>

                    {Object.keys(errors).length > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                                {Object.entries(errors).map(([key, error]) => {
                                    if (typeof error === 'object') {
                                        return Object.entries(error).map(([field, message]) => (
                                            <li key={`${key}-${field}`}>• Row {parseInt(key) + 1}: {message}</li>
                                        ));
                                    }
                                    return <li key={key}>• {error}</li>
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
