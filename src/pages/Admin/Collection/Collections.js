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
import { getAllCountryList } from '../../../Redux/CountrySlice'
import { createCollection, deleteCollection, enableDisableCollection, getCollectionList, updateCollection } from '../../../Redux/productSlice'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import ImageViewer from '../../../components/ImageViewer/ImageViewer'
import { uploadFile } from '../../../_helpers/globalFunctions'
import ImageUpload from '../../../components/Atoms/ImageGallery/ImageUpload'


const size = 10
const Collections = () => {
    const dispatch = useDispatch();
    const [apiRes, setApiRes] = useState({ list: [], total: 0 });
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [isAddModal, setIsAddModal] = useState(false);
    const [pageNo, setPageNo] = useState(1);
    const [filters, setFilters] = useState({ search: "", country: "" });
    const [isLoading, setIsLoading] = useState(false)

    const initialFormState = {
        name: '',
        thumbnails: "",
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
            select: 'name thumbnails isDisable',
            keyWord: filters?.search || '',
            searchFields: 'name'
        };
        setIsLoading(true);
        dispatch(getCollectionList(query))
            .then((res) => {

                setApiRes(res?.payload?.data || { list: [], total: 0 });
            })
            .catch((err) => {
                console.error("Error fetching collections:", err);
                // Optionally set some error state here
                setApiRes({ list: [], total: 0 });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [dispatch, pageNo, size, filters?.search]);

    useEffect(() => {
        fetchCollectionsList();
        dispatch(getAllCountryList())
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
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.thumbnails) newErrors.thumbnails = 'thumbnails is required';
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
            name: formData.name,
            thumbnails: formData.thumbnails, isDisable: formData?.isDisable
        };
        try {
            if (isEditMode) {
                await dispatch(updateCollection({ ...payload, _id: formData._id })).unwrap();
                toast.success('State updated successfully');
            } else {
                await dispatch(createCollection(payload)).unwrap();
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
            const res = await dispatch(enableDisableCollection(apiPayload)).unwrap();
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
        dispatch(getCollectionList(query))
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
            const res = await dispatch(deleteCollection(apiPayload)).unwrap();
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

    const tableHeadings = [" Name", "Thumbnails", "Status", "Action"];

    const tableRows = apiRes?.list?.map((ele) => [
        <CustomCheckbox checked={selectedRow.includes(ele._id)} onChange={(e) => handleRowCheckboxChange(e, ele._id)} />,
        <span className='capitalize'>{ele?.name}</span>,
        <img src={ele?.thumbnails} alt='thumbnails' className='w-12 h-12 rounded-md' />,
        <ToggleButton isToggle={!ele?.isDisable} handleClick={() => handleToggle(ele)} />,
        <ActionButtons
            onEdit={() => {
                setFormData({
                    name: ele.name,
                    thumbnails: ele.thumbnails,
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
                const res = await dispatch(enableDisableCollection(apiPayload)).unwrap();
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
                const res = await dispatch(deleteCollection(apiPayload)).unwrap();
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
        dispatch(getCollectionList(query))
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
    const handleImageOnChange = async (file) => {
        if (!file) return;
        try {
            setIsLoading(true)
            const uploadedImage = await uploadFile(file, 'THUMBNAILS')
            if (uploadedImage) {
                setFormData((prev) => ({
                    ...prev,
                    thumbnails: uploadedImage,
                }));
            }
            setIsLoading(false)
        } catch (error) {
            console.error(error);
            toast.error(error?.message || 'Image upload failed');
            setIsLoading(false)

        }
    };



    return (
        <>
            <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
                <Loader loading={isLoading} />
                <div className='flex justify-between items-center'>
                    <h3>Home / Collection</h3>
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
                            <Input
                                labelName='Name'
                                type='text'
                                value={formData.name}
                                name='name'
                                onChange={handleInputChange}
                                error={errors.name}
                                required
                            />
                        </div>
                        <div className='col-span-2'>
                            <ImageUpload type='file' file={formData?.thumbnails} onChange={(file) => handleImageOnChange(file)} />
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

export default Collections