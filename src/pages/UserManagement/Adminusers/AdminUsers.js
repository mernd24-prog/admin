/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  getAdminUsers, deactivateAdminUser,
  getPlatformSubAdmins, createPlatformSubAdmin, createAdmin,
} from '../../../Redux/adminCoreSlice';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import AddButton from '../../../components/Button/AddButton';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import StatusPopup from '../../../components/Atoms/PopupData/StatusPopup';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import { getStoredRole, normalizeRole } from '../../../_helpers/authStorage';
import { DEFAULT_PLATFORM_MODULES } from '../../../_helpers/adminApi';

const PAGE_SIZE = 10;

const MODULE_LABELS = {
  users: 'User Management',
  products: 'Product Management',
  orders: 'Order Management',
  payments: 'Payment Management',
  sellers: 'Seller Management',
  'sellers/commissions': 'Seller Commissions',
  platform: 'Platform Catalog',
  cms: 'CMS Management',
  warranty: 'Warranty',
  carts: 'Cart Management',
  returns: 'Return Management',
  delivery: 'Delivery Management',
  wallets: 'Wallet Management',
  tax: 'Tax Management',
  subscriptions: 'Subscriptions',
  pricing: 'Pricing & Promotions',
  'dynamic-pricing': 'Dynamic Pricing',
  loyalty: 'Loyalty',
  referral: 'Referral Commerce',
  recommendations: 'Recommendations',
  notifications: 'Notifications',
  analytics: 'Analytics',
  fraud: 'Fraud Management',
  rbac: 'RBAC Management',
  admin: 'Admin Dashboard',
};

const ModuleSelector = ({ selected, onChange, disabled = false }) => {
  const toggle = (mod) => {
    if (disabled) return;
    const next = selected.includes(mod) ? selected.filter((m) => m !== mod) : [...selected, mod];
    if (next.length === 0) return;
    onChange(next);
  };
  return (
    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
      {DEFAULT_PLATFORM_MODULES.map((mod) => (
        <button
          key={mod}
          type="button"
          disabled={disabled}
          onClick={() => toggle(mod)}
          className={`text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
            selected.includes(mod)
              ? 'border-[#3E4094] bg-[#3E4094]/10 text-[#3E4094] font-medium'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {MODULE_LABELS[mod] || mod}
        </button>
      ))}
    </div>
  );
};

const emptyUser = { fullName: '', email: '', password: '', confirmPassword: '', phone: '' };
const emptySubAdmin = { fullName: '', email: '', password: '', confirmPassword: '', phone: '', allowedModules: ['products', 'orders'] };

const extractListPayload = (sliceData = {}) => {
  const candidates = [
    sliceData?.data?.data,
    sliceData?.data?.normalized?.data,
    sliceData?.data,
    sliceData?.normalized?.data,
    sliceData?.normalized,
    sliceData,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return { list: candidate, total: candidate.length };
    }
    if (!candidate || typeof candidate !== 'object') continue;

    const list = Array.isArray(candidate.list)
      ? candidate.list
      : Array.isArray(candidate.items)
        ? candidate.items
        : Array.isArray(candidate.results)
          ? candidate.results
          : null;

    if (list) {
      return {
        list,
        total: Number(candidate.total ?? candidate.count ?? candidate.meta?.total ?? list.length),
      };
    }
  }

  return { list: [], total: 0 };
};

const filterUsers = (users = [], query = '') => {
  const value = String(query || '').trim().toLowerCase();
  if (!value) return users;
  return users.filter((user = {}) => {
    const profile = user.profile || {};
    const searchable = [
      user.full_name,
      user.fullName,
      user.email,
      user.phone,
      profile.firstName,
      profile.lastName,
      user.role,
    ].join(' ').toLowerCase();
    return searchable.includes(value);
  });
};

const AdminUsers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((s) => s.adminCore);

  const storedRole = normalizeRole(getStoredRole());
  const isSuperAdmin = storedRole === 'super-admin';
  const isAdmin = storedRole === 'admin' || isSuperAdmin;

  const [tab, setTab] = useState('subadmins');
  const [pageAdmin, setPageAdmin] = useState(1);
  const [pageSubAdmin, setPageSubAdmin] = useState(1);
  const [refresh, setRefresh] = useState(false);
  const [filters, setFilters] = useState({ search: '' });

  // Modals
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [addSubAdminOpen, setAddSubAdminOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Forms
  const [adminForm, setAdminForm] = useState(emptyUser);
  const [subAdminForm, setSubAdminForm] = useState(emptySubAdmin);
  const [errors, setErrors] = useState({});

  // ── Data ────────────────────────────────────────────────────────────────────

  const { list: admins, total: adminsTotal } = extractListPayload(selector?.adminUsersData);
  const { list: allSubAdmins } = extractListPayload(selector?.platformSubAdminsData);
  const filteredSubAdmins = useMemo(
    () => filterUsers(allSubAdmins, filters.search),
    [allSubAdmins, filters.search]
  );
  const subAdminsTotal = filteredSubAdmins.length;
  const subAdmins = useMemo(() => {
    const start = (pageSubAdmin - 1) * PAGE_SIZE;
    return filteredSubAdmins.slice(start, start + PAGE_SIZE);
  }, [filteredSubAdmins, pageSubAdmin]);

  const loading = selector?.loading || false;

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tab === 'admins' && isAdmin) {
      dispatch(getAdminUsers({ page: pageAdmin, limit: PAGE_SIZE, q: filters.search, role: 'admin' }));
    }
  }, [tab, pageAdmin, refresh, filters.search]);

  useEffect(() => {
    if (tab === 'subadmins') {
      dispatch(getPlatformSubAdmins({ page: pageSubAdmin, limit: PAGE_SIZE, q: filters.search }));
    }
  }, [tab, pageSubAdmin, refresh, filters.search]);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validateUserForm = (form, requirePassword = true) => {
    const errs = {};
    if (!form.fullName?.trim()) errs.fullName = 'Full name is required';
    if (!form.email?.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';
    if (requirePassword) {
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'Minimum 8 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const errs = validateUserForm(adminForm);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await dispatch(createAdmin(adminForm)).unwrap();
      toast.success('Admin created successfully');
      setAddAdminOpen(false);
      setAdminForm(emptyUser);
      setErrors({});
      setRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || 'Failed to create admin');
    }
  };

  const handleCreateSubAdmin = async (e) => {
    e.preventDefault();
    const errs = validateUserForm(subAdminForm);
    if (!subAdminForm.allowedModules?.length) errs.allowedModules = 'Select at least one module';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await dispatch(createPlatformSubAdmin(subAdminForm)).unwrap();
      toast.success('Sub-admin created successfully');
      setAddSubAdminOpen(false);
      setSubAdminForm(emptySubAdmin);
      setErrors({});
      setRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || 'Failed to create sub-admin');
    }
  };

  const handleToggleStatus = (user) => {
    setToggleTarget(user);
    setConfirmOpen(true);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const isActive = toggleTarget.accountStatus === 'active' || !toggleTarget.isDisable;
    try {
      await dispatch(deactivateAdminUser({ userId: toggleTarget._id || toggleTarget.id, reason: isActive ? 'deactivated by admin' : undefined })).unwrap();
      toast.success('Status updated');
      setConfirmOpen(false);
      setToggleTarget(null);
      setRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleSearchApply = () => setRefresh((r) => !r);
  const handleSearchRemove = () => { setFilters({ search: '' }); setRefresh((r) => !r); };

  // ── Table data ───────────────────────────────────────────────────────────────

  const buildRows = (list, showModules = false) =>
    (Array.isArray(list) ? list : []).map((user) => {
      const name = user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : user.full_name || user.email;
      const isActive = user.accountStatus === 'active' || !user.isDisable;
      const userId = user._id || user.id;
      return [
        <span key={`name-${userId}`} className="font-medium capitalize">{name}</span>,
        <span key={`email-${userId}`} className="text-gray-500">{user.email}</span>,
        ...(showModules ? [
          <div key={`mods-${userId}`} className="flex flex-wrap gap-1">
            {(user.allowedModules || []).slice(0, 3).map((m) => (
              <span key={m} className="px-1.5 py-0.5 bg-[#3E4094]/10 text-[#3E4094] text-xs rounded">{MODULE_LABELS[m] || m}</span>
            ))}
            {(user.allowedModules || []).length > 3 && (
              <span className="text-xs text-gray-400">+{user.allowedModules.length - 3} more</span>
            )}
          </div>,
        ] : []),
        <ToggleButton key={`toggle-${userId}`} isToggle={isActive} handleClick={() => handleToggleStatus(user)} />,
        <ActionButtons
          key={`actions-${userId}`}
          showDeleteButton={false}
          showPasswordButton={false}
          showLinkButton={false}
          viewButton={true}
          onViewClick={() => navigate(`/app/admin-users/view/${userId}`)}
          userPermissions={true}
          onPermissionClick={() => navigate(`/app/user-permissions/${userId}`)}
        />,
      ];
    });

  const adminRows = useMemo(() => buildRows(admins, false), [admins]);
  const subAdminRows = useMemo(() => buildRows(subAdmins, true), [subAdmins]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Loader loading={loading} />
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-gray-500">
            <Link to="/app/home" className="hover:underline text-[#3E4094]">Home</Link> / <b className="text-gray-800">Admin Users</b>
          </h3>
          <div className="flex gap-2">
            {tab === 'admins' && isSuperAdmin && (
              <AddButton onClick={() => { setErrors({}); setAdminForm(emptyUser); setAddAdminOpen(true); }}>
                + Add Admin
              </AddButton>
            )}
            {tab === 'subadmins' && isAdmin && (
              <AddButton onClick={() => { setErrors({}); setSubAdminForm(emptySubAdmin); setAddSubAdminOpen(true); }}>
                + Add Sub-Admin
              </AddButton>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 mb-4 border-b border-gray-200">
          {[
            { key: 'subadmins', label: 'Sub-Admins' },
            ...(isAdmin ? [{ key: 'admins', label: 'Admins' }] : []),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-[#3E4094] text-[#3E4094]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3 border-b">
            <SearchComponent
              isSearchShow={true}
              filters={filters}
              setFilters={setFilters}
              placeholder={`Search ${tab === 'admins' ? 'admins' : 'sub-admins'}…`}
              handleSearchRemove={handleSearchRemove}
              applyFilters={handleSearchApply}
            />
          </div>

          {tab === 'admins' && (
            <TableData
              Heading="Admins"
              tableHeadings={['Name', 'Email', 'Status', 'Actions']}
              data={adminRows}
              totalData={adminsTotal}
              totalSize={PAGE_SIZE}
              currentPage={pageAdmin}
              onPageChange={setPageAdmin}
            />
          )}

          {tab === 'subadmins' && (
            <TableData
              Heading="Sub-Admins"
              tableHeadings={['Name', 'Email', 'Assigned Modules', 'Status', 'Actions']}
              data={subAdminRows}
              totalData={subAdminsTotal}
              totalSize={PAGE_SIZE}
              currentPage={pageSubAdmin}
              onPageChange={setPageSubAdmin}
            />
          )}
        </div>

        {tab === 'subadmins' && subAdminsTotal > PAGE_SIZE && (
          <div className="flex justify-center mt-4">
            <Pagination
              totalPages={Math.ceil(subAdminsTotal / PAGE_SIZE)}
              currentPage={pageSubAdmin}
              onPageChange={setPageSubAdmin}
            />
          </div>
        )}
      </div>

      {/* Create Admin modal — super-admin only */}
      <DefaultModal
        isOpen={addAdminOpen}
        onClose={() => setAddAdminOpen(false)}
        onSubmit={handleCreateAdmin}
        isButtonView={true}
        submitButtonText="Create Admin"
        closeButtonText="Cancel"
        title="Create Admin"
        titleClassName="mt-5 font-medium"
      >
        <div className="p-4 space-y-4">
          <FormInput label="Full Name *" name="fullName" value={adminForm.fullName}
            onChange={(e) => setAdminForm((f) => ({ ...f, fullName: e.target.value }))}
            error={errors.fullName} maxLength={60} required />
          <FormInput label="Email *" name="email" type="email" value={adminForm.email}
            onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email} maxLength={80} required />
          <FormInput label="Phone" name="phone" value={adminForm.phone}
            onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))}
            maxLength={15} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Password *" name="password" type="password" value={adminForm.password}
              onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
              error={errors.password} maxLength={64} required />
            <FormInput label="Confirm Password *" name="confirmPassword" type="password" value={adminForm.confirmPassword}
              onChange={(e) => setAdminForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              error={errors.confirmPassword} maxLength={64} required />
          </div>
        </div>
      </DefaultModal>

      {/* Create Sub-Admin modal */}
      <DefaultModal
        isOpen={addSubAdminOpen}
        onClose={() => setAddSubAdminOpen(false)}
        onSubmit={handleCreateSubAdmin}
        isButtonView={true}
        submitButtonText="Create Sub-Admin"
        closeButtonText="Cancel"
        title="Create Sub-Admin"
        titleClassName="mt-5 font-medium"
      >
        <div className="p-4 space-y-4">
          <FormInput label="Full Name *" name="fullName" value={subAdminForm.fullName}
            onChange={(e) => setSubAdminForm((f) => ({ ...f, fullName: e.target.value }))}
            error={errors.fullName} maxLength={60} required />
          <FormInput label="Email *" name="email" type="email" value={subAdminForm.email}
            onChange={(e) => setSubAdminForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email} maxLength={80} required />
          <FormInput label="Phone" name="phone" value={subAdminForm.phone}
            onChange={(e) => setSubAdminForm((f) => ({ ...f, phone: e.target.value }))}
            maxLength={15} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Password *" name="password" type="password" value={subAdminForm.password}
              onChange={(e) => setSubAdminForm((f) => ({ ...f, password: e.target.value }))}
              error={errors.password} maxLength={64} required />
            <FormInput label="Confirm Password *" name="confirmPassword" type="password" value={subAdminForm.confirmPassword}
              onChange={(e) => setSubAdminForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              error={errors.confirmPassword} maxLength={64} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Assign Modules <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400">
              The sub-admin can only access modules you select. You can only grant modules you yourself have access to.
            </p>
            <ModuleSelector
              selected={subAdminForm.allowedModules}
              onChange={(mods) => setSubAdminForm((f) => ({ ...f, allowedModules: mods }))}
            />
            {errors.allowedModules && <p className="text-xs text-red-500">{errors.allowedModules}</p>}
            <p className="text-xs text-gray-400 mt-1">
              {subAdminForm.allowedModules.length} module{subAdminForm.allowedModules.length !== 1 ? 's' : ''} selected.{' '}
              Click a module to toggle it.
            </p>
          </div>
        </div>
      </DefaultModal>

      {/* Status toggle confirm */}
      <StatusPopup
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToggleTarget(null); }}
        onConfirm={confirmToggle}
        heading={`Are you sure you want to ${
          toggleTarget?.accountStatus === 'active' || !toggleTarget?.isDisable ? 'deactivate' : 'activate'
        } this user?`}
      />
    </>
  );
};

export default AdminUsers;
