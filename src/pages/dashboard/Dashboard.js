
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaLeftLong, FaRightFromBracket } from 'react-icons/fa6';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import TableData from '../../components/Atoms/TableData/TableData';
import Dropdown from '../../components/Atoms/Dropdown/Dropdown';
import DashboardCard from '../../components/Atoms/Cards/DashboardCard';
import { getDashboardOverview } from '../../Redux/adminCoreSlice';

const salesData = [
  { name: 'Dec-2024', value: 0 },
  { name: 'Jan-2025', value: 0 },
  { name: 'Feb-2025', value: 0 },
  { name: 'Mar-2025', value: 0 },
  { name: 'Apr-2025', value: 0 },
  { name: 'May-2025', value: 0 },
];

const ordersData = [
  {
    id: 'O2519787759',
    customer: 'Michael Williams (michael)',
    email: 'login@dummyid.com',
    date: '16/05/2025',
    time: '12:00',
    total: '$79,081.80',
    status: 'Pending'
  },
  {
    id: 'O6892955277',
    customer: 'Michael Williams (michael)',
    email: 'login@dummyid.com',
    date: '16/05/2025',
    time: '11:58',
    total: '$78,831.80',
    status: 'Paid'
  }
];

const trafficData = [
  { name: 'Organic Search', value: 44, color: '#3366CC' },
  { name: 'Direct', value: 29.6, color: '#DC3912' },
  { name: 'Referral', value: 17.2, color: '#FF9900' },
  { name: 'Social', value: 5.4, color: '#109618' },
  { name: 'Other', value: 3.8, color: '#990099' },
];

const salesOption = [{ value: 'sales', label: "Sales" }]



const StatsSection = () => {
  return (
    <div className="bg-white rounded-md shadow-sm mb-6">
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Statistics</h2>
        <Dropdown options={salesOption} triggerLabel={`Sales`} />
      </div>
      <div className=" h-80 text-gray-300 text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={salesData}
            margin={{ top: 5, right: 40, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
const tableHeadings = [
  "Order ID",
  "Customer",
  "Date",
  "Order Total",
  "Payment Status",
]

const tableRows = ordersData?.map((ele, index) => {
  return [
    ele?.id,
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gray-300"></div>
      <div>
        <p className="text-sm font-semibold">{ele.customer}</p>
        <p className="text-xs text-gray-500">{ele.email}</p>
      </div>
    </div>,
    <span>
      31/01/2025 <br></br>
      15:17
    </span>,
    <span>{ele?.total}</span>,
    <span className='p-1 text-teal-800 bg-[#def8f4]'>
      Approved
    </span>,

  ];
});
export default function Dashboard() {
  const dispatch = useDispatch();
  const overview = useSelector(
    (state) => state.adminCore?.dashboardOverviewData?.normalized?.data
  );

  useEffect(() => {
    dispatch(getDashboardOverview());
  }, [dispatch]);

  const dashboardStats = useMemo(() => {
    const totals = overview?.totals || overview || {};
    const getCurrencyValue = (val) => {
      if (typeof val === 'number') return `$${val.toFixed(2)}`;
      if (typeof val === 'string') return val;
      return "$0.00";
    };
    const getNumberValue = (val) => {
      if (typeof val === 'number') return val;
      return 0;
    };
    return {
      sales: getCurrencyValue(totals.totalSales ?? totals.sales),
      earnings: getCurrencyValue(totals.salesEarnings ?? totals.earnings),
      users: getNumberValue(totals.newUsers ?? totals.users ?? totals.totalUsers),
      shops: getNumberValue(totals.newShops ?? totals.shops ?? totals.vendors ?? totals.totalSellers),
    };
  }, [overview]);

  const recentOrders = useMemo(() => {
    const orders = overview?.recentOrders || overview?.orders || ordersData;
    return orders.map((order) => [
      order.orderNumber || order.id || order._id,
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-300"></div>
        <div>
          <p className="text-sm font-semibold">{order.customerName || order.customer || order.user?.userName || "Customer"}</p>
          <p className="text-xs text-gray-500">{order.email || order.user?.email || "-"}</p>
        </div>
      </div>,
      <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : order.date || "-"}</span>,
      <span>{typeof order.totalAmount === 'object' ? 'Invalid Data' : order.totalAmount ?? order.total ?? "-"}</span>,
      <span className='p-1 text-teal-800 bg-[#def8f4]'>{order.paymentStatus || order.status || "Pending"}</span>,
    ]);
  }, [overview]);

  return (
    <div className="min-h-screen max-w-7xl mx-auto mt-6 p-2 w-full">
      <div className=" mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StatsSection />
            <div className="bg-white rounded-md shadow-sm mb-6 p-2">
              <div className="overflow-x-auto">
                <TableData
                  Heading="Recent Orders"
                  tableHeadings={tableHeadings}
                  data={recentOrders}
                  showSearch={false}
                  showAddButton={true}
                  addButtonLabel="View All"
                />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-md shadow-sm mb-6">
              <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">{`Total Sales`}</h2>
                <Dropdown options={salesOption} triggerLabel={`Sales`} />
              </div>
              <div className="p-4">
                <DashboardCard color={`bg-red-500`} label="Order Sales" value={dashboardStats.sales} />
                <DashboardCard color="blue" label="Sales Earnings" value={dashboardStats.earnings} />
                <DashboardCard color="red" label="New Users" value={dashboardStats.users} />
                <DashboardCard color="red" label="New Shops" value={dashboardStats.shops} />
              </div>
            </div>
            <div className="bg-white rounded-md shadow-sm mb-6">
              <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">{`Traffic`}</h2>
                <Dropdown options={salesOption} triggerLabel={`Sales`} />
              </div>
              <div className="p-4 flex justify-center">
                <div className="w-80 h-72 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                        {trafficData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">1/5</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-1 rounded-md bg-gray-100 hover:bg-gray-200">
                    <FaLeftLong size={16} />
                  </button>
                  <button className="p-1 rounded-md bg-gray-100 hover:bg-gray-200">
                    <FaRightFromBracket size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
