/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
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
  getProductFamilies,
  getProductVariants,
  updateProductVariant,
} from '../../../Redux/adminCoreSlice';
import { getAllProducts } from '../../../Redux/productSlice';
import { getAllSellerList } from '../../../Redux/StoreSlice';
import { transformArray } from '../../../_helpers/globalFunctions';

const PAGE_SIZE = 10;
const variantIdFromRecord = (variant = {}) => variant?.id || variant?._id || variant?.variantId || '';

const emptyAttribute = { key: '', value: '' };

const emptyForm = {
  variantId: '',
  familyCode: '',
  productId: '',
  sellerId: '',
  sku: '',
  stock: 0,
  reservedStock: 0,
  status: 'active',
  attributes: [],
};

const toAttributeRows = (obj = {}) => {
  const entries = Object.entries(obj || {});
  if (!entries.length) return [];
  return entries.map(([key, value]) => ({ key, value: String(value ?? '') }));
};

const toAttributeObject = (rows = []) =>
  rows.reduce((acc, row) => {
    const key = String(row.key || '').trim();
    if (!key) return acc;
    acc[key] = String(row.value || '').trim();
    return acc;
  }, {});

const ProductVariants = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state.adminCore);
  const productSelector = useSelector(state => state.product);
  const storeSelector = useSelector(state => state.store);

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
  const families = selector?.productFamiliesData?.data?.data?.list || [];
  const products = productSelector?.getAllProductsData?.data?.data?.list || [];
  const sellerOptions = transformArray(storeSelector?.getAllSellerListData?.data?.data?.list || []);

  const familyOptions = useMemo(
    () => families.map((family) => ({ value: family.familyCode || family.code, label: `${family.title || family.name || family.familyCode} (${family.familyCode || family.code})` })),
    [families],
  );

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product._id || product.id, label: `${product.title || product.name || product.slug || product._id}` })),
    [products],
  );

  const familyLabelMap = useMemo(() => Object.fromEntries(familyOptions.map((item) => [String(item.value), item.label])), [familyOptions]);
  const productLabelMap = useMemo(() => Object.fromEntries(productOptions.map((item) => [String(item.value), item.label])), [productOptions]);
  const sellerLabelMap = useMemo(() => Object.fromEntries(sellerOptions.map((item) => [String(item.value), item.label])), [sellerOptions]);

  const fetchVariants = useCallback(() => {
    dispatch(getProductVariants({ page: pageNo, limit: PAGE_SIZE, sku: filters.search }));
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants, isRefresh]);

  useEffect(() => {
    dispatch(getProductFamilies({ page: 1, limit: 100 }));
    dispatch(getAllProducts({ page: 1, limit: 100 }));
    dispatch(getAllSellerList());
  }, [dispatch]);

  const validateForm = () => {
    const nextErrors = {};
    ['familyCode', 'productId', 'sellerId', 'sku'].forEach((field) => {
      if (!String(formData[field] || '').trim()) nextErrors[field] = 'Required';
    });
    if (Number(formData.stock) < 0) nextErrors.stock = 'Stock cannot be negative';
    if (Number(formData.reservedStock) < 0) nextErrors.reservedStock = 'Reserved stock cannot be negative';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const toPayload = () => ({
    familyCode: String(formData.familyCode || '').trim(),
    productId: String(formData.productId || '').trim(),
    sellerId: String(formData.sellerId || '').trim(),
    sku: String(formData.sku || '').trim(),
    stock: Number(formData.stock || 0),
    reservedStock: Number(formData.reservedStock || 0),
    status: formData.status || 'active',
    attributes: toAttributeObject(formData.attributes || []),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    try {
      if (formData.variantId) {
        await dispatch(updateProductVariant({ ...toPayload(), variantId: formData.variantId })).unwrap();
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
      variantId: variantIdFromRecord(variant),
      familyCode: variant.familyCode || '',
      productId: variant.productId || '',
      sellerId: variant.sellerId || '',
      sku: variant.sku || '',
      stock: variant.stock ?? 0,
      reservedStock: variant.reservedStock ?? 0,
      status: variant.status || 'active',
      attributes: toAttributeRows(variant.attributes || {}),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    const variantId = variantIdFromRecord(deleteTarget);
    if (!variantId) return;
    try {
      await dispatch(deleteProductVariant({ variantId })).unwrap();
      toast.success('Product variant deleted successfully');
      setDeleteTarget(null);
      setSelectedRow([]);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to delete product variant');
    }
  };

  const handleToggle = async () => {
    const variantId = variantIdFromRecord(toggleTarget);
    if (!variantId) return;
    try {
      await dispatch(updateProductVariant({ variantId, status: toggleTarget.status === 'active' ? 'inactive' : 'active' })).unwrap();
      toast.success('Status updated successfully');
      setToggleTarget(null);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update status');
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedRow.length) return toast.warning('Please select at least one variant');
    const status = action === 'Active' ? 'active' : action === 'Inactive' ? 'inactive' : null;
    if (!status) return;
    try {
      await Promise.all(selectedRow.map((variantId) => dispatch(updateProductVariant({ variantId, status })).unwrap()));
      toast.success('Bulk status updated successfully');
      setSelectedRow([]);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update selected variants');
    }
  };

  const tableRows = variants.map((variant) => [
    <CustomCheckbox
      key={`check-${variantIdFromRecord(variant)}`}
      checked={selectedRow.includes(variantIdFromRecord(variant))}
      onChange={(event) => {
        setSelectedRow((prev) =>
          event.target.checked ? [...prev, variantIdFromRecord(variant)] : prev.filter((id) => id !== variantIdFromRecord(variant)),
        );
      }}
    />,
    <span className="font-mono text-sm">{variant.sku}</span>,
    <span>{familyLabelMap[String(variant.familyCode || '')] || variant.familyCode || '-'}</span>,
    <span>{productLabelMap[String(variant.productId || '')] || variant.productTitle || variant.productId || '-'}</span>,
    <span>{sellerLabelMap[String(variant.sellerId || '')] || variant.sellerName || variant.sellerId || '-'}</span>,
    <span>{variant.stock ?? 0}</span>,
    <span>{variant.reservedStock ?? 0}</span>,
    <span>{Object.keys(variant.attributes || {}).length || 0}</span>,
    <ToggleButton isToggle={variant.status === 'active'} handleClick={() => setToggleTarget(variant)} />,
    <ActionButtons onEdit={() => openEdit(variant)} onDelete={() => setDeleteTarget(variant)} showLinkButton={false} />,
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
            <Button className="border-[#3E4094] text-[#3E4094] mb-3" onClick={() => setIsModalOpen(true)}>Add</Button>
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
                applyFilters={() => { setPageNo(1); setIsRefresh(value => !value); }}
                handleSearchRemove={() => { setFilters({ search: '' }); setPageNo(1); setIsRefresh(value => !value); }}
              />
            </div>
            <TableData
              Heading='Product Variants'
              tableHeadings={['SKU', 'Family', 'Product', 'Seller', 'Stock', 'Reserved', 'Attributes', 'Status', 'Actions']}
              data={tableRows}
              totalData={total}
              totalSize={PAGE_SIZE}
              currentPage={pageNo}
              onPageChange={setPageNo}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={(event) => setSelectedRow(event.target.checked ? variants.map((item) => variantIdFromRecord(item)) : [])}
              allRowsSelected={isAllRowsSelected}
            />
          </div>
          <div className="flex justify-center my-6">
            {total > PAGE_SIZE && <Pagination totalPages={Math.ceil(total / PAGE_SIZE)} currentPage={pageNo} onPageChange={setPageNo} />}
          </div>
        </div>
      </div>

      <DefaultModal isOpen={isModalOpen} onClose={closeModal} onSubmit={handleSubmit} isButtonView={true} submitButtonText={formData.variantId ? 'Update' : 'Submit'} closeButtonText="Cancel" title={formData.variantId ? 'Edit Product Variant' : 'Add Product Variant'}>
        <div className='p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FilterSelect
            label="Family"
            options={familyOptions}
            value={familyOptions.find((opt) => String(opt.value) === String(formData.familyCode || '')) || null}
            onChange={(option) => { setFormData((prev) => ({ ...prev, familyCode: option?.value || '' })); setErrors((prev) => ({ ...prev, familyCode: undefined })); }}
            error={errors.familyCode}
            placeholder="Select family"
            required
          />
          <FormInput label="SKU" name="sku" value={formData.sku} onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))} error={errors.sku} required />
          <FilterSelect
            label="Product"
            options={productOptions}
            value={productOptions.find((opt) => String(opt.value) === String(formData.productId || '')) || null}
            onChange={(option) => { setFormData((prev) => ({ ...prev, productId: option?.value || '' })); setErrors((prev) => ({ ...prev, productId: undefined })); }}
            error={errors.productId}
            placeholder="Select product"
            required
          />
          <FilterSelect
            label="Seller"
            options={sellerOptions}
            value={sellerOptions.find((opt) => String(opt.value) === String(formData.sellerId || '')) || null}
            onChange={(option) => { setFormData((prev) => ({ ...prev, sellerId: option?.value || '' })); setErrors((prev) => ({ ...prev, sellerId: undefined })); }}
            error={errors.sellerId}
            placeholder="Select seller"
            required
          />
          <FormInput label="Stock" name="stock" type="number" value={formData.stock} onChange={(e) => setFormData((p) => ({ ...p, stock: Number(e.target.value || 0) }))} error={errors.stock} required />
          <FormInput label="Reserved Stock" name="reservedStock" type="number" value={formData.reservedStock} onChange={(e) => setFormData((p) => ({ ...p, reservedStock: Number(e.target.value || 0) }))} error={errors.reservedStock} required />
          <FormInput label="Status" name="status" type="select" value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} options={['active', 'inactive', 'draft']} />
        </div>

        <div className='p-4 space-y-2'>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Attributes</label>
            <button type="button" className="text-xs text-blue-600" onClick={() => setFormData((p) => ({ ...p, attributes: [...(p.attributes || []), { ...emptyAttribute }] }))}>Add Attribute</button>
          </div>
          {!(formData.attributes || []).length && (
            <p className="text-xs text-gray-500">Optional. Add only if this variant needs custom attribute overrides.</p>
          )}
          {(formData.attributes || []).map((row, idx) => (
            <div key={`attr-${idx}`} className="grid grid-cols-2 gap-2">
              <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="key" value={row.key} onChange={(e) => setFormData((p) => ({ ...p, attributes: (p.attributes || []).map((r, i) => (i === idx ? { ...r, key: e.target.value } : r)) }))} />
              <div className="flex gap-2">
                <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="value" value={row.value} onChange={(e) => setFormData((p) => ({ ...p, attributes: (p.attributes || []).map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)) }))} />
                <button type="button" className="px-2 text-red-600" onClick={() => setFormData((p) => ({ ...p, attributes: (p.attributes || []).filter((_, i) => i !== idx) }))}>X</button>
              </div>
            </div>
          ))}
        </div>
      </DefaultModal>

      <DeletePopup isDeleteModalOpen={Boolean(deleteTarget)} closeDeleteModal={() => setDeleteTarget(null)} confirmDelete={handleDelete} DeleteHeading="Are you sure you want to delete this product variant?" />
      <StatusPopup isOpen={Boolean(toggleTarget)} onClose={() => setToggleTarget(null)} onConfirm={handleToggle} heading={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'disable' : 'enable'} this variant?`} />
    </>
  );
};

export default ProductVariants;
