import React from "react";
import EcomLogo from "../../../assets/materialStatusLogo.png";
import TableData from "../../../components/Atoms/TableData/TableData";
import Input from "../../../components/Atoms/Input/Input";

const SaleInvoice = ({ purchaseOrder, requiredGoodsLocation = "", isReadOnly = true,supplierData }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date) ? "N/A" : date.toLocaleDateString("en-GB");
  };

  const subTotal = purchaseOrder?.sub_total * purchaseOrder?.quantity;

  const tableHeadings = [
    "#No.",
    "HSN Code",
    "Item Name",
    "QTY",
    "Head", 
    // "Purchase Price",
    "Rate",
    "Tax",
    "Total Amt",
  ];

  const tableData =
    purchaseOrder?.purchaseOrderItems?.map((item, index) => [
      index + 1,
      item?.HsnCode || "N/A",
      item?.product_name || "N/A",
      item?.quantity || "N/A",
      item?.qtyHead ?? "N/A",
      // item?.purchase_price || "N/A",
      item?.basePrice ?? "N/A",
      item?.tax.toFixed(2) ?? "N/A",
      item?.total.toFixed(2) ?? "N/A",
    ]) || [];

  return (
    <main className="w-full mx-auto px-4 py-2 flex flex-col items-center bg-white">
      <div className="flex items-center w-full mb-6 relative gap-6">
        <div className="flex-shrink-0">
          <img
            src={EcomLogo}
            alt="Authorized signature placeholder"
            onError={(e) =>
              (e.target.src = "https://placehold.co/220x90?text=Logo")
            }
            className="w-20 sm:w-36 border border-gray-200 rounded shadow"
          />
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 w-full text-center">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-wide">
            Sale Order
          </h1>
        </div>
      </div>

      {/* Header Top */}
      <section className="w-full flex flex-col sm:flex-row justify-between border-b border-gray-300 pb-6 gap-6">
        {/* PO Details */}
        <div className="flex flex-col gap-3 w-full sm:w-1/2 order-2 sm:order-1">
          <h3 className="">Customer Details</h3>
          <p className="text-base">
            <span className="font-semibold">PO No:</span>{" "}
            {purchaseOrder?.order_id || "N/A"}
          </p>
          {/* <p className="text-base">
            <span className="font-semibold">Date:</span>{" "}
            <span className="font-medium">
              {formatDate(purchaseOrder?.order_date)}
            </span>
          </p> */}
          <p className="text-base">
            <span className="font-semibold">Delivery Date:</span>{" "}
            <span className="font-medium">
              {formatDate(purchaseOrder?.delivery_date)}
            </span>
          </p>
          <Input
            labelName="Required Goods Location"
            value={requiredGoodsLocation}
            placeholder="Enter delivery location"
            className="w-full"
            disabled={isReadOnly}
          />
        </div>

        {/* Supplier Details */}
        {/* <address className="flex flex-col gap-2 text-base not-italic w-full sm:w-1/2 order-1 sm:order-2 sm:items-end text-left sm:text-right">
          <h3>Supplier Details</h3>
          <p><span className="font-semibold">Name:</span> {supplierData?.name || "N/A"}</p>
          <p><span className="font-semibold">Email:</span> {supplierData?.email || "N/A"}</p>
          <p className="font-semibold">
            GST No.: {supplierData?.gst_number || "N/A"}
          </p> */}
          {/* <p><span className="font-semibold">Phone:</span> {supplierData?.supplier_phone || "N/A"}</p> */}
          {/* <p><span className="font-semibold">Address 1:</span> {supplierData?.address_line1 || "N/A"}</p>
          
        </address> */}
      </section>

      {/* Table */}
      <section className="w-full mt-6">
        <TableData
          tableHeadings={tableHeadings}
          data={tableData}
          totalData={purchaseOrder?.purchaseOrderItems?.length}
        />
      </section>

      {/* Summary */}
      <section className="w-full flex flex-wrap justify-between border-b border-gray-300 py-6 gap-4 text-base">
        <div className="font-semibold flex flex-col">
          <p>Total Item : {purchaseOrder?.purchaseOrderItems?.length ?? "N/A"}</p>
          {/* <p>Total Qty: {purchaseOrder?.total_quantity ?? "N/A"}</p> */}
        </div>
        <div className="flex flex-col gap-1 text-right font-semibold">
          <p>Subtotal : ₹{purchaseOrder?.sub_total.toFixed(2) ?? "N/A"}</p>
          <p>Total Tax : ₹{purchaseOrder?.total_tax.toFixed(2) ?? "N/A"}</p>
        </div>
      </section>

      {/* Total */}
      <section className="w-full flex flex-wrap justify-between items-center py-6 gap-6">
        <div className="text-lg font-bold">
          Grand Total : ₹{purchaseOrder?.total_amount.toFixed(2) ?? "N/A"}
        </div>
        <div className="w-full sm:w-auto max-w-[240px] text-center">
          <p className="font-semibold mb-2">Authorized Signature</p>
        </div>
      </section>
    </main>
  );
};

export default SaleInvoice;
