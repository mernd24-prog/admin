import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';

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
    uploadHistoryData: {}, getProductsForPurchaseData: {},getProductStocksData:{}, productModerationQueueData:{}

}
export const getList = createApiThunkPrivate('getList', '/category/getList', 'GET')
export const softDelete = createApiThunkPrivate('softDelete', '/category/softDelete', 'DELETE')
export const enableDisable = createApiThunkPrivate('enableDisable', '/category/enableDisable', 'PUT')
export const create = createApiThunkPrivate('create', '/category/create')
export const update = createApiThunkPrivate('update', '/category/update', 'PUT')
export const createCategory = createApiThunkPrivate('createCategory', '/category/create')



//collection->>>>>>>>>>>>>
export const getCollectionList = createApiThunkPrivate('getCollectionList', '/collections/getList', 'GET')
export const createCollection = createApiThunkPrivate('createCollection', '/collections/create', 'POST')
export const updateCollection = createApiThunkPrivate('updateCollection', '/collections/update', 'PUT')
export const deleteCollection = createApiThunkPrivate('deleteCollection', '/collections/softDelete', 'DELETE')
export const enableDisableCollection = createApiThunkPrivate('enableDisableCollection', '/collections/enableDisable', 'PUT')
export const getAllCollectionList = createApiThunkPrivate('getAllCollectionList', '/collections/getAllDocuments', 'GET')


////Finish->>>>>>>>>>>
export const FinishGetList = createApiThunkPrivate('FinishGetList', '/finish/getList', "GET")
export const CreateFinish = createApiThunkPrivate('CreateFinish', '/finish/create', 'POST')
export const softDeleteFinish = createApiThunkPrivate('softDeleteFinish', '/finish/softDelete', 'DELETE')
export const enableDisableFinish = createApiThunkPrivate('enableDisableFinish', '/finish/enableDisable', 'PUT')
export const updateFinish = createApiThunkPrivate('updateFinish', '/finish/update', 'PUT')
export const getAllFinishList = createApiThunkPrivate('getAllFinishList', '/finish/getAllDocuments', "GET")

////Dimension--->>>>>>>>>>
export const getListDimension = createApiThunkPrivate('getListDimension', '/dimension/getList', 'GET')
export const createDimension = createApiThunkPrivate('createDimension', '/dimension/create', 'POST')
export const enableDisableDimension = createApiThunkPrivate('enableDisableDimension', '/dimension/enableDisable', 'PUT')
export const softDeleteDimension = createApiThunkPrivate('softDeleteDimension', '/dimension/softDelete', 'DELETE')
export const updateDimension = createApiThunkPrivate('updateDimension', '/dimension/update', "PUT")
export const getAllListDimension = createApiThunkPrivate('getAllListDimension', '/dimension/getAllDocuments', 'GET')


/// brand functions===>>>>>>>>>>>>>>>>>

export const getBrandList = createApiThunkPrivate('getBrandList', '/brands/getList', 'GET')
export const createBrand = createApiThunkPrivate('createBrand', '/brands/create', 'POST')
export const updateBrand = createApiThunkPrivate('updateBrand', '/brands/update', 'PUT')
export const deleteBrand = createApiThunkPrivate('deleteBrand', '/brands/softDelete', 'DELETE')
export const enableDisableBrand = createApiThunkPrivate('enableDisableBrand', '/brands/enableDisable', 'PUT')

/// batch functions ===>>>>>>>>>>>>>>>>>

export const getBatchList = createApiThunkPrivate('getBatchList', '/batch/getList', 'GET');
export const createBatch = createApiThunkPrivate('createBatch', '/batch/create', 'POST');
export const updateBatch = createApiThunkPrivate('updateBatch', '/batch/update', 'PUT');
export const deleteBatch = createApiThunkPrivate('deleteBatch', '/batch/softDelete', 'DELETE');
export const enableDisableBatch = createApiThunkPrivate('enableDisableBatch', '/batch/enableDisable', 'PUT');
export const getAllBatchList = createApiThunkPrivate('getAllBatchList', '/batch/getAllDocuments', 'GET')
export const getAllQtyHeadList = createApiThunkPrivate('getAllQtyHeadList', '/qtyHead/getAllDocuments', 'GET')



/// product Warranty===>>>>>>>>>>>>>>>>>
export const getWarrantyList = createApiThunkPrivate('getWarrantyList', '/warranty/getList', 'GET')
export const enableDisableWarranty = createApiThunkPrivate('enableDisableWarranty', '/warranty/enableDisable', 'PUT')
export const softDeleteWarranty = createApiThunkPrivate('softDeleteWarranty', '/warranty/softDelete', 'DELETE')
export const createWarranty = createApiThunkPrivate('createWarranty', '/warranty/create')
export const updateWarranty = createApiThunkPrivate('updateWarranty', '/warranty/update', 'PUT')
export const getAllWarrantyList = createApiThunkPrivate('getAllWarrantyList', '/warranty/getAllDocuments', 'GET')


//product-options
export const getListProduct = createApiThunkPrivate('getListProduct', '/product-option/getList', 'GET')
export const enableDisableProduct = createApiThunkPrivate('enableDisableProduct', '/product-option/enableDisable', 'PUT')
export const updateProduct = createApiThunkPrivate('updateProduct', '/product-option/update', 'PUT')
export const createProduct = createApiThunkPrivate('createProduct', '/product-option/create')
export const deleteProduct = createApiThunkPrivate('deleteProduct', '/product-option/softDelete', 'DELETE')
export const getListProductOption = createApiThunkPrivate('getListProductOption', '/product-option-value/getList', 'GET')
export const enableDisableProductOption = createApiThunkPrivate('enableDisableProductOption', '/product-option-value/enableDisable', 'PUT')
export const deleteProductOption = createApiThunkPrivate('deleteProductOption', '/product-option-value/softDelete', 'DELETE')
export const createProductOption = createApiThunkPrivate('createProductOption', '/product-option-value/create')
export const updateProductOption = createApiThunkPrivate('updateProductOption', '/product-option-value/update', 'PUT')

export const getAllPatternList = createApiThunkPrivate('getAllPatternList', '/pattern/getAllDocuments', 'GET')
export const getAllPrivacyPolicyList = createApiThunkPrivate('getAllPrivacyPolicyList', '/replace-policy/getAllDocuments', 'GET')
export const getAllStoreList = createApiThunkPrivate('getAllStoreList', '/store/getAllDocuments', 'GET')
export const getAllStoreShippingDurationList = createApiThunkPrivate('getAllStoreShippingDurationList', '/store-shipping-duration/getAllDocuments', 'GET')
export const getAllTaxRulesList = createApiThunkPrivate('getAllTaxRulesList', '/taxRule/getAllDocuments', 'GET')


export const createProducts = createApiThunkPrivate('createProducts', ENDPOINTS.products.list, 'POST')
export const getProducts = createApiThunkPrivate('getProducts', ENDPOINTS.products.listForPanel, 'GET', true)
export const updateProducts = createApiThunkPrivate('updateProducts', (payload) => ENDPOINTS.products.detail(payload?.productId || payload?._id || payload?.id), 'GET')
export const enableDisableProductCatalogs = createApiThunkPrivate('enableDisableProductCatalogs', '/product/enableDisable', 'PUT')
export const updateProductsById = createApiThunkPrivate('updateProductsById', (payload) => ENDPOINTS.products.detail(payload?.productId || payload?._id || payload?.id), 'PATCH')
export const deleteProducts = createApiThunkPrivate('deleteProducts', (payload) => ENDPOINTS.products.detail(payload?.productId || payload?._id || payload?.id), 'DELETE')
export const approveDisapprove = createApiThunkPrivate('approveDisapprove', (payload) => ENDPOINTS.products.moderate(payload?.productId || payload?._id || payload?.id), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.rejectionReason !== undefined ? { rejectionReason: payload.rejectionReason } : {}),
        ...(payload.checklist ? { checklist: payload.checklist } : {}),
    }),
})
export const getAllProducts = createApiThunkPrivate('getAllProducts', ENDPOINTS.products.listForPanel, 'GET')
export const getProductModerationQueue = createApiThunkPrivate('getProductModerationQueue', ENDPOINTS.products.moderationQueue, 'GET', true, {
    transformParams: (params = {}) => ({
        ...(params.status ? { status: params.status } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.page ? { page: Number(params.page) } : {}),
        ...(params.limit || params.size ? { limit: Number(params.limit || params.size) } : {}),
    }),
})
export const getAllBrandList = createApiThunkPrivate('getAllBrandList', '/brands/getAllDocuments', 'GET')
export const getProductsForPurchase = createApiThunkPrivate('getProductsForPurchase', '/erp/product/get-products-for-purchase-order', 'GET', true)

export const getProductStocks = createApiThunkPrivate('getProductStocks', '/erp/product/get-product-stocks', 'POST')





// export const getListCategory = createApiThunkPrivate('getListCategory', '/category/getList', 'GET')

/// hsn code==============>>>>>>>>>>>>>>>

export const getHsnList = createApiThunkPrivate('getHsnList', '/hsn-code/getList', 'GET')
export const enableDisableHsn = createApiThunkPrivate('enableDisableHsn', '/hsn-code/enableDisable', 'PUT')
export const softDeleteHsn = createApiThunkPrivate('softDeleteHsn', '/hsn-code/softDelete', 'DELETE')
export const createHsn = createApiThunkPrivate('createHsn', '/hsn-code/create')
export const updateHsn = createApiThunkPrivate('updateHsn', '/hsn-code/update', 'PUT')
export const getAllHsn = createApiThunkPrivate('getAllHsn', '/hsn-code/getAllDocuments', 'GET')
export const downloadSampleCsv = createApiThunkPrivate('downloadSampleCsv', '/product/downLoad-sample-csv', 'GET')
export const uploadHistory = createApiThunkPrivate('uploadHistory', '/product/bulk-upload-history', 'GET')
export const productOptionList = createApiThunkPrivate('productOptionList', '/product-option/getOptionsWithValues', 'GET')



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
