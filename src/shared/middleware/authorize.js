const { AppError } = require("../errors/app-error");
const { hasCapability } = require("../auth/access-control");
const { ROLES } = require("../constants/roles");
const {
  isScopedRole,
  resolveRequestModule,
  normalizeModuleName,
} = require("../auth/module-scope");

function getUserRoles(req) {
  const roles = [];
  if (req.auth?.role) roles.push(req.auth.role);
  if (Array.isArray(req.auth?.roles)) roles.push(...req.auth.roles);
  return Array.from(new Set(roles));
}

function isSuperAdmin(req) {
  if (req.auth?.isSuperAdmin === true) {
    return true;
  }
  return getUserRoles(req).includes(ROLES.SUPER_ADMIN);
}

function enforceModuleScope(req) {
  if (!isScopedRole(req.auth)) {
    return null;
  }

  const requestModule = resolveRequestModule(req);
  if (!requestModule) {
    return null;
  }

  const allowedModules = Array.isArray(req.auth?.allowedModules)
    ? req.auth.allowedModules.map(normalizeModuleName)
    : [];

  if (!allowedModules.length) {
    return new AppError("Forbidden: no modules assigned", 403);
  }

  if (!allowedModules.includes(normalizeModuleName(requestModule))) {
    return new AppError(
      `Forbidden: module access denied for ${requestModule}`,
      403,
    );
  }

  return null;
}

function flattenRoles(roles = []) {
  return roles.flatMap((role) => (Array.isArray(role) ? role : [role]));
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }

    if (isSuperAdmin(req)) {
      return next();
    }

    const scopeError = enforceModuleScope(req);
    if (scopeError) {
      return next(scopeError);
    }

    const userRoles = getUserRoles(req);
    const allowedRoles = flattenRoles(roles);
    const allowed = allowedRoles.some((role) => userRoles.includes(role));
    if (!allowed) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
}

function authorizeCapability(...capabilities) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }

    if (isSuperAdmin(req)) {
      return next();
    }

    const scopeError = enforceModuleScope(req);
    if (scopeError) {
      return next(scopeError);
    }

    const userRoles = getUserRoles(req);
    const allowed = capabilities.every((capability) => {
      if (
        Array.isArray(req.auth.permissions) &&
        req.auth.permissions.includes(capability)
      ) {
        return true;
      }
      return userRoles.some((role) => hasCapability(role, capability));
    });

    if (!allowed) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
}

function authorizePermission(...permissionSlugs) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }

    if (isSuperAdmin(req)) {
      return next();
    }

    const scopeError = enforceModuleScope(req);
    if (scopeError) {
      return next(scopeError);
    }

    const grantedPermissions = Array.isArray(req.auth.permissions)
      ? req.auth.permissions
      : [];
    const allowed = permissionSlugs.every((permission) => {
      if (grantedPermissions.includes(permission)) {
        return true;
      }
      const legacyRbacPermission = permission.startsWith("rbac:")
        ? permission.replace(/^rbac:/, "")
        : null;
      return legacyRbacPermission
        ? grantedPermissions.includes(legacyRbacPermission)
        : false;
    });

    if (!allowed) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
}

module.exports = { authorize, authorizeCapability, authorizePermission };
