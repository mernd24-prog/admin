const { CategoryTreeModel } = require("../models/category-tree.model");
const { ProductFamilyModel } = require("../models/product-family.model");
const { ProductVariantModel } = require("../models/product-variant.model");
const { HsnCodeModel } = require("../models/hsn-code.model");
const { GeographyModel } = require("../models/geography.model");
const { ContentPageModel } = require("../models/content-page.model");

class PlatformRepository {
  async createCategory(payload) {
    return CategoryTreeModel.create(payload);
  }

  async updateCategory(categoryKey, payload) {
    return CategoryTreeModel.findOneAndUpdate({ categoryKey }, payload, { new: true });
  }

  async getCategory(categoryKey) {
    return CategoryTreeModel.findOne({ categoryKey });
  }

  async listCategories(filter = {}, pagination = {}) {
    const [items, total] = await Promise.all([
      CategoryTreeModel.find(filter).sort({ sortOrder: 1, title: 1 }).skip(pagination.skip).limit(pagination.limit),
      CategoryTreeModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async deleteCategory(categoryKey) {
    return CategoryTreeModel.findOneAndDelete({ categoryKey });
  }

  async createProductFamily(payload) {
    return ProductFamilyModel.create(payload);
  }

  async updateProductFamily(familyCode, payload) {
    return ProductFamilyModel.findOneAndUpdate({ familyCode }, payload, { new: true });
  }

  async getProductFamily(familyCode) {
    return ProductFamilyModel.findOne({ familyCode });
  }

  async listProductFamilies(filter = {}, pagination = {}) {
    const [items, total] = await Promise.all([
      ProductFamilyModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      ProductFamilyModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async deleteProductFamily(familyCode) {
    return ProductFamilyModel.findOneAndDelete({ familyCode });
  }

  async createProductVariant(payload) {
    return ProductVariantModel.create(payload);
  }

  async updateProductVariant(variantId, payload) {
    return ProductVariantModel.findByIdAndUpdate(variantId, payload, { new: true });
  }

  async getProductVariant(variantId) {
    return ProductVariantModel.findById(variantId);
  }

  async listProductVariants(filter = {}, pagination = {}) {
    const [items, total] = await Promise.all([
      ProductVariantModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      ProductVariantModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async deleteProductVariant(variantId) {
    return ProductVariantModel.findByIdAndDelete(variantId);
  }

  async createHsnCode(payload) {
    return HsnCodeModel.create(payload);
  }

  async updateHsnCode(code, payload) {
    return HsnCodeModel.findOneAndUpdate({ code }, payload, { new: true });
  }

  async getHsnCode(code) {
    return HsnCodeModel.findOne({ code });
  }

  async listHsnCodes(filter = {}, pagination = {}) {
    const [items, total] = await Promise.all([
      HsnCodeModel.find(filter).sort({ code: 1 }).skip(pagination.skip).limit(pagination.limit),
      HsnCodeModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async deleteHsnCode(code) {
    return HsnCodeModel.findOneAndDelete({ code });
  }

  async createGeography(payload) {
    return GeographyModel.create(payload);
  }

  async updateGeography(countryCode, payload) {
    return GeographyModel.findOneAndUpdate({ countryCode }, payload, { new: true });
  }

  async getGeography(countryCode) {
    return GeographyModel.findOne({ countryCode });
  }

  async listGeographies(filter = {}, pagination = {}) {
    const [items, total] = await Promise.all([
      GeographyModel.find(filter).sort({ countryName: 1 }).skip(pagination.skip).limit(pagination.limit),
      GeographyModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async deleteGeography(countryCode) {
    return GeographyModel.findOneAndDelete({ countryCode });
  }

  async createContentPage(payload) {
    return ContentPageModel.create(payload);
  }

  async updateContentPage(slug, payload) {
    return ContentPageModel.findOneAndUpdate({ slug }, payload, { new: true });
  }

  async getContentPage(slug) {
    return ContentPageModel.findOne({ slug });
  }

  async listContentPages(filter = {}, pagination = {}) {
    const [items, total] = await Promise.all([
      ContentPageModel.find(filter).sort({ publishedAt: -1, title: 1 }).skip(pagination.skip).limit(pagination.limit),
      ContentPageModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async deleteContentPage(slug) {
    return ContentPageModel.findOneAndDelete({ slug });
  }
}

module.exports = { PlatformRepository };