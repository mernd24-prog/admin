/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import Loader from '../../../components/Loader/Loader'
import Button from '../../../components/Atoms/buttons/button'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect'
import { create, edit, enableDisableCity, getCityList } from '../../../Redux/citySlice'
import { getAllStateList } from '../../../Redux/stateSlice'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import { Link } from 'react-router-dom'

const size = 10
const ManageCity = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state)
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "", country: "" });
  const [isLoading, setIsLoading] = useState(false)
  console.warn(selector)
  const initialFormState = {
    name: '',
    state_code: null,
    _id: null
  };

  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({});

  const mappedCountries = selector?.state?.getAllStateListData?.data?.data?.list?.map((e) => ({
    value: e?._id,
    label: e?.name,
  })) || [];

  const modifiedData = [
    { value: "", label: "All " },
    ...mappedCountries
  ];

  const fetchCountryList = useCallback(() => {
    const query = {
      page: pageNo,
      size: size,
      keyWord: filters?.search,
      searchFields: "name",
      populate: 'state_code:name',
    };
    setIsLoading(true)
    dispatch(getCityList(query))
      .then((res) => {
        if (res?.payload?.data) {
          setApiRes(res.payload.data);
        } else {
          setApiRes({ list: [], total: 0 });
        }
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setApiRes({ list: [], total: 0 });
      }).finally(() => {
        setIsLoading(false)
      })
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchCountryList();
    dispatch(getAllStateList())
  }, [fetchCountryList]);

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
      state_code: selectedOption?.value || null
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
    if (!formData.state_code) newErrors.state_code = 'State is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      name: formData.name,
      state_code: formData.state_code
    };

    try {
      if (isEditMode) {
        await dispatch(edit({ ...payload, _id: formData._id })).unwrap();
        toast.success('City updated successfully');
      } else {
        await dispatch(create(payload)).unwrap();
        toast.success('City created successfully');
      }
      closeModal();
      fetchCountryList();
    } catch (error) {
      console.error("Error saving city:", error);
      toast.error(error || 'Failed to save city');
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  const handleToggle = async (city) => {
    let apiPayload = {
      _id: [city?._id],
      isDisable: city?.isDisable ? false : true
    }
    try {
      const res = await dispatch(enableDisableCity(apiPayload)).unwrap();
      if (res) {
        toast.success(res?.message)
      }
      fetchCountryList();
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
      keyWord: filters?.search,
      searchFields: "name",
      populate: 'state_code:name',
      query: JSON.stringify(filters?.country?.value ? { state_code: filters?.country?.value } : {})
    };
    setIsLoading(true)
    dispatch(getCityList(query))
      .then((res) => {
        if (res?.payload?.data) {
          setApiRes(res.payload.data);
        } else {
          setApiRes({ list: [], total: 0 });
        }
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setApiRes({ list: [], total: 0 });
      }).finally(() => {
        setIsLoading(false)
      })
  }, [dispatch, pageNo, filters]);

  const tableHeadings = ["City Name", "State Name", "Status", "Action"];

  const tableRows = apiRes?.list?.map((ele) => [
    <input
      type='checkbox'
      checked={selectedRow.includes(ele._id)}
      onChange={(e) => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className='capitalize'>{ele?.name}</span>,
    <span className='capitalize'>{ele?.state_code?.name}</span>,
    <div className='flex flex-col'>
      <ToggleButton isToggle={!ele?.isDisable} handleClick={() => handleToggle(ele)} />
    </div>,
    <ActionButtons
      onEdit={() => {
        setFormData({
          name: ele.name,
          state_code: ele.state_code?._id,
          _id: ele._id
        });
        setIsEditMode(true);
        setIsAddModal(true);
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
        const res = await dispatch(enableDisableCity(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        setSelectedRow([])
        fetchCountryList();
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
    const query = {
      page: pageNo,
      size: size,
      keyWord: "",
      searchFields: "name",
      populate: 'state_code:name',
    };
    setIsLoading(true)
    dispatch(getCityList(query))
      .then((res) => {
        if (res?.payload?.data) {
          setApiRes(res.payload.data);
        } else {
          setApiRes({ list: [], total: 0 });
        }
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setApiRes({ list: [], total: 0 });
      }).finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <>
      <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
        <Loader loading={isLoading} />
        <div className='flex justify-between items-center'>
          <h3>Home / <Link to="/app/setting">Settings</Link> / Cities</h3>
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
            placeholder={`Search by name`}
            handleAction={handleBulkAction}
            countryOptions={modifiedData}
            isSelectNearSearch={true}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
          />

          <TableData
            Heading='Manage Cities'
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
          title={isEditMode ? 'Edit City' : 'Add City'}
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
                maxLength={50}
              />
            </div>
            <div className='col-span-2'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                State <span className='text-red-500'>*</span>
              </label>
              <FilterSelect
                options={modifiedData}
                value={modifiedData?.find(option => option.value === formData.state_code) || null}
                onChange={handleSelectChange}
                name="state_code"
                className="basic-single"
                classNamePrefix="select"
                isSearchable
                placeholder="Select State"
              />
              {errors.state_code && (
                <p className="mt-1 text-sm text-red-600">{errors.state_code}</p>
              )}
            </div>
          </div>
        </DefaultModal>
      </div>
    </>
  )
}

export default ManageCity