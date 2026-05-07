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
    getRibbonsListData: {},
    deleteRibbonData: {},
    updateRibbonData: {},
    createRibbonData: {},
};

const getStateId = (payload = {}) =>
    payload.stateId ||
    payload.state_code?.value ||
    payload.state_code?._id ||
    payload.state_code ||
    payload.state?.value ||
    payload.state?._id ||
    payload.state;

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
            ...(getStateId(params) || parseLegacyQuery(params).state_code
                ? { stateId: getStateId(params) || parseLegacyQuery(params).state_code }
                : {}),
        }),
    }
);

//////////Ribbons/////////////
export const getRibbonsList = createApiThunkPrivate('getRibbonsList', '/ribbon/getList', 'GET')
export const enableDisableRibbon = createApiThunkPrivate('enableDisableRibbon', '/ribbon/enableDisable', 'PUT')
export const deleteRibbon = createApiThunkPrivate('deleteRibbon', '/ribbon/softDelete', 'DELETE')
export const updateRibbon = createApiThunkPrivate('updateRibbon', '/ribbon/update', 'PUT')
export const createRibbon = createApiThunkPrivate('createRibbon', '/ribbon/create')

const citySlice = createSlice({
    name: 'city',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getCityList, 'getCityListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, edit, 'editData')
        createExtraReducersForThunk(builder, enableDisableCity, 'enableDisableCityData')
        createExtraReducersForThunk(builder, getAllCityList, 'getAllCityListData')
        createExtraReducersForThunk(builder, getRibbonsList, 'getRibbonsListData')
        createExtraReducersForThunk(builder, enableDisableRibbon, 'enableDisableRibbonData')
        createExtraReducersForThunk(builder, deleteRibbon, 'deleteRibbonData')
        createExtraReducersForThunk(builder, updateRibbon, 'updateRibbonData')
        createExtraReducersForThunk(builder, createRibbon, 'createRibbonData')
    }
});

export default citySlice.reducer
