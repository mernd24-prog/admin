import React, { useState } from 'react';
import ToggleButton from '../../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../../components/ImageViewer/ImageViewer';
import BannerSetup from './BannerSetup';

const Banners = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const tableHeadings = [
    "Title",
    "Type",
    "Image",
    "Open in (Target)",
    "Status",
    "Actions"
  ];
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };
  const dummyData = [
    {
      title: "Homepage Banner",
      type: "Promotional Banner",
      image: "https://demo.yo-kart.com/banner/banner-image/14/1/1/MINITHUMB?t=1697017910",
      target: "Same Window",
    },
    {
      title: "Sidebar Ad",
      type: "Banner",
      image: "https://demo.yo-kart.com/banner/banner-image/8/1/1/MINITHUMB?t=1684307244",
      target: "New Window",
    },
    {
      title: "Footer Promotion",
      type: "Banner",
      image: "https://demo.yo-kart.com/banner/banner-image/7/1/1/MINITHUMB?t=1657624572",
      target: "Same Window",
    },
    {
      title: "Category Promo",
      type: "Promotional Banner",
      image: "https://demo.yo-kart.com/banner/banner-image/7/1/1/MINITHUMB?t=1657624572",
      target: "New Window",
    },
    {
      title: "Flash Sale",
      type: "Image",
      image: "https://demo.yo-kart.com/banner/banner-image/8/1/1/MINITHUMB?t=1684307244",
      target: "Same Window",
    },
  ];

  const tableRows = dummyData.map((item, index) => [
    item.title,
    item.type,
    <span
      key={index}
      className="flex items-center cursor-pointer"
      onClick={() => handleImageClick(item?.image)}
    >
      <img
        src={item?.image}
        alt=""
        className="object-cover w-24 h-auto"
      />
    </span>,
    item.target,
    <ToggleButton key={index} />,
    <ActionButtons key={index} showLinkButton={false} onEdit={() => setIsModalOpen(true)} showDeleteButton={false} />
  ]);

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Banners"
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
      <BannerSetup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};

export default Banners;
