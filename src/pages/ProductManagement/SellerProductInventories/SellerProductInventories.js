/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import ProductMissingInfo from './components/ProductMissingInformation';
import SellerInventorySetup from './components/SellerInventorySetup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';


const SellerProductInventories = () => {
  const [apiRes, setApiRes] = useState([])
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null);
  const [isOn, setIsOn] = useState(false);
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const transactionData = [
    {
      image: "https://demo.yo-kart.com/image/product/2925/SMALL/6539/0/1?t=1684480789",
      name: "Casagold Glass Soap Dispenser ",
      desc: "Casagold Glass Soap Dispenser",
      sellerName: "John",
      email: "john@dummyid.com",
      price: "$1,234.00",
      ava: "1000",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/product/3917/SMALL/38517/0/1?t=1738153355",
      name: "Casagold Glass Soap Dispenser ",
      desc: "Casagold Glass Soap Dispenser",
      sellerName: "John",
      email: "john@dummyid.com",
      price: "$1,234.00",
      ava: "1000",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/product/3803/SMALL/36381/0/1?t=1716894219",
      name: "Casagold Glass Soap Dispenser ",
      desc: "Casagold Glass Soap Dispenser",
      sellerName: "John",
      email: "john@dummyid.com",
      price: "$1,234.00",
      ava: "1000",
      status: "",
      action: "",
    },
    {
      image: "https://demo.yo-kart.com/image/product/2925/SMALL/6539/0/1?t=1684480789",
      name: "Casagold Glass Soap Dispenser ",
      desc: "Casagold Glass Soap Dispenser",
      sellerName: "John",
      email: "john@dummyid.com",
      price: "$1,234.00",
      ava: "1000",
      status: "",
      action: "",
    },
  ];
  const [missingOpen, setMissingOpen] = useState(false);
  const [inventory, setInventory] = useState(false);
  const [filters, setFilters] = useState({
    search: ""
  })

  const togglePanel = () => {
    setMissingOpen(!missingOpen);
  };
  useEffect(() => {
    setApiRes(transactionData)
  }, [])

  const [formData, setFormData] = useState({
    user: 'John - Dream Shop',
    title: '',
    urlKeyword: 'https://demo.yo-kart.com/products/view/6539',
    costPrice: '1234.00',
    sellingPrice: '1234.00',
    availableQty: '1000',
    sku: 'fre3',
    minPurchaseQty: '1',
    productCondition: 'New',
    codAvailable: 'No',
    fulfillmentMethod: 'Ship Only',
    availableDate: '2023-06-13',
    returnPeriod: '0',
    cancelPeriod: '0',
    periodInDays: '',
  });



  const tableHeadings = [
    "Name",
    "Seller",
    "Selling Price",
    "Available Quantity",
    'Status',
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
      <div className="flex flex-col">
        <span className="text-sm font-medium">{ele?.sellerName}</span>
        <span className="text-sm text-gray-500">{ele?.email}</span>
      </div>,
      ele?.price,
      ele?.ava,
      <span>
        <ToggleButton isOn={isOn} toggle={() => setIsOn(!isOn)} />
      </span>,
      <span>
        <ActionButtons
          onDelete={() => setShowDeleteConfirmation(true)}
          showWarningButton={true}
          showLinkButton={false}
          onWarning={togglePanel}
          onEdit={() => setInventory(true)} />
      </span>
    ];
  });


  const person = {
    name: 'xyz', details: {
      age: "25"
    }
  }
  const copy = { ...person }
  copy.name = 30
  console.log(person.name)
  console.log(copy.name)
  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className=''>
          <SearchComponent filters={filters} isActionButton={true} isSearchDown={true} isSearchShow={true}
            isCategory={true} isActivationStatus={true} isProductType={true} isUser={true} isStatusAction={true} setFilters={setFilters}/>
            
          <TableData
            Heading="Seller's Product Inventories"
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
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        DeleteHeading={'Are you sure you want to delete?'}
      />
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      <ProductMissingInfo
        missingOpen={missingOpen}
        togglePanel={togglePanel}
      />
      <SellerInventorySetup
        setFormData={setFormData}
        formData={formData}
        InventorySetupOpen={inventory}
        togglePanel={() => setInventory(false)}
      />

    </>
  )
}

export default SellerProductInventories