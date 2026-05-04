import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../_helpers/apiConfig';

export const createApiThunk = (type, method, urlBuilder) => {
  return createAsyncThunk(type, async (params, { rejectWithValue }) => {
    try {
      const url = typeof urlBuilder === 'function' ? urlBuilder(params) : urlBuilder;
      const response = await apiRequest(method, url, method === 'GET' ? null : params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  });
};
