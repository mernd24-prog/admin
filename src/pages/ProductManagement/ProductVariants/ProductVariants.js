/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';
import Button from '../../../components/Atoms/buttons/button';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import {
  createProductVariant,
  deleteProductVariant,
  getProductVariants,
  updateProductVariant,
} from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;

const emptyForm = {
  _id: '',
  familyCode: '',
  productId: '',
  sellerId: '',
  sku: '',
  stock: 0,
  reservedStock: 0,
  status: 'active',
  attributesText: '{}',
};

const parseAttributes = (value) => {
  if (!String(value || '').trim()) return {};
  return JSON.parse(value);
};

const ProductVariants = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state.adminCore);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: '' });
  const [isRefresh, setIsRefresh] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [selectedRow, setSelectedRow] = useState([]);

  const listPayload = selector?.productVariantsData?.data?.data || {};
  const variants = listPayload?.list || [];
  const total = listPayload?.total || 0;

  const fetchVariants = useCallback(() => {
    dispatch(getProductVariants({
      page: pageNo,
      limit: PAGE_SIZE,
      sku: filters.search,
    }));
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants, isRefresh]);

  const handleInputChange = (event) => {
    const { name, value, type } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value || 0) : value,
    }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const nextErrors = {};
    ['familyCode', 'productId', 'sellerId', 'sku'].forEach((field) => {
      if (!String(formData[field] || '').trim()) {
        nextErrors[field] = 'Required';
      }
    });
    if (Number(formData.stock) < 0) nextErrors.stock = 'Stock cannot be negative';
    if (Number(formData.reservedStock) < 0) nextErrors.reservedStock = 'Reserved stock cannot be negative';
    try {
      parseAttributes(formData.attributesText);
    } catch {
      nextErrors.attributesText = 'Enter valid JSON';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const toPayload = () => ({
    familyCode: formData.familyCode.trim(),
    productId: formData.productId.trim(),
    sellerId: formData.sellerId.trim(),
    sku: formData.sku.trim(),
    stock: Number(formData.stock || 0),
    reservedStock: Number(formData.reservedStock || 0),
    status: formData.status || 'active',
    attributes: parseAttributes(formData.attributesText),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      if (formData._id) {
        await dispatch(updateProductVariant({ ...toPayload(), id: formData._id })).unwrap();
        toast.success('Product variant updated successfully');
      } else {
        await dispatch(createProductVariant(toPayload())).unwrap();
        toast.success('Product variant created successfully');
      }
      closeModal();
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to save product variant');
    }
  };

  const openEdit = (variant) => {
    setFormData({
      _id: variant._id,
      familyCode: variant.familyCode || '',
      productId: variant.productId || '',
      sellerId: variant.sellerId || '',
      sku: variant.sku || '',
      stock: variant.stock ?? 0,
      reservedStock: variant.reservedStock ?? 0,
      status: variant.status || 'active',
      attributesText: JSON.stringify(variant.attributes || {}, null, 2),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      await dispatch(deleteProductVariant({ id: deleteTarget._id })).unwrap();
      toast.success('Product variant deleted successfully');
      setDeleteTarget(null);
      setSelectedRow([]);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to delete product variant');
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget?._id) return;
    try {
      await dispatch(updateProductVariant({
        id: toggleTarget._id,
        status: toggleTarget.status === 'active' ? 'inactive' : 'active',
      })).unwrap();
      toast.success('Status updated successfully');
      setToggleTarget(null);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update status');
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedRow.length) {
      toast.warning('Please select at least one variant');
      return;
    }
    const status = action === 'Active' ? 'active' : action === 'Inactive' ? 'inactive' : null;
    if (!status) return;
    try {
      await Promise.all(selectedRow.map(id => dispatch(updateProductVariant({ id, status })).unwrap()));
      toast.success('Bulk status updated successfully');
      setSelectedRow([]);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update selected variants');
    }
  };

  const tableRows = variants.map((variant) => [
    <CustomCheckbox
      key={`check-${variant._id}`}
      checked={selectedRow.includes(variant._id)}
      onChange={(event) => {
        setSelectedRow(prev => event.target.checked
          ? [...prev, variant._id]
          : prev.filter(id => id !== variant._id));
      }}
    />,
    <span className="font-mono text-sm">{variant.sku}</span>,
    <span>{variant.familyCode}</span>,
    <span className="font-mono text-xs">{variant.productId}</span>,
    <span className="font-mono text-xs">{variant.sellerId}</span>,
    <span>{variant.stock ?? 0}</span>,
    <span>{variant.reservedStock ?? 0}</span>,
    <ToggleButton isToggle={variant.status === 'active'} handleClick={() => setToggleTarget(variant)} />,
    <ActionButtons
      onEdit={() => openEdit(variant)}
      onDelete={() => setDeleteTarget(variant)}
      showLinkButton={false}
    />,
  ]);

  const isAllRowsSelected = useMemo(
    () => selectedRow.length === variants.length && variants.length > 0,
    [selectedRow.length, variants.length],
  );

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='max-w-7xl mx-auto'>
        <div className='overflow-hidden overflow-y-auto py-6'>
          <div className="flex justify-between items-center">
            <h3>Home / <b>Product Variants</b></h3>
            <Button className="border-[#3E4094] text-[#3E4094] mb-3" onClick={() => setIsModalOpen(true)}>
              Add
            </Button>
          </div>
          <div className='overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
            <div className="bg-white p-2 border-b mb-4">
              <SearchComponent
                isSearchShow={true}
                filters={filters}
                setFilters={setFilters}
                isActionButton={true}
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                handleAction={handleBulkAction}
                isStatusAction={true}
                placeholder="Search by SKU"
                applyFilters={() => {
                  setPageNo(1);
                  setIsRefresh(value => !value);
                }}
                handleSearchRemove={() => {
                  setFilters({ search: '' });
                  setPageNo(1);
                  setIsRefresh(value => !value);
                }}
              />
            </div>
            <TableData
              Heading='Product Variants'
              tableHeadings={['SKU', 'Family', 'Product ID', 'Seller ID', 'Stock', 'Reserved', 'Status', 'Actions']}
              data={tableRows}
              totalData={total}
              totalSize={PAGE_SIZE}
              currentPage={pageNo}
              onPageChange={setPageNo}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={(event) => {
                setSelectedRow(event.target.checked ? variants.map(item => item._id) : []);
              }}
              allRowsSelected={isAllRowsSelected}
            />
          </div>
          <div className="flex justify-center my-6">
            {total > PAGE_SIZE && (
              <Pagination
                totalPages={Math.ceil(total / PAGE_SIZE)}
                currentPage={pageNo}
                onPageChange={setPageNo}
              />
            )}
          </div>
        </div>
      </div>

      <DefaultModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isButtonView={true}
        submitButtonText={formData._id ? 'Update' : 'Submit'}
        closeButtonText="Cancel"
        title={formData._id ? 'Edit Product Variant' : 'Add Product Variant'}
      >
        <div className='p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormInput label="Family Code" name="familyCode" value={formData.familyCode} onChange={handleInputChange} error={errors.familyCode} required />
          <FormInput label="SKU" name="sku" value={formData.sku} onChange={handleInputChange} error={errors.sku} required />
          <FormInput label="Product ID" name="productId" value={formData.productId} onChange={handleInputChange} error={errors.productId} required />
          <FormInput label="Seller ID" name="sellerId" value={formData.sellerId} onChange={handleInputChange} error={errors.sellerId} required />
          <FormInput label="Stock" name="stock" type="number" value={formData.stock} onChange={handleInputChange} error={errors.stock} required />
          <FormInput label="Reserved Stock" name="reservedStock" type="number" value={formData.reservedStock} onChange={handleInputChange} error={errors.reservedStock} required />
          <FormInput label="Status" name="status" type="select" value={formData.status} onChange={handleInputChange} options={['active', 'inactive', 'draft']} />
        </div>
        <div className='p-4'>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attributes JSON</label>
          <textarea
            name="attributesText"
            value={formData.attributesText}
            onChange={handleInputChange}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          {errors.attributesText && <p className="text-red-500 text-sm mt-1">{errors.attributesText}</p>}
        </div>
      </DefaultModal>

      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={handleDelete}
        DeleteHeading="Are you sure you want to delete this product variant?"
      />
      <StatusPopup
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        heading={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'disable' : 'enable'} this variant?`}
      />
    </>
  );
};

export default ProductVariants;
