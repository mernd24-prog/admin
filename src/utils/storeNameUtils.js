const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value._id ||
        value.id ||
        value.sellerId ||
        value.seller_id ||
        value.organizationId ||
        value.organization_id ||
        "",
    ).trim();
  }

  return String(value).trim();
};

const invoiceMetadata = (row = {}) => {
  if (!row.metadata || typeof row.metadata !== "string") {
    return row.metadata || {};
  }

  try {
    return JSON.parse(row.metadata);
  } catch {
    return {};
  }
};

// Define this function before resolveStoreName.
const getInvoiceStoreIds = (row = {}) => {
  const metadata = invoiceMetadata(row);

  const seller = row.seller || {};
  const organization = row.organization || {};

  const metadataSeller = metadata.seller || {};
  const metadataOrganization = metadata.organization || {};

  const possibleIds = [
    row.sellerId,
    row.seller_id,
    row.seller,
    row.organizationId,
    row.organization_id,
    row.organization,

    seller._id,
    seller.id,
    seller.sellerId,
    seller.seller_id,
    seller.organizationId,
    seller.organization_id,
    seller.organization?._id,
    seller.organization?.id,

    organization._id,
    organization.id,
    organization.organizationId,
    organization.organization_id,

    metadata.sellerId,
    metadata.seller_id,
    metadata.seller,
    metadataSeller._id,
    metadataSeller.id,
    metadataSeller.sellerId,
    metadataSeller.seller_id,
    metadataSeller.organizationId,
    metadataSeller.organization_id,
    metadataSeller.organization?._id,
    metadataSeller.organization?.id,

    metadataOrganization._id,
    metadataOrganization.id,
    metadataOrganization.organizationId,
    metadataOrganization.organization_id,
  ];

  return [...new Set(possibleIds.map(normalizeId).filter(Boolean))];
};

// Export the resolver.
export const resolveStoreName = (row, storeNameMap = {}) => {
  const ids = getInvoiceStoreIds(row);

  for (const id of ids) {
    const storeName = storeNameMap[id];

    if (storeName) {
      return {
        name: storeName,
        id,
      };
    }
  }

  return {
    name: "Sam Global",
    id: ids[0] || "",
  };
};
