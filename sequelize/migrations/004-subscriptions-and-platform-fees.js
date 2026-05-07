module.exports = {
  id: "004-subscriptions-and-platform-fees",
  async up({ queryInterface, Sequelize, transaction }) {
    const now = Sequelize.fn("NOW");

    await queryInterface.createTable(
      "platform_subscription_plans",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        plan_code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        title: { type: Sequelize.STRING(180), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        target_roles: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        feature_flags: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        monthly_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        yearly_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "platform_subscriptions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        user_role: { type: Sequelize.STRING(32), allowNull: false },
        plan_id: { type: Sequelize.UUID, allowNull: false },
        billing_cycle: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "monthly" },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "active" },
        starts_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        ends_at: { type: Sequelize.DATE, allowNull: true },
        next_billing_at: { type: Sequelize.DATE, allowNull: true },
        auto_renew: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "platform_subscription_transactions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        subscription_id: { type: Sequelize.UUID, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        plan_id: { type: Sequelize.UUID, allowNull: false },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        provider: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "manual" },
        transaction_status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "captured" },
        transaction_reference: { type: Sequelize.STRING(160), allowNull: true },
        paid_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    const orderColumns = await queryInterface.describeTable("orders", { transaction });

    if (!orderColumns.platform_fee_amount) {
      await queryInterface.addColumn(
        "orders",
        "platform_fee_amount",
        {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );
    }

    if (!orderColumns.platform_fee_breakup) {
      await queryInterface.addColumn(
        "orders",
        "platform_fee_breakup",
        {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        { transaction },
      );
    }

    await queryInterface.addIndex("platform_subscription_plans", ["active", "plan_code"], { transaction });
    await queryInterface.addIndex("platform_subscriptions", ["user_id", "status"], { transaction });
    await queryInterface.addIndex("platform_subscriptions", ["plan_id", "status"], { transaction });
    await queryInterface.addIndex("platform_subscription_transactions", ["subscription_id", "created_at"], {
      transaction,
    });
    await queryInterface.addIndex("orders", ["platform_fee_amount"], { transaction });
  },

  async down({ queryInterface, transaction }) {
    const orderColumns = await queryInterface.describeTable("orders", { transaction });
    if (orderColumns.platform_fee_breakup) {
      await queryInterface.removeColumn("orders", "platform_fee_breakup", { transaction });
    }
    if (orderColumns.platform_fee_amount) {
      await queryInterface.removeColumn("orders", "platform_fee_amount", { transaction });
    }
    await queryInterface.dropTable("platform_subscription_transactions", { transaction });
    await queryInterface.dropTable("platform_subscriptions", { transaction });
    await queryInterface.dropTable("platform_subscription_plans", { transaction });
  },
};
