import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getListData: {}, softDeleteData: {}, enableDisableData: {}, createData: {}, updateData: {},
    getColorListData: {}, createColorData: {}, updateColorData: {}, enableDisableColorData: {}, softDeleteColorData: {},
    getPrivacyPolicyListData: {}, createPrivacyPolicyData: {}, editPrivacyPolicyData: {}, enableDisablePrivacyPolicyData: {}, softDeletePrivacyPolicyData: {}

}

/// pattern functions------------------>>>>>>>>>>>>>>>>>>>>>>>
export const getList = createApiThunkPrivate('getList', '/pattern/getList', 'GET')
export const softDelete = createApiThunkPrivate('softDelete', '/pattern/softDelete', 'DELETE')
export const enableDisable = createApiThunkPrivate('enableDisable', '/pattern/enableDisable', 'PUT')
export const create = createApiThunkPrivate('create', '/pattern/create')
export const update = createApiThunkPrivate('update', '/pattern/update', 'PUT')

/// color functions---------------------->>>>>>>>>>>>>>>>>>>>>
export const getColorList = createApiThunkPrivate('getColorList', '/color/getList', 'GET')
export const createColor = createApiThunkPrivate('createColor', '/color/create', 'POST')
export const updateColor = createApiThunkPrivate('updateColor', '/color/update', 'PUT')
export const enableDisableColor = createApiThunkPrivate('enableDisableColor', '/color/enableDisable', 'PUT')
export const softDeleteColor = createApiThunkPrivate('softDeleteColor', '/color/softDelete', 'DELETE')

export const getPrivacyPolicyList = createApiThunkPrivate('getPrivacyPolicyList', '/replace-policy/getList', 'GET')
export const createPrivacyPolicy = createApiThunkPrivate('createPrivacyPolicy', '/replace-policy/create', 'POST')
export const editPrivacyPolicy = createApiThunkPrivate('editPrivacyPolicy', '/replace-policy/update', 'PUT')
export const enableDisablePrivacyPolicy = createApiThunkPrivate('enableDisablePrivacyPolicy', '/replace-policy/enableDisable', 'PUT')
export const softDeletePrivacyPolicy = createApiThunkPrivate('softDeletePrivacyPolicy', '/replace-policy/softDelete', 'DELETE')




const patternSlice = createSlice({
    name: 'pattern',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getList, 'getListData')
        createExtraReducersForThunk(builder, softDelete, 'softDeleteData')
        createExtraReducersForThunk(builder, enableDisable, 'enableDisableData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, update, 'updateData')

        /// color functions ---------------->>>>>>>>>>>>>>>>
        createExtraReducersForThunk(builder, getColorList, 'getColorListData')
        createExtraReducersForThunk(builder, createColor, 'createColorData')
        createExtraReducersForThunk(builder, updateColor, 'updateColorData')
        createExtraReducersForThunk(builder, enableDisableColor, 'enableDisableColorData')
        createExtraReducersForThunk(builder, softDeleteColor, 'softDeleteColorData')
        /// privacy policy functions=============>>>>>>>>>>>>>>>

        createExtraReducersForThunk(builder, getPrivacyPolicyList, 'getPrivacyPolicyListData')
        createExtraReducersForThunk(builder, createPrivacyPolicy, 'createPrivacyPolicyData')
        createExtraReducersForThunk(builder, editPrivacyPolicy, 'editPrivacyPolicyData')
        createExtraReducersForThunk(builder, enableDisablePrivacyPolicy, 'enableDisablePrivacyPolicyData')
        createExtraReducersForThunk(builder, softDeletePrivacyPolicy, 'softDeletePrivacyPolicyData')


    }
})

export default patternSlice.reducer