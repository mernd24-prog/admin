import { createSlice } from '@reduxjs/toolkit'
import {
  createExtraReducersForThunk
} from '../_helpers/ApiThunk'
import { unsupportedThunk } from '../_helpers/adminApi'

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
const ERP_UNSUPPORTED_MESSAGE =
  'ERP and legacy delivery-staff APIs are not exposed by the current backend.';
export const getSupplierList = unsupportedThunk('getSupplierList', ERP_UNSUPPORTED_MESSAGE)
export const createSupplier = unsupportedThunk('createSupplier', ERP_UNSUPPORTED_MESSAGE)
export const approveDisapprove = unsupportedThunk('approveDisapprove', ERP_UNSUPPORTED_MESSAGE)
export const getSupplierDetails = unsupportedThunk('getSupplierDetails', ERP_UNSUPPORTED_MESSAGE)
export const editSupplireDetails = unsupportedThunk('editSupplierDetails', ERP_UNSUPPORTED_MESSAGE)
export const staffList = unsupportedThunk('staffList', ERP_UNSUPPORTED_MESSAGE)
export const addDeliveryStaff = unsupportedThunk('addDeliveryStaff', ERP_UNSUPPORTED_MESSAGE)
export const updateDeliveryStaff = unsupportedThunk('updateDeliveryStaff', ERP_UNSUPPORTED_MESSAGE)
// purchase related
export const getPurchaseOrderList = unsupportedThunk('getPurchaseOrderList', ERP_UNSUPPORTED_MESSAGE)
export const createPurchaseOrder = unsupportedThunk('createPurchaseOrder', ERP_UNSUPPORTED_MESSAGE)
export const updatePurchaseOrderById = unsupportedThunk('updatePurchaseOrderById', ERP_UNSUPPORTED_MESSAGE)
export const updateReceivedOrderById = unsupportedThunk('updateReceivedOrderById', ERP_UNSUPPORTED_MESSAGE)
export const purchaseOrderDetails = unsupportedThunk('purchaseOrderDetails', ERP_UNSUPPORTED_MESSAGE)
export const receivedOrder = unsupportedThunk('receivedOrder', ERP_UNSUPPORTED_MESSAGE)
export const receivedOrderList = unsupportedThunk('receivedOrderList', ERP_UNSUPPORTED_MESSAGE)



// inventry related
export const getInventoryList = unsupportedThunk('getAllStockList', ERP_UNSUPPORTED_MESSAGE)
export const createInventory = unsupportedThunk('createInventory', ERP_UNSUPPORTED_MESSAGE)
export const approveDisapproveEnventory = unsupportedThunk('approveDisapproveEnventory', ERP_UNSUPPORTED_MESSAGE)
export const getInventoryDetailsById = unsupportedThunk('getInventoryDetailsById', ERP_UNSUPPORTED_MESSAGE)
export const editInventoryDetails = unsupportedThunk('editInventoryDetails', ERP_UNSUPPORTED_MESSAGE)

// sale related
export const getSaleOrderList = unsupportedThunk('getSaleOrderList', ERP_UNSUPPORTED_MESSAGE)
export const saleOrderDetails = unsupportedThunk('saleOrderDetails', ERP_UNSUPPORTED_MESSAGE)
export const createSaleOrder = unsupportedThunk('createSaleOrder', ERP_UNSUPPORTED_MESSAGE)

// get product
export const getProductsList = unsupportedThunk('getProductList', ERP_UNSUPPORTED_MESSAGE)

// get batch
export const getBatchList = unsupportedThunk('getBatchList', ERP_UNSUPPORTED_MESSAGE)

export const getHeadList = unsupportedThunk('getHeadList', ERP_UNSUPPORTED_MESSAGE)

export const getOrderReceivedList = unsupportedThunk('getOrderReceivedList', ERP_UNSUPPORTED_MESSAGE)


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
