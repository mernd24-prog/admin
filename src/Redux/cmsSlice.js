import { createSlice } from '@reduxjs/toolkit';
import { createExtraReducersForThunk, createApiThunkPrivate } from '../_helpers/ApiThunk';

const initialState = {
    getCategoryListData: {}, createCategory: {}, updateCategoryData: {},deleteCategoryData:{},updateCMSCategoryData:{}, enableDisableCityData: {}, getAllCityListData: {},
    getCMSContentListData:{},createCMSContentListData:{},enableDisableCMSData:{},updateCMSListData:{},getTaxListData:{},
   createTaxListData:{},
   updateTaxListData:{},
   enableDisableTaxListData:{},
   softDeleteTaxListData:{},
   createSubTaxData:{},
   enableDisableSubTaxData:{},
    updateSubTaxData:{},
    softDeleteSubTaxData:{},
    getListTaxRuleData:{},
    createTaxRuleData:{},
    getAllDocumentsData:{},
    updateTaxRuleData:{},
    enableDisableTaxRuleData:{},
    softDeleteTaxRuleData:{},
     getListShippingData: {},
    softDeleteShippingData: {},
   enableDisableShippingData:{},
   createShippingData:{},
   updateShippingData:{},
}

export const getCategoryList=createApiThunkPrivate('getCategoryList','/cmsCategory/getList','GET')
export const createCategory=createApiThunkPrivate('createCategory','/cmsCategory/create')
export const updateCategory=createApiThunkPrivate('updateCategory','/cmsCategory/update','PUT')
export const deleteCategory=createApiThunkPrivate('deleteCategory','/cmsCategory/softDelete','DELETE')
export const updateCMSCategory=createApiThunkPrivate('updateCMSCategory','/cmsCategory/update','PUT')
///////////CMS FAQList/////////
export const getCMSContentList=createApiThunkPrivate('getCMSContentList','/cmsContent/getList','GET')
export const createCMSContentList=createApiThunkPrivate('createCMSContentList','/cmsContent/create')
export const enableDisableCMS=createApiThunkPrivate('enableDisableCMS','/cmsContent/enableDisable','PUT')
export const updateCMSList=createApiThunkPrivate('updateCMSList','/cmsContent/update','PUT')
export const softDeleteCMSList=createApiThunkPrivate('softDeleteCMSList','/cmsContent/softDelete','DELETE')
export const enableDisableCategory=createApiThunkPrivate('enableDisableCategory','/cmsCategory/enableDisable','PUT')

export const getTaxList=createApiThunkPrivate('getTaxList','/tax/getList','GET')
export const createTaxList=createApiThunkPrivate('createTaxList','/tax/create')
export const updateTaxList=createApiThunkPrivate('updateTaxList','/tax/update','PUT')
export const enableDisableTaxList=createApiThunkPrivate('enableDisableTaxList','/tax/enableDisable','PUT')
export const softDeleteTaxList=createApiThunkPrivate('softDeleteTaxList','/tax/softDelete','DELETE')
//////////SubTx//////////
export const getListSubTax=createApiThunkPrivate('getListSubTax','/subTax/getList','GET')
export const createSubTax=createApiThunkPrivate('createSubTax','/subTax/create')
export const enableDisableSubTax=createApiThunkPrivate('enableDisableSubTax','/subTax/enableDisable','PUT')
export const updateSubTax=createApiThunkPrivate('updateSubTax','/subTax/update','PUT')
export const softDeleteSubTax=createApiThunkPrivate('softDeleteSubTax','/subTax/softDelete','DELETE')
////////Tax Rule
export const getListTaxRule=createApiThunkPrivate('getListTaxRule','/taxRule/getList','GET')
export const createTaxRule=createApiThunkPrivate('createTaxRule','/taxRule/create')
export const getAllDocuments=createApiThunkPrivate('getAllDocuments','/tax/getAllDocuments','GET')
export const updateTaxRule=createApiThunkPrivate('updateTaxRule','/taxRule/update','PUT')
export const enableDisableTaxRule=createApiThunkPrivate('enableDisableTaxRule','taxRule/enableDisable','PUT')
export const softDeleteTaxRule=createApiThunkPrivate('softDeleteTaxRule','/taxRule/softDelete','DELETE')
////Shipping Durations//////
export const getListShipping = createApiThunkPrivate('getListShipping', '/store-shipping-duration/getList', 'GET')
export const softDeleteShipping = createApiThunkPrivate('softDeleteShipping', '/store-shipping-duration/softDelete', 'DELETE')
export const enableDisableShipping=createApiThunkPrivate('enableDisableShipping','/store-shipping-duration/enableDisable','PUT')
export const createShipping=createApiThunkPrivate('createShipping','/store-shipping-duration/create')
export const updateShipping=createApiThunkPrivate('updateShipping','/store-shipping-duration/update','PUT')

//  Help and support 


const cmsSlice = createSlice({
    name: 'cms',
    initialState,
    extraReducers: builder => {
       createExtraReducersForThunk(builder,getCategoryList,'getCategoryListData')
        createExtraReducersForThunk(builder,createCategory,'createCategoryData')
        createExtraReducersForThunk(builder,updateCategory,'updateCategoryData')
        createExtraReducersForThunk(builder,deleteCategory,'deleteCategoryData')
        createExtraReducersForThunk(builder,updateCMSCategory,'updateCMSCategoryData')
        createExtraReducersForThunk(builder,enableDisableCategory,'enableDisableCategoryData')
        ////CMS FAQList////////
        createExtraReducersForThunk(builder,getCMSContentList,'getCMSContentListData')
        createExtraReducersForThunk(builder,createCMSContentList,'createCMSContentListData')
        createExtraReducersForThunk(builder,enableDisableCMS,'enableDisableCMSData')
        createExtraReducersForThunk(builder,updateCMSList,'updateCMSListData')
       createExtraReducersForThunk(builder,getTaxList,'getTaxListData')
        createExtraReducersForThunk(builder,createTaxList,'createTaxListData')
        createExtraReducersForThunk(builder,updateTaxList,'updateTaxListData')
        createExtraReducersForThunk(builder,enableDisableTaxList,'enableDisableTaxListData')
        createExtraReducersForThunk(builder,softDeleteTaxList,'softDeleteTaxListData')
        ////Sub Tax////////
        createExtraReducersForThunk(builder,getListSubTax,'getListSubTaxData')
        createExtraReducersForThunk(builder,createSubTax,'createSubTaxData')
        createExtraReducersForThunk(builder,enableDisableSubTax,'enableDisableSubTaxData')
        createExtraReducersForThunk(builder,updateSubTax,'updateSubTaxData')
        createExtraReducersForThunk(builder,softDeleteSubTax,'softDeleteSubTaxData')
         /////Tax Rule/////////
        createExtraReducersForThunk(builder,getListTaxRule,'getListTaxRuleData')
        createExtraReducersForThunk(builder,createTaxRule,'createTaxRuleData')
        createExtraReducersForThunk(builder,getAllDocuments,'getAllDocumentsData')
        createExtraReducersForThunk(builder,updateTaxRule,'updateTaxRuleData')
        createExtraReducersForThunk(builder,enableDisableTaxRule,'enableDisableTaxRuleData')
        createExtraReducersForThunk(builder,softDeleteTaxRule,'softDeleteTaxRuleData')
           ////Shipping Durations////////////
        createExtraReducersForThunk(builder, getListShipping, 'getListShippingData')
        createExtraReducersForThunk(builder, softDeleteShipping, 'softDeleteShippingData')
        createExtraReducersForThunk(builder,enableDisableShipping,'enableDisableShippingData')
        createExtraReducersForThunk(builder,createShipping,'createShippingData')
        createExtraReducersForThunk(builder,updateShipping,'updateShippingData')
        
    }
})

export default cmsSlice.reducer