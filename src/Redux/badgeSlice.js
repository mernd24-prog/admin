import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getListData: {}, createData: {}, editData: {}, enableDisableData: {}, softDeleteBadgeData: {},
    getQtyHeadListData: {}, createQtyHeadData: {}, editQtyHeadData: {}, enableDisableQtyHeadData: {}, softDeleteQtyHeadData: {}
}

export const getBadgeList = createApiThunkPrivate('getBadgeList', '/badge/getList', 'GET')
export const createBadge = createApiThunkPrivate('createBadge', '/badge/create', 'POST')
export const editBadge = createApiThunkPrivate('editBadge', '/badge/update', 'PUT')
export const enableDisableBadge = createApiThunkPrivate('enableDisableBadge', '/badge/enableDisable', 'PUT')
export const softDeleteBadge = createApiThunkPrivate('softDeleteBadge', '/badge/softDelete', 'DELETE')

export const getQtyHeadList = createApiThunkPrivate('getQtyHeadList', '/qtyHead/getList', 'GET')
export const createQtyHead = createApiThunkPrivate('createQtyHead', '/qtyHead/create', 'POST')
export const editQtyHead = createApiThunkPrivate('editQtyHead', '/qtyHead/update', 'PUT')
export const enableDisableQtyHead = createApiThunkPrivate('enableDisableQtyHead', '/qtyHead/enableDisable', 'PUT')
export const softDeleteQtyHead = createApiThunkPrivate('softDeleteQtyHead', '/qtyHead/softDelete', 'DELETE')

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