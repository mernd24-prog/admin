import { createApiThunk } from './createApiThunk';

export const getCountryList = createApiThunk(
  "country/getList",
  "GET",
  (filters) => `country/getList?${new URLSearchParams(filters).toString()}`
);

export const getRoleList = createApiThunk(
  "role/getList",
  "GET",
  (filters) => `role/getList?${new URLSearchParams(filters).toString()}`
);

export const getStateListData = createApiThunk(
  "state/getList",
  "GET",
  (filters) => `state/getList?${new URLSearchParams(filters).toString()}`
);

export const getCityListData = createApiThunk(
  "city/getList",
  "GET",
  (filters) => `city/getList?${new URLSearchParams(filters).toString()}`
);

export const getInterestListData = createApiThunk(
  "interest/getList",
  "GET",
  (filters) => `interest/getList?${new URLSearchParams(filters).toString()}`
);

export const getZipcodeListData = createApiThunk(
  "zipcode/getList",
  "GET",
  (filters) => `zipcode/getList?${new URLSearchParams(filters).toString()}`
);

export const getCategoryListData = createApiThunk(
  "category/getList",
  "GET",
  (filters) => `category/getList?${new URLSearchParams(filters).toString()}`
);

export const getPreferenceListData = createApiThunk(
  "preference/getList",
  "GET",
  (filters) => `preference/getList?${new URLSearchParams(filters).toString()}`
)


export const updateCountry = createApiThunk("country/update", "POST", "/country/update");
export const createCountry = createApiThunk("country/create", "POST", "/country/create");
export const deleteCountry = createApiThunk("country/softDelete", "POST", "/country/softDelete");

export const createRole = createApiThunk("role/create", "POST", "/role/create");
export const deleteRole = createApiThunk("role/softDelete", "POST", "/role/softDelete");
export const updateRole = createApiThunk("role/update", "POST", "/role/update");

export const createState = createApiThunk("state/create", "POST", "/state/create");
export const deleteState = createApiThunk("state/softDelete", "POST", "/state/softDelete");
export const updateState = createApiThunk("state/update", "POST", "/state/update");
export const updateStatus = createApiThunk("updateStatus", "POST", "/updateStatus");


export const createCity = createApiThunk("city/create", "POST", "/city/create");
export const deleteCity = createApiThunk("city/softDelete", "POST", "/city/softDelete");
export const updateCity = createApiThunk("city/update", "POST", "/city/update");

export const createZipcode = createApiThunk("zipcode/create", "POST", "/zipcode/create");
export const deleteZipcode = createApiThunk("zipcode/softDelete", "POST", "/zipcode/softDelete");
export const updateZipcode = createApiThunk("zipcode/update", "POST", "/zipcode/update");

export const createInterest = createApiThunk("interest/create", "POST", "/interest/create");
export const deleteInterest = createApiThunk("interest/softDelete", "DELETE", "/interest/softDelete");
export const updateInterest = createApiThunk("interest/update", "PUT", "/interest/update");
export const enableDisableInterest = createApiThunk("interest/enableDisable","PUT","/interest/enableDisable")


export const createPreference = createApiThunk("preference/create", "POST", "/preference/create");
export const deletePreference = createApiThunk("preference/softDelete", "DELETE", "/preference/softDelete");
export const updatePreference = createApiThunk("preference/update", "PUT", "/preference/update");
export const enableDisablePreference = createApiThunk("preference/enableDisable","PUT","/preference/enableDisable")



// // authSlice.js
// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { apiRequest } from '../_helpers/apiConfig';

// export const getCountryList = createAsyncThunk("country/getList", async (filters) => {
//   const queryParams = new URLSearchParams(filters).toString();
//   const response = await apiRequest('GET', `country/getList?${queryParams}`);
//   return response;
// });

// export const getRoleList = createAsyncThunk("role/getList", async (filters) => {
//   const queryParams = new URLSearchParams(filters).toString();
//   const response = await apiRequest('GET', `role/getList?${queryParams}`);
//   return response;
// });

// export const getStateListData = createAsyncThunk("state/getList", async (filters) => {
//   const queryParams = new URLSearchParams(filters).toString();
//   const response = await apiRequest('GET', `state/getList?${queryParams}`);
//   return response;
// });

// export const updateStatus = createAsyncThunk("updateStatus", async (filters) => {
//   const response = await apiRequest('POST', '/country/update', filters);
//   return response;
// });


// export const createCountry = createAsyncThunk("country/create", async (filters) => {
//   const response = await apiRequest('POST', '/country/create', filters);
//   return response;
// });

// export const deleteCountry = createAsyncThunk("country/softDelete", async (filters) => {
//   const response = await apiRequest('POST', '/country/softDelete', filters);
//   return response;
// });

// export const updateCountry = createAsyncThunk("country/update", async (filters) => {
//   const response = await apiRequest('POST', '/country/update', filters);
//   return response;
// });

// export const createRole = createAsyncThunk("role/create", async (filters) => {
//   const response = await apiRequest('POST', '/role/create', filters);
//   return response;
// });

// export const deleteRole = createAsyncThunk("role/softDelete", async (filters) => {
//   const response = await apiRequest('POST', '/role/softDelete', filters);
//   return response;
// });

// export const updateRole = createAsyncThunk("role/update", async (filters) => {
//   const response = await apiRequest('POST', '/role/update', filters);
//   return response;
// });

// export const createState = createAsyncThunk("state/create", async (filters) => {
//   const response = await apiRequest('POST', '/state/create', filters);
//   return response;
// });

// export const deleteState = createAsyncThunk("state/softDelete", async (filters) => {
//   const response = await apiRequest('POST', '/state/softDelete', filters);
//   return response;
// });

// export const updateState = createAsyncThunk("state/update", async (filters) => {
//   const response = await apiRequest('POST', '/state/update', filters);
//   return response;
// });



// const adminSlice = createSlice({
//   name: 'auth',
//   initialState: {
//     getCountryListData: [],
//     total: null,
//     loading: false,
//     error: null,
//   },
//   reducers: {
//     logout(state) {
//       state.user = null;
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(getCountryList.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(getCountryList.fulfilled, (state, action) => {
//         state.loading = false;
//         // state.total = action.payload.data.total;
//         state.getCountryListData = action.payload.data;
//       })
//       .addCase(getCountryList.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.error.message;
//       })


//   },
// });


// // Export the actions and reducer
// export const { logout } = adminSlice.actions;
// export default adminSlice.reducer;
