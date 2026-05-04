import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import {
  getHeadList,
  purchaseOrderDetails,
  receivedOrder,
  updateReceivedOrderById,
  getOrderReceivedList
} from '../../../Redux/erpSlice'
import { getBatchList } from '../../../Redux/productSlice'
import ShowBatchData from './ShowBatchData'
import ShowTypeData from './ShowTypeData'
import { useNavigate } from 'react-router'
import GoodsReceivedData from './GoodsReceivedData'

const PurchaseOrderEditableForm = ({ id, selectedId }) => {
  // Main state
  const [formData, setFormData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editableData, setEditableData] = useState([])
  const [receivedOrderData, setReceivedOrderData] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)

  // const [oldReceivedQtys] = useState([]);
  const [validationErrors, setValidationErrors] = useState({})
  //  const [oldRecviedQty, setOldReceivedQty] = useState()
  // Modal and dropdown state
  const [headDataList, setHeadDataList] = useState([])
  const [currentItemId, setCurrentItemId] = useState(null)
  const [batchOptions, setBatchOptions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showModal2, setShowModal2] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Utility function to format dates
  // const formatDate = (dateStr) => {
  //   if (!dateStr) return ''
  //   const date = new Date(dateStr)
  //   return isNaN(date) ? '' : date.toISOString().split('T')[0]
  // }

  // Enhanced validation function
  const validateFormData = () => {
    const errors = {}
    let hasErrors = false

    editableData.forEach((item, index) => {
      // Skip validation for completed items
      const poQty = Number(item.po_qty) || Number(item.quantity) || 0
      const receivedQty = Number(item.received_qty) || 0
      const isCompleted = receivedQty === poQty && poQty > 0

      if (isCompleted) {
        return; // Skip validation for completed items
      }

      const itemErrors = {}

      // Check if Type is selected
      if (!item.selectedHead) {
        itemErrors.type = 'Type must be selected'
        hasErrors = true
      }

      // Check if Batch is selected
      if (!item.selectedBatch) {
        itemErrors.batch = 'Batch must be selected'
        hasErrors = true
      }

      // Validate quantities
      const returnQty = Number(item.return_qty) || 0
      const pendingQty = Number(item.pending_qty) || 0

      // Check if received quantity exceeds PO quantity
      if (receivedQty > poQty) {
        itemErrors.receivedQty = `Received qty (${receivedQty}) cannot exceed PO qty (${poQty})`
        hasErrors = true
      }

      // Check if return quantity exceeds PO quantity
      if (returnQty > poQty) {
        itemErrors.returnQty = `Return qty (${returnQty}) cannot exceed PO qty (${poQty})`
        hasErrors = true
      }

      // Check if received + return exceeds PO quantity
      if ((receivedQty + returnQty) > poQty) {
        itemErrors.quantity = `Total of Received qty (${receivedQty}) + Return qty (${returnQty}) = ${receivedQty + returnQty} cannot exceed PO qty (${poQty})`
        hasErrors = true
      }

      // Check if at least one quantity is entered when there's a PO quantity
      if (poQty > 0 && receivedQty === null && returnQty === null) {
        itemErrors.receivedQty = 'Please enter received quantity or return quantity'
        hasErrors = true
      }

      // Validate pending quantity calculation
      const calculatedPending = Math.max(0, poQty - receivedQty - returnQty)
      if (Math.abs(pendingQty - calculatedPending) > 0.01) {
        itemErrors.pendingQty = `Pending qty should be ${calculatedPending} (PO qty - Received qty - Return qty)`
        hasErrors = true
      }

      // Validate negative quantities
      if (receivedQty < 0) {
        itemErrors.receivedQty = 'Received quantity cannot be negative'
        hasErrors = true
      }

      if (returnQty < 0) {
        itemErrors.returnQty = 'Return quantity cannot be negative'
        hasErrors = true
      }

      if (Object.keys(itemErrors).length > 0) {
        errors[index] = itemErrors
      }
    })

    setValidationErrors(errors)
    return !hasErrors
  }

  // Show validation errors as toast
  const showValidationErrors = () => {
    Object.keys(validationErrors).forEach(index => {
      const itemErrors = validationErrors[index]
      const productName = editableData[index]?.product_name || `Item ${parseInt(index) + 1}`

      Object.keys(itemErrors).forEach(field => {
        toast.error(`${productName}: ${itemErrors[field]}`)
      })
    })
  }

  // Enhanced input change handler with automatic calculations
  const handleInputChange = (index, field, value) => {

    const updatedItems = [...editableData];
    const numValue = Number(value) || 0;

    // Update the specific field
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Auto-calculate pending quantity when received_qty or return_qty changes
    if (['received_qty', 'return_qty', 'pending_qty'].includes(field)) {
      const poQty = Number(updatedItems[index].quantity) || 0;
      const receivedQty = field === 'received_qty' ? numValue : Number(updatedItems[index].received_qty) || 0;
      const returnQty = field === 'return_qty' ? numValue : Number(updatedItems[index].return_qty) || 0;

      const calculatedPending = Math.max(0, poQty - receivedQty);
      updatedItems[index].pending_qty = calculatedPending;

      // Real-time validation
      const newErrors = { ...validationErrors };
      const itemErrors = {};

      if (receivedQty > poQty) {
        itemErrors.receivedQty = `Cannot exceed PO qty (${poQty})`;
      }

      if (returnQty > poQty) {
        itemErrors.returnQty = `Cannot exceed PO qty (${poQty})`;
      }

      if ((receivedQty + returnQty) > poQty) {
        itemErrors.quantity = `Total (${receivedQty + returnQty}) exceeds PO qty (${poQty})`;
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[index] = { ...newErrors[index], ...itemErrors };
      } else if (newErrors[index]) {
        delete newErrors[index].receivedQty;
        delete newErrors[index].returnQty;
        delete newErrors[index].quantity;
        if (Object.keys(newErrors[index]).length === 0) {
          delete newErrors[index];
        }
      }

      setValidationErrors(newErrors);
    }

    // Auto-calculate amount when po_rate or received_qty changes
    if (field === 'po_rate' || field === 'received_qty') {
      const rate = field === 'po_rate' ? numValue : Number(updatedItems[index].po_rate) || 0;
      const qty = field === 'received_qty' ? numValue : Number(updatedItems[index].received_qty) || 0;
      updatedItems[index].amount = (rate * qty).toFixed(2);
    }

    setEditableData(updatedItems);
  };

  // Batch selection handler
  const handleBatchSelect = (batch) => {
    setEditableData(prev =>
      prev?.map(item =>
        item._id === currentItemId ? { ...item, selectedBatch: batch } : item
      )
    )
    setShowModal(false)

    // Clear batch validation error
    const itemIndex = editableData.findIndex(item => item._id === currentItemId)
    if (validationErrors[itemIndex]?.batch) {
      const newErrors = { ...validationErrors }
      delete newErrors[itemIndex].batch
      if (Object.keys(newErrors[itemIndex]).length === 0) {
        delete newErrors[itemIndex]
      }
      setValidationErrors(newErrors)
    }
  }

  // Head selection handler
  const handleHeadSelect = (head) => {
    const numValue = Number(head?.salePrice) || 0;

    // Update editableData
    const updatedItems = editableData?.map((item) => {
      if (item._id === currentItemId) {
        return {
          ...item,
          selectedHead: head,
          po_rate: numValue,
        };
      }
      return item;
    });

    setEditableData(updatedItems);
    setShowModal2(false);

    // Clear type validation error if present
    const itemIndex = editableData.findIndex(item => item._id === currentItemId);
    if (validationErrors[itemIndex]?.type) {
      const newErrors = { ...validationErrors };
      delete newErrors[itemIndex].type;

      // Clean up if no other errors exist for that item
      if (Object.keys(newErrors[itemIndex]).length === 0) {
        delete newErrors[itemIndex];
      }

      setValidationErrors(newErrors);
    }
  };

  // Get head data for product
  const getHeadData = (productId) => {
    dispatch(getHeadList({ product_id: productId }))
      .then(res => {
        if (res) {
          setHeadDataList(res?.payload?.data?.data)
          setShowModal2(true)
        }
      })
      .catch(err => {
        console.error('Error fetching head data:', err)
        toast.error('Failed to load product types')
      })
  }

  // Navigation handler
  const handleNavigate = () => {
    navigate('/app/batch', { state: { openBatchModal: true } })
  }

  // Submit handler
  const handleSubmit = async () => {
    setValidationErrors({})

    if (!validateFormData()) {
      showValidationErrors()
      return
    }

    setLoading(true)
    try {
      const oldData1 = localStorage.getItem('receivedOrderId')
      const oldReceivedMap = {};
      if (oldData1) {
        const oldData = JSON.parse(oldData1); // full object with received_data array

        (oldData.received_data || []).forEach(entry => {
          oldReceivedMap[entry.product_id] = entry;
        });
      }
      const received_data = editableData?.map(item => {
        const oldItem = oldReceivedMap[item.product_id];
        const oldQty = oldItem?.received_qty || 0;

        const batch = item.selectedBatch || {}
        const head = item.selectedHead || {}
        const returnQty = Number(item.return_qty) || 0
        const returnNote = returnQty > 0 ? item.return_note || 'blank' : undefined
        let finalQun
        let mm = Number(item.received_qty)
        if (oldQty !== item.received_qty) {
          finalQun = Number(item.received_qty - oldQty) || 0
          mm = 0
        }

        return {
          product_id: item.product_id || item._id,
          po_qty: Number(item.quantity) || 0,
          received_qty: Number(item.received_qty) || 0,
          stock_qty: mm === 0 ? Number(finalQun) : Number(item.received_qty),
          return_qty: returnQty,
          pending_qty: Number(item.pending_qty) || 0,
          po_rate: Number(item.po_rate) || 0,
          remark: item.remark || head.remark || '',
          ...(returnNote ? { return_note: returnNote } : {}),
          type: head?.type || '',
          packaging: head?.packaging || '',
          head_id: head?._id || '',
          batch_id: batch?.id || batch?._id || '',
          batch_no: batch?.batchCode || '',
          expriy: batch?.expiryDate || '',

          manufacture: batch?.manufactureDate || ''

        }
      })

      const payload = {
        purchase_order_id: id,
        received_data
      }

      let res
      if (isEditMode) {
        res = await dispatch(updateReceivedOrderById(payload)).unwrap()
        if (res) {
          localStorage.clear('receivedOrderId')
        }
      } else {
        res = await dispatch(receivedOrder({
          is_po: 'Yes',
          po_id: selectedId,
          received_data
        })).unwrap()
      }

      if (res?.error) {
        toast.error(res.error || 'Submission failed')
      } else {
        toast.success(res.message === 200 ? "Successfully Submit" : "Submit" || `Purchase order ${isEditMode ? 'updated' : 'submitted'} successfully`)
        const freshData = await dispatch(purchaseOrderDetails({ _id: id })).unwrap()
        setFormData(freshData.data)
        setIsEditMode(true)
        navigate('/app/purchase')
      }
    } catch (error) {
      console.error('Error submitting:', error)
      toast.error(`An error occurred while ${isEditMode ? 'updating' : 'submitting'}`)
    } finally {
      setLoading(false)
    }
  }

  // Table configuration
  const tableHeadings = [
    'Sr. No.',
    'PRODUCT NAME',
    'HSN',
    'PO. QTY',
    'TYPE',
    'BATCH',
    ' ',
    'Received Qty',
    'Return Qty',
    'Pending Qty',
    'Rate',
    'Amount',
    'Remark'
  ]
  const formatExpDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";

    // MM/DD/YY format
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
  };
  // Generate table data
  const generateTableData = () => {
    return editableData?.map((item, index) => {

      const hasErrors = validationErrors[index]
      const hasQuantityError = hasErrors?.quantity || hasErrors?.receivedQty || hasErrors?.returnQty || hasErrors?.pendingQty
      const hasTypeError = hasErrors?.type
      const hasBatchError = hasErrors?.batch
      // Check if item is completed (received_qty equals po_qty/quantity)
      const poQty = Number(item.po_qty) || Number(item.quantity) || 0
      const receivedQty = Number(item.received_qty) || 0
      const isCompleted = receivedQty === poQty && poQty > 0

      // Calculate amount for display
      const currentReceivedQty = Number(item.received_qty) || 0
      const currentRate = Number(item.po_rate) || Number(item.selectedHead?.salePrice) || 0
      const calculatedAmount = (currentReceivedQty * currentRate).toFixed(2)


      // const formatTimestamp = (timestamp) => {
      //   if (!timestamp) return "N/A";
      // sessionStorage.setItem('oldReceivedQty', JSON.stringify({oldReceivedQtys, itemId: item?._id}));
      //   const date = new Date(timestamp);
      //   if (isNaN(date.getTime())) return "N/A";

      //   // MM/DD/YYYY format
      //   return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      // };

      return [
        <span key={`sr-${index}`}>{index + 1}</span>,

        <span key={`name-${index}`} className='block max-w-[120px] pb-2 truncate'>
          {item?.product_name || 'N/A'}

          {/* {hasErrors && (
          <div className="text-xs text-red-500 mt-1">
            Has validation errors
          </div>
        )} */}

          {isCompleted && (
            <div className="text-green-600 text-xs font-semibold mt-1">✓ Completed</div>
          )}
        </span>,

        item?.HsnCode?.code ? (
          <div key={`hsn-${index}`} className='flex flex-col text-left leading-tight text-xs'>
            <span className='font-medium'>{item.HsnCode.code}</span>
            <span className='text-[10px] text-gray-600'>
              CGST: {item.HsnCode.CGST ?? 0}% | SGST: {item.HsnCode.SGST ?? 0}% |
              IGST: {item.HsnCode.IGST ?? 0}%
            </span>
          </div>
        ) : (
          'N/A'
        ),

        <span key={`qty-${index}`} className={hasQuantityError ? 'text-red-600 font-semibold' : 'font-semibold text-blue-600'}>
          {item?.po_qty ? item?.po_qty : item?.quantity}
        </span>,

        <div key={`type-${index}`}>
          {isCompleted ? (
            <div className="text-gray-700 text-sm font-medium bg-gray-100 px-2 py-1 rounded">
              {item.selectedHead?.type || item.type || 'N/A'}
              <div className="text-xs text-gray-500 mt-1">Completed - Not Editable</div>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setCurrentItemId(item._id)
                  getHeadData(item?.product_id)
                }}
                className={`text-blue-500 hover:underline text-sm font-medium transition-colors ${hasTypeError ? 'border-2 border-red-500 p-1 rounded bg-red-50' : ''
                  }`}
              >
                {item.selectedHead?.type || 'Select Type'}
              </button>
              {hasTypeError && (
                <div className="text-xs text-red-500 mt-1">Required</div>
              )}
            </>
          )}
        </div>,

        <div key={`batch-${index}`} className='flex flex-col items-start'>
          {isCompleted ? (
            <div className="text-gray-700 text-sm font-medium bg-gray-100 px-2 py-1 rounded">
              {item.selectedBatch?.batchCode || item.batch_no || 'N/A'}
              <div className="text-xs text-gray-500 mt-1">Completed - Not Editable</div>
              {(item.selectedBatch || item.batch_no) && (
                // Then use it in your JSX:
                <div className='text-xs text-gray-600 mt-1'>
                  <div>

                    MFG:{' '}
                    {formatExpDate(item.selectedBatch?.manufactureDate || item.manufacture)}
                  </div>
                  <div>
                    EXP:{' '}
                    {formatExpDate(item.selectedBatch?.expiryDate || item.expriy)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setCurrentItemId(item._id)
                  setShowModal(true)
                }}
                className={`text-blue-500 hover:underline text-sm font-medium transition-colors ${hasBatchError ? 'border-2 border-red-500 p-1 rounded bg-red-50' : ''
                  }`}
              >
                {item.selectedBatch?.batchCode || 'Select Batch'}
              </button>
              {hasBatchError && (
                <div className="text-xs text-red-500 mt-1">Required</div>
              )}
              {item.selectedBatch && (
                <div className='text-xs text-gray-600 mt-1'>
                  <div>
                    MFG:{' '}
                    {formatExpDate(item.selectedBatch?.manufactureDate || item.manufacture)}
                  </div>
                  <div>
                    EXP:{' '}
                    {formatExpDate(item.selectedBatch?.expiryDate || item.expriy)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>,

        <span key={`spacer-${index}`}></span>,

        <div key={`received-${index}`} className="flex flex-col">
          <input
            type='number'
            min="0"
            step="1"
            value={item?.received_qty || ''}
            onChange={e => handleInputChange(index, 'received_qty', e.target.value)}

            className={`border px-2 py-1 w-20 rounded transition-colors ${isCompleted
              ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300'
              : hasErrors?.receivedQty
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 focus:border-blue-500'
              }`}
            placeholder="0"
            title={isCompleted ? "Completed items cannot be edited" : ""}
          />
          {hasErrors?.receivedQty && !isCompleted && (
            <div className="text-xs text-red-500 mt-1 w-24">
              {hasErrors.receivedQty}
            </div>
          )}
          {isCompleted && (
            <div className="text-xs text-green-600 mt-1">Completed</div>
          )}
        </div>,

        <div key={`return-${index}`} className="flex flex-col">
          <input
            type='number'
            min="0"
            step="1"
            value={item?.return_qty || ''}
            onChange={e => handleInputChange(index, 'return_qty', e.target.value)}

            className={`border px-2 py-1 w-20 rounded transition-colors ${isCompleted
              ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300'
              : hasErrors?.returnQty
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 focus:border-blue-500'
              }`}
            placeholder="0"
            title={isCompleted ? "Completed items cannot be edited" : ""}
          />
          {hasErrors?.returnQty && !isCompleted && (
            <div className="text-xs text-red-500 mt-1 w-24">
              {hasErrors.returnQty}
            </div>
          )}
        </div>,

        <div key={`pending-${index}`} className="flex flex-col">
          <input
            type='number'
            value={item?.pending_qty || ''}
            onChange={e => handleInputChange(index, 'pending_qty', e.target.value)}
            disabled={isCompleted}
            className={`border px-2 py-1 w-20 rounded transition-colors ${isCompleted
              ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300'
              : hasErrors?.pendingQty
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-gray-100'
              }`}
            title={isCompleted ? "Completed items cannot be edited" : "Auto-calculated: PO Qty - Received Qty - Return Qty"}
          />
          {/* {hasErrors?.pendingQty && !isCompleted && (
          <div className="text-xs text-red-500 mt-1 w-32">
            {hasErrors.pendingQty}
          </div>
        )} */}
          {hasErrors?.quantity && !isCompleted && (
            <div className="text-xs text-red-500 mt-1 w-32">
              {hasErrors.quantity}
            </div>
          )}
        </div>,

        <input
          key={`rate-${index}`}
          type='number'
          step='0.01'
          min="0"
          value={item?.po_rate || (item?.selectedHead?.salePrice || '')}
          onChange={e => handleInputChange(index, 'po_rate', e.target.value, item?.selectedHead?.salePrice)}
          disabled={isCompleted}
          className={`border px-2 py-1 w-20 rounded transition-colors ${isCompleted
            ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300'
            : 'border-gray-300 focus:border-blue-500'
            }`}
          placeholder="0.00"
          title={isCompleted ? "Completed items cannot be edited" : ""}
        />,

        <div key={`amount-${index}`} className="flex flex-col">
          <span className="font-medium text-green-600">
            ₹{calculatedAmount}
          </span>
          <span className="text-xs text-gray-500">
            ({currentReceivedQty} × ₹{currentRate.toFixed(2)})
          </span>
        </div>,

        <input
          key={`remark-${index}`}
          value={item?.remark || (item?.selectedHead?.remark || '')}
          onChange={e => handleInputChange(index, 'remark', e.target.value)}
          disabled={isCompleted}
          className={`border px-2 py-1 rounded transition-colors ${isCompleted
            ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300'
            : 'border-gray-300 focus:border-blue-500'
            }`}
          placeholder="Enter remark..."
          title={isCompleted ? "Completed items cannot be edited" : ""}
        />
      ]
    })
  }

  // Helper function to map received data to editable format with auto-selection
  const mapReceivedDataToEditableFormat = (receivedData, batchOptions) => {
    return receivedData?.map(item => {
      // Find matching batch from options
      const matchingBatch = batchOptions.find(batch =>
        batch._id === item.batch_id ||
        batch.id === item.batch_id ||
        batch.batchCode === item.batch_no
      );

      // Create selectedHead object from received data
      const selectedHead = {
        _id: item.head_id,
        type: item.type,
        packaging: item.packaging,
        salePrice: item.po_rate,
        remark: item.remark
      };

      return {
        ...item,
        // Map the existing batch selection
        selectedBatch: matchingBatch || {
          _id: item.batch_id,
          id: item.batch_id,
          batchCode: item.batch_no,
          expiryDate: item.expriy,
          manufactureDate: item.manufacture
        },
        // Map the existing head selection
        selectedHead: selectedHead,
        // Ensure quantity field is properly mapped
        quantity: item.po_qty || item.quantity
      };
    });
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const receivedData = await fetchReceivedData();
        await fetchPurchaseOrderData(receivedData); // pass received data to decide what to show
      } catch (error) {
        toast.error('Failed to load purchase order details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch, selectedId]);

  // Separate function to fetch received data
  const fetchReceivedData = async () => {
    const receivedRes = await dispatch(getOrderReceivedList({ po_no: selectedId })).unwrap();
    const receivedList = receivedRes?.data?.data?.data || [];
    const receivedOrder = receivedList[0];

    if (receivedOrder) {
      setIsEditMode(true);
      localStorage.setItem('receivedOrderId', JSON.stringify(receivedOrder));
      return receivedOrder.received_data;
    }

    return null; // No received data
  };

  // Separate function to fetch the PO itself
  const fetchPurchaseOrderData = async (receivedData) => {
    const poRes = await dispatch(purchaseOrderDetails({ _id: id })).unwrap();
    const poData = poRes.data;


    setFormData(poData);

    // Show received data if available, otherwise show original PO items
    if (receivedData && batchOptions.length > 0) {
      // Map received data with auto-selection when batch options are available
      const mappedData = mapReceivedDataToEditableFormat(receivedData, batchOptions);
      setEditableData(mappedData);
    } else if (receivedData) {
      // Store received data temporarily until batch options are loaded
      setReceivedOrderData(receivedData);
      setEditableData(receivedData);
    } else {
      setEditableData(poData?.purchaseOrderItems);
    }
  };

  // Fetch dropdown data and handle auto-selection
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [batches] = await Promise.all([
          dispatch(getBatchList({ page: 1, size: 1000, searchKey: null }))
        ])
        const batchList = batches?.payload?.data?.list || [];
        setBatchOptions(batchList);

        // If we have received data waiting to be mapped, do it now
        if (receivedOrderData.length > 0) {
          const mappedData = mapReceivedDataToEditableFormat(receivedOrderData, batchList);
          setEditableData(mappedData);
          setReceivedOrderData([]); // Clear temporary data
        }
      } catch (error) {
        console.error('Dropdown data fetch error:', error)
        toast.error('Failed to load batch options')
      }
    }
    fetchDropdownData()
  }, [dispatch, receivedOrderData])

  // Loading state
  if (!formData) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <span className='ml-3 text-gray-600'>Loading purchase order...</span>
      </div>
    )
  }

  return (
    <>
      <GoodsReceivedData
        formData={formData}
        tableHeadings={tableHeadings}
        tableData={generateTableData()}
        handleSubmit={handleSubmit}
        isEditMode={isEditMode}
        loading={loading}
      />

      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50'>
          <div className='bg-white p-5 rounded-md shadow-lg max-w-3xl w-full relative'>
            <div className=''>
              <button
                onClick={handleNavigate}
                className='absolute top-2 right-12 px-2 py-1.5 bg-blue-600 text-black text-sm font-semibold rounded hover:bg-blue-700 transition'
              >
                Add
              </button>
              <button
                onClick={() => setShowModal(false)}
                className='absolute top-2 right-3 text-xl font-bold text-gray-600 hover:text-red-500'
              >
                &times;
              </button>
            </div>
            <ShowBatchData
              batchOptions={batchOptions}
              onSelectBatch={handleBatchSelect}
              selectedBatch={
                editableData.find(item => item._id === currentItemId)?.selectedBatch
              }
            />
          </div>
        </div>
      )}

      {/* Type Selection Modal */}
      {showModal2 && (
        <div className='fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50'>
          <div className='bg-white p-5 rounded-md shadow-lg max-w-3xl w-full relative'>
            <button
              onClick={() => setShowModal2(false)}
              className='absolute top-2 right-3 text-xl font-bold text-gray-600 hover:text-red-500'
            >
              &times;
            </button>
            <ShowTypeData
              headDataList={headDataList}
              onSelectBatch={handleHeadSelect}
              selectedHead={
                editableData.find(item => item._id === currentItemId)?.selectedHead
              }
            />
          </div>
        </div>
      )}
    </>
  )
}

export default PurchaseOrderEditableForm