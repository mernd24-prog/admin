import React from "react";
import { MdMilitaryTech, MdAdd } from "react-icons/md";
import { PageHeader } from "../../../components/Shared";

const Badges = () => {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Badges"
        subtitle="Achievement and loyalty badges for buyers and sellers"
        actions={
          <button
            disabled
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
          >
            <MdAdd size={16} />
            New Badge
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <MdMilitaryTech size={56} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Badges Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Badges are awarded to buyers and sellers for milestones like "Verified Seller",
          "Top Buyer", or "Loyal Customer". This feature is pending backend implementation.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
          <span>Backend API: <code className="font-mono">/admin/platform/badges</code></span>
        </div>
      </div>
    </div>
  );
};

export default Badges;
