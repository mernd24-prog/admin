import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';
import { ENDPOINTS } from '../_helpers/endpoints';
import { deleteMany, firstId, patchMany, toListParams } from '../_helpers/adminApi';
import { normalizeImageList } from '../_helpers/productMedia';

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
    ...(params.sellerId ? { sellerId: params.sellerId } : {}),
    ...(params.hsnCode || params.hsn_code ? { hsnCode: params.hsnCode || params.hsn_code } : {}),
    ...(params.color ? { color: params.color } : {}),
    ...(params.country ? { country: params.country } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(params.city ? { city: params.city } : {}),
    ...(params.productFamilyCode ? { productFamilyCode: params.productFamilyCode } : {}),
    ...(params.sku ? { sku: params.sku } : {}),
    ...(params.includeAllStatuses !== undefined ? { includeAllStatuses: params.includeAllStatuses } : {}),
    ...(params.productType ? { productType: params.productType } : {}),
    ...(params.visibility ? { visibility: params.visibility } : {}),
    ...(params.brand ? { brand: params.brand } : {}),
    ...(params.tags ? { tags: params.tags } : {}),
    ...(params.minPrice !== undefined ? { minPrice: Number(params.minPrice) } : {}),
    ...(params.maxPrice !== undefined ? { maxPrice: Number(params.maxPrice) } : {}),
    ...(params.inStock !== undefined ? { inStock: params.inStock } : {}),
    ...(params.sortBy ? { sortBy: params.sortBy } : {}),
});

const toProductStatusBody = (payload = {}) => ({
    status: payload.status || (payload.isDisable ? "inactive" : "active"),
    ...(payload.reason ? { reason: payload.reason } : {}),
    ...(payload.rejectionReason !== undefined ? { rejectionReason: payload.rejectionReason } : {}),
    ...(payload.scheduledAt ? { scheduledAt: payload.scheduledAt } : {}),
    checklist: {
        titleVerified: true,
        categoryVerified: true,
        complianceVerified: true,
        mediaVerified: true,
    },
});

const toProductBody = (payload = {}) => {
    const categoryId = payload.categoryId || payload.category_id || payload.category;
    const category = payload.category || payload.categoryKey || payload.category_key || categoryId;
    const hsnCode = payload.hsnCode || payload.hsn_code || "";
    const variants = Array.isArray(payload.variants) ? payload.variants : [];
    const primaryVariant = variants[0] || {};
    const title = payload.title || payload.name || "";

    return {
        ...(payload.sellerId ? { sellerId: payload.sellerId } : {}),
        title,
        ...(payload.shortDescription ? { shortDescription: payload.shortDescription } : {}),
        description: payload.description || "",
        ...(payload.productType ? { productType: payload.productType } : {}),
        ...(payload.visibility ? { visibility: payload.visibility } : {}),
        price: Number(payload.price || primaryVariant.price || primaryVariant.salePrice || 0),
        mrp: Number(payload.mrp || primaryVariant.mrp || 0),
        ...(payload.salePrice !== undefined ? { salePrice: Number(payload.salePrice || 0) } : {}),
        ...(payload.costPrice !== undefined ? { costPrice: Number(payload.costPrice || 0) } : {}),
        gstInclusive: true,
        category,
        ...(categoryId ? { categoryId } : {}),
        ...(payload.brand || payload.brand_id ? { brand: payload.brand || payload.brand_id } : {}),
        ...(payload.productFamilyCode ? { productFamilyCode: payload.productFamilyCode } : {}),
        ...(payload.sku ? { sku: payload.sku } : {}),
        ...(payload.color ? { color: payload.color } : {}),
        attributes: payload.attributes || {},
        variants,
        ...(Array.isArray(payload.options) ? { options: payload.options } : {}),
        ...(payload.dimensions ? { dimensions: payload.dimensions } : {}),
        ...(hsnCode ? { hsnCode } : {}),
        origin: payload.origin || {},
        ...(payload.warranty ? { warranty: payload.warranty } : {}),
        ...(payload.shipping ? { shipping: payload.shipping } : {}),
        ...(payload.inventorySettings ? { inventorySettings: payload.inventorySettings } : {}),
        ...(payload.metadata ? { metadata: payload.metadata } : {}),
        ...(payload.seo ? { seo: payload.seo } : {}),
        ...(payload.digital ? { digital: payload.digital } : {}),
        ...(payload.subscription ? { subscription: payload.subscription } : {}),
        ...(Array.isArray(payload.bundleItems) ? { bundleItems: payload.bundleItems } : {}),
        ...(payload.bundleDiscount !== undefined ? { bundleDiscount: Number(payload.bundleDiscount || 0) } : {}),
        ...(Array.isArray(payload.relatedProducts) ? { relatedProducts: payload.relatedProducts } : {}),
        ...(Array.isArray(payload.crossSellProducts) ? { crossSellProducts: payload.crossSellProducts } : {}),
        ...(Array.isArray(payload.upSellProducts) ? { upSellProducts: payload.upSellProducts } : {}),
        ...(Array.isArray(payload.frequentlyBoughtTogether) ? { frequentlyBoughtTogether: payload.frequentlyBoughtTogether } : {}),
        ...(Array.isArray(payload.featuredProducts) ? { featuredProducts: payload.featuredProducts } : {}),
        ...(Array.isArray(payload.trendingProducts) ? { trendingProducts: payload.trendingProducts } : {}),
        ...(Array.isArray(payload.bestSellerProducts) ? { bestSellerProducts: payload.bestSellerProducts } : {}),
        ...(Array.isArray(payload.collectionIds) ? { collectionIds: payload.collectionIds } : {}),
        stock: Number(payload.stock || payload.quantity || 0),
        images: normalizeImageList(payload.images),
        videos: Array.isArray(payload.videos) ? payload.videos : [],
        documents: Array.isArray(payload.documents) ? payload.documents : [],
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        ...(payload.status ? { status: payload.status } : {}),
    };
};

const toProductPatchBody = (payload = {}) => {
    const source = payload.body || payload.data || payload;
    const body = {};
    const categoryId = source.categoryId || source.category_id || source.category;
    const category = source.category || source.categoryKey || source.category_key || categoryId;

    if (source.sellerId !== undefined) body.sellerId = source.sellerId;
    if (source.title !== undefined || source.name !== undefined) body.title = source.title || source.name || "";
    if (source.shortDescription !== undefined) body.shortDescription = source.shortDescription || "";
    if (source.description !== undefined) body.description = source.description || "";
    if (source.productType !== undefined) body.productType = source.productType;
    if (source.visibility !== undefined) body.visibility = source.visibility;
    if (source.price !== undefined) body.price = Number(source.price || 0);
    if (source.mrp !== undefined) body.mrp = Number(source.mrp || 0);
    if (source.salePrice !== undefined) body.salePrice = Number(source.salePrice || 0);
    if (source.costPrice !== undefined) body.costPrice = Number(source.costPrice || 0);
    if (source.gstRate !== undefined) body.gstRate = Number(source.gstRate || 0);
    if (source.gstInclusive !== undefined) body.gstInclusive = Boolean(source.gstInclusive);
    if (source.category !== undefined || source.categoryKey !== undefined || source.category_id !== undefined || source.categoryId !== undefined) {
        body.category = category;
    }
    if (source.categoryId !== undefined || source.category_id !== undefined) body.categoryId = categoryId;
    if (source.brand !== undefined || source.brand_id !== undefined) body.brand = source.brand || source.brand_id || "";
    if (source.productFamilyCode !== undefined) body.productFamilyCode = source.productFamilyCode;
    if (source.sku !== undefined) body.sku = source.sku;
    if (source.color !== undefined) body.color = source.color;
    if (source.attributes !== undefined) body.attributes = source.attributes || {};
    if (source.variants !== undefined) body.variants = Array.isArray(source.variants) ? source.variants : [];
    if (source.options !== undefined && Array.isArray(source.options)) body.options = source.options;
    if (source.dimensions !== undefined) body.dimensions = source.dimensions;
    if (source.hsnCode !== undefined || source.hsn_code !== undefined) body.hsnCode = source.hsnCode || source.hsn_code || "";
    if (source.origin !== undefined) body.origin = source.origin || {};
    if (source.warranty !== undefined) body.warranty = source.warranty;
    if (source.shipping !== undefined) body.shipping = source.shipping || {};
    if (source.inventorySettings !== undefined) body.inventorySettings = source.inventorySettings || {};
    if (source.metadata !== undefined) body.metadata = source.metadata || {};
    if (source.seo !== undefined) body.seo = source.seo || {};
    if (source.digital !== undefined) body.digital = source.digital || {};
    if (source.subscription !== undefined) body.subscription = source.subscription || {};
    if (source.bundleItems !== undefined && Array.isArray(source.bundleItems)) body.bundleItems = source.bundleItems;
    if (source.bundleDiscount !== undefined) body.bundleDiscount = Number(source.bundleDiscount || 0);
    if (source.relatedProducts !== undefined && Array.isArray(source.relatedProducts)) body.relatedProducts = source.relatedProducts;
    if (source.crossSellProducts !== undefined && Array.isArray(source.crossSellProducts)) body.crossSellProducts = source.crossSellProducts;
    if (source.upSellProducts !== undefined && Array.isArray(source.upSellProducts)) body.upSellProducts = source.upSellProducts;
    if (source.frequentlyBoughtTogether !== undefined && Array.isArray(source.frequentlyBoughtTogether)) body.frequentlyBoughtTogether = source.frequentlyBoughtTogether;
    if (source.featuredProducts !== undefined && Array.isArray(source.featuredProducts)) body.featuredProducts = source.featuredProducts;
    if (source.trendingProducts !== undefined && Array.isArray(source.trendingProducts)) body.trendingProducts = source.trendingProducts;
    if (source.bestSellerProducts !== undefined && Array.isArray(source.bestSellerProducts)) body.bestSellerProducts = source.bestSellerProducts;
    if (source.collectionIds !== undefined && Array.isArray(source.collectionIds)) body.collectionIds = source.collectionIds;
    if (source.stock !== undefined || source.quantity !== undefined) body.stock = Number(source.stock || source.quantity || 0);
    if (source.images !== undefined && Array.isArray(source.images)) body.images = normalizeImageList(source.images);
    if (source.videos !== undefined && Array.isArray(source.videos)) body.videos = source.videos;
    if (source.documents !== undefined && Array.isArray(source.documents)) body.documents = source.documents;
    if (source.tags !== undefined && Array.isArray(source.tags)) body.tags = source.tags;
    if (source.status !== undefined) body.status = source.status;
    if (source.minPurchaseQuantity !== undefined) body.minPurchaseQuantity = Number(source.minPurchaseQuantity || 0);
    if (source.volumeDiscount !== undefined) body.volumeDiscount = Number(source.volumeDiscount || 0);
    if (source.specialPriceStartDate !== undefined) body.specialPriceStartDate = source.specialPriceStartDate;
    if (source.specialPriceEndDate !== undefined) body.specialPriceEndDate = source.specialPriceEndDate;
    return body;
};

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
    getListData: {}, softDeleteData: {}, enableDisableData: {}, createData: {}, updateData: {},
    FinishGetListData: {},
    CreateFinishData: {}, softDeleteFinishData: {}, enableDisableFinishData: {}, getListDimensionData: {}, createDimensionData: {},
    enableDisableDimensionData: {}, softDeleteDimensionData: {}, updateDimensionData: {}, getBrandListData: {}, createBrandData: {},
    updateBrandData: {}, deleteBrandData: {}, enableDisableBrandData: {}, getWarrantyListData: {}, enableDisableWarrantyData: {},
    softDeleteWarrantyData: {}, createWarrantyData: {}, getListProductData: {}, enableDisableProductData: {}, updateProductData: {},
    createProductData: {}, deleteProductData: {}, getListProductOptionData: {}, enableDisableProductOptionData: {}, deleteProductOptionData: {},
    createProductOptionData: {}, updateProductOptionData: {},
    getAllBrandListData: {}, getAllColorListData: {},
    getAllWarrantyListData: {}, getAllTaxListData: {}, getAllBatchListData: {},
    createProductsData: {}, getProductsData: {}, updateProductsData: {}, enableDisableProductCatalogsData: {}, updateProductsByIdData: {},
    deleteProductsData: {}, approveDisapproveData: {}, getAllProductsData: {}, createCategoryData: {},
    getHsnListData: {}, createHsnData: {}, updateHsnData: {}, enableDisableHsnData: {}, softDeleteHsnData: {}, getAllHsnData: {}, productModerationQueueData: {},
    getProductRevisionsData: {}, reviewProductRevisionData: {},
    getCategoryAttributesData: {}, updateCategoryAttributesData: {},
    productPrefillData: {},
    bulkUpdateProductsData: {}, adjustProductInventoryData: {}, getInventoryStatsData: {}, getTopProductsData: {},
    archiveProductData: {}, restoreProductData: {}, duplicateProductData: {},
}

export const getList = createApiThunkPrivate('product/getList', ENDPOINTS.platform.categories, 'GET', true, {
    transformParams: (params = {}) => ({
        ...(params.page ? { page: Number(params.page) } : {}),
        limit: Number(params.limit || params.size || 1000),
        ...(params.tree !== undefined ? { tree: params.tree } : {}),
        ...(params.parentKey ? { parentKey: params.parentKey } : {}),
        ...(params.active !== undefined ? { active: params.active } : {}),
        ...(params.categoryKey ? { categoryKey: params.categoryKey } : {}),
    }),
})
export const softDelete = deleteMany(
    'product/softDelete',
    ENDPOINTS.platform.category,
    'Category deleted successfully',
)
export const enableDisable = patchMany(
    'product/enableDisable',
    ENDPOINTS.platform.category,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Category status updated successfully',
)
export const create = createApiThunkPrivate('product/createCategoryLegacy', ENDPOINTS.platform.categories, 'POST', false, {
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
            imageUrl: payload.imageUrl || payload.thumbnails || payload.seoUrl || '',
            bannerUrl: payload.bannerUrl || '',
            iconUrl: payload.iconUrl || '',
            isDashboardVisible: Boolean(payload.isDashboardVisible),
        };
    },
})
export const update = createApiThunkPrivate('product/updateCategoryLegacy', (payload) => ENDPOINTS.platform.category(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => {
        const body = {};
        if (payload.name || payload.title || payload.categoryName) body.title = payload.name || payload.title || payload.categoryName;
        if (payload.active !== undefined || payload.isDisable !== undefined) body.active = payload.active ?? payload.isDisable !== true;
        if (payload.sortOrder !== undefined || payload.priority !== undefined) body.sortOrder = Number(payload.sortOrder ?? payload.priority ?? 0);
        if (payload.parentKey !== undefined) body.parentKey = payload.parentKey || null;
        if (payload.level !== undefined) body.level = Number(payload.level || 0);
        if (payload.imageUrl !== undefined || payload.thumbnails !== undefined || payload.seoUrl !== undefined) {
            body.imageUrl = payload.imageUrl || payload.thumbnails || payload.seoUrl || '';
        }
        if (payload.bannerUrl !== undefined) body.bannerUrl = payload.bannerUrl || '';
        if (payload.iconUrl !== undefined) body.iconUrl = payload.iconUrl || '';
        if (payload.isDashboardVisible !== undefined) body.isDashboardVisible = Boolean(payload.isDashboardVisible);
        if (payload.attributeSchema) body.attributeSchema = payload.attributeSchema;
        if (payload.attributesSchema) body.attributesSchema = payload.attributesSchema;
        return body;
    },
})
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
            imageUrl: payload.imageUrl || payload.thumbnails || payload.seoUrl || '',
            bannerUrl: payload.bannerUrl || '',
            iconUrl: payload.iconUrl || '',
            isDashboardVisible: Boolean(payload.isDashboardVisible),
        };
    },
})




////Finish->>>>>>>>>>>
export const FinishGetList = createApiThunkPrivate('finish/getList', ENDPOINTS.platform.finishes, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
})
export const CreateFinish = createApiThunkPrivate('finish/create', ENDPOINTS.platform.finishes, 'POST', false, {
    transformBody: (payload = {}) => ({
        name: String(payload.name || '').trim(),
        active: payload.active ?? payload.isDisable !== true,
    }),
})
export const softDeleteFinish = deleteMany('finish/softDelete', ENDPOINTS.platform.finish, 'Finish deleted successfully')
export const enableDisableFinish = patchMany(
    'finish/enableDisable',
    ENDPOINTS.platform.finish,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Finish status updated successfully',
)
export const updateFinish = createApiThunkPrivate('finish/update', (payload) => ENDPOINTS.platform.finish(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.name !== undefined ? { name: String(payload.name || '').trim() } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
    }),
})

////Dimension--->>>>>>>>>>
export const getListDimension = createApiThunkPrivate('dimension/getList', ENDPOINTS.platform.dimensions, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
})
export const createDimension = createApiThunkPrivate('dimension/create', ENDPOINTS.platform.dimensions, 'POST', false, {
    transformBody: (payload = {}) => ({
        dimensions_value: String(payload.dimensions_value || '').trim(),
        active: payload.active ?? payload.isDisable !== true,
    }),
})
export const enableDisableDimension = patchMany(
    'dimension/enableDisable',
    ENDPOINTS.platform.dimension,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Dimension status updated successfully',
)
export const softDeleteDimension = deleteMany('dimension/softDelete', ENDPOINTS.platform.dimension, 'Dimension deleted successfully')
export const updateDimension = createApiThunkPrivate('dimension/update', (payload) => ENDPOINTS.platform.dimension(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.dimensions_value !== undefined ? { dimensions_value: String(payload.dimensions_value || '').trim() } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
    }),
})

/// brand functions===>>>>>>>>>>>>>>>>>

export const getBrandList = createApiThunkPrivate('brands/getList', ENDPOINTS.platform.brands, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
})
export const createBrand = createApiThunkPrivate('brands/create', ENDPOINTS.platform.brands, 'POST', false, {
    transformBody: (payload = {}) => ({
        name: String(payload.name || '').trim(),
        logo: payload.logo || '',
        thumbnails: payload.thumbnails || '',
        active: payload.active ?? payload.isDisable !== true,
        sortOrder: Number(payload.sortOrder || 0),
    }),
})
export const updateBrand = createApiThunkPrivate('brands/update', (payload) => ENDPOINTS.platform.brand(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.name !== undefined ? { name: String(payload.name || '').trim() } : {}),
        ...(payload.logo !== undefined ? { logo: payload.logo || '' } : {}),
        ...(payload.thumbnails !== undefined ? { thumbnails: payload.thumbnails || '' } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: Number(payload.sortOrder || 0) } : {}),
    }),
})
export const deleteBrand = deleteMany('brands/softDelete', ENDPOINTS.platform.brand, 'Brand deleted successfully')
export const enableDisableBrand = patchMany(
    'brands/enableDisable',
    ENDPOINTS.platform.brand,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Brand status updated successfully',
)

/// batch functions ===>>>>>>>>>>>>>>>>>

export const getBatchList = createApiThunkPrivate('batch/getList', ENDPOINTS.platform.batches, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
});
export const createBatch = createApiThunkPrivate('batch/create', ENDPOINTS.platform.batches, 'POST', false, {
    transformBody: (payload = {}) => ({
        batchCode: String(payload.batchCode || '').trim(),
        manufactureDate: Number(payload.manufactureDate || 0),
        expiryDate: Number(payload.expiryDate || 0),
        active: payload.active ?? payload.isDisable !== true,
    }),
});
export const updateBatch = createApiThunkPrivate('batch/update', (payload) => ENDPOINTS.platform.batch(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.batchCode !== undefined ? { batchCode: String(payload.batchCode || '').trim() } : {}),
        ...(payload.manufactureDate !== undefined ? { manufactureDate: Number(payload.manufactureDate || 0) } : {}),
        ...(payload.expiryDate !== undefined ? { expiryDate: Number(payload.expiryDate || 0) } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
    }),
});
export const deleteBatch = deleteMany('batch/softDelete', ENDPOINTS.platform.batch, 'Batch deleted successfully');
export const enableDisableBatch = patchMany(
    'batch/enableDisable',
    ENDPOINTS.platform.batch,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Batch status updated successfully',
);
export const getAllBatchList = createApiThunkPrivate('batch/getAllDocuments', ENDPOINTS.platform.batches, 'GET', true, {
    transformParams: (params = {}) => toListParams(params, { limit: 100 }),
})

/// product Warranty===>>>>>>>>>>>>>>>>>
export const getWarrantyList = createApiThunkPrivate('warranty/getList', ENDPOINTS.platform.warrantyTemplates, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
})
export const enableDisableWarranty = patchMany(
    'warranty/enableDisable',
    ENDPOINTS.platform.warrantyTemplate,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Warranty template status updated successfully',
)
export const softDeleteWarranty = deleteMany('warranty/softDelete', ENDPOINTS.platform.warrantyTemplate, 'Warranty template deleted successfully')
export const createWarranty = createApiThunkPrivate('warranty/create', ENDPOINTS.platform.warrantyTemplates, 'POST', false, {
    transformBody: (payload = {}) => ({
        period: String(payload.period || '').trim(),
        active: payload.active ?? payload.isDisable !== true,
        metadata: payload.metadata || {},
    }),
})
export const updateWarranty = createApiThunkPrivate('warranty/update', (payload) => ENDPOINTS.platform.warrantyTemplate(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.period !== undefined ? { period: String(payload.period || '').trim() } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
        ...(payload.metadata !== undefined ? { metadata: payload.metadata || {} } : {}),
    }),
})
export const getAllWarrantyList = createApiThunkPrivate('warranty/getAllDocuments', ENDPOINTS.platform.warrantyTemplates, 'GET', true, {
    transformParams: (params = {}) => toListParams(params, { limit: 100 }),
})


//product-options
export const getListProduct = createApiThunkPrivate('product-option/getList', ENDPOINTS.platform.productOptions, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
})
export const enableDisableProduct = patchMany(
    'product-option/enableDisable',
    ENDPOINTS.platform.productOption,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Product option status updated successfully',
)
export const updateProduct = createApiThunkPrivate('product-option/update', (payload) => ENDPOINTS.platform.productOption(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.name !== undefined ? { name: String(payload.name || '').trim() } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
    }),
})
export const createProduct = createApiThunkPrivate('product-option/create', ENDPOINTS.platform.productOptions, 'POST', false, {
    transformBody: (payload = {}) => ({
        name: String(payload.name || '').trim(),
        active: payload.active ?? payload.isDisable !== true,
    }),
})
export const deleteProduct = deleteMany('product-option/softDelete', ENDPOINTS.platform.productOption, 'Product option deleted successfully')
export const getListProductOption = createApiThunkPrivate('product-option-value/getList', ENDPOINTS.platform.productOptionValues, 'GET', true, {
    transformParams: (params = {}) => toListParams(params),
})
export const enableDisableProductOption = patchMany(
    'product-option-value/enableDisable',
    ENDPOINTS.platform.productOptionValue,
    (payload = {}) => ({ active: payload.isDisable !== true }),
    'Product option value status updated successfully',
)
export const deleteProductOption = deleteMany('product-option-value/softDelete', ENDPOINTS.platform.productOptionValue, 'Product option value deleted successfully')
export const createProductOption = createApiThunkPrivate('product-option-value/create', ENDPOINTS.platform.productOptionValues, 'POST', false, {
    transformBody: (payload = {}) => ({
        option_id: payload.option_id,
        name: String(payload.name || '').trim(),
        active: payload.active ?? payload.isDisable !== true,
    }),
})
export const updateProductOption = createApiThunkPrivate('product-option-value/update', (payload) => ENDPOINTS.platform.productOptionValue(firstId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.option_id !== undefined ? { option_id: payload.option_id } : {}),
        ...(payload.name !== undefined ? { name: String(payload.name || '').trim() } : {}),
        ...(payload.active !== undefined || payload.isDisable !== undefined ? { active: payload.active ?? payload.isDisable !== true } : {}),
    }),
})


export const createProducts = createApiThunkPrivate('createProducts', ENDPOINTS.products.list, 'POST', false, {
    transformBody: toProductBody,
})
export const getProductPrefill = createApiThunkPrivate('getProductPrefill', ENDPOINTS.products.prefill, 'GET', true, {
    transformParams: (params = {}) => ({
        includeProducts: params.includeProducts !== false,
        ...(params.includeInactive !== undefined ? { includeInactive: params.includeInactive } : {}),
        ...(params.sellerId ? { sellerId: params.sellerId } : {}),
        limit: Number(params.limit || 100),
    }),
})
export const getProducts = createApiThunkPrivate('getProducts', ENDPOINTS.products.listForPanel, 'GET', true, {
    transformParams: toProductListParams,
})
export const getProductById = createApiThunkPrivate('getProductById', (payload) => ENDPOINTS.products.detail(firstProductId(payload)), 'GET')
export const updateProducts = getProductById
export const enableDisableProductCatalogs = patchMany(
    'enableDisableProductCatalogs',
    ENDPOINTS.products.status,
    toProductStatusBody,
    'Product status updated successfully'
)
export const updateProductsById = createApiThunkPrivate('updateProductsById', (payload) => ENDPOINTS.products.detail(firstProductId(payload)), 'PATCH', false, {
    transformBody: toProductPatchBody,
})
export const deleteProducts = createApiThunkPrivate('deleteProducts', (payload) => ENDPOINTS.products.detail(firstProductId(payload)), 'DELETE')
export const archiveProduct = createApiThunkPrivate('archiveProduct', (payload) => ENDPOINTS.products.archive(firstProductId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({ ...(payload.reason ? { reason: payload.reason } : {}) }),
})
export const restoreProduct = createApiThunkPrivate('restoreProduct', (payload) => ENDPOINTS.products.restore(firstProductId(payload)), 'PATCH', false, {
    transformBody: (payload = {}) => ({
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.visibility ? { visibility: payload.visibility } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
    }),
})
export const duplicateProduct = createApiThunkPrivate('duplicateProduct', (payload) => ENDPOINTS.products.duplicate(firstProductId(payload)), 'POST', false, {
    transformBody: (payload = {}) => ({
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.sku ? { sku: payload.sku } : {}),
    }),
})
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
export const getProductRevisions = createApiThunkPrivate('getProductRevisions', (payload) => ENDPOINTS.products.revisions(firstProductId(payload)), 'GET', true, {
    transformParams: (params = {}) => ({
        ...(params.status ? { status: params.status } : {}),
        ...(params.page ? { page: Number(params.page) } : {}),
        ...(params.limit || params.size ? { limit: Number(params.limit || params.size) } : {}),
    }),
})
export const reviewProductRevision = createApiThunkPrivate(
    'reviewProductRevision',
    (payload) => ENDPOINTS.products.reviewRevision(
        firstProductId(payload),
        payload.revisionId || payload.pendingRevisionId || payload?.revision?._id || payload?.revision?.id,
    ),
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            status: payload.status,
            ...(payload.rejectionReason !== undefined ? { rejectionReason: payload.rejectionReason } : {}),
            ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
            ...(payload.checklist ? { checklist: payload.checklist } : {}),
        }),
    },
)
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
export const getAllBrandList = createApiThunkPrivate('brands/getAllDocuments', ENDPOINTS.platform.brands, 'GET', true, {
    transformParams: (params = {}) => toListParams(params, { limit: 100 }),
})


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

export const bulkUpdateProducts = createApiThunkPrivate('bulkUpdateProducts', ENDPOINTS.products.bulkUpdate, 'POST', false, {
    transformBody: (payload = {}) => ({
        productIds: Array.isArray(payload.productIds) ? payload.productIds : [],
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
    }),
})
export const adjustProductInventory = createApiThunkPrivate(
    'adjustProductInventory',
    (payload) => ENDPOINTS.products.inventory(firstProductId(payload)),
    'PATCH',
    false,
    {
        transformBody: (payload = {}) => ({
            adjustment: Number(payload.adjustment || 0),
            ...(payload.variantSku ? { variantSku: payload.variantSku } : {}),
            ...(payload.reason ? { reason: payload.reason } : {}),
        }),
    }
)
export const getInventoryStats = createApiThunkPrivate('getInventoryStats', ENDPOINTS.products.inventoryStats, 'GET', true, {
    transformParams: (params = {}) => ({
        ...(params.sellerId ? { sellerId: params.sellerId } : {}),
    }),
})
export const getTopProducts = createApiThunkPrivate('getTopProducts', ENDPOINTS.products.analyticsTop, 'GET', true, {
    transformParams: (params = {}) => ({
        limit: Number(params.limit || 10),
        ...(params.metric ? { metric: params.metric } : {}),
    }),
})


const countrySlice = createSlice({
    name: 'product',
    initialState,
    extraReducers: builder => {
        createExtraReducersForThunk(builder, getList, 'getListData')
        createExtraReducersForThunk(builder, softDelete, 'softDeleteData')
        createExtraReducersForThunk(builder, enableDisable, 'enableDisableData')
        createExtraReducersForThunk(builder, create, 'createData')
        createExtraReducersForThunk(builder, update, 'updateData')

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
        createExtraReducersForThunk(builder, createProducts, 'createProductsData')
        createExtraReducersForThunk(builder, getProductPrefill, 'productPrefillData')
        createExtraReducersForThunk(builder, getProducts, 'getProductsData')
        createExtraReducersForThunk(builder, getProductById, 'updateProductsData')
        createExtraReducersForThunk(builder, enableDisableProductCatalogs, 'enableDisableProductCatalogsData')
        createExtraReducersForThunk(builder, updateProductsById, 'updateProductsByIdData')
        createExtraReducersForThunk(builder, deleteProducts, 'deleteProductsData')
        createExtraReducersForThunk(builder, archiveProduct, 'archiveProductData')
        createExtraReducersForThunk(builder, restoreProduct, 'restoreProductData')
        createExtraReducersForThunk(builder, duplicateProduct, 'duplicateProductData')
        createExtraReducersForThunk(builder, approveDisapprove, 'approveDisapproveData')
        createExtraReducersForThunk(builder, getAllBatchList, 'getAllBatchListData')
        createExtraReducersForThunk(builder, getAllWarrantyList, 'getAllWarrantyListData')
        createExtraReducersForThunk(builder, getAllProducts, 'getAllProductsData')
        createExtraReducersForThunk(builder, getProductModerationQueue, 'productModerationQueueData')
        createExtraReducersForThunk(builder, getProductRevisions, 'getProductRevisionsData')
        createExtraReducersForThunk(builder, reviewProductRevision, 'reviewProductRevisionData')
        createExtraReducersForThunk(builder, createCategory, 'createCategoryData')
        createExtraReducersForThunk(builder, getCategoryAttributes, 'getCategoryAttributesData')
        createExtraReducersForThunk(builder, updateCategoryAttributes, 'updateCategoryAttributesData')

        createExtraReducersForThunk(builder, getHsnList, 'getHsnListData')
        createExtraReducersForThunk(builder, createHsn, 'createHsnData')
        createExtraReducersForThunk(builder, updateHsn, 'updateHsnData')
        createExtraReducersForThunk(builder, enableDisableHsn, 'enableDisableHsnData')
        createExtraReducersForThunk(builder, softDeleteHsn, 'softDeleteHsnData')
        createExtraReducersForThunk(builder, getAllHsn, 'getAllHsnData')
        createExtraReducersForThunk(builder, bulkUpdateProducts, 'bulkUpdateProductsData')
        createExtraReducersForThunk(builder, adjustProductInventory, 'adjustProductInventoryData')
        createExtraReducersForThunk(builder, getInventoryStats, 'getInventoryStatsData')
        createExtraReducersForThunk(builder, getTopProducts, 'getTopProductsData')
    }
})

export default countrySlice.reducer
