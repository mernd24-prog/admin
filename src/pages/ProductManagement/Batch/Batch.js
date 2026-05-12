/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton'
import TableData from '../../../components/Atoms/TableData/TableData'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import AddButton from '../../../components/Button/AddButton'
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup'
import Loader from '../../../components/Loader/Loader'
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox'
import BatchSetup from './components/BatchSetup'
import { useLocation } from 'react-router-dom'

import {
  createBatch,
  getBatchList,
  updateBatch,
  deleteBatch,
  enableDisableBatch
} from '../../../Redux/productSlice'
import moment from 'moment'

const TABLE_HEADINGS = [
  'Batch Code',
  'Manufacture Date',
  'Expiry Date',
  'Status',
  'Actions'
]
const size = 10
const INITIAL_FORM_VALUES = {
  batchCode: '',
  manufactureDate: '',
  expiryDate: '',
  isDisable: false
}

const VALIDATION_RULES = {
  batchCode: { required: true, minLength: 2, maxLength: 100 },
  manufactureDate: { required: true },
  expiryDate: { required: true }
}

const Batch = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState({})
  const [batch, setBatch] = useState({ list: [], total: 0 })
  const [isBatchSetupOpen, setIsBatchSetupOpen] = useState(false)
  const [filters, setFilters] = useState({ search: '' })
  const [pageNo, setPageNo] = useState(1)
  const [selectedRow, setSelectedRow] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modalState, setModalState] = useState({
    type: '',
    selectedBatch: null
  })
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  
  const getAllRowIds = useMemo(
    () => batch?.list?.map(row => row?._id) || [],
    [batch?.list]
  )
  
  const isAllRowsSelected = useMemo(
    () => selectedRow.length === batch?.list?.length && batch?.list?.length > 0,
    [selectedRow, batch]
  )

  useEffect(() => {
    if (location?.state?.openBatchModal) {
      setIsBatchSetupOpen(true)
      // Clean up the navigation state to prevent re-opening on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // -------------------- VALIDATION --------------------
  const validateField = useCallback((name, value) => {
    const rule = VALIDATION_RULES[name]
    if (!rule) return ''
    if (rule.required && !value?.toString().trim()) return `${name} is required`
    if (rule.minLength && value.length < rule.minLength)
      return `${name} must be at least ${rule.minLength} characters`
    if (rule.maxLength && value.length > rule.maxLength)
      return `${name} must not exceed ${rule.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback(() => {
    const newErrors = {}
    Object.entries(VALIDATION_RULES).forEach(([field]) => {
      const error = validateField(field, formValues[field])
      if (error) newErrors[field] = error
    })
    const { manufactureDate, expiryDate } = formValues
    if (manufactureDate && expiryDate) {
      const mDate = new Date(manufactureDate)
      const eDate = new Date(expiryDate)

      if (isNaN(mDate.getTime()) || isNaN(eDate.getTime())) {
        if (isNaN(mDate.getTime()))
          newErrors.manufactureDate = 'Invalid manufacture date'
        if (isNaN(eDate.getTime())) newErrors.expiryDate = 'Invalid expiry date'
      } else if (mDate > eDate) {
        newErrors.manufactureDate =
          'Manufacture date must not be after expiry date'
        newErrors.expiryDate = 'Expiry date must be after manufacture date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formValues, validateField])

  // -------------------- API --------------------
  const fetchBatchList = useCallback(
    async (searchParam = filters?.search) => {
      const query = {
        page: pageNo,
        size: size,
        select: 'batchCode manufactureDate expiryDate isDisable createdAt',
        searchFields: 'batchCode',
        keyWord: filters.search || '',
        sortOrder: 'desc',
        sortBy: 'createdAt'
      }

      if (searchParam) {
        query.keyWord = searchParam
      }
      setIsLoading(true)
      try {
        const res = await dispatch(getBatchList(query)).unwrap()
        setBatch(res?.data || { list: [], total: 0 })
      } catch (err) {
        toast.error(err?.message || 'Failed to fetch batch')
        setBatch({ list: [], total: 0 })
      } finally {
        setIsLoading(false)
      }
    },
    [dispatch, pageNo, filters.search]
  )

  const handleBatchAction = useCallback(
    async (actionFn, successMsg, errorMsg, data) => {
      try {
        setIsLoading(true)
        await dispatch(actionFn(data)).unwrap()
        toast.success(successMsg)
        await fetchBatchList()
        return { success: true, message: successMsg }
      } catch (err) {
        toast.error(err?.message || errorMsg)
        return { success: false, message: err?.message || errorMsg }
      } finally {
        setIsLoading(false)
      }
    },
    [dispatch, fetchBatchList]
  )

  const handleCreateBatch = useCallback(
    data =>
      handleBatchAction(
        createBatch,
        'Batch created successfully',
        'Failed to create batch',
        data
      ),
    [handleBatchAction]
  )
  
  const handleUpdateBatch = useCallback(
    data =>
      handleBatchAction(
        updateBatch,
        'Batch updated successfully',
        'Failed to update batch',
        data
      ),
    [handleBatchAction]
  )

  const handleDeleteBatch = useCallback(
    async id => {
      try {
        setIsLoading(true)
        await dispatch(deleteBatch({ _id: [id] })).unwrap()
        toast.success('Batch deleted successfully')
        await fetchBatchList()
      } catch (err) {
        toast.error(err?.message || 'Failed to delete batch')
      } finally {
        setIsLoading(false)
        setShowDeleteConfirmation(false)
      }
    },
    [dispatch, fetchBatchList]
  )

  const handleToggleBatchStatus = useCallback(
    async batch => {
      await handleBatchAction(
        enableDisableBatch,
        'Status updated',
        'Failed to update status',
        {
          _id: [batch._id],
          isDisable: !batch.isDisable
        }
      )
    },
    [handleBatchAction]
  )

  // -------------------- FORM --------------------
  const handleInputChange = useCallback(
    e => {
      const { name, value } = e.target
      setFormValues(prev => ({ ...prev, [name]: value }))
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    },
    [errors]
  )

  const handleToggleDisable = useCallback(() => {
    setFormValues(prev => ({ ...prev, isDisable: !prev.isDisable }))
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalState({ type: '', selectedBatch: null })
    setFormValues(INITIAL_FORM_VALUES)
    setErrors({})
    setIsBatchSetupOpen(false)
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    const batchData = {
      batchCode: formValues.batchCode.trim(),
      manufactureDate: new Date(formValues.manufactureDate).getTime(),
      expiryDate: new Date(formValues.expiryDate).getTime(),
      isDisable: formValues.isDisable
    }

    if (formValues.id) {
      batchData._id = formValues.id
    }

    let result

    if (modalState.type === 'ADD') {
      result = await handleCreateBatch(batchData)
    } else if (modalState.type === 'EDIT') {
      result = await handleUpdateBatch(batchData)
    }

    if (result?.success) {
      handleCloseModal()
    }
  }

  const handleAction = useCallback((type, batch = null) => {
    if (type === 'EDIT' && batch) {
      setFormValues({
        batchCode: batch.batchCode || '',
        manufactureDate:
          moment(batch.manufactureDate).format('YYYY-MM-DD') || '',
        expiryDate: moment(batch.expiryDate).format('YYYY-MM-DD') || '',
        id: batch._id,
        isDisable: batch?.isDisable || false
      })
    } else {
      setFormValues(INITIAL_FORM_VALUES)
    }

    setErrors({})
    setModalState({ type, selectedBatch: batch })
    setIsBatchSetupOpen(true)
  }, [])

  const handleDelete = useCallback(() => {
    if (modalState.selectedBatch?._id) {
      handleDeleteBatch(modalState.selectedBatch._id)
    }
  }, [modalState, handleDeleteBatch])

  // -------------------- BULK --------------------
  const handleHeaderCheckboxChange = useCallback(e => {
    setSelectedRow(e.target.checked ? getAllRowIds : [])
  }, [getAllRowIds])

  const handleRowCheckboxChange = useCallback((e, rowId) => {
    setSelectedRow(prev =>
      e.target.checked ? [...prev, rowId] : prev.filter(id => id !== rowId)
    )
  }, [])

  const handleBulkAction = useCallback(
    async action => {
      if (!selectedRow.length) return toast.error('Please select items first')
      
      try {
        setIsLoading(true)
        let res
        
        if (action === 'Active' || action === 'Inactive') {
          res = await dispatch(
            enableDisableBatch({
              _id: selectedRow,
              isDisable: action === 'Inactive'
            })
          ).unwrap()
        } else if (action === 'Delete') {
          res = await dispatch(deleteBatch({ _id: selectedRow })).unwrap()
        }
        
        toast.success(res?.message || 'Operation successful')
        setSelectedRow([])
        await fetchBatchList()
      } catch (err) {
        toast.error(err?.message || 'Bulk action failed')
      } finally {
        setIsLoading(false)
      }
    },
    [dispatch, selectedRow, fetchBatchList]
  )

  const tableRows = useMemo(
    () =>
      batch?.list?.map(batchItem => [
        <CustomCheckbox
          key={`checkbox-${batchItem._id}`}
          checked={selectedRow.includes(batchItem._id)}
          onChange={e => handleRowCheckboxChange(e, batchItem._id)}
        />,
        <span key={`code-${batchItem._id}`} className='font-medium capitalize'>
          {batchItem.batchCode}
        </span>,
        <span key={`mfg-${batchItem._id}`}>
          {new Date(batchItem.manufactureDate).toLocaleDateString()}
        </span>,
        <span key={`exp-${batchItem._id}`}>
          {new Date(batchItem.expiryDate).toLocaleDateString()}
        </span>,
        <ToggleButton
          key={`toggle-${batchItem._id}`}
          isToggle={!batchItem.isDisable}
          handleClick={() => handleToggleBatchStatus(batchItem)} // Pass the entire batchItem
        />,
        <ActionButtons
          key={`actions-${batchItem._id}`}
          onEdit={() => handleAction('EDIT', batchItem)} // Pass the entire batchItem
          onDelete={() => {
            setModalState({ type: 'DELETE', selectedBatch: batchItem }) // Pass the entire batchItem
            setShowDeleteConfirmation(true)
          }}
        />
      ]) || [],
    [batch?.list, selectedRow, handleRowCheckboxChange, handleToggleBatchStatus, handleAction]
  )

  useEffect(() => {
    fetchBatchList()
  }, [fetchBatchList])

  const handleSearchRemove = async () => {
    setFilters({ search: '' })
    await fetchBatchList('')
  }

  const handleApplySearchFilters = async () => {
    await fetchBatchList(filters.search)
  }

  return (
    <div className='p-6 mx-auto max-w-7xl'>
      <Loader loading={isLoading} />

      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-sm'>Product / Batch</h3>
        <AddButton onClick={() => handleAction('ADD')} />
      </div>

      <div className='bg-white'>
        <div className='p-4 border-b'>
          <SearchComponent
            filters={filters}
            setFilters={setFilters}
            isActionButton
            isDelete
            isStatusAction
            isHeaderCheckbox
            allRowsSelected={isAllRowsSelected}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            handleAction={handleBulkAction}
            handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            handleSearchRemove={handleSearchRemove}
            applyFilters={handleApplySearchFilters}
          />
        </div>

        <TableData
          Heading='Batch'
          tableHeadings={TABLE_HEADINGS}
          data={tableRows}
          loading={isLoading}
          totalData={batch?.total}
          totalSize={batch?.list?.length}
          pageSize={10}
          currentPage={pageNo}
          onPageChange={setPageNo}
          isHeaderCheckbox
          allRowsSelected={isAllRowsSelected}
          handleHeaderCheckboxChange={handleHeaderCheckboxChange}
          searchTerm={keyword}
          setSearchTerm={setKeyword}
        />
      </div>

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        confirmDelete={handleDelete}
        DeleteHeading={`Are you sure you want to delete this batch?`}
      />

      <BatchSetup
        isOpen={isBatchSetupOpen}
        handleClose={handleCloseModal}
        formValues={formValues}
        handleInputChange={handleInputChange}
        handleToggleDisable={handleToggleDisable}
        handleSubmit={handleSubmit}
        errors={errors}
        buttonLabel={
          modalState.type === 'EDIT' ? 'Update Batch' : 'Create Batch'
        }
      />
    </div>
  )
}

export default Batch
