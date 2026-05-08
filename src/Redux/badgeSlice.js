import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk } from '../_helpers/ApiThunk';
import { unsupportedThunk } from '../_helpers/adminApi';

const initialState = {
    getListData: {}, createData: {}, editData: {}, enableDisableData: {}, softDeleteBadgeData: {},
    getQtyHeadListData: {}, createQtyHeadData: {}, editQtyHeadData: {}, enableDisableQtyHeadData: {}, softDeleteQtyHeadData: {}
}

const BADGE_UNSUPPORTED_MESSAGE =
  'Badge and quantity-head APIs are not exposed by the current backend.';

export const getBadgeList = unsupportedThunk('getBadgeList', BADGE_UNSUPPORTED_MESSAGE);
export const createBadge = unsupportedThunk('createBadge', BADGE_UNSUPPORTED_MESSAGE);
export const editBadge = unsupportedThunk('editBadge', BADGE_UNSUPPORTED_MESSAGE);
export const enableDisableBadge = unsupportedThunk('enableDisableBadge', BADGE_UNSUPPORTED_MESSAGE);
export const softDeleteBadge = unsupportedThunk('softDeleteBadge', BADGE_UNSUPPORTED_MESSAGE);

export const getQtyHeadList = unsupportedThunk('getQtyHeadList', BADGE_UNSUPPORTED_MESSAGE);
export const createQtyHead = unsupportedThunk('createQtyHead', BADGE_UNSUPPORTED_MESSAGE);
export const editQtyHead = unsupportedThunk('editQtyHead', BADGE_UNSUPPORTED_MESSAGE);
export const enableDisableQtyHead = unsupportedThunk('enableDisableQtyHead', BADGE_UNSUPPORTED_MESSAGE);
export const softDeleteQtyHead = unsupportedThunk('softDeleteQtyHead', BADGE_UNSUPPORTED_MESSAGE);

const badgeSlice = createSlice({
    name: 'badge',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getBadgeList, 'getListData')
        createExtraReducersForThunk(builder, createBadge, 'createData')
        createExtraReducersForThunk(builder, editBadge, 'editData')
        createExtraReducersForThunk(builder, enableDisableBadge, 'enableDisableData')
        createExtraReducersForThunk(builder, softDeleteBadge, 'softDeleteBadgeData')

        createExtraReducersForThunk(builder, getQtyHeadList, 'getQtyHeadListData')
        createExtraReducersForThunk(builder, createQtyHead, 'createQtyHeadData')
        createExtraReducersForThunk(builder, editQtyHead, 'editQtyHeadData')
        createExtraReducersForThunk(builder, enableDisableQtyHead, 'enableDisableQtyHeadData')
        createExtraReducersForThunk(builder, softDeleteQtyHead, 'softDeleteQtyHeadData')

    }
})

export default badgeSlice.reducer 
