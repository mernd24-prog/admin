import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { firstId, toListParams } from '../_helpers/adminApi';

const initialState = {
    getCountryListData: {},
    createData: {},
    editCountryData: {},
    enableDisableCountryData: {},
    getAllCountryListData: {},
};

const toCountryBody = (payload = {}) => ({
    name: payload.name,
    code: payload.code,
    dialCode: payload.dialCode || payload.dial_code || '',
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
});

export const getCountryList = createApiThunkPrivate(
    'getCountryList',
    ENDPOINTS.common.countries,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params) }
);

export const create = createApiThunkPrivate(
    'create',
    ENDPOINTS.common.countries,
    'POST',
    false,
    { transformBody: toCountryBody }
);

export const editCountry = createApiThunkPrivate(
    'editCountry',
    (payload) => ENDPOINTS.common.country(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toCountryBody }
);

export const enableDisableCountry = createApiThunkPrivate(
    'enableDisableCountry',
    ENDPOINTS.common.countryStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const getAllCountryList = createApiThunkPrivate(
    'getAllCountryList',
    ENDPOINTS.common.countries,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params, { limit: 100 }) }
);

const countrySlice = createSlice({
    name: 'country',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getCountryList, 'getCountryListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, editCountry, 'editCountryData')
        createExtraReducersForThunk(builder, enableDisableCountry, 'enableDisableCountryData')
        createExtraReducersForThunk(builder, getAllCountryList, 'getAllCountryListData')
    }
});

export default countrySlice.reducer
