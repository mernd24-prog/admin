import { apiRequest } from "./apiConfig";
import { ENDPOINTS } from "./endpoints";

const cache = new Map();

const stableParams = (params = {}) =>
  Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce((result, [key, value]) => ({ ...result, [key]: value }), {});

const unwrapOptions = (response) => {
  const data = response?.data ?? response;
  return Array.isArray(data) ? data : [];
};

const unwrapItems = (response) => {
  const data = response?.data?.data ?? response?.data ?? response ?? {};
  if (Array.isArray(data)) return data;
  return data.items || data.list || data.results || [];
};

const load = async (resource, params = {}, { force = false } = {}) => {
  const cleanParams = stableParams(params);
  const key = `${resource}:${JSON.stringify(cleanParams)}`;
  if (!force && cache.has(key)) return cache.get(key);

  const pending = apiRequest(
    "GET",
    ENDPOINTS.meta.dropdown(resource),
    cleanParams,
  )
    .then(unwrapOptions)
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, pending);
  return pending;
};

const loadProtected = async (key, endpoint, params, mapOption) => {
  const cleanParams = stableParams(params);
  const cacheKey = `protected:${key}:${JSON.stringify(cleanParams)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const pending = apiRequest("GET", endpoint, cleanParams)
    .then((response) => unwrapItems(response).map(mapOption))
    .catch((error) => {
      cache.delete(cacheKey);
      throw error;
    });
  cache.set(cacheKey, pending);
  return pending;
};

export const dropdownApi = {
  clearCache: () => cache.clear(),
  get: load,
  getCountries: (params) => load("countries", params),
  getStates: (countryId, params) =>
    load("states", { ...params, parentId: countryId }),
  getCities: (stateId, params) =>
    load("cities", { ...params, parentId: stateId }),
  getPincodes: (cityId, params) =>
    load("pincodes", { ...params, parentId: cityId }),
  getCategories: (params) => load("categories", params),
  getBrands: (params) => load("brands", params),
  getProductFamilies: (params) => load("product-families", params),
  getProductOptions: (params) => load("product-options", params),
  getProductOptionValues: (optionId, params) =>
    load("product-option-values", { ...params, parentId: optionId }),
  getHsnCodes: (params) => load("hsn-codes", params),
  getTaxes: (params) => load("taxes", params),
  getSystemOptions: (resource, params) => load(resource, params),
  getSellers: (params = {}) =>
    loadProtected("sellers", ENDPOINTS.sellers.list, {
      ...params,
      // Seller directories are server-searched and paginated. Never request
      // an unbounded directory just to populate a dropdown.
      limit: Math.min(Math.max(Number(params.limit) || 20, 1), 100),
    }, (item) => {
      const name =
        item.displayName ||
        item.businessName ||
        item.full_name ||
        item.userName ||
        item.sellerProfile?.displayName ||
        item.sellerProfile?.businessName ||
        item.sellerProfile?.legalBusinessName ||
        [item.profile?.firstName, item.profile?.lastName]
          .filter(Boolean)
          .join(" ") ||
        item.email ||
        item._id ||
        item.id;
      return {
        label: name,
        value: item._id || item.id,
        id: item._id || item.id,
        meta: {
          status: item.status || item.accountStatus || "",
          email: item.email || "",
          avatarUrl: item.profile?.avatarUrl || item.avatarUrl || "",
        },
      };
    }),
  getSellerOrganizations: (sellerId, params) =>
    loadProtected(
      `seller-organizations:${sellerId || "all"}`,
      ENDPOINTS.sellerOrganizations.list,
      { limit: 100, sellerId, ...params },
      (item) => ({
        label:
          item.storeDisplayName ||
          item.legalBusinessName ||
          item.gstin ||
          item.id ||
          item.organizationId,
        value: item.id || item.organizationId,
        id: item.id || item.organizationId,
        meta: {
          sellerId: item.sellerId,
          approvalStatus: item.approvalStatus,
          canOperate: item.canOperate,
        },
      }),
    ),
  getRoles: (params) =>
    loadProtected("roles", ENDPOINTS.rbac.roles, params, (item) => ({
      label: item.name || item.roleName || item.slug,
      value: item._id || item.id,
      id: item._id || item.id,
      meta: { slug: item.slug || item.roleKey || "" },
    })),
  getModules: (params) =>
    loadProtected("modules", ENDPOINTS.rbac.modules, params, (item) => ({
      label: item.moduleName || item.name || item.moduleKey,
      value: item._id || item.id,
      id: item._id || item.id,
      meta: { key: item.moduleKey || item.slug || "" },
    })),
  getPermissions: (params) =>
    loadProtected(
      "permissions",
      ENDPOINTS.rbac.permissions,
      params,
      (item) => ({
        label:
          item.name ||
          `${item.moduleKey || item.module || ""}:${item.action || ""}`,
        value: item._id || item.id,
        id: item._id || item.id,
        meta: {
          action: item.action || "",
          module: item.moduleKey || item.module || "",
        },
      }),
    ),
  getUsers: (params) =>
    loadProtected(
      "users",
      ENDPOINTS.users.adminUsers,
      { limit: 20, ...params },
      (item) => ({
        label:
          item.full_name ||
          [item.profile?.firstName, item.profile?.lastName]
            .filter(Boolean)
            .join(" ") ||
          item.email ||
          item._id ||
          item.id,
        value: item._id || item.id,
        id: item._id || item.id,
        meta: { email: item.email || "", phone: item.phone || "" },
      }),
    ),
  getBuyers: (params) =>
    loadProtected(
      "buyers",
      ENDPOINTS.users.adminUsers,
      { limit: 20, role: "user", ...params },
      (item) => ({
        label:
          item.full_name ||
          [item.profile?.firstName, item.profile?.lastName]
            .filter(Boolean)
            .join(" ") ||
          item.email ||
          item._id ||
          item.id,
        value: item._id || item.id,
        id: item._id || item.id,
        meta: { email: item.email || "" },
      }),
    ),
  getOrders: (params) =>
    loadProtected(
      "orders",
      ENDPOINTS.orders.listForPanel,
      { limit: 100, ...params },
      (item) => {
        const buyer = item.relations?.buyer || item.buyer || {};
        const buyerName =
          buyer.displayName || buyer.fullName || buyer.email || "Customer";
        return {
          label: `Order #${item.order_number || item.orderNumber || String(item.id || item._id || "").slice(-8)} · ${buyerName}`,
          value: item.id || item._id || item.orderId,
          id: item.id || item._id || item.orderId,
          meta: { status: item.status || "", buyerName },
        };
      },
    ),
};
