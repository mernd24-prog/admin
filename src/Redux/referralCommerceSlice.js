import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  summaryData: {},
  hierarchyData: {},
  influencersData: {},
  createParentData: {},
  createChildData: {},
  updateInfluencerStatusData: {},
  promoteInfluencerData: {},
  codesData: {},
  createCodeData: {},
  updateCodeData: {},
  ordersData: {},
  commissionsData: {},
  payoutsData: {},
  approvePayoutData: {},
  rejectPayoutData: {},
  paidPayoutData: {},
  rulesData: {},
  updateRulesData: {},
  bonusRulesData: {},
  createBonusRuleData: {},
  updateBonusRuleData: {},
  bonusAchievementsData: {},
  bonusProgressData: {},
  evaluateBonusRulesData: {},
  fraudReviewsData: {},
};

const pickQuery = (keys = []) => (params = {}) =>
  keys.reduce((acc, key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const omit = (payload = {}, keys = []) =>
  Object.entries(payload || {}).reduce((acc, [key, value]) => {
    if (!keys.includes(key) && value !== undefined) acc[key] = value;
    return acc;
  }, {});

const idOf = (payload = {}, ...keys) => {
  for (const key of keys) {
    if (payload?.[key]) return payload[key];
  }
  return payload?._id || payload?.id;
};

const listQueryKeys = ["q", "page", "limit", "status"];

export const getReferralSummary = createApiThunkPrivate(
  "referralCommerce/getSummary",
  ENDPOINTS.referral.summary,
  "GET"
);

export const getReferralHierarchy = createApiThunkPrivate(
  "referralCommerce/getHierarchy",
  ENDPOINTS.referral.hierarchy,
  "GET"
);

export const getReferralInfluencers = createApiThunkPrivate(
  "referralCommerce/getInfluencers",
  ENDPOINTS.referral.influencers,
  "GET",
  true,
  {
    transformParams: pickQuery([
      ...listQueryKeys,
      "influencerType",
      "parentInfluencerId",
      "canCreateChildren",
    ]),
  }
);

export const createReferralParent = createApiThunkPrivate(
  "referralCommerce/createParent",
  ENDPOINTS.referral.parentInfluencers,
  "POST"
);

export const createReferralChild = createApiThunkPrivate(
  "referralCommerce/createChild",
  (payload) => ENDPOINTS.referral.childInfluencers(idOf(payload, "parentId", "parentInfluencerId")),
  "POST",
  false,
  { transformBody: (payload = {}) => omit(payload, ["parentId", "parentInfluencerId"]) }
);

export const updateReferralInfluencerStatus = createApiThunkPrivate(
  "referralCommerce/updateInfluencerStatus",
  (payload) => ENDPOINTS.referral.influencerStatus(idOf(payload, "influencerId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["influencerId", "id", "_id"]) }
);

export const promoteReferralInfluencer = createApiThunkPrivate(
  "referralCommerce/promoteInfluencer",
  (payload) => ENDPOINTS.referral.promoteInfluencer(idOf(payload, "influencerId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["influencerId", "id", "_id"]) }
);

export const getReferralCodes = createApiThunkPrivate(
  "referralCommerce/getCodes",
  ENDPOINTS.referral.codes,
  "GET",
  true,
  { transformParams: pickQuery([...listQueryKeys, "code", "influencerId", "fromDate", "toDate"]) }
);

export const createReferralCode = createApiThunkPrivate(
  "referralCommerce/createCode",
  ENDPOINTS.referral.codes,
  "POST"
);

export const updateReferralCode = createApiThunkPrivate(
  "referralCommerce/updateCode",
  (payload) => ENDPOINTS.referral.code(idOf(payload, "codeId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["codeId", "id", "_id"]) }
);

export const getReferralOrders = createApiThunkPrivate(
  "referralCommerce/getOrders",
  ENDPOINTS.referral.orders,
  "GET",
  true,
  {
    transformParams: pickQuery([
      ...listQueryKeys,
      "code",
      "influencerId",
      "customerId",
      "fromDate",
      "toDate",
    ]),
  }
);

export const getReferralCommissions = createApiThunkPrivate(
  "referralCommerce/getCommissions",
  ENDPOINTS.referral.commissions,
  "GET",
  true,
  {
    transformParams: pickQuery([
      ...listQueryKeys,
      "commissionType",
      "influencerId",
      "orderId",
      "code",
      "fromDate",
      "toDate",
    ]),
  }
);

export const getReferralPayouts = createApiThunkPrivate(
  "referralCommerce/getPayouts",
  ENDPOINTS.referral.payouts,
  "GET",
  true,
  { transformParams: pickQuery([...listQueryKeys, "influencerId", "fromDate", "toDate"]) }
);

export const approveReferralPayout = createApiThunkPrivate(
  "referralCommerce/approvePayout",
  (payload) => ENDPOINTS.referral.approvePayout(idOf(payload, "payoutId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["payoutId", "id", "_id"]) }
);

export const rejectReferralPayout = createApiThunkPrivate(
  "referralCommerce/rejectPayout",
  (payload) => ENDPOINTS.referral.rejectPayout(idOf(payload, "payoutId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["payoutId", "id", "_id"]) }
);

export const markReferralPayoutPaid = createApiThunkPrivate(
  "referralCommerce/markPayoutPaid",
  (payload) => ENDPOINTS.referral.paidPayout(idOf(payload, "payoutId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["payoutId", "id", "_id"]) }
);

export const getReferralRules = createApiThunkPrivate(
  "referralCommerce/getRules",
  ENDPOINTS.referral.rules,
  "GET",
  true,
  { transformParams: pickQuery(["page", "limit", "active"]) }
);

export const updateReferralRules = createApiThunkPrivate(
  "referralCommerce/updateRules",
  ENDPOINTS.referral.rules,
  "PUT"
);

export const getReferralBonusRules = createApiThunkPrivate(
  "referralCommerce/getBonusRules",
  ENDPOINTS.referral.bonusRules,
  "GET",
  true,
  { transformParams: pickQuery([...listQueryKeys, "period", "targetType", "applyTo"]) }
);

export const createReferralBonusRule = createApiThunkPrivate(
  "referralCommerce/createBonusRule",
  ENDPOINTS.referral.bonusRules,
  "POST"
);

export const updateReferralBonusRule = createApiThunkPrivate(
  "referralCommerce/updateBonusRule",
  (payload) => ENDPOINTS.referral.bonusRule(idOf(payload, "ruleId")),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omit(payload, ["ruleId", "id", "_id"]) }
);

export const getReferralBonusAchievements = createApiThunkPrivate(
  "referralCommerce/getBonusAchievements",
  ENDPOINTS.referral.bonusAchievements,
  "GET",
  true,
  { transformParams: pickQuery([...listQueryKeys, "ruleId", "influencerId", "fromDate", "toDate"]) }
);

export const getReferralBonusProgress = createApiThunkPrivate(
  "referralCommerce/getBonusProgress",
  ENDPOINTS.referral.bonusProgress,
  "GET",
  true,
  { transformParams: pickQuery(["page", "limit", "ruleId", "influencerId", "referenceDate"]) }
);

export const evaluateReferralBonusRules = createApiThunkPrivate(
  "referralCommerce/evaluateBonusRules",
  ENDPOINTS.referral.evaluateBonusRules,
  "POST"
);

export const getReferralFraudReviews = createApiThunkPrivate(
  "referralCommerce/getFraudReviews",
  ENDPOINTS.referral.fraud,
  "GET",
  true,
  { transformParams: pickQuery(["page", "limit", "status", "severity", "influencerId"]) }
);

const referralCommerceSlice = createSlice({
  name: "referralCommerce",
  initialState,
  extraReducers: (builder) => {
    [
      [getReferralSummary, "summaryData"],
      [getReferralHierarchy, "hierarchyData"],
      [getReferralInfluencers, "influencersData"],
      [createReferralParent, "createParentData"],
      [createReferralChild, "createChildData"],
      [updateReferralInfluencerStatus, "updateInfluencerStatusData"],
      [promoteReferralInfluencer, "promoteInfluencerData"],
      [getReferralCodes, "codesData"],
      [createReferralCode, "createCodeData"],
      [updateReferralCode, "updateCodeData"],
      [getReferralOrders, "ordersData"],
      [getReferralCommissions, "commissionsData"],
      [getReferralPayouts, "payoutsData"],
      [approveReferralPayout, "approvePayoutData"],
      [rejectReferralPayout, "rejectPayoutData"],
      [markReferralPayoutPaid, "paidPayoutData"],
      [getReferralRules, "rulesData"],
      [updateReferralRules, "updateRulesData"],
      [getReferralBonusRules, "bonusRulesData"],
      [createReferralBonusRule, "createBonusRuleData"],
      [updateReferralBonusRule, "updateBonusRuleData"],
      [getReferralBonusAchievements, "bonusAchievementsData"],
      [getReferralBonusProgress, "bonusProgressData"],
      [evaluateReferralBonusRules, "evaluateBonusRulesData"],
      [getReferralFraudReviews, "fraudReviewsData"],
    ].forEach(([thunk, key]) => createExtraReducersForThunk(builder, thunk, key));
  },
});

export default referralCommerceSlice.reducer;
