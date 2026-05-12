/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import { useDispatch, useSelector } from 'react-redux'
import { create, editState, enableDisableState, getStateList } from '../../../Redux/stateSlice'
import { toast } from 'sonner'
import Loader from '../../../components/Loader/Loader'
import Button from '../../../components/Atoms/buttons/button'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import { getAllCountryList } from '../../../Redux/CountrySlice'
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import { Link } from 'react-router-dom'

const size = 10

const ManageState = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state?.country)
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "", country: "" });
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)


  const initialFormState = {
    name: '',
    country_code: null,
    _id: null
  };

  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({});

  const mappedCountries = selector?.getAllCountryListData?.data?.data?.list?.map((e) => ({
    value: e?._id,
    label: e?.name,
  }));

  const modifiedData = [
    { value: "", label: "All country" },
    ...(mappedCountries || [])
  ];

  const fetchStateList = useCallback(() => {
    const query = {
      page: pageNo,
      size: size,
      keyWord: filters?.search,
      searchFields: "name,code,country",
      populate: 'country_code:name',
      countryId: filters?.country?.value || undefined,
    };
    setIsLoading(true)
    dispatch(getStateList(query))
      .then((res) => {
        setApiRes(res?.payload?.data?.data || { list: [], total: 0 });
      })
      .catch((err) => {
        console.error("Error fetching countries:", err);
      }).finally(() => {
        setIsLoading(false)
      })
  }, [dispatch, pageNo, filters?.search, filters?.country?.value]);

  useEffect(() => {
    fetchStateList();
    dispatch(getAllCountryList())
  }, [fetchStateList, dispatch]);

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

  const handleSelectChange = (selectedOption, { name }) => {
    setFormData(prev => ({
      ...prev,
      country_code: selectedOption?.value || null
    }));
    if (errors.country_code) {
      setErrors(prev => ({ ...prev, country_code: undefined }));
    }
  };

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
    setIsSubmitting(false);
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

    if (!formData.name || !formData.name.toString().trim()) {
      newErrors.name = 'Name is required';
    } else {
      const trimmedName = formData.name.toString().trim();
      if (trimmedName.length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      } else if (trimmedName.length > 25) {
        newErrors.name = 'Name must be less than 25 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
        newErrors.name = 'Name can only contain letters and spaces';
      } else if (/^\s|\s$/.test(formData.name)) {
        newErrors.name = 'Name cannot start or end with spaces';
      } else if (/\s{2,}/.test(trimmedName)) {
        newErrors.name = 'Name cannot contain multiple consecutive spaces';
      }
    }
    if (!formData.country_code) {
      newErrors.country_code = 'Country is required';
    } else if (formData.country_code === "") {
      newErrors.country_code = 'Please select a valid country';
    }

    return newErrors;
  };

  const validateDuplicateName = (name, currentId = null) => {
    const trimmedName = name.toString().trim().toLowerCase();
    const existingState = apiRes?.list?.find(state =>
      state.name.toLowerCase() === trimmedName &&
      state._id !== currentId
    );
    return existingState ? 'State name already exists' : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const validationErrors = validateForm();

    if (!validationErrors.name && formData.name) {
      const duplicateError = validateDuplicateName(formData.name, formData._id);
      if (duplicateError) {
        validationErrors.name = duplicateError;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formData.name.toString().trim(),
      country_code: formData.country_code
    };

    try {
      if (isEditMode) {
        await dispatch(editState({ ...payload, _id: formData._id })).unwrap();
        toast.success('State updated successfully');
      } else {
        await dispatch(create(payload)).unwrap();
        toast.success('State created successfully');
      }
      closeModal();
      fetchStateList();
    } catch (error) {
      console.error(error || "Error saving ");

      if (error?.errors) {
        setErrors(error.errors);
      } else if (error?.message) {
        toast.error(error.message);
      } else if (typeof error === 'string') {
        toast.error(error);
      } else {
        toast.error('Failed to save state. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const handleToggle = async (state) => {
    const currentlyActive = isRowActive(state);
    let apiPayload = {
      _id: [state?._id],
      isDisable: currentlyActive
    }
    try {
      const res = await dispatch(enableDisableState(apiPayload)).unwrap();
      if (res) {
        toast.success(res?.message)
      }
      fetchStateList();
    } catch (error) {
      toast.error(error?.message || error || "Failed...!")
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  const applyFilters = useCallback(() => {
    setPageNo(1);
    fetchStateList();
  }, [fetchStateList]);

  const tableHeadings = ["State Name", "Country Name", "Status", "Action"];

  const tableRows = apiRes?.list?.map((ele) => [
    <input
      type='checkbox'
      checked={selectedRow.includes(ele._id)}
      onChange={(e) => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className='capitalize'>{ele?.name}</span>,
    ele?.countryId?.name || ele?.country_code?.name || 'N/A',
    <div className='flex flex-col'>
      <ToggleButton isToggle={isRowActive(ele)} handleClick={() => handleToggle(ele)} />
    </div>,
    <ActionButtons
      onEdit={() => {
        setFormData({
          name: ele.name,
          country_code: ele.countryId?._id || ele.country_code?._id,
          _id: ele._id
        });
        setIsEditMode(true);
        setIsAddModal(true);
        setErrors({});
      }}
      showLinkButton={false}
      showDeleteButton={false}
    />
  ]);

  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true
      };
      try {
        const res = await dispatch(enableDisableState(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        setSelectedRow([])
        fetchStateList();
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
        setSelectedRow([])
        if (error.errors) {
          setErrors(error.errors);
        }
      }
    }
  };

  const handleSearchRemove = () => {
    setFilters({ search: "", country: "" })
    setPageNo(1);
  }

  return (
    <>
      <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
        <Loader loading={isLoading} />
        <div className='flex justify-between items-center'>
          <h3>Home / <Link to="/app/setting">Settings</Link>  / State</h3>
          <Button onClick={() => {
            setFormData(initialFormState);
            setIsEditMode(false);
            setIsAddModal(true);
            setErrors({});
          }}>
            Add
          </Button>
        </div>

        <div className='p-4 overflow-auto overflow-y-auto bg-white border border-[#E6E6E6]'>
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
            countryOptions={modifiedData}
            isSelectNearSearch={true}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
          />

          <TableData
            Heading='Manage State'
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
          {apiRes?.total > size && (
            <Pagination
              totalPages={Math.ceil(apiRes?.total / size)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )}
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
                maxLength={25}
                disabled={isSubmitting}
              />
            </div>
         
            <div className='col-span-2'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Country <span className='text-red-500'>*</span>
              </label>
              <FilterSelect
                options={modifiedData.filter(option => option.value !== "")}
                value={modifiedData?.find(option => option.value === formData.country_code) || null}
                onChange={handleSelectChange}
                name="country_code"
                className="basic-single"
                classNamePrefix="select"
                isSearchable
                placeholder="Select Country"
                isDisabled={isSubmitting}
              />
              {errors.country_code && (
                <p className="mt-1 text-sm text-red-600">{errors.country_code}</p>
              )}
            </div>
          </div>

        </DefaultModal>
      </div>
    </>
  )
}

export default ManageState
