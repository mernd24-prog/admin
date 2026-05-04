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

const HelpSupportList = () => {
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

  // Fetch FAQ list
  useEffect(() => {
    const fetchFAQList = async () => {
      try {
        const reqData = {
          page: pageNo,
          size: size,
          keyWord: filters.search,
          searchFields: 'title',
          select: 'title content isDisable',
          query: JSON.stringify({ category_id: id })
        };
        await dispatch(getCMSContentList(reqData)).unwrap();
      } catch (error) {
        toast.error(error.message || "Failed to fetch FAQ list");
      }
    };

    fetchFAQList();
  }, [dispatch, size, pageNo, isRefresh, id]);

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

    if (!formData?.content?.trim()) {
      newErrors.content = 'Content is required';
      isValid = false;
    } else if (formData?.content.length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
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
      isDisable: false
    });
    setErrors({});
  };

  // Handle add FAQ
  const handleAddFAQ = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const reqData = {
        title: formData.title,
        category_id: id,
        content: formData.content,
        isDisable: formData.isDisable
      };

      const res = await dispatch(createCMSContentList(reqData)).unwrap();
      // console.log(res)

      toast.success(res.message || "FAQ created successfully");
      setIsOpenAddModal(false);
      resetForm();
      setIsRefresh(!isRefresh);
    } catch (error) {
      // console.log("error===>>",error)
      toast.error(error || "Error creating FAQ");

    }
  };

  // Handle edit FAQ
  const handleEditFAQ = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const reqData = {
        _id: formData._id,
        title: formData.title,
        category_id: id,
        content: formData.content,
        isDisable: formData.isDisable
      };

      const res = await dispatch(updateCMSList(reqData)).unwrap();

      toast.success(res.message || "Data updated successfully");
      setIsEditModal(false);
      resetForm();
      setIsRefresh(!isRefresh);
    } catch (error) {
      toast.error(error || "Error updating Data");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  // Handle delete FAQ
  const confirmDelete = async () => {
    try {
      const res = await dispatch(softDeleteCMSList(deleteData)).unwrap();
      toast.success(res.message || "FAQ deleted successfully");
      setShowDeleteConfirmation(false);
      setIsRefresh(!isRefresh);
      setSelectedRow([]);
    } catch (error) {
      toast.error(error.message || "Error deleting FAQ");
    }
  };

  // Handle status toggle
  const handleDisableFunc = async () => {
    if (!toggleStates) return;

    try {
      const obj = {
        _id: Array(toggleStates._id),
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
      toast.warning("Please select at least one FAQ");
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
  const tableRows = getListData.map((faq) => [
    <CustomCheckbox
      key={`checkbox-${faq._id}`}
      checked={selectedRow.includes(faq._id)}
      onChange={(e) => handleRowCheckboxChange(e, faq._id)}
    />,
    <span key={`title-${faq._id}`} className="capitalize">
      {faq?.title}
    </span>,
    <div key={`status-${faq._id}`} className='flex flex-col'>
      <ToggleButton
        isToggle={!faq?.isDisable}
        handleClick={() => {
          setToggleStates(faq);
          setIsConfirmModalOpen(true);
        }}
      />
    </div>,
    <span key={`actions-${faq._id}`}>
      <ActionButtons
        onEdit={() => {
          setForm({
            _id: faq._id,
            title: faq.title,
            content: faq.content,
            isDisable: faq.isDisable
          });
          setIsEditModal(true);
        }}
        onDelete={() => {
          setDeleteData({ _id: [faq._id] });
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
              <Link to="/app/terms-and-conditions" className='ml-1'><b>Help Support </b></Link> /
              <b className='ml-1'>Help Support List</b>
            </h3>
            <AddButton
              className="border-[#3E4094] text-[#3E4094] mb-3"
              onClick={() => setIsOpenAddModal(true)}
            >
              Add FAQ
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
                    placeholder="Search by FAQ title"
                    handleSearchRemove={handleSearchRemove}
                    applyFilters={handleApplySearchFilters}
                  />
                </div>
              </div>
            </div>

            <TableData
              Heading='FAQ List'
              tableHeadings={["Title", "Status", "Actions"]}
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

        <DefaultModal
          isOpen={isOpenAddModal}
          onClose={() => {
            setIsOpenAddModal(false);
            resetForm();
          }}
          onSubmit={handleAddFAQ}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Cancel"
          title="Create Help & Support"
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
            <Input
              labelName="Content"
              name="content"
              type="textarea"
              value={formData.content}
              onChange={handleInputChange}
              error={errors.content}
              maxLength={1000}
              rows={4}
              required
            />
          </div>
          <div className='flex justify-between items-center border p-3 rounded m-4'>
            <p className="font-medium text-sm">Status</p>
            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={handleToggleStatus}
            />
          </div>
        </DefaultModal>

        {/* Edit FAQ Modal */}
        <DefaultModal
          isOpen={isOpenEditModal}
          onClose={() => {
            setIsEditModal(false);
            resetForm();
          }}
          onSubmit={handleEditFAQ}
          isButtonView={true}
          submitButtonText="Update"
          closeButtonText="Cancel"
          title="Edit Help & Support"
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
            <Input
              labelName="Content"
              name="content"
              type="textarea"
              value={formData.content}
              onChange={handleInputChange}
              error={errors.content}
              maxLength={1000}
              rows={4}
              required
            />
          </div>
          <div className='flex justify-between items-center border p-3 rounded m-4'>
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
          DeleteHeading={'Are you sure you want to delete the Help & Support?'}
        />

        {/* Status Confirmation Modal */}
        <StatusPopup
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDisableFunc}
          heading={`Are you sure you want to ${toggleStates?.isDisable ? 'enable' : 'disable'} this Help & Support?`}
        />
      </div>
    </>
  )
}

export default HelpSupportList;