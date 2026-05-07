import React from "react";
import returnPageLogo from '../../../assets/materialStatusLogo.png';

const ReturnNotePreview = () => {
  return (
    <div className="bg-white flex justify-center p-4">
      <div className="border border-gray-400 w-full max-w-6xl p-4 sm:p-6 space-y-6">
        <h2 className="text-center font-semibold text-2xl sm:text-3xl">RETURN NOTE</h2>

        {/* Header - Info + Logo */}
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="text-black space-y-1 text-sm sm:text-base md:text-lg leading-tight w-full md:w-1/2">
            <p className="font-semibold">Ecom 99 Pharmacy</p>
            <p>123 Imaginary Lane</p>
            <p>123 Imaginary Lane</p>
            <p>123 Imaginary Lane</p>
            <p>Sam Global@gmail.com</p>
            <p>+91-9834289808</p>
            <p>0141-234891</p>
            <p>www.Sam Global.com</p>
            <p className="font-semibold">License No.: 123767898976</p>
            <p className="font-semibold">GST No.: 342895bjhbre960</p>
          </div>
          <div className="w-full md:w-1/2 flex justify-start md:justify-end">
            <img
              src={returnPageLogo}
              alt="Sam Global Pharmacy logo"
              className="object-contain h-auto max-h-24"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-[12px] border border-gray-300 border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-[13px] sm:text-[14px]">
                <th className="border border-gray-300 px-2 py-1 font-semibold">#</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">PO No.</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Item Code</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Item Description</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">HSN</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Challan Qty</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Accept Qty</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Reject Qty</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Total Amt</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 1, po: '1234547', code: '5444324', desc: 'Cardice 500', hsn: 'Hsy Code', challan: 100, accept: 95, reject: 5, amt: 2700 },
                { id: 2, po: '1234547', code: '5444324', desc: 'Cardice-500', hsn: 'HSS Code', challan: 100, accept: 95, reject: 5, amt: 1010 },
                { id: 3, po: '1234547', code: '5444324', desc: 'Cardice-900', hsn: 'HSS Code', challan: 100, accept: 95, reject: 5, amt: 1070 },
                { id: 4, po: '1234547', code: '5444324', desc: 'Cardice-900', hsn: 'HSS Code', challan: 100, accept: 95, reject: 5, amt: 1010 },
                { id: 5, po: '1234547', code: '5444324', desc: 'Cardice-900', hsn: 'HSS Code', challan: 100, accept: 95, reject: 5, amt: 3030 },
              ].map((item, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="border border-gray-300 px-2 py-1">{item.id}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.po}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.code}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.desc}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.hsn}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.challan}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.accept}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.reject}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm sm:text-base font-semibold">
          <div>Total Item: 3</div>
          <div>Total Qty: 24</div>
          <div>
            <div>Subtotal: 2799.27</div>
            <div>Total Tax Amt: 0</div>
          </div>
        </div>

        <div className="text-right text-lg sm:text-xl font-semibold">
          Grand Total: 2799.27
        </div>

        <div className="text-base sm:text-lg font-semibold">Authorized Signature</div>

        <div className="flex justify-end mt-4">
          <img
            src={returnPageLogo}
            alt="Sam Global Pharmacy logo"
            className="object-contain h-auto max-h-24"
          />
        </div>
      </div>
    </div>
  );
};

export default ReturnNotePreview;
