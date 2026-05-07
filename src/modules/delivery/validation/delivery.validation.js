"use strict";

const Joi = require("joi");
const { DELIVERY_STATUS } = require("../models/delivery.model");

const serviceabilitySchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    pincode: Joi.string().min(5).max(12).required(),
  }).required(),
  params: Joi.object({}).required(),
});

const orderDeliveryParamSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    orderId: Joi.string().required(),
  }).required(),
});

const createEWayBillSchema = Joi.object({
  body: Joi.object({
    invoiceId: Joi.string().allow("", null),
    eWayBillNumber: Joi.string().allow("", null),
    status: Joi.string().valid(...Object.values(DELIVERY_STATUS), "initiated").default("initiated"),
    validFrom: Joi.date().iso().allow(null),
    validUntil: Joi.date().iso().allow(null),
    transporterName: Joi.string().allow("", null),
    vehicleNumber: Joi.string().allow("", null),
    distanceKm: Joi.number().integer().min(0).allow(null),
    payloadSnapshot: Joi.object().default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    orderId: Joi.string().required(),
  }).required(),
});

const updateEWayBillStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...Object.values(DELIVERY_STATUS), "initiated").required(),
    transporterName: Joi.string().allow("", null),
    vehicleNumber: Joi.string().allow("", null),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    ewayBillId: Joi.string().required(),
  }).required(),
});

module.exports = {
  serviceabilitySchema,
  orderDeliveryParamSchema,
  createEWayBillSchema,
  updateEWayBillStatusSchema,
};
