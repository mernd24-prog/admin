import { unsupportedThunk } from '../_helpers/adminApi';

const LEGACY_ADMIN_UNSUPPORTED =
  'This legacy admin API is not exposed by the current backend. Use backend-aligned admin/user/common slices.';

export const getCountryList = unsupportedThunk('country/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getRoleList = unsupportedThunk('role/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getStateListData = unsupportedThunk('state/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getCityListData = unsupportedThunk('city/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getInterestListData = unsupportedThunk('interest/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getZipcodeListData = unsupportedThunk('zipcode/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getCategoryListData = unsupportedThunk('category/getList', LEGACY_ADMIN_UNSUPPORTED);
export const getPreferenceListData = unsupportedThunk('preference/getList', LEGACY_ADMIN_UNSUPPORTED);

export const updateCountry = unsupportedThunk('country/update', LEGACY_ADMIN_UNSUPPORTED);
export const createCountry = unsupportedThunk('country/create', LEGACY_ADMIN_UNSUPPORTED);
export const deleteCountry = unsupportedThunk('country/softDelete', LEGACY_ADMIN_UNSUPPORTED);

export const createRole = unsupportedThunk('role/create', LEGACY_ADMIN_UNSUPPORTED);
export const deleteRole = unsupportedThunk('role/softDelete', LEGACY_ADMIN_UNSUPPORTED);
export const updateRole = unsupportedThunk('role/update', LEGACY_ADMIN_UNSUPPORTED);

export const createState = unsupportedThunk('state/create', LEGACY_ADMIN_UNSUPPORTED);
export const deleteState = unsupportedThunk('state/softDelete', LEGACY_ADMIN_UNSUPPORTED);
export const updateState = unsupportedThunk('state/update', LEGACY_ADMIN_UNSUPPORTED);
export const updateStatus = unsupportedThunk('updateStatus', LEGACY_ADMIN_UNSUPPORTED);

export const createCity = unsupportedThunk('city/create', LEGACY_ADMIN_UNSUPPORTED);
export const deleteCity = unsupportedThunk('city/softDelete', LEGACY_ADMIN_UNSUPPORTED);
export const updateCity = unsupportedThunk('city/update', LEGACY_ADMIN_UNSUPPORTED);

export const createZipcode = unsupportedThunk('zipcode/create', LEGACY_ADMIN_UNSUPPORTED);
export const deleteZipcode = unsupportedThunk('zipcode/softDelete', LEGACY_ADMIN_UNSUPPORTED);
export const updateZipcode = unsupportedThunk('zipcode/update', LEGACY_ADMIN_UNSUPPORTED);

export const createInterest = unsupportedThunk('interest/create', LEGACY_ADMIN_UNSUPPORTED);
export const deleteInterest = unsupportedThunk('interest/softDelete', LEGACY_ADMIN_UNSUPPORTED);
export const updateInterest = unsupportedThunk('interest/update', LEGACY_ADMIN_UNSUPPORTED);
export const enableDisableInterest = unsupportedThunk('interest/enableDisable', LEGACY_ADMIN_UNSUPPORTED);

export const createPreference = unsupportedThunk('preference/create', LEGACY_ADMIN_UNSUPPORTED);
export const deletePreference = unsupportedThunk('preference/softDelete', LEGACY_ADMIN_UNSUPPORTED);
export const updatePreference = unsupportedThunk('preference/update', LEGACY_ADMIN_UNSUPPORTED);
export const enableDisablePreference = unsupportedThunk('preference/enableDisable', LEGACY_ADMIN_UNSUPPORTED);
