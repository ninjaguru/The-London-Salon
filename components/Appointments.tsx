
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
    const [displayedAppointments, setDisplayedAppointments] = useState<Appointment[]>([]);

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
    const [pendingBillData, setPendingBillData] = useState<{ customer: Customer, appointments: Appointment[] } | null>(null);
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | 'Wallet'>('Cash');

    // IST Date Helper
    const formatDateIST = (dateStr: string) => {
        if (!dateStr) return '';
        // Input is YYYY-MM-DD
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleSearch = () => {
        const results = appointments.filter(appt => {
            const matchesStaff = filterStaff ? appt.staffId === filterStaff : true;
            const matchesStartDate = filterStartDate ? appt.date >= filterStartDate : true;
            const matchesEndDate = filterEndDate ? appt.date <= filterEndDate : true;
            const matchesStatus = filterStatus ? appt.status === filterStatus : true;
            return matchesStaff && matchesStartDate && matchesEndDate && matchesStatus;
        });
        setDisplayedAppointments(results);
    };

    useEffect(() => {
        const loadData = () => {
            setAppointments(db.appointments.getAll());
            setStaff(db.staff.getAll());
            setCustomers(db.customers.getAll());
            setServices(db.services.getAll());
            setCombos(db.combos.getAll());
            setCategories(db.categories.getAll());
        };
        loadData();
        window.addEventListener('db-updated', loadData);
        return () => window.removeEventListener('db-updated', loadData);
    }, []);

    const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
        const updated = appointments.map(a => a.id === id ? { ...a, status: newStatus } : a);
        setAppointments(updated);
        // Also update displayed list if it exists
        setDisplayedAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
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
        (c.phone || '').toString().includes(customerSearch)
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

        const totalToBill = pendingBillData.appointments
            .filter(a => a.status !== AppointmentStatus.Cancelled)
            .reduce((acc, curr) => acc + curr.price, 0);

        // Wallet Logic
        if (paymentMode === 'Wallet') {
            const customer = customers.find(c => c.id === pendingBillData.customer.id);
            if (!customer || customer.walletBalance < totalToBill) {
                alert(`Insufficient wallet balance. Available: ₹${customer?.walletBalance || 0}`);
                return;
            }

            // Deduct from wallet
            const updatedCustomer = { ...customer, walletBalance: customer.walletBalance - totalToBill };
            const updatedCustomers = customers.map(c => c.id === customer.id ? updatedCustomer : c);
            setCustomers(updatedCustomers);
            db.customers.save(updatedCustomers);
        }

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
        setDisplayedAppointments(prev => prev.map(a => appointmentIdsToUpdate.has(a.id) ? { ...a, paymentMethod: paymentMode as any, status: AppointmentStatus.Completed } : a));
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
        if (customer.apartment) doc.text(String(customer.apartment), 20, yOffset + 16);
        if (customer.isMember) {
            doc.setTextColor(218, 165, 32);
            doc.text('Club Member', 20, yOffset + 21);
            doc.setTextColor(0);
        }

        yOffset += 30;

        // Service Details Header
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yOffset, pageWidth - 40, 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Date', 25, yOffset + 6);
        doc.text('Service', 55, yOffset + 6);
        doc.text('Stylist', 120, yOffset + 6);
        doc.text('Price', pageWidth - 25, yOffset + 6, { align: 'right' });

        yOffset += 15;

        // Items
        doc.setFont("helvetica", "normal");
        let totalAmount = 0;

        items.forEach((item) => {
            const staffMember = staff.find(s => s.id === item.staffId)?.name || 'N/A';
            // Fix: avoid UTC shift in PDF
            const [y, m, d] = item.date.split('-').map(Number);
            const itemDateLocal = new Date(y, m - 1, d);
            doc.text(itemDateLocal.toLocaleDateString('en-IN'), 25, yOffset);
            doc.text(String(item.serviceName), 55, yOffset);
            doc.text(staffMember, 120, yOffset);
            doc.text(`Rs. ${item.price.toFixed(2)}`, pageWidth - 25, yOffset, { align: 'right' });

            totalAmount += item.price;
            yOffset += 8;
        });

        yOffset += 5;
        doc.setDrawColor(200);
        doc.line(20, yOffset, pageWidth - 20, yOffset);
        yOffset += 10;

        // Total
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Total: Rs. ${totalAmount.toFixed(2)}`, pageWidth - 25, yOffset, { align: 'right' });

        // Payment Mode Footer
        yOffset += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Payment Mode: ${mode}`, pageWidth - 25, yOffset, { align: 'right' });

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Thank you for choosing The London Salon!', pageWidth / 2, 280, { align: 'center' });

        doc.save(`Invoice_${customer.name}_${new Date().getTime()}.pdf`);
    };

    // --- Render & Filter Logic ---

    const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Unknown';
    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

    // Group by Customer for Card View (from displayedAppointments)
    const appointmentsByCustomer: Record<string, Appointment[]> = {};
    displayedAppointments.forEach(appt => {
        if (!appointmentsByCustomer[appt.customerId]) {
            appointmentsByCustomer[appt.customerId] = [];
        }
        appointmentsByCustomer[appt.customerId].push(appt);
    });

    // Calendar Logic
    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
    const todayMonth = () => setCurrentCalendarDate(new Date());

    const renderCalendar = () => {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const numDays = daysInMonth(currentCalendarDate);
        const startingDay = firstDayOfMonth(currentCalendarDate);
        const daysArray = [];

        // Padding
        for (let i = 0; i < startingDay; i++) {
            daysArray.push(<div key={`pad-${i}`} className="h-32 bg-gray-50/50 border border-gray-100"></div>);
        }

        // Days
        for (let d = 1; d <= numDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayAppts = appointments.filter(a => a.date === dateStr);

            daysArray.push(
                <div
                    key={`day-${d}`}
                    className="h-32 border border-gray-100 p-2 overflow-y-auto hover:bg-rose-50/30 transition-colors relative group"
                    onClick={(e) => {
                        // Only open modal if clicking empty space, not an appointment
                        if (e.target === e.currentTarget) openBookModal(dateStr);
                    }}
                >
                    <span className={`text-sm font-semibold block mb-1 ${dateStr === getTodayIST() ? 'text-rose-600 bg-rose-100 w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                        {d}
                    </span>
                    <div className="space-y-1">
                        {dayAppts.map(appt => (
                            <div
                                key={appt.id}
                                title={`${appt.time} - ${appt.serviceName} (${getCustomerName(appt.customerId)})`}
                                className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer ${appt.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                    appt.status === 'Cancelled' ? 'bg-red-50 text-red-800 border-red-100' :
                                        'bg-blue-100 text-blue-800 border-blue-200'
                                    }`}
                            >
                                {appt.time} {getCustomerName(appt.customerId).split(' ')[0]}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => openBookModal(dateStr)}
                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-rose-100 text-rose-600 rounded-full p-1 hover:bg-rose-200 transition-opacity"
                        title="Add Appointment"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            );
        }

        return daysArray;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
                <div className="flex gap-2 items-center">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutList size={16} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <CalendarIcon size={16} /> Calendar
                        </button>
                    </div>

                    <button
                        onClick={() => exportToCSV(displayedAppointments, 'appointments')}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export
                    </button>
                    <button
                        onClick={() => openBookModal()}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={18} /> New Appointment
                    </button>
                </div>
            </div>

            {viewMode === 'list' && (
                <>
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Staff</label>
                            <select
                                value={filterStaff}
                                onChange={e => setFilterStaff(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[150px]"
                            >
                                <option value="">All Staff</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[150px]"
                            >
                                <option value="">All Status</option>
                                {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                            <input
                                type="date"
                                value={filterStartDate}
                                onChange={e => setFilterStartDate(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={e => setFilterEndDate(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSearch}
                                className="bg-rose-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-rose-700 flex items-center transition-colors shadow-sm"
                            >
                                <Search size={16} className="mr-2" /> Search
                            </button>
                            <button
                                onClick={clearFilters}
                                className="text-sm text-gray-500 hover:text-rose-600 flex items-center py-1.5"
                            >
                                <X size={14} className="mr-1" /> Clear
                            </button>
                        </div>
                    </div>

                    {/* List View - Grouped Cards */}
                    <div className="space-y-6">
                        {Object.keys(appointmentsByCustomer).length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-gray-200 shadow-sm">
                                No appointments found matching your filters.
                            </div>
                        ) : (
                            Object.entries(appointmentsByCustomer).map(([custId, customerAppts]) => {
                                const customer = customers.find(c => c.id === custId);
                                if (!customer) return null;

                                // Group by Date within Customer
                                const apptsByDate: Record<string, Appointment[]> = {};
                                customerAppts.forEach(a => {
                                    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
                                    apptsByDate[a.date].push(a);
                                });

                                return (
                                    <div key={custId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">{customer.name}</h3>
                                                    <p className="text-xs text-gray-500">{customer.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            {Object.entries(apptsByDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, appts]) => (
                                                <div key={date} className="border border-gray-100 rounded-md p-3">
                                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-50">
                                                        <h4 className="text-xs font-semibold text-gray-500 flex items-center">
                                                            <CalendarIcon size={12} className="mr-1" />
                                                            {formatDateIST(date)}
                                                        </h4>

                                                        {/* Bill Button for Completed Appointments */}
                                                        {appts.some(a => a.status === AppointmentStatus.Completed) && (
                                                            <button
                                                                onClick={() => initiateBillGeneration(customer, appts)}
                                                                className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded border border-green-200 flex items-center transition-colors"
                                                            >
                                                                <FileText size={12} className="mr-1" /> Bill
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {appts.map(appt => (
                                                            <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className="w-16 font-mono text-gray-500 text-xs bg-gray-50 px-1 rounded text-center">
                                                                        {appt.time}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <span className="font-medium text-gray-800 block">{appt.serviceName}</span>
                                                                        <span className="text-xs text-gray-400 flex items-center">
                                                                            <Scissors size={10} className="mr-1" />
                                                                            {getStaffName(appt.staffId)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-semibold text-gray-700 w-16 text-right">₹{appt.price}</span>

                                                                    <select
                                                                        value={appt.status}
                                                                        onChange={(e) => handleStatusChange(appt.id, e.target.value as AppointmentStatus)}
                                                                        className={`text-xs font-medium rounded-full px-2 py-1 border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 ${appt.status === AppointmentStatus.Scheduled ? 'bg-blue-100 text-blue-800 focus:ring-blue-500' :
                                                                            appt.status === AppointmentStatus.Completed ? 'bg-green-100 text-green-800 focus:ring-green-500' :
                                                                                'bg-red-100 text-red-800 focus:ring-red-500'
                                                                            }`}
                                                                    >
                                                                        {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {viewMode === 'calendar' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">
                            {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex items-center space-x-2">
                            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft /></button>
                            <button onClick={todayMonth} className="text-sm font-medium px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">Today</button>
                            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight /></button>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-px mb-2 text-center">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-sm font-semibold text-gray-500">{day}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
                        {renderCalendar()}
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Appointment">
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
                    {/* Customer Selection - Type Ahead */}
                    <div className="relative z-20">
                        <label className="block text-sm font-medium text-gray-700">Customer</label>
                        <div className="relative mt-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
                                onFocus={() => setShowCustomerList(true)}
                                placeholder="Search by name or phone..."
                                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                            />
                            {customerSearch && (
                                <button
                                    type="button"
                                    onClick={clearCustomerSelection}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {showCustomerList && customerSearch && (
                            <ul className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {filteredCustomers.length === 0 ? (
                                    <li className="text-gray-500 cursor-default select-none relative py-2 pl-3 pr-9">No customers found.</li>
                                ) : (
                                    filteredCustomers.map(customer => (
                                        <li
                                            key={customer.id}
                                            onClick={() => selectCustomer(customer)}
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-rose-50"
                                        >
                                            <div className="flex justify-between">
                                                <span className="font-medium block truncate">{customer.name}</span>
                                                <span className="text-gray-500">{customer.phone}</span>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}

                        {/* Selected Customer Display */}
                        {formData.customerId && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center text-sm text-blue-700">
                                <User size={16} className="mr-2" />
                                <span className="font-medium">{getCustomerName(formData.customerId)}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                name="date" type="date" required value={formData.date} onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Time</label>
                            <input
                                name="time" type="time" required value={formData.time} onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                            />
                        </div>
                    </div>

                    {/* Service Selection - Type Ahead */}
                    <div className="relative z-10">
                        <label className="block text-sm font-medium text-gray-700">Service / Combo</label>
                        <div className="relative mt-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={serviceSearch}
                                onChange={e => { setServiceSearch(e.target.value); setShowServiceList(true); }}
                                onFocus={() => setShowServiceList(true)}
                                placeholder="Search services..."
                                readOnly={!!formData.serviceId} // Lock input if service selected
                                className={`block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 sm:text-sm ${formData.serviceId ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                            />
                            {serviceSearch && (
                                <button
                                    type="button"
                                    onClick={clearServiceSelection}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {showServiceList && serviceSearch && !formData.serviceId && (
                            <ul className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm divide-y divide-gray-100">
                                {(filteredServices.length === 0 && filteredCombos.length === 0) ? (
                                    <li className="text-gray-500 cursor-default select-none relative py-2 pl-3 pr-9">No services found.</li>
                                ) : (
                                    <>
                                        {/* Combos Section */}
                                        {filteredCombos.map(combo => (
                                            <li
                                                key={`combo-${combo.id}`}
                                                onClick={() => selectItem(combo, 'Combo')}
                                                className="cursor-pointer select-none relative py-2 px-3 hover:bg-rose-50 group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center">
                                                            <Layers size={14} className="text-purple-500 mr-1.5" />
                                                            <span className="font-bold text-gray-800">{combo.name}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 block mt-0.5 ml-5 truncate max-w-[200px]">{combo.description}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-bold text-gray-900">₹{combo.price}</span>
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Combo</span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}

                                        {/* Services Section */}
                                        {filteredServices.map(service => (
                                            <li
                                                key={service.id}
                                                onClick={() => selectItem(service, 'Service')}
                                                className="cursor-pointer select-none relative py-2 px-3 hover:bg-rose-50"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-medium text-gray-900">{service.name}</span>
                                                        <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-2">
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">{getCategoryName(service.categoryId)}</span>
                                                            <span className="flex items-center"><Clock size={10} className="mr-1" /> {service.durationMin}m</span>
                                                            <span className="flex items-center"><User size={10} className="mr-1" /> {service.gender}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {service.offerPrice ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-bold text-green-600">₹{service.offerPrice}</span>
                                                                <span className="text-xs text-gray-400 line-through">₹{service.price}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="font-bold text-gray-900">₹{service.price}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </>
                                )}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Staff</label>
                        <select
                            name="staffId" required value={formData.staffId} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                        >
                            <option value="">Select Staff</option>
                            {staff.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Final Price (₹)</label>
                            <input
                                name="price" type="number" required value={formData.price} onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2 bg-gray-50"
                                readOnly // Mostly auto-calculated but editable via discount logic
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                            <input
                                name="discountPercent" type="number" value={formData.discountPercent} onChange={handleChange}
                                min="0" max="100"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                        <input
                            name="durationMin" type="number" value={formData.durationMin} onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div className="mt-5 sm:mt-6">
                        <button
                            type="submit"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none"
                        >
                            Book Appointment
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Payment & Bill Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Generate Bill & Payment">
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-2">Summary</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Customer:</span>
                                <span className="font-medium">{pendingBillData?.customer.name}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                                <span className="text-gray-500">Services:</span>
                                <span className="font-medium">{pendingBillData?.appointments.length} items</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                                <span className="font-bold text-gray-800">Total Amount:</span>
                                <span className="font-bold text-rose-600 text-lg">
                                    ₹{pendingBillData?.appointments.filter(a => a.status !== 'Cancelled').reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            {pendingBillData?.customer.walletBalance! > 0 && (
                                <span className="text-xs font-bold text-green-600">
                                    Wallet Balance: ₹{pendingBillData?.customer.walletBalance}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {['Cash', 'Card', 'UPI', 'Wallet'].map(mode => {
                                const isWallet = mode === 'Wallet';
                                const hasBalance = (pendingBillData?.customer.walletBalance || 0) > 0;

                                if (isWallet && !hasBalance) return null;

                                return (
                                    <button
                                        key={mode}
                                        onClick={() => setPaymentMode(mode as any)}
                                        className={`py-2 px-4 rounded-md border text-sm font-medium transition-colors ${paymentMode === mode
                                            ? 'bg-rose-50 border-rose-500 text-rose-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => confirmBillGeneration(false)}
                            className="flex-1 py-2 px-4 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 flex justify-center items-center"
                        >
                            <Save size={18} className="mr-2" /> Save Payment
                        </button>
                        <button
                            onClick={() => confirmBillGeneration(true)}
                            className="flex-1 py-2 px-4 bg-rose-600 rounded-md text-white font-medium hover:bg-rose-700 flex justify-center items-center"
                        >
                            <FileText size={18} className="mr-2" /> Save & Invoice
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Appointments;
