/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import { useDispatch, } from 'react-redux'
import { toast } from 'sonner'
import Loader from '../../../components/Loader/Loader'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import AddButton from '../../../components/Button/AddButton'
import { Link } from 'react-router-dom'
import {  createQtyHead,  editQtyHead,  enableDisableQtyHead,  getQtyHeadList,  softDeleteQtyHead } from '../../../Redux/badgeSlice'
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup'
import FormInput from '../../../components/Atoms/FormInput/FormInput'


const size = 10
const QtyHead = () => {
    const dispatch = useDispatch();
    const [apiRes, setApiRes] = useState({ list: [], total: 0 });
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [isAddModal, setIsAddModal] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [filters, setFilters] = useState({ search: "", country: "" });
    const [isLoading, setIsLoading] = useState(false)
    const [isApproveModal, setIsApproveModal] = useState(false)
    const [selectedData, setSelectedData] = useState(null)
    const initialFormState = {
        name: "",
        _id: null,
        isDisable: false,
        value: "",
        description: "",
        example: "",
    };

    const [formData, setFormData] = useState(initialFormState)
    const [errors, setErrors] = useState({});

    const fetchBadgeList = useCallback(() => {
        const query = {
            page: pageNo,
            size: size,
            select: 'name isDisable description value example',
            keyWord:  '',
            searchFields: 'name',
            sortOrder: 'asc',
            sortBy: "name"
        };
        setIsLoading(true);
        dispatch(getQtyHeadList(query))
            .then((res) => {
                setApiRes(res?.payload?.data || { list: [], total: 0 });
            })
            .catch((err) => {
                setApiRes({ list: [], total: 0 });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [dispatch, pageNo, size]);

    useEffect(() => {
        fetchBadgeList();
    }, [fetchBadgeList]);

    const onPageChange = (newPageNo) => {
        setPageNo(newPageNo);
    };

    const getAllRowIds = useCallback(() => {
        return apiRes?.list?.map(row => row?._id) || [];
    }, [apiRes?.list]);

    const handleHeaderCheckboxChange = (e) => {
        setSelectedRow(e.target.checked ? getAllRowIds() : []);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };



    const closeModal = () => {
        setIsAddModal(false);
        setIsEditMode(false);
        setFormData(initialFormState);
        setErrors({});
    };

    const handleRowCheckboxChange = (e, rowId) => {
        setSelectedRow(prev =>
            e.target.checked
                ? [...prev, rowId]
                : prev.filter(id => id !== rowId)
        );
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.value.trim()) newErrors.value = 'Value type is required';
        if (!formData.example.trim()) newErrors.example = 'Example type is required';

        return newErrors;
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors.");
            return;
        }
        try {
            if (isEditMode) {
                await dispatch(editQtyHead({ ...formData, _id: formData._id })).unwrap();
                toast.success('State updated successfully');
            } else {
                const { _id, ...createData } = formData;
                await dispatch(createQtyHead(createData)).unwrap();
                toast.success('State created successfully');
            }
            closeModal();
            fetchBadgeList();
        } catch (error) {
            console.error("Error saving state:", error);
            toast.error(error?.message || 'Failed to save state');
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    };

    const handleToggle = async (data) => {
        setIsApproveModal(true); setSelectedData(data)
    };

    const applyFilters = useCallback(() => {
        const query = {
            page: pageNo,
            size: size,
            select: 'name isDisable description value example',
            keyWord: filters?.search || '',
            searchFields: 'name',
        };
        setIsLoading(true)
        dispatch(getQtyHeadList(query))
            .then((res) => {
                setApiRes(res?.payload?.data || { list: [], total: 0 });
            })
            .catch((err) => {
                console.error("Error fetching countries:", err);
            }).finally(() => {
                setIsLoading(false)
            })
    }, [filters]);

    const handleAction = async (data) => {
        // setIsDeleteApproveModal(true);setSelectedData(data)
        const apiPayload = {
            _id: [data?._id]
        }
        try {
            const res = await dispatch(softDeleteQtyHead(apiPayload)).unwrap();
            if (res) {
                toast.success(res?.message)
            }
            fetchBadgeList();
        } catch (error) {
            toast.error(error?.message || error || "Failed...!")
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    }
    const tableHeadings = ["Name", "Value", "Description", "Example", "Status", "Action"];
    const tableRows = apiRes?.list?.map((ele) => [
        <CustomCheckbox checked={selectedRow.includes(ele._id)} onChange={(e) => handleRowCheckboxChange(e, ele._id)} />,
        <span className='capitalize'>{ele?.name}</span>,
        <span className='capitalize'>{ele?.value}</span>,
        <span className='capitalize'>{ele?.description}</span>,
        <span className='capitalize'>{ele?.example}</span>,
        <ToggleButton isToggle={!ele?.isDisable} handleClick={() => handleToggle(ele)} />,
        <ActionButtons
            onEdit={() => {
                setFormData({
                    name: ele.name,
                    value: ele.value,
                    _id: ele._id,
                    isDisable: ele?.isDisable,
                    description: ele?.description,
                    example: ele?.example,
                });
                setIsEditMode(true);
                setIsAddModal(true);
            }}
            showLinkButton={false}
            showDeleteButton={true}
            onDelete={() => handleAction(ele)}
        />
    ]);

    const handleBulkAction = async (action) => {
        if (action === "Active" || action === "Inactive") {
            let apiPayload = {
                _id: selectedRow,
                isDisable: action === "Active" ? false : true
            };
            try {
                setIsLoading(true)
                const res = await dispatch(enableDisableQtyHead(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                }
                fetchBadgeList();
                setIsLoading(false)
            } catch (error) {
                toast.error(error?.message || error || "Failed...!");
                if (error.errors) {
                    setErrors(error.errors);
                }
                setIsLoading(false)
            }
        } else if (action === 'Delete') {
            let apiPayload = {
                _id: selectedRow,
            };
            try {
                const res = await dispatch(softDeleteQtyHead(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                }
                fetchBadgeList();
            } catch (error) {
                toast.error(error?.message || error || "Failed...!");
                if (error.errors) {
                    setErrors(error.errors);
                }
            }
        }

    };

    const handleSearchRemove = () => {
        setFilters({ search: "" })
        const query = {
            "keyWord": "",
            "sortBy": "name",
            "sortOrder": "asc",
            "page": pageNo,
            "size": size,
            select: 'name isDisable description value example',
            searchFields: 'name',
            "populate": "",
            "query": ""
        };
        setIsLoading(true)
        dispatch(getQtyHeadList(query))
            .then((res) => {
                setApiRes(res?.payload?.data || { list: [], total: 0 });
            })
            .catch((err) => {
                console.error("Error fetching countries:", err);
            }).finally(() => {
                setIsLoading(false)
            })
    }

    const handleToggleAction = () => {
        setFormData((prev) => ({
            ...prev,
            isDisable: !prev.isDisable
        }));
    };

    const handleConfirmEnableDisable = async () => {
        let apiPayload = {
            _id: [selectedData?._id],
            isDisable: selectedData?.isDisable ? false : true
        }
        try {
            const res = await dispatch(enableDisableQtyHead(apiPayload)).unwrap();
            if (res) {
                toast.success(res?.message)
            }
            fetchBadgeList();
        } catch (error) {
            toast.error(error?.message || error || "Failed...!")
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    }


    return (
        <>
            <div className='md:p-6 p-3 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
                <Loader loading={isLoading} />
                <div className='flex justify-between items-center'>
                    <h3><Link to="/app/home" className='cursor-pointer'>Home</Link> / <b>Qty Head</b></h3>
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
                        applyFilters={applyFilters}
                        handleSearchRemove={handleSearchRemove}
                        isDelete={true}
                    />

                    <TableData
                        tableHeadings={tableHeadings}
                        data={tableRows}
                        showSearch={true}
                        showFilter={false}
                        showSummary={false}
                        totalData={apiRes?.total}
                        totalSize={size}
                        currentPage={pageNo}
                        isHeaderCheckbox={true}
                        handleHeaderCheckboxChange={handleHeaderCheckboxChange}
                        allRowsSelected={selectedRow.length === apiRes?.list?.length}
                    />
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

                <DefaultModal
                    title={isEditMode ? 'Edit Qty' : 'Add Qty'}
                    isOpen={isAddModal}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                >
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-3'>

                        <Input
                            labelName='Name'
                            type='text'
                            value={formData.name}
                            name='name'
                            onChange={handleInputChange}
                            error={errors.name}
                            required
                        />
                        <Input
                            labelName='Value'
                            type='text'
                            value={formData.value}
                            name='value'
                            onChange={handleInputChange}
                            error={errors.value}
                            required
                        />
                        <div className='col-span-2'>
                            <Input
                                labelName='Example'
                                type='text'
                                value={formData.example}
                                name='example'
                                onChange={handleInputChange}
                                error={errors.example}
                                required
                            />
                        </div>
                        <div className='col-span-2'>
                            <FormInput type={`textarea`} value={formData?.description} name={`description`} onChange={handleInputChange} label={`Description`}
                                error={errors?.description} />
                        </div>
                        <div className="flex items-center justify-between col-span-2 border p-2">
                            <p>IsActive</p>
                            <ToggleButton isToggle={!formData?.isDisable} handleClick={handleToggleAction} />
                        </div>

                    </div>
                </DefaultModal>
                <StatusPopup isOpen={isApproveModal} onClose={() => { setIsApproveModal(false); setSelectedData(null) }} onConfirm={handleConfirmEnableDisable}
                    heading={`Confirm to update status?`} />
            </div>
        </>
    )
}

export default QtyHead