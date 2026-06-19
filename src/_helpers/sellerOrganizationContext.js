const SELLER_ORGANIZATION_KEY = "sellerSelectedOrganizationId";

export const getSelectedSellerOrganizationId = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELLER_ORGANIZATION_KEY) || "";
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
