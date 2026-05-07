/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { MdOutlineMail } from 'react-icons/md';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';


const ThresholdProducts = () => {
  const [apiRes, setApiRes] = useState([])
  const [selectedImage, setSelectedImage] = useState(null);
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };
  const [filters, setFilters] = useState({ search: "" })

  const dummydata = [
    {
      image: "https://demo.yo-kart.com/image/product/58/SMALL/148/0/1?t=1675928033",
      name: "JBL T250SI Wired Headphone",
      desc: "Seller: michael",
      stock: "8",
      tStock: "10",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/product/58/SMALL/148/0/1?t=1675928033",
      name: "JBL T250SI Wired Headphone",
      desc: "Seller: michael",
      stock: "8",
      tStock: "10",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/product/5/SMALL/20/0/1?t=1675931494",
      name: "JBL T250SI Wired Headphone",
      desc: "Seller: michael",
      stock: "8",
      tStock: "10",
      action: "",
      st: "32GB | Black",
      seller: "Seller: Rohit"
    },
    {
      image: "https://demo.yo-kart.com/image/product/58/SMALL/148/0/1?t=1675928033",
      name: "JBL T250SI Wired Headphone",
      desc: "Seller: michael",
      stock: "8",
      tStock: "10",
      action: "",
    },
  ];

  useEffect(() => {
    setApiRes(dummydata)
  }, [])
  const tableHeadings = [
    "Product Name",
    "Stock Left",
    "Threshold Stock",
    "Action"
  ]

  const tableRows = apiRes?.map((ele, index) => {
    const sellerName = ele?.seller?.replace("Seller: ", "").trim();
    const email = `${sellerName?.toLowerCase()}@example.com`;

    return [
      <span
        key={index}
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => handleImageClick(ele?.image)}
      >
        <img
          src={ele?.image}
          alt=""
          className="object-cover w-14 h-14 border rounded"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{ele?.name}</span>

          {ele?.st && <span className="text-sm text-gray-600">{ele?.st}</span>}
          {ele?.seller && (
            <span className="flex items-center text-sm text-gray-500">
              {ele?.seller}
            </span>
          )}

          {!ele?.st && !ele?.seller && (
            <span className="text-sm text-gray-500">{ele?.desc}</span>
          )}
        </div>
      </span>,
      ele?.stock,
      ele?.tStock,
      <span className='ml-6'>
        <a
          href={`mailto:${email}`}
          className="text-gray-500 hover:text-blue-700"
          onClick={(e) => e.stopPropagation()}
        >
          <MdOutlineMail size={26} />
        </a>
      </span>
    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <div>
          <h3 className='font-semibold text-sm'><span className='text-[#a1a5b7]'>Home /</span> Threshold Products</h3>
        </div>
        <div className=' overflow-auto overflow-y-auto bg-white'>
          <div className='border-b p-2 border-[#dee2e6]'>
            <SearchComponent filters={filters} setFilters={setFilters} />
          </div>
          <TableData
            Heading="Threshold Products"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
          />
        </div>
      </div>
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  )
}

export default ThresholdProducts