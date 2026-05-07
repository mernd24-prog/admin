const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");
const { AppError } = require("../errors/app-error");
const { UserModel } = require("../../modules/user/models/user.model");
const { ROLES } = require("../constants/roles");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    req.auth = jwt.verify(token, env.jwtAccessSecret);
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired token", 401));
  }
}

async function authenticatePendingSeller(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.auth = payload;

    // Check if this is an onboarding token for a pending seller
    if (!payload.isOnboarding || payload.role !== ROLES.SELLER) {
      return next(new AppError("Access denied", 403));
    }

    // Verify user exists and is still in onboarding state.
    const user = await UserModel.findById(payload.sub);
    const onboardingComplete = user?.sellerProfile?.onboardingStatus === "ready_for_go_live";
    if (!user || onboardingComplete) {
      return next(new AppError("Access denied", 403));
    }

    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired token", 401));
  }
}

module.exports = { authenticate, authenticatePendingSeller };
