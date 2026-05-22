import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { firstId, toListParams, toSellerRegisterBody, toUserUpdateBody, toVendorStatusBody } from '../_helpers/adminApi';

const initialState = {
    getShopListData: {}, createData: {}, editData: {}, enableDisableData: {}, getAllSellerListData: {}
}

export const getShopList = createApiThunkPrivate(
    'getShopList',
    ENDPOINTS.sellers.list,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params) }
)
export const create = createApiThunkPrivate(
    'create',
    ENDPOINTS.users.adminUsers,
    'POST',
    false,
    { transformBody: toSellerRegisterBody }
)
export const edit = createApiThunkPrivate(
    'edit',
    (payload) => ENDPOINTS.users.adminUser(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toUserUpdateBody }
)
export const enableDisable = createApiThunkPrivate(
    'enableDisable',
    (payload) => ENDPOINTS.sellers.adminStatus(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toVendorStatusBody }
)
export const getAllSellerList = createApiThunkPrivate(
    'getAllSellerList',
    ENDPOINTS.sellers.list,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params, { limit: 100 }) }
)


const storeSlice = createSlice({
    name: 'store',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getShopList, 'getShopListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, edit, 'editData')
        createExtraReducersForThunk(builder, enableDisable, 'enableDisableData')
        // createExtraReducersForThunk(builder, getAllCountryList, 'getAllCountryListData')

        createExtraReducersForThunk(builder, getAllSellerList, 'getAllSellerListData')

    }
})

export default storeSlice.reducer 
