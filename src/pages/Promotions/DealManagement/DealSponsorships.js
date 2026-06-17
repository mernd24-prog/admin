import React from "react";
import { MdCampaign } from "react-icons/md";
import { PageHeader } from "../../../components/Shared";

const DealSponsorships = () => {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Deal Sponsorships"
        subtitle="Manage sponsored placement deals and brand partnerships"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <MdCampaign size={56} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Deal Sponsorships</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Sponsorships allow sellers to boost deal visibility through paid placements.
          Manage individual deal sponsorships from the <strong>Deal Management</strong> page
          using the deal detail view, which includes sponsorship configuration options.
        </p>
        <a
          href="/app/deal-management"
          className="mt-6 inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100"
        >
          Go to Deal Management →
        </a>
      </div>
    </div>
  );
};

export default DealSponsorships;
