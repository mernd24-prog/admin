module.exports = {
  id: "002-platform-enterprise-foundation",
  async up({ queryInterface, Sequelize, transaction }) {
    const now = Sequelize.fn("NOW");

    await queryInterface.createTable(
      "product_variant_prices",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        product_id: { type: Sequelize.STRING(64), allowNull: false },
        sku: { type: Sequelize.STRING(64), allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        mrp: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        effective_from: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        effective_to: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "inventory_snapshots",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
        product_id: { type: Sequelize.STRING(64), allowNull: false },
        sku: { type: Sequelize.STRING(64), allowNull: true },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        stock_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        reserved_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        available_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "seller_bank_accounts",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        account_holder_name: { type: Sequelize.STRING(160), allowNull: false },
        bank_name: { type: Sequelize.STRING(120), allowNull: false },
        account_number_masked: { type: Sequelize.STRING(32), allowNull: false },
        ifsc_code: { type: Sequelize.STRING(16), allowNull: false },
        upi_id: { type: Sequelize.STRING(128), allowNull: true },
        penny_drop_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "pending" },
        verified_at: { type: Sequelize.DATE, allowNull: true },
        is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "seller_documents",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        doc_type: { type: Sequelize.STRING(64), allowNull: false },
        storage_url: { type: Sequelize.TEXT, allowNull: false },
        verification_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "pending" },
        reviewed_by: { type: Sequelize.STRING(64), allowNull: true },
        reviewed_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "platform_fee_config",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        category: { type: Sequelize.STRING(120), allowNull: false },
        commission_percent: { type: Sequelize.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
        fixed_fee_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        closing_fee_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        effective_from: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        effective_to: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "penalty_rules",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        rule_code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        title: { type: Sequelize.STRING(160), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        percentage: { type: Sequelize.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
        max_penalty_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "order_cancel_reasons",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        label: { type: Sequelize.STRING(180), allowNull: false },
        actor_type: { type: Sequelize.STRING(32), allowNull: false },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "order_hold_logs",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: false },
        hold_reason_code: { type: Sequelize.STRING(64), allowNull: false },
        hold_reason_note: { type: Sequelize.TEXT, allowNull: true },
        hold_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "on_hold" },
        reviewed_by: { type: Sequelize.STRING(64), allowNull: true },
        resolved_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "return_requests",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: false },
        order_item_id: { type: Sequelize.UUID, allowNull: true },
        buyer_id: { type: Sequelize.STRING(64), allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        reason_code: { type: Sequelize.STRING(64), allowNull: false },
        reason_note: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "requested" },
        requested_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        rejected_at: { type: Sequelize.DATE, allowNull: true },
        refund_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "dispute_tickets",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        ticket_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        order_id: { type: Sequelize.UUID, allowNull: true },
        buyer_id: { type: Sequelize.STRING(64), allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: true },
        dispute_type: { type: Sequelize.STRING(64), allowNull: false },
        title: { type: Sequelize.STRING(180), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        priority: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "medium" },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "open" },
        resolution_type: { type: Sequelize.STRING(64), allowNull: true },
        resolved_by: { type: Sequelize.STRING(64), allowNull: true },
        resolved_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "dispute_messages",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        ticket_id: { type: Sequelize.UUID, allowNull: false },
        sender_id: { type: Sequelize.STRING(64), allowNull: false },
        sender_role: { type: Sequelize.STRING(32), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: false },
        attachment_urls: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "chargebacks",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        payment_id: { type: Sequelize.UUID, allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: false },
        gateway_reference: { type: Sequelize.STRING(128), allowNull: false },
        reason_code: { type: Sequelize.STRING(64), allowNull: true },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        representment_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "pending" },
        opened_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        closed_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "refund_transactions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        payment_id: { type: Sequelize.UUID, allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: false },
        return_request_id: { type: Sequelize.UUID, allowNull: true },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        refund_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "initiated" },
        provider_refund_id: { type: Sequelize.STRING(128), allowNull: true },
        initiated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        settled_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "wallet_cashback_rules",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        rule_code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        category: { type: Sequelize.STRING(120), allowNull: true },
        percent: { type: Sequelize.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
        max_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        min_order_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        effective_from: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        effective_to: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "subscription_plans",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        product_id: { type: Sequelize.STRING(64), allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        plan_name: { type: Sequelize.STRING(120), allowNull: false },
        billing_interval: { type: Sequelize.STRING(32), allowNull: false },
        interval_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" },
        trial_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "subscription_orders",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        subscription_plan_id: { type: Sequelize.UUID, allowNull: false },
        buyer_id: { type: Sequelize.STRING(64), allowNull: false },
        parent_order_id: { type: Sequelize.UUID, allowNull: true },
        generated_order_id: { type: Sequelize.UUID, allowNull: true },
        cycle_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        next_run_at: { type: Sequelize.DATE, allowNull: false },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "active" },
        paused_until: { type: Sequelize.DATE, allowNull: true },
        cancelled_at: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "gst_filing_records",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        period: { type: Sequelize.STRING(16), allowNull: false },
        filing_type: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "GSTR-8" },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "draft" },
        acknowledgment_number: { type: Sequelize.STRING(128), allowNull: true },
        filed_at: { type: Sequelize.DATE, allowNull: true },
        payload_snapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "tcs_credit_ledger",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        order_id: { type: Sequelize.UUID, allowNull: true },
        tax_invoice_id: { type: Sequelize.UUID, allowNull: true },
        amount_collected: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        amount_utilized: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        balance_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        period: { type: Sequelize.STRING(16), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "holiday_calendar",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        holiday_date: { type: Sequelize.DATEONLY, allowNull: false },
        holiday_name: { type: Sequelize.STRING(120), allowNull: false },
        region: { type: Sequelize.STRING(64), allowNull: true },
        is_platform_holiday: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        seller_id: { type: Sequelize.STRING(64), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "operating_hours",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        seller_id: { type: Sequelize.STRING(64), allowNull: false },
        day_of_week: { type: Sequelize.INTEGER, allowNull: false },
        opening_time: { type: Sequelize.STRING(8), allowNull: false },
        closing_time: { type: Sequelize.STRING(8), allowNull: false },
        order_cutoff_time: { type: Sequelize.STRING(8), allowNull: true },
        is_closed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "user_login_history",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        ip_address: { type: Sequelize.STRING(64), allowNull: false },
        country: { type: Sequelize.STRING(64), allowNull: true },
        city: { type: Sequelize.STRING(64), allowNull: true },
        device_type: { type: Sequelize.STRING(64), allowNull: true },
        user_agent: { type: Sequelize.TEXT, allowNull: true },
        login_status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "success" },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "password_reset_requests",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        email: { type: Sequelize.STRING(160), allowNull: false },
        token_hash: { type: Sequelize.TEXT, allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        used_at: { type: Sequelize.DATE, allowNull: true },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "issued" },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "two_factor_codes",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        action_type: { type: Sequelize.STRING(64), allowNull: false },
        otp_hash: { type: Sequelize.TEXT, allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        consumed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "api_keys",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        owner_id: { type: Sequelize.STRING(64), allowNull: false },
        key_name: { type: Sequelize.STRING(120), allowNull: false },
        key_prefix: { type: Sequelize.STRING(32), allowNull: false },
        key_hash: { type: Sequelize.TEXT, allowNull: false },
        scopes: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "active" },
        expires_at: { type: Sequelize.DATE, allowNull: true },
        last_used_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "webhook_subscriptions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        owner_id: { type: Sequelize.STRING(64), allowNull: false },
        endpoint_url: { type: Sequelize.TEXT, allowNull: false },
        secret_hash: { type: Sequelize.TEXT, allowNull: false },
        event_types: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "active" },
        retry_policy: { type: Sequelize.JSONB, allowNull: false, defaultValue: { maxRetries: 5 } },
        last_delivery_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "webhook_delivery_logs",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        webhook_subscription_id: { type: Sequelize.UUID, allowNull: false },
        event_type: { type: Sequelize.STRING(120), allowNull: false },
        payload_snapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        response_status: { type: Sequelize.INTEGER, allowNull: true },
        response_body: { type: Sequelize.TEXT, allowNull: true },
        attempt_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        delivered_at: { type: Sequelize.DATE, allowNull: true },
        failed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "rate_limit_violations",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        actor_id: { type: Sequelize.STRING(64), allowNull: true },
        ip_address: { type: Sequelize.STRING(64), allowNull: false },
        route: { type: Sequelize.STRING(180), allowNull: false },
        window_seconds: { type: Sequelize.INTEGER, allowNull: false },
        request_count: { type: Sequelize.INTEGER, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "ip_reputation_scores",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        ip_address: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        reputation_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 50 },
        risk_level: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "medium" },
        source: { type: Sequelize.STRING(64), allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "user_sessions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        session_token_hash: { type: Sequelize.TEXT, allowNull: false },
        ip_address: { type: Sequelize.STRING(64), allowNull: true },
        user_agent: { type: Sequelize.TEXT, allowNull: true },
        device_name: { type: Sequelize.STRING(120), allowNull: true },
        last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        revoked_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "config_change_history",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        config_key: { type: Sequelize.STRING(120), allowNull: false },
        previous_value: { type: Sequelize.JSONB, allowNull: true },
        new_value: { type: Sequelize.JSONB, allowNull: false },
        changed_by: { type: Sequelize.STRING(64), allowNull: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "feature_flag_rollouts",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        flag_key: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        rollout_percentage: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        target_rules: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_by: { type: Sequelize.STRING(64), allowNull: false },
        updated_by: { type: Sequelize.STRING(64), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "ab_test_experiments",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        experiment_key: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        title: { type: Sequelize.STRING(180), allowNull: false },
        hypothesis: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: "draft" },
        variants: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        start_at: { type: Sequelize.DATE, allowNull: true },
        end_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.STRING(64), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "ab_test_conversions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        experiment_id: { type: Sequelize.UUID, allowNull: false },
        user_id: { type: Sequelize.STRING(64), allowNull: false },
        variant_key: { type: Sequelize.STRING(64), allowNull: false },
        goal_type: { type: Sequelize.STRING(64), allowNull: false },
        goal_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "cron_job_executions",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        job_name: { type: Sequelize.STRING(120), allowNull: false },
        run_status: { type: Sequelize.STRING(32), allowNull: false },
        started_at: { type: Sequelize.DATE, allowNull: false },
        ended_at: { type: Sequelize.DATE, allowNull: true },
        duration_ms: { type: Sequelize.INTEGER, allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "dead_letter_events",
      {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        source_type: { type: Sequelize.STRING(64), allowNull: false },
        aggregate_id: { type: Sequelize.STRING(64), allowNull: true },
        event_type: { type: Sequelize.STRING(120), allowNull: false },
        payload: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        retry_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "failed" },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.createTable(
      "schema_migrations",
      {
        id: { type: Sequelize.STRING(128), primaryKey: true, allowNull: false },
        checksum: { type: Sequelize.STRING(128), allowNull: true },
        applied_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      },
      { transaction },
    );

    await queryInterface.addIndex("return_requests", ["order_id", "status"], { transaction });
    await queryInterface.addIndex("dispute_tickets", ["status", "priority"], { transaction });
    await queryInterface.addIndex("api_keys", ["owner_id", "status"], { transaction });
    await queryInterface.addIndex("webhook_subscriptions", ["owner_id", "status"], { transaction });
    await queryInterface.addIndex("feature_flag_rollouts", ["enabled"], { transaction });
    await queryInterface.addIndex("ab_test_conversions", ["experiment_id", "variant_key"], { transaction });
    await queryInterface.addIndex("product_variant_prices", ["product_id", "sku", "effective_from"], {
      transaction,
    });
  },

  async down({ queryInterface, transaction }) {
    const tables = [
      "schema_migrations",
      "dead_letter_events",
      "cron_job_executions",
      "ab_test_conversions",
      "ab_test_experiments",
      "feature_flag_rollouts",
      "config_change_history",
      "user_sessions",
      "ip_reputation_scores",
      "rate_limit_violations",
      "webhook_delivery_logs",
      "webhook_subscriptions",
      "api_keys",
      "two_factor_codes",
      "password_reset_requests",
      "user_login_history",
      "operating_hours",
      "holiday_calendar",
      "tcs_credit_ledger",
      "gst_filing_records",
      "subscription_orders",
      "subscription_plans",
      "wallet_cashback_rules",
      "refund_transactions",
      "chargebacks",
      "dispute_messages",
      "dispute_tickets",
      "return_requests",
      "order_hold_logs",
      "order_cancel_reasons",
      "penalty_rules",
      "platform_fee_config",
      "seller_documents",
      "seller_bank_accounts",
      "inventory_snapshots",
      "product_variant_prices",
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table, { transaction });
    }
  },
};
