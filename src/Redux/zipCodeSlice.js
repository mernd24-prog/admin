import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { firstId, toListParams } from '../_helpers/adminApi';

const initialState = {
    getZipCodeListData: {},
    createData: {},
    editData: {},
    enableDisableZipCodeData: {},
    getAllZipCodeListData: {},
};

const toZipCodeBody = (payload = {}) => ({
    zipCode: payload.zipCode,
    areaName: payload.areaName || '',
    countryId: payload.countryId,
    stateId: payload.stateId,
    cityId: payload.cityId,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    serviceable: payload.serviceable ?? true,
    codAvailable: payload.codAvailable ?? true,
    expressDelivery: payload.expressDelivery ?? false,
    deliveryCharge: Number(payload.deliveryCharge || 0),
    minOrderAmount: Number(payload.minOrderAmount || 0),
    estimatedDeliveryDays: Number(payload.estimatedDeliveryDays || 5),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
});

export const getZipCodeList = createApiThunkPrivate(
    'getZipCodeList',
    ENDPOINTS.common.zipCodes,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params),
            ...(params.cityId ? { cityId: params.cityId } : {}),
            ...(params.stateId ? { stateId: params.stateId } : {}),
            ...(params.countryId ? { countryId: params.countryId } : {}),
        }),
    }
);

export const create = createApiThunkPrivate(
    'createZipCode',
    ENDPOINTS.common.zipCodes,
    'POST',
    false,
    { transformBody: toZipCodeBody }
);

export const edit = createApiThunkPrivate(
    'editZipCode',
    (payload) => ENDPOINTS.common.zipCode(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toZipCodeBody }
);

export const enableDisableZipCode = createApiThunkPrivate(
    'enableDisableZipCode',
    ENDPOINTS.common.zipCodeStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const getAllZipCodeList = createApiThunkPrivate(
    'getAllZipCodeList',
    ENDPOINTS.common.zipCodes,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params, { limit: 100 }),
            ...(params.cityId ? { cityId: params.cityId } : {}),
            ...(params.stateId ? { stateId: params.stateId } : {}),
            ...(params.countryId ? { countryId: params.countryId } : {}),
        }),
    }
);

const zipCodeSlice = createSlice({
    name: 'zipCode',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getZipCodeList, 'getZipCodeListData');
        createExtraReducersForThunk(builder, create, 'createData');
        createExtraReducersForThunk(builder, edit, 'editData');
        createExtraReducersForThunk(builder, enableDisableZipCode, 'enableDisableZipCodeData');
        createExtraReducersForThunk(builder, getAllZipCodeList, 'getAllZipCodeListData');
    }
});

export default zipCodeSlice.reducer;
