const Joi = require("joi");

const createModuleSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(128).required(),
    slug: Joi.string().min(3).max(128).required(),
    description: Joi.string().max(1000),
    icon: Joi.string().max(128),
    order: Joi.number().integer().default(0),
    active: Joi.boolean().default(true),
    metadata: Joi.object().default({}),
  }),
};

const updateModuleSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(128),
    slug: Joi.string().min(3).max(128),
    description: Joi.string().max(1000),
    icon: Joi.string().max(128),
    order: Joi.number().integer(),
    active: Joi.boolean(),
    metadata: Joi.object(),
  }).min(1),
};

const listModulesSchema = {
  query: Joi.object({
    active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

const permissionManagementSchema = {
  query: Joi.object({
    roleId: Joi.string().uuid(),
    roleSlug: Joi.string().trim().min(2).max(128),
    active: Joi.boolean().default(true),
  }).oxor("roleId", "roleSlug"),
};

const moduleParamSchema = {
  params: Joi.object({
    moduleId: Joi.string().uuid().required(),
  }),
};

const createPermissionSchema = {
  body: Joi.object({
    moduleId: Joi.string().uuid().required(),
    name: Joi.string().min(3).max(128).required(),
    slug: Joi.string().min(3).max(128).required(),
    description: Joi.string().max(1000),
    action: Joi.string()
      .valid("create", "read", "update", "delete", "manage")
      .default("read"),
    active: Joi.boolean().default(true),
    metadata: Joi.object().default({}),
  }),
};

const updatePermissionSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(128),
    slug: Joi.string().min(3).max(128),
    description: Joi.string().max(1000),
    action: Joi.string().valid("create", "read", "update", "delete", "manage"),
    active: Joi.boolean(),
    metadata: Joi.object(),
  }).min(1),
};

const listPermissionsSchema = {
  query: Joi.object({
    moduleId: Joi.string().uuid(),
    active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

const permissionParamSchema = {
  params: Joi.object({
    permissionId: Joi.string().uuid().required(),
  }),
};

const createRoleSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(128).required(),
    slug: Joi.string().min(3).max(128).required(),
    description: Joi.string().max(1000),
    type: Joi.string().valid("system", "custom").default("custom"),
    isSuperAdmin: Joi.boolean().default(false),
    active: Joi.boolean().default(true),
    metadata: Joi.object().default({}),
  }),
};

const updateRoleSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(128),
    slug: Joi.string().min(3).max(128),
    description: Joi.string().max(1000),
    type: Joi.string().valid("system", "custom"),
    active: Joi.boolean(),
    metadata: Joi.object(),
  }).min(1),
};

const listRolesSchema = {
  query: Joi.object({
    active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

const roleParamSchema = {
  params: Joi.object({
    roleId: Joi.string().uuid().required(),
  }),
};

const assignPermissionSchema = {
  body: Joi.object({
    permissionId: Joi.string().uuid().required(),
  }),
};

const removePermissionSchema = {
  body: Joi.object({
    permissionId: Joi.string().uuid().required(),
  }),
};

const bulkAssignPermissionsSchema = {
  body: Joi.object({
    permissionIds: Joi.array().items(Joi.string().uuid()).required().min(1),
  }),
};

const userPermissionParamSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
};

const assignRoleSchema = {
  body: Joi.object({
    roleId: Joi.string().uuid().required(),
  }),
};

const removeRoleSchema = {
  body: Joi.object({
    roleId: Joi.string().uuid().required(),
  }),
};

const bulkAssignRolesSchema = {
  body: Joi.object({
    roleIds: Joi.array().items(Joi.string().uuid()).required().min(1),
  }),
};

const checkPermissionSchema = {
  query: Joi.object({
    permissionSlug: Joi.string().required(),
  }),
};

const checkRoleSchema = {
  query: Joi.object({
    roleSlug: Joi.string().required(),
  }),
};

module.exports = {
  createModuleSchema,
  updateModuleSchema,
  listModulesSchema,
  permissionManagementSchema,
  moduleParamSchema,
  createPermissionSchema,
  updatePermissionSchema,
  listPermissionsSchema,
  permissionParamSchema,
  createRoleSchema,
  updateRoleSchema,
  listRolesSchema,
  roleParamSchema,
  assignPermissionSchema,
  removePermissionSchema,
  bulkAssignPermissionsSchema,
  userPermissionParamSchema,
  assignRoleSchema,
  removeRoleSchema,
  bulkAssignRolesSchema,
  checkPermissionSchema,
  checkRoleSchema,
};
