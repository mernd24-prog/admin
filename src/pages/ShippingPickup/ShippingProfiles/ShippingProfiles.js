/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { MdLocalShipping } from "react-icons/md";
import { PageHeader, DataTable } from "../../../components/Shared";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

const MOCK_PROFILES = [
  { id: 1, name: "Item Level Shipping", products: 155, countryIndexes: [0, 1, 2, 3] },
  { id: 2, name: "Box Shipping", products: 78, countryIndexes: [1, 2] },
  { id: 3, name: "Express Shipping", products: 22, countryIndexes: [0] },
];

const ShippingProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const { options: countryOptions } = useDropdownOptions("countries");

  useEffect(() => { setProfiles(MOCK_PROFILES); }, []);

  const COLUMNS = [
    { key: "name", label: "Name", render: (v) => <span className="font-medium text-gray-800">{v}</span> },
    { key: "products", label: "Products", render: (v) => <span className="font-mono text-sm">{v}</span> },
    {
      key: "countryIndexes",
      label: "Rates For",
      render: (v) => {
        const countries = (v || []).map((idx) => countryOptions[idx]?.label).filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1">
            {(countries.length ? countries : ["No countries configured"]).map((country, idx) => (
              <span key={idx} className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded-full">{country}</span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Shipping Profiles"
        subtitle="Configure shipping profiles and country rates"
        breadcrumbs={[{ label: "Shipping & Pickup" }, { label: "Shipping Profiles" }]}
      />

      <DataTable
        columns={COLUMNS}
        data={profiles}
        loading={false}
        totalCount={profiles.length}
        emptyText="No shipping profiles found."
        emptyIcon={<MdLocalShipping size={40} className="text-gray-200" />}
        requiredModule="shipping"
      />
    </div>
  );
};

export default ShippingProfiles;
