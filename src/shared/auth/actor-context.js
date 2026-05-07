const { AppError } = require("../errors/app-error");

function buildActor(auth = {}) {
  return {
    userId: auth.sub || null,
    email: auth.email || null,
    role: auth.role || "guest",
    ownerAdminId: auth.ownerAdminId || null,
    ownerSellerId: auth.ownerSellerId || null,
    allowedModules: Array.isArray(auth.allowedModules) ? auth.allowedModules : [],
  };
}

function requireActor(req) {
  if (!req.auth) {
    throw new AppError("Authentication required", 401);
  }

  return buildActor(req.auth);
}

module.exports = { buildActor, requireActor };
