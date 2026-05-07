const { knex } = require("../../../infrastructure/postgres/postgres-client");
const { v4: uuidv4 } = require("uuid");
const { logger } = require("../../../shared/logger/logger");
const { AppError } = require("../../../shared/errors/app-error");

/**
 * Seller Commission Management (FINTECH SAFE)
 */

class SellerCommissionService {
  // ==============================
  // Helper: Safe Money Round
  // ==============================
  round(value) {
    return Math.round(value * 100) / 100;
  }

  // ==============================
  // Calculate Commission
  // ==============================
  async resolveCommissionInputs(orderId, sellerId, orderAmount) {
    if (sellerId && orderAmount > 0) {
      return { sellerId, orderAmount };
    }

    const orderItem = await knex("order_items")
      .select("seller_id")
      .where("order_id", orderId)
      .first();
    const order = await knex("orders")
      .select("subtotal_amount")
      .where("id", orderId)
      .first();

    if (!orderItem?.seller_id || Number(order?.subtotal_amount || 0) <= 0) {
      throw new AppError("Unable to resolve order commission data", 400);
    }

    return {
      sellerId: orderItem.seller_id,
      orderAmount: Number(order.subtotal_amount),
    };
  }

  async calculateCommission(orderId, sellerId, orderAmount, sellerTier = "bronze") {
    if (!orderId) {
      throw new AppError("Invalid commission input", 400);
    }

    const resolved = await this.resolveCommissionInputs(orderId, sellerId, orderAmount);

    const commissionRates = {
      bronze: 0.15,
      silver: 0.12,
      gold: 0.1,
      platinum: 0.08,
    };

    const rate = commissionRates[sellerTier] ?? commissionRates.bronze;

    const commissionAmount = this.round(orderAmount * rate);
    const taxAmount = this.round(commissionAmount * 0.18);
    const netAmount = this.round(commissionAmount - taxAmount);

    await knex("seller_commissions").insert({
      id: uuidv4(),
      seller_id: resolved.sellerId,
      order_id: orderId,
      amount: resolved.orderAmount,
      commission_rate: rate,
      commission_amount: commissionAmount,
      tax_amount: taxAmount,
      net_amount: netAmount,
      status: "pending",
      created_at: knex.fn.now(),
    });

    logger.info({ orderId, sellerId: resolved.sellerId, commissionAmount, taxAmount }, "Commission calculated");

    return { commissionAmount, taxAmount, netAmount };
  }

  // ==============================
  // Seller Earnings
  // ==============================
  async getSellerEarnings(sellerId, startDate, endDate) {
    const result = await knex("seller_commissions")
      .where("seller_id", sellerId)
      .whereBetween("created_at", [startDate, endDate])
      .whereIn("status", ["paid", "pending"])
      .sum({ total_earned: "net_amount" })
      .sum({ total_commission: "commission_amount" })
      .count({ order_count: "*" })
      .first();

    return result || {
      total_earned: 0,
      total_commission: 0,
      order_count: 0,
    };
  }

  // ==============================
  // Initiate Payout (TRANSACTION SAFE)
  // ==============================
  async initiatePayout(sellerId, periodStart, periodEnd) {
    return await knex.transaction(async (trx) => {
      // Lock rows to prevent race condition
      const commissions = await trx("seller_commissions")
        .where("seller_id", sellerId)
        .where("status", "pending")
        .forUpdate();

      if (!commissions.length) {
        throw new AppError("No commissions to payout", 400);
      }

      const totals = commissions.reduce(
        (acc, c) => {
          acc.totalAmount += Number(c.amount || 0);
          acc.commissionAmount += Number(c.commission_amount || 0);
          acc.taxAmount += Number(c.tax_amount || 0);
          acc.netAmount += Number(c.net_amount || 0);
          return acc;
        },
        { totalAmount: 0, commissionAmount: 0, taxAmount: 0, netAmount: 0 }
      );

      if (totals.netAmount <= 0) {
        throw new AppError("Invalid payout amount", 400);
      }

      const payoutId = uuidv4();

      await trx("seller_payouts").insert({
        id: payoutId,
        seller_id: sellerId,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount: this.round(totals.totalAmount),
        commission_amount: this.round(totals.commissionAmount),
        tax_amount: this.round(totals.taxAmount),
        net_amount: this.round(totals.netAmount),
        status: "processing",
        created_at: knex.fn.now(),
      });

      // Mark commissions as paid (linked to payout)
      await trx("seller_commissions")
        .whereIn(
          "id",
          commissions.map((c) => c.id)
        )
        .update({
          status: "paid",
          payout_id: payoutId,
        });

      logger.info(
        { sellerId, payoutId, amount: totals.netAmount },
        "Payout initiated"
      );

      return payoutId;
    });
  }

  // ==============================
  // Process Payout (IDEMPOTENT)
  // ==============================
  async processPayout(payoutId, paymentReference) {
    return await knex.transaction(async (trx) => {
      const payout = await trx("seller_payouts")
        .where("id", payoutId)
        .first()
        .forUpdate();

      if (!payout) {
        throw new AppError("Payout not found", 404);
      }

      if (payout.status === "completed") {
        return payout; // idempotent
      }

      await trx("seller_payouts")
        .where("id", payoutId)
        .update({
          status: "completed",
          payment_reference: paymentReference,
        });

      logger.info(
        { payoutId, reference: paymentReference },
        "Payout completed"
      );

      return { ...payout, status: "completed", payment_reference: paymentReference };
    });
  }

  async getSellerCommissions(sellerId) {
    return knex("seller_commissions")
      .where("seller_id", sellerId)
      .orderBy("created_at", "desc");
  }

  async getSellerPayouts(sellerId) {
    return knex("seller_payouts")
      .where("seller_id", sellerId)
      .orderBy("created_at", "desc");
  }

  async processBatchPayouts(sellerId) {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);
    const payoutId = await this.initiatePayout(sellerId, periodStart, periodEnd);
    return this.processPayout(payoutId, `batch_${Date.now()}`);
  }

  async getSettlements() {
    return knex("seller_settlements").orderBy("created_at", "desc");
  }
}

const commissionService = new SellerCommissionService();

module.exports = {
  SellerCommissionService: commissionService,
  CommissionService: commissionService,
};
