import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { deleteMany, firstId, patchMany, toListParams, unsupportedThunk } from '../_helpers/adminApi';

const initialState = {
    getCategoryListData: {},
    createCategory: {},
    updateCategoryData: {},
    deleteCategoryData: {},
    updateCMSCategoryData: {},
    enableDisableCityData: {},
    getAllCityListData: {},
    getCMSContentListData: {},
    createCMSContentListData: {},
    enableDisableCMSData: {},
    updateCMSListData: {},
    softDeleteCMSListData: {},
    getTaxListData: {},
    createTaxListData: {},
    updateTaxListData: {},
    enableDisableTaxListData: {},
    softDeleteTaxListData: {},
    createSubTaxData: {},
    enableDisableSubTaxData: {},
    updateSubTaxData: {},
    softDeleteSubTaxData: {},
    getListTaxRuleData: {},
    createTaxRuleData: {},
    getAllDocumentsData: {},
    updateTaxRuleData: {},
    enableDisableTaxRuleData: {},
    softDeleteTaxRuleData: {},
    getListShippingData: {},
    softDeleteShippingData: {},
    enableDisableShippingData: {},
    createShippingData: {},
    updateShippingData: {},
};

const parseLegacyQuery = (payload = {}) => {
    if (!payload.query) return {};
    if (typeof payload.query === 'object') return payload.query;
    try {
        return JSON.parse(payload.query);
    } catch {
        return {};
    }
};

const slugify = (value = '') =>
    String(value || 'content-page')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'content-page';

const getTaxId = (payload = {}) =>
    payload.taxId || payload.tax_id?.value || payload.tax_id?._id || payload.tax_id;

const getCountryId = (payload = {}) =>
    payload.countryId ||
    payload.country_code?.value ||
    payload.country_code?._id ||
    payload.country_code;

const toContentListParams = (params = {}) => {
    const query = parseLegacyQuery(params);
    return {
        ...toListParams(params),
        ...(params.pageType || query.category_id || params.category_id
            ? { pageType: params.pageType || query.category_id || params.category_id }
            : {}),
        ...(params.language ? { language: params.language } : {}),
        ...(params.published !== undefined ? { published: params.published } : {}),
    };
};

const toContentBody = (payload = {}) => {
    const pageType = payload.pageType || payload.category_id || 'content';
    const title = payload.title || payload.name || 'Untitled';
    return {
        slug: payload.slug || payload.seoUrl || slugify(`${pageType}-${title}`),
        title,
        pageType,
        body: payload.body || payload.content || '',
        language: payload.language || 'en',
        published: payload.published ?? payload.isDisable !== true,
        metadata: payload.metadata || {},
    };
};

const toTaxBody = (payload = {}) => ({
    name: payload.name,
    countryId: getCountryId(payload),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
});

const toSubTaxBody = (payload = {}) => ({
    name: payload.name,
    percentage: payload.percentage || payload.percent,
    taxId: getTaxId(payload),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
});

const toTaxRuleBody = (payload = {}) => ({
    description: payload.description,
    taxId: getTaxId(payload),
    subTaxIds: payload.subTaxIds || payload.subTaxes_id || [],
    category: payload.category || payload.category_id || '',
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.isDisable !== undefined ? { isDisable: payload.isDisable } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
});

const CMS_CATEGORY_UNSUPPORTED_MESSAGE =
  'Legacy CMS category API is not exposed by the current backend.';
const SHIPPING_DURATION_UNSUPPORTED_MESSAGE =
  'Store shipping duration API is not exposed by the current backend.';

export const getCategoryList = unsupportedThunk('getCategoryList', CMS_CATEGORY_UNSUPPORTED_MESSAGE);
export const createCategory = unsupportedThunk('createCategory', CMS_CATEGORY_UNSUPPORTED_MESSAGE);
export const updateCategory = unsupportedThunk('updateCategory', CMS_CATEGORY_UNSUPPORTED_MESSAGE);
export const deleteCategory = unsupportedThunk('deleteCategory', CMS_CATEGORY_UNSUPPORTED_MESSAGE);
export const updateCMSCategory = unsupportedThunk('updateCMSCategory', CMS_CATEGORY_UNSUPPORTED_MESSAGE);
export const enableDisableCategory = unsupportedThunk('enableDisableCategory', CMS_CATEGORY_UNSUPPORTED_MESSAGE);

export const getCMSContentList = createApiThunkPrivate(
    'getCMSContentList',
    ENDPOINTS.platform.contentPages,
    'GET',
    true,
    { transformParams: toContentListParams }
);

export const createCMSContentList = createApiThunkPrivate(
    'createCMSContentList',
    ENDPOINTS.platform.contentPages,
    'POST',
    false,
    { transformBody: toContentBody }
);

export const enableDisableCMS = patchMany(
    'enableDisableCMS',
    ENDPOINTS.platform.contentPage,
    (payload = {}) => ({ published: payload.isDisable !== true }),
    'Status updated successfully'
);

export const updateCMSList = createApiThunkPrivate(
    'updateCMSList',
    (payload) => ENDPOINTS.platform.contentPage(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toContentBody }
);

export const softDeleteCMSList = deleteMany(
    'softDeleteCMSList',
    ENDPOINTS.platform.contentPage,
    'CMS content deleted successfully'
);

export const getTaxList = createApiThunkPrivate(
    'getTaxList',
    ENDPOINTS.common.taxes,
    'GET',
    true,
    {
        transformParams: (params = {}) => ({
            ...toListParams(params),
            ...(getCountryId(params) ? { countryId: getCountryId(params) } : {}),
        }),
    }
);

export const createTaxList = createApiThunkPrivate(
    'createTaxList',
    ENDPOINTS.common.taxes,
    'POST',
    false,
    { transformBody: toTaxBody }
);

export const updateTaxList = createApiThunkPrivate(
    'updateTaxList',
    (payload) => ENDPOINTS.common.tax(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toTaxBody }
);

export const enableDisableTaxList = createApiThunkPrivate(
    'enableDisableTaxList',
    ENDPOINTS.common.taxStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const softDeleteTaxList = deleteMany(
    'softDeleteTaxList',
    ENDPOINTS.common.tax,
    'Tax deleted successfully'
);

export const getListSubTax = createApiThunkPrivate(
    'getListSubTax',
    ENDPOINTS.common.subTaxes,
    'GET',
    true,
    {
        transformParams: (params = {}) => {
            const query = parseLegacyQuery(params);
            const taxId = getTaxId(params) || query.tax_id || query.taxId;
            return {
                ...toListParams(params),
                ...(taxId ? { taxId } : {}),
            };
        },
    }
);

export const createSubTax = createApiThunkPrivate(
    'createSubTax',
    ENDPOINTS.common.subTaxes,
    'POST',
    false,
    { transformBody: toSubTaxBody }
);

export const enableDisableSubTax = createApiThunkPrivate(
    'enableDisableSubTax',
    ENDPOINTS.common.subTaxStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const updateSubTax = createApiThunkPrivate(
    'updateSubTax',
    (payload) => ENDPOINTS.common.subTax(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toSubTaxBody }
);

export const softDeleteSubTax = deleteMany(
    'softDeleteSubTax',
    ENDPOINTS.common.subTax,
    'Sub tax deleted successfully'
);

export const getListTaxRule = createApiThunkPrivate(
    'getListTaxRule',
    ENDPOINTS.common.taxRules,
    'GET',
    true,
    {
        transformParams: (params = {}) => {
            const query = parseLegacyQuery(params);
            const taxId = getTaxId(params) || query.tax_id || query.taxId;
            return {
                ...toListParams(params),
                ...(taxId ? { taxId } : {}),
            };
        },
    }
);

export const createTaxRule = createApiThunkPrivate(
    'createTaxRule',
    ENDPOINTS.common.taxRules,
    'POST',
    false,
    { transformBody: toTaxRuleBody }
);

export const getAllDocuments = createApiThunkPrivate(
    'getAllDocuments',
    ENDPOINTS.common.taxes,
    'GET',
    true,
    { transformParams: (params = {}) => toListParams(params, { limit: 100 }) }
);

export const updateTaxRule = createApiThunkPrivate(
    'updateTaxRule',
    (payload) => ENDPOINTS.common.taxRule(firstId(payload)),
    'PATCH',
    false,
    { transformBody: toTaxRuleBody }
);

export const enableDisableTaxRule = createApiThunkPrivate(
    'enableDisableTaxRule',
    ENDPOINTS.common.taxRuleStatus,
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            ids: payload.ids || payload._id || payload.id,
            isDisable: payload.isDisable,
        }),
    }
);

export const softDeleteTaxRule = deleteMany(
    'softDeleteTaxRule',
    ENDPOINTS.common.taxRule,
    'Tax rule deleted successfully'
);

export const getListShipping = unsupportedThunk('getListShipping', SHIPPING_DURATION_UNSUPPORTED_MESSAGE);
export const softDeleteShipping = unsupportedThunk('softDeleteShipping', SHIPPING_DURATION_UNSUPPORTED_MESSAGE);
export const enableDisableShipping = unsupportedThunk('enableDisableShipping', SHIPPING_DURATION_UNSUPPORTED_MESSAGE);
export const createShipping = unsupportedThunk('createShipping', SHIPPING_DURATION_UNSUPPORTED_MESSAGE);
export const updateShipping = unsupportedThunk('updateShipping', SHIPPING_DURATION_UNSUPPORTED_MESSAGE);

const cmsSlice = createSlice({
    name: 'cms',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getCategoryList, 'getCategoryListData')
        createExtraReducersForThunk(builder, createCategory, 'createCategoryData')
        createExtraReducersForThunk(builder, updateCategory, 'updateCategoryData')
        createExtraReducersForThunk(builder, deleteCategory, 'deleteCategoryData')
        createExtraReducersForThunk(builder, updateCMSCategory, 'updateCMSCategoryData')
        createExtraReducersForThunk(builder, enableDisableCategory, 'enableDisableCategoryData')
        createExtraReducersForThunk(builder, getCMSContentList, 'getCMSContentListData')
        createExtraReducersForThunk(builder, createCMSContentList, 'createCMSContentListData')
        createExtraReducersForThunk(builder, enableDisableCMS, 'enableDisableCMSData')
        createExtraReducersForThunk(builder, updateCMSList, 'updateCMSListData')
        createExtraReducersForThunk(builder, softDeleteCMSList, 'softDeleteCMSListData')
        createExtraReducersForThunk(builder, getTaxList, 'getTaxListData')
        createExtraReducersForThunk(builder, createTaxList, 'createTaxListData')
        createExtraReducersForThunk(builder, updateTaxList, 'updateTaxListData')
        createExtraReducersForThunk(builder, enableDisableTaxList, 'enableDisableTaxListData')
        createExtraReducersForThunk(builder, softDeleteTaxList, 'softDeleteTaxListData')
        createExtraReducersForThunk(builder, getListSubTax, 'getListSubTaxData')
        createExtraReducersForThunk(builder, createSubTax, 'createSubTaxData')
        createExtraReducersForThunk(builder, enableDisableSubTax, 'enableDisableSubTaxData')
        createExtraReducersForThunk(builder, updateSubTax, 'updateSubTaxData')
        createExtraReducersForThunk(builder, softDeleteSubTax, 'softDeleteSubTaxData')
        createExtraReducersForThunk(builder, getListTaxRule, 'getListTaxRuleData')
        createExtraReducersForThunk(builder, createTaxRule, 'createTaxRuleData')
        createExtraReducersForThunk(builder, getAllDocuments, 'getAllDocumentsData')
        createExtraReducersForThunk(builder, updateTaxRule, 'updateTaxRuleData')
        createExtraReducersForThunk(builder, enableDisableTaxRule, 'enableDisableTaxRuleData')
        createExtraReducersForThunk(builder, softDeleteTaxRule, 'softDeleteTaxRuleData')
        createExtraReducersForThunk(builder, getListShipping, 'getListShippingData')
        createExtraReducersForThunk(builder, softDeleteShipping, 'softDeleteShippingData')
        createExtraReducersForThunk(builder, enableDisableShipping, 'enableDisableShippingData')
        createExtraReducersForThunk(builder, createShipping, 'createShippingData')
        createExtraReducersForThunk(builder, updateShipping, 'updateShippingData')
    }
});

export default cmsSlice.reducer
