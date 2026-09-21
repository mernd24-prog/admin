const normalizeId = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
};

export const resolveProductStoreId = (product = {}) => {
  const directStoreId = normalizeId(
    product?.storeId ||
      product?.store?._id ||
      product?.store?.id ||
      product?.organizationId ||
      product?.organization?._id ||
      product?.organization?.id ||
      product?.organizationSnapshot?.storeId ||
      product?.organizationSnapshot?.storeID ||
      product?.organizationSnapshot?.organizationId ||
      product?.sellerId ||
      product?.seller?._id ||
      product?.seller?.id,
  );

  return directStoreId;
};

export const resolveProductStoreName = (product = {}) => {
  return (
    product?.organizationSnapshot?.storeDisplayName ||
    product?.organizationSnapshot?.legalBusinessName ||
    product?.storeDisplayName ||
    product?.store?.storeDisplayName ||
    product?.store?.name ||
    product?.organization?.storeDisplayName ||
    product?.organization?.legalBusinessName ||
    product?.seller?.storeDisplayName ||
    product?.seller?.businessName ||
    product?.seller?.legalBusinessName ||
    product?.seller?.name ||
    "Unnamed Store"
  );
};

export const resolveStoreKey = (product = {}) => {
  const storeId = resolveProductStoreId(product);

  if (storeId) {
    return storeId;
  }

  const storeName = resolveProductStoreName(product);

  return storeName ? String(storeName) : "";
};
