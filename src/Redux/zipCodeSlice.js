import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getZipCodeListData: {}, createData: {}, editData: {}, enableDisablezipCodeData: {}, getAllZipCodeListData: {}
}

export const getZipCodeList = createApiThunkPrivate('getZipCodeList', '/setting/zipCode/getList', 'GET', true)
export const create = createApiThunkPrivate('create', '/setting/zipCode/create', 'POST')
export const edit = createApiThunkPrivate('edit', '/setting/zipCode/update', 'PUT')
export const enableDisableZipCode = createApiThunkPrivate('enableDisableState', '/setting/zipCode/enableDisable', 'PUT')
export const getAllZipCodeList = createApiThunkPrivate('getAllZipCodeList', '/setting/zipCode/getAllDocuments', 'GET', true)



const zipCodeSlice = createSlice({
    name: 'zipCode',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getZipCodeList, 'getZipCodeListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, edit, 'editData')
        createExtraReducersForThunk(builder, enableDisableZipCode, 'enableDisableZipCodeData')
        createExtraReducersForThunk(builder, getAllZipCodeList, 'getAllZipCodeListData')

    }
})

export default zipCodeSlice.reducer