import React, { useEffect, useState } from "react";
import EcomLogo from "../../../assets/materialStatusLogo.png";
import TableData from "../../../components/Atoms/TableData/TableData";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import {
  purchaseOrderDetails,
  saleOrderDetails,
} from "../../../Redux/erpSlice";
import { toast } from "sonner";
import moment from "moment";
import NewButton from "../../../components/Button/NewButton";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import Loader from "../../../components/Loader/Loader";

const PurchaseOrderPreview = () => {
  const [purchaseDetail, setPurchaseDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const { id } = useParams();
  const dispatch = useDispatch();
  const invoiceRef = useRef();

  // Print function
  const handlePrint = async () => {
    if (!invoiceRef.current) return;

    const input = invoiceRef.current;
    console.log(input);

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${purchaseDetail?.invoice_no || "export"}.pdf`);
    } catch (error) {
      toast.error("Error generating PDF");
      console.error("PDF export error:", error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return moment(dateStr).format("DD-MM-YYYY");
  };

  const formatExpDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
  };

  const numberToWords = (num) => {
    if (isNaN(num)) return "N/A";
    return `Rupees ${Number(num)?.toFixed(2)} only`;
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      dispatch(purchaseOrderDetails({ _id: id }))
        .unwrap()
        .then((res) => {
          setPurchaseDetail(res.data);
        })
        .catch(() => {
          toast.error("Failed to load purchase order details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, dispatch]);

  const tableHeadings = [
    "Sr. No.",
    "PRODUCT NAME",
    "HSN",
    // "BATCH",
    // "EXP.",
    "TYPE",
    "CALCULATION",
    "QTY",
    "MRP",
  ];

  const tableData = purchaseDetail?.purchaseOrderItems?.map((item, index) => [
    <span key={`sr-${index}`} className="font-semibold">{index + 1}</span>,

    <span key={`name-${index}`} className="block max-w-[120px] pb-2 truncate font-semibold text-blue-600">
      {item?.product_name || "N/A"}
    </span>,

    item?.HsnCode?.code ? (
      <div
        key={`hsn-${index}`}
        className="flex flex-col text-left leading-tight text-xs"
      >
        <span className="font-medium">{item.HsnCode.code}</span>
        <span className="text-[9px] text-gray-600">
          CGST: {item.HsnCode.CGST ?? 0}% | SGST: {item.HsnCode.SGST ?? 0}% |
          IGST: {item.HsnCode.IGST ?? 0}%
        </span>
      </div>
    ) : (
      "N/A"
    ),

    // item?.Batch || "N/A",
    // item?.expiryDate ? formatExpDate(item.expiryDate) : "N/A",
    item?.type ? (
      <span className=" text-blue-600 px-2 py-1 rounded text-xs font-semibold">
        {item?.type}
      </span>
    ) : "N/A",
    item?.calculation ? item?.calculation : "N/A",
    <span key={`qty-${index}`} className="font-semibold">{item?.quantity ?? "N/A"}</span>,
    <span key={`price-${index}`} className="font-semibold">
      {isNaN(item?.price) ? "N/A" : `₹${item?.price?.toFixed(2)}`}
    </span>,
  ]);

  if (loading) return <Loader loading={loading} />;

  return (
    <main className="w-full max-w-5xl mx-auto p-4 font-sans text-sm bg-gray-50 min-h-screen">
      {/* Print button */}
      <div className="mb-3 flex w-full justify-end">
        <NewButton
          onClick={handlePrint}
          className="bg-blue-600 max-w-[180px] hover:bg-blue-700 text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Invoice
        </NewButton>
      </div>

      {/* Invoice Container */}
      <div className="max-w-4xl mx-auto bg-white border border-blue-100 shadow-lg" ref={invoiceRef}>

        {/* Header */}
        <div className="bg-gray-100 text-gray-800 p-4 shadow-md">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={EcomLogo}
                  alt="Ecom Pharmacy Logo"
                  className="h-full w-full object-contain p-1"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/300x300?text=Ecom";
                    e.target.className = "h-full w-full object-cover";
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Sam Global</h1>
                <p className="text-sm text-gray-600 font-medium">PHARMACY - WE CARE YOUR LIFE</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-700">Invoice #{purchaseDetail?.invoice_no || "N/A"}</p>
              <p className="text-xs text-gray-500">
                {moment(purchaseDetail?.order_date || new Date()).format("DD MMM YYYY")}
              </p>
            </div>
          </div>
        </div>


        <div className="p-5">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50">
              <h3 className="text-blue-600 font-semibold text-sm mb-2 pb-1 border-b border-blue-200">
                📋 Order Details
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Invoice No:</span>
                  <span className="text-gray-800">{purchaseDetail?.invoice_no || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Order Date:</span>
                  <span className="text-gray-800">
                    {purchaseDetail?.order_date
                      ? moment(purchaseDetail.order_date).format("MMM DD, YYYY")
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Delivery:</span>
                  <span className="text-gray-800">
                    {purchaseDetail?.delivery_date
                      ? moment(purchaseDetail.delivery_date).format("MMM DD, YYYY")
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Address:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.shipping_address || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Store Details */}
            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50">
              <h3 className="text-blue-600 font-semibold text-sm mb-2 pb-1 border-b border-blue-200">
                🏪 Store Details
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Name:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.store_info?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Email:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.store_info?.email || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Phone:</span>
                  <span className="text-gray-800">{purchaseDetail?.store_info?.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Address:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.store_info?.address || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">GST:</span>
                  <span className="text-gray-800">{purchaseDetail?.supplier_gst || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50">
              <h3 className="text-blue-600 font-semibold text-sm mb-2 pb-1 border-b border-blue-200">
                🚚 Supplier Info
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Name:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.supplier_name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Email:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.supplier_email || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Phone:</span>
                  <span className="text-gray-800">{purchaseDetail?.supplier_phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Address:</span>
                  <span className="text-gray-800 text-right max-w-32">
                    {purchaseDetail?.supplier_address1 ||
                      purchaseDetail?.supplier_address2
                      ? `${purchaseDetail?.supplier_address1 || ""} ${purchaseDetail?.supplier_address2 || ""
                        }`.trim()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Notice */}
          <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
            <p className="text-red-700 text-xs">
              <strong>⚠️ Medical Notice:</strong> All medicines require proper prescription verification before dispensing.
            </p>
          </div>

          {/* Products Table */}
          <div className="mb-4">
            <TableData
              tableHeadings={tableHeadings}
              data={tableData}
              totalData={purchaseDetail?.purchaseOrderItems?.length || 0}
              className="text-xs border border-blue-100 rounded-lg overflow-hidden"
            />
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Terms & Conditions */}
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
              <h3 className="text-orange-600 font-semibold text-sm mb-2">📜 Terms & Conditions</h3>
              <ul className="list-none text-xs text-orange-800 space-y-1">
                <li className="relative pl-3">
                  <span className="absolute left-0 text-orange-500 font-bold">•</span>
                  Check batch number & expiry date before delivery
                </li>
                <li className="relative pl-3">
                  <span className="absolute left-0 text-orange-500 font-bold">•</span>
                  Consult doctor before using any medicine
                </li>
                <li className="relative pl-3">
                  <span className="absolute left-0 text-orange-500 font-bold">•</span>
                  Cold storage items non-returnable once sold
                </li>
                <li className="relative pl-3">
                  <span className="absolute left-0 text-orange-500 font-bold">•</span>
                  All prices inclusive of applicable taxes
                </li>
                <li className="relative pl-3">
                  <span className="absolute left-0 text-orange-500 font-bold">•</span>
                  Disputes subject to local jurisdiction only
                </li>
              </ul>
            </div>

            {/* Totals */}
            <div className="border border-green-200 bg-green-50 rounded-lg p-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-green-700"> Total Quantity:</span>
                  <span className="font-semibold text-green-800">
                    ₹{isNaN(purchaseDetail?.total_quantity) ? "N/A" : purchaseDetail?.total_quantity?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-green-700">Sub Total:</span>
                  <span className="font-semibold text-green-800">
                    ₹{isNaN(purchaseDetail?.sub_total) ? "N/A" : purchaseDetail?.sub_total?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-green-700">Total Tax:</span>
                  <span className="font-semibold text-green-800">
                    ₹{isNaN(purchaseDetail?.total_tax) ? "N/A" : purchaseDetail?.total_tax?.toFixed(2)}
                  </span>
                </div>
                <div className="border-t-2 border-green-400 pt-2 mt-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-green-800">Final Amount:</span>
                    <span className="text-green-800">
                      ₹{isNaN(purchaseDetail?.total_amount) ? "N/A" : purchaseDetail?.total_amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 text-black px-5 py-3 flex justify-between items-center text-xs">
          <div>
            <p className="font-semibold">Pharmacist Signatory</p>
            <p className="opacity-80">Total Records: {purchaseDetail?.purchaseOrderItems?.length || 0}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-300">
              {numberToWords(purchaseDetail?.total_amount)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PurchaseOrderPreview;