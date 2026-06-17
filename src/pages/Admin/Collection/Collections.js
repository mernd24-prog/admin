import React from "react";
import { MdCollections, MdAdd } from "react-icons/md";
import { PageHeader } from "../../../components/Shared";

const Collections = () => {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Collections"
        subtitle="Curated product groupings for storefront display"
        actions={
          <button
            disabled
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
          >
            <MdAdd size={16} />
            New Collection
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <MdCollections size={56} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Collections Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          The Collections feature allows you to create curated product groups (e.g. "Summer Sale",
          "New Arrivals") that appear as sections on the storefront. Backend integration is in progress.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
          <span>Backend API: <code className="font-mono">/admin/platform/collections</code></span>
        </div>
      </div>
    </div>
  );
};

export default Collections;
