const slugify = require("slugify");
const { buildPagination } = require("../../../shared/lib/pagination");
const { ProductRepository } = require("../repositories/product.repository");
const { elasticsearchClient } = require("../../../shared/search/elasticsearch-client");
const { getOrSetCache } = require("../../../shared/lib/cache");
const { AppError } = require("../../../shared/errors/app-error");
const { PRODUCT_STATUS } = require("../../../shared/domain/commerce-constants");
const { logger } = require("../../../shared/logger/logger");

class ProductService {
  constructor({ productRepository = new ProductRepository() } = {}) {
    this.productRepository = productRepository;
  }

  async createProduct(payload, actor) {
    const isSeller = actor.role === "seller";
    const status = isSeller ? PRODUCT_STATUS.PENDING_APPROVAL : payload.status || PRODUCT_STATUS.DRAFT;
    const product = await this.productRepository.create({
      ...payload,
      status,
      sellerId: actor.userId,
      slug: slugify(`${payload.title}-${Date.now()}`, { lower: true, strict: true }),
      moderation: {
        submittedAt: new Date(),
        checklist: payload.moderationChecklist || {
          titleVerified: false,
          categoryVerified: false,
          complianceVerified: false,
          mediaVerified: false,
        },
      },
    });

    if (product.status === PRODUCT_STATUS.ACTIVE) {
      try {
        await elasticsearchClient.index({
          index: "products",
          document: {
            id: product.id,
            title: product.title,
            category: product.category,
            description: product.description,
            price: product.price,
            hsnCode: product.hsnCode,
            color: product.color,
            origin: product.origin,
          },
        });
      } catch (error) {
        logger.error(
          { err: error, productId: product.id },
          "Elasticsearch index failed during product creation",
        );
      }
    }

    return product;
  }

  async updateProduct(productId, payload, actor) {
    const existingProduct = await this.productRepository.findById(productId);
    if (!existingProduct) {
      throw new AppError("Product not found", 404);
    }

    if (actor.role === "seller" && existingProduct.sellerId !== actor.userId) {
      throw new AppError("Permission denied", 403);
    }

    const updatedProduct = await this.productRepository.update(productId, payload);

    if (updatedProduct.status === PRODUCT_STATUS.ACTIVE) {
      try {
        await elasticsearchClient.index({
          index: "products",
          id: String(updatedProduct.id),
          document: {
            id: updatedProduct.id,
            title: updatedProduct.title,
            category: updatedProduct.category,
            description: updatedProduct.description,
            price: updatedProduct.price,
            hsnCode: updatedProduct.hsnCode,
            color: updatedProduct.color,
            origin: updatedProduct.origin,
          },
        });
      } catch (error) {
        logger.error(
          { err: error, productId: updatedProduct.id },
          "Elasticsearch index failed during product update",
        );
      }
    }

    return updatedProduct;
  }

  async listProducts(query) {
    const pagination = buildPagination(query);
    const filter = {};

    if (query.category) {
      filter.category = query.category;
    }
    if (query.hsnCode) {
      filter.hsnCode = query.hsnCode;
    }
    if (query.color) {
      filter.color = query.color;
    }
    if (query.productFamilyCode) {
      filter.productFamilyCode = query.productFamilyCode;
    }
    if (query.sku) {
      filter.sku = query.sku;
    }
    if (query.country) {
      filter["origin.country"] = query.country;
    }
    if (query.state) {
      filter["origin.state"] = query.state;
    }
    if (query.city) {
      filter["origin.city"] = query.city;
    }

    filter.status = query.status || PRODUCT_STATUS.ACTIVE;

    return getOrSetCache(`products:${JSON.stringify({ filter, pagination })}`, 60, () =>
      this.productRepository.paginate(filter, pagination),
    );
  }

  async listSellerProducts(query, actor) {
    const pagination = buildPagination(query);
    const sellerId = actor.ownerSellerId || actor.userId;
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.sku) {
      filter.sku = query.sku;
    }

    return this.productRepository.paginateBySeller(sellerId, filter, pagination);
  }

  async getProduct(productId) {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return product;
  }

  async searchProducts(query) {
    try {
      const response = await elasticsearchClient.search({
        index: "products",
        query: {
          multi_match: {
            query: query.q,
            fields: ["title^3", "category", "description", "color", "hsnCode"],
          },
        },
      });

      return response.hits.hits.map((item) => item._source);
    } catch (error) {
      logger.warn(
        { err: error, query: query.q },
        "Elasticsearch search failed, falling back to Mongo search",
      );
      return this.productRepository.search(query.q, 50);
    }
  }

  async reviewProduct(productId, payload, actor) {
    const existingProduct = await this.productRepository.findById(productId);
    if (!existingProduct) {
      throw new AppError("Product not found", 404);
    }

    const nextStatus = payload.status;
    const updatedProduct = await this.productRepository.reviewProduct(productId, {
      status: nextStatus,
      moderation: {
        ...(existingProduct.moderation || {}),
        reviewedAt: new Date(),
        reviewedBy: actor.userId,
        rejectionReason: payload.rejectionReason || null,
        checklist: payload.checklist || existingProduct.moderation?.checklist || {},
      },
    });

    if (nextStatus === PRODUCT_STATUS.ACTIVE) {
      try {
        await elasticsearchClient.index({
          index: "products",
          id: String(updatedProduct.id),
          document: {
            id: updatedProduct.id,
            title: updatedProduct.title,
            category: updatedProduct.category,
            price: updatedProduct.price,
            description: updatedProduct.description,
          },
        });
      } catch (error) {
        logger.error(
          { err: error, productId: updatedProduct.id },
          "Elasticsearch index failed during product moderation",
        );
      }
    }

    if ([PRODUCT_STATUS.INACTIVE, PRODUCT_STATUS.REJECTED].includes(nextStatus)) {
      try {
        await elasticsearchClient.delete({
          index: "products",
          id: String(existingProduct.id),
        });
      } catch (error) {
        if (error?.meta?.statusCode !== 404) {
          logger.error(
            { err: error, productId: existingProduct.id },
            "Elasticsearch delete failed during product moderation",
          );
        }
      }
    }

    return updatedProduct;
  }

  async deleteProduct(productId, actor) {
    const existingProduct = await this.productRepository.findById(productId);
    if (!existingProduct) {
      throw new AppError("Product not found", 404);
    }

    const sellerId = actor.ownerSellerId || actor.userId;
    if (["seller", "seller-sub-admin"].includes(actor.role) && existingProduct.sellerId !== sellerId) {
      throw new AppError("Permission denied", 403);
    }

    return this.productRepository.delete(productId);
  }
}

module.exports = { ProductService };
