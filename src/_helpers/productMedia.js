import { apiUrl } from "./axiosProvider";

const apiOrigin = String(apiUrl || "").replace(/\/api\/v1\/?$/i, "");

const MEDIA_URL_KEYS = [
  "url",
  "imageURL",
  "imageUrl",
  "secure_url",
  "src",
  "thumbnail",
  "thumbnailUrl",
  "displayUrl",
  "path",
];

const isAbsoluteMediaUrl = (value = "") =>
  /^(https?:|data:|blob:|\/\/)/i.test(String(value || ""));

export const resolveMediaUrl = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("//")) {
      const protocol =
        typeof window !== "undefined" ? window.location.protocol : "https:";
      return `${protocol}${trimmed}`;
    }
    if (isAbsoluteMediaUrl(trimmed)) return trimmed;
    if (trimmed.startsWith("/uploads/")) return `${apiOrigin}${trimmed}`;
    if (trimmed.startsWith("uploads/")) return `${apiOrigin}/${trimmed}`;
    if (trimmed.startsWith("/api/v1/uploads/")) {
      return `${apiOrigin}${trimmed.replace(/^\/api\/v1/i, "")}`;
    }
    return trimmed;
  }

  if (typeof value !== "object") return "";

  for (const key of MEDIA_URL_KEYS) {
    const resolved = resolveMediaUrl(value[key]);
    if (resolved) return resolved;
  }

  return resolveMediaUrl(value.image || value.file || value.media);
};

export const normalizeImageList = (...sources) => {
  const urls = [];
  const seen = new Set();

  const add = (source) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach(add);
      return;
    }
    const url = resolveMediaUrl(source);
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  sources.forEach(add);
  return urls;
};

export const getDefaultVariant = (product = {}) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  return (
    variants.find((variant) => variant?.isDefault === true) ||
    variants.find((variant) => variant?.status !== "inactive") ||
    variants[0] ||
    null
  );
};

export const getProductImages = (product = {}) =>
  normalizeImageList(
    getDefaultVariant(product)?.images,
    product.images,
    product.imageUrls,
    product.product_image_id?.images,
    product.media?.images,
    product.gallery,
    product.image,
    product.thumbnail,
    product.thumbnailUrl,
  );

export const getPrimaryProductImage = (product = {}) =>
  getProductImages(product)[0] || "";
