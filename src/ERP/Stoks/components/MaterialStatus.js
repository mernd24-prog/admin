import React from "react";
import materialLogo from './../../../assets/materialStatusLogo.png'

const MaterialStatus = () => {
  return (
    <div className="p-6 mx-auto overflow-auto max-w-7xl">
      <div className="bg-white flex justify-center py-6 px-4">
        <div className="max-w-4xl w-full text-[9px] font-[Arial,sans-serif] text-black">
          <div className="text-center mb-[54px]">
            <p className="text-[32px] font-semibold">MATERIAL RECEIPT</p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className=" max-w-[280px]">
              <p className="text-[18px] font-semibold">Ecom 99 Pharmacy</p>
              <p className="text-[18px] font-normal">123 Imaginary Lane</p>
              <p  className="text-[18px] font-normal">123 Imaginary Lane</p>
              <p  className="text-[18px] font-normal">123 Imaginary Lane</p>
              <p  className="text-[18px] font-normal">Sam Global@gmail.com</p>
              <p  className="text-[18px] font-normal">+91-9834288908</p>
              <p  className="text-[18px] font-normal">0141-234891</p>
              <p  className="text-[18px] font-normal">www.Sam Global.com</p>
              <p className="text-[18px] font-semibold">
               License No. - 12376789976
              </p>
              <p  className="text-[18px] font-semibold">
                GST No.- 342895bhjbre980
              </p>
            </div>
            <div className="flex flex-col items-end">
              <img
                src={materialLogo}
                alt="Sam Global Pharmacy logo"
                width="375"
                height="120"
                className="object-contain"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-sm">
            <table className="w-full text-[7px] border-collapse border border-gray-200">
              <thead>
                <tr className="bg-white border-b border-gray-200">
                  {[
                    "#",
                    "PO No.",
                    "Item Code",
                    "Item Description",
                    "HSN",
                    "Challan Qty",
                    "Accept Qty",
                    "Reject Qty",
                    "Total Amt",
                  ].map((heading, i) => (
                    <th
                      key={i}
                      className="border border-gray-200 px-1 py-1 text-left text-[14px] font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((num) => (
                  <tr key={num} className="border-b border-gray-200">
                    <td className="border border-gray-200 px-1 py-1  text-[12px]  font-medium">
                      {num}
                    </td>
                    <td className="border border-gray-200 px-1 py-1  text-[12px]  font-medium">
                      1234547
                    </td>
                    <td className="border border-gray-200 px-1 py-1   text-[12px] font-medium">
                      6544324
                    </td>
                    <td className="border border-gray-200 px-1 py-1   text-[12px] font-medium">
                      Cardiac-500
                    </td>
                    <td className="border border-gray-200 px-1 py-1  text-[12px]  font-medium">
                      HSN Code
                    </td>
                    <td className="border border-gray-200 px-1 py-1   text-[12px] font-medium">
                      100
                    </td>
                    <td className="border border-gray-200 px-1 py-1   text-[12px] font-medium">
                      {num === 2 ? 93 : num === 3 ? 99 : 95}
                    </td>
                    <td className="border border-gray-200 px-1 py-1   text-[12px] font-medium">
                      {num === 2 ? 7 : num === 3 ? 1 : 5}
                    </td>
                    <td className="border border-gray-200 px-1 py-1   text-[12px] font-medium">
                      1010
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4 text-[18px] font-semibold">
            <div>Total Item: 3</div>
            <div >Total Qty: 24</div>
            <div>
              <p>Subtotal: 2799.27</p>
              <p>Total Tax Amt: 0</p>
            </div>
          </div>

          <div className="mt-3 text-[20px] font-semibold text-right">
            Grand Total: 2799.27
          </div>

          <div className="mt-8 text-[18px] font-semibold text-right">
            Authorized Signature
          </div>

          <div className="mt-1 flex justify-end">
            <img
              src={materialLogo}
              alt="Authorized Signature"
              width="375"
              height="120"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialStatus;
