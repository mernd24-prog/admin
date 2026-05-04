import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';

const initialState = {
    getReviewListData: {}, getOrderListData: {}, getOrderInfoData: {}, updateOrderStatusData: {}, getProductInfoData: {},
    orderCancelData: {}, getDeliveryStaffForOrderData: {}, assignOrderData: {}

}

export const getReviewList = createApiThunkPrivate('getReviewList', '/review/getList', 'GET', true)

export const getOrderList = createApiThunkPrivate('getOrderList', ENDPOINTS.orders.listForPanel, 'GET', true)
export const getOrderInfo = createApiThunkPrivate('getOrderInfo', (payload) => ENDPOINTS.orders.detail(payload?.orderId || payload?.order_id || payload?.order_no), 'GET', true)
export const updateOrderStatus = createApiThunkPrivate('updateOrderStatus', (payload) => ENDPOINTS.orders.status(payload?.orderId || payload?.order_id), 'PATCH',)
export const orderCancel = createApiThunkPrivate('orderCancel', (payload) => ENDPOINTS.orders.cancel(payload?.orderId || payload?.order_id), 'POST',)
export const getDeliveryStaffForOrder = createApiThunkPrivate('getDeliveryStaffForOrder', '/deliveryStaff/get-delivery-staffs-for-order-delivery', 'GET', true)
export const assignOrder = createApiThunkPrivate('assignOrder', '/staffOrderAssignment/assignOrder', 'POST',)



export const getProductInfo = createApiThunkPrivate('getProductInfo', '/product/getProductInfo', 'GET', true)









const orderSlice = createSlice({
    name: 'order',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getReviewList, 'getReviewListData')
        createExtraReducersForThunk(builder, getOrderList, 'getOrderListData')
        createExtraReducersForThunk(builder, getOrderInfo, 'getOrderInfoData')
        createExtraReducersForThunk(builder, updateOrderStatus, 'updateOrderStatusData')
        createExtraReducersForThunk(builder, orderCancel, 'orderCancelData')
        createExtraReducersForThunk(builder, getDeliveryStaffForOrder, 'getDeliveryStaffForOrderData')
        createExtraReducersForThunk(builder, assignOrder, 'assignOrderData')




        createExtraReducersForThunk(builder, getProductInfo, 'getProductInfoData')







    }
})

export default orderSlice.reducer
