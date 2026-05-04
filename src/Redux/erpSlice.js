import { createSlice } from '@reduxjs/toolkit'
import {
  createApiThunkPrivate,
  createExtraReducersForThunk
} from '../_helpers/ApiThunk'

const initialState = {
  // Supplier related states
  getSupplierListData: {},
  createCategoryData: {},
  approveDisapproveData: {},
  getSupplierDetailsData: {},
  editSupplierDetailsData: {},

  // Purchase Order related states
  getPurchaseOrderListData: {},
  staffListData: {},

  createPurchaseOrderData: {},
  purchaseOrderDetailsData: {},

  // Sale related states
  getSaleOrderListData: {},
  saleOrderDetailsData: {},

  // Inventory related states
  getInventoryListData: {},
  createInventoryData: {},
  editInventoryDetailsData: {},
  getInventoryDetailsByData: {},

  // Product related states
  getProductListData: {},

  // Batch related states
  getBatchListData: {},
  getHeadListData: {},

  getOrderReceivedList: {},
}

// supplier related
export const getSupplierList = createApiThunkPrivate(
  'getSupplierList',
  '/erp/suppliers/listSupplier',
  'POST'
)
export const createSupplier = createApiThunkPrivate(
  'createSupplier',
  '/erp/suppliers/createSupplier',
  'POST'
)
export const approveDisapprove = createApiThunkPrivate(
  'approveDisapprove',
  '/erp/suppliers/updateStatus',
  'POST'
)
export const getSupplierDetails = createApiThunkPrivate(
  'getSupplierDetails',
  '/erp/suppliers/supplierDetails',
  'POST'
)
export const editSupplireDetails = createApiThunkPrivate(
  'editSupplierDetails',
  '/erp/suppliers/updateData',
  'POST'
)
export const staffList = createApiThunkPrivate(
  'staffList',
  '/deliveryStaff/staff-list',
  'GET'
)
export const addDeliveryStaff = createApiThunkPrivate(
  'addDeliveryStaff',
  '/deliveryStaff/addDeliveryStaff',
  'POST'
)
export const updateDeliveryStaff = createApiThunkPrivate(
  'updateDeliveryStaff',
  '/deliveryStaff/updateDeliveryStaff',
  'POST'
)
// purchase related
export const getPurchaseOrderList = createApiThunkPrivate(
  'getPurchaseOrderList',
  '/erp/purchase-orders/purchaseOrderList',
  'POST'
)
export const createPurchaseOrder = createApiThunkPrivate(
  'createPurchaseOrder',
  '/erp/purchase-orders/createPurchaseOrder',
  'POST'
)
export const updatePurchaseOrderById = createApiThunkPrivate(
  'updatePurchaseOrderById',
  '/erp/purchase-orders/updatePurchaseOrderById',
  'POST'
)
export const updateReceivedOrderById = createApiThunkPrivate(
  'updateReceivedOrderById',
  '/erp/purchase-orders/updateReceivedOrderById',
  'POST'
)
export const purchaseOrderDetails = createApiThunkPrivate(
  'purchaseOrderDetails',
  '/erp/purchase-orders/purchaseOrderDetails',
  'POST'
)
export const receivedOrder = createApiThunkPrivate(
  'receivedOrder',
  '/erp/purchase-orders/receiveOrder',
  'POST'
)
export const receivedOrderList = createApiThunkPrivate(
  'receivedOrder',
  '/erp/purchase-orders/getrecieveOderList',
  'POST'
)



// inventry related
export const getInventoryList = createApiThunkPrivate(
  'getAllStockList',
  '/erp/purchase-orders/getAllStockList',
  'POST'
)
export const createInventory = createApiThunkPrivate(
  'createInventory',
  '/erp/inventory/createInventory',
  'POST'
)
export const approveDisapproveEnventory = createApiThunkPrivate(
  'approveDisapproveEnventory',
  '/erp/inventory/updateStatus',
  'POST'
)
export const getInventoryDetailsById = createApiThunkPrivate(
  'getInventoryDetailsById',
  '/erp/inventory/inventoryDetails',
  'POST'
)
export const editInventoryDetails = createApiThunkPrivate(
  'editInventoryDetails',
  '/erp/inventory/updateInventory',
  'POST'
)

// sale related
export const getSaleOrderList = createApiThunkPrivate(
  'getSaleOrderList',
  '/erp/sales-orders/saleOrderList',
  'POST'
)
export const saleOrderDetails = createApiThunkPrivate(
  'saleOrderDetails',
  '/erp/sales-orders/saleOrderDetails',
  'POST'
)
export const createSaleOrder = createApiThunkPrivate(
  'createSaleOrder',
  '/erp/sales-orders/createSalesOrder',
  'POST'
)

// get product
export const getProductsList = createApiThunkPrivate(
  'getProductList',
  '/erp/purchase-orders/productNameList',
  'GET'
)

// get batch
export const getBatchList = createApiThunkPrivate(
  'getBatchList',
  `/batch/getALLDocuments`,
  'GET'
)

export const getHeadList = createApiThunkPrivate(
  'getHeadList',
  `/erp/purchase-orders/getProdcutoption`,
  'POST'
)

export const getOrderReceivedList = createApiThunkPrivate(
  'getOrderReceivedList',
  `/erp/purchase-orders/getrecieveOderList`,
  'POST'
)


const erpSlice = createSlice({
  name: 'erp',
  initialState,
  extraReducers: builder => {
    // supplier
    createExtraReducersForThunk(builder, getSupplierList, 'getSupplierListData')
    createExtraReducersForThunk(builder, createSupplier, 'createCategoryData')
    createExtraReducersForThunk(
      builder,
      approveDisapprove,
      'approveDisapproveData'
    )
    createExtraReducersForThunk(
      builder,
      getSupplierDetails,
      'getSupplierDetailsData'
    )
    createExtraReducersForThunk(
      builder,
      editSupplireDetails,
      'editSupplierDetailsData'
    )

    // inventory
    createExtraReducersForThunk(
      builder,
      getInventoryList,
      'getInventoryListData'
    )
    createExtraReducersForThunk(builder, createInventory, 'createInventoryData')
    createExtraReducersForThunk(
      builder,
      editInventoryDetails,
      'editInventoryDetailsData'
    )
    createExtraReducersForThunk(
      builder,
      getInventoryDetailsById,
      'getInventoryDetailsByData'
    )
    createExtraReducersForThunk(
      builder,
      staffList,
      'staffListData'
    )
    // purchase order
    createExtraReducersForThunk(
      builder,
      getPurchaseOrderList,
      'getPurchaseOrderListData'
    )
    createExtraReducersForThunk(
      builder,
      createPurchaseOrder,
      'createPurchaseOrderData'
    )
    createExtraReducersForThunk(
      builder,
      addDeliveryStaff,
      'addDeliveryStaffData'
    )
    createExtraReducersForThunk(
      builder,
      updateDeliveryStaff,
      'updateDeliveryStaffData'
    )
    createExtraReducersForThunk(
      builder,
      updatePurchaseOrderById,
      'updatePurchaseOrderByIdData'
    )
    createExtraReducersForThunk(
      builder,
      updateReceivedOrderById,
      'updateReceivedOrderByIdData'
    )
    createExtraReducersForThunk(
      builder,
      purchaseOrderDetails,
      'purchaseOrderDetailsData'
    )
    createExtraReducersForThunk(builder, receivedOrder, 'receivedOrderData')

    // Sale
    createExtraReducersForThunk(
      builder,
      getSaleOrderList,
      'getSaleOrderListData'
    )
    createExtraReducersForThunk(
      builder,
      saleOrderDetails,
      'saleOrderDetailsData'
    )

    // get product
    createExtraReducersForThunk(builder, getProductsList, 'getProductListData')

    // get batch
    createExtraReducersForThunk(builder, getBatchList, 'getBatchListData')

    createExtraReducersForThunk(builder, getHeadList, 'getHeadListData')

    createExtraReducersForThunk(builder, getOrderReceivedList, 'getOrderRecivedListData')
  }
})

export default erpSlice.reducer
