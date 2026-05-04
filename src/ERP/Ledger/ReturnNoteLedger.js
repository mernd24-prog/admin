import React from "react";
import Button from "../../components/Atoms/buttons/button";
import TableData from "../../components/Atoms/TableData/TableData";
import { BsArrowLeft } from "react-icons/bs";
import Input from "../../components/Atoms/Input/Input";

const ReturnNoteLedger = () => {
  // table heading
  // Table headings matching your screenshot
  const tableHeadings = [
    "Date",
    "Item Code",
    "Item Name",
    "Description",
    "Amount",
  ];

  const tableData = [
    {
      date: "18-06-2025",
      itemGrade: "#1887997",
      itemName: "ABCD",
      description: "XYZ",
      amount: "¥100",
    },
    {
      date: "15-06-2025",
      itemGrade: "#1887798",
      itemName: "ABCD",
      description: "XYZ",
      amount: "¥300",
    },
    {
      date: "18-06-2025",
      itemGrade: "-",
      itemName: "ABCD",
      description: "XYZ",
      amount: "-",
    },
    {
      date: "18-06-2025",
      itemGrade: "-",
      itemName: "ABCD",
      description: "XYZ",
      amount: "-",
    },
    {
      date: "18-06-2025",
      itemGrade: "-",
      itemName: "ABCD",
      description: "XYZ",
      amount: "-",
    },
  ];

  // Format data for table rows
  const tableRows = tableData.map((row, index) => [
    <span key={`date-${index}`}>{row.date}</span>,
    <span key={`grade-${index}`}>{row.itemGrade}</span>,
    <span key={`name-${index}`}>{row.itemName}</span>,
    <span key={`desc-${index}`}>{row.description}</span>,
    <span key={`amount-${index}`}>{row.amount}</span>,
  ]);

  return (
    <div className="max-w-7xl overflow-auto mx-auto">
      <div className=" py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold pl-5 ">Return Note</h1>
          </div>
        </div>
        <article className="bg-white mt-5 rounded-lg shadow-md p-4 sm:p-6 md:p-10 space-y-6">
          {/* Supplier Summary & Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Supplier Summary */}
            <section className="space-y-4 w-full">
              <dl className="grid grid-cols-1 gap-4 text-sm w-full max-w-md">
                <div className="flex justify-between">
                  <dt className="font-medium text-[16px]">Supplier ID:</dt>
                  <dd className="text-gray-700">12768734</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-[16px]">Supplier Name:</dt>
                  <dd className="text-gray-700">ABCDE</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-[16px]">GST:</dt>
                  <dd className="text-gray-700">232783697</dd>
                </div>

                <div>
                  <p className="text-[18px] font-medium mb-3">MEMO</p>
                  <div className="flex justify-between">
                    <dt className="font-normal text-[#616161] text-[16px]">
                      Agent PO / GRN / Local Invoice:
                    </dt>
                    <dd className="text-[#000000] font-medium text-[16px]">
                      1278
                    </dd>
                  </div>
                </div>
              </dl>
            </section>

            {/* Address Section */}
            <section className="space-y-4 w-full">
              <dl className="grid grid-cols-1 gap-3 text-sm w-full max-w-xl">
                <div className="flex justify-between gap-x-4">
                  <dt className="font-medium text-[16px] w-32 text-left">
                    Address:
                  </dt>
                  <dd className="text-gray-700 text-right flex-1">
                    ABC, 123, Jaipur, Rajasthan
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Medicine Table */}
          <section className="mt-4 w-full overflow-x-auto">
            <TableData tableHeadings={tableHeadings} data={tableRows} />
          </section>

          {/* Input Section */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Remark */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
              <label className="font-medium min-w-[70px]">Remark:</label>
              <Input placeholder="Remark" className="w-full" />
            </div>

            {/* Total */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
              <label className="font-medium min-w-[70px]">Total:</label>
              <Input placeholder="300" className="w-full" />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button className="bg-blue-600 text-black">Submit</Button>
          </div>
        </article> 
      </div>
    </div>
  );
};

export default ReturnNoteLedger;
