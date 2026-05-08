import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk } from '../_helpers/ApiThunk';
import { unsupportedThunk } from '../_helpers/adminApi';

const initialState = {
    getListData: {}, softDeleteData: {}, enableDisableData: {}, createData: {}, updateData: {},
    getColorListData: {}, createColorData: {}, updateColorData: {}, enableDisableColorData: {}, softDeleteColorData: {},
    getPrivacyPolicyListData: {}, createPrivacyPolicyData: {}, editPrivacyPolicyData: {}, enableDisablePrivacyPolicyData: {}, softDeletePrivacyPolicyData: {}

}

/// pattern functions------------------>>>>>>>>>>>>>>>>>>>>>>>
const PATTERN_UNSUPPORTED_MESSAGE =
  'Pattern, color, and legacy privacy-policy APIs are not exposed by the current backend.';

export const getList = unsupportedThunk('pattern/getList', PATTERN_UNSUPPORTED_MESSAGE);
export const softDelete = unsupportedThunk('pattern/softDelete', PATTERN_UNSUPPORTED_MESSAGE);
export const enableDisable = unsupportedThunk('pattern/enableDisable', PATTERN_UNSUPPORTED_MESSAGE);
export const create = unsupportedThunk('pattern/create', PATTERN_UNSUPPORTED_MESSAGE);
export const update = unsupportedThunk('pattern/update', PATTERN_UNSUPPORTED_MESSAGE);

/// color functions---------------------->>>>>>>>>>>>>>>>>>>>>
export const getColorList = unsupportedThunk('color/getList', PATTERN_UNSUPPORTED_MESSAGE);
export const createColor = unsupportedThunk('color/create', PATTERN_UNSUPPORTED_MESSAGE);
export const updateColor = unsupportedThunk('color/update', PATTERN_UNSUPPORTED_MESSAGE);
export const enableDisableColor = unsupportedThunk('color/enableDisable', PATTERN_UNSUPPORTED_MESSAGE);
export const softDeleteColor = unsupportedThunk('color/softDelete', PATTERN_UNSUPPORTED_MESSAGE);

export const getPrivacyPolicyList = unsupportedThunk('replace-policy/getList', PATTERN_UNSUPPORTED_MESSAGE);
export const createPrivacyPolicy = unsupportedThunk('replace-policy/create', PATTERN_UNSUPPORTED_MESSAGE);
export const editPrivacyPolicy = unsupportedThunk('replace-policy/update', PATTERN_UNSUPPORTED_MESSAGE);
export const enableDisablePrivacyPolicy = unsupportedThunk('replace-policy/enableDisable', PATTERN_UNSUPPORTED_MESSAGE);
export const softDeletePrivacyPolicy = unsupportedThunk('replace-policy/softDelete', PATTERN_UNSUPPORTED_MESSAGE);




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
