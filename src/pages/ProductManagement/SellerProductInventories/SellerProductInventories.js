/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import ProductMissingInfo from './components/ProductMissingInformation';
import SellerInventorySetup from './components/SellerInventorySetup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import { adjustProductInventory, deleteProducts, enableDisableProductCatalogs, getProducts } from '../../../Redux/productSlice';

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  return root.list || root.items || root.rows || [];
};

const firstImage = (product) => {
  if (Array.isArray(product?.images) && product.images.length > 0) return product.images[0];
  if (Array.isArray(product?.thumbnails) && product.thumbnails.length > 0) return product.thumbnails[0];
  return 'https://placehold.co/120x120?text=Product';
};

const SellerProductInventories = () => {
  const dispatch = useDispatch();
  const productSelector = useSelector((state) => state.product);

  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const [inventory, setInventory] = useState(false);
  const [filters, setFilters] = useState({ search: '' });

  const [formData, setFormData] = useState({
    user: '',
    title: '',
    urlKeyword: '',
    costPrice: '',
    sellingPrice: '',
    availableQty: '',
    sku: '',
    minPurchaseQty: '1',
    productCondition: 'New',
    codAvailable: 'No',
    fulfillmentMethod: 'Ship Only',
    availableDate: new Date().toISOString().slice(0, 10),
    returnPeriod: '0',
    cancelPeriod: '0',
    periodInDays: '',
  });

  const loadProducts = async () => {
    try {
      const response = await dispatch(getProducts({ page: 1, limit: 100, keyWord: filters.search || undefined })).unwrap();
      setApiRes(extractList(response));
    } catch (error) {
      toast.error(error?.message || 'Failed to load inventory');
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filters.search]);

  const loading = productSelector?.getProductsData?.loading;

  const togglePanel = () => {
    setMissingOpen(!missingOpen);
  };

  const tableHeadings = [
    'Name',
    'Seller',
    'Selling Price',
    'Available Quantity',
    'Status',
    'Action',
  ];

  const handleToggleStatus = async (item) => {
    try {
      await dispatch(enableDisableProductCatalogs({
        ids: [item._id],
        isDisable: item.status === 'active',
      })).unwrap();
      await loadProducts();
      toast.success('Product status updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update product status');
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem?._id) return;
    try {
      await dispatch(deleteProducts({ productId: selectedItem._id })).unwrap();
      setShowDeleteConfirmation(false);
      setSelectedItem(null);
      toast.success('Product deleted successfully');
      await loadProducts();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete product');
    }
  };

  const openInventoryModal = (item) => {
    const seller = item?.sellerId || item?.seller || {};
    const sellerLabel = typeof seller === 'object'
      ? (seller?.full_name || seller?.name || seller?.email || 'Seller')
      : String(seller || 'Seller');

    setSelectedItem(item);
    setFormData((prev) => ({
      ...prev,
      user: sellerLabel,
      title: item?.title || item?.name || '',
      urlKeyword: item?._id ? `/products/${item._id}` : '',
      costPrice: String(item?.mrp || ''),
      sellingPrice: String(item?.price || ''),
      availableQty: String(item?.stock || 0),
      sku: item?.sku || '',
    }));
    setInventory(true);
  };

  const handleInventorySave = async () => {
    if (!selectedItem?._id) {
      setInventory(false);
      return;
    }

    const nextQty = Number(formData.availableQty || 0);
    const currentQty = Number(selectedItem.stock || 0);
    const adjustment = nextQty - currentQty;

    if (adjustment === 0) {
      setInventory(false);
      return;
    }

    try {
      await dispatch(adjustProductInventory({
        productId: selectedItem._id,
        adjustment,
        reason: 'Admin seller inventory update',
      })).unwrap();
      setInventory(false);
      toast.success('Inventory updated successfully');
      await loadProducts();
    } catch (error) {
      toast.error(error?.message || 'Failed to update inventory');
    }
  };

  const tableRows = useMemo(() => apiRes?.map((item) => {
    const seller = item?.sellerId || item?.seller || {};
    const sellerName = typeof seller === 'object'
      ? (seller?.full_name || seller?.name || seller?.email || 'N/A')
      : String(seller || 'N/A');
    const sellerEmail = typeof seller === 'object' ? seller?.email : '';

    return [
      <span className="flex items-center space-x-2 cursor-pointer" key={`name-${item._id}`} onClick={() => setSelectedImage(firstImage(item))}>
        <img src={firstImage(item)} alt='' className='object-cover w-20 h-20 border rounded' />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item?.title || item?.name || '-'}</span>
          <span className="text-sm text-gray-500">{item?.description || '-'}</span>
        </div>
      </span>,
      <div className="flex flex-col" key={`seller-${item._id}`}>
        <span className="text-sm font-medium">{sellerName}</span>
        <span className="text-sm text-gray-500">{sellerEmail || '-'}</span>
      </div>,
      `$${Number(item?.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      item?.stock ?? 0,
      <span key={`status-${item._id}`}>
        <ToggleButton isOn={item?.status === 'active'} toggle={() => handleToggleStatus(item)} />
      </span>,
      <span key={`action-${item._id}`}>
        <ActionButtons
          onDelete={() => {
            setSelectedItem(item);
            setShowDeleteConfirmation(true);
          }}
          showWarningButton={true}
          showLinkButton={false}
          onWarning={togglePanel}
          onEdit={() => openInventoryModal(item)}
        />
      </span>,
    ];
  }), [apiRes]);

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div>
          <SearchComponent
            filters={filters}
            isActionButton={true}
            isSearchDown={true}
            isSearchShow={true}
            isCategory={true}
            isActivationStatus={true}
            isProductType={true}
            isUser={true}
            isStatusAction={true}
            setFilters={setFilters}
          />

          <TableData
            Heading="Seller's Product Inventories"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isLoading={loading}
          />
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => {
          setShowDeleteConfirmation(false);
          setSelectedItem(null);
        }}
        confirmDelete={confirmDelete}
        DeleteHeading={'Are you sure you want to delete?'}
      />
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      <ProductMissingInfo
        missingOpen={missingOpen}
        togglePanel={togglePanel}
      />
      <SellerInventorySetup
        setFormData={setFormData}
        formData={formData}
        InventorySetupOpen={inventory}
        togglePanel={() => {
          setInventory(false);
          setSelectedItem(null);
        }}
        onSave={handleInventorySave}
      />

    </>
  )
}

export default SellerProductInventories
