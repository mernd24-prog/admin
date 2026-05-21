import React, { useState } from 'react';
import { MdWarehouse, MdAdd, MdEdit, MdDelete, MdLocationOn } from 'react-icons/md';
import { PageHeader, ConfirmModal } from '../../components/Shared';
import PermissionGuard from '../../components/Atoms/PermissionGuard/PermissionGuard';
import { ACTIONS } from '../../_helpers/usePermission';

const MOCK_WAREHOUSES = [
  { id: 1, name: 'Main Warehouse', code: 'WH-001', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', status: 'active', skuCount: 4200, manager: 'Rajesh Kumar' },
  { id: 2, name: 'South Hub',      code: 'WH-002', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', status: 'active', skuCount: 1800, manager: 'Priya Sharma' },
  { id: 3, name: 'North Depot',    code: 'WH-003', city: 'Delhi', state: 'Delhi', pincode: '110001', status: 'inactive', skuCount: 900, manager: 'Amit Singh' },
];

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState(MOCK_WAREHOUSES);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="p-6">
      <PageHeader
        title="Warehouse Management"
        subtitle="Manage fulfilment centres and stock locations"
        breadcrumbs={[{ label: 'Inventory Management' }, { label: 'Warehouse Management' }]}
        actions={
          <PermissionGuard module="inventory" action={ACTIONS.CREATE}>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#989AFF] text-white text-sm rounded-lg hover:bg-[#7b7de8]"
            >
              <MdAdd size={16} /> Add Warehouse
            </button>
          </PermissionGuard>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <div key={wh.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-[#F0F0F3] flex items-center justify-center text-[#989AFF]">
                  <MdWarehouse size={20} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{wh.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{wh.code}</div>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${wh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {wh.status}
              </span>
            </div>
            <div className="px-5 py-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MdLocationOn size={14} className="text-gray-300 flex-shrink-0" />
                {wh.city}, {wh.state} – {wh.pincode}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Manager</span>
                <span className="font-medium text-gray-700">{wh.manager}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Total SKUs</span>
                <span className="font-mono font-semibold text-gray-700">{wh.skuCount.toLocaleString()}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
              <PermissionGuard module="inventory" action={ACTIONS.EDIT}>
                <button className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                  <MdEdit size={13} /> Edit
                </button>
              </PermissionGuard>
              <PermissionGuard module="inventory" action={ACTIONS.DELETE}>
                <button
                  onClick={() => setDeleteTarget(wh)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-100 rounded-lg hover:bg-red-50 text-red-500"
                >
                  <MdDelete size={13} /> Delete
                </button>
              </PermissionGuard>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { setWarehouses((prev) => prev.filter((w) => w.id !== deleteTarget?.id)); setDeleteTarget(null); }}
        variant="danger"
        title="Delete Warehouse?"
        message={`This will permanently remove "${deleteTarget?.name}". Stock assignments will need to be re-mapped.`}
        confirmLabel="Delete Warehouse"
      />
    </div>
  );
};

export default WarehouseManagement;
