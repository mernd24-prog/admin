/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ContentPageSetup from './components/ContentPageSetup';

const ContentPages = () => {
  const [apiRes, setApiRes] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  useEffect(() => {
    setApiRes(dummydata)
  }, [])

  const tableHeadings = ["Title", "Actions"];
  const dummydata = [
    { name: "About Us" },
    { name: "Privacy Policy" },
    { name: "Terms & Conditions" }
  ];
  const tableRows = apiRes?.map((ele, index) => {
    return [
      ele?.name,
      <ActionButtons showLinkButton={false} onEdit={() => setIsModalOpen(true)} onDelete={() => setShowDeleteConfirmation(true)} />
    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Content Pages"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel="Add"
            onClickFunction={() => setIsModalOpen(true)}
          />
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        DeleteHeading={'Are you sure you want to delete?'}
      />
      <ContentPageSetup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ContentPages;
