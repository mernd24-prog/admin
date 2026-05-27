/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import useDropdownOptions from '../../../hooks/useDropdownOptions';

const ShippingProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const { options: countryOptions } = useDropdownOptions('countries');

  const initialProfiles = [
    {
      name: "Item Level Shipping",
      products: 155,
      countryIndexes: [0, 1, 2, 3],
    },
    {
      name: "Box Shipping",
      products: 78,
      countryIndexes: [1, 2],
    },
    {
      name: "Express Shipping",
      products: 22,
      countryIndexes: [0],
    }
  ];

  useEffect(() => {
    setProfiles(initialProfiles);
  }, []);

  const tableHeadings = ['Name', 'Products', 'Rates For', 'Actions'];
  const tableRows = profiles.map((profile) => {
    const countries = profile.countryIndexes
      .map((index) => countryOptions[index]?.label)
      .filter(Boolean);

    return [
      profile.name,
      profile.products,
      <div className="flex flex-wrap gap-2">
        {(countries.length ? countries : ['No countries configured']).map((country, index) => (
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
