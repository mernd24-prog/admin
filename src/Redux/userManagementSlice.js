import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import {
    DEFAULT_PLATFORM_MODULES,
    firstId,
    normalizeAllowedModules,
    patchMany,
    toKycReviewBody,
    toListParams,
    toSellerRegisterBody,
    toSubAdminCreateBody,
    toUserUpdateBody,
    toVendorStatusBody,
    unsupportedThunk,
} from '../_helpers/adminApi';

const initialState = {
    getListData: {},
    enableDisableData: {},
    updatePasswordData: {},
    createData: {},
    updateData: {},
    getAdminUserDetailsData: {},
    getAllModulePermissionData: {},
    updateModulePermissionData: {},
    getAllModulePermissionForUserData: {},
    getSellerListData: {},
    enableDisableSellerData: {},
    createSellerData: {},
    updateSellerData: {},
    updatePasswordSellerData: {},
    changePasswordData: {},
    getUserListData: {},
    enableDisableUserData: {},
    updatePasswordUserData: {},
    getUserAddressListData: {},
    getListCategoryData: {},
    getAllUserListData: {},
    reviewSellerKycData: {},
};

export const getList = createApiThunkPrivate(
    'getList',
    ENDPOINTS.adminAccess.subAdmins,
    'GET',
    true,
    {
        transformParams: (params = {}) => params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {},
    }
);

export const enableDisable = patchMany(
    'enableDisable',
    ENDPOINTS.users.adminUser,
    toUserUpdateBody,
    'Status updated successfully'
);

export const updatePassword = unsupportedThunk(
    'updatePassword',
    'Admin password reset for another user is not available in the backend. Use the forgot/reset password flow.'
);

export const create = createApiThunkPrivate(
    'create',
    ENDPOINTS.adminAccess.subAdmins,
    'POST',
    false,
    { transformBody: (payload = {}) => toSubAdminCreateBody(payload, DEFAULT_PLATFORM_MODULES) }
);

export const update = createApiThunkPrivate(
    'update',
    (payload) => ENDPOINTS.users.adminUser(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toUserUpdateBody }
);

export const getAdminUserDetails = createApiThunkPrivate(
    'getAdminUserDetails',
    (payload) => ENDPOINTS.users.adminUser(firstId(payload)),
    'GET',
    true
);

export const getAllModulePermission = createApiThunkPrivate(
    'getAllModulePermission',
    ENDPOINTS.adminAccess.modules,
    'GET',
    true,
    {
        transformParams: (params = {}) => {
            const result = {
                includePermissions: params.includePermissions !== false,
                ...(params.roleId ? { roleId: params.roleId } : {}),
                ...(params.roleSlug ? { roleSlug: params.roleSlug } : {}),
                ...(params._id ? { userId: params._id } : {}),
            };
            
            // Only add role parameter if explicitly provided and not 'admin'
            if (params.role && params.role !== 'admin') {
                result.role = params.role;
            }
            
            return result;
        },
    }
);

export const updateModulePermission = createApiThunkPrivate(
    'updateModulePermission',
    (payload) => ENDPOINTS.adminAccess.subAdminModules(firstId(payload)),
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            allowedModules: normalizeAllowedModules(payload.allowedModules, []),
        }),
    }
);

export const getAllModulePermissionForUser = createApiThunkPrivate(
    'getAllModulePermissionForUser',
    (payload) => ENDPOINTS.users.adminUser(firstId(payload)),
    'GET',
    true
);

export const getSellerList = createApiThunkPrivate(
    'getSellerList',
    ENDPOINTS.sellers.vendors,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params) }
);

export const enableDisableSeller = patchMany(
    'enableDisableSeller',
    ENDPOINTS.sellers.vendorStatus,
    toVendorStatusBody,
    'Seller status updated successfully'
);

export const createSeller = createApiThunkPrivate(
    'createSeller',
    ENDPOINTS.auth.register,
    'POST',
    false,
    { transformBody: toSellerRegisterBody }
);

export const updateSeller = createApiThunkPrivate(
    'updateSeller',
    (payload) => ENDPOINTS.users.adminUser(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toUserUpdateBody }
);

export const updatePasswordSeller = unsupportedThunk(
    'updatePasswordSeller',
    'Seller password reset is not available from admin APIs. Use the forgot/reset password flow.'
);

export const reviewSellerKyc = createApiThunkPrivate(
    'reviewSellerKyc',
    (payload) => ENDPOINTS.sellers.kycReview(payload?.sellerId || firstId(payload)),
    'PATCH',
    false,
    { transformBody: toKycReviewBody }
);

export const changePassword = createApiThunkPrivate(
    'changePassword',
    ENDPOINTS.auth.changePassword,
    'POST',
    false,
    {
        transformBody: (payload = {}) => ({
            currentPassword: payload.currentPassword,
            newPassword: payload.newPassword || payload.password,
        }),
    }
);

export const getUserList = createApiThunkPrivate(
    'getUserList',
    ENDPOINTS.users.adminUsers,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params, { role: params.role || 'buyer' }) }
);

export const enableDisableUser = patchMany(
    'enableDisableUser',
    ENDPOINTS.users.adminUser,
    toUserUpdateBody,
    'Status updated successfully'
);

export const updatePasswordUser = unsupportedThunk(
    'updatePasswordUser',
    'User password reset is not available from admin APIs. Use the forgot/reset password flow.'
);

export const getUserAddressList = unsupportedThunk(
    'getUserAddressList',
    'Admin user-address listing is not exposed by the backend API.'
);

export const getListCategory = createApiThunkPrivate(
    'getListCategory',
    ENDPOINTS.platform.categories,
    'GET',
    true,
    { transformParams: () => ({ limit: 100 }) }
);

export const getAllUserList = createApiThunkPrivate(
    'getAllUserList',
    ENDPOINTS.users.adminUsers,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params) }
);

const userManagementSlice = createSlice({
    name: 'user',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getList, 'getListData')
        createExtraReducersForThunk(builder, enableDisable, 'enableDisableData')
        createExtraReducersForThunk(builder, updatePassword, 'updatePasswordData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, update, 'updateData')
        createExtraReducersForThunk(builder, getAdminUserDetails, 'getAdminUserDetailsData')
        createExtraReducersForThunk(builder, getAllModulePermission, 'getAllModulePermissionData')
        createExtraReducersForThunk(builder, updateModulePermission, 'updateModulePermissionData')
        createExtraReducersForThunk(builder, getSellerList, 'getSellerListData')
        createExtraReducersForThunk(builder, enableDisableSeller, 'enableDisableSellerData')
        createExtraReducersForThunk(builder, createSeller, 'createSellerData')
        createExtraReducersForThunk(builder, updateSeller, 'updateSellerData')
        createExtraReducersForThunk(builder, getAllModulePermissionForUser, 'getAllModulePermissionForUserData')
        createExtraReducersForThunk(builder, updatePasswordSeller, 'updatePasswordSellerData')
        createExtraReducersForThunk(builder, reviewSellerKyc, 'reviewSellerKycData')
        createExtraReducersForThunk(builder, changePassword, 'changePasswordData')
        createExtraReducersForThunk(builder, getUserList, 'getUserListData')
        createExtraReducersForThunk(builder, enableDisableUser, 'enableDisableUserData')
        createExtraReducersForThunk(builder, updatePasswordUser, 'updatePasswordUserData')
        createExtraReducersForThunk(builder, getUserAddressList, 'getUserAddressListData')
        createExtraReducersForThunk(builder, getListCategory, 'getListCategoryData')
        createExtraReducersForThunk(builder, getAllUserList, 'getAllUserListData')
    }
})

export default userManagementSlice.reducer
