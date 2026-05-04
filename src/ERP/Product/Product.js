import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import { useNavigate } from "react-router";

const dummyProducts = [
  {
    id: 1,
    medicine: "Medicine #1",
    supplier: "Loren Campbell",
    category: "Cardiac",
    qtyType: "Strip",
    expiryDate: "11-05-2027",
    batchNo: "6h-57823r9x98",
    hsn: "Generic H",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 2,
    medicine: "Medicine #1",
    supplier: "Adam Smith",
    category: "Cardiac",
    qtyType: "Strip",
    expiryDate: "11-05-2027",
    batchNo: "6h-57823r9x98",
    hsn: "Generic H",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 3,
    medicine: "Medicine #1",
    supplier: "Steve Smith",
    category: "Cardiac",
    qtyType: "Strip",
    expiryDate: "11-05-2027",
    batchNo: "6h-57823r9x98",
    hsn: "Generic H",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 4,
    medicine: "Medicine #1",
    supplier: "Arnold Schneider",
    category: "Cardiac",
    qtyType: "Strip",
    expiryDate: "07-06-2025", // Expired example
    batchNo: "6h-57823r9x98",
    hsn: "Generic H",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 5,
    medicine: "Medicine #1",
    supplier: "Petra Bacheta",
    category: "Cardiac",
    qtyType: "Strip",
    expiryDate: "11-05-2027",
    batchNo: "6h-57823r9x98",
    hsn: "Generic H",
    image: "https://via.placeholder.com/40",
  },
];

const Product = () => {
  const navigate = useNavigate();

  const TABLE_HEADINGS = [
    "#",
    "Medicine",
    "Supplier",
    "Category",
    "Qty Type",
    "Expiry Date",
    "Actions",
  ];

  const tableRows = useMemo(() => {
    return dummyProducts.map((item, index) => {
      const isExpired =
        new Date(item.expiryDate.split("-").reverse().join("-")) < new Date();

      return {
        rowClassName: isExpired ? "bg-red-100" : "",
        columns: [
          <span key={`index-${item.id}`}>{index + 1}</span>,
          <div key={`medicine-${item.id}`} className="flex items-center gap-2">
            <img
              src={item.image}
              alt="medicine"
              className="w-10 h-10 rounded"
            />
            <div>
              <div className="font-medium text-sm">{item.medicine}</div>
              <div className="text-xs text-gray-500">
                Batch No: {item.batchNo}
              </div>
              <div className="text-xs text-gray-500">HSN Code: {item.hsn}</div>
            </div>
          </div>,
          <span key={`supplier-${item.id}`}>{item.supplier}</span>,
          <span key={`category-${item.id}`}>{item.category}</span>,
          <span key={`qty-${item.id}`}>{item.qtyType}</span>,
          <span key={`expiry-${item.id}`}>{item.expiryDate}</span>,
          <ActionButtons
            key={`actions-${item.id}`}
            showViewButton
            showEditButton
            showDeleteButton
            onEdit={() => console.log("Edit", item.id)}
            onView={() => console.log("View", item.id)}
            onDelete={() => console.log("Delete", item.id)}
          />,
        ],
      };
    });
  }, []);

  const handleAddNavigate = () => {
    navigate("/app/product/form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto overflow-auto max-w-7xl">
      {/* Header */}
      <div className="flex  flex-row justify-between items-start  sm:items-center mb-4 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Product</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span className="">Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Product</span>
          </h3>
        </div>
        <div className="">
          <AddButton onClick={handleAddNavigate}>Add New Product</AddButton>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        <TableData
          tableHeadings={TABLE_HEADINGS}
          data={tableRows.map((r) => r.columns)}
          rowClassNameCallback={(rowIndex) => tableRows[rowIndex].rowClassName}
          showHeadingDiv={false}
          rowDataKey="id"
          sortableColumns={[1, 2]}
          isHeaderCheckbox={false}
        />
      </div>
    </div>
  );
};

export default Product;
