import { axiosImage, axiosPrivate, axiosPublic } from "./axiosProvider";
import { normalizeApiError } from "./normalizeApiError";
import { isAuthEndpoint } from "./authSession";
import { getSelectedSellerOrganizationHeader } from "./sellerOrganizationContext";

export const apiRequest = async (
  method,
  endpoint,
  data,
  contentType = "json",
  tokenOverride = null,
) => {
  const lowerMethod = String(method || "GET").toLowerCase();
  const isMultipart = contentType !== "json";
  const client = isMultipart
    ? axiosImage
    : isAuthEndpoint(endpoint) && !tokenOverride
      ? axiosPublic
      : axiosPrivate;
  const config = {
    method,
    url: endpoint,
    headers: {
      "Content-Type": isMultipart ? "multipart/form-data" : "application/json",
      ...(tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {}),
      ...getSelectedSellerOrganizationHeader(endpoint),
    },
  };

  if (lowerMethod === "get" || lowerMethod === "delete") {
    config.params = data || undefined;
  } else {
    config.data = data;
  }

  try {
    const response = await client(config);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const apiRequestImage = async (method, endpoint, data) => {
  return apiRequest(method, endpoint, data, "multipart");
};
