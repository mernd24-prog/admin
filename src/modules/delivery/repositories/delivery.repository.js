"use strict";

const { knex } = require("../../../infrastructure/postgres/postgres-client");
const { v4: uuidv4 } = require("uuid");

class DeliveryRepository {
  async getServiceability(pincode) {
    const [serviceability] = await knex("pincode_serviceability")
      .where({ pincode })
      .limit(1);
    const exclusions = await knex("delivery_exclusions")
      .where({ pincode, active: true })
      .orderBy("created_at", "desc");

    return { serviceability: serviceability || null, exclusions };
  }

  async createEWayBill(payload) {
    const [record] = await knex("e_way_bill_details")
      .insert({
        id: uuidv4(),
        order_id: payload.orderId,
        invoice_id: payload.invoiceId || null,
        e_way_bill_number: payload.eWayBillNumber || null,
        status: payload.status || "initiated",
        valid_from: payload.validFrom || null,
        valid_until: payload.validUntil || null,
        transporter_name: payload.transporterName || null,
        vehicle_number: payload.vehicleNumber || null,
        distance_km: payload.distanceKm || null,
        payload_snapshot: payload.payloadSnapshot || {},
      })
      .returning("*");

    return record;
  }

  async findEWayBillByOrderId(orderId) {
    const [record] = await knex("e_way_bill_details")
      .where("order_id", orderId)
      .orderBy("created_at", "desc")
      .limit(1);
    return record || null;
  }

  async findEWayBillById(ewayBillId) {
    const [record] = await knex("e_way_bill_details")
      .where("id", ewayBillId)
      .limit(1);
    return record || null;
  }

  async updateEWayBillStatus(ewayBillId, payload) {
    const [record] = await knex("e_way_bill_details")
      .where("id", ewayBillId)
      .update({
        status: payload.status,
        transporter_name: payload.transporterName,
        vehicle_number: payload.vehicleNumber,
        updated_at: knex.fn.now(),
      })
      .returning("*");

    return record || null;
  }
}

module.exports = { DeliveryRepository };
