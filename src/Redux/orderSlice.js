import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { unsupportedThunk } from '../_helpers/adminApi';

const firstOrderId = (payload = {}) =>
    payload.orderId || payload.order_id || payload._id || payload.id || payload.order_no;

const toOrderListParams = (params = {}) => {
    const limit = Number(params.limit || params.size || 10);
    const page = Number(params.page || 1);
    return {
        ...(params.status ? { status: params.status } : {}),
        ...(params.fromDate || params.dateFrom ? { fromDate: params.fromDate || params.dateFrom } : {}),
        ...(params.toDate || params.dateTo ? { toDate: params.toDate || params.dateTo } : {}),
        limit,
        offset: params.offset !== undefined ? Number(params.offset) : Math.max(page - 1, 0) * limit,
    };
};

const normalizeOrderStatus = (status) => {
    const aliases = {
        out_for_shipping: "shipped",
        out_for_delivery: "shipped",
    };
    return aliases[status] || status;
};

const initialState = {
    getReviewListData: {}, getOrderListData: {}, getOrderInfoData: {}, updateOrderStatusData: {}, getProductInfoData: {},
    orderCancelData: {}, getDeliveryStaffForOrderData: {}, assignOrderData: {}

}

const ORDER_LEGACY_UNSUPPORTED_MESSAGE =
    'This legacy order-side API is not exposed by the current backend.';
export const getReviewList = unsupportedThunk('getReviewList', ORDER_LEGACY_UNSUPPORTED_MESSAGE)

export const getOrderList = createApiThunkPrivate('getOrderList', ENDPOINTS.orders.listForPanel, 'GET', true, {
    transformParams: toOrderListParams,
})
export const getOrderInfo = createApiThunkPrivate('getOrderInfo', (payload) => ENDPOINTS.orders.detail(firstOrderId(payload)), 'GET', true)
export const updateOrderStatus = createApiThunkPrivate('updateOrderStatus', (payload) => ENDPOINTS.orders.status(firstOrderId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({ status: normalizeOrderStatus(payload.status) }),
})
export const orderCancel = createApiThunkPrivate('orderCancel', (payload) => ENDPOINTS.orders.cancel(firstOrderId(payload)), 'POST', false, {
    transformBody: (payload = {}) => ({ reason: payload.reason || payload.cancelReason || "" }),
})
export const getDeliveryStaffForOrder = unsupportedThunk('getDeliveryStaffForOrder', ORDER_LEGACY_UNSUPPORTED_MESSAGE)
export const assignOrder = unsupportedThunk('assignOrder', ORDER_LEGACY_UNSUPPORTED_MESSAGE)



export const getProductInfo = createApiThunkPrivate('getProductInfo', (payload) => ENDPOINTS.products.detail(payload?.productId || payload?.product_id || payload?.id), 'GET', true)









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
