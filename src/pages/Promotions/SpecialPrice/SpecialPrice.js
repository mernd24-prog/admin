/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import AddEditSpecialPrice from './components/AddEditSpecialPrice';


const SpecialPrice = () => {
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
      sellingPrice: "$172.67",
      specialPrice: "$169.49",
      off: "1.84% OFF",
      startDate: "2025-02-14",
      endDate: "2030-02-28",
      ava: "In Stock"
    },
    {
      image: "https://demo.yo-kart.com/image/product/1409/SMALL/35519/0/1?t=1739517788",
      name: "Canon EOS M50 Mark II Mirrorless",
      desc: "Sold by: Tech World",
      sellingPrice: "$899.00",
      specialPrice: "$849.00",
      off: "5.56% OFF",
      startDate: "2025-03-01",
      endDate: "2030-03-31",
      ava: "In Stock"
    },
    {
      image: "https://demo.yo-kart.com/image/product/1377/SMALL/35519/0/1?t=1739517798",
      name: "Sony WH-1000XM4 Wireless Headphones",
      desc: "Sold by: SoundStore",
      sellingPrice: "$349.99",
      specialPrice: "$299.99",
      off: "14.29% OFF",
      startDate: "2025-01-01",
      endDate: "2026-01-01",
      ava: "In Stock"
    },
    {
      image: "https://demo.yo-kart.com/image/product/1364/SMALL/35519/0/1?t=1739517808",
      name: "Apple Watch Series 9 GPS",
      desc: "Sold by: Apple Hub",
      sellingPrice: "$399.00",
      specialPrice: "$379.00",
      off: "5.01% OFF",
      startDate: "2025-04-01",
      endDate: "2026-04-01",
      ava: "In Stock"
    },
    {
      image: "https://demo.yo-kart.com/image/product/1399/SMALL/35519/0/1?t=1739517818",
      name: "GoPro HERO12 Action Camera",
      desc: "Sold by: Camera Kings",
      sellingPrice: "$499.99",
      specialPrice: "$469.99",
      off: "6.00% OFF",
      startDate: "2025-05-01",
      endDate: "2026-05-01",
      ava: "In Stock"
    }
  ];

  const handleEditChange = (index, field, value) => {
    const updated = [...apiRes];
    updated[index][field] = value;
    setApiRes(updated);
  };

  useEffect(() => {
    setApiRes(dummy)
  }, [])
  const tableHeadings = [
    "Product",
    "Selling Price",
    "Special Price",
    "Start Date",
    'End Date',
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
      <span className="text-sm font-medium">{ele?.sellingPrice}</span>,
      <div className="flex flex-col space-y-1">
        <input
          type="text"
          className="px-2 py-1 text-sm rounded outline-none border border-[#a19e9e1c]" title='Click to edit'
          value={ele.specialPrice}
          onChange={(e) => handleEditChange(index, 'specialPrice', e.target.value)}
        />
        <span className="px-2 py-1 text-xs font-semibold text-green-600">{ele.off}</span>
      </div>,

      <input
        type="date"
        className="px-2 py-1 text-sm rounded outline-none border border-[#a19e9e1c]" title='Click to edit'
        value={ele.startDate}
        onChange={(e) => handleEditChange(index, 'startDate', e.target.value)}
      />,

      <input
        type="date"
        className="px-2 py-1 text-sm rounded outline-none border border-[#a19e9e1c]" title='Click to edit'
        value={ele.endDate}
        onChange={(e) => handleEditChange(index, 'endDate', e.target.value)}
      />,
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
            Heading="Special Price"
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
      <AddEditSpecialPrice
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default SpecialPrice