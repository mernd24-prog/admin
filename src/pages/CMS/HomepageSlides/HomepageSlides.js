/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import SlideSetup from './components/SlideSetup';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';


const HomepageSlides = () => {
  const [apiRes, setApiRes] = useState([])
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const dummydata = [
    {
      image: "https://demo.yo-kart.com/image/slide/38/1/1/THUMB?t=1660907045",
      name: "B2C Classic Goggles",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/slide/44/1/1/THUMB?t=1660907117",
      name: "B2C Smart Phone",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/slide/39/1/1/THUMB?t=1653989875",
      name: "B2C Women Fashion",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/slide/40/1/1/THUMB?t=1653993015",
      name: "B2C Smart Phone",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/slide/42/1/1/THUMB?t=1655809730",
      name: "B2C Smart Phone",
      status: "",
      action: "",
    },
  ];

  useEffect(() => {
    setApiRes(dummydata)
  }, [])
  const tableHeadings = [
    "Media",
    "Title",
    "Status",
    "Action"
  ]

  const tableRows = apiRes?.map((ele, index) => {
    return [
      <span
        key={index}
        className="flex items-center cursor-pointer"
        onClick={() => handleImageClick(ele?.image)}
      >
        <img
          src={ele?.image}
          alt=""
          className="object-cover"
        />
      </span>,
      ele?.name,
      <ToggleButton />,
      <ActionButtons showLinkButton={false} onEdit={() => setIsModalOpen(true)} onDelete={() => setShowDeleteConfirmation(true)} />
    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Homepage Slides"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by...'
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
      <SlideSetup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        DeleteHeading={'Are you sure you want to delete?'}
      />
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  )
}

export default HomepageSlides