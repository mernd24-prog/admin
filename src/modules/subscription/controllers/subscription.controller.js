const { successResponse } = require("../../../shared/http/response");
const { requireActor } = require("../../../shared/auth/actor-context");
const { SubscriptionService } = require("../services/subscription.service");

class SubscriptionController {
  constructor({ subscriptionService = new SubscriptionService() } = {}) {
    this.subscriptionService = subscriptionService;
  }

  listPlans = async (req, res) => {
    const plans = await this.subscriptionService.listPlans();
    res.json(successResponse(plans));
  };

  purchasePlan = async (req, res) => {
    const actor = requireActor(req);
    const subscription = await this.subscriptionService.purchasePlan(req.body, actor);
    res.status(201).json(successResponse(subscription));
  };

  listMine = async (req, res) => {
    const actor = requireActor(req);
    const subscriptions = await this.subscriptionService.listMySubscriptions(actor);
    res.json(successResponse(subscriptions));
  };

  pauseMine = async (req, res) => {
    const actor = requireActor(req);
    const subscription = await this.subscriptionService.pauseSubscription(req.params.subscriptionId, actor);
    res.json(successResponse(subscription));
  };

  resumeMine = async (req, res) => {
    const actor = requireActor(req);
    const subscription = await this.subscriptionService.resumeSubscription(req.params.subscriptionId, actor);
    res.json(successResponse(subscription));
  };

  cancelMine = async (req, res) => {
    const actor = requireActor(req);
    const subscription = await this.subscriptionService.cancelSubscription(req.params.subscriptionId, actor);
    res.json(successResponse(subscription));
  };

  createPlan = async (req, res) => {
    const plan = await this.subscriptionService.createPlan(req.body);
    res.status(201).json(successResponse(plan));
  };

  listPlansAdmin = async (req, res) => {
    const plans = await this.subscriptionService.listPlansAdmin(req.query);
    res.json(successResponse(plans));
  };

  getPlan = async (req, res) => {
    const plan = await this.subscriptionService.getPlan(req.params.planId);
    res.json(successResponse(plan));
  };

  updatePlan = async (req, res) => {
    const plan = await this.subscriptionService.updatePlan(req.params.planId, req.body);
    res.json(successResponse(plan));
  };

  deletePlan = async (req, res) => {
    const plan = await this.subscriptionService.deletePlan(req.params.planId);
    res.json(successResponse(plan));
  };

  listSubscriptionsAdmin = async (req, res) => {
    const subscriptions = await this.subscriptionService.listSubscriptionsAdmin(req.query);
    res.json(successResponse(subscriptions));
  };

  updateSubscriptionStatusAdmin = async (req, res) => {
    const subscription = await this.subscriptionService.updateSubscriptionStatusAdmin(
      req.params.subscriptionId,
      req.body.status,
    );
    res.json(successResponse(subscription));
  };

  createPlatformFeeConfig = async (req, res) => {
    const config = await this.subscriptionService.createPlatformFeeConfig(req.body);
    res.status(201).json(successResponse(config));
  };

  listPlatformFeeConfigs = async (req, res) => {
    const configs = await this.subscriptionService.listPlatformFeeConfigs(req.query);
    res.json(successResponse(configs));
  };

  getPlatformFeeConfig = async (req, res) => {
    const config = await this.subscriptionService.getPlatformFeeConfig(req.params.configId);
    res.json(successResponse(config));
  };

  updatePlatformFeeConfig = async (req, res) => {
    const config = await this.subscriptionService.updatePlatformFeeConfig(req.params.configId, req.body);
    res.json(successResponse(config));
  };

  deletePlatformFeeConfig = async (req, res) => {
    const config = await this.subscriptionService.deletePlatformFeeConfig(req.params.configId);
    res.json(successResponse(config));
  };
}

module.exports = { SubscriptionController };
