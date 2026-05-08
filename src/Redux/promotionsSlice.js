import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { unsupportedThunk } from '../_helpers/adminApi';

const initialState = {
    getDiscountCouponsData: {}, createData: {}, editData: {}, enableDisableData: {}, softDeleteDiscountCouponsData: {},
    getPromotionBannersListData: {}, createPromotionBannersData: {}, editPromotionBannerData: {}, enableDisablePromotionBannerData: {}, softDeletePromotionBannerData: {}
}

export const getDiscountCoupons = createApiThunkPrivate('getDiscountCoupons', ENDPOINTS.coupons.list, 'GET')
export const createDiscountCoupons = createApiThunkPrivate('createDiscountCoupons', ENDPOINTS.coupons.list, 'POST')
export const editDiscountCoupons = createApiThunkPrivate('editDiscountCoupons', (payload) => ENDPOINTS.coupons.detail(payload?.couponId || payload?._id || payload?.id), 'PATCH')
export const enableDisableDiscountCoupons = createApiThunkPrivate('enableDisable', (payload) => ENDPOINTS.coupons.detail(payload?.couponId || payload?._id || payload?.id), 'PATCH')
export const softDeleteDiscountCoupons = createApiThunkPrivate('softDeleteDiscountCoupons', (payload) => ENDPOINTS.coupons.detail(payload?.couponId || payload?._id || payload?.id), 'DELETE')

const BANNER_UNSUPPORTED_MESSAGE =
    'Promotion banner API is not exposed by the current backend.';
export const getPromotionBannersList = unsupportedThunk('getPromotionBannersList', BANNER_UNSUPPORTED_MESSAGE)
export const createPromotionBanners = unsupportedThunk('createPromotionBanners', BANNER_UNSUPPORTED_MESSAGE)
export const editPromotionBanner = unsupportedThunk('editPromotionBanner', BANNER_UNSUPPORTED_MESSAGE)
export const enableDisablePromotionBanner = unsupportedThunk('enableDisablePromotionBanner', BANNER_UNSUPPORTED_MESSAGE)
export const softDeletePromotionBanner = unsupportedThunk('softDeletePromotionBanner', BANNER_UNSUPPORTED_MESSAGE)

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
