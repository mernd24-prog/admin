import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { firstId, toListParams } from '../_helpers/adminApi';

const initialState = {
    getStateListData: {},
    createData: {},
    editStateData: {},
    enableDisableStateData: {},
    getAllStateListData: {},
    getCityListData: {},
};

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

const toStateBody = (payload = {}) => ({
    name: payload.name,
    countryId: getCountryId(payload),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
});

export const getStateList = createApiThunkPrivate(
    'getStateList',
    ENDPOINTS.common.states,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params),
            ...(getCountryId(params) || parseLegacyQuery(params).country_code
                ? { countryId: getCountryId(params) || parseLegacyQuery(params).country_code }
                : {}),
        }),
    }
);

export const create = createApiThunkPrivate(
    'create',
    ENDPOINTS.common.states,
    'POST',
    false,
    { transformBody: toStateBody }
);

export const editState = createApiThunkPrivate(
    'editState',
    (payload) => ENDPOINTS.common.state(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toStateBody }
);

export const enableDisableState = createApiThunkPrivate(
    'enableDisableState',
    ENDPOINTS.common.stateStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const getAllStateList = createApiThunkPrivate(
    'getAllStateList',
    ENDPOINTS.common.states,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params, { limit: 100 }),
            ...(getCountryId(params) || parseLegacyQuery(params).country_code
                ? { countryId: getCountryId(params) || parseLegacyQuery(params).country_code }
                : {}),
        }),
    }
);

const stateSlice = createSlice({
    name: 'state',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getStateList, 'getStateListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, editState, 'editStateData')
        createExtraReducersForThunk(builder, enableDisableState, 'enableDisableStateData')
        createExtraReducersForThunk(builder, getAllStateList, 'getAllStateListData')
    }
});

export default stateSlice.reducer
