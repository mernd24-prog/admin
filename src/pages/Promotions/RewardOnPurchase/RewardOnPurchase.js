/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import AddEditRewardOnPurchase from './components/AddEditRewardOnPurchase';

const RewardOnPurchase = () => {
  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false)

  const rewardData = [
    {
      minPurchase: "1200.00",
      rewardPoint: "66"
    },
    {
      minPurchase: "2000.00",
      rewardPoint: "120"
    },
    {
      minPurchase: "500.00",
      rewardPoint: "20"
    }
  ];

  useEffect(() => {
    setApiRes(rewardData);
  }, []);

  const tableHeadings = [
    "Min Purchase Amt",
    "Reward Point",
    "Actions"
  ];

  const tableRows = apiRes?.map((ele, index) => {
    return [
      ele?.minPurchase,
      ele?.rewardPoint,
      <span>
        <ActionButtons onDelete={() => setShowDeleteConfirmation(true)} showLinkButton={false} onEdit={() => setIsModalOpen(true)} />
      </span>
    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Reward On Purchase"
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
        // confirmDelete={confirmDelete}
        DeleteHeading={'Are you sure you want to delete this reward rule?'}
      />
      <AddEditRewardOnPurchase
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default RewardOnPurchase;
