/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';

const ShippingProfiles = () => {
  const [profiles, setProfiles] = useState([]);

  const initialProfiles = [
    {
      name: "Item Level Shipping",
      products: 155,
      country: ['usa,germany,austrilia, america']
    },
    {
      name: "Box Shipping",
      products: 78,
      country: ["Germany", "Central America"]
    },
    {
      name: "Express Shipping",
      products: 22,
      country: "Japan"
    }
  ];

  useEffect(() => {
    setProfiles(initialProfiles);
  }, []);

  const tableHeadings = ['Name', 'Products', 'Rates For', 'Actions'];
  const tableRows = profiles.map((profile) => {
    const countries = Array.isArray(profile.country)
      ? profile.country.flatMap(c => c.split(',').map(c => c.trim()))
      : profile.country.split(',').map(c => c.trim());

    return [
      profile.name,
      profile.products,
      <div className="flex flex-wrap gap-2">
        {countries.map((country, index) => (
          <span
            key={index}
            className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-full"
          >
            {country}
          </span>
        ))}
      </div>,
      <ActionButtons
        showEditButton={false}
        showLinkButton={false}
        showDeleteButton={true}
      />
    ];
  });


  return (
    <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
      <div className="p-4 bg-white rounded-lg border border-[#E6E6E6]">
        <TableData
          Heading="Shipping Profiles"
          tableHeadings={tableHeadings}
          data={tableRows}
          showSearch={true}
          showFilter={false}
          showSummary={false}
          showAddButton={false}
          addButtonLabel="Add Profile"
          onClickFunction={() => {

          }}
        />
      </div>
    </div>
  );
};

export default ShippingProfiles;
