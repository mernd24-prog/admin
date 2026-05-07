/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'

// Components
import TableData from '../../../components/Atoms/TableData/TableData'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import Loader from '../../../components/Loader/Loader'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../components/Atoms/Input/Input'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import AddButton from '../../../components/Button/AddButton'
import { createColor, enableDisableColor, getColorList, softDeleteColor, updateColor } from '../../../Redux/patternSlice'

const PAGE_SIZE = 10

const INITIAL_FORM_STATE = {
  name: '',
  _id: null,
  isDisable: false,
  color_code: ""
}

const ColorManagement = () => {
  const dispatch = useDispatch()

  const [apiRes, setApiRes] = useState({ list: [], total: 0 })
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedRow, setSelectedRow] = useState([])
  const [isAddModal, setIsAddModal] = useState(false)
  const [pageNo, setPageNo] = useState(1)
  const [filters, setFilters] = useState({ search: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [isRefresh, setIsRefresh] = useState(false)
  const getAllRowIds = useMemo(() =>
    apiRes?.list?.map(row => row?._id) || [],
    [apiRes?.list]
  )

  const isAllRowsSelected = useMemo(() =>
    selectedRow.length === apiRes?.list?.length && apiRes?.list?.length > 0,
    [selectedRow.length, apiRes?.list?.length]
  )

  const fetchColorsList = useCallback(async (searchKeyword = filters?.search) => {
    const query = {
      page: pageNo,
      size: PAGE_SIZE,
      select: 'name isDisable createdAt color_code',
      keyWord: searchKeyword || '',
      searchFields: 'name,color_code',
      sortOrder: 'asc',
      sortBy: "name"
    }

    setIsLoading(true)
    try {
      const res = await dispatch(getColorList(query)).unwrap()
      setApiRes(res?.data || { list: [], total: 0 })
    } catch (err) {
      setApiRes({ list: [], total: 0 })
      toast.error(err || "Failed to fetch colors")
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, pageNo, isRefresh])

  useEffect(() => {
    fetchColorsList()
  }, [fetchColorsList, isRefresh])

  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo)
  }, [])

  const handleHeaderCheckboxChange = useCallback((e) => {
    setSelectedRow(e.target.checked ? getAllRowIds : [])
  }, [getAllRowIds])

  const handleRowCheckboxChange = useCallback((e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    )
  }, [])

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  const validateForm = useCallback(() => {
    const newErrors = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.color_code) {
      newErrors.color_code = 'color is required'
    }
    return newErrors
  }, [formData])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_STATE)
    setErrors({})
    setIsEditMode(false)
    setIsAddModal(false)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const basePayload = {
      name: formData.name.trim(),
      color_code: formData.color_code
    };
    try {
      if (isEditMode) {
        await dispatch(updateColor({ ...basePayload, _id: formData._id })).unwrap();
        toast.success('Color updated successfully');
      } else {
        const createPayload = {
          ...basePayload,
          isDisable: formData.isDisable
        };
        await dispatch(createColor(createPayload)).unwrap();
        toast.success('Color created successfully');
        setIsRefresh(!isRefresh)
      }
      resetForm();
      fetchColorsList();
    } catch (error) {
      toast.error(error || 'Failed to save color');
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  }, [formData, isEditMode, validateForm, dispatch, resetForm, fetchColorsList]);


  const handleToggle = useCallback(async (data) => {
    const apiPayload = {
      _id: [data?._id],
      isDisable: !data?.isDisable
    }

    try {
      const res = await dispatch(enableDisableColor(apiPayload)).unwrap()
      toast.success(res?.message || 'Status updated successfully')
      fetchColorsList()
    } catch (error) {
      toast.error(error?.message || "Failed to update status")
    }
  }, [dispatch, fetchColorsList])

  const handleDelete = useCallback(async (data) => {
    const apiPayload = { _id: [data?._id] }
    try {
      const res = await dispatch(softDeleteColor(apiPayload)).unwrap()
      toast.success(res?.message || 'Color deleted successfully')
      fetchColorsList()
    } catch (error) {
      console.log(error)
      toast.error(error?.message || "Failed to delete color")
    }
  }, [dispatch, fetchColorsList])

  const handleBulkAction = useCallback(async (action) => {
    if (!selectedRow.length) {
      toast.error('Please select items first')
      return
    }

    setIsLoading(true)
    try {
      let res
      if (action === "Active" || action === "Inactive") {
        const apiPayload = {
          _id: selectedRow,
          isDisable: action === "Inactive"
        }
        res = await dispatch(enableDisableColor(apiPayload)).unwrap()
      } else if (action === 'Delete') {
        const apiPayload = { _id: selectedRow }
        res = await dispatch(softDeleteColor(apiPayload)).unwrap()
      }

      toast.success(res?.message || `${action} operation completed successfully`)
      setSelectedRow([])
      fetchColorsList()
    } catch (error) {
      toast.error(error?.message || `Failed to ${action.toLowerCase()} items`)
    } finally {
      setIsLoading(false)
    }
  }, [selectedRow, dispatch, fetchColorsList])


  const handleEdit = useCallback((item) => {
    setFormData({
      name: item.name,
      _id: item._id,
      isDisable: item?.isDisable,
      color_code: item?.color_code
    })
    setIsEditMode(true)
    setIsAddModal(true)
  }, [])

  const handleAddNew = useCallback(() => {
    setFormData(INITIAL_FORM_STATE)
    setIsEditMode(false)
    setIsAddModal(true)
  }, [])

  const applyFilters = useCallback(() => {
    fetchColorsList(filters?.search)
  }, [fetchColorsList, filters?.search])

  const handleSearchRemove = useCallback(() => {
    setFilters({ search: "" })
    fetchColorsList("")
  }, [fetchColorsList])
  const selector = useSelector(state => state.pattern)

  // Table configuration
  const tableHeadings = ["Name", 'Color', "Status", "Action"]

  const tableRows = useMemo(() =>
    apiRes?.list?.map((item) => [
      <div key={`checkbox-${item._id}`} className="">
        <CustomCheckbox
          checked={selectedRow.includes(item._id)}
          onChange={(e) => handleRowCheckboxChange(e, item._id)}
        />
      </div>,
      <span key={`name-${item._id}`} className="capitalize text-sm font-medium text-gray-800">
        {item?.name}
      </span>,
      <div key={`color-${item._id}`} className="flex items-center gap-3">
        <span className="text-sm font-mono w-16">{item?.color_code}</span>
        <input
          type="color"
          value={item?.color_code}
          disabled
          className="w-6 h-6 border rounded-full cursor-default"
        />
      </div>,
      <div key={`toggle-${item._id}`} className="">
        <ToggleButton
          isToggle={!item?.isDisable}
          handleClick={() => handleToggle(item)}
        />
      </div>,
      <div key={`actions-${item._id}`} className="flex justify-center gap-2">
        <ActionButtons
          onEdit={() => handleEdit(item)}
          showLinkButton={false}
          showDeleteButton={true}
          onDelete={() => handleDelete(item)}
        />
      </div>
    ]) || [],
    [apiRes?.list, selectedRow, handleRowCheckboxChange, handleToggle, handleEdit, handleDelete]
  );


  return (
    <div className='p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3'>
      <Loader loading={isLoading || selector?.loading} />

      {/* Header */}
      <div className='flex justify-between items-center'>
        <h3>Home / Colors</h3>
        <AddButton onClick={handleAddNew}>
          Add
        </AddButton>
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
          placeholder="Search by name"
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
          totalSize={PAGE_SIZE}
          currentPage={pageNo}
          isHeaderCheckbox={true}
          handleHeaderCheckboxChange={handleHeaderCheckboxChange}
          allRowsSelected={isAllRowsSelected}
        />

        {apiRes?.total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <DefaultModal
        title={isEditMode ? 'Edit Color' : 'Add Color'}
        isOpen={isAddModal}
        onClose={resetForm}
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
            <Input
              labelName='Color'
              type='color'
              value={formData.color_code}
              name='color_code'
              onChange={handleInputChange}
              error={errors.color_code}
              required
            />
          </div>
        </div>
      </DefaultModal>
    </div>
  )
}

export default ColorManagement