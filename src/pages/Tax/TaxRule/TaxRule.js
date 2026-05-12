/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Link, useParams } from 'react-router-dom';
// import CustomCheckbox from '../../../../components/Atoms/Checkbox/Checkbox';
import { createTaxRule, enableDisableTaxRule, getAllDocuments, getListSubTax, getListTaxRule, softDeleteTaxRule, updateTaxRule } from '../../../Redux/cmsSlice';
// import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import { transformArray } from '../../../_helpers/globalFunctions';
// import {  getListCategory } from '../../../../Redux/productSlice';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
// import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import Pagination from '../../../components/Pagination/Pagination';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import AddButton from '../../../components/Button/AddButton';
import Loader from '../../../components/Loader/Loader';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import Input from '../../../components/Atoms/Input/Input';
import { getListCategory } from '../../../Redux/userManagementSlice';
const TaxRule = () => {
    const dispatch = useDispatch();
    const [toggleStates, setToggleStates] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedTax, setSelectedTax] = useState(null);
    const [pageNo, setPageNo] = useState(1);
    const [formData, setForm] = useState({
        _id: '',
        description: '',
        tax_id: '',
        subTaxes_id: [],
        category_id: '',
        isDisable: false
    });

    useEffect(() => {
        dispatch(getListCategory());
        // setIsRefresh(!isRefresh)
    }, [dispatch]);
    const [errors, setErrors] = useState({});
    const [keyword, setKeyword] = useState('');
    const [filters, setFilters] = useState({ search: "" });
    const [isRefresh, setIsRefresh] = useState(false);
    const [isOpenAddModal, setIsOpenAddModal] = useState(false);
    const [isOpenEditModal, setIsEditModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState([]);
    const [deleteData, setDeleteData] = useState("");
    const [selectedSubTax, setSelectedSubTax] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [filteredSubTaxOptions, setFilteredSubTaxOptions] = useState([]);
    const onPageChange = (newPageNo) => {
        setPageNo(newPageNo);
    };
    const { id } = useParams()
    const size = 10

    useEffect(() => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            searchFields: "description",
            sortBy: "createdAt",
            sortOrder: "desc",
            populate: "tax_id:name||category_id:name||subTaxes_id:name"
        };
        dispatch(getListTaxRule(reqData));
    }, [size, pageNo, isRefresh, dispatch]);

    // Get sub-taxes list
    useEffect(() => {
        const reqData = {
            page: 1,
            size: 1000,
            keyWord: filters.search,
            searchFields: 'description',
            query: id ? JSON.stringify({ tax_id: id }) : ''
        };
        dispatch(getListSubTax(reqData));
    }, [size, isRefresh, id, dispatch]);

    // Get products list for categories


    useEffect(() => {
        dispatch(getAllDocuments())
    }, [])

    const selector = useSelector(state => state.cms);
    const productSelector = useSelector(state => state.user);
    const totalUsers = selector?.getListTaxRuleData?.data?.data?.total || 0;
    const taxList = selector?.getAllDocumentsData?.data?.data?.list || [];
    const subTaxList = selector?.getListSubTaxData?.data?.data?.list || [];
    const getListTaxRuleData = selector?.getListTaxRuleData?.data?.data?.list || [];

    // Transform data for dropdowns
    const taxOptions = useMemo(() => transformArray(taxList), [taxList]);
    const subTaxOptions = useMemo(() => transformArray(subTaxList), [subTaxList]);
    // Filter subTax options based on selected tax
    useEffect(() => {
        if (selectedTax && subTaxList.length > 0) {
            const filtered = subTaxList.filter(subTax => (subTax.tax_id?._id || subTax.tax_id) === selectedTax.value);
            setFilteredSubTaxOptions(transformArray(filtered));

            // Reset subTax selection if the selected tax changes
            if (selectedSubTax.length > 0) {
                const currentSubTax = subTaxList.find(sub => sub._id === selectedSubTax[0]?.value);
                const currentSubTaxTaxId = currentSubTax?.tax_id?._id || currentSubTax?.tax_id;
                if (currentSubTaxTaxId !== selectedTax.value) {
                    setSelectedSubTax([]);
                    setForm(prev => ({ ...prev, subTaxes_id: [] }));
                }
            }
        } else {
            setFilteredSubTaxOptions(subTaxOptions);
        }
    }, [selectedTax, subTaxList, subTaxOptions]);

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

        if (!formData?.description) {
            newErrors.description = 'Description is required';
            isValid = false;
        } else if (formData?.description.length < 3) {
            newErrors.description = 'Description must be at least 3 characters';
            isValid = false;
        }
        if (!formData?.tax_id) {
            newErrors.tax_id = 'Tax is required';
            isValid = false;
        }
        if (!formData?.subTaxes_id || formData?.subTaxes_id.length === 0) {
            newErrors.subTaxes_id = 'Sub Tax is required';
            isValid = false;
        }
        if (!formData?.category_id) {
            newErrors.category_id = 'Category is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleClose = () => {
        setIsOpenAddModal(false);
        setForm({
            _id: '',
            description: "",
            tax_id: "",
            subTaxes_id: [],
            category_id: "",
            isDisable: false
        });
        setSelectedTax(null);
        setSelectedSubTax([]);
        setSelectedCategory(null);
        setErrors({});
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const reqData = {
            description: formData.description,
            tax_id: formData.tax_id,
            subTaxes_id: formData.subTaxes_id,
            category_id: formData.category_id,
            isDisable: formData.isDisable
        }

        dispatch(createTaxRule(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                    return
                } else {
                    toast.success(res.message || "Tax rule created successfully");
                    handleClose();
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error || "Error in creating tax rule");
            });
    };

    const handleRowCheckboxChange = (e, rowId) => {
        setSelectedRow(prev =>
            e.target.checked
                ? [...prev, rowId]
                : prev.filter(id => id !== rowId)
        );
    };
    const createSelectOptions = useMemo(() => {
        const options = [];
        const categoryPayload = productSelector?.getListCategoryData?.data?.data;
        const categories = Array.isArray(categoryPayload) ? categoryPayload : categoryPayload?.list || [];
        if (!Array.isArray(categories) || categories.length === 0) return options;

        const hasNested = categories.some((item) => Array.isArray(item?.subcategories) || Array.isArray(item?.subCategories));
        if (hasNested) {
            const addOptions = (nodes, prefix = '') => {
                if (!Array.isArray(nodes)) return;
                nodes.forEach((category) => {
                    const categoryName = category.name || category.title || category.categoryKey;
                    const label = prefix ? `${prefix} > ${categoryName}` : categoryName;
                    options.push({
                        value: String(category.categoryKey || category._id),
                        label,
                    });
                    const children = category.subcategories || category.subCategories || [];
                    if (children.length) addOptions(children, label);
                });
            };
            addOptions(categories);
            return options;
        }

        const byParent = new Map();
        categories.forEach((category) => {
            const parent = category?.parentKey ? String(category.parentKey) : '__root__';
            if (!byParent.has(parent)) byParent.set(parent, []);
            byParent.get(parent).push(category);
        });

        const walk = (parent = '__root__', prefix = '') => {
            const children = byParent.get(parent) || [];
            children
                .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
                .forEach((category) => {
                    const categoryName = category.name || category.title || category.categoryKey;
                    const label = prefix ? `${prefix} > ${categoryName}` : categoryName;
                    options.push({
                        value: String(category.categoryKey || category._id),
                        label,
                    });
                    walk(String(category.categoryKey || category._id), label);
                });
        };
        walk();
        return options;
    }, [productSelector.getListCategoryData]);
    const isRowActive = (row = {}) =>
        row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

    const tableRows = getListTaxRuleData?.map((rule) => [
        <CustomCheckbox
            key={`checkbox-${rule._id}`}
            checked={selectedRow.includes(rule._id)}
            onChange={(e) => handleRowCheckboxChange(e, rule._id)}
        />,
        <span key={`tax-${rule._id}`} className='capitalize text-wrap w-40'>
            {rule?.description || 'N/A'}
        </span>
        ,
        <span key={`tax-${rule._id}`} className='capitalize'>
            {rule?.taxId?.name || rule?.tax_id?.name || 'N/A'}
        </span>,
        <span key={`category-${rule._id}`} className='capitalize'>
            {rule?.category || rule?.category_id?.name || 'N/A'}
        </span>,
        <div className='flex flex-col' key={`status-${rule._id}`}>
            <ToggleButton isToggle={isRowActive(rule)} handleClick={() => handleToggle(rule)} />
        </div>,
        <span key={`actions-${rule._id}`}>
            <ActionButtons
                onEdit={() => {
                    // Get the subTaxes for this rule
                    const ruleSubTaxes = subTaxList.filter(subTax =>
                        rule.subTaxes_id &&
                        (Array.isArray(rule.subTaxes_id)
                            ? rule.subTaxes_id.some(id => id._id === subTax._id)
                            : rule.subTaxes_id._id === subTax._id)
                    );

                    // Transform to options format
                    const subTaxOptions = ruleSubTaxes.map(subTax => ({
                        value: subTax._id,
                        label: subTax.name
                    }));

                    setForm({
                        _id: rule._id,
                        description: rule.description,
                        tax_id: rule.taxId?._id || rule.tax_id?._id || rule.taxId || rule.tax_id,
                        subTaxes_id: Array.isArray(rule.subTaxIds)
                            ? rule.subTaxIds.map((sub) => sub?._id || sub)
                            : (Array.isArray(rule.subTaxes_id)
                                ? rule.subTaxes_id.map((sub) => sub?._id || sub)
                                : [rule.subTaxes_id?._id || rule.subTaxes_id].filter(Boolean)),
                        category_id: rule.category_id?._id || rule.category_id || rule.category || '',
                        isDisable: !isRowActive(rule)
                    });

                    const selectedTaxValue = rule.taxId || rule.tax_id;
                    setSelectedTax(selectedTaxValue ? { value: selectedTaxValue._id || selectedTaxValue, label: selectedTaxValue.name || 'Selected Tax' } : null);
                    setSelectedSubTax(subTaxOptions);
                    const selectedCategoryValue = rule.category_id || rule.category;
                    setSelectedCategory(selectedCategoryValue ? { value: selectedCategoryValue._id || selectedCategoryValue, label: selectedCategoryValue.name || selectedCategoryValue } : null);
                    setIsEditModal(true);
                }}
                onDelete={() => {
                    setDeleteData({ _id: [rule._id] })
                    setShowDeleteConfirmation(true)
                }}
                showLinkButton={false}
            />
        </span>,
    ]);

    const confirmDelete = () => {
        dispatch(softDeleteTaxRule(deleteData)).unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error)
                    return
                }
                else {
                    toast.success(res.message || "Tax Rule Deleted Successfully")
                    setShowDeleteConfirmation(false);
                    setIsRefresh(!isRefresh)
                }
            }).catch((error) => {
                toast.error(error || "Error in Deleting Tax Rule")
            })
    };

    const handleDisableFunc = () => {
        if (!toggleStates) return;
        const obj = {
            _id: [toggleStates._id],
            isDisable: isRowActive(toggleStates)
        };

        dispatch(enableDisableTaxRule(obj))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || "Status Updated Successfully");
                    setIsConfirmModalOpen(false);
                    setToggleStates(null);
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error.message || "Error in Updating Status");
            });
    };

    const handleToggle = (rule) => {
        setToggleStates(rule);
        setIsConfirmModalOpen(true);
    };

    const handleBulkAction = async (action) => {
        if (action === "Active" || action === "Inactive") {
            const apiPayload = {
                _id: selectedRow,
                isDisable: action === "Active" ? false : true
            };
            try {
                const res = await dispatch(enableDisableTaxRule(apiPayload)).unwrap();
                if (res) {
                    toast.success(res?.message || `${action} successful`);
                    setIsRefresh(!isRefresh);
                    setSelectedRow([]);
                }
            } catch (error) {
                toast.error(error?.message || "Failed to update status.");
                
            }
        } else if (action === "Delete") {
            const apiPayload = { _id: selectedRow };
            try {
                const res = await dispatch(softDeleteTaxRule(apiPayload)).unwrap();
                toast.success(res?.message || "Deleted successfully");
                setIsRefresh(!isRefresh);
                setSelectedRow([]);
            } catch (error) {
                toast.error(error?.message || "Failed to delete.");
              
            }
        }
    };


    const handleEditClose = () => {
        setIsEditModal(false);
        setForm({
            _id: '',
            description: "",
            tax_id: "",
            subTaxes_id: [],
            category_id: "",
            isDisable: false
        });
        setSelectedTax(null);
        setSelectedSubTax([]);
        setSelectedCategory(null);
        setErrors({});
    };

    const handleToggleStatus = () => {
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
            description: formData.description,
            tax_id: formData.tax_id,
            subTaxes_id: formData.subTaxes_id,
            category_id: formData.category_id,
            isDisable: formData.isDisable
        }

        dispatch(updateTaxRule(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || "Tax Rule Updated Successfully");
                    setIsEditModal(false);
                    handleEditClose();
                    setIsRefresh(!isRefresh);
                }
            })
            .catch((error) => {
                toast.error(error || "Error in Updating Tax Rule");
            });
    };

    const handleSelectAllChange = (e) => {
        if (e.target.checked) {
            const allIds = selector?.getListTaxRuleData?.data?.data?.list?.map(rule => rule._id) || [];
            setSelectedRow(allIds);
        } else {
            setSelectedRow([]);
        }
    };

    const handleApplySearchFilters = () => {
        const reqData = {
            page: pageNo,
            size: size,
            keyWord: filters.search,
            sortBy: "description",
            searchFields: "description",
            sortOrder: "desc"
        };
        dispatch(getListTaxRule(reqData));
        setIsRefresh(!isRefresh)
    }

    const handleSearchRemove = useCallback(() => {
        setFilters(prev => ({ ...prev, search: "" }));
        setKeyword("");
        setPageNo(1);
        setIsRefresh(!isRefresh)
    }, [dispatch, size, isRefresh]);

    const isAllRowsSelected = useMemo(() =>
        selectedRow.length === selector?.getListTaxRuleData?.data?.data?.list?.length && selector?.getListTaxRuleData?.data?.data?.list?.length > 0,
        [selectedRow.length, selector?.getListTaxRuleData?.data?.data?.list?.length]
    )

    const handleTaxChange = (selectedOption) => {
        setSelectedTax(selectedOption);
        setForm(prev => ({
            ...prev,
            tax_id: selectedOption.value
        }));
        setSelectedSubTax([]);
        setForm(prev => ({ ...prev, subTaxes_id: [] }));

        if (errors.tax_id) {
            setErrors(prev => ({
                ...prev,
                tax_id: undefined
            }));
        }
    };

    const handleSubTaxChange = (selectedOption) => {
        setSelectedSubTax(selectedOption);
        setForm(prev => ({
            ...prev,
            subTaxes_id: selectedOption.map(e => e.value)
        }));
        if (errors.subTaxes_id) {
            setErrors(prev => ({
                ...prev,
                subTaxes_id: undefined
            }));
        }
    };

    const handleCategoryChange = (selectedOption) => {
        setSelectedCategory(selectedOption);
        setForm(prev => ({
            ...prev,
            category_id: selectedOption.value
        }));

        if (errors.category_id) {
            setErrors(prev => ({
                ...prev,
                category_id: undefined
            }));
        }
    };

    return (
        <>
            <Loader loading={selector.loading} />
            <div className='max-w-7xl mx-auto'>
                <div className=' overflow-hidden overflow-y-auto py-6'>
                    <div className="flex justify-between items-center">
                        <h3><Link to="/app/home" className='cursor-pointer'>Home</Link> / <b><Link to="/app/tax">Tax</Link></b>/ <b>Tax Rules</b></h3>
                        <AddButton
                            className="border-[#3E4094] text-[#3E4094] mb-3"
                            onClick={() => {
                                setIsOpenAddModal(true);
                            }}
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
                                        placeholder="Search By Description"
                                        handleSearchRemove={handleSearchRemove}
                                        applyFilters={handleApplySearchFilters}
                                        isDelete={true}
                                    />
                                </div>
                            </div>
                        </div>
                        <TableData
                            Heading='Tax Rules'
                            tableHeadings={[
                                "Description", "Tax", "Category", "Status", "Actions"]}
                            data={tableRows}
                            showSearch={true}
                            placeholder='Search by...'
                            showFilter={false}
                            showSummary={false}
                            totalData={totalUsers}
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
                        {totalUsers && size && Math.ceil(totalUsers / size) > 1 && (
                            <Pagination
                                totalPages={Math.ceil(totalUsers / size)}
                                currentPage={pageNo}
                                onPageChange={onPageChange}
                            />
                        )}
                    </div>
                </div>

                <DefaultModal
                    isOpen={isOpenAddModal}
                    onClose={handleClose}
                    onSubmit={handleAddSubmit}
                    isButtonView={true}
                    submitButtonText="Submit"
                    closeButtonText="Reset"
                    title="Add Tax Rule"
                    titleClassName="mt-5 font-medium"
                >
                    <div className="w-full px-4 pt-2">
                        <Input
                            labelName="Description"
                            name="description"
                            type="textarea"
                            value={formData.description}
                            onChange={handleInputChange}
                            error={errors.description}
                            maxLength={50}
                            required
                        />
                    </div>
                    <div className='mb-3 px-4 pt-2'>
                        <FilterSelect
                            options={taxOptions}
                            label="Select Tax"
                            value={selectedTax}
                            onChange={handleTaxChange}
                            error={errors.tax_id}
                            required
                        />
                    </div>
                    <div className='mb-3 px-4 pt-2'>
                        <FilterSelect
                            options={filteredSubTaxOptions}
                            label="Select Sub Tax"
                            value={selectedSubTax}
                            onChange={handleSubTaxChange}
                            error={errors.subTaxes_id}
                            required
                            isMulti={true}
                            isDisabled={!selectedTax}
                        />
                    </div>
                    <div className='mb-3 px-4 pt-2'>
                        <FilterSelect
                            options={createSelectOptions}
                            label="Select a Category"
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                            error={errors.category_id}
                            required
                        />
                    </div>
                    <div className='flex justify-between items-center border p-3 m-4'>
                        <p className="font-medium text-sm">Status</p>
                        <ToggleButton isToggle={!formData.isDisable} handleClick={handleToggleStatus} />
                    </div>
                </DefaultModal>

                <DefaultModal
                    isOpen={isOpenEditModal}
                    onClose={handleEditClose}
                    onSubmit={handleEditSubmit}
                    isButtonView={true}
                    submitButtonText="Update"
                    closeButtonText="Cancel"
                    title="Edit Tax Rule"
                    titleClassName="mt-5 font-medium"
                >
                    <div className="w-full">
                        <Input
                            labelName="Description"
                            name="description"
                            type="textarea"
                            value={formData.description}
                            onChange={handleInputChange}
                            error={errors.description}
                            maxLength={50}
                            required
                        />
                    </div>
                    <div className='pb-2 px-4 pt-2'>
                        <FilterSelect
                            options={taxOptions}
                            label="Select Tax"
                            value={selectedTax}
                            onChange={handleTaxChange}
                            error={errors.tax_id}
                            required
                        />
                    </div>
                    <div className='pb-2 px-4 pt-2'>
                        <FilterSelect
                            options={filteredSubTaxOptions}
                            label="Select Sub Tax"
                            value={selectedSubTax}
                            onChange={handleSubTaxChange}
                            error={errors.subTaxes_id}
                            required
                            isMulti={true}
                        />
                    </div>
                    <div className='pb-2 px-4 pt-2'>
                        <FilterSelect
                            options={createSelectOptions}
                            label="Select a Category"
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                            error={errors.category_id}
                            required
                        />
                    </div>
                    <div className='flex justify-between items-center border p-3 m-4'>
                        <p className="font-medium text-sm">Status</p>
                        <ToggleButton
                            isToggle={!formData.isDisable}
                            handleClick={handleToggleStatus}
                        />
                    </div>
                </DefaultModal>

                <DeletePopup
                    isDeleteModalOpen={showDeleteConfirmation}
                    closeDeleteModal={() => setShowDeleteConfirmation(false)}
                    confirmDelete={confirmDelete}
                    DeleteHeading={'Are you sure you want to delete this tax rule?'}
                />

                <StatusPopup
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDisableFunc}
                    heading={`Are you sure you want to ${isRowActive(toggleStates) ? 'disable' : 'enable'} this tax rule?`}
                />
            </div>
        </>
    )
}

export default TaxRule
