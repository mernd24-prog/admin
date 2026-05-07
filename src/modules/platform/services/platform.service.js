const { buildPagination } = require("../../../shared/lib/pagination");
const { PlatformRepository } = require("../repositories/platform.repository");
const { AppError } = require("../../../shared/errors/app-error");

class PlatformService {
  constructor({ platformRepository = new PlatformRepository() } = {}) {
    this.platformRepository = platformRepository;
  }

  async createCategory(payload) {
    return this.platformRepository.createCategory(payload);
  }

  async updateCategory(categoryKey, payload) {
    const category = await this.platformRepository.getCategory(categoryKey);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return this.platformRepository.updateCategory(categoryKey, payload);
  }

  async getCategory(categoryKey) {
    const category = await this.platformRepository.getCategory(categoryKey);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return category;
  }

  async listCategories(query) {
    const pagination = buildPagination(query);
    const filter = {};
    if (query.parentKey) filter.parentKey = query.parentKey;
    if (query.active !== undefined) filter.active = query.active === "true";
    if (query.categoryKey) filter.categoryKey = query.categoryKey;
    return this.platformRepository.listCategories(filter, pagination);
  }

  async deleteCategory(categoryKey) {
    const category = await this.platformRepository.getCategory(categoryKey);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return this.platformRepository.deleteCategory(categoryKey);
  }

  async createProductFamily(payload) {
    return this.platformRepository.createProductFamily(payload);
  }

  async updateProductFamily(familyCode, payload) {
    const family = await this.platformRepository.getProductFamily(familyCode);
    if (!family) {
      throw new AppError("Product family not found", 404);
    }
    return this.platformRepository.updateProductFamily(familyCode, payload);
  }

  async getProductFamily(familyCode) {
    const family = await this.platformRepository.getProductFamily(familyCode);
    if (!family) {
      throw new AppError("Product family not found", 404);
    }
    return family;
  }

  async listProductFamilies(query) {
    const pagination = buildPagination(query);
    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.sellerId) filter.sellerId = query.sellerId;
    if (query.status) filter.status = query.status;
    return this.platformRepository.listProductFamilies(filter, pagination);
  }

  async deleteProductFamily(familyCode) {
    const family = await this.platformRepository.getProductFamily(familyCode);
    if (!family) {
      throw new AppError("Product family not found", 404);
    }
    return this.platformRepository.deleteProductFamily(familyCode);
  }

  async createProductVariant(payload) {
    return this.platformRepository.createProductVariant(payload);
  }

  async updateProductVariant(variantId, payload) {
    const variant = await this.platformRepository.getProductVariant(variantId);
    if (!variant) {
      throw new AppError("Product variant not found", 404);
    }
    return this.platformRepository.updateProductVariant(variantId, payload);
  }

  async getProductVariant(variantId) {
    const variant = await this.platformRepository.getProductVariant(variantId);
    if (!variant) {
      throw new AppError("Product variant not found", 404);
    }
    return variant;
  }

  async listProductVariants(query) {
    const pagination = buildPagination(query);
    const filter = {};
    if (query.productId) filter.productId = query.productId;
    if (query.familyCode) filter.familyCode = query.familyCode;
    if (query.sellerId) filter.sellerId = query.sellerId;
    if (query.status) filter.status = query.status;
    return this.platformRepository.listProductVariants(filter, pagination);
  }

  async deleteProductVariant(variantId) {
    const variant = await this.platformRepository.getProductVariant(variantId);
    if (!variant) {
      throw new AppError("Product variant not found", 404);
    }
    return this.platformRepository.deleteProductVariant(variantId);
  }

  async createHsnCode(payload) {
    return this.platformRepository.createHsnCode(payload);
  }

  async updateHsnCode(code, payload) {
    const item = await this.platformRepository.getHsnCode(code);
    if (!item) {
      throw new AppError("HSN code not found", 404);
    }
    return this.platformRepository.updateHsnCode(code, payload);
  }

  async getHsnCode(code) {
    const item = await this.platformRepository.getHsnCode(code);
    if (!item) {
      throw new AppError("HSN code not found", 404);
    }
    return item;
  }

  async listHsnCodes(query) {
    const pagination = buildPagination(query);
    const filter = {};
    if (query.active !== undefined) filter.active = query.active === "true";
    if (query.category) filter.category = query.category;
    return this.platformRepository.listHsnCodes(filter, pagination);
  }

  async deleteHsnCode(code) {
    const item = await this.platformRepository.getHsnCode(code);
    if (!item) {
      throw new AppError("HSN code not found", 404);
    }
    return this.platformRepository.deleteHsnCode(code);
  }

  async createGeography(payload) {
    return this.platformRepository.createGeography(payload);
  }

  async updateGeography(countryCode, payload) {
    const item = await this.platformRepository.getGeography(countryCode);
    if (!item) {
      throw new AppError("Geography record not found", 404);
    }
    return this.platformRepository.updateGeography(countryCode, payload);
  }

  async getGeography(countryCode) {
    const item = await this.platformRepository.getGeography(countryCode);
    if (!item) {
      throw new AppError("Geography record not found", 404);
    }
    return item;
  }

  async listGeographies(query) {
    const pagination = buildPagination(query);
    const filter = {};
    if (query.active !== undefined) filter.active = query.active === "true";
    return this.platformRepository.listGeographies(filter, pagination);
  }

  async deleteGeography(countryCode) {
    const item = await this.platformRepository.getGeography(countryCode);
    if (!item) {
      throw new AppError("Geography record not found", 404);
    }
    return this.platformRepository.deleteGeography(countryCode);
  }

  async createContentPage(payload) {
    if (payload.published && !payload.publishedAt) {
      payload.publishedAt = new Date();
    }
    return this.platformRepository.createContentPage(payload);
  }

  async updateContentPage(slug, payload) {
    const item = await this.platformRepository.getContentPage(slug);
    if (!item) {
      throw new AppError("Content page not found", 404);
    }
    if (payload.published && !payload.publishedAt) {
      payload.publishedAt = new Date();
    }
    return this.platformRepository.updateContentPage(slug, payload);
  }

  async getContentPage(slug) {
    const item = await this.platformRepository.getContentPage(slug);
    if (!item) {
      throw new AppError("Content page not found", 404);
    }
    return item;
  }

  async listContentPages(query) {
    const pagination = buildPagination(query);
    const filter = {};
    if (query.pageType) filter.pageType = query.pageType;
    if (query.language) filter.language = query.language;
    if (query.published !== undefined) filter.published = query.published === "true";
    return this.platformRepository.listContentPages(filter, pagination);
  }

  async deleteContentPage(slug) {
    const item = await this.platformRepository.getContentPage(slug);
    if (!item) {
      throw new AppError("Content page not found", 404);
    }
    return this.platformRepository.deleteContentPage(slug);
  }
}

module.exports = { PlatformService };