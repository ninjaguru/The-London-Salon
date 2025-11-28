
import React, { useState, useEffect, useRef } from 'react';
import { db, createNotification, exportToCSV } from '../services/db';
import { Appointment, Staff, Customer, AppointmentStatus, Service, Category } from '../types';
import { Plus, Clock, Scissors, Download, X, FileText, Search, User, Phone, Check, Tag, ChevronDown, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import Modal from './ui/Modal';
import { jsPDF } from 'jspdf';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Type Ahead State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceList, setShowServiceList] = useState(false);

  // Filters State - Default: 1st of current month to Today
  const getFirstDayOfMonth = () => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  const getToday = () => new Date().toISOString().split('T')[0];

  const [filterStaff, setFilterStaff] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(getFirstDayOfMonth());
  const [filterEndDate, setFilterEndDate] = useState(getToday());
  const [filterStatus, setFilterStatus] = useState('');

  // Form
  const [formData, setFormData] = useState({
    customerId: '', 
    staffId: '', 
    serviceId: '',
    serviceName: '', 
    date: new Date().toISOString().split('T')[0], 
    time: '10:00', 
    durationMin: 60, 
    price: 0
  });

  useEffect(() => {
    setAppointments(db.appointments.getAll());
    setStaff(db.staff.getAll());
    setCustomers(db.customers.getAll());
    setServices(db.services.getAll());
    setCategories(db.categories.getAll());
  }, []);

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    const updated = appointments.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setAppointments(updated);
    db.appointments.save(updated);
  };

  const openBookModal = () => {
      setFormData({
        customerId: '', 
        staffId: '', 
        serviceId: '',
        serviceName: '', 
        date: new Date().toISOString().split('T')[0], 
        time: '10:00', 
        durationMin: 60, 
        price: 0
      });
      setCustomerSearch('');
      setServiceSearch('');
      setShowCustomerList(false);
      setShowServiceList(false);
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
        alert("Please select a customer.");
        return;
    }

    const newAppt: Appointment = {
      id: crypto.randomUUID(),
      ...formData,
      durationMin: Number(formData.durationMin),
      price: Number(formData.price),
      status: AppointmentStatus.Scheduled
    };
    const updated = [...appointments, newAppt];
    setAppointments(updated);
    db.appointments.save(updated);

    // Notify Staff
    const customer = customers.find(c => c.id === formData.customerId);
    const stylist = staff.find(s => s.id === formData.staffId);
    
    if (stylist && customer) {
        createNotification(
            'staff', 
            'New Appointment', 
            `New booking: ${customer.name} for ${formData.serviceName} on ${formData.date} at ${formData.time}`, 
            stylist.id
        );
    }

    setIsModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Type Ahead Logic ---

  const selectCustomer = (customer: Customer) => {
      setFormData({ ...formData, customerId: customer.id });
      setCustomerSearch(`${customer.name}`);
      setShowCustomerList(false);
  };

  const clearCustomerSelection = () => {
      setFormData({ ...formData, customerId: '' });
      setCustomerSearch('');
      setShowCustomerList(false);
  };

  const selectService = (service: Service) => {
      setFormData({
          ...formData,
          serviceId: service.id,
          serviceName: service.name,
          price: service.offerPrice || service.price,
          durationMin: service.durationMin
      });
      setServiceSearch(service.name);
      setShowServiceList(false);
  };

  const clearServiceSelection = () => {
      setFormData({
          ...formData,
          serviceId: '',
          serviceName: '',
          price: 0,
          durationMin: 60
      });
      setServiceSearch('');
      setShowServiceList(false);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || '';

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
  );

  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const clearFilters = () => {
      setFilterStaff('');
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterStatus('');
  };

  const generateBill = async (customer: Customer, appointmentsToBill: Appointment[]) => {
    // Filter non-cancelled
    const items = appointmentsToBill.filter(a => a.status !== AppointmentStatus.Cancelled);

    if (items.length === 0) {
        alert("No billable appointments found for this customer in the current view.");
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper to add logo if available
    const loadLogo = (): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = '/logo.png';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });
    };

    const logo = await loadLogo();

    let yOffset = 20;

    // Header Section
    if (logo) {
        doc.addImage(logo, 'PNG', 20, 10, 30, 15); // Adjust aspect ratio as needed
        yOffset = 30;
    } else {
        // Fallback title if logo fails
        doc.setFontSize(22);
        doc.setTextColor(225, 29, 72); // Rose-600
        doc.text('The London Salon', 20, 20);
        yOffset = 26;
    }

    // Address
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('Vibgyor High School Road, Thubarahalli,', 20, yOffset);
    doc.text('Whitefield, Bengaluru, Karnataka 560066', 20, yOffset + 5);
    
    // Invoice Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' });
    
    const invoiceDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Date: ${invoiceDate}`, pageWidth - 20, 28, { align: 'right' });
    
    // Line Separator
    doc.setDrawColor(200);
    doc.line(20, yOffset + 15, pageWidth - 20, yOffset + 15);
    yOffset += 25;

    // Bill To
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Bill To:', 20, yOffset);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(customer.name, 20, yOffset + 6);
    doc.text(customer.phone, 20, yOffset + 11);
    if(customer.apartment) doc.text(customer.apartment, 20, yOffset + 16);

    yOffset += 30;

    // Service Details Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yOffset, pageWidth - 40, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text('Date', 25, yOffset + 7);
    doc.text('Service', 55, yOffset + 7);
    doc.text('Stylist', 120, yOffset + 7);
    doc.text('Amount', pageWidth - 25, yOffset + 7, { align: 'right' });

    // Items Loop
    yOffset += 15;
    let totalAmount = 0;

    doc.setFont("helvetica", "normal");
    
    // Sort items by Date then Time
    items.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    items.forEach(item => {
        const itemStylist = staff.find(s => s.id === item.staffId)?.name || 'Unknown';
        
        // Handle long service names
        const serviceName = item.serviceName.length > 25 
            ? item.serviceName.substring(0, 22) + '...' 
            : item.serviceName;

        doc.text(new Date(item.date).toLocaleDateString(), 25, yOffset);
        doc.text(serviceName, 55, yOffset);
        doc.text(itemStylist, 120, yOffset);
        doc.text(`Rs. ${item.price.toFixed(2)}`, pageWidth - 25, yOffset, { align: 'right' });
        
        totalAmount += item.price;
        yOffset += 10;
        
        if (yOffset > 270) {
            doc.addPage();
            yOffset = 20;
        }
    });

    // Line
    doc.line(20, yOffset, pageWidth - 20, yOffset);
    yOffset += 10;

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text('Total:', 140, yOffset);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, pageWidth - 25, yOffset, { align: 'right' });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' });

    doc.save(`Invoice_${customer.name.replace(/\s+/g, '_')}_${invoiceDate}.pdf`);
  };

  // Filter & Sort
  const filteredAppointments = appointments.filter(a => {
      const matchesStaff = filterStaff ? a.staffId === filterStaff : true;
      const matchesStartDate = filterStartDate ? a.date >= filterStartDate : true;
      const matchesEndDate = filterEndDate ? a.date <= filterEndDate : true;
      const matchesStatus = filterStatus ? a.status === filterStatus : true;
      return matchesStaff && matchesStartDate && matchesEndDate && matchesStatus;
  }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
  });

  // Group by Customer ID
  const groupedAppointments: { [key: string]: { customer: Customer | undefined, appointments: Appointment[] } } = {};

  filteredAppointments.forEach(appt => {
      if (!groupedAppointments[appt.customerId]) {
          groupedAppointments[appt.customerId] = {
              customer: customers.find(c => c.id === appt.customerId),
              appointments: []
          };
      }
      groupedAppointments[appt.customerId].appointments.push(appt);
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(filteredAppointments, 'appointments')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            <button 
            onClick={openBookModal}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
            <Plus size={18} /> Book Appointment
            </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end flex-wrap">
          <div className="w-full md:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input 
                  type="date" 
                  value={filterStartDate} 
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
               />
          </div>
          <div className="w-full md:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input 
                  type="date" 
                  value={filterEndDate} 
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
               />
          </div>
          <div className="w-full md:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">Staff Member</label>
              <select 
                  value={filterStaff}
                  onChange={e => setFilterStaff(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[150px]"
              >
                  <option value="">All Staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
          </div>
          <div className="w-full md:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[150px]"
              >
                  <option value="">All Statuses</option>
                  {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          </div>
          <button 
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-rose-600 flex items-center pb-2 ml-auto md:ml-0"
          >
              <X size={14} className="mr-1" /> Clear
          </button>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedAppointments).length === 0 ? (
             <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                No appointments match your filters.
            </div>
        ) : (
            Object.values(groupedAppointments).map(({ customer, appointments: customerAppts }) => {
                // Group by Date for cleaner UI if multiple dates exist
                const dates: { [date: string]: Appointment[] } = {};
                customerAppts.forEach(a => {
                    if (!dates[a.date]) dates[a.date] = [];
                    dates[a.date].push(a);
                });

                return (
                    <div key={customer?.id || 'unknown'} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {/* Customer Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="flex items-center mb-2 sm:mb-0">
                                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold mr-3">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{customer?.name || 'Unknown Client'}</h3>
                                    {customer?.phone && (
                                        <div className="text-xs text-gray-500 flex items-center">
                                            <Phone size={12} className="mr-1" /> {customer.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded border border-gray-200">
                                    {customerAppts.length} Service{customerAppts.length !== 1 ? 's' : ''}
                                </div>
                                <button 
                                    onClick={() => customer && generateBill(customer, customerAppts)}
                                    className="text-xs flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors"
                                    title="Generate PDF Bill for all filtered services for this customer"
                                >
                                    <FileText size={14} className="mr-1.5 text-indigo-500" /> Create Bill
                                </button>
                            </div>
                        </div>

                        {/* Appointments Body */}
                        <div className="divide-y divide-gray-100">
                            {Object.entries(dates).sort((a,b) => b[0].localeCompare(a[0])).map(([date, dayAppts]) => (
                                <div key={date} className="p-4 sm:p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center text-sm font-semibold text-gray-700">
                                            <CalendarIcon size={16} className="mr-2 text-rose-500"/> 
                                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                        {dayAppts.sort((a,b) => a.time.localeCompare(b.time)).map((appt, idx) => {
                                            const stylist = staff.find(s => s.id === appt.staffId);
                                            return (
                                                <div key={appt.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 ${idx !== dayAppts.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                                    <div className="flex-1 min-w-0 mb-3 md:mb-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                <Clock size={12} className="mr-1"/> {appt.time}
                                                            </span>
                                                            <span className="font-medium text-gray-900">{appt.serviceName}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-500 ml-1">
                                                            <Scissors size={14} className="mr-1 text-gray-400"/> with {stylist?.name || 'Unknown Staff'}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                                        <div className="font-semibold text-gray-900 mr-4">
                                                            ₹{appt.price}
                                                        </div>
                                                        <div className="min-w-[140px]">
                                                            <select 
                                                                value={appt.status}
                                                                onChange={(e) => handleStatusChange(appt.id, e.target.value as AppointmentStatus)}
                                                                className={`w-full text-xs font-semibold rounded-md py-1.5 pl-2 pr-8 border-0 ring-1 ring-inset focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                                                                    appt.status === AppointmentStatus.Scheduled ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                                                    appt.status === AppointmentStatus.Completed ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                                    'bg-red-50 text-red-700 ring-red-600/20'
                                                                }`}
                                                            >
                                                                {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Appointment">
        <form onSubmit={handleSubmit} className="space-y-4 h-[70vh] overflow-y-auto px-1 relative">
            {/* Customer Type Ahead */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Select Customer (Name or Phone)</label>
                <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                        type="text" 
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerList(true);
                            if (formData.customerId) setFormData({...formData, customerId: ''}); 
                        }}
                        onFocus={() => setShowCustomerList(true)}
                        placeholder="Search customer name or phone..."
                        className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 sm:text-sm ${!formData.customerId && customerSearch ? 'border-amber-400' : 'border-gray-300'}`}
                    />
                    {formData.customerId ? (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={clearCustomerSelection}>
                             <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </div>
                    ) : (
                         customerSearch && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => { setCustomerSearch(''); setShowCustomerList(false); }}>
                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </div>
                         )
                    )}
                </div>
                
                {showCustomerList && customerSearch && (
                    <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                                <div 
                                    key={c.id}
                                    onClick={() => selectCustomer(c)}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-rose-50 flex items-center border-b border-gray-50 last:border-0"
                                >
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 mr-3 flex-shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <span className="block font-medium truncate text-gray-900">{c.name}</span>
                                        <span className="block text-xs text-gray-500 truncate flex items-center">
                                            <Phone size={10} className="mr-1" /> {c.phone}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 italic">
                                No customers found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Staff Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Staff</label>
                <select name="staffId" required value={formData.staffId} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300 bg-white">
                    <option value="">Select Staff</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
            </div>

            {/* Service Type Ahead */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Select Service</label>
                <div className="relative mt-1">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                        type="text" 
                        value={serviceSearch}
                        onChange={(e) => {
                            setServiceSearch(e.target.value);
                            setShowServiceList(true);
                            if (formData.serviceId) setFormData({...formData, serviceId: '', price: 0, durationMin: 60, serviceName: ''});
                        }}
                        onFocus={() => setShowServiceList(true)}
                        placeholder="Search service..."
                        className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 sm:text-sm ${formData.serviceId ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                    />
                     {formData.serviceId ? (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={clearServiceSelection}>
                             <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </div>
                    ) : (
                         serviceSearch && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => { setServiceSearch(''); setShowServiceList(false); }}>
                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </div>
                         )
                    )}
                </div>

                {showServiceList && (
                    <div className="absolute z-50 mt-1 w-full bg-white shadow-2xl max-h-80 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-100">
                        {filteredServices.length > 0 ? (
                            filteredServices.map(s => (
                                <div 
                                    key={s.id}
                                    onClick={() => selectService(s)}
                                    className="cursor-pointer select-none relative p-3 hover:bg-rose-50 border-b border-gray-100 last:border-0 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-900">{s.name}</div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    <Tag size={10} className="mr-1"/> {getCategoryName(s.categoryId)}
                                                </span>
                                                <span className="inline-flex items-center text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                    <Clock size={10} className="mr-1"/> {s.durationMin}m
                                                </span>
                                                <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${
                                                    s.gender === 'Women' ? 'border-pink-200 bg-pink-50 text-pink-700' :
                                                    s.gender === 'Men' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                                    'border-purple-200 bg-purple-50 text-purple-700'
                                                }`}>
                                                    {s.gender}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right ml-2 flex-shrink-0">
                                             {s.offerPrice ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-green-600 font-bold bg-green-50 px-1 rounded">₹{s.offerPrice}</span>
                                                    <span className="text-gray-400 text-xs line-through">₹{s.price}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-900 font-bold bg-gray-50 px-1 rounded">₹{s.price}</span>
                                            )}
                                        </div>
                                    </div>
                                    {s.description && (
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-1 italic">{s.description}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="cursor-default select-none relative py-3 px-4 text-gray-500 italic text-center">
                                No services found matching "{serviceSearch}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Service Name (Manual Override)</label>
                <input 
                    name="serviceName" 
                    type="text" 
                    required 
                    value={formData.serviceName} 
                    onChange={handleChange} 
                    placeholder="e.g. Haircut" 
                    className={`mt-1 block w-full border p-2 rounded-md border-gray-300 ${formData.serviceId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                    readOnly={!!formData.serviceId}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input name="date" type="date" required value={formData.date} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input name="time" type="time" required value={formData.time} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                    <input name="durationMin" type="number" required value={formData.durationMin} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input name="price" type="number" required value={formData.price} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
            </div>
            <div className="mt-5 sm:mt-6 pb-2">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none ring-2 ring-offset-2 ring-rose-500">
                  Book Appointment
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Appointments;
