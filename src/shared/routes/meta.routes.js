const express = require("express");
const { env } = require("../../config/env");

const metaRoutes = express.Router();

metaRoutes.get("/routes", (req, res) => {
  return res.json({
    success: true,
    data: {
      appName: env.appName,
      version: "1.0.0",
      apiPrefix: env.apiPrefix,
      modules: [
        "auth",
        "users",
        "products",
        "carts",
        "orders",
        "payments",
        "platform",
        "sellers",
        "notifications",
        "analytics",
        "pricing",
        "wallets",
        "admin",
        "tax",
        "subscriptions",
        "rbac",
        "warranty",
        "loyalty",
        "recommendations",
        "returns",
        "fraud",
        "dynamic-pricing",
      ],
      docs: {
        readme: "README.md",
        apiReference: "docs/API_REFERENCE.md",
      },
    },
  });
});

module.exports = { metaRoutes };
