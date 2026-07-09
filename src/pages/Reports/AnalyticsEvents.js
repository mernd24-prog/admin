import React from "react";
import { MdAnalytics } from "react-icons/md";
import { PageHeader } from "../../components/Shared";

const AnalyticsEvents = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Events"
        subtitle="Platform event tracking and behavioral analytics"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <MdAnalytics size={56} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Analytics Events</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Track user interactions, product views, add-to-cart events, and purchase funnels
          across the platform. This event stream viewer is pending backend implementation.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          For platform analytics, visit the{" "}
          <a href="/app/analytics" className="text-blue-600 hover:underline">Analytics Dashboard</a>.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
          <span>Backend API: <code className="font-mono">/admin/analytics/events</code></span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsEvents;
