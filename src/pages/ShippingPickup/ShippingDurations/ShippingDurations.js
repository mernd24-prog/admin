/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { useDispatch, useSelector } from 'react-redux';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { toast } from 'sonner';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';
import Input from '../../../components/Atoms/Input/Input';
import { getAllStoreList } from '../../../Redux/productSlice';
import AddButton from '../../../components/Button/AddButton';
import { useNavigate } from 'react-router';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import { transformArray } from '../../../_helpers/globalFunctions';
import { Link } from 'react-router-dom';
import { createShipping, enableDisableShipping, getListShipping, softDeleteShipping, updateShipping } from '../../../Redux/cmsSlice';

const ShippingDurations = () => {
    const dispatch = useDispatch();
    const [toggleStates, setToggleStates] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [formData, setForm] = useState({
        _id: '',
        store_id: '',
        duration: '',
        isDisable: false
    });
    const [errors, setErrors] = useState({});
    const [keyword, setKeyword] = useState('');
    const [filters, setFilters] = useState({ search: "" });
    const [isRefresh, setIsRefresh] = useState(false);
    const [isOpenAddModal, setIsOpenAddModal] = useState(false);
    const [isOpenEditModal, setIsEditModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [deleteData, setDeleteData] = useState("")
    const [selectedStore, setSelectedStore] = useState(null);
    const [userData, setUserData] = useState({})
    const onPageChange = (newPageNo) => {
        setPageNo(newPageNo);
    };

    const size = 10
    const navigate = useNavigate()

    useEffect(() => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            searchFields: 'duration',
            select: 'duration isDisable',
            populate: 'store_id:name|user_id:userName email'
        };
        dispatch(getListShipping(reqData));
    }, [size, pageNo, isRefresh]);

    const selector = useSelector(state => state.cms);
    const getListData = selector?.getListShippingData?.data?.data?.list;

    const handleInputChange = e => {
        const { name, value } = e.target;
        setForm(prevData => ({
            ...prevData,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        if (!formData?.store_id) {
            newErrors.store_id = 'Store is Required';
            isValid = false;
        }

        const strictDurationRegex = /^(\d+)\s*(hours|days|months|years)$/i;
        const flexibleDurationRegex = /^(?=.*\d)(?=.*(hour|day|week|month|year|business day)).*$/i;

        if (!formData?.duration) {
            newErrors.duration = 'Duration is required';
            isValid = false;
        } else {
            const value = formData.duration.trim();
            if (!strictDurationRegex.test(value) && !flexibleDurationRegex.test(value)) {
                newErrors.duration = 'Duration must be in a valid format (e.g., "12 hours", "3 to 5 business days", "within 2 weeks")';
                isValid = false;
            }
        }
        setErrors(newErrors);
        return isValid;
    };

    const handleClose = () => {
        setIsOpenAddModal(false);
        setForm({
            store_id: '',
            duration: '',
            isDisable: false
        });
        setSelectedStore(null);
        setErrors({});
    };

    const productSelector = useSelector(state => state.product);
    const storeList = productSelector?.getAllStoreListData?.data?.data?.list || [];
    console.log("userData.roleId ", userData.roleId)
    const storeOptions = transformArray(storeList)

    const handleAddSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const reqData = {
            store_id: formData.store_id,
            duration: formData.duration,
            isDisable: formData.isDisable
        };

        dispatch(createShipping(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                    return
                } else {
                    toast.success(res.message || "Shipping duration created successfully");
                    handleClose();
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error || "Error in creating shipping duration");
            });
    };

    const handleRowCheckboxChange = (e, rowId) => {
        setSelectedRow(prev =>
            e.target.checked
                ? [...prev, rowId]
                : prev.filter(id => id !== rowId)
        );
    };

    const tableRows = getListData?.map((shipping) => {
        const rowData = [];

        // Add checkbox column only for admin (roleId 3)
        if (userData.roleId === 3) {
            rowData.push(
                <CustomCheckbox
                    key={`checkbox-${shipping._id}`}
                    checked={selectedRow.includes(shipping._id)}
                    onChange={(e) => handleRowCheckboxChange(e, shipping._id)}
                />
            );
        }

        // Store Name column (for all roles)
        rowData.push(
            <span key={`store-${shipping._id}`} className="capitalize">
                <h1>{shipping?.store_id?.name || 'N/A'}</h1>
            </span>
        );

        // User column (only for non-admin roles)
        if (userData.roleId !== 3) {
            rowData.push(
                <span key={`user-${shipping._id}`} className="capitalize">
                    <h1>{shipping?.user_id?.userName || 'N/A'}</h1>
                    <h1 className='text-gray-400'>{shipping?.user_id?.email}</h1>
                </span>
            );
        }

        // Duration column (for all roles)
        rowData.push(
            <span key={`duration-${shipping._id}`} className="capitalize">
                <h1>{shipping?.duration || 'N/A'}</h1>
            </span>
        );

        // Status column (for all roles)
        rowData.push(
            <div className='flex flex-col' key={`status-${shipping._id}`}>
                <ToggleButton
                    isToggle={!shipping?.isDisable}
                    handleClick={userData.roleId === 3 ? () => handleToggle(shipping) : () => { }}
                />
            </div>
        );

        // Actions column (only for admin)
        if (userData.roleId === 3) {
            rowData.push(
                <span key={`actions-${shipping._id}`}>
                    <ActionButtons
                        onEdit={() => {
                            setForm({
                                _id: shipping._id,
                                store_id: shipping.store_id._id,
                                duration: shipping.duration,
                                isDisable: shipping.isDisable
                            });
                            setSelectedStore({
                                value: shipping.store_id._id,
                                label: shipping.store_id.name
                            });
                            setIsEditModal(true);
                        }}
                        onDelete={() => {
                            setDeleteData({ _id: Array(shipping._id) })
                            setShowDeleteConfirmation(true)
                        }}
                        showLinkButton={false}
                        showListing={false}
                    />
                </span>
            );
        }

        return rowData;
    });

    const confirmDelete = () => {
        dispatch(softDeleteShipping(deleteData)).unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error)
                    return
                }
                else {
                    toast.success(res.message || "Shipping duration deleted successfully")
                    setShowDeleteConfirmation(false);
                    setIsRefresh(!isRefresh)
                }
            }).catch((error) => {
                toast.error(error?.message || "Error in deleting shipping duration")
            })
    };

    const handleDisableFunc = () => {
        if (!toggleStates) return;
        const obj = {
            _id: Array(toggleStates._id),
            isDisable: !toggleStates.isDisable
        };

        dispatch(enableDisableShipping(obj))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || "Status updated successfully");
                    setIsConfirmModalOpen(false);
                    setToggleStates(null);
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error?.message || "Error in updating status");
            });
    };

    const handleToggle = (shipping) => {
        setToggleStates(shipping);
        setIsConfirmModalOpen(true);
    };

    const handleBulkAction = async (action) => {
        if (selectedRow.length === 0) {
            toast.error("Please select at least one shipping duration");
            return;
        }

        if (action === "Active" || action === "Inactive") {
            let apiPayload = {
                _id: selectedRow,
                isDisable: action === "Active" ? false : true
            };
            try {
                const res = await dispatch(enableDisableShipping(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                    setSelectedRow([]);
                    setIsRefresh(!isRefresh)
                }
            } catch (error) {
                toast.error(error?.message || error || "Failed to update status");
            }
        } else if (action === "Delete") {
            setDeleteData({ _id: selectedRow });
            setShowDeleteConfirmation(true);
        }
    };

    const handleEditClose = () => {
        setIsEditModal(false);
        setForm({
            _id: '',
            store_id: '',
            duration: '',
            isDisable: false
        });
        setSelectedStore(null);
        setErrors({});
    };

    const handleToggleAdd = () => {
        setForm(prev => ({
            ...prev,
            isDisable: !prev.isDisable,
        }));
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const reqData = {
            _id: formData._id,
            duration: formData.duration,
            isDisable: formData.isDisable
        };

        dispatch(updateShipping(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || "Shipping duration updated successfully");
                    setIsEditModal(false);
                    setForm({
                        _id: '',
                        store_id: '',
                        duration: '',
                        isDisable: false
                    });
                    setSelectedStore(null);
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error?.message || "Error in updating shipping duration");
            });
    };

    const handleSelectAllChange = (e) => {
        if (e.target.checked) {
            const allIds = getListData?.map(shipping => shipping._id) || [];
            setSelectedRow(allIds);
        } else {
            setSelectedRow([]);
        }
    };

    const handleSearchRemove = useCallback(() => {
        setFilters(prev => ({ ...prev, search: "" }));
        setKeyword("");
        setPageNo(1);
        setIsRefresh(!isRefresh)
    }, [dispatch, size, isRefresh]);

    const isAllRowsSelected = useMemo(() =>
        selectedRow.length === selector?.getListShippingData?.data?.data?.list?.length &&
        selector?.getListShippingData?.data?.data?.list?.length > 0,
        [selectedRow.length, selector?.getListShippingData?.data?.data?.list?.length]
    );

    useEffect(() => {
        dispatch(getAllStoreList())
    }, []);

    const handleStoreChange = (selectedOption) => {
        setSelectedStore(selectedOption);
        setForm(prev => ({
            ...prev,
            store_id: selectedOption.value
        }));

        if (errors.store_id) {
            setErrors(prev => ({
                ...prev,
                store_id: undefined
            }));
        }
    };

    const handleApplySearchFilters = () => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            searchFields: 'duration',
            select: 'duration isDisable',
            populate: 'store_id:name|user_id:userName email'
        };
        dispatch(getListShipping(reqData));
        setIsRefresh(!isRefresh)
    }

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
    // Generate table headings based on user role
    const tableHeadings = useMemo(() => {
        const headings = [];
        headings.push("Store Name");

        // User column for non-admin
        if (userData.roleId !== 3) {
            headings.push("Users");
        }

        // Common columns
        headings.push("Durations", "Status");

        // Actions column for admin
        if (userData.roleId === 3) {
            headings.push("Actions");
        }

        return headings;
    }, [userData.roleId]);

    return (
        <>
            <Loader loading={selector.loading} />
            <div className='max-w-7xl mx-auto'>
                <div className=' overflow-hidden overflow-y-auto py-6'>
                    <div className="flex justify-between items-center">
                        <h3><Link to="/app/home" className='cursor-pointer'>Home</Link> / <b>Shipping Durations</b></h3>
                        {userData?.roleId === 3 && (<AddButton className="mb-2" onClick={() => {
                            setIsOpenAddModal(true);
                        }} />)}
                    </div>
                    <div className='overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
                        <div className="max-w-auto mx-auto space-y-6">
                            <div className="bg-white p-2">
                                <div className="border-b mb-4">
                                    <SearchComponent
                                        filters={filters}
                                        setFilters={setFilters}
                                        isActionButton={true}
                                        selectedRow={selectedRow}
                                        setSelectedRow={setSelectedRow}
                                        handleAction={handleBulkAction}
                                        isStatusAction={userData.roleId === 3}
                                        isDelete={userData.roleId === 3}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="Search by duration"
                                        handleSearchRemove={handleSearchRemove}
                                        applyFilters={handleApplySearchFilters}
                                    />
                                </div>
                            </div>
                        </div>
                        <TableData
                            Heading='Shipping Durations Management'
                            tableHeadings={tableHeadings}
                            data={tableRows}
                            showSearch={false}
                            showFilter={true}
                            onFilterChange={handleBulkAction}
                            showSummary={false}
                            totalData={selector?.getListShippingData?.data?.data?.total}
                            totalSize={size}
                            currentPage={pageNo}
                            onPageChange={onPageChange}
                            isHeaderCheckbox={userData.roleId === 3}
                            handleHeaderCheckboxChange={handleSelectAllChange}
                            allRowsSelected={isAllRowsSelected}
                        />
                    </div>
                    <div className="flex justify-center my-6">
                        {selector?.getListShippingData?.data?.data?.total && size && Math.ceil(selector?.getListShippingData?.data?.data?.total / size) > 1 && (
                            <Pagination
                                totalPages={Math.ceil(selector?.getListShippingData?.data?.data?.total / size)}
                                currentPage={pageNo}
                                onPageChange={onPageChange}
                            />
                        )}
                    </div>
                </div>

                {/* Add Modal */}
                <DefaultModal
                    isOpen={isOpenAddModal}
                    onClose={handleClose}
                    onSubmit={handleAddSubmit}
                    isButtonView={true}
                    submitButtonText="Submit"
                    closeButtonText="Cancel"
                    title="Add Shipping Duration"
                    titleClassName="mt-5 font-medium"
                >
                    <div className='flex space-x-4'>
                        <div className="w-full">
                            <div className='px-4 pt-2'>
                                <FilterSelect
                                    options={storeOptions}
                                    label="Store"
                                    value={selectedStore}
                                    onChange={handleStoreChange}
                                    error={errors.store_id}
                                    required
                                />
                            </div>
                            <div className="px-4 pt-2">
                                <Input
                                    labelName="Duration"
                                    name="duration"
                                    type="text"
                                    value={formData.duration}
                                    placeholder="Enter duration (e.g., 3 to 5 business days)"
                                    onChange={handleInputChange}
                                    error={errors.duration}
                                    required
                                />

                            </div>

                        </div>
                    </div>

                    <div className='flex justify-between items-center border p-3 mt-4'>
                        <p className="font-medium text-sm">Status</p>
                        <ToggleButton
                            isToggle={!formData.isDisable}
                            handleClick={handleToggleAdd}
                        />
                    </div>
                </DefaultModal>

                {/* Edit Modal */}
                <DefaultModal
                    isOpen={isOpenEditModal}
                    onClose={handleEditClose}
                    onSubmit={handleEditSubmit}
                    isButtonView={true}
                    submitButtonText="Update"
                    closeButtonText="Cancel"
                    title="Edit Shipping Duration"
                    titleClassName="mt-5 font-medium"
                >
                    <div className='flex space-x-4'>
                        <div className="w-full">
                            <div className='px-4 pt-2'>
                                <FilterSelect
                                    options={storeOptions}
                                    label="Store"
                                    value={selectedStore}
                                    onChange={handleStoreChange}
                                    error={errors.store_id}
                                    required
                                />
                            </div>
                            <div className="px-4 pt-2">
                                <Input
                                    labelName="Duration"
                                    name="duration"
                                    type="text"
                                    value={formData.duration}
                                    placeholder="Enter duration (e.g., 3 to 5 business days)"
                                    onChange={handleInputChange}
                                    error={errors.duration}
                                    required
                                />
                            </div>

                        </div>
                    </div>

                    <div className='flex justify-between items-center border p-3 mt-4'>
                        <p className="font-medium text-sm">Status</p>
                        <ToggleButton
                            isToggle={!formData.isDisable}
                            handleClick={handleToggleAdd}
                        />
                    </div>
                </DefaultModal>

                <DeletePopup
                    isDeleteModalOpen={showDeleteConfirmation}
                    closeDeleteModal={() => setShowDeleteConfirmation(false)}
                    confirmDelete={confirmDelete}
                    DeleteHeading={'Are you sure you want to delete the selected shipping duration?'}
                />

                <StatusPopup
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDisableFunc}
                    heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this shipping duration?`}
                />
            </div>
        </>
    )
}

export default ShippingDurations