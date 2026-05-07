module.exports = {
  id: "005-rbac-super-admin",
  async up({ queryInterface, Sequelize, transaction }) {
    const now = Sequelize.fn("NOW");

    // Create modules table
    await queryInterface.createTable(
      "modules",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        name: { type: Sequelize.STRING(128), allowNull: false, unique: true },
        slug: { type: Sequelize.STRING(128), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        icon: { type: Sequelize.STRING(128), allowNull: true },
        order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    // Create permissions table
    await queryInterface.createTable(
      "permissions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        module_id: { type: Sequelize.UUID, allowNull: false, references: { model: "modules", key: "id" } },
        name: { type: Sequelize.STRING(128), allowNull: false },
        slug: { type: Sequelize.STRING(128), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        action: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "read" }, // create, read, update, delete, etc.
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    // Create roles table
    await queryInterface.createTable(
      "roles",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        name: { type: Sequelize.STRING(128), allowNull: false, unique: true },
        slug: { type: Sequelize.STRING(128), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        type: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "custom" }, // system, custom
        is_super_admin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    // Create role_permissions table
    await queryInterface.createTable(
      "role_permissions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        role_id: { type: Sequelize.UUID, allowNull: false, references: { model: "roles", key: "id" } },
        permission_id: { type: Sequelize.UUID, allowNull: false, references: { model: "permissions", key: "id" } },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    // Create user_permissions table (for direct assignment bypassing roles)
    await queryInterface.createTable(
      "user_permissions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        permission_id: { type: Sequelize.UUID, allowNull: false, references: { model: "permissions", key: "id" } },
        granted_by: { type: Sequelize.STRING(64), allowNull: true },
        granted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        revoked_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      },
      { transaction },
    );

    // Create user_roles table
    await queryInterface.createTable(
      "user_roles",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        role_id: { type: Sequelize.UUID, allowNull: false, references: { model: "roles", key: "id" } },
        assigned_by: { type: Sequelize.STRING(64), allowNull: true },
        assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        revoked_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      },
      { transaction },
    );

    // Create super_admins table
    await queryInterface.createTable(
      "super_admins",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        email: { type: Sequelize.STRING(128), allowNull: false, unique: true },
        full_name: { type: Sequelize.STRING(128), allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    // Create indices
    await queryInterface.addIndex("modules", ["slug", "active"], { transaction });
    await queryInterface.addIndex("permissions", ["module_id", "active"], { transaction });
    await queryInterface.addIndex("permissions", ["slug"], { transaction });
    await queryInterface.addIndex("roles", ["slug", "active"], { transaction });
    await queryInterface.addIndex("role_permissions", ["role_id", "permission_id"], { transaction });
    await queryInterface.addIndex("user_permissions", ["user_id", "permission_id"], { transaction });
    await queryInterface.addIndex("user_roles", ["user_id", "role_id"], { transaction });
    await queryInterface.addIndex("super_admins", ["email", "is_active"], { transaction });
  },

  async down({ queryInterface, transaction }) {
    await queryInterface.dropTable("super_admins", { transaction });
    await queryInterface.dropTable("user_roles", { transaction });
    await queryInterface.dropTable("user_permissions", { transaction });
    await queryInterface.dropTable("role_permissions", { transaction });
    await queryInterface.dropTable("roles", { transaction });
    await queryInterface.dropTable("permissions", { transaction });
    await queryInterface.dropTable("modules", { transaction });
  },
};
