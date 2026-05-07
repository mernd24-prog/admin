const { ProductModel } = require("../models/product.model");

class ProductRepository {
  async create(payload) {
    return ProductModel.create(payload);
  }

  async paginate(filter, pagination) {
    const [items, total] = await Promise.all([
      ProductModel.find(filter).skip(pagination.skip).limit(pagination.limit).sort({ createdAt: -1 }),
      ProductModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async paginateBySeller(sellerId, filter, pagination) {
    return this.paginate({ ...filter, sellerId }, pagination);
  }

  async findById(productId) {
    return ProductModel.findById(productId);
  }

  async search(query, limit = 50) {
    return ProductModel.find(
      { $text: { $search: query }, status: "active" },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit);
  }

  async findByIds(productIds) {
    return ProductModel.find({ _id: { $in: productIds } });
  }

  async update(productId, payload) {
    return ProductModel.findByIdAndUpdate(productId, payload, { new: true });
  }

  async delete(productId) {
    return ProductModel.findByIdAndDelete(productId);
  }

  async reserveStock(productId, quantity) {
    return ProductModel.findOneAndUpdate(
      {
        _id: productId,
        $expr: {
          $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity],
        },
      },
      {
        $inc: { reservedStock: quantity },
      },
      { new: true },
    );
  }

  async releaseReservedStock(productId, quantity) {
    return ProductModel.findOneAndUpdate(
      {
        _id: productId,
        reservedStock: { $gte: quantity },
      },
      {
        $inc: { reservedStock: -quantity },
      },
      { new: true },
    );
  }

  async commitReservedStock(productId, quantity) {
    return ProductModel.findOneAndUpdate(
      {
        _id: productId,
        reservedStock: { $gte: quantity },
        stock: { $gte: quantity },
      },
      {
        $inc: {
          reservedStock: -quantity,
          stock: -quantity,
        },
      },
      { new: true },
    );
  }

  async addStock(productId, quantity) {
    return ProductModel.findByIdAndUpdate(productId, { $inc: { stock: quantity } }, { new: true });
  }

  async reviewProduct(productId, payload) {
    return ProductModel.findByIdAndUpdate(productId, payload, { new: true });
  }
}

module.exports = { ProductRepository };
