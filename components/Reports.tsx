
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { db, exportToCSV, getTodayIST } from '../services/db';
import { Download, Calendar } from 'lucide-react';

const COLORS = ['#e11d48', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'];

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'customers' | 'inventory'>('sales');
  
  // Date Filters - Default: 1st of current month to Today (IST)
  const getFirstDayOfMonth = () => {
      const today = getTodayIST();
      const [year, month] = today.split('-');
      return `${year}-${month}-01`;
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayIST());

  const allSales = db.sales.getAll();
  const allAppointments = db.appointments.getAll();
  const customers = db.customers.getAll();
  const inventory = db.inventory.getAll();

  // FILTER DATA
  const sales = allSales.filter(s => s.date.split('T')[0] >= startDate && s.date.split('T')[0] <= endDate);
  const appointments = allAppointments.filter(a => a.date >= startDate && a.date <= endDate);

  // --- SALES DATA ---
  // Aggregate sales by date (Daily within range)
  const getDatesInRange = (start: string, end: string) => {
    const arr = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
        arr.push(new Date(dt).toISOString().split('T')[0]);
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };
  
  const dateRange = getDatesInRange(startDate, endDate);
  // If range > 30 days, we might want to aggregate by week/month, but keeping simple daily for now.
  // Display only last 7 days of the selected range if the range is huge, otherwise show all.
  const displayDates = dateRange.length > 31 ? dateRange.slice(-31) : dateRange;

  const revenueData = displayDates.map(date => {
    const dailyRetail = sales.filter(s => s.date.startsWith(date) && s.items.some(i => i.type === 'Product')).reduce((acc, s) => acc + s.total, 0);
    const dailyService = appointments
        .filter(a => a.date === date && a.status === 'Completed')
        .reduce((acc, a) => acc + a.price, 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      retail: dailyRetail,
      service: dailyService,
      total: dailyRetail + dailyService
    };
  });

  // Top Products
  const productSalesMap = new Map<string, number>();
  sales.forEach(s => {
      s.items.filter(i => i.type === 'Product').forEach(i => {
          productSalesMap.set(i.name, (productSalesMap.get(i.name) || 0) + i.quantity);
      });
  });
  const topProducts = Array.from(productSalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

  // Popular Services
  const serviceCountMap = new Map<string, number>();
  appointments.forEach(a => {
      serviceCountMap.set(a.serviceName, (serviceCountMap.get(a.serviceName) || 0) + 1);
  });
  const popularServices = Array.from(serviceCountMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);


  // --- CUSTOMER DATA ---
  const walletDistribution = [
      { name: 'With Credit', value: customers.filter(c => c.walletBalance > 0).length },
      { name: 'No Credit', value: customers.filter(c => c.walletBalance <= 0).length }
  ];

  // Customer Lifetime Value (Total historical revenue / total customers)
  const totalRevenueAllTime = allSales.reduce((acc, s) => acc + s.total, 0) + 
                       allAppointments.filter(a => a.status === 'Completed').reduce((acc, a) => acc + a.price, 0);
  const avgCLV = customers.length ? (totalRevenueAllTime / customers.length).toFixed(2) : 0;
  
  // New vs Returning (based on all history)
  const customerApptCounts = new Map<string, number>();
  allAppointments.forEach(a => {
      customerApptCounts.set(a.customerId, (customerApptCounts.get(a.customerId) || 0) + 1);
  });
  const newCustomers = customers.filter(c => (customerApptCounts.get(c.id) || 0) <= 1).length;
  const returningCustomers = customers.length - newCustomers;
  const retentionData = [
      { name: 'New (<=1 visit)', value: newCustomers },
      { name: 'Returning (>1 visit)', value: returningCustomers }
  ];

  // --- INVENTORY DATA ---
  const lowStockItems = inventory.filter(p => p.quantity <= p.minThreshold);
  const stockValueByCategoryMap = new Map<string, number>();
  inventory.forEach(p => {
      stockValueByCategoryMap.set(p.category, (stockValueByCategoryMap.get(p.category) || 0) + (p.price * p.quantity));
  });
  const stockValueData = Array.from(stockValueByCategoryMap.entries()).map(([name, value]) => ({ name, value }));

  const handleExport = () => {
      if (activeTab === 'sales') exportToCSV(revenueData, 'revenue_report');
      else if (activeTab === 'customers') exportToCSV(customers, 'customer_report');
      else if (activeTab === 'inventory') exportToCSV(inventory, 'inventory_report');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Reports & Analytics</h2>
        <div className="flex gap-2">
            <button 
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center text-gray-600 font-medium text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range:
          </div>
          <div>
              <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
          </div>
          <span className="text-gray-400">-</span>
          <div>
              <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
          </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['sales', 'customers', 'inventory'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`${
                activeTab === tab
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Breakdown (Selected Period)</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => `₹${value}`} />
                            <Legend />
                            <Bar dataKey="service" name="Services" stackId="a" fill="#e11d48" />
                            <Bar dataKey="retail" name="Products" stackId="a" fill="#8b5cf6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Services</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={popularServices}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {popularServices.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Best Selling Products</h3>
             </div>
             <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                     </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                     {topProducts.map((p, idx) => (
                         <tr key={idx}>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.value}</td>
                         </tr>
                     ))}
                     {topProducts.length === 0 && (
                         <tr><td colSpan={2} className="text-center py-4 text-gray-500">No data for this period</td></tr>
                     )}
                 </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{customers.length}</dd>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg. Lifetime Value</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-600">₹{avgCLV}</dd>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <dt className="text-sm font-medium text-gray-500 truncate">Retention Rate</dt>
                    <dd className="mt-1 text-3xl font-semibold text-blue-600">
                        {customers.length > 0 ? ((returningCustomers / customers.length) * 100).toFixed(0) : 0}%
                    </dd>
                </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Wallet Balance Distribution</h3>
                    <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={walletDistribution}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({name}) => name}
                                >
                                    {walletDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Loyalty (Visits)</h3>
                    <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={retentionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    <Cell fill="#10b981" />
                                    <Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
           </div>
        </div>
      )}

      {activeTab === 'inventory' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Value by Category</h3>
                  <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stockValueData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tickFormatter={(val) => `₹${val}`} />
                              <YAxis dataKey="name" type="category" width={100} />
                              <Tooltip formatter={(value) => `₹${value}`} />
                              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                        {lowStockItems.length} Items
                    </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Threshold</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {lowStockItems.map((p) => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{p.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.minThreshold}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button className="text-rose-600 hover:text-rose-900">Reorder</button>
                                </td>
                            </tr>
                        ))}
                        {lowStockItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Inventory levels are healthy.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      )}
    </div>
  );
};

export default Reports;
