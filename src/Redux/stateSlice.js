import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getStateListData: {}, createData: {}, editStateData: {}, enableDisableStateData: {},
    getCityListData: {}
}
/// state functions
export const getStateList = createApiThunkPrivate('getStateList', '/setting/state/getList', 'GET', true)
export const create = createApiThunkPrivate('create', '/setting/state/create', 'POST')
export const editState = createApiThunkPrivate('editState', '/setting/state/update', 'PUT')
export const enableDisableState = createApiThunkPrivate('enableDisableState', '/setting/state/enableDisable', 'PUT')
export const getAllStateList = createApiThunkPrivate('getAllStateList', '/setting/state/getAllDocuments', 'GET', true)


//city function

// export const getCityList = createApiThunkPrivate('getStateList', '/setting/city/getList', 'GET', true)
const stateSlice = createSlice({
    name: 'state',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getStateList, 'getStateListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, editState, 'editStateData')
        createExtraReducersForThunk(builder, enableDisableState, 'enableDisableStateData')
        createExtraReducersForThunk(builder, getAllStateList, 'getAllStateListData')

        //city reducer
        // createExtraReducersForThunk(builder, getCityList, 'getCityListData')



    }
})

export default stateSlice.reducer