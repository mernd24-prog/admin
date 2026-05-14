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
import { Link, useParams } from 'react-router-dom';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import {
  createCMSContentList,
  enableDisableCMS,
  getCMSContentList,
  softDeleteCMSList,
  updateCMSList
} from '../../../Redux/cmsSlice';
import { TextEditor } from '../../../components/Atoms/FormInput/TextEditor';

const HolidaysList = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const [toggleStates, setToggleStates] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [formData, setForm] = useState({
    _id: '',
    title: '',
    content: '',
    holiday_date: '',
    isDisable: false
  });
  const [errors, setErrors] = useState({});
  const [filters, setFilters] = useState({ search: "" });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [deleteData, setDeleteData] = useState("");
  const size = 10;

  // Selector for CMS data
  const selector = useSelector(state => state.cms);
  const getListData = selector?.getCMSContentListData?.data?.data?.list || [];
  const totalItems = selector?.getCMSContentListData?.data?.data?.total || 0;
  const loading = selector.loading;

  // Fetch Holidays list
  useEffect(() => {
    const fetchHolidaysList = async () => {
      try {
        const reqData = {
          page: pageNo,
          size: size,
          keyWord: filters.search,
          searchFields: 'title',
          select: 'title content holiday_date isDisable',
          query: JSON.stringify({ category_id: id })
        };
        await dispatch(getCMSContentList(reqData)).unwrap();
      } catch (error) {
        toast.error(error.message || "Failed to fetch holidays list");
      }
    };

    fetchHolidaysList();
  }, [dispatch, size, pageNo, isRefresh, id, filters.search]);

  // Handle input changes
  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm(prevData => ({
      ...prevData,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleContentChange = (value) => {
    setForm(prev => ({ ...prev, content: value }));
    if (errors.content) setErrors(prev => ({ ...prev, content: undefined }));
  };

  const getPlainText = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent?.trim() || '';
  };

  // Handle date change - convert to timestamp
  const handleDateChange = e => {
    const { name, value } = e.target;
    const date = new Date(value);
    const timestamp = date.getTime();

    setForm(prevData => ({
      ...prevData,
      [name]: timestamp
    }));

    if (errors.holiday_date) {
      setErrors(prev => ({
        ...prev,
        holiday_date: undefined
      }));
    }
  };

  // Form validations
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData?.title?.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    } else if (formData?.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
      isValid = false;
    }

    const plainContent = getPlainText(formData?.content);
    if (!plainContent) {
      newErrors.content = 'Content is required';
      isValid = false;
    } else if (plainContent.length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
      isValid = false;
    }

    if (!formData?.holiday_date) {
      newErrors.holiday_date = 'Date is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Reset form and close modal
  const resetForm = () => {
    setForm({
      _id: '',
      title: '',
      content: '',
      holiday_date: '',
      isDisable: false
    });
    setErrors({});
  };

  // Format timestamp to date string for input field
  const formatDateForInput = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  // Format timestamp for display
  const formatDateForDisplay = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Handle add Holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const reqData = {
        title: formData.title,
        category_id: id,
        content: formData.content,
        holiday_date: formData.holiday_date,
        isDisable: formData.isDisable
      };

      const res = await dispatch(createCMSContentList(reqData)).unwrap();

      toast.success(res.message || "Holiday created successfully");
      setIsOpenAddModal(false);
      resetForm();
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(error || "Error creating Holiday");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  // Handle edit Holiday
  const handleEditHoliday = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const reqData = {
        _id: formData._id,
        title: formData.title,
        category_id: id,
        content: formData.content,
        holiday_date: formData.holiday_date,
        isDisable: formData.isDisable
      };

      const res = await dispatch(updateCMSList(reqData)).unwrap();

      toast.success(res.message || "Holiday updated successfully");
      setIsEditModal(false);
      resetForm();
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(error.message || "Error updating Holiday");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  // Handle delete Holiday
  const confirmDelete = async () => {
    try {
      const res = await dispatch(softDeleteCMSList(deleteData)).unwrap();
      toast.success(res.message || "Holiday deleted successfully");
      setShowDeleteConfirmation(false);
      setIsRefresh(!isRefresh);
      setSelectedRow([]);
    } catch (error) {
      toast.error(error.message || "Error deleting Holiday");
    }
  };

  // Handle status toggle
  const handleDisableFunc = async () => {
    if (!toggleStates) return;

    try {
      const obj = {
        _id: [toggleStates._id],
        isDisable: !toggleStates.isDisable
      };

      const res = await dispatch(enableDisableCMS(obj)).unwrap();
      toast.success(res.message || "Status updated successfully");
      setIsConfirmModalOpen(false);
      setToggleStates(null);
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(error.message || "Error updating status");
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedRow.length === 0) {
      toast.warning("Please select at least one holiday");
      return;
    }

    try {
      if (action === "Active" || action === "Inactive") {
        const apiPayload = {
          _id: selectedRow,
          isDisable: action === "Active" ? false : true
        };

        const res = await dispatch(enableDisableCMS(apiPayload)).unwrap();
        toast.success(res?.message || "Bulk action completed");
        setIsRefresh(!isRefresh);
        setSelectedRow([]);
      }
    } catch (error) {
      toast.error(error?.message || "Failed to perform bulk action");
    }
  };

  // Row checkbox handler
  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  };

  // Select all checkbox handler
  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allIds = getListData.map(item => item._id);
      setSelectedRow(allIds);
    } else {
      setSelectedRow([]);
    }
  };

  // Toggle status in form
  const handleToggleStatus = () => {
    setForm(prev => ({
      ...prev,
      isDisable: !prev.isDisable,
    }));
  };

  // Apply search filters
  const handleApplySearchFilters = () => {
    setPageNo(1);
    setIsRefresh(!isRefresh);
  };

  // Clear search filters
  const handleSearchRemove = useCallback(() => {
    setFilters(prev => ({ ...prev, search: "" }));
    setPageNo(1);
    setIsRefresh(!isRefresh);
  }, [isRefresh]);

  // Prepare table data
  const tableRows = getListData.map((holiday) => [
    <CustomCheckbox
      key={`checkbox-${holiday._id}`}
      checked={selectedRow.includes(holiday._id)}
      onChange={(e) => handleRowCheckboxChange(e, holiday._id)}
    />,
    <span key={`title-${holiday._id}`} className="capitalize">
      {holiday?.title}
    </span>,
    <span key={`date-${holiday._id}`} className="capitalize">
      {formatDateForDisplay(holiday?.holiday_date)}
    </span>,
    <div key={`status-${holiday._id}`} className='flex flex-col'>
      <ToggleButton
        isToggle={!holiday?.isDisable}
        handleClick={() => {
          setToggleStates(holiday);
          setIsConfirmModalOpen(true);
        }}
      />
    </div>,
    <span key={`actions-${holiday._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: holiday._id,
            title: holiday.title,
            content: holiday.content,
            holiday_date: holiday.holiday_date,
            isDisable: holiday.isDisable
          });
          setIsEditModal(true);
        }}
        onDelete={() => {
          setDeleteData({ _id: [holiday._id] });
          setShowDeleteConfirmation(true);
        }}
        showLinkButton={false}
      />
    </span>,
  ]);

  // Check if all rows are selected
  const isAllRowsSelected = useMemo(() =>
    selectedRow.length === getListData.length && getListData.length > 0,
    [selectedRow.length, getListData.length]
  );

  return (
    <>
      <Loader loading={loading} />
      <div className='max-w-7xl mx-auto'>
        <div className='overflow-hidden overflow-y-auto py-6'>
          <div className="flex justify-between items-center">
            <h3>
              <Link to="/app/home" className='cursor-pointer'>Home</Link> /
              <Link to="/app/holidays" className='ml-1'><b>Holidays</b></Link> /
              <b className='ml-1'>Holidays List</b>
            </h3>
            <AddButton
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => setIsOpenAddModal(true)}
            >
              Add Holiday
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
                    placeholder="Search by Title"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>

            <TableData
              Heading='Holidays List'
              tableHeadings={["Title", "Date", "Status", "Actions"]}
              data={tableRows}
              showSearch={false}
              showFilter={false}
              showSummary={false}
              totalData={totalItems}
              totalSize={size}
              currentPage={pageNo}
              onPageChange={(newPage) => setPageNo(newPage)}
              isHeaderCheckbox={true}
              handleHeaderCheckboxChange={handleSelectAllChange}
              allRowsSelected={isAllRowsSelected}
            />
          </div>

          <div className="flex justify-center my-6">
            {totalItems > 0 && Math.ceil(totalItems / size) > 1 && (
              <Pagination
                totalPages={Math.ceil(totalItems / size)}
                currentPage={pageNo}
                onPageChange={(newPage) => setPageNo(newPage)}
              />
            )}
          </div>
        </div>

        {/* Add Holiday Modal */}
        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={() => {
            setIsOpenAddModal(false);
            resetForm();
          }}
          onSubmit={handleAddHoliday}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Cancel"
          title="Add Holiday"
          titleClassName="mt-5 font-medium"
        >
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              error={errors.title}
              maxLength={100}
              required
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <TextEditor
              label="Content"
              value={formData.content}
              onChange={handleContentChange}
              placeholder="Write content..."
              height="200px"
              error={errors.content}
              required
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Date"
              name="holiday_date"
              type="date"
              value={formatDateForInput(formData.holiday_date)}
              onChange={handleDateChange}
              onInput={(e) => {
                const inputDate = new Date(e.target.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // remove time from today

                if (inputDate < today) {
                  e.target.value = ""; // clear input if past date
                }
              }}
              error={errors.holiday_date}
              required
              min={new Date().toISOString().split("T")[0]} // disables past selection via picker
            />
          </div>


          <div className='flex justify-between items-center border p-3 rounded mt-4'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleStatus}
            />
          </div>
        </DefaultModal>

        {/* Edit Holiday Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={() => {
            setIsEditModal(false);
            resetForm();
          }}
          onSubmit={handleEditHoliday}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Holiday"
          titleClassName="mt-5 font-medium"
        >
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              error={errors.title}
              maxLength={100}
              required
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <TextEditor
              label="Content"
              value={formData.content}
              onChange={handleContentChange}
              placeholder="Write content..."
              height="200px"
              error={errors.content}
              required
            />
          </div>
          <div className="w-full mb-4 px-4 pt-2">
            <Input
              labelName="Date"
              name="holiday_date"
              type="date"
               onInput={(e) => {
                const inputDate = new Date(e.target.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (inputDate < today) {
                  e.target.value = ""; 
                }
              }}
              value={formatDateForInput(formData.holiday_date)}
              onChange={handleDateChange}
              error={errors.holiday_date}
              required
            />
          </div>
          <div className='flex justify-between items-center border p-3 rounded mt-4'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleStatus}
            />
          </div>
        </DefaultModal>

        {/* Delete Confirmation Modal */}
        <DeletePopup
          isDeleteModalOpen={showDeleteConfirmation}
          closeDeleteModal={() => setShowDeleteConfirmation(false)}
          confirmDelete={confirmDelete}
          DeleteHeading={'Are you sure you want to delete this Holiday?'}
        />

        {/* Status Confirmation Modal */}
        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this Holiday?`}
        />
      </div>
    </>
  )
}

export default HolidaysList;