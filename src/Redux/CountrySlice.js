import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getCountryListData: {}, createData: {}, editCountryData: {}, enableDisableCountryData: {}, getAllCountryListData: {},
}

export const getCountryList = createApiThunkPrivate('getCountryList', '/setting/country/getList', 'GET')
export const create = createApiThunkPrivate('create', '/setting/country/create', 'POST')
export const editCountry = createApiThunkPrivate('editCountry', '/setting/country/update', 'PUT')
export const enableDisableCountry = createApiThunkPrivate('enableDisableCountry', '/setting/country/enableDisable', 'PUT')
export const getAllCountryList = createApiThunkPrivate('getAllCountryList', '/setting/country/getAllDocuments', 'GET')

/// privacy functions=======>>>>>>>>>>>>>
const countrySlice = createSlice({
    name: 'country',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getCountryList, 'getCountryListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, editCountry, 'editCountryData')
        createExtraReducersForThunk(builder, enableDisableCountry, 'enableDisableCountryData')
        createExtraReducersForThunk(builder, getAllCountryList, 'getAllCountryListData')

        // policy functions======>>>>>>>>>>>>>>


    }
})

export default countrySlice.reducer