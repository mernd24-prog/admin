/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import AddEditBadges from './components/AddEditBadges';

const Badges = () => {
  const [badgeData, setBadgeData] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false)

  const initialData = [
    {
      image: 'https://demo.yo-kart.com/image/badge-icon/14/0/MINI/0?t=1692340189',
      name: 'PICK',
      triggerType: 'Automatic',
      adminApproval: 'Not allowed',
      addedOn: '23/02/2023 19:14',
      status: 'Active',
    },
    {
      image: 'https://demo.yo-kart.com/image/badge-icon/10/0/MINI/0?t=1692340175',
      name: 'TRENDING',
      triggerType: 'Manual',
      adminApproval: 'Required',
      addedOn: '18/01/2023 12:40',
      status: 'Inactive',
    },
  ];

  useEffect(() => {
    setBadgeData(initialData);
  }, []);

  const tableHeadings = [
    'Image',
    'Name',
    'Trigger type',
    'Admin Approval',
    'Added On',
    'Status',
    'Actions',
  ];

  const tableRows = badgeData.map((badge, index) => [
    <img src={badge.image} alt="badge" className="object-contain w-10 h-10 rounded" />,
    badge.name,
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${badge.triggerType === 'Automatic'
        ? 'text-blue-800'
        : ' text-purple-800'
        }`}
    >
      {badge.triggerType}
    </span>,
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${badge.adminApproval === 'Not allowed'
        ? 'bg-red-100 text-red-800'
        : 'bg-green-100 text-green-800'
        }`}
    >
      {badge.adminApproval}
    </span>,
    badge.addedOn,
    <span >
      <ToggleButton />
    </span>,
    <ActionButtons onDelete={() => setShowDeleteConfirmation(true)} onEdit={() => setIsModalOpen(true)} />,
  ]);

  return (
    <>
      <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
        <div className="p-4 bg-white rounded-lg border border-[#E6E6E6]">
          <TableData
            Heading="Badges"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel="Add"
            onClickFunction={() => {
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        DeleteHeading="Are you sure you want to delete this badge?"
      />

      <AddEditBadges
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default Badges;
