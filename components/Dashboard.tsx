import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { db } from '../services/db';
import { DollarSign, Calendar, AlertTriangle, Users } from 'lucide-react';

const Dashboard: React.FC = () => {
  const sales = db.sales.getAll();
  const appointments = db.appointments.getAll();
  const inventory = db.inventory.getAll();
  const customers = db.customers.getAll();
  const staffList = db.staff.getAll();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM

  // --- KPI CALCULATIONS ---
  
  // 1. Appointments Today
  const todaysAppointments = appointments.filter(a => a.date === todayStr).length;

  // 2. Revenue This Month
  // Logic: Sum of Product Sales (from Sales table) + Completed Service Revenue (from Appointments table)
  const thisMonthSales = sales.filter(s => s.date.startsWith(currentMonthStr));
  const thisMonthAppts = appointments.filter(a => a.date.startsWith(currentMonthStr) && a.status === 'Completed');

  const revenueFromProducts = thisMonthSales.reduce((acc, s) => {
    // Filter for products to avoid double counting if services are mixed in sales (though usually they are separate in this app structure)
    const productTotal = s.items
      .filter(i => i.type === 'Product')
      .reduce((sum, i) => sum + (i.price * i.quantity), 0);
    return acc + productTotal;
  }, 0);

  const revenueFromServices = thisMonthAppts.reduce((acc, a) => acc + a.price, 0);
  const revenueThisMonth = revenueFromProducts + revenueFromServices;

  // 3. Low Stock Items
  const lowStockCount = inventory.filter(p => p.quantity <= p.minThreshold).length;

  // 4. Total Clients
  const totalClients = customers.length;

  // --- CHART DATA PREPARATION ---

  // Date Generator for Last 7 Days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // Chart 1 & 2 Data: Daily Revenue & Visits
  const trendData = last7Days.map(date => {
    const daySales = sales.filter(s => s.date.startsWith(date));
    const dayAppts = appointments.filter(a => a.date === date && a.status === 'Completed');
    
    const prodRev = daySales.reduce((acc, s) => acc + s.items.filter(i => i.type === 'Product').reduce((sum, i) => sum + (i.price * i.quantity), 0), 0);
    const servRev = dayAppts.reduce((acc, a) => acc + a.price, 0);

    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: prodRev + servRev,
      visits: dayAppts.length
    };
  });

  // Chart 3 Data: Staff Performance (This Month)
  const staffPerformanceData = staffList
    .filter(s => s.active)
    .map(member => {
      // Find completed appointments for this staff in current month
      const staffAppts = thisMonthAppts.filter(a => a.staffId === member.id);
      const totalRev = staffAppts.reduce((acc, a) => acc + a.price, 0);
      return {
        name: member.name.split(' ')[0], // First name for brevity
        revenue: totalRev,
        role: member.role
      };
    })
    .sort((a, b) => b.revenue - a.revenue); // Sort by highest revenue

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg transition hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-rose-50 rounded-md p-3">
                <Calendar className="h-6 w-6 text-rose-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Appointments Today</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{todaysAppointments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg transition hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-50 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Revenue This Month</dt>
                  <dd className="text-2xl font-semibold text-gray-900">₹{revenueThisMonth.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg transition hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-50 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Items</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{lowStockCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg transition hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-50 rounded-md p-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{totalClients}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphs Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend - Line Graph */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`}/>
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Visits - Bar Graph */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Client Visits (Last 7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="visits" name="Visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Graphs Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Staff Targets / Performance - Bar Graph */}
         <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Staff Performance (Revenue This Month)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffPerformanceData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Placeholder for future widget or more data */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white flex flex-col justify-center items-center text-center shadow">
            <h3 className="text-2xl font-bold mb-2">Grow Your Business</h3>
            <p className="mb-6 opacity-90">Use our AI Assistant to generate marketing campaigns and analyze your salon's performance.</p>
            <button 
              onClick={() => window.location.hash = '/assistant'} // Simple navigation hack or use standard Link if imported
              className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-gray-50 transition"
            >
              Ask AI Assistant
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;