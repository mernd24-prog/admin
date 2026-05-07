import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getCityListData: {}, createData: {}, editData: {}, enableDisableCityData: {}, getAllCityListData: {},
     getRibbonsListData:{},deleteRibbonData:{},updateRibbonData:{},createRibbonData:{}
}

export const getCityList = createApiThunkPrivate('getCityList', '/setting/city/getList', 'GET', true)
export const create = createApiThunkPrivate('create', '/setting/city/create', 'POST')
export const edit = createApiThunkPrivate('edit', '/setting/city/update', 'PUT')
export const enableDisableCity = createApiThunkPrivate('enableDisableState', '/setting/city/enableDisable', 'PUT')
export const getAllCityList = createApiThunkPrivate('getAllCityList', '/setting/city/getAllDocuments', 'GET', true)
//////////Ribbons/////////////
export const getRibbonsList=createApiThunkPrivate('getRibbonsList','/ribbon/getList','GET')
export const enableDisableRibbon=createApiThunkPrivate('enableDisableRibbon','/ribbon/enableDisable','PUT')
export const deleteRibbon=createApiThunkPrivate('deleteRibbon','/ribbon/softDelete','DELETE')
export const updateRibbon=createApiThunkPrivate('updateRibbon','/ribbon/update','PUT')
export const createRibbon=createApiThunkPrivate('createRibbon','/ribbon/create')


const citySlice = createSlice({
    name: 'city',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getCityList, 'getCityListData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, edit, 'editData')
        createExtraReducersForThunk(builder, enableDisableCity, 'enableDisableCityData')
        createExtraReducersForThunk(builder, getAllCityList, 'getAllCityListData')
          //##Ribbons//////////
        createExtraReducersForThunk(builder,getRibbonsList,'getRibbonsListData')
        createExtraReducersForThunk(builder,enableDisableRibbon,'enableDisableRibbonData')
        createExtraReducersForThunk(builder,deleteRibbon,'deleteRibbonData')
        createExtraReducersForThunk(builder,updateRibbon,'updateRibbonData')
        createExtraReducersForThunk(builder,createRibbon,'createRibbonData')

    }
})

export default citySlice.reducer