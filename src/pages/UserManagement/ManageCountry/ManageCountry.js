import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import { create, getCountryList, editCountry, enableDisableCountry } from '../../../Redux/CountrySlice';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Button from '../../../components/Atoms/buttons/button';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import Input from '../../../components/Atoms/Input/Input';
import { toast } from 'sonner';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 10;
export const validateCountry = (data) => {
  const errors = {};
  if (!data.name?.trim()) {
    errors.name = 'Country name is required';
  } else if (data.name.length < 3 || data.name.length > 100) {
    errors.name = 'Country name must be between 3-100 characters';
  }
  if (!data.code?.trim()) {
    errors.code = 'Country code is required';
  } else if (data.code.length < 2 || data.code.length > 5) {
    errors.code = 'Country code must be between 2-5 characters';
  }
  if (!data?.dialCode?.trim()) {
    errors.dialCode = 'Dial code is required'
  } else if (data.dialCode && data.dialCode.length > 10) {
    errors.dialCode = 'Dial code must be 10 characters or less';
  }
  return errors;
};

const ManageCountry = () => {
  const dispatch = useDispatch();
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false)



  const initialFormState = {
    name: '',
    code: '',
    dialCode: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const fetchCountryList = useCallback(() => {
    const query = {
      page: pageNo,
      size: PAGE_SIZE,
      keyWord: filters?.search,
      searchFields: "name,code"
    };
    setIsLoading(true)
    dispatch(getCountryList(query))
      .then((res) => {
        setApiRes(res?.payload?.data?.data || { list: [], total: 0 });
      })
      .catch((err) => {
        console.error("Error fetching countries:", err);
      }).finally(() => {
        setIsLoading(false)
      })
  }, [dispatch, pageNo, filters?.search]);

  useEffect(() => {
    fetchCountryList();
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

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const handleToggle = async (country) => {
    const currentlyActive = isRowActive(country);
    let apiPayload = {
      _id: [country?._id],
      isDisable: currentlyActive
    }
    try {
      const res = await dispatch(enableDisableCountry(apiPayload)).unwrap();
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

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateCountry(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const apiCall = isEditMode ? editCountry : create;

    setIsLoading(true);

    dispatch(apiCall(formData))
      .unwrap()
      .then((res) => {
        setIsLoading(false);
        fetchCountryList();
        closeModal();
      })
      .catch((error) => {
        toast.error(error || "Error saving country:");
        setIsLoading(false);
        if (error?.errors) {
          setErrors(error.errors);
        }
      });
  };


  const confirmDelete = async () => {

  };

  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true
      };
      try {
        const res = await dispatch(enableDisableCountry(apiPayload)).unwrap();
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




  const tableHeadings = ["Full Name", "Code", "Status", "Action"];

  const tableRows = apiRes?.list?.map((ele) => [
    <input
      type='checkbox'
      checked={selectedRow.includes(ele._id)}
      onChange={(e) => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className='capitalize'>{ele?.name}</span>,
    ele?.code,
    <div className='flex flex-col'>
      <ToggleButton isToggle={isRowActive(ele)} handleClick={() => handleToggle(ele)} />

    </div>,
    <ActionButtons
      onEdit={() => {
        setFormData({
          name: ele.name,
          code: ele.code,
          dialCode: ele.dialCode,
          _id: ele._id
        });
        setIsEditMode(true);
        setIsAddModal(true);
      }}
      showLinkButton={false}
      showDeleteButton={false}
    />
  ]);

  return (
    <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
      <Loader loading={isLoading} />
      <div className='flex justify-between items-center'>
        <h3>Home / <Link to="/app/setting">Settings</Link> / Country</h3>
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
        />

        <TableData
          Heading='Manage Country'
          tableHeadings={tableHeadings}
          data={tableRows}
          showSearch={true}
          showFilter={false}
          showSummary={false}
          totalData={apiRes?.total}
          totalSize={PAGE_SIZE}
          currentPage={pageNo}
          isHeaderCheckbox={true}
          handleHeaderCheckboxChange={handleHeaderCheckboxChange}
          allRowsSelected={selectedRow.length === apiRes?.list?.length}
        />
        {apiRes?.total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={onPageChange}
          />
        )
        }

      </div>

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        confirmDelete={confirmDelete}
        DeleteHeading='Are you sure you want to delete?'
      />
      <DefaultModal
        title={isEditMode ? 'Edit Country' : 'Add Country'} isOpen={isAddModal} onClose={closeModal} onSubmit={handleSubmit}  >
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
            />
          </div>

          <Input
            labelName='Code'
            type='text'
            value={formData.code}
            name='code'
            onChange={handleInputChange}
            error={errors.code}
            required
            maxLength={25}

          />

          <Input
            labelName='Dial Code'
            type='text'
            value={formData.dialCode}
            name='dialCode'
            onChange={handleInputChange}
            error={errors.dialCode}
            required
            maxLength={25}

          />
        </div>
      </DefaultModal>
    </div>
  );
};

export default ManageCountry;
