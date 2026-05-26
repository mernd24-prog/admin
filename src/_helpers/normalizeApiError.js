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

export const normalizeApiError = (error, fallback = "Something went wrong!") => {
  const responseData = error?.response?.data;
  const data = responseData || error?.data || error?.raw || error || {};
  const details = Array.isArray(data?.error?.details)
    ? data.error.details
    : Array.isArray(data?.details)
      ? data.details
      : [];

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
      firstValidationMessage(responseData?.error?.details) ||
      firstValidationMessage(responseData?.details) ||
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
