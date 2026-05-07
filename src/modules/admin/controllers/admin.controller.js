const { successResponse } = require("../../../shared/http/response");
const { requireActor } = require("../../../shared/auth/actor-context");
const { AdminService } = require("../services/admin.service");

class AdminController {
  constructor({ adminService = new AdminService() } = {}) {
    this.adminService = adminService;
  }

  overview = async (req, res) => {
    const data = await this.adminService.getOverview();
    res.json(successResponse(data));
  };

  listVendors = async (req, res) => {
    const result = await this.adminService.listVendors(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  listUsers = async (req, res) => {
    const result = await this.adminService.listUsers(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  getUser = async (req, res) => {
    const user = await this.adminService.getUser(req.params.userId);
    res.json(successResponse(user));
  };

  updateUser = async (req, res) => {
    const user = await this.adminService.updateUser(
      req.params.userId,
      req.body,
    );
    res.json(successResponse(user));
  };

  deactivateUser = async (req, res) => {
    const user = await this.adminService.deactivateUser(
      req.params.userId,
      req.body,
    );
    res.json(successResponse(user));
  };

  updateVendorStatus = async (req, res) => {
    const seller = await this.adminService.updateVendorStatus(
      req.params.sellerId,
      req.body,
    );
    res.json(successResponse(seller));
  };

  moderationQueue = async (req, res) => {
    const result = await this.adminService.listProductModerationQueue(
      req.query,
    );
    res.json(successResponse(result.items, { total: result.total }));
  };

  moderateProduct = async (req, res) => {
    const actor = requireActor(req);
    const product = await this.adminService.moderateProduct(
      req.params.productId,
      req.body,
      actor,
    );
    res.json(successResponse(product));
  };

  listOrders = async (req, res) => {
    const items = await this.adminService.listOrders(req.query);
    res.json(successResponse(items));
  };

  listPayments = async (req, res) => {
    const items = await this.adminService.listPayments(req.query);
    res.json(successResponse(items));
  };

  createPayout = async (req, res) => {
    const payout = await this.adminService.createPayout(req.body);
    res.status(201).json(successResponse(payout));
  };

  listPayouts = async (req, res) => {
    const payouts = await this.adminService.listPayouts(req.query);
    res.json(successResponse(payouts));
  };

  taxReport = async (req, res) => {
    const report = await this.adminService.getTaxReport(req.query);
    res.json(successResponse(report));
  };

  generateInvoice = async (req, res) => {
    const invoice = await this.adminService.generateInvoice(req.params.orderId);
    res.status(201).json(successResponse(invoice));
  };

  createApiKey = async (req, res) => {
    const actor = requireActor(req);
    const result = await this.adminService.createApiKey(req.body, actor);
    res.status(201).json(successResponse(result));
  };

  listApiKeys = async (req, res) => {
    const keys = await this.adminService.listApiKeys(req.query);
    res.json(successResponse(keys));
  };

  createWebhookSubscription = async (req, res) => {
    const actor = requireActor(req);
    const subscription = await this.adminService.createWebhookSubscription(
      req.body,
      actor,
    );
    res.status(201).json(successResponse(subscription));
  };

  listWebhookSubscriptions = async (req, res) => {
    const subscriptions = await this.adminService.listWebhookSubscriptions(
      req.query,
    );
    res.json(successResponse(subscriptions));
  };

  upsertFeatureFlag = async (req, res) => {
    const actor = requireActor(req);
    const flag = await this.adminService.upsertFeatureFlag(req.body, actor);
    res.json(successResponse(flag));
  };

  listFeatureFlags = async (req, res) => {
    const flags = await this.adminService.listFeatureFlags(req.query);
    res.json(successResponse(flags));
  };

  realtimeAnalytics = async (req, res) => {
    const data = await this.adminService.getRealtimeAnalytics(req.query);
    res.json(successResponse(data));
  };

  returnsAnalytics = async (req, res) => {
    const data = await this.adminService.getReturnsAnalytics(req.query);
    res.json(successResponse(data));
  };

  listChargebacks = async (req, res) => {
    const data = await this.adminService.listChargebacks(req.query);
    res.json(successResponse(data.items, { total: data.total }));
  };

  systemHealth = async (req, res) => {
    const data = await this.adminService.getSystemHealth();
    res.json(successResponse(data));
  };

  queueStatus = async (req, res) => {
    const data = await this.adminService.getQueueStatus();
    res.json(successResponse(data));
  };

  pauseQueue = async (req, res) => {
    const result = await this.adminService.pauseQueue(req.params.queueName);
    res.json(successResponse(result));
  };

  resumeQueue = async (req, res) => {
    const result = await this.adminService.resumeQueue(req.params.queueName);
    res.json(successResponse(result));
  };

  listDeadLetterEvents = async (req, res) => {
    const data = await this.adminService.listDeadLetterEvents(req.query);
    res.json(successResponse(data.items, { total: data.total }));
  };

  retryDeadLetterEvent = async (req, res) => {
    const event = await this.adminService.retryDeadLetterEvent(
      req.params.eventId,
      req.body,
    );
    res.json(successResponse(event));
  };

  discardDeadLetterEvent = async (req, res) => {
    const event = await this.adminService.discardDeadLetterEvent(
      req.params.eventId,
      req.body,
    );
    res.json(successResponse(event));
  };

  createSubscriptionPlan = async (req, res) => {
    const plan = await this.adminService.createSubscriptionPlan(req.body);
    res.status(201).json(successResponse(plan));
  };

  listSubscriptionPlans = async (req, res) => {
    const plans = await this.adminService.listSubscriptionPlans(req.query);
    res.json(successResponse(plans));
  };

  getSubscriptionPlan = async (req, res) => {
    const plan = await this.adminService.getSubscriptionPlan(req.params.planId);
    res.json(successResponse(plan));
  };

  updateSubscriptionPlan = async (req, res) => {
    const plan = await this.adminService.updateSubscriptionPlan(
      req.params.planId,
      req.body,
    );
    res.json(successResponse(plan));
  };

  deleteSubscriptionPlan = async (req, res) => {
    const plan = await this.adminService.deleteSubscriptionPlan(
      req.params.planId,
    );
    res.json(successResponse(plan));
  };

  listPlatformSubscriptions = async (req, res) => {
    const subscriptions = await this.adminService.listPlatformSubscriptions(
      req.query,
    );
    res.json(successResponse(subscriptions));
  };

  updatePlatformSubscriptionStatus = async (req, res) => {
    const subscription =
      await this.adminService.updatePlatformSubscriptionStatus(
        req.params.subscriptionId,
        req.body.status,
      );
    res.json(successResponse(subscription));
  };

  createPlatformFeeConfig = async (req, res) => {
    const config = await this.adminService.createPlatformFeeConfig(req.body);
    res.status(201).json(successResponse(config));
  };

  listPlatformFeeConfigs = async (req, res) => {
    const configs = await this.adminService.listPlatformFeeConfigs(req.query);
    res.json(successResponse(configs));
  };

  getPlatformFeeConfig = async (req, res) => {
    const config = await this.adminService.getPlatformFeeConfig(
      req.params.configId,
    );
    res.json(successResponse(config));
  };

  updatePlatformFeeConfig = async (req, res) => {
    const config = await this.adminService.updatePlatformFeeConfig(
      req.params.configId,
      req.body,
    );
    res.json(successResponse(config));
  };

  deletePlatformFeeConfig = async (req, res) => {
    const config = await this.adminService.deletePlatformFeeConfig(
      req.params.configId,
    );
    res.json(successResponse(config));
  };

  listAccessModules = async (req, res) => {
    const modules = await this.adminService.listAccessModules(req.query);
    res.json(successResponse(modules));
  };

  createAdmin = async (req, res) => {
    const actor = requireActor(req);
    const user = await this.adminService.createAdmin(req.body, actor);
    res.status(201).json(successResponse(user));
  };

  listAdmins = async (req, res) => {
    const result = await this.adminService.listAdmins(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  createPlatformSubAdmin = async (req, res) => {
    const actor = requireActor(req);
    const user = await this.adminService.createPlatformSubAdmin(
      req.body,
      actor,
    );
    res.status(201).json(successResponse(user));
  };

  listPlatformSubAdmins = async (req, res) => {
    const actor = requireActor(req);
    const users = await this.adminService.listPlatformSubAdmins(
      req.query,
      actor,
    );
    res.json(successResponse(users));
  };

  updatePlatformSubAdminModules = async (req, res) => {
    const actor = requireActor(req);
    const user = await this.adminService.updatePlatformSubAdminModules(
      req.params.userId,
      req.body,
      actor,
    );
    res.json(successResponse(user));
  };
}

module.exports = { AdminController };
