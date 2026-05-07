const { v4: uuidv4 } = require("uuid");
const {
  sequelize,
} = require("../../src/infrastructure/sequelize/sequelize-client");

async function seedRbac() {
  const transaction = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    console.log("✓ Database connected\n");

    const modules = [
      {
        id: uuidv4(),
        name: "RBAC Management",
        slug: "rbac",
        description: "Role-Based Access Control management",
        icon: "shield",
        order: 1,
      },
      {
        id: uuidv4(),
        name: "Product Management",
        slug: "product",
        description: "Product catalog and management",
        icon: "box",
        order: 2,
      },
      {
        id: uuidv4(),
        name: "User Management",
        slug: "user",
        description: "User accounts and profiles",
        icon: "user",
        order: 3,
      },
      {
        id: uuidv4(),
        name: "Order Management",
        slug: "order",
        description: "Orders and transactions",
        icon: "shopping-cart",
        order: 4,
      },
      {
        id: uuidv4(),
        name: "Seller Management",
        slug: "seller",
        description: "Seller accounts and administration",
        icon: "store",
        order: 5,
      },
      {
        id: uuidv4(),
        name: "Admin Dashboard",
        slug: "admin",
        description: "Admin panel and analytics",
        icon: "dashboard",
        order: 6,
      },
      {
        id: uuidv4(),
        name: "Analytics",
        slug: "analytics",
        description: "Analytics and reporting",
        icon: "chart",
        order: 7,
      },
      {
        id: uuidv4(),
        name: "Settings",
        slug: "settings",
        description: "Platform settings and configuration",
        icon: "settings",
        order: 8,
      },
    ];

    // Insert or update modules
    for (const module of modules) {
      const [existingModules] = await sequelize.query(
        `SELECT id FROM modules WHERE slug = :slug LIMIT 1`,
        {
          replacements: { slug: module.slug },
          transaction,
        },
      );

      if (existingModules.length > 0) {
        module.id = existingModules[0].id;
        await sequelize.query(
          `UPDATE modules
           SET name = :name,
               description = :description,
               icon = :icon,
               "order" = :order,
               active = true,
               updated_at = NOW()
           WHERE id = :id`,
          {
            replacements: module,
            transaction,
          },
        );
      } else {
        await sequelize.query(
          `INSERT INTO modules (id, name, slug, description, icon, "order", active, created_at, updated_at)
           VALUES (:id, :name, :slug, :description, :icon, :order, true, NOW(), NOW())`,
          {
            replacements: module,
            transaction,
          },
        );
      }
    }

    console.log(`✓ Created ${modules.length} modules`);

    // Define permissions by module
    const permissions = [
      // RBAC permissions
      {
        moduleId: modules[0].id,
        name: "Create Module",
        slug: "rbac:module:create",
        action: "create",
      },
      {
        moduleId: modules[0].id,
        name: "Read Module",
        slug: "rbac:module:read",
        action: "read",
      },
      {
        moduleId: modules[0].id,
        name: "Update Module",
        slug: "rbac:module:update",
        action: "update",
      },
      {
        moduleId: modules[0].id,
        name: "Delete Module",
        slug: "rbac:module:delete",
        action: "delete",
      },
      {
        moduleId: modules[0].id,
        name: "Create Permission",
        slug: "rbac:permission:create",
        action: "create",
      },
      {
        moduleId: modules[0].id,
        name: "Read Permission",
        slug: "rbac:permission:read",
        action: "read",
      },
      {
        moduleId: modules[0].id,
        name: "Update Permission",
        slug: "rbac:permission:update",
        action: "update",
      },
      {
        moduleId: modules[0].id,
        name: "Create Role",
        slug: "rbac:role:create",
        action: "create",
      },
      {
        moduleId: modules[0].id,
        name: "Read Role",
        slug: "rbac:role:read",
        action: "read",
      },
      {
        moduleId: modules[0].id,
        name: "Update Role",
        slug: "rbac:role:update",
        action: "update",
      },
      {
        moduleId: modules[0].id,
        name: "Assign Role Permission",
        slug: "rbac:role:assign-permission",
        action: "manage",
      },
      {
        moduleId: modules[0].id,
        name: "Remove Role Permission",
        slug: "rbac:role:remove-permission",
        action: "manage",
      },
      {
        moduleId: modules[0].id,
        name: "Assign User Permission",
        slug: "rbac:user:assign-permission",
        action: "manage",
      },
      {
        moduleId: modules[0].id,
        name: "Remove User Permission",
        slug: "rbac:user:remove-permission",
        action: "manage",
      },
      {
        moduleId: modules[0].id,
        name: "View User Permissions",
        slug: "rbac:user:view-permissions",
        action: "read",
      },
      {
        moduleId: modules[0].id,
        name: "Assign User Role",
        slug: "rbac:user:assign-role",
        action: "manage",
      },
      {
        moduleId: modules[0].id,
        name: "Remove User Role",
        slug: "rbac:user:remove-role",
        action: "manage",
      },
      {
        moduleId: modules[0].id,
        name: "View User Roles",
        slug: "rbac:user:view-roles",
        action: "read",
      },

      // Product permissions
      {
        moduleId: modules[1].id,
        name: "Create Product",
        slug: "product:create",
        action: "create",
      },
      {
        moduleId: modules[1].id,
        name: "Read Product",
        slug: "product:read",
        action: "read",
      },
      {
        moduleId: modules[1].id,
        name: "Update Product",
        slug: "product:update",
        action: "update",
      },
      {
        moduleId: modules[1].id,
        name: "Delete Product",
        slug: "product:delete",
        action: "delete",
      },
      {
        moduleId: modules[1].id,
        name: "Manage Categories",
        slug: "product:manage-categories",
        action: "manage",
      },

      // User permissions
      {
        moduleId: modules[2].id,
        name: "Create User",
        slug: "user:create",
        action: "create",
      },
      {
        moduleId: modules[2].id,
        name: "Read User",
        slug: "user:read",
        action: "read",
      },
      {
        moduleId: modules[2].id,
        name: "Update User",
        slug: "user:update",
        action: "update",
      },
      {
        moduleId: modules[2].id,
        name: "Delete User",
        slug: "user:delete",
        action: "delete",
      },
      {
        moduleId: modules[2].id,
        name: "View User Profile",
        slug: "user:view-profile",
        action: "read",
      },

      // Order permissions
      {
        moduleId: modules[3].id,
        name: "Create Order",
        slug: "order:create",
        action: "create",
      },
      {
        moduleId: modules[3].id,
        name: "Read Order",
        slug: "order:read",
        action: "read",
      },
      {
        moduleId: modules[3].id,
        name: "Update Order",
        slug: "order:update",
        action: "update",
      },
      {
        moduleId: modules[3].id,
        name: "Cancel Order",
        slug: "order:cancel",
        action: "manage",
      },
      {
        moduleId: modules[3].id,
        name: "Manage Returns",
        slug: "order:manage-returns",
        action: "manage",
      },

      // Seller permissions
      {
        moduleId: modules[4].id,
        name: "Create Seller",
        slug: "seller:create",
        action: "create",
      },
      {
        moduleId: modules[4].id,
        name: "Read Seller",
        slug: "seller:read",
        action: "read",
      },
      {
        moduleId: modules[4].id,
        name: "Update Seller",
        slug: "seller:update",
        action: "update",
      },
      {
        moduleId: modules[4].id,
        name: "Approve Seller",
        slug: "seller:approve",
        action: "manage",
      },
      {
        moduleId: modules[4].id,
        name: "Manage Commission",
        slug: "seller:manage-commission",
        action: "manage",
      },

      // Admin permissions
      {
        moduleId: modules[5].id,
        name: "View Dashboard",
        slug: "admin:view-dashboard",
        action: "read",
      },
      {
        moduleId: modules[5].id,
        name: "Manage Users",
        slug: "admin:manage-users",
        action: "manage",
      },
      {
        moduleId: modules[5].id,
        name: "Manage Sellers",
        slug: "admin:manage-sellers",
        action: "manage",
      },
      {
        moduleId: modules[5].id,
        name: "View Transactions",
        slug: "admin:view-transactions",
        action: "read",
      },
      {
        moduleId: modules[5].id,
        name: "Manage Content",
        slug: "admin:manage-content",
        action: "manage",
      },

      // Analytics permissions
      {
        moduleId: modules[6].id,
        name: "View Analytics",
        slug: "analytics:view",
        action: "read",
      },
      {
        moduleId: modules[6].id,
        name: "Generate Reports",
        slug: "analytics:generate-reports",
        action: "create",
      },
      {
        moduleId: modules[6].id,
        name: "Export Data",
        slug: "analytics:export",
        action: "read",
      },

      // Settings permissions
      {
        moduleId: modules[7].id,
        name: "View Settings",
        slug: "settings:view",
        action: "read",
      },
      {
        moduleId: modules[7].id,
        name: "Update Settings",
        slug: "settings:update",
        action: "update",
      },
      {
        moduleId: modules[7].id,
        name: "Manage API Keys",
        slug: "settings:manage-api-keys",
        action: "manage",
      },
      {
        moduleId: modules[7].id,
        name: "Manage Webhooks",
        slug: "settings:manage-webhooks",
        action: "manage",
      },
    ];

    // Insert permissions
    const permissionIds = {};
    for (const perm of permissions) {
      const [existingPermissions] = await sequelize.query(
        `SELECT id FROM permissions WHERE slug = :slug LIMIT 1`,
        {
          replacements: { slug: perm.slug },
          transaction,
        },
      );

      if (existingPermissions.length > 0) {
        const id = existingPermissions[0].id;
        permissionIds[perm.slug] = id;
        await sequelize.query(
          `UPDATE permissions
           SET module_id = :moduleId,
               name = :name,
               action = :action,
               active = true,
               updated_at = NOW()
           WHERE id = :id`,
          {
            replacements: { id, ...perm },
            transaction,
          },
        );
      } else {
        const id = uuidv4();
        permissionIds[perm.slug] = id;

        await sequelize.query(
          `INSERT INTO permissions (id, module_id, name, slug, action, active, created_at, updated_at)
           VALUES (:id, :moduleId, :name, :slug, :action, true, NOW(), NOW())`,
          {
            replacements: { id, ...perm },
            transaction,
          },
        );
      }
    }

    console.log(`✓ Created ${permissions.length} permissions`);

    // Create default roles and assign permissions
    const rolesToCreate = [
      {
        id: uuidv4(),
        name: "Super Admin",
        slug: "super-admin",
        description: "Super Administrator with full access",
        type: "system",
        isSuperAdmin: true,
        permissionSlugs: Object.keys(permissionIds), // All permissions
      },
      {
        id: uuidv4(),
        name: "Admin",
        slug: "admin",
        description: "Administrator with broad access",
        type: "system",
        isSuperAdmin: false,
        permissionSlugs: [
          "rbac:module:read",
          "rbac:permission:read",
          "rbac:role:read",
          "rbac:user:view-permissions",
          "rbac:user:view-roles",
          "rbac:user:assign-role",
          "product:create",
          "product:read",
          "product:update",
          "product:delete",
          "product:manage-categories",
          "user:read",
          "user:update",
          "order:read",
          "order:update",
          "order:manage-returns",
          "seller:read",
          "seller:approve",
          "admin:view-dashboard",
          "admin:manage-users",
          "admin:manage-sellers",
          "analytics:view",
          "analytics:generate-reports",
          "settings:view",
        ],
      },
      {
        id: uuidv4(),
        name: "Sub Admin",
        slug: "sub-admin",
        description: "Scoped platform admin with module-based access",
        type: "system",
        isSuperAdmin: false,
        permissionSlugs: [
          "product:read",
          "product:update",
          "user:read",
          "order:read",
          "seller:read",
          "admin:view-dashboard",
          "analytics:view",
        ],
      },
      {
        id: uuidv4(),
        name: "Moderator",
        slug: "moderator",
        description: "Content and user moderator",
        type: "system",
        isSuperAdmin: false,
        permissionSlugs: [
          "product:read",
          "product:update",
          "user:read",
          "user:update",
          "order:read",
          "seller:read",
          "admin:view-dashboard",
        ],
      },
      {
        id: uuidv4(),
        name: "Product Manager",
        slug: "product-manager",
        description: "Manages product catalog",
        type: "custom",
        isSuperAdmin: false,
        permissionSlugs: [
          "product:create",
          "product:read",
          "product:update",
          "product:delete",
          "product:manage-categories",
        ],
      },
    ];

    for (const role of rolesToCreate) {
      const {
        id,
        name,
        slug,
        description,
        type,
        isSuperAdmin,
        permissionSlugs,
      } = role;

      let roleId = id;

      // Check if role already exists
      const [existingRoles] = await sequelize.query(
        `SELECT id
     FROM roles
     WHERE slug = :slug
     LIMIT 1`,
        {
          replacements: { slug },
          transaction,
        },
      );

      if (existingRoles.length === 0) {
        // Create new role
        await sequelize.query(
          `INSERT INTO roles (
          id,
          name,
          slug,
          description,
          type,
          is_super_admin,
          active,
          created_at,
          updated_at
       )
       VALUES (
          :id,
          :name,
          :slug,
          :description,
          :type,
          :isSuperAdmin,
          true,
          NOW(),
          NOW()
       )`,
          {
            replacements: {
              id,
              name,
              slug,
              description,
              type,
              isSuperAdmin,
            },
            transaction,
          },
        );
      } else {
        // Use existing role ID
        roleId = existingRoles[0].id;
      }

      // Assign permissions
      for (const permSlug of permissionSlugs) {
        const permId = permissionIds[permSlug];

        if (permId) {
          const [existingRolePermissions] = await sequelize.query(
            `SELECT id
         FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId
         LIMIT 1`,
            {
              replacements: {
                roleId: roleId,
                permissionId: permId,
              },
              transaction,
            },
          );

          if (existingRolePermissions.length === 0) {
            await sequelize.query(
              `INSERT INTO role_permissions (
            id,
            role_id,
            permission_id,
            created_at
         )
         VALUES (
            :id,
            :roleId,
            :permissionId,
            NOW()
         )`,
              {
                replacements: {
                  id: uuidv4(),
                  roleId: roleId,
                  permissionId: permId,
                },
                transaction,
              },
            );
          }
        }
      }
    }

    console.log(`✓ Created ${rolesToCreate.length} default roles\n`);

    await transaction.commit();

    console.log("✅ RBAC seeding completed successfully!\n");
    console.log("Modules created:");
    modules.forEach((m) => console.log(`  - ${m.name} (${m.slug})`));
    console.log(
      `\nRoles created:\n  - Super Admin\n  - Admin\n  - Sub Admin\n  - Moderator\n  - Product Manager\n`,
    );

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("\n❌ Error seeding RBAC:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedRbac();
