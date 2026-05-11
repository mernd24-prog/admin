import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { deleteMany, firstId, patchMany, unsupportedThunk } from '../_helpers/adminApi';

const firstProductId = (payload = {}) => {
    const value = payload.productId || payload.product_id || payload._id || payload.id;
    return Array.isArray(value) ? value[0] : value;
};

const toProductListParams = (params = {}) => ({
    ...(params.page ? { page: Number(params.page) } : {}),
    ...(params.limit || params.size ? { limit: Number(params.limit || params.size) } : {}),
    ...(params.keyWord || params.search || params.q ? { q: params.keyWord || params.search || params.q } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.hsnCode || params.hsn_code ? { hsnCode: params.hsnCode || params.hsn_code } : {}),
    ...(params.color ? { color: params.color } : {}),
    ...(params.country ? { country: params.country } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(params.city ? { city: params.city } : {}),
    ...(params.productFamilyCode ? { productFamilyCode: params.productFamilyCode } : {}),
    ...(params.sku ? { sku: params.sku } : {}),
});

const toProductStatusBody = (payload = {}) => ({
    status: payload.isDisable ? "inactive" : "active",
});

const toHsnListParams = (params = {}) => ({
    ...(params.page ? { page: Number(params.page) } : {}),
    ...(params.limit || params.size ? { limit: Number(params.limit || params.size) } : {}),
    ...(params.keyWord || params.search || params.q ? { q: params.keyWord || params.search || params.q } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.active !== undefined ? { active: params.active } : {}),
});

const toHsnBody = (payload = {}) => ({
    ...(payload.code ? { code: String(payload.code) } : {}),
    description: payload.description || '',
    gstRate: Number(payload.IGST ?? payload.gstRate ?? 0),
    cessRate: Number(payload.additionalTax ?? payload.cessRate ?? 0),
    taxType: payload.taxType || 'gst',
    exempt: Boolean(payload.exempt),
    category: payload.category || '',
    active: payload.active ?? payload.isDisable !== true,
});

const initialState = {
    getListData: {}, softDeleteData: {}, enableDisableData: {}, createData: {}, updateData: {}, getCollectionListData: {},
    createCollectionData: {}, updateCollectionData: {}, deleteCollectionData: {}, enableDisableCollectionData: {}, FinishGetListData: {},
    CreateFinishData: {}, softDeleteFinishData: {}, enableDisableFinishData: {}, getListDimensionData: {}, createDimensionData: {},
    enableDisableDimensionData: {}, softDeleteDimensionData: {}, updateDimensionData: {}, getBrandListData: {}, createBrandData: {},
    updateBrandData: {}, deleteBrandData: {}, enableDisableBrandData: {}, getWarrantyListData: {}, enableDisableWarrantyData: {},
    softDeleteWarrantyData: {}, createWarrantyData: {}, getListProductData: {}, enableDisableProductData: {}, updateProductData: {},
    createProductData: {}, deleteProductData: {}, getListProductOptionData: {}, enableDisableProductOptionData: {}, deleteProductOptionData: {},
    createProductOptionData: {}, updateProductOptionData: {},
    getAllBrandListData: {}, getAllCollectionListData: {}, getAllPatternListData: {}, getAllListDimensionData: {}, getAllFinishListData: {}, getAllColorListData: {},
    getAllWarrantyListData: {}, getAllPrivacyPolicyListData: {}, getAllStoreListData: {}, getAllTaxListData: {}, getAllStoreShippingDurationListData: {}, getAllBatchListData: {}, getAllQtyHeadListData: {},
    productOptionListData: {}, createProductsData: {}, getProductsData: {}, updateProductsData: {}, enableDisableProductCatalogsData: {}, updateProductsByIdData: {},
    deleteProductsData: {}, approveDisapproveData: {}, getAllTaxRulesListData: {}, getAllProductsData: {}, createCategoryData: {},
    getHsnListData: {}, createHsnData: {}, updateHsnData: {}, enableDisableHsnData: {}, softDeleteHsnData: {}, getAllHsnData: {}, downloadSampleCsvData: {},
    uploadHistoryData: {}, getProductsForPurchaseData: {}, getProductStocksData: {}, productModerationQueueData: {},
    getCategoryAttributesData: {}, updateCategoryAttributesData: {}

}
const PRODUCT_LEGACY_UNSUPPORTED_MESSAGE =
    'This legacy product management API is not exposed by the current backend.';

export const getList = createApiThunkPrivate('product/getList', ENDPOINTS.platform.categories, 'GET', true, {
    transformParams: (params = {}) => ({
        ...(params.page ? { page: Number(params.page) } : {}),
        limit: Number(params.limit || params.size || 100),
        ...(params.parentKey ? { parentKey: params.parentKey } : {}),
        ...(params.active !== undefined ? { active: params.active } : {}),
        ...(params.categoryKey ? { categoryKey: params.categoryKey } : {}),
    }),
})
export const softDelete = unsupportedThunk('product/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisable = unsupportedThunk('product/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const create = unsupportedThunk('product/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const update = unsupportedThunk('product/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createCategory = createApiThunkPrivate('product/createCategory', ENDPOINTS.platform.categories, 'POST', false, {
    transformBody: (payload = {}) => {
        const title = payload.title || payload.name || payload.categoryName || '';
        const keyBase = payload.categoryKey || title;
        return {
            categoryKey: String(keyBase).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            title,
            parentKey: payload.parentKey || payload.categoryId || null,
            level: payload.level || (payload.categoryId ? 1 : 0),
            attributeSchema: payload.attributeSchema || [],
            attributesSchema: payload.attributesSchema || {},
            active: payload.active ?? payload.isDisable !== true,
            sortOrder: Number(payload.sortOrder || payload.priority || 0),
        };
    },
})



//collection->>>>>>>>>>>>>
export const getCollectionList = unsupportedThunk('collections/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createCollection = unsupportedThunk('collections/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateCollection = unsupportedThunk('collections/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const deleteCollection = unsupportedThunk('collections/delete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableCollection = unsupportedThunk('collections/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllCollectionList = unsupportedThunk('collections/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)


////Finish->>>>>>>>>>>
export const FinishGetList = unsupportedThunk('finish/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const CreateFinish = unsupportedThunk('finish/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const softDeleteFinish = unsupportedThunk('finish/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableFinish = unsupportedThunk('finish/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateFinish = unsupportedThunk('finish/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllFinishList = unsupportedThunk('finish/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)

////Dimension--->>>>>>>>>>
export const getListDimension = unsupportedThunk('dimension/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createDimension = unsupportedThunk('dimension/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableDimension = unsupportedThunk('dimension/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const softDeleteDimension = unsupportedThunk('dimension/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateDimension = unsupportedThunk('dimension/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllListDimension = unsupportedThunk('dimension/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)


/// brand functions===>>>>>>>>>>>>>>>>>

export const getBrandList = unsupportedThunk('brands/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createBrand = unsupportedThunk('brands/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateBrand = unsupportedThunk('brands/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const deleteBrand = unsupportedThunk('brands/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableBrand = unsupportedThunk('brands/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)

/// batch functions ===>>>>>>>>>>>>>>>>>

export const getBatchList = unsupportedThunk('batch/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE);
export const createBatch = unsupportedThunk('batch/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE);
export const updateBatch = unsupportedThunk('batch/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE);
export const deleteBatch = unsupportedThunk('batch/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE);
export const enableDisableBatch = unsupportedThunk('batch/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE);
export const getAllBatchList = unsupportedThunk('batch/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllQtyHeadList = unsupportedThunk('qtyHead/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)



/// product Warranty===>>>>>>>>>>>>>>>>>
export const getWarrantyList = unsupportedThunk('warranty/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableWarranty = unsupportedThunk('warranty/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const softDeleteWarranty = unsupportedThunk('warranty/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createWarranty = unsupportedThunk('warranty/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateWarranty = unsupportedThunk('warranty/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllWarrantyList = unsupportedThunk('warranty/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)


//product-options
export const getListProduct = unsupportedThunk('product-option/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableProduct = unsupportedThunk('product-option/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateProduct = unsupportedThunk('product-option/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createProduct = unsupportedThunk('product-option/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const deleteProduct = unsupportedThunk('product-option/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getListProductOption = unsupportedThunk('product-option-value/getList', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const enableDisableProductOption = unsupportedThunk('product-option-value/enableDisable', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const deleteProductOption = unsupportedThunk('product-option-value/softDelete', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const createProductOption = unsupportedThunk('product-option-value/create', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const updateProductOption = unsupportedThunk('product-option-value/update', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)

export const getAllPatternList = unsupportedThunk('pattern/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllPrivacyPolicyList = unsupportedThunk('replace-policy/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllStoreList = unsupportedThunk('store/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllStoreShippingDurationList = unsupportedThunk('store-shipping-duration/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getAllTaxRulesList = unsupportedThunk('taxRule/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)


export const createProducts = createApiThunkPrivate('createProducts', ENDPOINTS.products.list, 'POST')
export const getProducts = createApiThunkPrivate('getProducts', ENDPOINTS.products.listForPanel, 'GET', true, {
    transformParams: toProductListParams,
})
export const updateProducts = createApiThunkPrivate('updateProducts', (payload) => ENDPOINTS.products.detail(firstProductId(payload)), 'GET')
export const enableDisableProductCatalogs = patchMany(
    'enableDisableProductCatalogs',
    ENDPOINTS.products.status,
    toProductStatusBody,
    'Product status updated successfully'
)
export const updateProductsById = createApiThunkPrivate('updateProductsById', (payload) => ENDPOINTS.products.detail(firstProductId(payload)), 'PATCH')
export const deleteProducts = createApiThunkPrivate('deleteProducts', (payload) => ENDPOINTS.products.detail(firstProductId(payload)), 'DELETE')
export const approveDisapprove = createApiThunkPrivate('approveDisapprove', (payload) => ENDPOINTS.products.moderate(payload?.productId || payload?._id || payload?.id), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.rejectionReason !== undefined ? { rejectionReason: payload.rejectionReason } : {}),
        ...(payload.checklist ? { checklist: payload.checklist } : {}),
    }),
})
export const getAllProducts = createApiThunkPrivate('getAllProducts', ENDPOINTS.products.listForPanel, 'GET', true, {
    transformParams: toProductListParams,
})
export const getProductModerationQueue = createApiThunkPrivate('getProductModerationQueue', ENDPOINTS.products.moderationQueue, 'GET', true, {
    transformParams: (params = {}) => ({
        ...(params.status ? { status: params.status } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.page ? { page: Number(params.page) } : {}),
        ...(params.limit || params.size ? { limit: Number(params.limit || params.size) } : {}),
    }),
})
export const getCategoryAttributes = createApiThunkPrivate(
    'getCategoryAttributes',
    (payload) => ENDPOINTS.platform.categoryAttributes(payload?.categoryKey || payload?.categoryId || payload?._id || payload?.id),
    'GET',
    true
)
export const updateCategoryAttributes = createApiThunkPrivate(
    'updateCategoryAttributes',
    (payload) => ENDPOINTS.platform.category(payload?.categoryKey || payload?.categoryId || payload?._id || payload?.id),
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            attributeSchema: payload.attributeSchema || [],
        }),
    }
)
export const getAllBrandList = unsupportedThunk('brands/getAllDocuments', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const getProductsForPurchase = unsupportedThunk('erp/product/get-products-for-purchase-order', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)

export const getProductStocks = unsupportedThunk('erp/product/get-product-stocks', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)





/// hsn code==============>>>>>>>>>>>>>>>

export const getHsnList = createApiThunkPrivate('getHsnList', ENDPOINTS.platform.hsnCodes, 'GET', true, {
    transformParams: toHsnListParams,
})
export const enableDisableHsn = patchMany(
    'enableDisableHsn',
    ENDPOINTS.platform.hsnCode,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'HSN status updated successfully'
)
export const softDeleteHsn = deleteMany(
    'softDeleteHsn',
    ENDPOINTS.platform.hsnCode,
    'HSN code deleted successfully'
)
export const createHsn = createApiThunkPrivate('createHsn', ENDPOINTS.platform.hsnCodes, 'POST', false, {
    transformBody: toHsnBody,
})
export const updateHsn = createApiThunkPrivate('updateHsn', (payload) => ENDPOINTS.platform.hsnCode(firstId(payload) || payload.code), 'PATCH', false, {
    transformBody: (payload = {}) => {
        const body = toHsnBody(payload);
        delete body.code;
        return body;
    },
})
export const getAllHsn = createApiThunkPrivate('getAllHsn', ENDPOINTS.platform.hsnCodes, 'GET', true, {
    transformParams: (params = {}) => toHsnListParams({ ...params, limit: params.limit || params.size || 100 }),
})
export const downloadSampleCsv = unsupportedThunk('product/downLoad-sample-csv', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const uploadHistory = unsupportedThunk('product/bulk-upload-history', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)
export const productOptionList = unsupportedThunk('product-option/getOptionsWithValues', PRODUCT_LEGACY_UNSUPPORTED_MESSAGE)



const countrySlice = createSlice({
    name: 'product',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getList, 'getListData')
        createExtraReducersForThunk(builder, softDelete, 'softDeleteData')
        createExtraReducersForThunk(builder, enableDisable, 'enableDisableData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, update, 'updateData')

        // collection ==>>>>>>>>>>>>>
        createExtraReducersForThunk(builder, getCollectionList, 'getCollectionListData')
        createExtraReducersForThunk(builder, createCollection, 'createCollectionData')
        createExtraReducersForThunk(builder, updateCollection, 'updateCollectionData')
        createExtraReducersForThunk(builder, deleteCollection, 'deleteCollectionData')
        createExtraReducersForThunk(builder, enableDisableCollection, 'enableDisableCollectionData')
        // Finish  =====>>>>>>>>>>>
        createExtraReducersForThunk(builder, FinishGetList, 'FinishGetListData')
        createExtraReducersForThunk(builder, CreateFinish, 'CreateFinishData')
        createExtraReducersForThunk(builder, softDeleteFinish, 'softDeleteFinishData')
        createExtraReducersForThunk(builder, enableDisableFinish, 'enableDisableFinishData')
        createExtraReducersForThunk(builder, updateFinish, 'updateFinishData')
        // Dimensions =========>>>>>>>
        createExtraReducersForThunk(builder, getListDimension, 'getListDimensionData')
        createExtraReducersForThunk(builder, createDimension, 'createDimensionData')
        createExtraReducersForThunk(builder, enableDisableDimension, 'enableDisableDimensionData')
        createExtraReducersForThunk(builder, softDeleteDimension, 'softDeleteDimensionData')
        createExtraReducersForThunk(builder, updateDimension, 'updateDimensionData')

        /// Brands Functions===========>>>>>>>>>>

        createExtraReducersForThunk(builder, getBrandList, 'getBrandListData')
        createExtraReducersForThunk(builder, createBrand, 'createBrandData')
        createExtraReducersForThunk(builder, updateBrand, 'updateBrandData')
        createExtraReducersForThunk(builder, deleteBrand, 'deleteBrandData')
        createExtraReducersForThunk(builder, enableDisableBrand, 'enableDisableBrandData')
        /// Product Warranty
        createExtraReducersForThunk(builder, getWarrantyList, 'getWarrantyListData')
        createExtraReducersForThunk(builder, enableDisableWarranty, 'enableDisableWarrantyData')
        createExtraReducersForThunk(builder, softDeleteWarranty, 'softDeleteWarrantyData')
        createExtraReducersForThunk(builder, createWarranty, 'createWarrantyData')
        createExtraReducersForThunk(builder, updateWarranty, 'updateWarrantyData')
        //Product Options
        createExtraReducersForThunk(builder, getListProduct, 'getListProductData')
        createExtraReducersForThunk(builder, enableDisableProduct, 'enableDisableProductData')
        createExtraReducersForThunk(builder, updateProduct, 'updateProductData')
        createExtraReducersForThunk(builder, createProduct, 'createProductData')
        createExtraReducersForThunk(builder, deleteProduct, 'deleteProductData')
        ///Product-Options-Value
        createExtraReducersForThunk(builder, getListProductOption, 'getListProductOptionData')
        createExtraReducersForThunk(builder, enableDisableProductOption, 'enableDisableProductOptionData')
        createExtraReducersForThunk(builder, deleteProductOption, 'deleteProductOptionData')
        createExtraReducersForThunk(builder, createProductOption, 'createProductOptionData')
        createExtraReducersForThunk(builder, updateProductOption, 'updateProductOptionData')

        createExtraReducersForThunk(builder, getAllBrandList, 'getAllBrandListData')
        createExtraReducersForThunk(builder, getAllCollectionList, 'getAllCollectionListData')
        createExtraReducersForThunk(builder, getAllPatternList, 'getAllPatternListData')
        createExtraReducersForThunk(builder, getAllListDimension, 'getAllListDimensionData')
        createExtraReducersForThunk(builder, getAllFinishList, 'getAllFinishListData')
        createExtraReducersForThunk(builder, getAllPrivacyPolicyList, 'getAllPrivacyPolicyListData')
        createExtraReducersForThunk(builder, getAllStoreList, 'getAllStoreListData')
        createExtraReducersForThunk(builder, getAllStoreShippingDurationList, 'getAllStoreShippingDurationListData')
        createExtraReducersForThunk(builder, createProducts, 'createProductsData')
        createExtraReducersForThunk(builder, getProducts, 'getProductsData')
        createExtraReducersForThunk(builder, updateProducts, 'updateProductsData')
        createExtraReducersForThunk(builder, enableDisableProductCatalogs, 'enableDisableProductCatalogsData')
        createExtraReducersForThunk(builder, updateProductsById, 'updateProductsByIdData')
        createExtraReducersForThunk(builder, deleteProducts, 'deleteProductsData')
        createExtraReducersForThunk(builder, approveDisapprove, 'approveDisapproveData')
        createExtraReducersForThunk(builder, getAllBatchList, 'getAllBatchListData')
        createExtraReducersForThunk(builder, getAllQtyHeadList, 'getAllQtyHeadListData')
        createExtraReducersForThunk(builder, getAllTaxRulesList, 'getAllTaxRulesListData')
        createExtraReducersForThunk(builder, getAllWarrantyList, 'getAllWarrantyListData')
        createExtraReducersForThunk(builder, getAllProducts, 'getAllProductsData')
        createExtraReducersForThunk(builder, getProductModerationQueue, 'productModerationQueueData')
        createExtraReducersForThunk(builder, createCategory, 'createCategoryData')
        createExtraReducersForThunk(builder, getCategoryAttributes, 'getCategoryAttributesData')
        createExtraReducersForThunk(builder, updateCategoryAttributes, 'updateCategoryAttributesData')

        createExtraReducersForThunk(builder, getHsnList, 'getHsnListData')
        createExtraReducersForThunk(builder, createHsn, 'createHsnData')
        createExtraReducersForThunk(builder, updateHsn, 'updateHsnData')
        createExtraReducersForThunk(builder, enableDisableHsn, 'enableDisableHsnData')
        createExtraReducersForThunk(builder, softDeleteHsn, 'softDeleteHsnData')
        createExtraReducersForThunk(builder, getAllHsn, 'getAllHsnData')
        createExtraReducersForThunk(builder, downloadSampleCsv, 'downloadSampleCsvData')
        createExtraReducersForThunk(builder, uploadHistory, 'uploadHistoryData')
        createExtraReducersForThunk(builder, productOptionList, 'productOptionListData')
        createExtraReducersForThunk(builder, getProductsForPurchase, 'getProductsForPurchaseData')

        createExtraReducersForThunk(builder, getProductStocks, 'getProductStocksData')


    }
})

export default countrySlice.reducer
