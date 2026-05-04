/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import Loader from '../../../components/Loader/Loader'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import AddButton from '../../../components/Button/AddButton'
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup'
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect'
import MultiImageUpload from '../../../components/Atoms/ImageGallery/MultiImageUpload'
import selectJson from '../../../_helpers/SelectJson.json'
import { transformArray } from '../../../_helpers/globalFunctions'
import { createPromotionBanners, getPromotionBannersList, editPromotionBanner, enableDisablePromotionBanner, softDeletePromotionBanner } from '../../../Redux/promotionsSlice'

import { getAllBrandList, getAllProducts, getList } from '../../../Redux/productSlice'

const PAGE_SIZE = 10
const initialFormState = {
    name: '',
    type: '',
    targetId: '',
    content: {
        imageUrls: [],
        ctaText: '',
        ctaLink: ''
    },
    geoLocation: {
        isGlobal: true
    },
    schedule: {
        startDate: '',
        endDate: ''
    },
    priority: "",
    _id: "",
    isDisable: false
};

const PromotionsBanner = () => {
    const dispatch = useDispatch();
    const [apiRes, setApiRes] = useState({ list: [], total: 0 });
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [isAddModal, setIsAddModal] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [filters, setFilters] = useState({ search: "" });
    const [isLoading, setIsLoading] = useState(false)
    const [isApproveModal, setIsApproveModal] = useState(false)
    const [selectedData, setSelectedData] = useState(null)
    const [images, setImages] = useState([])
    const [formData, setFormData] = useState(initialFormState)
    const [targetIdData, setTargetIdData] = useState(null)
    const [errors, setErrors] = useState({});


    const validateForm = () => {
        const newErrors = {};
        if (!formData.name?.trim()) {
            newErrors.name = 'Name is required';
        }
        if (!formData.type) {
            newErrors.type = 'Type is required';
        }
        if (formData.type && formData.type !== 'general' && !formData.targetId) {
            newErrors.targetId = `Target ${formData.type} is required`;
        }

        if (!images || images.length === 0) {
            newErrors.images = 'At least one image is required';
        }
        if (!formData.priority) {
            newErrors.priority = 'Priority is required';
        }
        if (!formData.schedule?.startDate) {
            newErrors.startDate = 'Start date is required';
        }
        if (!formData.schedule?.endDate) {
            newErrors.endDate = 'End date is required';
        }
        if (formData.schedule?.startDate && formData.schedule?.endDate) {
            const start = new Date(formData.schedule.startDate);
            const end = new Date(formData.schedule.endDate);
            if (start >= end) {
                newErrors.endDate = 'End date must be after start date';
            }
        }
        if (formData.priority < 0 ) {
            newErrors.priority = 'Priority cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const fetchPromotionBanners = useCallback(async () => {
        const query = {
            page: pageNo,
            size: PAGE_SIZE,
            select: 'name isDisable content geoLocation schedule priority targetId type',
            keyWord: '',
            searchFields: 'name',
            sortOrder: 'desc',
            sortBy: "createdAt"
        };

        setIsLoading(true);
        try {
            const res = await dispatch(getPromotionBannersList(query)).unwrap();
            setApiRes(res?.data || { list: [], total: 0 });
        } catch (error) {
            toast.error(error?.message || 'Failed to fetch promotion banners');
            setApiRes({ list: [], total: 0 });
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, pageNo,]);




    // Function to format timestamp to date input format
    const formatTimestampToDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0];
    };

    useEffect(() => {
        fetchPromotionBanners();
    }, [fetchPromotionBanners]);

    const getAllRowIds = useCallback(() => {
        return apiRes?.list?.map(row => row?._id) || [];
    }, [apiRes?.list]);

    const closeModal = () => {
        setIsAddModal(false);
        setIsEditMode(false);
        setFormData(initialFormState);
        setErrors({});
        setImages([]);
        setTargetIdData(null);
    };

    const handlePageChange = (newPageNo) => {
        setPageNo(newPageNo);
    };

    const handleHeaderCheckboxChange = (e) => {
        setSelectedRow(e.target.checked ? getAllRowIds() : []);
    };

    const handleRowCheckboxChange = (e, rowId) => {
        setSelectedRow(prev =>
            e.target.checked
                ? [...prev, rowId]
                : prev.filter(id => id !== rowId)
        )
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (["title", "subtitle", "backgroundColor", "textColor", "ctaText", "ctaLink"].includes(name)) {
            setFormData(prev => ({
                ...prev,
                content: { ...prev.content, [name]: value },
            }));
        }
        else if (["startDate", "endDate"].includes(name)) {
            setFormData(prev => ({
                ...prev,
                schedule: { ...prev.schedule, [name]: value },
            }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error('Please fix the validation errors');
            return;
        }

        const cleanGeoLocation = {
            isGlobal: formData.geoLocation?.isGlobal ?? true,
        };

        const schedule = {
            ...formData.schedule,
            startDate: formData.schedule?.startDate ? new Date(formData.schedule.startDate).getTime() : null,
            endDate: formData.schedule?.endDate ? new Date(formData.schedule.endDate).getTime() : null,
        };

        const payload = {
            name: formData.name,
            type: formData.type,
            targetId: formData.targetId,
            content: {
                imageUrls: images,
                ctaText: formData.content?.ctaText || '',
                ctaLink: formData.content?.ctaLink || ''
            },
            geoLocation: cleanGeoLocation,
            schedule,
            priority: formData.priority,
            isDisable: formData.isDisable,
            ...(isEditMode && { _id: formData._id })
        };

        try {
            if (isEditMode) {
                await dispatch(editPromotionBanner(payload)).unwrap();
                toast.success('Promotion banner updated successfully');
            } else {
                const { _id, ...createData } = payload;
                await dispatch(createPromotionBanners(createData)).unwrap();
                toast.success('Promotion banner created successfully');
            }
            closeModal();
            fetchPromotionBanners();
        } catch (error) {
            console.error("Error saving promotion banner:", error);
            toast.error(error || 'Failed to save promotion banner');
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    };

    const handleToggleStatus = async (data) => {
        setIsApproveModal(true);
        setSelectedData(data);
    };

    const handleConfirmStatusChange = async () => {
        if (!selectedData) return;

        try {
            const res = await dispatch(
                enableDisablePromotionBanner({
                    _id: [selectedData._id],
                    isDisable: !selectedData.isDisable
                })
            ).unwrap();

            toast.success(res?.message || 'Status updated successfully');
            fetchPromotionBanners();
        } catch (error) {
            toast.error(error?.message || 'Failed to update status');
        } finally {
            setIsApproveModal(false);
            setSelectedData(null);
        }
    };

    const handleDeleteBanner = async (data) => {
        try {
            const res = await dispatch(
                softDeletePromotionBanner({ _id: [data._id] })
            ).unwrap();

            toast.success(res?.message || 'Banner deleted successfully');
            fetchPromotionBanners();
        } catch (error) {
            toast.error(error?.message || 'Failed to delete banner');
        }
    };

    const handleBulkAction = async (action) => {
        if (!selectedRow.length) {
            toast.warning('Please select at least one banner');
            return;
        }

        try {
            setIsLoading(true);
            let res;

            if (action === "Active" || action === "Inactive") {
                res = await dispatch(
                    enableDisablePromotionBanner({
                        _id: selectedRow,
                        isDisable: action === "Inactive"
                    })
                ).unwrap();
            }
            else if (action === 'Delete') {
                res = await dispatch(
                    softDeletePromotionBanner({ _id: selectedRow })
                ).unwrap();
            }

            if (res) {
                toast.success(res.message);
                setSelectedRow([]);
                fetchPromotionBanners();
            }
        } catch (error) {
            toast.error(error?.message || 'Action failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectChange = async (selectValue, action) => {
        console.log(selectValue, action)
        if (action === "Type") {
            setFormData(prev => ({ ...prev, type: selectValue?.value, targetId: '' }));
            setTargetIdData(null);
            setErrors(prev => ({ ...prev, type: undefined }))

            if (errors.targetId) {
                setErrors(prev => ({ ...prev, targetId: undefined }));
            }
            try {
                let res;
                let formattedData;

                switch (selectValue?.value) {
                    case 'brand':
                        res = await dispatch(getAllBrandList()).unwrap();
                        formattedData = transformArray(res?.data?.list || []);
                        break;

                    case 'category':
                        res = await dispatch(getList()).unwrap();
                        formattedData = createCategoryOptions(res?.data);
                        break;

                    case 'product':
                        res = await dispatch(getAllProducts()).unwrap();
                        formattedData = transformArray(res?.data?.list || []);
                        break;

                    case "general":
                        setFormData(prev => ({ ...prev, targetId: null }));
                        return;

                    default:
                        return;
                }

                setTargetIdData(formattedData);
            } catch (error) {
                toast.error(`Failed to fetch ${selectValue?.value} data`);
                console.error(error);
            }
        } else {
            setFormData(prev => ({ ...prev, targetId: selectValue?.value }));

            // Clear targetId error when value is selected
            if (errors.targetId) {
                setErrors(prev => ({ ...prev, targetId: undefined }));
            }
        }
    };


    const handleToggleAction = (action) => {
        if (action === "DISABLE") {
            setFormData(prev => ({ ...prev, isDisable: !prev.isDisable }));
        } else {
            setFormData(prev => ({
                ...prev,
                geoLocation: {
                    ...prev.geoLocation,
                    isGlobal: !prev.geoLocation.isGlobal,
                    // Reset geo-location fields when toggling to global

                },
            }));

        }
    };

    // Helper function for category options
    const createCategoryOptions = (categories) => {
        const options = [];

        const addOptions = (categories, prefix = '') => {
            if (!Array.isArray(categories)) return;

            categories.forEach(category => {
                const label = prefix ? `${prefix} > ${category.name}` : category.name;
                options.push({
                    value: category._id,
                    label,
                });

                if (category.subcategories?.length) {
                    addOptions(category.subcategories, label);
                }
            });
        };

        addOptions(categories);
        return options;
    };

    const loadTargetData = async (type, targetId) => {
        try {
            let res;
            let formattedData;

            switch (type) {
                case 'brand':
                    res = await dispatch(getAllBrandList()).unwrap();
                    formattedData = transformArray(res?.data?.list || []);
                    break;

                case 'category':
                    res = await dispatch(getList()).unwrap();
                    formattedData = createCategoryOptions(res?.data);
                    break;

                case 'product':
                    res = await dispatch(getAllProducts()).unwrap();
                    formattedData = transformArray(res?.data?.list || []);
                    break;

                default:
                    return;
            }

            setTargetIdData(formattedData);
        } catch (error) {
            toast.error(`Failed to fetch ${type} data`);
            console.error(error);
        }
    }

    const tableHeadings = ["Name", "Status", "Start Date", "End Date", "Priority", "Action"];
    const tableRows = apiRes?.list?.map((banner) => [
        <CustomCheckbox
            checked={selectedRow.includes(banner._id)}
            onChange={(e) => handleRowCheckboxChange(e, banner._id)}
        />,
        <span className='capitalize'>{banner?.name}</span>,
        // <span className='capitalize'>{banner?.content?.title}</span>,
        <ToggleButton isToggle={!banner?.isDisable} handleClick={() => handleToggleStatus(banner)} />,
        <span>{new Date(banner?.schedule?.startDate).toLocaleDateString()}</span>,
        <span>{new Date(banner?.schedule?.endDate).toLocaleDateString()}</span>,
        <span>{banner?.priority}</span>,
        <ActionButtons
            onEdit={async () => {
                const editData = {
                    ...banner,
                    _id: banner._id,
                    type: banner.type,
                    targetId: banner.targetId,
                    schedule: {
                        startDate: formatTimestampToDate(banner.schedule?.startDate),
                        endDate: formatTimestampToDate(banner.schedule?.endDate)
                    }
                };

                setFormData(editData);
                setImages(banner.content.imageUrls);
                setIsEditMode(true);
                setIsAddModal(true);

                // Load target data if type is not general
                if (banner.type && banner.type !== 'general') {
                    await loadTargetData(banner.type, banner.targetId);
                }

                // Load geo-location data if not global

            }}
            showLinkButton={false}
            showDeleteButton={true}
            onDelete={() => handleDeleteBanner(banner)}
        />
    ]);

    const handleApplyFilter = async () => {
        const query = {
            page: pageNo,
            size: PAGE_SIZE,
            select: 'name isDisable content geoLocation schedule priority targetId type',
            keyWord: filters?.search || '',
            searchFields: 'name',
            sortOrder: 'asc',
            sortBy: "name"
        };

        setIsLoading(true);
        try {
            const res = await dispatch(getPromotionBannersList(query)).unwrap();
            setApiRes(res?.data || { list: [], total: 0 });
        } catch (error) {
            toast.error(error?.message || 'Failed to fetch promotion banners');
            setApiRes({ list: [], total: 0 });
        } finally {
            setIsLoading(false);
        }
    }

    const handleRemoveFilter = async () => {
        setFilters({ search: "" })
        const query = {
            page: pageNo,
            size: PAGE_SIZE,
            select: 'name isDisable content geoLocation schedule priority targetId type',
            keyWord: '',
            searchFields: 'name',
            sortOrder: 'asc',
            sortBy: "name"
        };

        setIsLoading(true);
        try {
            const res = await dispatch(getPromotionBannersList(query)).unwrap();
            setApiRes(res?.data || { list: [], total: 0 });
        } catch (error) {
            toast.error(error?.message || 'Failed to fetch promotion banners');
            setApiRes({ list: [], total: 0 });
        } finally {
            setIsLoading(false);
        }
    }


    return (
        <div className='md:p-6 p-3 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
            <Loader loading={isLoading} />

            <div className='flex justify-between items-center'>
                <h3>
                    <Link to="/app/home" className='cursor-pointer'>Home</Link> / <b>Promotion Banner</b>
                </h3>
                <AddButton onClick={() => setIsAddModal(true)} />
            </div>

            <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
                <SearchComponent
                    isSearchShow={true}
                    isActionButton={true}
                    filters={filters}
                    setFilters={setFilters}
                    isStatusAction={true}
                    selectedRow={selectedRow}
                    setSelectedRow={setSelectedRow}
                    placeholder={`Search by name`}
                    handleAction={handleBulkAction}
                    applyFilters={handleApplyFilter}
                    isDelete={true}
                    handleSearchRemove={handleRemoveFilter}
                />

                <TableData
                    tableHeadings={tableHeadings}
                    data={tableRows}
                    showSearch={true}
                    showFilter={false}
                    showSummary={false}
                    totalData={apiRes?.total}
                    totalSize={PAGE_SIZE}
                    currentPage={pageNo}
                    isHeaderCheckbox={true}
                    handleHeaderCheckboxChange={handleHeaderCheckboxChange}
                    allRowsSelected={selectedRow.length === apiRes?.list?.length}
                />

                {apiRes?.total > PAGE_SIZE && (
                    <Pagination
                        totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
                        currentPage={pageNo}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            <DefaultModal
                title={isEditMode ? 'Edit Promotion Banner' : 'Add Promotion Banner'}
                isOpen={isAddModal}
                onClose={closeModal}
                onSubmit={handleSubmit}
            >
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-3 mb-8'>
                    <Input labelName='Name' type='text' value={formData.name} name='name' onChange={handleInputChange} error={errors.name} required maxLength={25} />

                    <FilterSelect options={selectJson?.promotionBannerType} label={`Type`} placeholder={`Type`}
                        onChange={(value) => handleSelectChange(value, "Type")}
                        value={selectJson?.promotionBannerType?.find(opt => opt?.value === formData?.type)} error={errors.type} />

                    {formData.type && formData.type !== 'general' && (
                        <FilterSelect
                            options={targetIdData || []}
                            label={`Target ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}`}
                            placeholder={`Select ${formData.type}`}
                            onChange={(value) => handleSelectChange(value, "TargetId")}
                            error={errors.targetId}
                            value={targetIdData?.find(opt => opt?.value === formData?.targetId)}
                        />
                    )}



                    <Input type='text' labelName={`CTA Text`} value={formData?.content?.ctaText} name={'ctaText'} onChange={handleInputChange} error={errors?.ctaText} maxLength={75} />

                    <Input type='url' labelName={`CTA Link`} value={formData?.content?.ctaLink} name={'ctaLink'} onChange={handleInputChange} error={errors?.ctaLink} maxLength={75} />

                    <Input type='number' value={formData?.priority} onChange={handleInputChange} labelName={`Priority`} name="priority" min="0" error={errors.priority} />

                    <div className='col-span-2'>
                        <MultiImageUpload images={images} setImages={setImages} label="Banner Images" required maxFiles={6} errorMessage={errors.images} type={`PROMOTIONS_BANNER`} setError={setErrors} />
                    </div>

                    <Input type='date' value={formData?.schedule?.startDate} onChange={handleInputChange} labelName={`Start Date & Time`} name="startDate"
                        error={errors.startDate} required />

                    <Input type='date' value={formData?.schedule?.endDate} onChange={handleInputChange} labelName={`End Date & Time`} name="endDate"
                        error={errors.endDate} min={formData?.schedule?.startDate} required />

                    <div className="flex items-center justify-between col-span-2 border p-2 rounded">
                        <p className="font-medium">Active Status</p>
                        <ToggleButton isToggle={!formData.isDisable} handleClick={() => handleToggleAction("DISABLE")} />
                    </div>
                </div>
            </DefaultModal>
            <StatusPopup
                isOpen={isApproveModal}
                onClose={() => { setIsApproveModal(false); setSelectedData(null) }}
                onConfirm={handleConfirmStatusChange}
                heading={`Confirm to ${selectedData?.isDisable ? 'enable' : 'disable'} this banner?`}
            />
        </div>
    )
}

export default PromotionsBanner