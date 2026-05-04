/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import AddEditVolumeDiscount from './components/AddEditVolumeDiscount';


const VolumeDiscount = () => {
  const [apiRes, setApiRes] = useState([])
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const dummy = [
    {
      image: "https://demo.yo-kart.com/image/product/1421/SMALL/35519/0/1?t=1739517778",
      name: "AUSHA 4K 60fps Dual Touch Screen",
      desc: "Sold by: Shopper Shop",
      mpq: "3",
      dis: "12.00",
    },
    {
      image: "https://demo.yo-kart.com/image/product/1409/SMALL/35519/0/1?t=1739517788",
      name: "Canon EOS M50 Mark II Mirrorless",
      desc: "Sold by: Tech World",
      mpq: "3",
      dis: "12.00",
    },
    {
      image: "https://demo.yo-kart.com/image/product/1377/SMALL/35519/0/1?t=1739517798",
      name: "Sony WH-1000XM4 Wireless Headphones",
      mpq: "3",
      dis: "12.00",
    },
    {
      image: "https://demo.yo-kart.com/image/product/1364/SMALL/35519/0/1?t=1739517808",
      name: "Apple Watch Series 9 GPS",
      desc: "Sold by: Apple Hub",
      mpq: "3",
      dis: "12.00",
    },
    {
      image: "https://demo.yo-kart.com/image/product/1399/SMALL/35519/0/1?t=1739517818",
      name: "GoPro HERO12 Action Camera",
      desc: "Sold by: Camera Kings",
      mpq: "3",
      dis: "12.00",
    }
  ];

  useEffect(() => {
    setApiRes(dummy)
  }, [])
  const tableHeadings = [
    "Product Name",
    "Minimum Purchase Quantity",
    "Discount(%)",
    "Action"
  ]

  const tableRows = apiRes?.map((ele, index) => {
    return [
      <span className="flex items-center space-x-2 cursor-pointer" onClick={() => handleImageClick(ele?.image)}>
        <img src={ele?.image} alt='' className='object-cover w-20 h-20 border rounded' />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{ele?.name}</span>
          <span className="text-sm text-gray-500">{ele?.desc}</span>
        </div>
      </span>,
      ele?.mpq,
      ele?.dis,
      <span>
        <ActionButtons showEditButton={false} showLinkButton={false} />
      </span>
    ];
  });


  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Volume Discount"
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
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      <AddEditVolumeDiscount
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default VolumeDiscount