import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk } from '../_helpers/ApiThunk';
import { unsupportedThunk } from '../_helpers/adminApi';

const initialState = {
    getZipCodeListData: {}, createData: {}, editData: {}, enableDisablezipCodeData: {}, getAllZipCodeListData: {}
}

const ZIP_UNSUPPORTED_MESSAGE =
  'Zip code management API is not exposed by the current backend.';

export const getZipCodeList = unsupportedThunk('getZipCodeList', ZIP_UNSUPPORTED_MESSAGE);
export const create = unsupportedThunk('zipCode/create', ZIP_UNSUPPORTED_MESSAGE);
export const edit = unsupportedThunk('zipCode/edit', ZIP_UNSUPPORTED_MESSAGE);
export const enableDisableZipCode = unsupportedThunk('zipCode/enableDisable', ZIP_UNSUPPORTED_MESSAGE);
export const getAllZipCodeList = unsupportedThunk('getAllZipCodeList', ZIP_UNSUPPORTED_MESSAGE);



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
