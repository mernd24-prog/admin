/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';

const PickupAddresses = () => {
  const [addresses, setAddresses] = useState([]);

  const initialAddresses = [
    {
      label: "Office",
      detail: {
        name: "Ablysoft",
        location: "Chandigarh Mohali, Punjab, India",
        zip: "160055"
      },
      phone: "9999999999"
    },
    {
      label: "Warehouse",
      detail: {
        name: "LogiStore",
        location: "Delhi Industrial Area, Delhi, India",
        zip: "110011"
      },
      phone: "8888888888"
    }
  ];

  useEffect(() => {
    setAddresses(initialAddresses);
  }, []);

  const tableHeadings = ['Address Label', 'Address Detail', 'Phone Number', 'Actions'];

  const renderAddressDetail = (detail) => (
    <div className="text-sm leading-snug">
      <div className="font-medium">{detail.name}</div>
      <div>{detail.location}</div>
      <div>Zip: {detail.zip}</div>
    </div>
  );

  const tableRows = addresses.map((entry) => [
    entry.label,
    renderAddressDetail(entry.detail),
    entry.phone,
    <ActionButtons showEditButton={true} showDeleteButton={true} showLinkButton={false} />
  ]);

  return (
    <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
      <div className="p-4 bg-white rounded-lg border border-[#E6E6E6]">
        <TableData
          Heading="Pickup Addresses"
          tableHeadings={tableHeadings}
          data={tableRows}
          showSearch={true}
          showFilter={false}
          showSummary={false}
          showAddButton={true}
          addButtonLabel="Add Address"
          onClickFunction={() => {

          }}
        />
      </div>
    </div>
  );
};

export default PickupAddresses;
