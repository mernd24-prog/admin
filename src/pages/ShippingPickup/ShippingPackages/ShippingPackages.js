/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import AddEditShippingPackages from './components/AddEditShippingPackages';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';

const ShippingPackages = () => {
  const [packages, setPackages] = useState([]);
  const [isShippingPacOpen, setIsShippingPacOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)


  const initialPackages = [
    {
      name: "Fragile",
      dimensions: "25.00 x 2.00 x 20.00",
      unit: "Inch"
    },
    {
      name: "Heavy Duty",
      dimensions: "50.00 x 40.00 x 35.00",
      unit: "Centimeter"
    },
    {
      name: "Lightweight",
      dimensions: "15.00 x 10.00 x 5.00",
      unit: "mm"
    }
  ];

  useEffect(() => {
    setPackages(initialPackages);
  }, []);

  const tableHeadings = ['Name', 'Dimensions', 'Unit', 'Actions'];

  const getUnitBadge = (unit) => {
    let bgColor = '';
    let textColor = '';

    switch (unit.toLowerCase()) {
      case 'inch':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-700';
        break;
      case 'Centimeter':
        bgColor = 'bg-green-100';
        textColor = 'text-green-700';
        break;
      case 'mm':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-700';
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-700';
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold ${bgColor} ${textColor}`}>
        {unit}
      </span>
    );
  };

  const tableRows = packages.map((pkg) => [
    pkg.name,
    pkg.dimensions,
    getUnitBadge(pkg.unit),
    <ActionButtons
      showEditButton={true}
      onEdit={() => setIsShippingPacOpen(true)}
      showDeleteButton={true}
      showLinkButton={false}
      onDelete={() => setShowDeleteConfirmation(true)} />
  ]);

  return (
    <>
      <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
        <div className="p-4 bg-white rounded-lg border border-[#E6E6E6]">
          <TableData
            Heading="Shipping Packages"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel="Add"
            onClickFunction={() => setIsShippingPacOpen(true)}
          />
        </div>
      </div>
      <AddEditShippingPackages
        isShippingPacOpen={isShippingPacOpen}
        onShippingPacClose={() => setIsShippingPacOpen(false)}
      />
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        // confirmDelete={confirmDelete}
        DeleteHeading={'Are you sure you want to delete?'}
      />
    </>
  );
};

export default ShippingPackages;