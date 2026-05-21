import React, { useEffect, useState } from 'react';
import { MdNotifications, MdAddCircleOutline } from 'react-icons/md';
import { PageHeader, DataTable, StatusBadge } from '../../components/Shared';
import { axiosPrivate as axiosProvider } from '../../_helpers/axiosProvider';
import { toast } from 'react-toastify';

const COLUMNS = [
  { key: 'title',      label: 'Product',   sortable: true },
  { key: 'sku',        label: 'SKU' },
  { key: 'category',   label: 'Category' },
  { key: 'stock',      label: 'Current Stock', sortable: true,
    render: (v) => <span className="font-mono font-semibold text-yellow-600">{v ?? 0}</span> },
  { key: 'threshold',  label: 'Threshold',
    render: (v) => <span className="font-mono text-gray-400">{v ?? 5}</span> },
  { key: 'gap',        label: 'Gap',
    render: (_, row) => {
      const g = (row.threshold ?? 5) - (row.stock ?? 0);
      return <span className={`font-mono font-semibold ${g > 0 ? 'text-red-500' : 'text-green-600'}`}>{g > 0 ? `−${g}` : 'OK'}</span>;
    }
  },
  { key: 'status',     label: 'Alert',
    render: (_, row) => {
      const avail = row.stock ?? 0;
      const thr   = row.threshold ?? 5;
      return avail <= 0 ? <StatusBadge status="out_of_stock" dot /> : avail <= thr ? <StatusBadge status="low_stock" dot /> : null;
    }
  },
];

const LowStockAlerts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axiosProvider.get('/products', {
          params: { stockStatus: 'low', page, limit: 20 },
        });
        const items = res.data?.data?.products || res.data?.data || [];
        setProducts(items);
        setTotal(res.data?.data?.total || items.length);
      } catch {
        toast.error('Failed to load low stock data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page]);

  const tableData = products.map((p) => ({
    _id:      p._id,
    title:    p.title,
    sku:      p.sku || '—',
    category: p.category || '—',
    stock:    p.stock ?? 0,
    threshold:p.inventorySettings?.lowStockThreshold ?? 5,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Low Stock Alerts"
        subtitle="Products that need to be restocked soon"
        breadcrumbs={[{ label: 'Inventory Management' }, { label: 'Low Stock Alerts' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-[#989AFF] text-white text-sm rounded-lg hover:bg-[#7b7de8]">
            <MdAddCircleOutline size={16} /> Restock All
          </button>
        }
      />

      {/* Summary banner */}
      <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <MdNotifications size={20} className="text-yellow-500 flex-shrink-0" />
        <span className="text-sm text-yellow-700">
          <strong>{total}</strong> product{total !== 1 ? 's' : ''} are below their low-stock threshold and need attention.
        </span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={tableData}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        emptyText="No low stock alerts — all products are well stocked!"
      />
    </div>
  );
};

export default LowStockAlerts;
