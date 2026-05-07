import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { uploadHistory } from '../../Redux/productSlice';
import TableData from '../../components/Atoms/TableData/TableData';
import moment from 'moment';
import Loader from '../../components/Loader/Loader';

import Pagination from '../../components/Pagination/Pagination';
import { DownloadExcelButton } from '../../_helpers/globalFunctions';
import { Link } from 'react-router-dom';
const PAGE_SIZE = 10
const BulkUploadProduct = () => {
    const dispatch = useDispatch();
    const [apiRes, setApiRes] = useState({ list: [], total: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [pageNo, setPageNo] = useState(1)


    useEffect(() => {
        const fetchUploadHistory = async () => {
            const query = {
                page: pageNo,
                size: PAGE_SIZE,
                populate: "seller_id:userName,email|store_id:name|uploadedBy:userName,email"
            };

            setIsLoading(true);

            try {
                const res = await dispatch(uploadHistory(query)).unwrap();
                setApiRes(res?.data || { list: [], total: 0 });
            } catch (err) {
                console.error('Error fetching upload history:', err);
                setApiRes({ list: [], total: 0 });
            } finally {
                setIsLoading(false);
            }
        };

        fetchUploadHistory();
    }, [dispatch, pageNo]);


    const statusStyles = {
        pending: 'bg-gray-300 text-gray-800',
        validating: 'bg-yellow-300 text-yellow-900',
        'validation-success': 'bg-green-200 text-green-800',
        'validation-failed': 'bg-red-200 text-red-800',
        processing: 'bg-blue-200 text-blue-800',
        'process-success': 'bg-green-300 text-green-900',
        'process-failed': 'bg-red-300 text-red-900',
        stored: 'bg-indigo-200 text-indigo-800',
        failed: 'bg-red-400 text-black',
        cancelled: 'bg-gray-400 text-black',
    };
    const onPageChange = (data) => {
        setPageNo(data)
    }

    const tableHeadings = ['Seller Name', 'Store Name', "Total Product Added", 'Action By', 'Status', 'Last Modified At', "Action"];

    const tableRows = useMemo(() => {
        if (!apiRes.list || apiRes.list.length === 0) {
            return [
                <tr key="no-data">
                    <td colSpan={tableHeadings.length} className="text-center py-4 text-gray-500">
                        No data available
                    </td>
                </tr>
            ];
        }

        return apiRes.list.map((item, index) => [
            <span key={`seller-${item._id}-${index}`} className="text-sm font-medium text-gray-800 font-mono">
                {item?.seller_id?.userName || '--'}
            </span>,
            <span key={`store-${item._id}-${index}`} className="text-sm font-medium text-gray-800 font-mono">
                {item?.store_id?.name || '--'}
            </span>,
            <span key={`store-${item._id}-${index}`} className="text-sm font-medium text-gray-800 font-mono">
                {item?.uploaded_products.length}
            </span>,

            <span key={`uploaded-${item._id}-${index}`} className="text-sm font-medium text-gray-800 font-mono">
                {item?.uploadedBy?.userName || '--'}
            </span>,
            <div key={`status-actions-${item._id}-${index}`} className="flex items-center gap-2">
                <span
                    className={`capitalize px-3 py-1 rounded-md text-sm font-medium ${statusStyles[item?.status] || 'bg-slate-300 text-slate-800'
                        }`}
                >
                    {item?.status === "stored" ? "Success" : item?.status?.replace(/-/g, ' ') || '--'}
                </span>

            </div>,
            <span key={`date-${item._id}-${index}`} className="text-sm text-gray-600">
                {item?.updatedAt ? moment(item.updatedAt).format('DD/MM/YYYY') : '--'}
            </span>,
            <span className="text-sm text-gray-600 flex justify-start items-center gap-4">
                <DownloadExcelButton
                    fileUrl={item.fileUrl}
                    fileName={`data-export-${item._id}.xlsx`}
                    isDataAvailable={item?.uploaded_products?.length > 0}
                    tooltip="Download complete data export"
                />

                <DownloadExcelButton
                    fileUrl={item.errorFileUrl}
                    fileName={`error-report-${item._id}.xlsx`}
                    isError={true}


                />
            </span>
        ]);
    }, [apiRes.list]);

    return (
        <div className="max-w-7xl mx-auto p-2 space-y-5">
            <Loader loading={isLoading} />

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                    Home /<Link to={`/app/product-catalog`}>Product catalog</Link> /Bulk history
                </h3>
            </div>

            <div className="bg-white">
                {!isLoading && (
                    <TableData
                        tableHeadings={tableHeadings}
                        data={tableRows}
                        showHeadingDiv={false}
                        rowDataKey="_id"
                        sortableColumns={[0, 1, 2]}
                        totalData={apiRes?.total || 0}
                    />
                )}

            </div>
            <div className='mt-3'>
                {apiRes?.total > PAGE_SIZE && (
                    <Pagination
                        totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
                        currentPage={pageNo}
                        onPageChange={onPageChange} />
                )}
            </div>
        </div>
    );
};

export default BulkUploadProduct;