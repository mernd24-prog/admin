/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import Select from 'react-select';
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import AddEditSimilarProducts from './components/AddEditSimilarProducts';


const SimilarProducts = () => {
  const [apiRes, setApiRes] = useState([])
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const dummydata = [
    {
      image: "https://demo.yo-kart.com/image/product/43/SMALL/84/0/1?t=1663763227",
      name: "Animal cot hanging",
      desc: "Animal",
      sellerName: "Seller: Cindy",
      options: [
        { value: 'cot-hanging-fishes', label: 'Cot hanging fishes | Characters : Fishes | Cindy' },
        { value: 'chotta-bheem', label: 'Chotta bheem soft toy | Characters : Chotta Bheem | Cindy' }
      ],
      selectedOptions: [
        { value: 'cot-hanging-fishes', label: 'Cot hanging fishes | Characters : Fishes | Cindy' }
      ]
    },
    {
      image: "https://demo.yo-kart.com/image/product/44/SMALL/85/0/1?t=1663763227",
      name: "Micky mouse soft toy",
      desc: "Characters : Mickey Mouse",
      sellerName: "Seller: Cindy",
      options: [
        { value: 'micky', label: 'Micky mouse soft toy | Characters : Mickey Mouse | Cindy' },
        { value: 'batman', label: 'Blue Batman | Color : Blue | Cindy' }
      ],
      selectedOptions: [
        { value: 'micky', label: 'Micky mouse soft toy | Characters : Mickey Mouse | Cindy' }
      ]
    },
    {
      image: "https://demo.yo-kart.com/image/product/45/SMALL/86/0/1?t=1663763227",
      name: "Apple iPhone 6s Plus",
      desc: "Space Grey, 32 GB",
      sellerName: "Seller: Cindy",
      options: [
        { value: '32gb', label: 'Apple iPhone 6s Plus (Space Grey, 32 GB) | Select Color : Space grey | Storage : 32GB | Cindy' },
        { value: '64gb', label: 'Apple iPhone 6s Plus (Space Grey, 64 GB) | Select Color : Space grey | Storage : 64 GB | Cindy' },
        { value: '16gb', label: 'Apple iPhone 6s Plus (Gold, 16 GB) | Select Color : Gold | Storage : 16 GB | Cindy' }
      ],
      selectedOptions: [
        { value: '32gb', label: 'Apple iPhone 6s Plus (Space Grey, 32 GB) | Select Color : Space grey | Storage : 32GB | Cindy' }
      ]
    },
    {
      image: "https://demo.yo-kart.com/image/product/44/SMALL/85/0/1?t=1663763227",
      name: "Micky mouse soft toy",
      desc: "Characters : Mickey Mouse",
      sellerName: "Seller: Cindy",
      options: [
        { value: 'micky', label: 'Micky mouse soft toy | Characters : Mickey Mouse | Cindy' },
        { value: 'batman', label: 'Blue Batman | Color : Blue | Cindy' }
      ],
      selectedOptions: [
        { value: 'micky', label: 'Micky mouse soft toy | Characters : Mickey Mouse | Cindy' }
      ]
    },
    {
      image: "https://demo.yo-kart.com/image/product/45/SMALL/86/0/1?t=1663763227",
      name: "Apple iPhone 6s Plus",
      desc: "Space Grey, 32 GB",
      sellerName: "Seller: Cindy",
      options: [
        { value: '32gb', label: 'Apple iPhone 6s Plus (Space Grey, 32 GB) | Select Color : Space grey | Storage : 32GB | Cindy' },
        { value: '64gb', label: 'Apple iPhone 6s Plus (Space Grey, 64 GB) | Select Color : Space grey | Storage : 64 GB | Cindy' },
        { value: '16gb', label: 'Apple iPhone 6s Plus (Gold, 16 GB) | Select Color : Gold | Storage : 16 GB | Cindy' }
      ],
      selectedOptions: [
        { value: '32gb', label: 'Apple iPhone 6s Plus (Space Grey, 32 GB) | Select Color : Space grey | Storage : 32GB | Cindy' }
      ]
    },
  ];

  useEffect(() => {
    setApiRes(dummydata)
  }, [])
  const tableHeadings = [
    "Product Name",
    "Similar Products",
    "Action"
  ]

  const tableRows = apiRes?.map((ele, index) => {
    return [
      <span className="flex items-center space-x-2 cursor-pointer">
        <img src={ele?.image} alt='' className='object-cover w-20 h-20 border rounded' onClick={() => handleImageClick(ele?.image)} />
        <div className='flex flex-col'>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{ele?.name}</span>
          </div>
          <div className="flex flex-col mt-4">
            <span className="text-sm text-gray-500">{ele?.desc}</span>
            <span className="text-sm text-gray-500">{ele?.sellerName}</span>
          </div>
        </div>
      </span>,
      <span className=''>
        <Select
          key={index}
          isMulti
          options={ele.options}
          defaultValue={ele.selectedOptions}
          onChange={(selected) => console.log(`Selected for ${ele.name}:`, selected)}
          styles={{ container: (base) => ({ ...base, width: 700 }) }}
        />
      </span>,
      <ActionButtons showEditButton={false} showLinkButton={false} />
    ];
  });



  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Similar Products"
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
      <AddEditSimilarProducts
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default SimilarProducts