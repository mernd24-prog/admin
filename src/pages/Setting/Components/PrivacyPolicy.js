/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import { useDispatch, } from 'react-redux'
import { toast } from 'sonner'
import Loader from '../../../components/Loader/Loader'
import Button from '../../../components/Atoms/buttons/button'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import { createPrivacyPolicy, editPrivacyPolicy, enableDisablePrivacyPolicy, getPrivacyPolicyList, softDeletePrivacyPolicy } from '../../../Redux/patternSlice'
import FormInput from '../../../components/Atoms/FormInput/FormInput'


const size = 10
const PrivacyPolicy = () => {
    const dispatch = useDispatch();
    const [apiRes, setApiRes] = useState({ list: [], total: 0 });
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [isAddModal, setIsAddModal] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [filters, setFilters] = useState({ search: "", country: "" });
    const [isLoading, setIsLoading] = useState(false)

    const initialFormState = {
        replace_policy: '',
        _id: null,
        isDisable: false
    };

    const [formData, setFormData] = useState(initialFormState)
    const [errors, setErrors] = useState({});
    console.log(formData)


    const fetchCollectionsList = useCallback(() => {
        const query = {
            page: pageNo,
            size: size,
            select: 'replace_policy  isDisable',
            keyWord: filters?.search || '',
            searchFields: 'replace_policy'
        };
        setIsLoading(true);
        dispatch(getPrivacyPolicyList(query))
            .then((res) => {
                setApiRes(res?.payload?.data || { list: [], total: 0 });
            })
            .catch((err) => {
                setApiRes({ list: [], total: 0 });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [dispatch, pageNo, size, filters?.search]);

    useEffect(() => {
        fetchCollectionsList();
    }, [fetchCollectionsList]);

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
        const value = formData.replace_policy?.trim() || "";

        if (!value) {
            newErrors.replace_policy = 'Replace policy is required';
        } else if (value.length < 10) {
            newErrors.replace_policy = 'Minimum 10 characters required';
        } else if (value.length > 5000) {
            newErrors.replace_policy = 'Maximum 100 characters allowed';
        }

        return newErrors;
    };


    console.log(formData?.country_code)

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const payload = {
            replace_policy: formData.replace_policy, isDisable: formData?.isDisable
        };
        try {
            if (isEditMode) {
                await dispatch(editPrivacyPolicy({ ...payload, _id: formData._id })).unwrap();
                toast.success('State updated successfully');
            } else {
                await dispatch(createPrivacyPolicy(payload)).unwrap();
                toast.success('State created successfully');
            }
            closeModal();
            fetchCollectionsList();
        } catch (error) {
            console.error("Error saving state:", error);
            toast.error(error?.message || 'Failed to save state');
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    };
    const handleToggle = async (data) => {
        let apiPayload = {
            _id: [data?._id],
            isDisable: data?.isDisable ? false : true
        }
        try {
            const res = await dispatch(enableDisablePrivacyPolicy(apiPayload)).unwrap();
            if (res) {
                toast.success(res?.message)
            }
            fetchCollectionsList();
        } catch (error) {
            toast.error(error?.message || error || "Failed...!")
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    };

    const applyFilters = useCallback(() => {
        const query = {
            page: pageNo,
            size: size,
            select: 'name thumbnails isDisable',
            keyWord: filters?.search || '',
            searchFields: 'name'
        };
        setIsLoading(true)
        dispatch(getPrivacyPolicyList(query))
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
        const apiPayload = {
            _id: [data?._id]
        }
        try {
            const res = await dispatch(softDeletePrivacyPolicy(apiPayload)).unwrap();
            if (res) {
                toast.success(res?.message)
            }
            fetchCollectionsList();
        } catch (error) {
            toast.error(error?.message || error || "Failed...!")
            if (error.errors) {
                setErrors(error.errors);
            }
        }
    }

    const tableHeadings = [" Name", "Status", "Action"];

    const tableRows = apiRes?.list?.map((ele) => [
        <CustomCheckbox checked={selectedRow.includes(ele._id)} onChange={(e) => handleRowCheckboxChange(e, ele._id)} />,
        <span className='capitalize'>{ele?.replace_policy}</span>,
        <ToggleButton isToggle={!ele?.isDisable} handleClick={() => handleToggle(ele)} />,
        <ActionButtons
            onEdit={() => {
                setFormData({
                    replace_policy: ele.replace_policy,
                    _id: ele._id,
                    isDisable: ele?.isDisable
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
                const res = await dispatch(enableDisablePrivacyPolicy(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                }
                fetchCollectionsList();
            } catch (error) {
                toast.error(error?.message || error || "Failed...!");
                if (error.errors) {
                    setErrors(error.errors);
                }
            }
        } else if (action === 'Delete') {
            let apiPayload = {
                _id: selectedRow,
            };
            try {
                const res = await dispatch(softDeletePrivacyPolicy(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message);
                }
                fetchCollectionsList();
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
            page: pageNo,
            size: size,
            select: 'name thumbnails isDisable',
            keyWord: '',
            searchFields: 'name'
        };
        setIsLoading(true)
        dispatch(getPrivacyPolicyList(query))
            .then((res) => {
                setApiRes(res?.payload?.data || { list: [], total: 0 });
            })
            .catch((err) => {
                console.error("Error fetching countries:", err);
            }).finally(() => {
                setIsLoading(false)
            })
    }

    const handleToggleAdd = () => {
        setFormData((prev) => ({
            ...prev,
            isDisable: !prev?.isDisable
        }));
    };


    return (
        <>
            <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
                <Loader loading={isLoading} />
                <div className='flex justify-between items-center'>
                    <h3>Home / Privacy & Policy</h3>
                    <Button onClick={() => {
                        setFormData(initialFormState);
                        setIsEditMode(false);
                        setIsAddModal(true);
                    }}>
                        Add
                    </Button>
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
                        placeholder={`Search by name and code`}
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
                    title={isEditMode ? 'Edit State' : 'Add State'}
                    isOpen={isAddModal}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                >
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-3'>
                        <div className='col-span-2'>
                            <FormInput
                                label='Name'
                                type='textarea'
                                value={formData.replace_policy}
                                name='replace_policy'
                                onChange={handleInputChange}
                                error={errors.replace_policy}
                                required
                                rows={10}
                            />
                        </div>

                        <div className='col-span-2'>
                            <div className='flex justify-between place-items-center border p-2'>
                                <h2 className='text-sm'>Active it</h2>
                                <ToggleButton isToggle={!formData?.isDisable} handleClick={handleToggleAdd} />
                            </div>
                        </div>

                    </div>
                </DefaultModal>
            </div>
        </>
    )
}

export default PrivacyPolicy