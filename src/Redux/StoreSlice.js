import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getShopListData: {}, createData: {}, editData: {}, enableDisableData: {}, getAllSellerListData: {},updatePasswordData:{}
}

export const getShopList = createApiThunkPrivate('getShopList', '/store/getList', 'GET')
export const create = createApiThunkPrivate('create', '/store/create', 'POST')
export const edit = createApiThunkPrivate('const', '/store/update', 'PUT')
export const enableDisable = createApiThunkPrivate('enableDisable', '/store/enableDisable', 'PUT')
export const getAllSellerList = createApiThunkPrivate('getAllSellerList', '/seller/getAllDocuments', 'GET')


export const updatePassword = createApiThunkPrivate('updatePassword', '/store/updatePassword', 'PUT')


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
        createExtraReducersForThunk(builder, updatePassword, 'updatePasswordData')

    }
})

export default storeSlice.reducer 