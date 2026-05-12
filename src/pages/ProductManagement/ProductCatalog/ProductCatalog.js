/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// Components
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import ImageGallery from '../../../components/Atoms/ImageGallery/ImageGallery';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import AddButton from '../../../components/Button/AddButton';

// Redux
import { approveDisapprove, deleteProducts, downloadSampleCsv, enableDisableProductCatalogs, getProducts } from '../../../Redux/productSlice';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import Loader from '../../../components/Loader/Loader';
import { toast } from 'sonner';
import Pagination from '../../../components/Pagination/Pagination';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import { getAllSellerList } from '../../../Redux/StoreSlice';
import { generateCSV, transformArray, uploadCsvFile } from '../../../_helpers/globalFunctions';
import UploadFile from '../../../components/Atoms/UploadFile/UploadFile';
import DownloadButton from '../../../components/Button/DownloadButton';
import Button from '../../../components/Atoms/buttons/button';
import ProductReviewModal from '../../../components/Product/ProductReviewModal';
import ProductStatusBadge from '../../../components/Product/ProductStatusBadge';
import { getShopList } from '../../../Redux/StoreSlice';
// import { GoDesktopDownload } from "react-icons/go";


const INITIAL_FILTERS = {
  search: '',
  product: { value: 'All', label: 'All' },
  sellerName: { value: '', label: 'Search By User Name' },
  category: { value: '', label: 'Search By Category' },
  activationStatus: { value: 'Does not matter', label: 'Does not matter' },
  approvalStatus: { value: 'Does not matter', label: 'Does not matter' },
  productType: { value: 'Select', label: 'Select' },
  dateFrom: '',
  dateTo: ''
};

const size = 10
const refToLabel = (value) => {
  if (!value) return 'N/A';
  if (typeof value === 'object') {
    return value?.name || value?.title || value?.label || value?.email || value?._id || 'N/A';
  }
  return String(value);
};


const ProductCatalog = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state)
  const navigate = useNavigate();
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedImages, setSelectedImages] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [productToDelete, setProductToDelete] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const handleAddNavigate = () => navigate('/app/product-catalog/form');
  const allRowIds = useMemo(() => apiRes.list.map(product => product._id), [apiRes.list]);
  const [pageNo, setPageNo] = useState(1)
  const [userData, setUserData] = useState(null);
  const [isBulkUpload, setIsBulkUpload] = useState(false)
  const [bulkUploadData, setBulkUploadData] = useState({ seller_id: "", store_id: "", file: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [reviewModal, setReviewModal] = useState({ open: false, product: null })

  // console.log("this is store list-->", selector?.product?.getAllStoreListData?.data?.data?.list)
  const sellerListData = transformArray(selector?.store?.getAllSellerListData?.data?.data?.list || []);
  const storeList = transformArray(selector?.store?.getShopListData?.data?.list || [])

  const fetchProductsList = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        page: pageNo,
        size: size,
        keyWord: filters?.search,
        includeAllStatuses: true,
        ...(filters?.category?.value ? { category: filters.category.value } : {}),
        ...(filters?.sellerName?.value ? { sellerId: filters.sellerName.value } : {}),
        ...(filters?.activationStatus?.value === "Active" ? { status: "active" } : {}),
        ...(filters?.activationStatus?.value === "Inactive" ? { status: "inactive" } : {}),
        ...(filters?.approvalStatus?.value === "Pending" ? { status: "pending_approval" } : {}),
        ...(filters?.approvalStatus?.value === "Rejected" ? { status: "rejected" } : {}),
      };
      const response = await dispatch(getProducts(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [dispatch, pageNo, size, filters]);

  useEffect(() => {
    fetchProductsList();
    dispatch(getAllSellerList())
    dispatch(getShopList({ page: 1, size: 100 }));
  }, [pageNo]);

  useEffect(() => {
    const userDataString = sessionStorage.getItem('EcomAdmin');
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);
  const TABLE_HEADINGS = [
    "Image",
    "Product",
    "SKU",
    "Seller",
    "Category",
    "Brand",
    "Color",
    "Origin",
    "Price",
    "Stock",
    "Status",
    "Created On",
    "Active",
    "Action"
  ];


  const bulkUploadValidation = (userData) => {
    const isRole9 = userData?.roleId === 9;

    if (isRole9) {
      if (!bulkUploadData.seller_id) {
        toast.error("Please select a seller");
        return false;
      }

      if (!bulkUploadData.store_id) {
        toast.error("Please select a store");
        return false;
      }
    }

    if (!bulkUploadData.file) {
      toast.error("Please upload a file");
      return false;
    }

    const file = bulkUploadData.file;
    const validTypes = ['text/csv', 'application/vnd.ms-excel'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && fileExtension !== 'csv') {
      toast.error("Only CSV files are allowed.");
      return false;
    }

    return true;
  };




  const handleImageClick = useCallback((data) => {
    if (!data) return;
    setSelectedImages(data);
    setGalleryOpen(true);
  }, []);

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? allRowIds : []);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } catch (err) {
      toast.error(err || 'Error formatting date:');
      return dateString || 'N/A';
    }
  };
  const handleToggle = async (data) => {
    const apiPayload = {
      _id: [data?._id], isDisable: data?.isDisable ? false : true
    }
    try {
      setLoading(true);
      const response = await dispatch(enableDisableProductCatalogs(apiPayload)).unwrap();
      if (response.message) {
        toast.success(`Product ${apiPayload.isDisable ? 'disabled' : 'enabled'} successfully.`);
        fetchProductsList()
      } else {
        toast.info(response?.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error(error?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
    fetchProductsList()
  }

  const handleApproveToggle = (data) => {
    setReviewModal({ open: true, product: data });
  };

  const handleRejectProduct = (data) => {
    setReviewModal({ open: true, product: data });
  };

  const handleReviewSubmit = async (decision, rejectionReason, checklist) => {
    const product = reviewModal.product;
    const apiPayload = {
      id: product?._id,
      status: decision,
      rejectionReason: rejectionReason || null,
      checklist,
    };
    setLoading(true);
    try {
      const response = await dispatch(approveDisapprove(apiPayload)).unwrap();
      const labels = { active: 'approved', inactive: 'deactivated', rejected: 'rejected' };
      toast.success(response?.message || `Product ${labels[decision] || 'updated'} successfully.`);
      fetchProductsList();
    } catch (error) {
      throw new Error(error?.message || error || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  function handleDelete(data) {
    setShowDeleteConfirmation(true)
    setProductToDelete(data)
  }

  async function handleDeleteSubmit() {
    try {
      const apiPayload = { _id: [productToDelete?._id] };
      setLoading(true)
      const res = await dispatch(deleteProducts(apiPayload)).unwrap();
      toast.success(res?.message || 'Product deleted successfully!');
      setLoading(false)
    } catch (error) {
      toast.error(error?.message || 'Delete failed.');
      setLoading(false)
    } finally {
      setShowDeleteConfirmation(false);
      setProductToDelete(null);
      setLoading(false)
      fetchProductsList()

    }
  }

  const handleSearchApply = async () => {
    setLoading(true);
    try {
      const query = {
        page: 1,
        size: size,
        keyWord: filters?.search,
        includeAllStatuses: true,
        ...(filters?.category?.value ? { category: filters.category.value } : {}),
        ...(filters?.sellerName?.value ? { sellerId: filters.sellerName.value } : {}),
        ...(filters?.activationStatus?.value === "Active" ? { status: "active" } : {}),
        ...(filters?.activationStatus?.value === "Inactive" ? { status: "inactive" } : {}),
        ...(filters?.approvalStatus?.value === "Pending" ? { status: "pending_approval" } : {}),
        ...(filters?.approvalStatus?.value === "Rejected" ? { status: "rejected" } : {}),
      };
      const response = await dispatch(getProducts(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }
  const clearFilters = async () => {
    setLoading(true);
    setFilters({ search: "" })
    try {
      const query = {
        page: pageNo,
        size: size,
        keyWord: '',
      };
      const response = await dispatch(getProducts(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true
      };
      try {
        const res = await dispatch(enableDisableProductCatalogs(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        fetchProductsList();
        setSelectedRow([]);
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
        if (error.errors) {
          toast.error(error.errors || 'failed to update');
        }
      }
    }
  };

  const handleEditProduct = (id) => {
    navigate(`/app/product-catalog/form/${id}`)
  }

  const isAllRowsSelected = useMemo(() =>
    selectedRow.length === apiRes?.list?.length && apiRes?.list?.length > 0,
    [selectedRow.length, apiRes?.list?.length]
  );

  const tableRows = useMemo(() =>
    apiRes.list.map((product) => {

      return [
        <CustomCheckbox checked={selectedRow.includes(product._id)} onChange={(e) => handleRowCheckboxChange(e, product._id)} />,

        <div className="relative flex items-center">
          <span className='text-blue-500 hover:underline' onClick={() => handleImageClick(product?.images || product?.product_image_id?.images)}>
            View
          </span>
        </div>,
        <span className='capitalize'>{product?.title || product?.name || 'N/A'}</span>,
        <span>{product?.sku || 'N/A'}</span>,
        <span>{refToLabel(product?.sellerName || product?.sellerId)}</span>,
        <span>{refToLabel(product?.categoryName || product?.category || product?.categoryId)}</span>,
        <span>{refToLabel(product?.brand)}</span>,
        <span>{product?.color || 'N/A'}</span>,
        <span>{[product?.origin?.city, product?.origin?.state, product?.origin?.country].filter(Boolean).join(', ') || 'N/A'}</span>,
        <span>{product?.price !== undefined ? `₹${product.price}` : 'N/A'}</span>,
        <span>{product?.stock ?? 'N/A'}</span>,
        <ProductStatusBadge status={product?.status} />,
        <span key={`date-${product._id}`}>{formatDate(product.createdAt)}</span>,
        <ToggleButton key={`toggle-${product._id}`} isToggle={!product?.isDisable} handleClick={() => handleToggle(product)} />,
        <span>
          <div className="flex flex-wrap gap-2">
            <ActionButtons
              onEdit={() => handleEditProduct(product?._id)}
              viewButton={true}
              onViewClick={() => navigate(`/app/product-catalog/view/${product?._id}`)}
              showLinkButton={false}
              onDelete={() => handleDelete(product)}
            />
            <button
              className="text-xs px-2 py-1 rounded bg-[#3E4094] text-white hover:bg-[#2e3074]"
              onClick={() => handleApproveToggle(product)}
            >
              Review
            </button>
          </div>
        </span>
      ];
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRes.list, selectedRow, handleImageClick, navigate]
  );

  const handleAddBulkUpload = () => {
    setIsBulkUpload(true)
  }
  const handleSelectChange = (data, action) => {
    if (action === 'SELLER') {
      setBulkUploadData((prev) => ({
        ...prev, seller_id: data?.value
      }))
      dispatch(getShopList({ page: 1, size: 100, sellerId: data?.value }))
    } else {
      setBulkUploadData((prev) => ({
        ...prev, store_id: data?.value
      }))
    }
  }

  const handleDownloadSample = () => {
    dispatch(downloadSampleCsv())
      .unwrap()
      .then((res) => {
        generateCSV(res?.data, {
          filename: 'products_sample.csv',
        });

      })
      .catch((error) => {
        console.error('Error downloading sample CSV:', error);
      });
  };


  const handleFileUpload = async (file) => {
    if (!file) return;
    setBulkUploadData((prev) => ({ ...prev, file: file, }));
  }
  const handleSubmitBulk = async () => {
    if (!bulkUploadValidation()) return;

    try {
      setIsLoading(true);

      // 👉 Clone and update bulkUploadData
      const updatedBulkUploadData = {
        ...bulkUploadData,
        ...(userData?.roleId === 9 && { store_id: userData?.storeId }),
      };

      const csv = await uploadCsvFile(updatedBulkUploadData);
      toast.info(csv?.message || "Success!");

      navigate(`/app/product-catalog/bulk-history`);
    } catch (error) {
      toast.error(error || "Catalog upload failed. Please try again.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setBulkUploadData({ seller_id: "", store_id: "", file: "" });
      setIsBulkUpload(false);
    }
  };



  return (
    <div className='p-6 mx-auto overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl'>
      <Loader loading={loading || isLoading} />
      <div className="flex md:flex-row flex-col items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Product Catalog</h1>
        <div className='flex justify-end gap-2'>
          <Button onClick={() => navigate(`/app/product-catalog/bulk-history`)}>Bulk History</Button>
          <AddButton onClick={handleAddBulkUpload} labelName={`Add in bulk`} />
          <AddButton onClick={handleAddNavigate} />
        </div>
      </div>
      <div className='bg-white'>
        <section className='p-2 border-b'>
          <SearchComponent
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            filters={filters} setFilters={setFilters}
            isSearchShow={true} isActivationStatus={true}
            isApprovalOptions={true} isCategory={true}
            isProduct={true} isProductType={true} isUser={true}
            applyFilters={handleSearchApply} handleSearchRemove={clearFilters}
            isActionButton={true} isStatusAction={true} handleAction={handleBulkAction}
          />
        </section>
        <section>
          <TableData
            tableHeadings={TABLE_HEADINGS} data={tableRows || []}
            isHeaderCheckbox={true} handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            totalData={apiRes?.total} allRowsSelected={isAllRowsSelected}
          />

        </section>

      </div>
      <div className='mt-3'>
        {
          apiRes?.total > size && (
            <Pagination
              totalPages={Math.ceil(apiRes?.total / size)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )
        }
      </div>


      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => {
          setShowDeleteConfirmation(false);
          setProductToDelete(null);
        }}
        DeleteHeading={'Are you sure you want to delete?'}
        isDeleting={loading && productToDelete}
        confirmDelete={handleDeleteSubmit}
      />

      <DefaultModal isOpen={isBulkUpload} onClose={() => setIsBulkUpload(false)} title={`Add Bulk Product`} onSubmit={handleSubmitBulk}>
        <div className='space-y-8 p-2'>
          {userData?.roleId !== 9 && (
            <>
              {userData?.roleId !== 3 && (
                <FilterSelect
                  options={sellerListData || []}
                  onChange={(data) => handleSelectChange(data, "SELLER")}
                  value={sellerListData.find(opt => opt.value === bulkUploadData?.seller_id) || null}
                  label="Seller"
                />
              )}

              <FilterSelect
                options={storeList || []}
                value={storeList.find(opt => opt.value === bulkUploadData?.store_id) || null}
                onChange={(data) => handleSelectChange(data, "STORE")}
                label="Store"
              />
            </>
          )}

          <DownloadButton onClick={handleDownloadSample} />
          <UploadFile onFileSelect={handleFileUpload} />

        </div>
      </DefaultModal>

      <ImageGallery
        images={selectedImages}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <ProductReviewModal
        isOpen={reviewModal.open}
        product={reviewModal.product}
        onClose={() => setReviewModal({ open: false, product: null })}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default ProductCatalog;
