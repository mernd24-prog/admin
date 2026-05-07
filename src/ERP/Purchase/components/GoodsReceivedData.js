import moment from 'moment'
import React from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'

const GoodsReceivedData = ({formData,tableHeadings,tableData,handleSubmit,isEditMode,loading}) => {
  return (
    <div>
      <div className='bg-white p-6'>
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

        <div className='text-center font-bold text-lg mb-4 border-b-2 border-black pb-2'>
          Goods Received
        </div>
        <div className='flex flex-col sm:flex-row justify-between mb-4'>
          <div className='mb-2 sm:mb-0'>
            <p className=''>
              <span className='font-bold'>Po Bill Invoice No :</span>{' '}
              {formData?.invoice_no || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Order Date :</span>{' '}
              {formData?.order_date
                ? moment(formData.order_date).format('MMM DD, YYYY')
                : 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Delivery Date :</span>{' '}
              {formData?.delivery_date
                ? moment(formData.delivery_date).format('MMM DD, YYYY')
                : 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Shipping Address :</span>{' '}
              {formData?.shipping_address || 'N/A'}
            </p>
            <div className='text-left '>
              <br />
              <p>
                <span className='font-bold'>Store Details :</span>{' '}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Name :</span>{' '}
                {formData?.store_info?.name || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Email :</span>{' '}
                {formData?.store_info?.email || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Phone :</span>{' '}
                {formData?.store_info?.phone || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>Address :</span>{' '}
                {formData?.store_info?.address || 'N/A'}
              </p>

              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>GST :</span>{' '}
                {formData?.supplier_gst || 'N/A'}
              </p>
              <p className='flex justify-between md:justify-normal'>
                <span className='font-bold'>D.L.No. :</span>{' '}
                {formData?.drug_license_no || 'N/A'}
              </p>
            </div>
          </div>
          <div className='text-left '>
            <p>
              <span className='font-bold'>Supplier Details :</span>{' '}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Name :</span>{' '}
              {formData?.supplier_name || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Email :</span>{' '}
              {formData?.supplier_email || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Phone :</span>{' '}
              {formData?.supplier_phone || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>Address :</span>{' '}
              {formData?.supplier_address1 || formData?.supplier_address2
                ? `${formData?.supplier_address1 || ''} ${
                    formData?.supplier_address2 || ''
                  }`.trim()
                : 'N/A'}
            </p>

            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>GST :</span>{' '}
              {formData?.supplier_gst || 'N/A'}
            </p>
            <p className='flex justify-between md:justify-normal'>
              <span className='font-bold'>D.L.No. :</span>{' '}
              {formData?.drug_license_no || 'N/A'}
            </p>
          </div>
        </div>
        <hr />
        <section className='w-full mb-4'>
          <TableData
            tableHeadings={tableHeadings}
            data={tableData}
            totalData={formData?.purchaseOrderItems?.length || 0}
            className='text-sm'
          />
        </section>
        <div className='flex flex-col sm:flex-row justify-between border-t border-black pt-2 mb-10'></div>
        <div className="flex sm:flex-row justify-between items-center">
        <div className="w-full sm:w-1/2 mb-4 sm:mb-0">
          <p className="font-bold">authorised signatory</p>
        </div>
        <div className="w-full sm:w-1/2 flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-black text-black px-4 py-2 rounded font-bold hover:bg-gray-800"
            disabled={loading}
          >
            {loading ? (isEditMode ? 'Updating...' : 'Submitting...') : 
             (isEditMode ? 'Update' : 'Submit')}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default GoodsReceivedData