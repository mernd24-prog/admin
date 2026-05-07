"use strict";

const DELIVERY_STATUS = {
  INITIATED: "initiated",
  MANIFESTED: "manifested",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const SHIPPING_MODES = ["standard", "express", "same_day", "hyperlocal"];

module.exports = { DELIVERY_STATUS, SHIPPING_MODES };
