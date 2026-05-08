/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
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
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import {
  createProductFamily,
  deleteProductFamily,
  getProductFamilies,
  updateProductFamily,
} from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const idFromRecord = (item = {}) => item?.familyCode || item?.code || item?.id || '';

const emptyForm = {
  familyCode: '',
  title: '',
  category: '',
  sellerId: '',
  status: 'active',
  baseAttributesText: '{}',
  variantAxesText: '[]',
};

const ProductFamilies = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isRefresh, setIsRefresh] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const payload = selector?.productFamiliesData?.data?.data || {};
  const list = payload?.list || [];
  const total = payload?.total || 0;

  const fetchList = useCallback(() => {
    dispatch(
      getProductFamilies({
        page: pageNo,
        limit: PAGE_SIZE,
        category: filters.search,
      }),
    );
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchList();
  }, [fetchList, isRefresh]);

  const parseBaseAttributes = () => JSON.parse(formData.baseAttributesText || '{}');
  const parseVariantAxes = () => JSON.parse(formData.variantAxesText || '[]');

  const validateForm = () => {
    const nextErrors = {};
    if (!String(formData.familyCode || '').trim()) nextErrors.familyCode = 'Required';
    if (!String(formData.title || '').trim()) nextErrors.title = 'Required';
    if (!String(formData.category || '').trim()) nextErrors.category = 'Required';
    try { parseBaseAttributes(); } catch { nextErrors.baseAttributesText = 'Invalid JSON'; }
    try {
      const parsed = parseVariantAxes();
      if (!Array.isArray(parsed)) nextErrors.variantAxesText = 'Must be JSON array';
    } catch {
      nextErrors.variantAxesText = 'Invalid JSON';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const handleInput = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const toPayload = () => ({
    familyCode: formData.familyCode.trim(),
    title: formData.title.trim(),
    category: formData.category.trim(),
    sellerId: formData.sellerId?.trim() || undefined,
    status: formData.status || 'active',
    baseAttributes: parseBaseAttributes(),
    variantAxes: parseVariantAxes(),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    try {
      if (formData._editingId) {
        await dispatch(updateProductFamily({ ...toPayload(), familyCode: formData._editingId })).unwrap();
        toast.success('Product family updated');
      } else {
        await dispatch(createProductFamily(toPayload())).unwrap();
        toast.success('Product family created');
      }
      closeModal();
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to save product family');
    }
  };

  const handleDelete = async () => {
    const familyCode = idFromRecord(deleteTarget);
    if (!familyCode) return;
    try {
      await dispatch(deleteProductFamily({ familyCode })).unwrap();
      toast.success('Product family deleted');
      setDeleteTarget(null);
      setSelectedRow([]);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to delete product family');
    }
  };

  const handleToggle = async () => {
    const familyCode = idFromRecord(toggleTarget);
    if (!familyCode) return;
    try {
      await dispatch(
        updateProductFamily({
          familyCode,
          status: toggleTarget.status === 'active' ? 'inactive' : 'active',
        }),
      ).unwrap();
      toast.success('Status updated');
      setToggleTarget(null);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update status');
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedRow.length) {
      toast.warning('Please select at least one family');
      return;
    }
    const status = action === 'Active' ? 'active' : action === 'Inactive' ? 'inactive' : null;
    if (!status) return;
    try {
      await Promise.all(selectedRow.map((familyCode) => dispatch(updateProductFamily({ familyCode, status })).unwrap()));
      toast.success('Bulk status updated');
      setSelectedRow([]);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || error || 'Failed bulk update');
    }
  };

  const rows = list.map((item) => [
    <CustomCheckbox
      key={`check-${idFromRecord(item)}`}
      checked={selectedRow.includes(idFromRecord(item))}
      onChange={(event) =>
        setSelectedRow((prev) =>
          event.target.checked
            ? [...prev, idFromRecord(item)]
            : prev.filter((id) => id !== idFromRecord(item)),
        )
      }
    />,
    <span className="font-mono text-xs">{item.familyCode || item.code}</span>,
    <span>{item.title || item.name}</span>,
    <span>{item.category || '-'}</span>,
    <span className="font-mono text-xs">{item.sellerId || '-'}</span>,
    <ToggleButton isToggle={item.status === 'active'} handleClick={() => setToggleTarget(item)} />,
    <ActionButtons
      onEdit={() => {
        setFormData({
          _editingId: idFromRecord(item),
          familyCode: item.familyCode || item.code || '',
          title: item.title || item.name || '',
          category: item.category || '',
          sellerId: item.sellerId || '',
          status: item.status || 'active',
          baseAttributesText: JSON.stringify(item.baseAttributes || {}, null, 2),
          variantAxesText: JSON.stringify(item.variantAxes || [], null, 2),
        });
        setIsModalOpen(true);
      }}
      onDelete={() => setDeleteTarget(item)}
      showLinkButton={false}
    />,
  ]);

  const allSelected = useMemo(
    () => selectedRow.length === list.length && list.length > 0,
    [selectedRow.length, list.length],
  );

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='max-w-7xl mx-auto'>
        <div className='overflow-hidden overflow-y-auto py-6'>
          <div className="flex justify-between items-center">
            <h3>Home / <b>Product Families</b></h3>
            <Button className="border-[#3E4094] text-[#3E4094] mb-3" onClick={() => setIsModalOpen(true)}>
              Add
            </Button>
          </div>
          <div className='overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
            <div className="bg-white p-2 border-b mb-4">
              <SearchComponent
                isSearchShow
                filters={filters}
                setFilters={setFilters}
                isActionButton
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                handleAction={handleBulkAction}
                isStatusAction
                placeholder="Search by category"
                applyFilters={() => {
                  setPageNo(1);
                  setIsRefresh((v) => !v);
                }}
                handleSearchRemove={() => {
                  setFilters({ search: '' });
                  setPageNo(1);
                  setIsRefresh((v) => !v);
                }}
              />
            </div>
            <TableData
              Heading='Product Families'
              tableHeadings={[
                <input
                  key="select-all"
                  type="checkbox"
                  className='w-4 h-4 border border-[#4a4a4f] rounded bg-transparent'
                  checked={allSelected}
                  onChange={(event) =>
                    setSelectedRow(event.target.checked ? list.map((item) => idFromRecord(item)) : [])
                  }
                />,
                'Family Code',
                'Title',
                'Category',
                'Seller',
                'Status',
                'Actions',
              ]}
              data={rows}
              showSearch={false}
              showFilter={false}
              showSummary={false}
              totalData={total}
              totalSize={PAGE_SIZE}
              currentPage={pageNo}
              onPageChange={setPageNo}
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
        title={formData._editingId ? 'Edit Product Family' : 'Add Product Family'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Family Code" name="familyCode" value={formData.familyCode} onChange={handleInput} error={errors.familyCode} disabled={Boolean(formData._editingId)} />
          <FormInput label="Title" name="title" value={formData.title} onChange={handleInput} error={errors.title} />
          <FormInput label="Category" name="category" value={formData.category} onChange={handleInput} error={errors.category} />
          <FormInput label="Seller Id (optional)" name="sellerId" value={formData.sellerId} onChange={handleInput} />
          <FormInput label="Base Attributes (JSON)" name="baseAttributesText" value={formData.baseAttributesText} onChange={handleInput} error={errors.baseAttributesText} />
          <FormInput label="Variant Axes (JSON Array)" name="variantAxesText" value={formData.variantAxesText} onChange={handleInput} error={errors.variantAxesText} />
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded border" onClick={closeModal}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-[#3E4094] text-white">Save</button>
          </div>
        </form>
      </DefaultModal>

      {deleteTarget && (
        <DeletePopup
          Heading='Delete Product Family'
          Body='Are you sure you want to delete this product family?'
          onCancel={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
      )}

      {toggleTarget && (
        <StatusPopup
          title={toggleTarget.status === 'active' ? 'Deactivate Product Family' : 'Activate Product Family'}
          message={`Are you sure you want to ${toggleTarget.status === 'active' ? 'deactivate' : 'activate'} this product family?`}
          onConfirm={handleToggle}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </>
  );
};

export default ProductFamilies;

