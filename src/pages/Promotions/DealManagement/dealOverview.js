export const getDealOverview = (analytics = {}, productKeysCount = 0) => {
  const counts = {};
  if (Array.isArray(analytics.statusCounts)) {
    analytics.statusCounts.forEach((item) => {
      if (item?.status) counts[item.status] = Number(item.count || 0);
    });
  } else {
    Object.entries(analytics.statusCounts || {}).forEach(([status, count]) => {
      counts[status] = Number(count || 0);
    });
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const summary = analytics.summary || {};
  return {
    metrics: {
      total,
      active: counts.active || 0,
      scheduled: counts.scheduled || 0,
      expired: counts.expired || 0,
      revenue: Number(summary.revenue || 0),
      units: Number(summary.unitsSold || 0),
    },
    tabCounts: {
      "": total + productKeysCount,
      product_keys: productKeysCount,
      pending_approval: counts.pending_approval || 0,
      active: counts.active || 0,
      scheduled: counts.scheduled || 0,
      expired: counts.expired || 0,
      rejected: counts.rejected || 0,
      cancelled: counts.cancelled || 0,
    },
  };
};
