/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';

const PPCPromotionsManagement = () => {
  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const promotionData = [
    {
      promotionName: "Best PRICE",
      seller: "Michael Williams",
      advertiser: "kanwar",
      type: "Product",
      cpc: "$1.00",
      budget: "$10.00",
      impressions: 17,
      clicks: 0,
      approved: "Yes"
    },
    {
      promotionName: "Flash Deals",
      seller: "Sara Thompson",
      advertiser: "adgroup1",
      type: "Banner",
      cpc: "$1.50",
      budget: "$15.00",
      impressions: 45,
      clicks: 3,
      approved: "No"
    },
    {
      promotionName: "Hot Offers",
      seller: "John Smith",
      advertiser: "marketeerX",
      type: "Sponsored",
      cpc: "$2.00",
      budget: "$20.00",
      impressions: 63,
      clicks: 5,
      approved: "Yes"
    },
    {
      promotionName: "Weekly Promo",
      seller: "Emily Johnson",
      advertiser: "brandboost",
      type: "Product",
      cpc: "$0.80",
      budget: "$8.00",
      impressions: 28,
      clicks: 2,
      approved: "Pending"
    }
  ];

  useEffect(() => {
    setApiRes(promotionData);
  }, []);

  const tableHeadings = [
    "Promotion Name",
    "Promotion Advertiser",
    "Type",
    "CPC",
    "Budget",
    "Impressions",
    "Clicks",
    "Approved",
    "Actions"
  ];

  const tableRows = apiRes?.map((ele, index) => {
    return [
      ele?.promotionName,
      <div className="flex flex-col">
        <span className="text-sm font-bold capitalize">{ele?.advertiser}</span>
        <span className="text-sm text-gray-500">Seller: {ele?.seller}</span>
      </div>,
      ele?.type,
      ele?.cpc,
      ele?.budget,
      ele?.impressions,
      ele?.clicks,
      ele?.approved,
      <span>
        <ActionButtons onDelete={() => setShowDeleteConfirmation(true)} showLinkButton={false} />
      </span>
    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="PPC Promotions Management"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by promotion name, advertiser...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
          />
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        // confirmDelete={confirmDelete}
        DeleteHeading={'Are you sure you want to delete this promotion?'}
      />
    </>
  );
};

export default PPCPromotionsManagement;
