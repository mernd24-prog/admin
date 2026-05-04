import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  getPurchaseOrderList,
  purchaseOrderDetails
} from '../../Redux/erpSlice'
import AddNewPurchase from '../Purchase/components/AddNewPurchase'
import PurchaseOrderEditableForm from '../Purchase/components/PurchaseOrderPreviewForm'
import Loader from '../../components/Loader/Loader'
import FilterSelect from '../../components/Atoms/FilterSelect/FilterSelect'

// Simple icon components
const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)


const TAB_CONFIG = [
  {
    key: 'purchase',
    label: 'Purchase Orders',
    icon: DocumentIcon,
    description: 'Receive from existing orders'
  },
  {
    key: 'local',
    label: 'Local Purchase',
    icon: PlusIcon,
    description: 'Create new entry'
  }
]

const Stocks = () => {
  const [activeTab, setActiveTab] = useState('purchase')
  const [purchaseOrderOptions, setPurchaseOrderOptions] = useState([])
  const [selectedPurchaseOrderData, setSelectedPurchaseOrderData] = useState(null)
  const [selectedPoId, setSelectedPoId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [, setError] = useState(null)
  const [selectedId, setSelectedId] = useState('')

  const dispatch = useDispatch()
  const selector = useSelector(state => state.erp)

  // Filter purchase orders based on search term
  const filteredPurchaseOrders = purchaseOrderOptions.filter(
    option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Fetch all purchase orders
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const purchaseOrderResponse = await dispatch(
          getPurchaseOrderList({ page: 1, limit: 9999, searchKey: "", po_receive: true })
        );

        if (purchaseOrderResponse?.payload?.data?.list) {
          const formattedOptions = purchaseOrderResponse.payload.data.list.map(
            p => ({
              label: p.order_id || p.oder_id || `PO-${p._id?.slice(-6)}`,
              value: p._id,
              deliveryDate: p.delivery_date,
              supplierName: p.supplier_name || 'Unknown Supplier',
              status: p.status || 'pending',
              totalAmount: p.total_amount || 0
            })
          )

          setPurchaseOrderOptions(formattedOptions)
        } else {
          setPurchaseOrderOptions([])
        }
      } catch (error) {
        console.error('Purchase orders fetch error:', error)
        setError('Failed to load purchase orders. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPurchaseOrders()
  }, [dispatch])

  const handleTabChange = tabKey => {
    setActiveTab(tabKey)
    setSelectedPurchaseOrderData(null)
    setSelectedPoId('')
    setSelectedId('')
    setError(null)
    setSearchTerm('')
  }

  const handleSelectChange = async data => {
    setSelectedId(data?.label)
    setSelectedPoId(data?.value || '')
    try {
      setIsLoading(true)
      setError(null)

      const response = await dispatch(
        purchaseOrderDetails({ _id: data?.value })
      )
      if (response?.payload?.data) {
        setSelectedPurchaseOrderData(response.payload.data)
      } else {
        setError('Failed to load purchase order details.')
      }
    } catch (error) {
      console.error('Error fetching PO details:', error)
      setError('Error loading purchase order details. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <>
      <Loader loading={selector?.loading || isLoading} />
      <div className='min-h-screen '>
        <div className='max-w-7xl mx-auto p-4'>
     

          <div className='  mb-4'>
            <div className='b'>
              <div className='flex space-x-1'>
                {TAB_CONFIG.map(tab => {
                  const IconComponent = tab.icon
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className=''>
              {activeTab === 'purchase' && (
                <div className='space-y-4'>
 
                  <div>
                    <FilterSelect
                      options={filteredPurchaseOrders || []}
                      value={filteredPurchaseOrders.find(opt => opt.value === selectedPoId)}
                      onChange={handleSelectChange}
                      label='Choose Purchase Order'
                    />
                    
                    {searchTerm && filteredPurchaseOrders.length === 0 && (
                      <div className='mt-2 p-3 bg-yellow-50 rounded-md'>
                        <p className='text-sm text-yellow-700'>
                          No results for "{searchTerm}". <button onClick={() => setSearchTerm('')} className='text-yellow-800 underline'>Clear search</button>
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedPoId && selectedPurchaseOrderData && (
                    <div className='bg-blue-50 rounded-lg p-4 border border-blue-200'>
                      <div className='flex items-center justify-between mb-2'>
                        <h3 className='font-medium text-blue-900'>Order: {selectedId}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedPurchaseOrderData.status)}`}>
                          {selectedPurchaseOrderData.status || 'Pending'}
                        </span>
                      </div>
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span className='text-blue-700'>Supplier:</span>
                          <span className='ml-2 font-medium'>{selectedPurchaseOrderData.supplier_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className='text-blue-700'>Amount:</span>
                          <span className='ml-2 font-medium'>₹{selectedPurchaseOrderData.total_amount || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'local' && (
                <div>
                  <AddNewPurchase hiddenBreadCrumb={true} />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'purchase' && (
            <div className='bg-white rounded-lg shadow-sm border min-h-[400px]'>
              {selectedPurchaseOrderData ? (
                <div>
                  <div className='border-b border-gray-200 px-4 py-3 bg-gray-50'>
                    <h3 className='font-medium text-gray-900'>Purchase Order Details</h3>
                  </div>
                  <div className='p-4'>
                    <PurchaseOrderEditableForm
                      data={selectedPurchaseOrderData}
                      id={selectedPoId}
                      selectedId={selectedId}
                    />
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center h-80 text-center p-4'>
                  <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                    <DocumentIcon />
                  </div>
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    {selectedPoId ? 'Loading...' : 'Select Purchase Order'}
                  </h3>
                  <p className='text-gray-600 max-w-sm'>
                    {selectedPoId 
                      ? 'Fetching purchase order details...' 
                      : 'Choose a purchase order from above to view and process goods receipt.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default Stocks