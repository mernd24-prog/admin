import React, { useState } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import Bannerlocationsetup from './components/Bannerlocationsetup';
import { useNavigate } from 'react-router';

const BannerLocations = () => {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handleBanner = () => {
    navigate('/app/inner-banners')
  }

  const tableHeadings = [
    "Title",
    "Preferred width (in pixels)",
    "Preferred height (in pixels)",
    "Promotion Cost",
    "Status",
    "Actions"
  ];

  const dummyData = [
    [
      "Product Detail page banner",
      "920",
      "690",
      "$3.00",
      <ToggleButton />,
      <ActionButtons showLinkButton={false} onEdit={() => setIsModalOpen(true)}
        showOptionValues={true} showDeleteButton={false} showBannerButton={true} onBanner={handleBanner} />
    ]
  ];

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Banner Locations"
            tableHeadings={tableHeadings}
            data={dummyData}
            showSearch={true}
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
          />
        </div>
      </div>
      <Bannerlocationsetup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default BannerLocations;
