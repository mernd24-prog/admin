/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import TableData from '../../../src/components/Atoms/TableData/TableData'
// import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { useDispatch, useSelector } from 'react-redux';
// import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
// import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
// import SearchComponent from '../../../components/Atoms/New Table/NewTable';
// import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
// import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { toast } from 'sonner';
// import Pagination from '../../../components/Pagination/Pagination';
// import Loader from '../../../components/Loader/Loader';
// import Input from '../../../components/Atoms/Input/Input';
// import AddButton from '../../../components/Button/AddButton';
import { useNavigate } from 'react-router';
// import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import { Link } from 'react-router-dom';
// import { createTaxList, enableDisableTaxList, getTaxList, softDeleteTaxList, updateTaxList } from '../../../Redux/cmsSlice';
// import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import { createTaxList, enableDisableTaxList, getTaxList, softDeleteTaxList, updateTaxList } from '../../../src/Redux/cmsSlice';
import DeletePopup from '../../components/Atoms/DeletePopup.js/DeletePopup';
import SearchComponent from '../../components/Atoms/New Table/NewTable';
import { ActionButtons } from '../../components/Atoms/TableActionButton/TableActionButton';
import StatusPopup from '../../components/Atoms/PopupData/StatusPopup';
import DefaultModal from '../../components/Atoms/Modal/DefaultRightSideModal';
import ToggleButton from '../../components/Atoms/ToggleButton/ToggleButton';
import Pagination from '../../components/Pagination/Pagination';
import Loader from '../../components/Loader/Loader';
import Input from '../../components/Atoms/Input/Input';
import AddButton from '../../components/Button/AddButton';
import CustomCheckbox from '../../components/Atoms/Checkbox/Checkbox';
import FilterSelect from '../../components/Atoms/FilterSelect/FilterSelect';
import { getAllCountryList } from '../../Redux/CountrySlice';

const Tax = () => {
    const dispatch = useDispatch();
    const [toggleStates, setToggleStates] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [formData, setForm] = useState({
        _id: '',
        name: '',
        country_code: '',
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
    const onPageChange = (newPageNo) => {
        setPageNo(newPageNo);
    };

    const size = 10
    const navigate = useNavigate()

    // Fetch tax list
    useEffect(() => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            searchFields: 'name,country_code.name',
            populate: 'country_code:name'
        };
        dispatch(getTaxList(reqData));
    }, [size, pageNo, isRefresh]);

    // Fetch country list
    useEffect(() => {
        const reqData = {
            page: 1,
            size: 100, // Fetch all countries
            select: 'name'
        }
        dispatch(getAllCountryList(reqData))
    }, [])

    const selector = useSelector(state => state.cms);
    const countrySelector = useSelector(state => state.country);
    const getListData = selector?.getTaxListData?.data?.data?.list;
    const loading = selector.loading || countrySelector.loading;

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

        if (!formData?.name?.trim()) {
            newErrors.name = 'Tax name is required';
            isValid = false;
        } else if (formData?.name.length < 2) {
            newErrors.name = 'Tax name must be at least 2 characters';
            isValid = false;
        }

        if (!formData?.country_code) {
            newErrors.country_code = 'Country is required';
            isValid = false;
        }



        setErrors(newErrors);
        return isValid;
    };

    const handleClose = () => {
        setIsOpenAddModal(false);
        setForm({
            _id: '',
            name: '',
            country_code: '',
            isDisable: false
        });
        setErrors({});
    };

    const handleEditClose = () => {
        setIsEditModal(false);
        setForm({
            _id: '',
            name: '',
            country_code: '',
            isDisable: false
        });
        setErrors({});
    };

    const mappedCountries = countrySelector?.getAllCountryListData?.data?.data?.list?.map((e) => ({
        value: e?._id,
        label: e?.name,
    }));

    const modifiedData = [
        { value: "", label: "Select country" },
        ...(mappedCountries || [])
    ];

    const handleAddTax = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const reqData = {
            name: formData.name.trim(),
            country_code: formData.country_code,
            isDisable: formData.isDisable
        };

        dispatch(createTaxList(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || "Tax created successfully");
                    handleClose();
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error || "Error in creating tax");
            });
    };

    const handleRowCheckboxChange = (e, rowId) => {
        setSelectedRow(prev =>
            e.target.checked
                ? [...prev, rowId]
                : prev.filter(id => id !== rowId)
        );
    };

    const tableRows = getListData?.map((tax) => [
        <CustomCheckbox
            key={`checkbox-${tax._id}`}
            checked={selectedRow.includes(tax._id)}
            onChange={(e) => handleRowCheckboxChange(e, tax._id)}
        />,
        <span key={`name-${tax._id}`} className="capitalize">
            {tax?.name}
        </span>,
        <span key={`country-${tax._id}`} className='capitalize'>
            {tax?.country_code?.name || 'N/A'}
        </span>,
        <div className='flex flex-col'>
            <ToggleButton isToggle={!tax?.isDisable} handleClick={() => handleToggle(tax)} />
        </div>,
        <span key={`actions-${tax._id}`}>
            <ActionButtons
                onEdit={() => {
                    setForm({
                        _id: tax._id,
                        name: tax.name.charAt(0).toUpperCase() + tax.name.slice(1).toLowerCase(),
                        country_code: tax.country_code?._id,
                        isDisable: tax.isDisable
                    });
                    setIsEditModal(true);
                }}
                onDelete={() => {
                    setDeleteData({ _id: Array(tax._id) })
                    setShowDeleteConfirmation(true)
                }}
                onListing={() => {
                    navigate(`/app/subTax/${tax._id}`)

                }}
                showLinkButton={false}
                showListing={true}
            />
        </span>,
    ]);

    const confirmDelete = () => {
        dispatch(softDeleteTaxList(deleteData)).unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error)
                } else {
                    toast.success(res.message || "Tax deleted successfully")
                    setShowDeleteConfirmation(false);
                    setIsRefresh(!isRefresh)
                }
            }).catch((error) => {
                toast.error(error.message || "Error in deleting tax")
            })
    };

    const handleDisableFunc = () => {
        if (!toggleStates) return;
        const obj = {
            _id: Array(toggleStates._id),
            isDisable: !toggleStates.isDisable
        };

        dispatch(enableDisableTaxList(obj))
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
                toast.error(error.message || "Error in updating status");
            });
    };

    const handleToggle = (tax) => {
        setToggleStates(tax);
        setIsConfirmModalOpen(true);
    };

    const handleBulkAction = async (action) => {
        if (!selectedRow.length) {
            toast.error("Please select at least one tax");
            return;
        }

        if (action === "Active" || action === "Inactive") {
            let apiPayload = {
                _id: selectedRow,
                isDisable: action === "Active" ? false : true
            };
            try {
                const res = await dispatch(enableDisableTaxList(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                    setIsRefresh(!isRefresh)
                    setSelectedRow([])
                }
            } catch (error) {
                toast.error(error?.message || error || "Failed to update status");
            }
        }
    };

    const handleToggleAdd = () => {
        setForm(prev => ({
            ...prev,
            isDisable: !prev.isDisable,
        }));
    };

    const handleEditTax = (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        const reqData = {
            _id: formData._id,
            name: formData.name.trim(),
            country_code: formData.country_code,
            // rate: Number(formData.rate),
            isDisable: formData.isDisable
        };

        dispatch(updateTaxList(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || "Tax updated successfully");
                    setIsEditModal(false);
                    handleEditClose();
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error.message || "Error in updating tax");
            });
    };

    const handleSelectAllChange = (e) => {
        if (e.target.checked) {
            const allIds = getListData?.map(tax => tax._id) || [];
            setSelectedRow(allIds);
        } else {
            setSelectedRow([]);
        }
    };

    const handleApplySearchFilters = () => {
        setPageNo(1);
        setIsRefresh(!isRefresh);
    }

    const handleSelectChange = (selectedOption, { name }) => {
        setForm(prev => ({
            ...prev,
            country_code: selectedOption.value
        }));
        if (errors.country_code) {
            setErrors(prev => ({ ...prev, country_code: undefined }));
        }
    };

    const handleSearchRemove = useCallback(() => {
        setFilters(prev => ({ ...prev, search: "" }));
        setKeyword("");
        setPageNo(1);
        setIsRefresh(!isRefresh)
    }, [dispatch, size, isRefresh]);

    const isAllRowsSelected = useMemo(() =>
        selectedRow.length === selector?.getTaxListData?.data?.data?.list?.length &&
        selector?.getTaxListData?.data?.data?.list?.length > 0,
        [selectedRow.length, selector?.getTaxListData?.data?.data?.list?.length]
    )

    return (
        <>
            <Loader loading={loading} />
            <div className='max-w-7xl mx-auto'>
                <div className=' overflow-hidden overflow-y-auto py-6'>
                    <div className="flex justify-between items-center">
                        <h3><Link to='/app/home'>Home</Link> / <b>Tax</b></h3>
                        <AddButton
                            className="border-[#3E4094] text-[#3E4094] mb-3"
                            onClick={() => {
                                setIsOpenAddModal(true);
                            }}
                        >
                            Add Tax
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
                                        placeholder="Search by tax name"
                                        handleSearchRemove={handleSearchRemove}
                                        applyFilters={handleApplySearchFilters}
                                    />
                                </div>
                            </div>
                        </div>
                        <TableData
                            Heading='Tax Management'
                            tableHeadings={[
                                "Tax Name",
                                "Country",
                                "Status",
                                "Actions"
                            ]}
                            data={tableRows}
                            showSearch={false}
                            showFilter={false}
                            showSummary={false}
                            totalData={selector?.getTaxListData?.data?.data?.total}
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

                {/* Add Tax Modal */}
                <DefaultModal
                    isOpen={isOpenAddModal}
                    onClose={handleClose}
                    onSubmit={handleAddTax}
                    isButtonView={true}
                    submitButtonText="Submit"
                    closeButtonText="Cancel"
                    title="Add New Tax"
                    titleClassName="mt-5 font-medium"
                >
                    <div className="w-full px-4 pt-2">
                        <Input
                            labelName="Tax Name"
                            name="name"
                            type="text"
                            value={formData.name}
                            placeholder="Enter tax name"
                            onChange={handleInputChange}
                            error={errors.name}
                            maxLength={50}
                            required
                        />
                    </div>
                    <div className="w-full px-4 pt-2">
                        <FilterSelect
                            options={modifiedData}
                            label="Country"
                            value={modifiedData?.find(option => option.value === formData.country_code)}
                            onChange={handleSelectChange}
                            name="country_code"
                            className="basic-single"
                            classNamePrefix="select"
                            isSearchable
                            placeholder="Select country"
                            required
                            error={errors.country_code}
                        />
                    </div>
                    <div className='flex justify-between items-center border p-3 mt-4'>
                        <p className="font-medium text-sm">Status</p>
                        <ToggleButton
                            isToggle={!formData.isDisable}
                            handleClick={handleToggleAdd}
                        />
                    </div>
                </DefaultModal>

                {/* Edit Tax Modal */}
                <DefaultModal
                    isOpen={isOpenEditModal}
                    onClose={handleEditClose}
                    onSubmit={handleEditTax}
                    isButtonView={true}
                    submitButtonText="Update"
                    closeButtonText="Cancel"
                    title="Edit Tax"
                    titleClassName="mt-5 font-medium"
                >
                    <div className="w-full px-4 pt-2">
                        <Input
                            labelName="Tax Name"
                            name="name"
                            type="text"
                            placeholder="Enter tax name"
                            value={formData.name}
                            onChange={handleInputChange}
                            error={errors.name}
                            maxLength={50}
                            required
                        />
                    </div>
                    <div className="w-full px-4 pt-2">
                        <FilterSelect
                            options={modifiedData}
                            label="Country"
                            value={modifiedData?.find(option => option.value === formData.country_code)}
                            onChange={handleSelectChange}
                            name="country_code"
                            className="basic-single"
                            classNamePrefix="select"
                            isSearchable
                            placeholder="Select country"
                            required
                            error={errors.country_code}
                        />
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
                    DeleteHeading={'Are you sure you want to delete this tax?'}
                />

                <StatusPopup
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDisableFunc}
                    heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this tax?`}
                />
            </div>
        </>
    )
}

export default Tax