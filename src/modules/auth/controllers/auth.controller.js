const { successResponse } = require("../../../shared/http/response");
const { AuthService } = require("../services/auth.service");
const { buildRequestContext } = require("../../../shared/utils/request-context");

class AuthController {
  constructor({ authService = new AuthService() } = {}) {
    this.authService = authService;
  }

  register = async (req, res) => {
    const result = await this.authService.register(req.body, buildRequestContext(req));
    res.status(201).json(successResponse(result));
  };

  registerWithOtp = async (req, res) => {
    const result = await this.authService.registerWithOtp(req.body, buildRequestContext(req));
    res.status(201).json(successResponse(result));
  };

  verifyRegistration = async (req, res) => {
    const result = await this.authService.verifyRegistration(req.body, buildRequestContext(req));
    res.status(201).json(successResponse(result));
  };

  login = async (req, res) => {
    const result = await this.authService.login(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  refresh = async (req, res) => {
    const result = await this.authService.refreshToken(req.body.refreshToken, buildRequestContext(req));
    res.json(successResponse(result));
  };

  socialLogin = async (req, res) => {
    const result = await this.authService.socialLogin(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  sendOtp = async (req, res) => {
    const result = await this.authService.sendOtp(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  verifyOtp = async (req, res) => {
    const result = await this.authService.verifyOtp(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  resendOtp = async (req, res) => {
    const result = await this.authService.resendOtp(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  forgotPassword = async (req, res) => {
    const result = await this.authService.forgotPassword(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  resetPassword = async (req, res) => {
    const result = await this.authService.resetPassword(req.body, buildRequestContext(req));
    res.json(successResponse(result));
  };

  changePassword = async (req, res) => {
    const payload = { ...req.body, userId: req.auth.sub };
    const result = await this.authService.changePassword(payload, buildRequestContext(req));
    res.json(successResponse(result));
  };

  status = async (req, res) => {
    const result = await this.authService.getAuthStatus(req.auth.sub);
    res.json(successResponse(result));
  };
}

module.exports = { AuthController };
