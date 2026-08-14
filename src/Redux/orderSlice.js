import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';

const firstOrderId = (payload = {}) =>
    payload.orderId || payload.order_id || payload._id || payload.id || payload.order_no;

const toOrderListParams = (params = {}) => {
    const limit = Number(params.limit || params.size || 10);
    const page = Number(params.page || 1);
    return {
        ...(params.status ? { status: params.status } : {}),
        ...(params.orderType || params.order_type ? { orderType: params.orderType || params.order_type } : {}),
        ...(params.paymentStatus || params.payment_status ? { paymentStatus: params.paymentStatus || params.payment_status } : {}),
        ...(params.deliveryStatus || params.delivery_status ? { deliveryStatus: params.deliveryStatus || params.delivery_status } : {}),
        ...(params.sellerId || params.seller_id ? { sellerId: params.sellerId || params.seller_id } : {}),
        ...(params.userId || params.buyerId ? { buyerId: params.userId || params.buyerId } : {}),
        ...(params.keyWord || params.search ? { search: params.keyWord || params.search } : {}),
        ...(params.fromDate || params.dateFrom ? { fromDate: params.fromDate || params.dateFrom } : {}),
        ...(params.toDate || params.dateTo ? { toDate: params.toDate || params.dateTo } : {}),
        ...(params.sortBy || params.sort ? { sortBy: params.sortBy || params.sort } : {}),
        ...(params.sortDir || params.sortOrder ? { sortDir: params.sortDir || params.sortOrder } : {}),
        limit,
        offset: params.offset !== undefined ? Number(params.offset) : Math.max(page - 1, 0) * limit,
    };
};

const normalizeOrderStatus = (status) => {
    const aliases = {
        out_for_shipping: "shipped",
    };
    return aliases[status] || status;
};

const isUuid = (value = "") =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());

const toCancellationListParams = (params = {}) => {
    const limit = Number(params.limit || params.pageSize || params.size || 20);
    const page = Number(params.page || 1);
    const orderInput = String(params.orderId || params.order_id || "").trim();
    const searchParts = [
        params.search,
        params.keyWord,
        orderInput && !isUuid(orderInput) ? orderInput : "",
    ].filter(Boolean);
    return {
        ...(orderInput && isUuid(orderInput) ? { orderId: orderInput } : {}),
        ...(params.buyerId ? { buyerId: params.buyerId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.refundStatus ? { refundStatus: params.refundStatus } : {}),
        ...(params.scope ? { scope: params.scope } : {}),
        ...(params.fromDate ? { fromDate: params.fromDate } : {}),
        ...(params.toDate ? { toDate: params.toDate } : {}),
        ...(searchParts.length ? { search: searchParts.join(" ") } : {}),
        limit,
        offset: params.offset !== undefined ? Number(params.offset) : Math.max(page - 1, 0) * limit,
    };
};

const initialState = {
    getOrderListData: {}, getOrderInfoData: {}, updateOrderStatusData: {}, getProductInfoData: {},
    orderCancelData: {}, createOrderData: {}, deleteOrderData: {}, addOrderNoteData: {}
    , cancellationListData: {}, retryCancellationData: {}, approveCancellationData: {}, rejectCancellationData: {}, approveCancellationRefundData: {}, completeCancellationRefundData: {}

}


export const getOrderList = createApiThunkPrivate('getOrderList', ENDPOINTS.orders.listForPanel, 'GET', true, {
    transformParams: toOrderListParams,
})
export const getOrderInfo = createApiThunkPrivate('getOrderInfo', (payload) => ENDPOINTS.orders.detail(firstOrderId(payload)), 'GET', true)
export const createOrder = createApiThunkPrivate('createOrder', ENDPOINTS.orders.create, 'POST')
export const updateOrderStatus = createApiThunkPrivate('updateOrderStatus', (payload) => ENDPOINTS.orders.status(firstOrderId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        status: normalizeOrderStatus(payload.status),
        ...(payload.reason ? { reason: payload.reason } : {}),
        ...(payload.note ? { note: payload.note } : {}),
        ...(payload.trackingNumber ? { trackingNumber: payload.trackingNumber } : {}),
        ...(payload.carrierName ? { carrierName: payload.carrierName } : {}),
        ...(payload.carrierUrl ? { carrierUrl: payload.carrierUrl } : {}),
    }),
})
export const deleteOrder = createApiThunkPrivate('deleteOrder', (payload) => ENDPOINTS.orders.detail(firstOrderId(payload)), 'DELETE')
export const orderCancel = createApiThunkPrivate('orderCancel', (payload) => ENDPOINTS.orders.cancel(firstOrderId(payload)), 'POST', false, {
    transformBody: (payload = {}) => ({
        reason: payload.reason || payload.cancelReason || "",
        reasonCode: payload.reasonCode || "other",
        refundMethod: payload.refundMethod || "auto",
        ...(payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : {}),
        ...(Array.isArray(payload.items) && payload.items.length ? { items: payload.items } : {}),
    }),
})
export const addOrderNote = createApiThunkPrivate('addOrderNote', (payload) => ENDPOINTS.orders.notes(firstOrderId(payload)), 'POST', false, {
    transformBody: (payload = {}) => ({ note: payload.note || "", visibility: payload.visibility || "internal" }),
})
export const getCancellationList = createApiThunkPrivate('getCancellationList', ENDPOINTS.cancellations.list, 'GET', true, {
    transformParams: toCancellationListParams,
})
export const retryCancellation = createApiThunkPrivate('retryCancellation', (payload) => ENDPOINTS.cancellations.retry(payload.cancellationId || payload.id), 'POST', false, {
    transformBody: (payload = {}) => ({ note: payload.note || "" }),
})
export const approveCancellation = createApiThunkPrivate('approveCancellation', (payload) => ENDPOINTS.cancellations.approve(payload.cancellationId || payload.id), 'POST', false, {
    transformBody: (payload = {}) => ({ note: payload.note || "" }),
})
export const rejectCancellation = createApiThunkPrivate('rejectCancellation', (payload) => ENDPOINTS.cancellations.reject(payload.cancellationId || payload.id), 'POST', false, {
    transformBody: (payload = {}) => ({ reason: payload.reason || "" }),
})
export const approveCancellationRefund = createApiThunkPrivate('approveCancellationRefund', (payload) => ENDPOINTS.cancellations.approveRefund(payload.cancellationId || payload.id), 'POST', false, {
    transformBody: (payload = {}) => ({ note: payload.note || "" }),
})
export const completeCancellationRefund = createApiThunkPrivate('completeCancellationRefund', (payload) => ENDPOINTS.cancellations.manualRefund(payload.cancellationId || payload.id), 'POST', false, {
    transformBody: (payload = {}) => ({ referenceId: payload.referenceId, proofUrl: payload.proofUrl || null, note: payload.note || "" }),
})


export const getProductInfo = createApiThunkPrivate('getProductInfo', (payload) => ENDPOINTS.products.detail(payload?.productId || payload?.product_id || payload?.id), 'GET', true)









const orderSlice = createSlice({
    name: 'order',
    initialState,
    extraReducers: builder => {
createExtraReducersForThunk(builder, getOrderList, 'getOrderListData')
        createExtraReducersForThunk(builder, getOrderInfo, 'getOrderInfoData')
        createExtraReducersForThunk(builder, createOrder, 'createOrderData')
        createExtraReducersForThunk(builder, updateOrderStatus, 'updateOrderStatusData')
        createExtraReducersForThunk(builder, deleteOrder, 'deleteOrderData')
        createExtraReducersForThunk(builder, orderCancel, 'orderCancelData')
        createExtraReducersForThunk(builder, addOrderNote, 'addOrderNoteData')
        createExtraReducersForThunk(builder, getCancellationList, 'cancellationListData')
        createExtraReducersForThunk(builder, retryCancellation, 'retryCancellationData')
        createExtraReducersForThunk(builder, approveCancellation, 'approveCancellationData')
        createExtraReducersForThunk(builder, rejectCancellation, 'rejectCancellationData')
        createExtraReducersForThunk(builder, approveCancellationRefund, 'approveCancellationRefundData')
        createExtraReducersForThunk(builder, completeCancellationRefund, 'completeCancellationRefundData')




        createExtraReducersForThunk(builder, getProductInfo, 'getProductInfoData')







    }
})

export default orderSlice.reducer
