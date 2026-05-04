import React, { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router'
import moment from 'moment'
import TableData from '../../components/Atoms/TableData/TableData'
import { getHeadList, purchaseOrderDetails } from '../../Redux/erpSlice'
import { toast } from 'sonner'

const StocksReceived = () => {
  const [purchaseDetail, setPurchaseDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  console.log('purchaseDetailpurchaseDetail', purchaseDetail)
  const { id } = useParams()
  const dispatch = useDispatch()
  const invoiceRef = useRef()
  const formatExpDate = dateStr => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'N/A'
    return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`
  }
  const numberToWords = num => {
    if (isNaN(num)) return 'N/A'
    return `Rupees ${Number(num)?.toFixed(2)} only`
  }

  useEffect(() => {
    if (id) {
      setLoading(true)
      dispatch(purchaseOrderDetails({ _id: id }))
        .then(res => {
          console.log('22222222222', res)
          setPurchaseDetail(res.data)
        })
        .catch(() => {
          toast.error('Failed to load purchase order details')
        })
        .finally(() => setLoading(false))
    }
  }, [id, dispatch])



  const tableHeadings = [
    'Sr. No.',
    'PRODUCT NAME',
    'HSN',
    'BATCH',
    'EXP.',
    'TYPE',
    'CALCULATION',
    'QTY',
    'MRP'
  ]
  const tableData = purchaseDetail?.purchaseOrderItems?.map((item, index) => [
    <span key={`sr-${index}`}>{index + 1}</span>,

    <span key={`name-${index}`} className='block max-w-[120px] pb-2 truncate'>
      {item?.product_name || 'N/A'}
    </span>,

    item?.HsnCode?.code ? (
      <div
        key={`hsn-${index}`}
        className='flex flex-col text-left leading-tight text-xs'
      >
        <span className='font-medium'>{item.HsnCode.code}</span>
        <span className='text-[10px] text-gray-600'>
          CGST: {item.HsnCode.CGST ?? 0}% | SGST: {item.HsnCode.SGST ?? 0}% |
          IGST: {item.HsnCode.IGST ?? 0}%
        </span>
      </div>
    ) : (
      'N/A'
    ),

    item?.Batch || 'N/A',
    item?.expiryDate ? formatExpDate(item.expiryDate) : 'N/A',
    item?.type ? item?.type : 'N/A',
    item?.calculation ? item?.calculation : 'N/A',
    item?.quantity ?? 'N/A',
    isNaN(item?.price) ? 'N/A' : item?.price?.toFixed(2)
  ])

  return (
    <div>
      <div className='bg-white p-6' ref={invoiceRef}>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:justify-between items-center w-full  text-center'>
          <div className='w-[140px] mb-2 md:w-[240px] md:mb-0 flex justify-center md:justify-start'>
            <img
              src='/static/media/materialStatusLogo.2916b77d02cd81cb2007.png'
              alt='Authorized signature placeholder'
              onError={e =>
                (e.target.src = 'https://placehold.co/220x90?text=Logo')
              }
              className='h-auto max-h-[90px] border border-gray-200 rounded shadow'
            />
          </div>
        </div>

        {/* Invoice Title */}
        <div className='text-center font-bold text-lg mb-4 border-b-2 border-black pb-2'>
          Purchase Order
        </div>
        <div className='flex flex-col sm:flex-row justify-between mb-4'>
          <div className='mb-2 sm:mb-0'>
            <p className=''>
              <span className='font-bold'>Po Bill Invoice No :</span>{' '}
              {purchaseDetail?.invoice_no || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Order Date :</span>{' '}
              {purchaseDetail?.order_date
                ? moment(purchaseDetail.order_date).format('MMM DD, YYYY')
                : 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Delivery Date :</span>{' '}
              {purchaseDetail?.delivery_date
                ? moment(purchaseDetail.delivery_date).format('MMM DD, YYYY')
                : 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Shipping Address :</span>{' '}
              {purchaseDetail?.shipping_address || 'N/A'}
            </p>
            <div className='text-left '>
              <br />
              <p>
                <span className='font-bold'>Store Details :</span>{' '}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Name :</span>{' '}
                {purchaseDetail?.store_info?.name || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Email :</span>{' '}
                {purchaseDetail?.store_info?.email || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Phone :</span>{' '}
                {purchaseDetail?.store_info?.phone || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Address :</span>{' '}
                {purchaseDetail?.store_info?.address || 'N/A'}
              </p>

              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>GST :</span>{' '}
                {purchaseDetail?.supplier_gst || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>D.L.No. :</span>{' '}
                {purchaseDetail?.drug_license_no || 'N/A'}
              </p>
            </div>
            {/* <p><span className="font-bold">Address :</span> {purchaseDetail?.address || "N/A"}</p> */}
          </div>
          <div className='text-left '>
            <p>
              <span className='font-bold'>Supplier Details :</span>{' '}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Name :</span>{' '}
              {purchaseDetail?.supplier_name || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Email :</span>{' '}
              {purchaseDetail?.supplier_email || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Phone :</span>{' '}
              {purchaseDetail?.supplier_phone || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Address :</span>{' '}
              {purchaseDetail?.supplier_address1 ||
              purchaseDetail?.supplier_address2
                ? `${purchaseDetail?.supplier_address1 || ''} ${
                    purchaseDetail?.supplier_address2 || ''
                  }`.trim()
                : 'N/A'}
            </p>

            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>GST :</span>{' '}
              {purchaseDetail?.supplier_gst || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>D.L.No. :</span>{' '}
              {purchaseDetail?.drug_license_no || 'N/A'}
            </p>
          </div>
        </div>
        <hr />
        {/* Customer Info */}

        {/* Doctor Info */}
        {/* <div className="mb-4">
        <p className="font-bold">Dr Name: {purchaseDetail?.doctor_name || "N/A"}</p>
      </div> */}

        {/* Products Table */}
        <section className='w-full mb-4'>
          <TableData
            tableHeadings={tableHeadings}
            data={tableData}
            totalData={purchaseDetail?.purchaseOrderItems?.length || 0}
            className='text-sm'
          />
        </section>

        {/* GST Calculation */}
        {/* <div className="text-right mb-4">
        <p className="font-bold">
          GST {isNaN(purchaseDetail?.total_before_tax) ? "N/A" : purchaseDetail.total_before_tax.toFixed(2)}*6+6%=
          {isNaN(purchaseDetail?.cgst_amount) ? "N/A" : purchaseDetail.cgst_amount.toFixed(2)} SGST+
          {isNaN(purchaseDetail?.sgst_amount) ? "N/A" : purchaseDetail.sgst_amount.toFixed(2)} CGST
        </p>
      </div> */}

        {/* Terms and Conditions */}
        {/* Tax Summary */}
        <div className='flex flex-col sm:flex-row justify-between border-t border-black pt-2 mb-10'>
          <div className=''>
            <p className='font-bold'>Terms & Conditions</p>
            <ul className='list-disc pl-5'>
              <li>
                Please Check Batch No. & Exp. Date Before taking Delivery.
              </li>
              <li>Please Consult Your Doctor Before Using Medicine.</li>
              <li>Cold storage medicine will not be returned once sold.</li>
              <li>All Prices are inclusive of taxes.</li>
              <li>All disputes subject to Jurisdiction only.</li>
            </ul>
          </div>
          <div className='flex justify-end mb-4 mt-5'>
            <table className='w-64'>
              <tbody>
                <tr>
                  <td className='font-bold pb-1'>Total Tax </td>
                  <td className='text-right'>
                    {isNaN(purchaseDetail?.total_tax)
                      ? 'N/A'
                      : purchaseDetail?.total_tax?.toFixed(2)}
                  </td>
                </tr>

                <tr className='border-t'>
                  <td className='font-bold'>Sub Total</td>
                  <td className='text-right'>
                    {isNaN(purchaseDetail?.sub_total)
                      ? 'N/A'
                      : purchaseDetail?.sub_total?.toFixed(2)}
                  </td>
                </tr>
                {/* <tr>
                  <td className="font-bold pb-2">Tota</td>
                  <td className="text-right">
                    {isNaN(purchaseDetail?.total_discount_amount)
                      ? "N/A"
                      : purchaseDetail.total_discount_amount.toFixed(2)}
                  </td>
                </tr> */}
                <tr className='border-t border-black font-bold'>
                  <td>Total</td>
                  <td className='text-right'>
                    {isNaN(purchaseDetail?.total_amount)
                      ? 'N/A'
                      : purchaseDetail?.total_amount?.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className='flex sm:flex-row justify-between items-center'>
          <div className='w-full sm:w-1/2 mb-4 sm:mb-0'>
            <p className='font-bold'>Pharmacist Signatory</p>
          </div>
          <div className='w-full sm:w-1/2 text-left sm:text-right'>
            <p className='font-bold'>
              {numberToWords(purchaseDetail?.total_amount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StocksReceived
