
import React, { useState, useEffect, useRef } from 'react';
import { db, createNotification, exportToCSV, getTodayIST } from '../services/db';
import { Appointment, Staff, Customer, AppointmentStatus, Service, Category, Combo } from '../types';
import { Plus, Clock, Scissors, Download, X, FileText, Search, User, Phone, Check, Tag, ChevronDown, Calendar as CalendarIcon, DollarSign, LayoutList, ChevronLeft, ChevronRight, Layers, Save } from 'lucide-react';
import Modal from './ui/Modal';
import { jsPDF } from 'jspdf';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Type Ahead State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceList, setShowServiceList] = useState(false);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Filters State - Default: 1st of current month to Today (IST)
  const getFirstDayOfMonth = () => {
      const today = getTodayIST();
      const [year, month] = today.split('-');
      return `${year}-${month}-01`;
  };

  const [filterStaff, setFilterStaff] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(getFirstDayOfMonth());
  const [filterEndDate, setFilterEndDate] = useState(getTodayIST());
  const [filterStatus, setFilterStatus] = useState('');

  // Form
  const [formData, setFormData] = useState({
    customerId: '', 
    staffId: '', 
    serviceId: '',
    serviceName: '', 
    date: getTodayIST(), 
    time: '10:00', 
    durationMin: 60, 
    price: 0,
    discountPercent: 0 // Changed from discount amount to percent
  });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingBillData, setPendingBillData] = useState<{customer: Customer, appointments: Appointment[]} | null>(null);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');

  useEffect(() => {
    setAppointments(db.appointments.getAll());
    setStaff(db.staff.getAll());
    setCustomers(db.customers.getAll());
    setServices(db.services.getAll());
    setCombos(db.combos.getAll());
    setCategories(db.categories.getAll());
  }, []);

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    const updated = appointments.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setAppointments(updated);
    db.appointments.save(updated);
  };

  const openBookModal = (prefillDate?: string) => {
      setFormData({
        customerId: '', 
        staffId: '', 
        serviceId: '',
        serviceName: '', 
        date: prefillDate || getTodayIST(), 
        time: '10:00', 
        durationMin: 60, 
        price: 0,
        discountPercent: 0
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

    // Calculate Final Price based on Percentage
    const listPrice = Number(formData.price);
    const discountAmount = Math.round(listPrice * (Number(formData.discountPercent) / 100));
    const finalPrice = Math.max(0, listPrice - discountAmount);

    const newAppt: Appointment = {
      id: crypto.randomUUID(),
      ...formData,
      durationMin: Number(formData.durationMin),
      price: finalPrice, // Save final price after discount
      discount: discountAmount, // Save the calculated amount for record keeping
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

  const selectItem = (item: Service | Combo, type: 'Service' | 'Combo') => {
      // Logic for Discount: 
      // If Service AND Customer is Club Member -> 10% Discount
      // If Combo -> No Discount logic applied automatically
      let price = type === 'Service' ? ((item as Service).offerPrice || item.price) : item.price;
      let discountPercent = 0;

      // Check Membership Status
      if (formData.customerId) {
          const customer = customers.find(c => c.id === formData.customerId);
          if (customer && customer.isMember) {
              // Check membership expiry
              const expiry = customer.membershipExpiry ? new Date(customer.membershipExpiry) : null;
              if (expiry && expiry > new Date() && type === 'Service') {
                  // Apply 10% Discount
                  discountPercent = 10; 
              }
          }
      }

      setFormData({
          ...formData,
          serviceId: item.id,
          serviceName: item.name,
          price: price, // Set List Price
          discountPercent: discountPercent,
          durationMin: type === 'Service' ? (item as Service).durationMin : 60 // Default 60 for combo for now
      });
      setServiceSearch(item.name);
      setShowServiceList(false);
  };

  const clearServiceSelection = () => {
      setFormData({
          ...formData,
          serviceId: '',
          serviceName: '',
          price: 0,
          discountPercent: 0,
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

  // Combine Services and Combos for Search
  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );
  
  const filteredCombos = combos.filter(c => 
      c.active && c.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const clearFilters = () => {
      setFilterStaff('');
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterStatus('');
  };

  const initiateBillGeneration = (customer: Customer, appointmentsToBill: Appointment[]) => {
      setPendingBillData({ customer, appointments: appointmentsToBill });
      setPaymentMode('Cash');
      setIsPaymentModalOpen(true);
  };

  const confirmBillGeneration = async (generatePdf: boolean) => {
      if (!pendingBillData) return;

      // 1. Update Appointments with Payment Mode and Status
      const appointmentIdsToUpdate = new Set(pendingBillData.appointments.map(a => a.id));
      const updatedAppointments = appointments.map(appt => {
          if (appointmentIdsToUpdate.has(appt.id)) {
              return {
                  ...appt,
                  paymentMethod: paymentMode as any,
                  status: AppointmentStatus.Completed // Ensure status is completed when billed
              };
          }
          return appt;
      });

      setAppointments(updatedAppointments);
      db.appointments.save(updatedAppointments);

      // 2. Generate PDF if requested
      if (generatePdf) {
          await generateBill(pendingBillData.customer, pendingBillData.appointments, paymentMode);
      }

      setIsPaymentModalOpen(false);
      setPendingBillData(null);
  };

  const generateBill = async (customer: Customer, appointmentsToBill: Appointment[], mode: string) => {
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
    doc.text(String(customer.name), 20, yOffset + 6);
    doc.text(String(customer.phone), 20, yOffset + 11);
    if(customer.apartment) doc.text(String(customer.apartment), 20, yOffset + 16);
    if(customer.isMember) {
        doc.setTextColor(218, 165, 32);
        doc.text('Club Member', 20, yOffset + 21);
        doc.setTextColor(0);
    }

    yOffset += 30;

    // Service Details Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yOffset, pageWidth - 40, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text('Date', 25, yOffset + 7);
    doc.text('Service', 55, yOffset + 7);
    doc.text('Stylist', 120, yOffset + 7);
    doc.text('Discount', 155, yOffset + 7);
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
        doc.text(String(serviceName), 55, yOffset);
        doc.text(String(itemStylist), 120, yOffset);
        
        if (item.discount > 0) {
            doc.text(`-Rs.${item.discount}`, 155, yOffset);
        } else {
             doc.text('-', 155, yOffset);
        }

        doc.text(`Rs. ${item.price.toFixed(2)}`, pageWidth - 25, yOffset, { align: 'right' });
        
        totalAmount += item.price;
        yOffset += 10;
        
        if (yOffset > 250) {
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

    yOffset += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment Mode: ${mode}`, 20, yOffset);

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' });

    doc.save(`Invoice_${customer.name.replace(/\s+/g, '_')}_${invoiceDate}.pdf`);
  };

  // --- Calendar Helpers ---
  const calendarDays = () => {
      const year = currentCalendarDate.getFullYear();
      const month = currentCalendarDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon...
      
      const days = [];
      
      // Empty slots for previous month
      for (let i = 0; i < startDayOfWeek; i++) {
          days.push(null);
      }
      
      // Actual days
      for (let i = 1; i <= daysInMonth; i++) {
          days.push(new Date(year, month, i));
      }
      
      return days;
  };

  const nextMonth = () => {
      setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };
  
  const prevMonth = () => {
      setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
      setCurrentCalendarDate(new Date());
  };

  // Filter & Sort
  const filteredAppointments = appointments.filter(a => {
      const matchesStaff = filterStaff ? a.staffId === filterStaff : true;
      const matchesStatus = filterStatus ? a.status === filterStatus : true;
      
      // Date filters only apply in list mode to avoid confusion in calendar
      const matchesStartDate = viewMode === 'list' && filterStartDate ? a.date >= filterStartDate : true;
      const matchesEndDate = viewMode === 'list' && filterEndDate ? a.date <= filterEndDate : true;

      return matchesStaff && matchesStartDate && matchesEndDate && matchesStatus;
  }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
  });

  // Group by Customer ID (List View)
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

  // Helper to calculate estimated deduction for display in form
  const estimatedDeduction = Math.round(Number(formData.price) * (Number(formData.discountPercent) / 100));

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
        <div className="flex gap-2">
            <div className="bg-white border border-gray-300 rounded-lg p-0.5 flex items-center">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-rose-50 text-rose-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title="List View"
                >
                    <LayoutList size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('calendar')}
                    className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-rose-50 text-rose-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Calendar View"
                >
                    <CalendarIcon size={18} />
                </button>
            </div>
            <button 
                onClick={() => exportToCSV(filteredAppointments, 'appointments')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            <button 
            onClick={() => openBookModal()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
            <Plus size={18} /> Book Appointment
            </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end flex-wrap">
          {viewMode === 'list' && (
              <>
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
              </>
          )}
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
    
      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
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

                    // Check if there are any completed appointments to enable billing
                    const hasCompleted = customerAppts.some(a => a.status === AppointmentStatus.Completed);

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
                                    {hasCompleted && (
                                        <button 
                                            onClick={() => customer && initiateBillGeneration(customer, customerAppts.filter(a => a.status === AppointmentStatus.Completed))}
                                            className="text-xs flex items-center px-3 py-1.5 bg-green-50 border border-green-200 rounded hover:bg-green-100 text-green-700 transition-colors font-medium shadow-sm"
                                            title="Generate Bill for COMPLETED filtered services"
                                        >
                                            <DollarSign size={14} className="mr-1.5" /> Create Bill
                                        </button>
                                    )}
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
                                                            <div className="flex flex-col items-end mr-4">
                                                                {appt.discount > 0 && (
                                                                    <span className="text-xs text-green-600 font-semibold line-through">₹{appt.price + appt.discount}</span>
                                                                )}
                                                                <div className="font-semibold text-gray-900">
                                                                    ₹{appt.price}
                                                                </div>
                                                                {appt.paymentMethod && (
                                                                    <span className="text-[10px] text-gray-500">Paid via {appt.paymentMethod}</span>
                                                                )}
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
      )}

      {/* --- CALENDAR VIEW --- */}
      {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
             {/* Calendar Header */}
             <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-900">
                        {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex items-center bg-white rounded-md shadow-sm border border-gray-300">
                         <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 text-gray-600"><ChevronLeft size={18} /></button>
                         <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium hover:bg-gray-100 border-x border-gray-300 text-gray-700">Today</button>
                         <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 text-gray-600"><ChevronRight size={18} /></button>
                    </div>
                </div>
             </div>

             {/* Weekday Header */}
             <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                     <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                         {day}
                     </div>
                 ))}
             </div>

             {/* Calendar Grid */}
             <div className="grid grid-cols-7 grid-rows-5 flex-1 bg-gray-200 gap-[1px] overflow-y-auto">
                 {calendarDays().map((date, idx) => {
                     if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/50"></div>;
                     
                     const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
                     const isToday = dateStr === getTodayIST();
                     const dayAppts = filteredAppointments.filter(a => a.date === dateStr);

                     return (
                         <div 
                            key={dateStr} 
                            className={`bg-white p-2 min-h-[120px] relative hover:bg-gray-50 transition-colors cursor-pointer group`}
                            onClick={() => openBookModal(dateStr)}
                         >
                             <div className={`text-xs font-medium mb-1 flex justify-between items-center ${isToday ? 'text-rose-600 font-bold' : 'text-gray-700'}`}>
                                 <span className={isToday ? 'bg-rose-100 px-1.5 py-0.5 rounded-full' : ''}>{date.getDate()}</span>
                                 {dayAppts.length > 0 && <span className="text-[10px] text-gray-400">{dayAppts.length} appts</span>}
                             </div>

                             <div className="space-y-1 overflow-y-auto max-h-[90px] pr-1 scrollbar-hide">
                                 {dayAppts.map(appt => {
                                      const customerName = customers.find(c => c.id === appt.customerId)?.name || 'Unknown';
                                      const bgColor = appt.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' : 
                                                      appt.status === 'Cancelled' ? 'bg-red-50 text-red-800 border-red-100' : 
                                                      'bg-blue-50 text-blue-700 border-blue-100';
                                      return (
                                          <div 
                                            key={appt.id} 
                                            onClick={(e) => { e.stopPropagation(); /* Could open detailed view */ }}
                                            className={`text-[10px] px-1.5 py-1 rounded border truncate flex items-center gap-1 ${bgColor}`}
                                            title={`${appt.time} - ${customerName} (${appt.serviceName})`}
                                          >
                                              <span className="font-mono opacity-75">{appt.time}</span>
                                              <span className="font-medium truncate">{customerName}</span>
                                          </div>
                                      );
                                 })}
                             </div>
                             
                             {/* Add Button on Hover */}
                             <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-rose-50 text-rose-600 p-1 rounded-full shadow-sm hover:bg-rose-100">
                                    <Plus size={14} />
                                </div>
                             </div>
                         </div>
                     );
                 })}
             </div>
          </div>
      )}

      {/* Booking Modal */}
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
                                        {c.isMember && (
                                            <span className="block text-[10px] text-yellow-600 font-bold flex items-center">
                                                <DollarSign size={8} className="mr-0.5" /> Club Member
                                            </span>
                                        )}
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

            {/* Service / Combo Type Ahead */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Select Service or Combo</label>
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
                            if (formData.serviceId) setFormData({...formData, serviceId: '', price: 0, discountPercent: 0, durationMin: 60, serviceName: ''});
                        }}
                        onFocus={() => setShowServiceList(true)}
                        placeholder="Search service or combo..."
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
                        {/* Services List */}
                        {filteredServices.length > 0 && (
                            <>
                            <div className="px-3 py-1 bg-gray-50 text-xs font-bold text-gray-500 border-b border-gray-100">Services</div>
                            {filteredServices.map(s => (
                                <div 
                                    key={s.id}
                                    onClick={() => selectItem(s, 'Service')}
                                    className="cursor-pointer select-none relative p-3 hover:bg-rose-50 border-b border-gray-100 transition-colors"
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
                                </div>
                            ))}
                            </>
                        )}

                        {/* Combos List */}
                        {filteredCombos.length > 0 && (
                            <>
                            <div className="px-3 py-1 bg-gray-50 text-xs font-bold text-gray-500 border-b border-gray-100">Combos</div>
                            {filteredCombos.map(c => (
                                <div 
                                    key={c.id}
                                    onClick={() => selectItem(c, 'Combo')}
                                    className="cursor-pointer select-none relative p-3 hover:bg-rose-50 border-b border-gray-100 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-gray-900">{c.name}</div>
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full flex items-center"><Layers size={8} className="mr-1"/> Combo</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{c.description}</div>
                                        </div>
                                        <div className="text-right ml-2 flex-shrink-0">
                                            <span className="text-gray-900 font-bold bg-gray-50 px-1 rounded">₹{c.price}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </>
                        )}
                        
                        {filteredServices.length === 0 && filteredCombos.length === 0 && (
                            <div className="cursor-default select-none relative py-3 px-4 text-gray-500 italic text-center">
                                No services or combos found.
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
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                    <input name="durationMin" type="number" required value={formData.durationMin} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (List Price)</label>
                    <input name="price" type="number" required value={formData.price} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                    <input 
                        name="discountPercent" 
                        type="number" 
                        min="0"
                        max="100"
                        value={formData.discountPercent} 
                        onChange={handleChange} 
                        className="mt-1 block w-full border p-2 rounded-md border-gray-300 bg-yellow-50 focus:bg-white" 
                    />
                </div>
            </div>
            <div className="text-xs font-bold text-right space-y-1">
                 {Number(formData.discountPercent) > 0 && (
                     <div className="text-red-500">
                         Discount: -₹{estimatedDeduction} ({formData.discountPercent}%)
                     </div>
                 )}
                 <div className="text-green-600 text-sm">
                    Final Price: ₹{Math.max(0, Number(formData.price) - estimatedDeduction)}
                 </div>
            </div>
            <div className="mt-5 sm:mt-6 pb-2">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none ring-2 ring-offset-2 ring-rose-500">
                  Book Appointment
                </button>
            </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Generate Bill & Payment">
        <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-bold text-gray-800 text-sm mb-2">Summary</h4>
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{pendingBillData?.customer.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Services Count:</span>
                    <span className="font-medium">{pendingBillData?.appointments.length}</span>
                </div>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-lg text-gray-900">
                    <span>Total Payable:</span>
                    <span>₹{pendingBillData?.appointments.reduce((acc, a) => acc + a.price, 0).toFixed(2)}</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Mode</label>
                <div className="grid grid-cols-3 gap-3">
                    {['Cash', 'Card', 'UPI'].map(mode => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentMode(mode as any)}
                            className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                                paymentMode === mode 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
                <button 
                    onClick={() => confirmBillGeneration(false)}
                    className="flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <Save className="w-5 h-5 mr-2" /> Save Payment
                </button>
                <button 
                    onClick={() => confirmBillGeneration(true)}
                    className="flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <Download className="w-5 h-5 mr-2" /> PDF Invoice
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Appointments;
