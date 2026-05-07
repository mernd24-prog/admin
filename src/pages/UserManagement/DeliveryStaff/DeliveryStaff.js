/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

import { addDeliveryStaff, staffList, updateDeliveryStaff } from '../../../Redux/erpSlice'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton'
import Loader from '../../../components/Loader/Loader'
import AddButton from '../../../components/Button/AddButton'
import SearchComponent from '../../../components/Atoms/New Table/NewTable'
import TableData from '../../../components/Atoms/TableData/TableData'
import Pagination from '../../../components/Pagination/Pagination'
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal'
import { getAllStoreList } from '../../../Redux/productSlice'
import { getAllSellerList } from '../../../Redux/StoreSlice'
import { transformArray, uploadFile } from '../../../_helpers/globalFunctions'
import FormInput from '../../../components/Atoms/FormInput/FormInput'
import ImageUpload from '../../../components/Atoms/ImageGallery/ImageUpload'
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect'

const PAGE_SIZE = 10

const INITIAL_FORM_VALUES = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  adharNumber: '',
  seller_id: '',
  store_ids: [],
  license_photo: ''
}

const DeliveryStaff = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const selector = useSelector(state => state)
  const { loading } = useSelector(state => state.erp)

  // Derived state
  const sellerListData = useMemo(() =>
    transformArray(selector?.store?.getAllSellerListData?.data?.data?.list || []),
    [selector?.store?.getAllSellerListData?.data?.data?.list]
  )

  const [filters, setFilters] = useState({ search: '' })
  const [apiRes, setApiRes] = useState({ list: [], total: 0 })
  const [pageNo, setPageNo] = useState(1)
  const [userData, setUserData] = useState(null)
  const [editingStaffId, setEditingStaffId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [storeData, setStoreData] = useState([])
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const formattedStoreList = useMemo(() =>
    transformArray(storeData || []),
    [storeData]
  )

  const TABLE_HEADINGS = [
    'Name',
    'Email',
    'Phone Number',
    'License Photo',
    'Aadhar Number',
    'Status',
  ];

  if (userData?.roleId !== 9) {
    TABLE_HEADINGS.push('Actions');
  }
  useEffect(() => {
    const userDataString = sessionStorage.getItem('EcomAdmin')
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString)
        setUserData(parsedData)
      } catch (error) {
        console.error('Error parsing user data:', error)
        toast.error('Failed to load user data')
      }
    }
  }, [])

  const fetchStaffList = useCallback(async (searchKey = '') => {
    try {
      setIsLoading(true)
      const params = {
        page: 1,
        size: 10,
        ...(searchKey && { keyWord: searchKey })
      }

      const response = await dispatch(staffList(params)).unwrap()
      console.log("response==>", response)
      setApiRes(response?.data)
    } catch (err) {
      toast.error('Failed to fetch delivery staff')
      console.error('Fetch error:', err)
      setApiRes({ list: [], total: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, pageNo])
  useEffect(() => {
    if (userData) {
      dispatch(getAllSellerList())
      loadStoreData()
    }
    fetchStaffList()

  }, [userData, dispatch])



  const loadStoreData = useCallback(async () => {
    if (!userData) return

    try {
      if (userData?.roleId === 3) {
        // For seller role, load only their stores
        const res = await dispatch(getAllStoreList({
          query: JSON.stringify({ user_id: userData?.userId })
        })).unwrap()

        if (res?.data?.list) {
          setStoreData(res.data.list)
          setFormValues(prev => ({
            ...prev,
            seller_id: userData.userId
          }))
        }
      } else {
        const res = await dispatch(getAllStoreList()).unwrap()
        if (res?.data?.list) {
          setStoreData(res.data.list)
        }
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load store data")
      console.error('Store data loading error:', error)
    }
  }, [userData, dispatch])



  const handleFileUpload = async (file) => {
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG/PNG files are allowed')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File size should not exceed 5MB')
      return
    }

    try {
      setIsLoading(true)
      const uploadedImageUrl = await uploadFile(file, 'DELIVERY_STAFF_LICENSE')
      setFormValues(prev => ({
        ...prev,
        license_photo: uploadedImageUrl
      }))
      toast.success('Image uploaded successfully')
    } catch (error) {
      toast.error(error?.message || 'Failed to upload image')
      console.error('File upload error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchApply = useCallback(async () => {
    setPageNo(1) // Reset to first page when searching
    await fetchStaffList(filters.search)
  }, [filters.search, fetchStaffList])

  const clearFilters = useCallback(async () => {
    setFilters({ search: '' })
    setPageNo(1)
    await fetchStaffList('')
  }, [fetchStaffList])

  const onPageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo)
  }, [])

  const tableRows = useMemo(() => {
    const data = Array.isArray(apiRes?.list) ? apiRes?.list : [];

    return data.map((item, index) => [
      <span key={`name-${index}`} className="font-medium text-gray-800">
        {item.name || 'N/A'}
      </span>,

      <span key={`email-${index}`} className="text-blue-600">
        {item.email || 'N/A'}
      </span>,

      <span key={`phone-${index}`}>
        {item.phoneNumber || 'N/A'}
      </span>,

      <div key={`license-${index}`} className="flex justify-center">
        <img
          src={item.license_photo || '/Img/noData.png'}
          alt="License"
          className="h-10 w-10 object-cover rounded-full border"
          onError={(e) => {
            e.target.src = '/Img/noData.png';
          }}
        />
      </div>,

      <span key={`aadhar-${index}`}>
        {item.adharNumber || 'N/A'}
      </span>,

      <span
        key={`status-${index}`}
        className={`capitalize px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'online'
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
          }`}
      >
        {item.status || 'inactive'}
      </span>,
      userData?.roleId !== 9 ? (
        <ActionButtons
          key={`actions-${index}`}
          showViewButton={false}
          showEditButton
          showDeleteButton={false}
          onView={() => navigate(`/app/staff/view/${item._id}`)}
          onEdit={() => openEditModal(item)}
          onDelete={() => console.log('Delete user', item)}
        />
      ) : (
        <span key={`actions-${index}`}></span>
      ),
    ]);
  }, [apiRes, navigate, userData?.roleId]);


  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }, [errors])

  const validateForm = (values) => {
    const newErrors = {}

    if (!values.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!values.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!editingStaffId && !values.password?.trim()) {
      newErrors.password = 'Password is required'
    } else if (!editingStaffId && values.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!values.phoneNumber?.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!/^\+?[0-9]{10,15}$/.test(values.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Invalid phone number'
    }

    if (!values.adharNumber?.trim()) {
      newErrors.adharNumber = 'Aadhar number is required'
    } else if (!/^\d{12}$/.test(values.adharNumber)) {
      newErrors.adharNumber = 'Aadhar must be 12 digits'
    }

    if (userData?.roleId !== 3 && !values.seller_id) {
      newErrors.seller_id = 'Seller selection is required'
    }

    if (!values.store_ids || values.store_ids.length === 0) {
      newErrors.store_ids = 'At least one store must be selected'
    }

    if (!values.license_photo) {
      newErrors.license_photo = 'License photo is required'
    }

    return newErrors
  }

  const handleSubmit = async () => {
    const validationErrors = validateForm(formValues)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the form errors')
      return
    }

    let sellerId
    if (userData?.roleId === 3) {
      sellerId = userData.userId
    } else {
      sellerId = formValues.seller_id?.value || formValues.seller_id
    }

    const payload = {
      seller_id: sellerId,
      store_ids: formValues.store_ids.map(store => store.value || store),
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      phoneNumber: formValues.phoneNumber.trim(),
      license_photo: formValues.license_photo,
      adharNumber: formValues.adharNumber.trim(),
      ...(formValues.password && { password: formValues.password })
    }

    try {
      setIsLoading(true)

      if (editingStaffId) {
        await dispatch(
          updateDeliveryStaff({ deliveryStaffId: editingStaffId, ...payload })
        ).unwrap()
        toast.success('Staff updated successfully!')
      } else {
        await dispatch(addDeliveryStaff(payload)).unwrap()
        toast.success('Staff created successfully!')
      }

      closeModal()
      await fetchStaffList()
    } catch (err) {
      toast.error(err?.message || 'Error submitting form')
      console.error('Submit error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const openEditModal = async (staff) => {
    try {
      setIsLoading(true)

      const selectedSeller = sellerListData.find(s => s.value === staff.seller_id?._id)

      let currentStoreData = []
      if (staff.seller_id?._id) {
        const res = await dispatch(getAllStoreList({
          query: JSON.stringify({ user_id: staff.seller_id?._d })
        })).unwrap()

        if (res?.data?.list) {
          currentStoreData = res.data.list
          setStoreData(res.data.list)
        }
      }

      const currentStoreList = transformArray(currentStoreData || [])
      const selectedStores = currentStoreList.filter(store =>
        staff.store_ids?.includes(store.value)
      )

      setFormValues({
        name: staff.name || '',
        email: staff.email || '',
        password: '', // Don't show password in edit mode
        phoneNumber: staff.phoneNumber || '',
        adharNumber: staff.adharNumber || '',
        seller_id: selectedSeller || (userData?.roleId === 3 ? userData.userId : ''),
        store_ids: selectedStores || [],
        license_photo: staff.license_photo || ''
      })

      setEditingStaffId(staff._id)
      setModalOpen(true)
    } catch (error) {
      toast.error(error?.message || "Failed to open edit modal")
      console.error('Edit modal error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSellerChange = async (selectedSeller) => {
    setFormValues(prev => ({
      ...prev,
      seller_id: selectedSeller,
      store_ids: [] // Reset stores when seller changes
    }))

    // Clear seller error
    if (errors.seller_id) {
      setErrors(prev => ({
        ...prev,
        seller_id: ''
      }))
    }

    try {
      if (selectedSeller?.value) {
        setIsLoading(true)
        const res = await dispatch(getAllStoreList({
          query: JSON.stringify({ user_id: selectedSeller.value })
        })).unwrap()

        if (res?.data?.list) {
          setStoreData(res.data.list)
        }
      } else {
        setStoreData([])
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load stores")
      setStoreData([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoreChange = (selectedStores) => {
    setFormValues(prev => ({
      ...prev,
      store_ids: selectedStores || []
    }))

    // Clear store error
    if (errors.store_ids) {
      setErrors(prev => ({
        ...prev,
        store_ids: ''
      }))
    }
  }

  const resetFormValues = () => {
    setFormValues({
      ...INITIAL_FORM_VALUES,
      seller_id: userData?.roleId === 3 ? userData.userId : ''
    })
    setErrors({})
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingStaffId(null)
    resetFormValues()
  }

  const openAddModal = () => {
    resetFormValues()
    setModalOpen(true)
  }

  return (
    <>
      <Loader loading={loading || isLoading} />
      <div className='p-4 sm:p-6 mx-auto overflow-auto max-w-7xl'>

        <div className='flex flex-row justify-between items-center mb-4 gap-2'>
          <div>
            <nav className='py-4'>
              <ol className='flex items-center text-sm text-gray-500'>
                <li className='transition-colors hover:text-blue-600'>
                  <Link to='/app/home'>Home</Link>
                </li>
                <li className='mx-2'>/</li>
                <li className='font-medium text-blue-600'>
                  Delivery Staff
                </li>
              </ol>
            </nav>
          </div>
          {
            userData?.roleId !== 9 && (
              <AddButton onClick={openAddModal}>
                Add New Delivery Staff
              </AddButton>
            )
          }
        </div>

        <div className='bg-white rounded shadow-sm p-4 overflow-auto'>

          <section className='border-b flex items-center flex-wrap md:gap-6 gap-3 md:flex-nowrap justify-between'>
            <div className='md:w-2/3 w-full'>
              <SearchComponent
                filters={filters}
                setFilters={setFilters}
                isSearchShow={true}
                applyFilters={handleSearchApply}
                handleSearchRemove={clearFilters}
                isActionButton={true}
              />
            </div>
          </section>

          <section>
            <TableData
              tableHeadings={TABLE_HEADINGS}
              data={tableRows}
              rowDataKey='_id'
              sortableColumns={[0, 1, 2, 4]}
              totalData={apiRes.total}
            />
          </section>
        </div>

        <div className='mt-2'>
          {apiRes.total > PAGE_SIZE && (
            <Pagination
              totalPages={Math.ceil(apiRes.total / PAGE_SIZE)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )}
        </div>
      </div>

      <DefaultModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingStaffId ? 'Edit Delivery Staff' : 'Add Delivery Staff'}
        onSubmit={handleSubmit}
      >
        {userData?.roleId !== 3 && (
          <div className='mb-4'>
            <FilterSelect
              label='Seller'
              options={sellerListData}
              value={formValues.seller_id}
              onChange={handleSellerChange}
              error={errors.seller_id}
              placeholder="Select a seller"
            />
          </div>
        )}

        <div className='mb-4'>
          <FilterSelect
            label='Store'
            isMulti
            options={formattedStoreList}
            value={formValues.store_ids}
            onChange={handleStoreChange}
            className="text-xs"
            error={errors.store_ids}
            placeholder="Select stores"
          />
        </div>

        <FormInput
          label='Name'
          name='name'
          value={formValues.name}
          placeholder='Enter full name'
          onChange={handleInputChange}
          error={errors.name}
          required
        />

        <FormInput
          label='Email'
          name='email'
          type='email'
          value={formValues.email}
          placeholder='Enter email address'
          onChange={handleInputChange}
          error={errors.email}
          required
        />

        {!editingStaffId && (
          <FormInput
            label='Password'
            name='password'
            type='password'
            value={formValues.password}
            placeholder='Enter password (min 6 characters)'
            onChange={handleInputChange}
            error={errors.password}
            required
          />
        )}

        <FormInput
          label='Phone Number'
          name='phoneNumber'
          value={formValues.phoneNumber}
          placeholder='Enter phone number'
          onChange={handleInputChange}
          error={errors.phoneNumber}
          required
        />

        <FormInput
          label='Aadhar Number'
          name='adharNumber'
          value={formValues.adharNumber}
          placeholder='Enter 12-digit Aadhar number'
          onChange={handleInputChange}
          error={errors.adharNumber}
          required
        />

        <ImageUpload
          id='license_photo'
          label='License Photo'
          file={formValues?.license_photo}
          onChange={handleFileUpload}
          required
          error={errors.license_photo}
        />
      </DefaultModal>
    </>
  )
}

export default DeliveryStaff