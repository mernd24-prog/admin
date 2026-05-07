import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';

const initialState = {
    getDiscountCouponsData: {}, createData: {}, editData: {}, enableDisableData: {}, softDeleteDiscountCouponsData: {},
    getPromotionBannersListData: {}, createPromotionBannersData: {}, editPromotionBannerData: {}, enableDisablePromotionBannerData: {}, softDeletePromotionBannerData: {}
}

export const getDiscountCoupons = createApiThunkPrivate('getDiscountCoupons', ENDPOINTS.coupons.list, 'GET')
export const createDiscountCoupons = createApiThunkPrivate('createDiscountCoupons', ENDPOINTS.coupons.list, 'POST')
export const editDiscountCoupons = createApiThunkPrivate('editDiscountCoupons', (payload) => ENDPOINTS.coupons.detail(payload?.couponId || payload?._id || payload?.id), 'PATCH')
export const enableDisableDiscountCoupons = createApiThunkPrivate('enableDisable', (payload) => ENDPOINTS.coupons.detail(payload?.couponId || payload?._id || payload?.id), 'PATCH')
export const softDeleteDiscountCoupons = createApiThunkPrivate('softDeleteDiscountCoupons', (payload) => ENDPOINTS.coupons.detail(payload?.couponId || payload?._id || payload?.id), 'DELETE')

export const getPromotionBannersList = createApiThunkPrivate('getPromotionBannersList', '/promotions-banner/getList', 'GET')
export const createPromotionBanners = createApiThunkPrivate('createPromotionBanners', '/promotions-banner/create', 'POST')
export const editPromotionBanner = createApiThunkPrivate('editPromotionBanner', '/promotions-banner/update', 'PUT')
export const enableDisablePromotionBanner = createApiThunkPrivate('enableDisablePromotionBanner', '/promotions-banner/enableDisable', 'PUT')
export const softDeletePromotionBanner = createApiThunkPrivate('softDeletePromotionBanner', '/promotions-banner/softDelete', 'DELETE')

const promotionsSlice = createSlice({
    name: 'promotions',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getDiscountCoupons, 'getDiscountCouponsData')
        createExtraReducersForThunk(builder, createDiscountCoupons, 'createData')
        createExtraReducersForThunk(builder, editDiscountCoupons, 'editData')
        createExtraReducersForThunk(builder, enableDisableDiscountCoupons, 'enableDisableData')
        createExtraReducersForThunk(builder, softDeleteDiscountCoupons, 'softDeleteDiscountCouponsData')
        createExtraReducersForThunk(builder, getPromotionBannersList, 'getPromotionBannersListData')
        createExtraReducersForThunk(builder, createPromotionBanners, 'createPromotionBannersData')
        createExtraReducersForThunk(builder, editPromotionBanner, 'editPromotionBannerData')
        createExtraReducersForThunk(builder, enableDisablePromotionBanner, 'enableDisablePromotionBannerData')
        createExtraReducersForThunk(builder, softDeletePromotionBanner, 'softDeletePromotionBannerData')





    }
})

export default promotionsSlice.reducer 
