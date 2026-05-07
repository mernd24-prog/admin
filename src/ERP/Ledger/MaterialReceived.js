import React, { useState } from "react";
import Button from "../../components/Atoms/buttons/button";
import TableData from "../../components/Atoms/TableData/TableData";
import { BsArrowLeft } from "react-icons/bs";
import Input from "../../components/Atoms/Input/Input";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";

// Constants
const INITIAL_FILTERS = {
  search: "",
};

const MaterialReceived = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Updated table headings to match the image
  const tableHeadings = [
      "Item Code",
    "Barcode",
    "Item Name",
    "Qty Ordered",
    "Recorded Qty",
    "Return Qty",
    "Rate",
    "Amt"
  ];

  // Updated table data to match the image
  const tableData = [
    {
      barcode: "12|21",
      itemCode: "#122",
      itemName: "ABCD",
      qtyOrdered: "100",
      recordedQty: "100",
      returnQty: "0",
      rate: "10",
      amount: "1000"
    },
    {
      barcode: "12|22",
      itemCode: "#123",
      itemName: "XYZ",
      qtyOrdered: "50",
      recordedQty: "40",
      returnQty: "10",
      rate: "20",
      amount: "800"
    },
    {
      barcode: "12|23",
      itemCode: "#124",
      itemName: "XYZ",
      qtyOrdered: "10",
      recordedQty: "5",
      returnQty: "5",
      rate: "2",
      amount: "10"
    },
    {
      barcode: "12|21",
      itemCode: "-",
      itemName: "XYZ",
      qtyOrdered: "10",
      recordedQty: "5",
      returnQty: "5",
      rate: "2",
      amount: "10"
    },
    {
      barcode: "12|21",
      itemCode: "-",
      itemName: "XYZ",
      qtyOrdered: "10",
      recordedQty: "5",
      returnQty: "5",
      rate: "2",
      amount: "10"
    }
  ];

  // Format data for table rows
  const tableRows = tableData.map((row, index) => [
      <span key={`code-${index}`}>{row.itemCode}</span>,
    <span key={`barcode-${index}`}>{row.barcode}</span>,
    <span key={`name-${index}`}>{row.itemName}</span>,
    <span key={`qty-ordered-${index}`}>{row.qtyOrdered}</span>,
    <span key={`recorded-qty-${index}`}>{row.recordedQty}</span>,
    <span key={`return-qty-${index}`}>{row.returnQty}</span>,
    <span key={`rate-${index}`}>{row.rate}</span>,
    <span key={`amount-${index}`}>{row.amount}</span>,
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className=" overflow-hidden overflow-y-auto py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold pl-5 xl:pl-0">Material Received</h1>
          </div>
        </div>

        <article className="bg-white mt-5 rounded-lg shadow-md p-6 md:p-5 gap-y-8 gap-x-12">
          {/* Medicine Table */}
          <section className=" col-span-full">

            {/* input checkbox  */}
            <div className="flex gap-5 items-center ml-2">
                <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-[18px] h-[18px]"></input> <span className="text-[16px] font-medium">Purchase Order</span>
                </div> 
                <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-[18px] h-[18px]"></input> <span className="text-[16px] font-medium">Local</span>
                </div>
            </div>

            <section className="p-2 border-b flex  items-center flex-wrap md:flex-nowrap justify-between">
              {/* Search Component */}
              <div className="w-full">
                <FilterSelect placeholder="Select Purchase Order" />
              </div>

              {/* Date filter */}
              <div className="md:ml-3 ml-0 w-full">
                <Input type="date" />
              </div>
            </section>

            <TableData tableHeadings={tableHeadings} data={tableRows} />
          </section>

          {/* Input section */}
          <div className="mt-5 grid sm:grid-cols-2 grid-cols-1 gap-5">
            {/* Remark */}
            <div className="flex gap-2 items-center">
              Remark: <Input placeholder="Remark" />
            </div>

            {/* total  */}
            <div className="flex gap-2 items-center">
              Total: <Input placeholder="300" />
            </div>
          </div>

          {/* Submit button */}
          {/* <div className="flex justify-end ">
            <Button children="Submit" className="bg-blue-600 text-black" />
          </div> */}
        </article>
      </div>
    </div>
  );
};

export default MaterialReceived;