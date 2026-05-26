/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

import BrandSetup from './components/BrandSetup';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import AddButton from '../../../components/Button/AddButton';
import Input from '../../../components/Atoms/Input/Input';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import Loader from '../../../components/Loader/Loader';

import {
  createBrand,
  getBrandList,
  updateBrand,
  deleteBrand,
  enableDisableBrand
} from '../../../Redux/productSlice';
import { uploadFile } from '../../../_helpers/globalFunctions';
import ImageUpload from '../../../components/Atoms/ImageGallery/ImageUpload';
import Pagination from '../../../components/Pagination/Pagination';
import { ExportButton } from '../../../components/Shared';
import { validateValues } from '../../../_helpers/validation';

const TABLE_HEADINGS = ["Logo", "Brand", "Thumbnail", "Status", "Action"];

const INITIAL_FORM_VALUES = {
  name: "",
  thumbnails: "",
  logo: "",
  _id: '',
  isDisable: false,
  PAGE_SIZE: 10
};

const VALIDATION_RULES = {
  name: {
    label: 'Brand name',
    required: true,
    minLength: 2,
    maxLength: 50
  },
  logo: {
    label: 'Logo',
    required: true
  },
  thumbnails: {
    label: 'Thumbnail',
    required: true
  }
};

const Brands = () => {
  const dispatch = useDispatch();

  const [brands, setBrands] = useState({ list: [], total: 0 });
  const [selectedImage, setSelectedImage] = useState(null);
  const [isBrandSetupOpen, setIsBrandSetupOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "" });
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [selectedRow, setSelectedRow] = useState([]);
  const [keyword, setKeyword] = useState("")
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "",
    selectedBrand: null
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const getAllRowIds = useMemo(() =>
    brands?.list?.map(row => row?._id) || [],
    [brands?.list]
  );

  const isAllRowsSelected = useMemo(() =>
    selectedRow.length === brands?.list?.length && brands?.list?.length > 0,
    [selectedRow.length, brands?.list?.length]
  );

  const validateForm = useCallback(() => {
    const newErrors = validateValues(formValues, VALIDATION_RULES);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues]);

  // API functions
  const fetchBrandList = useCallback(async (searchKeyword = filters?.search) => {
    const query = {
      page: pageNo,
      size: INITIAL_FORM_VALUES.PAGE_SIZE,
      select: 'name isDisable createdAt logo thumbnails',
      keyWord: searchKeyword || '',
      searchFields: 'name',
      sortOrder: 'desc',
      sortBy: "createdAt"
    };

    setIsLoading(true);
    try {
      const res = await dispatch(getBrandList(query)).unwrap();
      setBrands(res?.data || { list: [], total: 0 });
    } catch (err) {
      setBrands({ list: [], total: 0 });
      toast.error(err?.message || "Failed to fetch brands");
      console.error('Fetch brands error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo]);

  const handleCreateBrand = useCallback(async (brandData) => {
    try {
      setIsLoading(true);
      await dispatch(createBrand(brandData)).unwrap();
      toast.success('Brand created successfully');
      await fetchBrandList();
      return true;
    } catch (err) {
      toast.error(err?.message || 'Failed to create brand');
      console.error('Create brand error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, fetchBrandList]);

  const handleUpdateBrand = useCallback(async (brandData) => {
    try {
      setIsLoading(true);
      await dispatch(updateBrand(brandData)).unwrap();
      toast.success('Brand updated successfully');
      await fetchBrandList();
      return true;
    } catch (err) {
      toast.error(err?.message || 'Failed to update brand');
      console.error('Update brand error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, fetchBrandList]);

  const handleDeleteBrand = useCallback(async (brandId) => {
    try {
      setIsLoading(true);
      await dispatch(deleteBrand({ _id: [brandId] })).unwrap();
      toast.success('Brand deleted successfully');
      await fetchBrandList();
      setShowDeleteConfirmation(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete brand');
      console.error('Delete brand error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, fetchBrandList]);

  const handleToggleBrandStatus = useCallback(async (brand) => {
    try {
      setIsLoading(true)
      await dispatch(enableDisableBrand({
        _id: [brand._id],
        isDisable: !brand.isDisable
      })).unwrap();
      toast.success('Brand status updated successfully');
      await fetchBrandList();
    } catch (err) {
      toast.error(err?.message || 'Failed to update brand status');
      console.error('Toggle brand status error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, fetchBrandList]);

  // Event handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    const brandData = {
      name: formValues.name.trim(),
      thumbnails: formValues.thumbnails,
      logo: formValues.logo,
      isDisable: formValues?.isDisable
    };

    let success = false;

    if (modalState.type === 'ADD') {
      success = await handleCreateBrand(brandData);
    } else if (modalState.type === 'EDIT') {
      brandData._id = formValues._id;
      success = await handleUpdateBrand(brandData);
    }

    if (success) {
      handleCloseModal();
    }
  }, [formValues, modalState.type, validateForm, handleCreateBrand, handleUpdateBrand]);

  const handleImageClick = useCallback((imageUrl) => {
    setSelectedImage(imageUrl);
  }, []);

  const handleAction = useCallback((type, brand = null) => {
    if (type === 'EDIT' && brand) {
      setFormValues({
        name: brand.name || "",
        thumbnails: brand.thumbnails || "",
        logo: brand.logo || "",
        _id: brand._id,
        isDisable: brand?.isDisable
      });
    } else {
      setFormValues(INITIAL_FORM_VALUES);
    }

    setErrors({});
    setModalState({
      isOpen: true,
      type,
      selectedBrand: brand
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, type: "", selectedBrand: null });
    setFormValues(INITIAL_FORM_VALUES);
    setErrors({});
  }, []);

  const handleDelete = useCallback(() => {
    if (modalState.selectedBrand?._id) {
      handleDeleteBrand(modalState.selectedBrand._id);
    }
  }, [modalState.selectedBrand, handleDeleteBrand]);

  const handleFileUpload = useCallback(async (file, type) => {
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
    const fileExtension = file.name?.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Only JPG/PNG/WEBP files are allowed');
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size should not exceed 5MB');
      return;
    }

    try {
      setIsImageLoading(true);
      const uploadedImage = await uploadFile(file, type);
      setFormValues((prev) => ({
        ...prev,
        ...(type === 'BRANDS'
          ? { logo: uploadedImage }
          : { thumbnails: uploadedImage })
      }));
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error('File upload failed. Please try again.');
    } finally {
      setIsImageLoading(false);
    }
  }, []);

  const handleHeaderCheckboxChange = useCallback((e) => {
    setSelectedRow(e.target.checked ? getAllRowIds : []);
  }, [getAllRowIds]);

  const handleRowCheckboxChange = useCallback((e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  }, []);

  const handleBulkAction = useCallback(async (action) => {
    if (!selectedRow.length) {
      toast.error('Please select items first');
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (action === "Active" || action === "Inactive") {
        const apiPayload = {
          _id: selectedRow,
          isDisable: action === "Inactive"
        };
        res = await dispatch(enableDisableBrand(apiPayload)).unwrap();
      } else if (action === 'Delete') {
        const apiPayload = { _id: selectedRow };
        res = await dispatch(deleteBrand(apiPayload)).unwrap();
      }

      toast.success(res?.message || `${action} operation completed successfully`);
      setSelectedRow([]);
      fetchBrandList();
    } catch (error) {
      toast.error(error?.message || `Failed to ${action.toLowerCase()} items`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRow, dispatch, fetchBrandList]);

  // Effects
  useEffect(() => {
    fetchBrandList();
  }, [fetchBrandList]);

  const handleSearchRemove = async () => {
    setFilters({ search: "" })
    const query = {
      page: pageNo,
      size: INITIAL_FORM_VALUES.PAGE_SIZE,
      select: 'name isDisable createdAt logo thumbnails',
      keyWord: '',
      searchFields: 'name',
      sortOrder: 'desc',
      sortBy: "createdAt"
    };
    setIsLoading(true);
    try {
      const res = await dispatch(getBrandList(query)).unwrap();
      setBrands(res?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error(err?.message || "Failed to fetch batch");
      setBrands({ list: [], total: 0 });
    } finally {
      setIsLoading(false);
    }
  }
  const handleApplySearchFilters = async () => {
    const query = {
      page: pageNo,
      size: INITIAL_FORM_VALUES.PAGE_SIZE,
      select: 'name isDisable createdAt logo thumbnails',
      keyWord: filters?.search || '',
      searchFields: 'name',
      sortOrder: 'desc',
      sortBy: "createdAt"
    };

    setIsLoading(true);
    try {
      const res = await dispatch(getBrandList(query)).unwrap();
      setBrands(res?.data || { list: [], total: 0 });
    } catch (err) {
      setBrands({ list: [], total: 0 });
      toast.error(err?.message || "Failed to fetch brands");
      console.error('Fetch brands error:', err);
    } finally {
      setIsLoading(false);
    }
  }
  // Table rows memoization
  const tableRows = useMemo(() =>
    brands?.list?.map((brand) => [
      <CustomCheckbox
        key={`checkbox-${brand._id}`}
        checked={selectedRow.includes(brand._id)}
        onChange={(e) => handleRowCheckboxChange(e, brand._id)}
      />,
      <span
        key={`logo-${brand._id}`}
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => handleImageClick(brand.logo)}
      >
        {brand.logo ? (
          <img
            src={brand.logo}
            alt={brand.name}
            className='object-cover border rounded w-14 h-14'
            onError={(e) => {
              e.target.src = '/LOGO.png';
              e.target.alt = 'Logo not found';
            }}
          />
        ) : (
          <div className="flex items-center justify-center bg-gray-200 border rounded w-14 h-14">
            <span className="text-xs text-gray-500">No Logo</span>
          </div>
        )}
      </span>,
      <span key={`name-${brand._id}`} className="font-medium capitalize">
        {brand.name}
      </span>,
      <span
        key={`thumbnail-${brand._id}`}
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => handleImageClick(brand.thumbnails)}
      >
        {brand.thumbnails ? (
          <img
            src={brand.thumbnails}
            alt="Thumbnail"
            className='object-cover border rounded w-14 h-14'
            onError={(e) => {
              e.target.src = '/LOGO.png';
              e.target.alt = 'Thumbnail not found';
            }}
          />
        ) : (
          <div className="flex items-center justify-center bg-gray-200 border rounded w-14 h-14">
            <span className="text-xs text-gray-500">No Thumbnail</span>
          </div>
        )}
      </span>,
      <ToggleButton
        key={`toggle-${brand._id}`}
        isToggle={!brand.isDisable}
        handleClick={() => handleToggleBrandStatus(brand)}
        requiredModule="products"
      />,
      <ActionButtons
        key={`actions-${brand._id}`}
        onDelete={() => {
          setModalState(prev => ({ ...prev, selectedBrand: brand }));
          setShowDeleteConfirmation(true);
        }}
        showLinkButton={false}
        onEdit={() => handleAction('EDIT', brand)}
        requiredModule="products"
      />
    ]) || [],
    [brands?.list, selectedRow, handleRowCheckboxChange, handleImageClick, handleToggleBrandStatus, handleAction]
  );

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  return (
    <div className='p-6 mx-auto space-y-3 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl'>
      <Loader loading={isLoading || isImageLoading} />

      <div className='flex items-center justify-between'>
        <h3 className='text-sm'>Product / Brand</h3>
        <div className="flex items-center gap-2">
          <ExportButton data={brands?.list || []} filename="brands" requiredModule="products" />
          <AddButton onClick={() => handleAction('ADD')} requiredModule="products" />
        </div>
      </div>

      <div className='overflow-auto overflow-y-auto bg-white'>
        <div className='p-4 mb-2 border-b'>
          <SearchComponent
            isActionButton={true}
            filters={filters}
            isStatusAction={true}
            isDelete={true}
            setFilters={setFilters}
            isHeaderCheckbox={true}
            handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            allRowsSelected={isAllRowsSelected}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            handleAction={handleBulkAction}
            handleSearchRemove={handleSearchRemove}
            applyFilters={handleApplySearchFilters}
            requiredModule="products"
          />
        </div>

        <TableData
          Heading="Brands"
          tableHeadings={TABLE_HEADINGS}
          data={tableRows}
          loading={isLoading}
          totalData={brands?.total || 0}
          totalSize={brands?.list?.length || 0}
          isHeaderCheckbox={true}
          currentPage={pageNo}
          pageSize={INITIAL_FORM_VALUES.PAGE_SIZE}
          onPageChange={setPageNo}
          showSearch={true}
          showFilter={false}
          showSummary={false}
          searchTerm={keyword}
          setSearchTerm={setKeyword}
          handleHeaderCheckboxChange={handleHeaderCheckboxChange}
          allRowsSelected={isAllRowsSelected}

        />
      </div>
      {brands?.total > INITIAL_FORM_VALUES.PAGE_SIZE && (
        <Pagination
          totalPages={Math.ceil(brands?.total / INITIAL_FORM_VALUES.PAGE_SIZE)}
          currentPage={pageNo}
          onPageChange={onPageChange}
        />
      )}

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        confirmDelete={handleDelete}
        DeleteHeading={`Are you sure you want to delete ${modalState.selectedBrand?.name}?`}
      />

      <ImageViewer
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      <BrandSetup
        isOpen={isBrandSetupOpen}
        handleClose={() => setIsBrandSetupOpen(false)}
      />

      <DefaultModal
        title={modalState.type === 'EDIT' ? "Edit Brand" : "Add Brand"}
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      >
        <div className='p-4 space-y-4'>
          <Input
            labelName="Brand Name"
            name="name"
            value={formValues.name}
            onChange={handleInputChange}
            error={errors.name}
            placeholder="Enter brand name"
          />
          <ImageUpload label='Thumbnails' onChange={(file) => handleFileUpload(file, 'THUMBNAILS')} file={formValues?.thumbnails} />
          <ImageUpload label='logo' onChange={(file) => handleFileUpload(file, 'BRANDS')} file={formValues?.logo} />

        </div>
      </DefaultModal>
    </div>
  );
};

export default Brands;
