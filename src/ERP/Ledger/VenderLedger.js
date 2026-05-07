import React from "react";
import Button from "../../components/Atoms/buttons/button";
import TableData from "../../components/Atoms/TableData/TableData";
import { BsArrowLeft } from "react-icons/bs";
import Input from "../../components/Atoms/Input/Input";

const VenderLedger = () => {
  // table heading
  const tableHeadings = [
    "Date",
    "Invoice No.",
    "MTRL",
    "Particular",
    "Amt CR",
    "Amt DR",
    "Balance",
  ];

  const tableData = [
    {
      date: "8-06-2025",
      invoiceNo: "465",
      MTRL: "Manned Received GSN: 0 - 10%",
      perticular: 50000,
      amtCS: 5000,
      amtDB: null,
      balance: null,
    },
    {
      date: "8-06-2025",
      invoiceNo: "ttls Local Furniture LCS",
      MTRL: null,
      perticular: 50000,
      amtCS: 5000,
      amtDB: null,
      balance: null,
    },
    {
      date: "8-06-2025",
      invoiceNo: "135",
      MTRL: null,
      perticular: 50000,
      amtCS: 5000,
      amtDB: null,
      balance: null,
    },
    {
      date: "8-06-2025",
      invoiceNo: "132",
      MTRL: null,
      perticular: 5000,
      amtCS: null,
      amtDB: 45000,
      balance: null,
    },
    {
      date: "8-06-2025",
      invoiceNo: "132",
      MTRL: null,
      perticular: 45000,
      amtCS: null,
      amtDB: null,
      balance: null,
    },
    {
      note: "Fill (1110) x 450 true",
    },
  ];

  const tableRows = tableData.map((row) => [
    <span>{row?.date || "-"}</span>,
    <span>{row?.invoiceNo || "-"}</span>,
    <span>{row?.MTRL || "-"}</span>,
    <span>{row?.perticular || "-"}</span>,
    <span>{row?.amtCS || "-"}</span>,
    <span>{row?.amtDB || "-"}</span>,
    <span>{row?.total || "-"}</span>,
    <span>{row?.balance || "-"}</span>,
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className=" overflow-hidden overflow-y-auto py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold pl-5 md:pl-0">Vendor Ledger</h1>
          </div>
        </div>
        <article className="bg-white mt-5 rounded-lg shadow-md p-4 sm:p-6 md:p-10">
          {/* Supplier Summary and Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Supplier Summary */}
            <section className="space-y-4">
              <dl className="grid grid-cols-1 gap-4 text-sm w-full ">
                <div className="flex justify-between">
                  <dt className="font-semibold">Status:</dt>
                  <dd className="text-gray-700">Active</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">Supplier ID:</dt>
                  <dd className="text-gray-700">12768734</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">Supplier Name:</dt>
                  <dd className="text-gray-700">ABCDE</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">GST:</dt>
                  <dd className="text-gray-700">232783697</dd>
                </div>
              </dl>
            </section>

            {/* Payment / Address Details */}
            <section className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 text-sm w-full ">
                <div className="flex justify-between gap-x-4">
                  <dt className="font-semibold w-32 text-left">Address:</dt>
                  <dd className="text-gray-700 text-right flex-1">
                    ABC, 123, Jaipur, Rajasthan
                  </dd>
                </div>
                <div className="flex justify-between gap-x-4">
                  <dt className="font-semibold w-32 text-left">City:</dt>
                  <dd className="text-gray-700 text-right flex-1">Jaipur</dd>
                </div>
                <div className="flex justify-between gap-x-4">
                  <dt className="font-semibold w-32 text-left">State:</dt>
                  <dd className="text-gray-700 text-right flex-1">Rajasthan</dd>
                </div>
                <div className="flex justify-between gap-x-4">
                  <dt className="font-semibold w-32 text-left">Tin No.:</dt>
                  <dd className="text-gray-900 font-semibold text-right flex-1">
                    4237846278
                  </dd>
                </div>
                <div className="flex justify-between gap-x-4">
                  <dt className="font-semibold w-32 text-left">Lic:</dt>
                  <dd className="text-gray-700 text-right flex-1">
                    4321478789
                  </dd>
                </div>
                <div className="flex justify-between gap-x-4">
                  <dt className="font-semibold w-32 text-left">
                    Date of Creation:
                  </dt>
                  <dd className="text-gray-700 text-right flex-1">
                    12-05-2025
                  </dd>
                </div>
                <div className="flex justify-between items-center gap-x-4">
                  <dt className="font-semibold w-32 text-left">OB:</dt>
                  <div className="flex-1">
                    <Input placeholder="1200 CR" className="w-full" />
                  </div>
                </div>
              </dl>
            </section>
          </div>

          {/* Medicine Table */}
          <section className="mt-8 w-full overflow-x-auto">
            <TableData tableHeadings={tableHeadings} data={tableRows} />
          </section>
        </article>
      </div>
    </div>
  );
};

export default VenderLedger;
