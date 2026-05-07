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
import AddButton from '../../../components/Button/AddButton';
import { useNavigate } from 'react-router';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import { Link } from 'react-router-dom';
import { createCategory, deleteCategory, enableDisableCategory, getCategoryList, updateCMSCategory } from '../../../Redux/cmsSlice';
import { roleBasedAccess2 } from '../../../_helpers/globalFunctions';


const HelpAndSupport = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [toggleStates, setToggleStates] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [filters, setFilters] = useState({ search: "" });
    const [isRefresh, setIsRefresh] = useState(false);
    const [isOpenAddModal, setIsOpenAddModal] = useState(false);
    const [isOpenEditModal, setIsEditModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [deleteData, setDeleteData] = useState("");


    // Form state
    const [formData, setForm] = useState({
        _id: '',
        name: '',
        store_id: '',
        isDisable: false
    });

    const [errors, setErrors] = useState({});
    const size = 10;
    const accessOptions = roleBasedAccess2();

    // Fetch data on mount and when dependencies change
    useEffect(() => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            searchFields: 'name',
            select: 'name isDisable role_id',
            query: JSON.stringify({ type: "help-and-support", })
        };
        dispatch(getCategoryList(reqData));
    }, [dispatch, size, pageNo, isRefresh]);

    const selector = useSelector(state => state.cms);
    const getListData = selector?.getCategoryListData?.data?.data?.list;
    const onPageChange = (newPageNo) => {
        setPageNo(newPageNo);
    };
    // Input change handler
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

    // Form validation
    const validateAddUserForm = () => {
        const newErrors = {};
        let isValid = true;

        if (!formData?.name) {
            newErrors.name = 'Name is required';
            isValid = false;
        } else if (formData?.name.length < 3) {
            newErrors.name = 'Name must be at least 3 characters';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Modal handlers
    const handleClose = () => {
        setIsOpenAddModal(false);
        setForm({
            _id: '',
            name: '',
            store_id: '',
            isDisable: false
        });

        setErrors({});
    };

    const handleEditClose = () => {
        setIsEditModal(false);
        setForm({
            _id: '',
            name: '',
            store_id: '',
            isDisable: false
        });

        setErrors({});
    };

    // Form submission handlers
    const handleAddUserSubmit = (e) => {
        e.preventDefault();

        if (!validateAddUserForm()) return;

        const reqData = {
            type: "help-and-support",
            role_id: "5",
            name: formData.name,
            isDisable: formData.isDisable
        };

        dispatch(createCategory(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(res.message || "FAQ category created successfully");
                handleClose();
                setIsRefresh(!isRefresh);
            })
            .catch((error) => {
                console.error("Error creating FAQ category:", error);
                toast.error(error || "Error in creating FAQ category");
            });
    };

    const handleEditUserSubmit = (e) => {
        e.preventDefault();

        if (!validateAddUserForm()) return;

        const reqData = {
            _id: formData._id,
            type: "help-and-support",
            role_id: "5",
            name: formData.name,
            isDisable: formData.isDisable
        };

        dispatch(updateCMSCategory(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(res.message || "FAQ category updated successfully");
                handleEditClose();
                setIsRefresh(!isRefresh);
            })
            .catch((error) => {
                console.error("Error updating FAQ category:", error);
                toast.error(error || "Error in updating FAQ category");
            });
    };

    // User selection handler


    // Row selection handlers
    const handleRowCheckboxChange = (e, rowId) => {
        setSelectedRow(prev =>
            e.target.checked
                ? [...prev, rowId]
                : prev.filter(id => id !== rowId)
        );
    };

    const handleSelectAllChange = (e) => {
        if (e.target.checked) {
            const allIds = getListData?.map(user => user._id) || [];
            setSelectedRow(allIds);
        } else {
            setSelectedRow([]);
        }
    };

    // Delete handlers
    const confirmDelete = () => {
        dispatch(deleteCategory(deleteData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(res.message || "FAQ category deleted successfully");
                setShowDeleteConfirmation(false);
                setIsRefresh(!isRefresh);
            })
            .catch((error) => {
                console.error("Error deleting FAQ category:", error);
                toast.error(error || "Error in deleting FAQ category");
            });
    };

    // Toggle handlers
    const handleToggleAdd = () => {
        setForm(prev => ({
            ...prev,
            isDisable: !prev.isDisable,
        }));
    };

    const handleToggle = (user) => {
        setToggleStates(user);
        setIsConfirmModalOpen(true);
    };

    const handleDisableFunc = () => {
        if (!toggleStates) return;
        const obj = {
            _id: Array(toggleStates._id),
            isDisable: !toggleStates.isDisable
        };

        dispatch(enableDisableCategory(obj))
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
                console.error("Error updating status:", error);
                toast.error(error.message || "Error in updating status");
            });
    };

    // Bulk actions
    const handleBulkAction = async (action) => {
        if (action === "Active" || action === "Inactive") {
            let apiPayload = {
                _id: selectedRow,
                isDisable: action === "Active" ? false : true
            };
            try {
                const res = await dispatch(enableDisableCategory(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                    setIsRefresh(!isRefresh);
                    setSelectedRow([]);
                }
            } catch (error) {
                toast.error(error?.message || error || "Failed to perform bulk action");
                if (error.errors) {
                    setErrors(error.errors);
                }
            }
        }
    };

    // Search and filter handlers
    const handleApplySearchFilters = () => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            searchFields: 'name',
            select: 'name isDisable role_id'
        };
        dispatch(getCategoryList(reqData));
        setIsRefresh(!isRefresh);
    };

    const handleSearchRemove = useCallback(() => {
        setFilters(prev => ({ ...prev, search: "" }));
        setKeyword("");
        setPageNo(1);
        setIsRefresh(!isRefresh);
    }, [dispatch, size, isRefresh]);

    // Edit handler
    const handleEdit = (user) => {
        setForm({
            _id: user._id,
            name: user.name,
            store_id: user.role_id,
            isDisable: user.isDisable
        });




        setIsEditModal(true);
    };

    const tableRows = getListData?.map((user) => [
        <CustomCheckbox
            key={`checkbox-${user._id}`}
            checked={selectedRow.includes(user._id)}
            onChange={(e) => handleRowCheckboxChange(e, user._id)}
        />,
        <span key={`name-${user._id}`} className="capitalize">
            {user?.name}
        </span>,
        <span key={`name-${user._id}`} className="capitalize">
            {user?.role_id === 3 ? "Seller" : "User"}
        </span>,
        <div className='flex flex-col'>
            <ToggleButton
                isToggle={!user?.isDisable}
                handleClick={() => handleToggle(user)}
            />
        </div>,
        <span key={`actions-${user._id}`}>
            <ActionButtons
                onEdit={() => handleEdit(user)}
                onDelete={() => {
                    setDeleteData({ _id: Array(user._id) });
                    setShowDeleteConfirmation(true);
                }}
                onListing={() => {
                    navigate(`/app/help-and-support/${user._id}`);
                }}
                showLinkButton={false}
                showListing={true}
            />
        </span>,
    ]);

    const isAllRowsSelected = useMemo(() =>
        selectedRow.length === selector?.getCategoryListData?.data?.data?.list?.length &&
        selector?.getCategoryListData?.data?.data?.list?.length > 0,
        [selectedRow.length, selector?.getCategoryListData?.data?.data?.list?.length]
    );

    return (
        <>
            <Loader loading={selector.loading} />
            <div className='max-w-7xl mx-auto'>
                <div className='overflow-hidden overflow-y-auto py-6'>
                    <div className="flex justify-between items-center">
                        <h3><Link to="/app/home">Home</Link> / <b>Help & Support</b></h3>
                        <AddButton
                            className="border-[#3E4094] text-[#3E4094] mb-3"
                            onClick={() => setIsOpenAddModal(true)}
                        >
                            Add
                        </AddButton>
                    </div>
                    <div className='overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
                        <div className="max-w-auto mx-auto space-y-6">
                            <div className="bg-white p-2">
                                <div className="border-b mb-4">
                                    <SearchComponent
                                        isSearchShow={true}
                                        filters={filters}
                                        setFilters={setFilters}
                                        isActionButton={true}
                                        selectedRow={selectedRow}
                                        setSelectedRow={setSelectedRow}
                                        handleAction={handleBulkAction}
                                        isStatusAction={true}
                                        placeholder="Search By Category Name"
                                        handleSearchRemove={handleSearchRemove}
                                        applyFilters={handleApplySearchFilters}
                                    />
                                </div>
                            </div>
                        </div>
                        <TableData
                            Heading='FAQ Categories'
                            tableHeadings={[
                                "Category Name", "Type", "Status", "Actions"]}
                            data={tableRows}
                            showSearch={true}
                            placeholder='Search by...'
                            showFilter={false}
                            showSummary={false}
                            totalData={selector?.getCategoryListData?.data?.data?.total}
                            totalSize={size}
                            currentPage={pageNo}
                            onPageChange={onPageChange}
                            searchTerm={keyword}
                            setSearchTerm={setKeyword}
                            isHeaderCheckbox={true}
                            handleHeaderCheckboxChange={handleSelectAllChange}
                            allRowsSelected={isAllRowsSelected}
                        />
                    </div>
                    <div className="flex justify-center my-6">
                        {getListData?.total && size && Math.ceil(getListData.total / size) > 1 && (
                            <Pagination
                                totalPages={Math.ceil(getListData.total / size)}
                                currentPage={pageNo}
                                onPageChange={onPageChange}
                            />
                        )}
                    </div>
                </div>

                {/* Add FAQ Modal */}
                <DefaultModal
                    isOpen={isOpenAddModal}
                    onClose={handleClose}
                    onSubmit={handleAddUserSubmit}
                    isButtonView={true}
                    name="faq"
                    submitButtonText="Submit"
                    closeButtonText="Reset"
                    title="Add Help & Support"
                    titleClassName="mt-5 font-medium"
                >
                    <div className="w-full px-4 pt-2">
                        <Input
                            labelName="Category Name"
                            name="name"
                            type="text"
                            value={formData.name}
                            placeholder="Enter Category Name"
                            onChange={handleInputChange}
                            error={errors.name}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className='flex justify-between items-center border p-3 m-4'>
                        <p className="font-medium text-sm">Status</p>
                        <ToggleButton
                            isToggle={!formData.isDisable}
                            handleClick={handleToggleAdd}
                        />
                    </div>
                </DefaultModal>

                {/* Edit FAQ Modal */}
                <DefaultModal
                    isOpen={isOpenEditModal}
                    onClose={handleEditClose}
                    onSubmit={handleEditUserSubmit}
                    isButtonView={true}
                    submitButtonText="Update"
                    closeButtonText="Cancel"
                    title="Edit Help & Support"
                    titleClassName="mt-5 font-medium"
                >
                    <div className="w-full px-4 pt-2">
                        <Input
                            labelName="Category Name"
                            name="name"
                            type="text"
                            placeholder="Enter Category Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            error={errors.name}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className='flex justify-between items-center border p-3 m-4'>
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
                    DeleteHeading={'Are you sure you want to delete this Terms & Conditions?'}
                />

                <StatusPopup
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDisableFunc}
                    heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this Terms & Conditions?`}
                />
            </div>
        </>
    );
};

export default HelpAndSupport;