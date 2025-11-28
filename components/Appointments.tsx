
import React, { useState, useEffect, useRef } from 'react';
import { db, createNotification, exportToCSV } from '../services/db';
import { Appointment, Staff, Customer, AppointmentStatus, Service, Category } from '../types';
import { Plus, Clock, Scissors, Download, X, FileText, Search, User, Phone, Check, Tag } from 'lucide-react';
import Modal from './ui/Modal';
import { jsPDF } from 'jspdf';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Added categories
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

  const generateBill = (appt: Appointment) => {
    const customer = customers.find(c => c.id === appt.customerId);
    const stylist = staff.find(s => s.id === appt.staffId);

    if (!customer || !stylist) {
        alert("Missing customer or staff data for this appointment.");
        return;
    }

    const doc = new jsPDF();

    // Branding
    doc.setFontSize(22);
    doc.setTextColor(225, 29, 72); // Rose-600
    doc.text('The London Salon', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('123 High Street, London, UK', 20, 26);
    doc.text('Phone: +44 20 7946 0123', 20, 31);

    // Invoice Details
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', 140, 20);
    
    doc.setFontSize(10);
    doc.text(`Invoice No: #${appt.id.slice(0, 8).toUpperCase()}`, 140, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 33);
    
    // Line Separator
    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);

    // Bill To
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Bill To:', 20, 50);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(customer.name, 20, 56);
    doc.text(customer.phone, 20, 61);
    if(customer.apartment) doc.text(customer.apartment, 20, 66);

    // Service Details Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 80, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text('Service Description', 25, 87);
    doc.text('Stylist', 110, 87);
    doc.text('Amount', 170, 87, { align: 'right' });

    // Item
    doc.setFont("helvetica", "normal");
    doc.text(appt.serviceName, 25, 100);
    doc.text(stylist.name, 110, 100);
    doc.text(`£${appt.price.toFixed(2)}`, 170, 100, { align: 'right' });

    // Line
    doc.line(20, 110, 190, 110);

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text('Total:', 140, 125);
    doc.text(`£${appt.price.toFixed(2)}`, 170, 125, { align: 'right' });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your business!', 105, 150, { align: 'center' });

    doc.save(`Invoice_${customer.name.replace(/\s+/g, '_')}_${appt.date}.pdf`);
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

      <div className="space-y-4">
        {filteredAppointments.map((appt) => {
            const client = customers.find(c => c.id === appt.customerId);
            const stylist = staff.find(s => s.id === appt.staffId);
            
            return (
                <div key={appt.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                             <div className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                                {new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                             </div>
                             <div className="flex items-center text-gray-600 text-sm">
                                <Clock size={16} className="mr-1"/> {appt.time} ({appt.durationMin}m)
                             </div>
                             <div className="text-gray-500 text-sm font-medium">₹{appt.price}</div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{client?.name || 'Unknown Client'}</h3>
                        <p className="text-gray-500 text-sm flex items-center mt-1">
                           <Scissors size={14} className="mr-1"/> {appt.serviceName} with <span className="font-medium ml-1">{stylist?.name}</span>
                        </p>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        <select 
                            value={appt.status}
                            onChange={(e) => handleStatusChange(appt.id, e.target.value as AppointmentStatus)}
                            className={`text-sm rounded-full px-3 py-1 font-medium border-0 ring-1 ring-inset ${
                                appt.status === AppointmentStatus.Scheduled ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                appt.status === AppointmentStatus.Completed ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                'bg-red-50 text-red-700 ring-red-600/20'
                            }`}
                        >
                            {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button 
                          onClick={() => generateBill(appt)}
                          className="p-2 text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-full hover:bg-gray-50"
                          title="Create Bill / PDF"
                        >
                            <FileText size={18} />
                        </button>
                    </div>
                </div>
            );
        })}
        {filteredAppointments.length === 0 && (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                No appointments match your filters.
            </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Appointment">
        <form onSubmit={handleSubmit} className="space-y-4 h-[70vh] overflow-y-auto px-1">
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
                            if (formData.customerId) setFormData({...formData, customerId: ''}); // Clear selection on edit
                        }}
                        onFocus={() => setShowCustomerList(true)}
                        placeholder="Search customer..."
                        className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 sm:text-sm ${!formData.customerId && customerSearch ? 'border-amber-400' : 'border-gray-300'}`}
                    />
                    {formData.customerId && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Check className="h-4 w-4 text-green-500" />
                        </div>
                    )}
                </div>
                
                {showCustomerList && customerSearch && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                                <div 
                                    key={c.id}
                                    onClick={() => selectCustomer(c)}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-rose-50 flex items-center"
                                >
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <span className="block font-medium truncate">{c.name}</span>
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

            {/* Staff Selection (Standard Dropdown) */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Staff</label>
                <select name="staffId" required value={formData.staffId} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300">
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
                        }}
                        onFocus={() => setShowServiceList(true)}
                        placeholder="Search service..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                    />
                </div>

                {showServiceList && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-xl max-h-80 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {filteredServices.length > 0 ? (
                            filteredServices.map(s => (
                                <div 
                                    key={s.id}
                                    onClick={() => selectService(s)}
                                    className="cursor-pointer select-none relative py-3 pl-3 pr-4 hover:bg-rose-50 border-b border-gray-50 last:border-0"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-900">{s.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                    <Tag size={10} className="mr-1"/> {getCategoryName(s.categoryId)}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <Clock size={10} className="mr-1"/> {s.durationMin}m
                                                </span>
                                                <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {s.gender}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                             {s.offerPrice ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-green-600 font-bold">₹{s.offerPrice}</span>
                                                    <span className="text-gray-400 text-xs line-through">₹{s.price}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-900 font-bold">₹{s.price}</span>
                                            )}
                                        </div>
                                    </div>
                                    {s.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.description}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 italic">
                                No services found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Service Name (Manual Override)</label>
                <input name="serviceName" type="text" required value={formData.serviceName} onChange={handleChange} placeholder="e.g. Haircut" className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
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
            <div className="mt-5 sm:mt-6">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700">
                  Book
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Appointments;
