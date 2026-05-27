import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { firstId, toListParams } from '../_helpers/adminApi';

const initialState = {
    getCityListData: {},
    createData: {},
    editData: {},
    enableDisableCityData: {},
    getAllCityListData: {},
};

const getStateId = (payload = {}) =>
    payload.stateId ||
    payload.state_code?.value ||
    payload.state_code?._id ||
    payload.state_code ||
    payload.state?.value ||
    payload.state?._id ||
    payload.state;

const getCountryId = (payload = {}) =>
    payload.countryId ||
    payload.country_code?.value ||
    payload.country_code?._id ||
    payload.country_code ||
    payload.country?.value ||
    payload.country?._id ||
    payload.country;

const parseLegacyQuery = (payload = {}) => {
    if (!payload.query) return {};
    if (typeof payload.query === 'object') return payload.query;
    try {
        return JSON.parse(payload.query);
    } catch {
        return {};
    }
};

const toCityBody = (payload = {}) => ({
    name: payload.name,
    stateId: getStateId(payload),
    ...(getCountryId(payload) ? { countryId: getCountryId(payload) } : {}),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
});

export const getCityList = createApiThunkPrivate(
    'getCityList',
    ENDPOINTS.common.cities,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params),
            ...(getCountryId(params) || parseLegacyQuery(params).country_code
                ? { countryId: getCountryId(params) || parseLegacyQuery(params).country_code }
                : {}),
            ...(getStateId(params) || parseLegacyQuery(params).state_code
                ? { stateId: getStateId(params) || parseLegacyQuery(params).state_code }
                : {}),
        }),
    }
);

export const create = createApiThunkPrivate(
    'create',
    ENDPOINTS.common.cities,
    'POST',
    false,
    { transformBody: toCityBody }
);

export const edit = createApiThunkPrivate(
    'edit',
    (payload) => ENDPOINTS.common.city(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toCityBody }
);

export const enableDisableCity = createApiThunkPrivate(
    'enableDisableCity',
    ENDPOINTS.common.cityStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const getAllCityList = createApiThunkPrivate(
    'getAllCityList',
    ENDPOINTS.common.cities,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params, { limit: 100 }),
            ...(getCountryId(params) || parseLegacyQuery(params).country_code
                ? { countryId: getCountryId(params) || parseLegacyQuery(params).country_code }
                : {}),
            ...(getStateId(params) || parseLegacyQuery(params).state_code
                ? { stateId: getStateId(params) || parseLegacyQuery(params).state_code }
                : {}),
        }),
    }
);


const citySlice = createSlice({
    name: 'city',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getCityList, 'getCityListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, edit, 'editData')
        createExtraReducersForThunk(builder, enableDisableCity, 'enableDisableCityData')
        createExtraReducersForThunk(builder, getAllCityList, 'getAllCityListData')
    }
});

export default citySlice.reducer
