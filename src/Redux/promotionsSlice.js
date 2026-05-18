import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, asLegacyData } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { unsupportedThunk } from '../_helpers/adminApi';
import { axiosPrivate, apiUrl } from '../_helpers/axiosProvider';

const initialState = {
    getDiscountCouponsData: {}, createData: {}, editData: {}, enableDisableData: {}, softDeleteDiscountCouponsData: {},
    getPromotionBannersListData: {}, createPromotionBannersData: {}, editPromotionBannerData: {}, enableDisablePromotionBannerData: {}, softDeletePromotionBannerData: {}
}

const trimTrailingSlash = (value = "") => String(value || "").replace(/\/+$/, "");
const trimSlashes = (value = "") => String(value || "").replace(/^\/+|\/+$/g, "");
const buildApiUrl = (path) => `${trimTrailingSlash(apiUrl)}/${trimSlashes(path)}`;

const couponListPaths = [
    ENDPOINTS.coupons.list,
    "/coupons",
];

const couponDetailPaths = (couponId) => [
    ENDPOINTS.coupons.detail(couponId),
    `/coupons/${couponId}`,
];

const getCouponId = (payload = {}) => payload?.couponId || payload?._id || payload?.id;

const getErrorMessage = (error) =>
    error?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    (typeof error === "string" ? error : "") ||
    "";

const shouldTryNextCouponRoute = (error) => {
    const status = error?.status || error?.response?.status;
    return status === 404 || getErrorMessage(error) === "Route not found";
};

export const getDiscountCoupons = createAsyncThunk('getDiscountCoupons', async (payload, { rejectWithValue }) => {
    const triedUrls = [];

    for (const path of couponListPaths) {
        try {
            triedUrls.push(buildApiUrl(path));
            const response = await axiosPrivate.get(path, { params: payload });
            return asLegacyData(response);
        } catch (error) {
            const message = getErrorMessage(error);
            if (!shouldTryNextCouponRoute(error)) {
                return rejectWithValue(message || `Failed to fetch coupons from ${triedUrls[triedUrls.length - 1]}`);
            }
        }
    }

    return rejectWithValue(`Coupon list API route not found. Tried: ${triedUrls.join(", ")}`);
})

export const createDiscountCoupons = createAsyncThunk('createDiscountCoupons', async (payload, { rejectWithValue }) => {
    const triedUrls = [];

    for (const path of couponListPaths) {
        try {
            triedUrls.push(buildApiUrl(path));
            const response = await axiosPrivate.post(path, payload);
            return asLegacyData(response);
        } catch (error) {
            const message = getErrorMessage(error);
            if (!shouldTryNextCouponRoute(error)) {
                return rejectWithValue(message || `Failed to create coupon at ${triedUrls[triedUrls.length - 1]}`);
            }
        }
    }

    return rejectWithValue(`Coupon create API route not found. Tried: ${triedUrls.join(", ")}`);
})

export const editDiscountCoupons = createAsyncThunk('editDiscountCoupons', async (payload, { rejectWithValue }) => {
    const couponId = getCouponId(payload);
    const triedUrls = [];

    for (const path of couponDetailPaths(couponId)) {
        try {
            triedUrls.push(buildApiUrl(path));
            const { couponId: _couponId, _id, id, ...body } = payload || {};
            const response = await axiosPrivate.patch(path, body);
            return asLegacyData(response);
        } catch (error) {
            const message = getErrorMessage(error);
            if (!shouldTryNextCouponRoute(error)) {
                return rejectWithValue(message || `Failed to update coupon at ${triedUrls[triedUrls.length - 1]}`);
            }
        }
    }

    return rejectWithValue(`Coupon update API route not found. Tried: ${triedUrls.join(", ")}`);
})

export const enableDisableDiscountCoupons = createAsyncThunk('enableDisable', async (payload, { rejectWithValue }) => {
    const couponId = getCouponId(payload);
    const triedUrls = [];

    for (const path of couponDetailPaths(couponId)) {
        try {
            triedUrls.push(buildApiUrl(path));
            const { couponId: _couponId, _id, id, ...body } = payload || {};
            const response = await axiosPrivate.patch(path, body);
            return asLegacyData(response);
        } catch (error) {
            const message = getErrorMessage(error);
            if (!shouldTryNextCouponRoute(error)) {
                return rejectWithValue(message || `Failed to update coupon status at ${triedUrls[triedUrls.length - 1]}`);
            }
        }
    }

    return rejectWithValue(`Coupon status API route not found. Tried: ${triedUrls.join(", ")}`);
})

export const softDeleteDiscountCoupons = createAsyncThunk('softDeleteDiscountCoupons', async (payload, { rejectWithValue }) => {
    const couponId = getCouponId(payload);
    const triedUrls = [];

    for (const path of couponDetailPaths(couponId)) {
        try {
            triedUrls.push(buildApiUrl(path));
            const response = await axiosPrivate.delete(path);
            return asLegacyData(response);
        } catch (error) {
            const message = getErrorMessage(error);
            if (!shouldTryNextCouponRoute(error)) {
                return rejectWithValue(message || `Failed to delete coupon at ${triedUrls[triedUrls.length - 1]}`);
            }
        }
    }

    return rejectWithValue(`Coupon delete API route not found. Tried: ${triedUrls.join(", ")}`);
})

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
