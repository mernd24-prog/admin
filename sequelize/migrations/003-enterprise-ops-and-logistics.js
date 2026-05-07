module.exports = {
  id: "003-enterprise-ops-and-logistics",
  async up({ queryInterface, Sequelize, transaction }) {
    const now = Sequelize.fn("NOW");

    await queryInterface.createTable(
      "idempotency_keys",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        scope: { type: Sequelize.STRING(64), allowNull: false },
        idempotency_key: { type: Sequelize.STRING(180), allowNull: false },
        request_hash: { type: Sequelize.STRING(128), allowNull: false },
        actor_id: { type: Sequelize.STRING(64), allowNull: true },
        resource_type: { type: Sequelize.STRING(64), allowNull: true },
        resource_id: { type: Sequelize.STRING(64), allowNull: true },
        response_code: { type: Sequelize.INTEGER, allowNull: true },
        response_body: { type: Sequelize.JSONB, allowNull: true },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "shipping_zones",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        zone_code: { type: Sequelize.STRING(32), allowNull: false, unique: true },
        zone_name: { type: Sequelize.STRING(120), allowNull: false },
        country_code: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "IN" },
        states: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "shipping_rates",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        zone_code: { type: Sequelize.STRING(32), allowNull: false },
        shipping_mode: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "standard" },
        weight_min_grams: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        weight_max_grams: { type: Sequelize.INTEGER, allowNull: false },
        base_fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        per_kg_fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        cod_fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "delivery_exclusions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        pincode: { type: Sequelize.STRING(12), allowNull: false },
        reason_code: { type: Sequelize.STRING(64), allowNull: false },
        reason_note: { type: Sequelize.TEXT, allowNull: true },
        source: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "manual" },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "pincode_serviceability",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        pincode: { type: Sequelize.STRING(12), allowNull: false, unique: true },
        city: { type: Sequelize.STRING(120), allowNull: false },
        state: { type: Sequelize.STRING(120), allowNull: false },
        zone_code: { type: Sequelize.STRING(32), allowNull: false },
        serviceable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        cod_available: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        estimated_delivery_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "e_way_bill_details",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: false },
        invoice_id: { type: Sequelize.UUID, allowNull: true },
        e_way_bill_number: { type: Sequelize.STRING(64), allowNull: true, unique: true },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "initiated" },
        valid_from: { type: Sequelize.DATE, allowNull: true },
        valid_until: { type: Sequelize.DATE, allowNull: true },
        transporter_name: { type: Sequelize.STRING(160), allowNull: true },
        vehicle_number: { type: Sequelize.STRING(32), allowNull: true },
        distance_km: { type: Sequelize.INTEGER, allowNull: true },
        payload_snapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "gift_wrap_options",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        product_id: { type: Sequelize.STRING(64), allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        wrap_name: { type: Sequelize.STRING(120), allowNull: false },
        wrap_fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "gift_messages",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: false },
        order_item_id: { type: Sequelize.UUID, allowNull: true },
        buyer_id: { type: Sequelize.STRING(64), allowNull: false },
        recipient_name: { type: Sequelize.STRING(120), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: false },
        gift_wrap_option_id: { type: Sequelize.UUID, allowNull: true },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "attached" },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "bulk_email_campaigns",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        campaign_name: { type: Sequelize.STRING(180), allowNull: false },
        segment_filter: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        subject: { type: Sequelize.STRING(220), allowNull: false },
        template_key: { type: Sequelize.STRING(120), allowNull: false },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "draft" },
        scheduled_at: { type: Sequelize.DATE, allowNull: true },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.STRING(64), allowNull: false },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "email_opens_clicks",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        campaign_id: { type: Sequelize.UUID, allowNull: true },
        recipient_email: { type: Sequelize.STRING(180), allowNull: false },
        event_type: { type: Sequelize.STRING(16), allowNull: false },
        message_id: { type: Sequelize.STRING(160), allowNull: true },
        link_url: { type: Sequelize.TEXT, allowNull: true },
        ip_address: { type: Sequelize.STRING(64), allowNull: true },
        user_agent: { type: Sequelize.TEXT, allowNull: true },
        occurred_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "push_notification_tokens",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        device_id: { type: Sequelize.STRING(120), allowNull: false },
        platform: { type: Sequelize.STRING(32), allowNull: false },
        token: { type: Sequelize.TEXT, allowNull: false },
        app_version: { type: Sequelize.STRING(32), allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "sms_logs",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        provider: { type: Sequelize.STRING(64), allowNull: false },
        message_type: { type: Sequelize.STRING(64), allowNull: false },
        recipient_phone: { type: Sequelize.STRING(24), allowNull: false },
        template_key: { type: Sequelize.STRING(120), allowNull: true },
        provider_message_id: { type: Sequelize.STRING(120), allowNull: true },
        delivery_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "queued" },
        cost_amount: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        delivered_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.addIndex("idempotency_keys", ["scope", "idempotency_key"], {
      unique: true,
      transaction,
    });
    await queryInterface.addIndex("idempotency_keys", ["expires_at"], { transaction });
    await queryInterface.addIndex("shipping_rates", ["zone_code", "shipping_mode", "weight_min_grams"], {
      transaction,
    });
    await queryInterface.addIndex("delivery_exclusions", ["pincode", "active"], { transaction });
    await queryInterface.addIndex("pincode_serviceability", ["zone_code", "serviceable"], { transaction });
    await queryInterface.addIndex("gift_wrap_options", ["product_id", "seller_id", "active"], { transaction });
    await queryInterface.addIndex("gift_messages", ["order_id"], { transaction });
    await queryInterface.addIndex("bulk_email_campaigns", ["status", "scheduled_at"], { transaction });
    await queryInterface.addIndex("email_opens_clicks", ["campaign_id", "event_type", "occurred_at"], {
      transaction,
    });
    await queryInterface.addIndex("push_notification_tokens", ["user_id", "active"], { transaction });
    await queryInterface.addIndex("sms_logs", ["delivery_status", "created_at"], { transaction });
  },

  async down({ queryInterface, transaction }) {
    const tables = [
      "sms_logs",
      "push_notification_tokens",
      "email_opens_clicks",
      "bulk_email_campaigns",
      "gift_messages",
      "gift_wrap_options",
      "e_way_bill_details",
      "pincode_serviceability",
      "delivery_exclusions",
      "shipping_rates",
      "shipping_zones",
      "idempotency_keys",
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table, { transaction });
    }
  },
};
