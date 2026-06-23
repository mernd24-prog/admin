const SELLER_ORGANIZATION_KEY = "sellerSelectedOrganizationId";
const ORGANIZATION_HEADER_EXCLUDED_PREFIXES = [
  "/sellers/me/status",
  "/sellers/me/profile",
  "/sellers/me/organizations",
  "/sellers/me/business-address",
  "/sellers/me/pickup-address",
  "/sellers/me/return-address",
  "/sellers/me/bank-details",
  "/sellers/me/more-info",
  "/sellers/me/settings",
  "/sellers/me/kyc",
  "/sellers/onboarding",
];

const normalizeEndpointPath = (endpoint = "") => {
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(String(endpoint || ""), baseUrl);
    return parsed.pathname.replace(/^\/api\/v\d+/i, "").replace(/\/+$/, "") || "/";
  } catch {
    return String(endpoint || "").split("?")[0].replace(/^\/api\/v\d+/i, "").replace(/\/+$/, "") || "/";
  }
};

export const shouldAttachSellerOrganizationHeader = (endpoint = "") => {
  const path = normalizeEndpointPath(endpoint);
  return !ORGANIZATION_HEADER_EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};

export const getSelectedSellerOrganizationId = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELLER_ORGANIZATION_KEY) || "";
};

export const getSelectedSellerOrganizationHeader = (endpoint = "") => {
  if (!shouldAttachSellerOrganizationHeader(endpoint)) return {};
  const organizationId = getSelectedSellerOrganizationId();
  return organizationId ? { "X-Organization-Id": organizationId } : {};
};

export const setSelectedSellerOrganizationId = (organizationId = "") => {
  if (typeof window === "undefined") return;
  const value = String(organizationId || "");
  if (value) {
    window.localStorage.setItem(SELLER_ORGANIZATION_KEY, value);
  } else {
    window.localStorage.removeItem(SELLER_ORGANIZATION_KEY);
  }
  window.dispatchEvent(new CustomEvent("seller:organizationChanged", {
    detail: { organizationId: value },
  }));
};

export const clearSelectedSellerOrganizationId = () => {
  setSelectedSellerOrganizationId("");
};
