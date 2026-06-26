const firstValidationMessage = (details) => {
  if (!Array.isArray(details)) return null;

  return details
    .map((detail) => {
      if (!detail) return null;
      if (typeof detail === "string") return detail;
      return detail?.message || detail?.msg || detail?.error || null;
    })
    .find(Boolean) || null;
};

const getFieldDetails = (data = {}) => {
  const candidates = [
    data?.error?.fields,
    data?.fields,
    data?.error?.details?.fields,
    data?.details?.fields,
    data?.error?.details,
    data?.details,
  ];
  return candidates.find(Array.isArray) || [];
};

export const normalizeApiError = (error, fallback = "Something went wrong!") => {
  const responseData = error?.response?.data;
  const data = responseData || error?.data || error?.raw || error || {};
  const details = getFieldDetails(data);

  return {
    status: error?.response?.status || data?.status,
    code:
      responseData?.code ||
      responseData?.error?.code ||
      data?.code ||
      data?.error?.code ||
      null,
    message:
      responseData?.error?.message ||
      responseData?.message ||
      firstValidationMessage(getFieldDetails(responseData)) ||
      data?.error?.message ||
      data?.message ||
      firstValidationMessage(details) ||
      error?.message ||
      fallback,
    details,
    data,
  };
};

export default normalizeApiError;
