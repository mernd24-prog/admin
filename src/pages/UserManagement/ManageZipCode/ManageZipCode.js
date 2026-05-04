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
import { create, edit, enableDisableZipCode, getZipCodeList } from '../../../Redux/zipCodeSlice'
import { getAllCityList } from '../../../Redux/citySlice'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import { getAllCountryList } from '../../../Redux/CountrySlice'
import { getAllStateList } from '../../../Redux/stateSlice'
import { transformArray } from '../../../_helpers/globalFunctions'
import { Link } from 'react-router-dom'


const size = 10
const ManageZipcode = () => {
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
    country_code: "",
    state_code: "",
    city_code: "",
    name: "",
    _id: null
  };

  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({});

  const modifiedCountry = transformArray(selector?.country?.getAllCountryListData?.data?.data?.list || [])
  const modifiedState = transformArray(selector?.state?.getAllStateListData?.data?.data?.list || [])
  const modifiedCity = transformArray(selector?.city?.getAllCityListData?.data?.data?.list || [])

  const fetchCountryList = useCallback(() => {
    const query = {
      page: pageNo,
      size: size,
      keyWord: filters?.search,
      searchFields: "name",
      populate: 'city_code:name|country_code:name|state_code:name',
    };
    setIsLoading(true)
    dispatch(getZipCodeList(query))
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
    dispatch(getAllCountryList())
  }, [fetchCountryList]);

  // Load states when country changes in form
  useEffect(() => {
    if (formData.country_code) {
      dispatch(getAllStateList({ query: JSON.stringify({ country_code: formData.country_code }) }));
    }
  }, [formData.country_code, dispatch]);

  // Load cities when state changes in form
  useEffect(() => {
    if (formData.state_code) {
      dispatch(getAllCityList({ query: JSON.stringify({ state_code: formData.state_code }) }));
    }
  }, [formData.state_code, dispatch]);

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
    console.log(e.target.value)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (selectedOption, action) => {
    switch (action) {
      case 'COUNTRY':
        setFormData(prev => ({
          ...prev,
          country_code: selectedOption?.value || "",
          state_code: "",
          city_code: "",
        }));
        break;

      case 'STATE':
        setFormData(prev => ({
          ...prev,
          state_code: selectedOption?.value || "",
          city_code: "",
        }));
        break;

      case 'CITY':
        setFormData(prev => ({
          ...prev,
          city_code: selectedOption?.value || "",
        }));
        break;
      default:
        break;
    }

    setErrors({})
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
    const zipTrimmed = formData.name?.trim();
    if (!zipTrimmed) {
      newErrors.name = 'Zip Code is required';
    }
    else if (!/^[a-zA-Z0-9]{4,10}$/.test(zipTrimmed)) {
      newErrors.name = 'Zip Code must be 4–10 letters or numbers (no symbols or spaces)';
    }
    if (!formData.city_code) {
      newErrors.city_code = 'City is required';
    }
    if (!formData?.country_code) {
      newErrors.country_code = 'Country is required';
    }
     if (!formData?.state_code) {
      newErrors.state_code = 'state is required';
    }

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
      city_code: formData.city_code,
      country_code: formData?.country_code,
      state_code: formData?.state_code
    };

    try {
      if (isEditMode) {
        await dispatch(edit({ ...payload, _id: formData._id })).unwrap();
        toast.success('Zipcode updated successfully');
      } else {
        await dispatch(create(payload)).unwrap();
        toast.success('Zipcode created successfully');
      }
      closeModal();
      fetchCountryList();
    } catch (error) {
      toast.error(error || 'Failed to save zipcode');
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
      const res = await dispatch(enableDisableZipCode(apiPayload)).unwrap();
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
      populate: 'city_code:name',
      query: JSON.stringify(filters?.country?.value ? { city_code: filters?.country?.value } : {})
    };
    setIsLoading(true)
    dispatch(getZipCodeList(query))
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

  const tableHeadings = ["ZipCode", "City Name", "Status", "Action"];

  const tableRows = apiRes?.list?.map((ele) => [
    <input
      type='checkbox'
      checked={selectedRow.includes(ele._id)}
      onChange={(e) => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className='capitalize'>{ele?.name}</span>,
    ele?.city_code?.name,
    <div className='flex flex-col'>
      <ToggleButton isToggle={!ele?.isDisable} handleClick={() => handleToggle(ele)} />
    </div>,
    <ActionButtons
      onEdit={async () => {
        // Set form data with the selected item's values
        setFormData({
          name: ele.name,
          state_code: ele?.state_code?._id,
          country_code: ele?.country_code?._id,
          city_code: ele.city_code?._id,
          _id: ele._id
        });

        // Load states for the selected country if not already loaded
        if (ele?.country_code?._id) {
          await dispatch(getAllStateList({ query: JSON.stringify({ country_code: ele.country_code._id }) }));
        }

        // Load cities for the selected state if not already loaded
        if (ele?.state_code?._id) {
          await dispatch(getAllCityList({ query: JSON.stringify({ state_code: ele.state_code._id }) }));
        }

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
        const res = await dispatch(enableDisableZipCode(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
          setSelectedRow([])
        }
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
      populate: 'city_code:name',
    };
    setIsLoading(true)
    dispatch(getZipCodeList(query))
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
          <h3>Home / <Link to="/app/setting">Settings</Link> / Zipcode</h3>
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
            countryOptions={modifiedCity}
            isSelectNearSearch={true}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
          />

          <TableData
            Heading='Manage Zipcodes'
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
          title={isEditMode ? 'Edit Zipcode' : 'Add Zipcode'}
          isOpen={isAddModal}
          onClose={closeModal}
          onSubmit={handleSubmit}
        >
          <div className='space-y-3 gap-4 p-3'>
            <div>
              <FilterSelect
                label="Country *"
                name="country_code"
                value={modifiedCountry.find(c => c.value === formData.country_code) || null}
                onChange={(e) => handleSelectChange(e, 'COUNTRY')}
                options={modifiedCountry}
                placeholder="Select Country"
                error={errors.country_code}
              />
            </div>
            <div>
              <FilterSelect
                label="State *"
                name="state_code"
                value={modifiedState.find(s => s.value === formData.state_code) || null}
                onChange={(e) => handleSelectChange(e, 'STATE')}
                options={modifiedState}
                placeholder="Select State"
                disabled={!formData.country_code}
                error={errors.state_code}
              />
            </div>
            <div>
              <FilterSelect
                label="City *"
                name="city_code"
                value={modifiedCity.find(c => c.value === formData.city_code) || null}
                onChange={(e) => handleSelectChange(e, 'CITY')}
                options={modifiedCity}
                placeholder="Select City"
                disabled={!formData.state_code}
                error={errors.city_code}
              />
            </div>
            <div className='col-span-2'>
              <Input
                labelName='Zipcode'
                type='text'
                value={formData.name}
                name='name'
                onChange={handleInputChange}
                error={errors.name}
                required
                disable={!formData?.city_code}
              />
            </div>
          </div>
        </DefaultModal>
      </div>
    </>
  )
}

export default ManageZipcode