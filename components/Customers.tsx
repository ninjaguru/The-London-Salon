
import React, { useState, useEffect } from 'react';
import { db, exportToCSV, getTodayIST } from '../services/db';
import { authService } from '../services/auth';
import { Customer, Membership, Sale, CouponTemplate, CustomerCoupon } from '../types';
import { Plus, Search, Mail, Phone, User, Download, Home, Cake, Heart, Wallet, CreditCard, Gift, Clock, AlertCircle, Crown, History, TicketPercent, CheckCircle } from 'lucide-react';
import Modal from './ui/Modal';

const Customers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [coupons, setCoupons] = useState<CouponTemplate[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Array<{date: string, type: string, details: string, amount: number}>>([]);

  // Coupon Assignment State
  const [selectedCouponTemplateId, setSelectedCouponTemplateId] = useState('');

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin';

  // Form
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', apartment: ''
  });
  
  // Date State for custom Month/Day selectors
  const [bDay, setBDay] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [aDay, setADay] = useState('');
  const [aMonth, setAMonth] = useState('');

  // Wallet Topup
  const [selectedMembershipId, setSelectedMembershipId] = useState('');

  useEffect(() => {
    setCustomers(db.customers.getAll());
    setMemberships(db.memberships.getAll());
    setCoupons(db.couponTemplates.getAll());
  }, []);

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        apartment: customer.apartment,
      });
      
      // Parse Birthday
      if (customer.birthday) {
          const d = new Date(customer.birthday);
          setBDay(d.getDate().toString());
          setBMonth((d.getMonth() + 1).toString());
      } else {
          setBDay('');
          setBMonth('');
      }

      // Parse Anniversary
      if (customer.anniversary) {
          const d = new Date(customer.anniversary);
          setADay(d.getDate().toString());
          setAMonth((d.getMonth() + 1).toString());
      } else {
          setADay('');
          setAMonth('');
      }

    } else {
      setEditingCustomer(null);
      setFormData({ name: '', email: '', phone: '', apartment: '' });
      setBDay('');
      setBMonth('');
      setADay('');
      setAMonth('');
    }
    setIsModalOpen(true);
  };

  const openWalletModal = (customer: Customer) => {
      setEditingCustomer(customer);
      setSelectedMembershipId('');
      setIsWalletModalOpen(true);
  };

  const openCouponModal = (customer: Customer) => {
      setEditingCustomer(customer);
      setSelectedCouponTemplateId('');
      setIsCouponModalOpen(true);
  };

  const openHistoryModal = (customer: Customer) => {
      setHistoryCustomer(customer);
      
      const appointments = db.appointments.getAll().filter(a => a.customerId === customer.id && a.status === 'Completed');
      const sales = db.sales.getAll().filter(s => s.customerId === customer.id);

      const history = [
          ...appointments.map(a => ({
              date: a.date,
              type: 'Service',
              details: a.serviceName,
              amount: a.price
          })),
          ...sales.map(s => ({
              date: s.date,
              type: 'Purchase',
              details: s.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
              amount: s.total
          }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setCustomerHistory(history);
      setIsHistoryModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct Date Strings (Using Year 2000 as dummy leap year to support all dates)
    const birthday = (bMonth && bDay) ? `2000-${bMonth.padStart(2, '0')}-${bDay.padStart(2, '0')}` : '';
    const anniversary = (aMonth && aDay) ? `2000-${aMonth.padStart(2, '0')}-${aDay.padStart(2, '0')}` : '';

    let updated;
    const finalData = { ...formData, birthday, anniversary };

    if (editingCustomer) {
        updated = customers.map(c => c.id === editingCustomer.id ? { 
            ...c, ...finalData 
        } : c);
    } else {
        const newCustomer: Customer = {
          id: crypto.randomUUID(),
          ...finalData,
          walletBalance: 0,
          joinDate: getTodayIST(),
          activeCoupons: []
        };
        updated = [...customers, newCustomer];
    }
    setCustomers(updated);
    db.customers.save(updated);
    setIsModalOpen(false);
  };

  const handleTopUp = () => {
      if (!isAdmin) {
          alert("Only Admins can add wallet balance.");
          return;
      }
      if (!editingCustomer || !selectedMembershipId) return;
      const membership = memberships.find(m => m.id === selectedMembershipId);
      if (!membership) return;

      // 1. Calculate New Expiry
      const now = new Date();
      // Add validity months to current date
      now.setMonth(now.getMonth() + (membership.validityMonths || 12));
      const newRenewalDate = now.toISOString();

      // 2. Update Customer Wallet & Renewal
      const newBalance = editingCustomer.walletBalance + membership.creditValue;
      const updatedCustomers = customers.map(c => c.id === editingCustomer.id ? { 
          ...c, 
          walletBalance: newBalance, 
          membershipId: membership.id,
          membershipRenewalDate: newRenewalDate
      } : c);
      
      setCustomers(updatedCustomers);
      db.customers.save(updatedCustomers);

      // 3. Record Sale
      const newSale: Sale = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          customerId: editingCustomer.id,
          items: [{ name: `Membership: ${membership.name}`, price: membership.cost, quantity: 1, type: 'Membership' }],
          total: membership.cost,
          paymentMethod: 'Card' // Assumption for topup
      };
      db.sales.add(newSale);

      setIsWalletModalOpen(false);
  };

  const handleAssignCoupon = () => {
      if (!editingCustomer || !selectedCouponTemplateId) return;
      const template = coupons.find(c => c.id === selectedCouponTemplateId);
      if (!template) return;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + template.validityDays);

      const newCoupon: CustomerCoupon = {
          id: crypto.randomUUID(),
          templateId: template.id,
          name: template.name,
          code: template.code,
          description: template.description,
          assignedDate: new Date().toISOString(),
          expiryDate: expiryDate.toISOString(),
          isRedeemed: false
      };

      const currentCoupons = editingCustomer.activeCoupons || [];
      const updatedCustomers = customers.map(c => c.id === editingCustomer.id ? {
          ...c,
          activeCoupons: [...currentCoupons, newCoupon]
      } : c);

      setCustomers(updatedCustomers);
      db.customers.save(updatedCustomers);
      setIsCouponModalOpen(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  // Logic for Upcoming Birthdays & Anniversaries (Next 30 Days for the tab view)
  const getUpcomingEvents = (daysToCheck: number) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysToCheck);

    return customers.filter(c => {
        let hasEvent = false;
        
        const checkDate = (dateStr: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            // Construct current year date
            const currentYearDate = new Date(today.getFullYear(), d.getMonth(), d.getDate());
            // Check next year as well to handle Dec -> Jan transition
            const nextYearDate = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
            
            return (currentYearDate >= today && currentYearDate <= endDate) || 
                   (nextYearDate >= today && nextYearDate <= endDate);
        };

        if (checkDate(c.birthday)) hasEvent = true;
        if (checkDate(c.anniversary)) hasEvent = true;
        
        return hasEvent;
    }).map(c => {
        const events: { type: 'Birthday' | 'Anniversary', date: Date }[] = [];
        const checkDate = (dateStr: string, type: 'Birthday' | 'Anniversary') => {
             if (!dateStr) return;
             const d = new Date(dateStr);
             const currentYearDate = new Date(today.getFullYear(), d.getMonth(), d.getDate());
             const nextYearDate = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
             
             if (currentYearDate >= today && currentYearDate <= endDate) {
                 events.push({ type, date: currentYearDate });
             } else if (nextYearDate >= today && nextYearDate <= endDate) {
                 events.push({ type, date: nextYearDate });
             }
        };
        checkDate(c.birthday, 'Birthday');
        checkDate(c.anniversary, 'Anniversary');
        events.sort((a,b) => a.date.getTime() - b.date.getTime());
        return { customer: c, events };
    }).sort((a,b) => {
        const dateA = a.events[0]?.date.getTime() || 0;
        const dateB = b.events[0]?.date.getTime() || 0;
        return dateA - dateB;
    });
  };

  const upcomingEvents = getUpcomingEvents(30);

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
    { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Clientele</h2>
        <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                    placeholder="Search name or phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => exportToCSV(customers, 'customers')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4" />
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
            >
                <Plus size={18} /> Add Client
            </button>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`${
                activeTab === 'all'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Clients
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`${
                activeTab === 'upcoming'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Gift size={16} className="mr-2"/> Upcoming Events
              <span className="ml-2 bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs">
                  {upcomingEvents.length}
              </span>
            </button>
        </nav>
      </div>

      {activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map(customer => {
                const membership = memberships.find(m => m.id === customer.membershipId);
                // Check expiry
                const expiryDate = customer.membershipRenewalDate ? new Date(customer.membershipRenewalDate) : null;
                const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
                const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
                const isExpired = daysToExpiry !== null && daysToExpiry <= 0;
                
                // Active Coupons Count
                const activeCoupons = customer.activeCoupons?.filter(c => !c.isRedeemed && new Date(c.expiryDate) > new Date()) || [];

                return (
                <div key={customer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col cursor-pointer hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                <User size={24} />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); openModal(customer); }} 
                                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-4 border border-gray-200 flex justify-between items-center relative overflow-hidden">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Wallet Balance</p>
                            <p className="text-xl font-bold text-gray-900">₹{customer.walletBalance.toLocaleString()}</p>
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); openWalletModal(customer); }}
                                className="bg-white border border-gray-300 p-2 rounded-full hover:bg-gray-50 text-green-600 z-10"
                                title="Top Up Wallet"
                            >
                                <Wallet size={18} />
                            </button>
                        )}
                        {membership && (
                            <div className="absolute right-14 top-2 opacity-10">
                                <Crown size={40} />
                            </div>
                        )}
                    </div>
                    
                    {membership && expiryDate && (
                        <div className={`mb-4 text-xs rounded-md p-2 flex items-center ${isExpired ? 'bg-red-50 text-red-700' : isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            {isExpired ? <AlertCircle size={14} className="mr-2"/> : <Clock size={14} className="mr-2"/>}
                            <span>
                                {isExpired ? 'Expired on ' : 'Expires: '}
                                {expiryDate.toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {/* Active Coupons Section */}
                    {activeCoupons.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Active Coupons</p>
                            <div className="flex flex-wrap gap-2">
                                {activeCoupons.map((c) => (
                                    <div key={c.id} className="flex items-center bg-purple-50 border border-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                                        <TicketPercent size={12} className="mr-1" />
                                        <span className="font-mono font-bold mr-1">{c.code}</span>
                                        <span className="text-[10px] text-purple-400">(Exp: {new Date(c.expiryDate).toLocaleDateString()})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-2 mt-auto">
                        <div className="flex items-center text-gray-600 text-sm">
                            <Mail size={16} className="mr-2 text-gray-400" /> {customer.email || <span className="text-gray-400 italic">No email</span>}
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                            <Phone size={16} className="mr-2 text-gray-400" /> {customer.phone}
                        </div>
                        {customer.apartment && (
                            <div className="flex items-center text-gray-600 text-sm">
                                <Home size={16} className="mr-2 text-gray-400" /> {customer.apartment}
                            </div>
                        )}
                        <div className="flex gap-4 pt-2 border-t border-gray-100">
                            {customer.birthday && (
                                <div className="flex items-center text-gray-600 text-sm" title="Birthday">
                                    <Cake size={16} className="mr-2 text-rose-400" /> 
                                    {new Date(customer.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                            {customer.anniversary && (
                                <div className="flex items-center text-gray-600 text-sm" title="Anniversary">
                                    <Heart size={16} className="mr-2 text-rose-400" /> 
                                    {new Date(customer.anniversary).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); openHistoryModal(customer); }}
                            className="flex-1 flex items-center justify-center py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
                        >
                            <History size={16} className="mr-2" /> History
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); openCouponModal(customer); }}
                            className="flex-1 flex items-center justify-center py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-md transition-colors border border-purple-200 font-medium"
                        >
                            <TicketPercent size={16} className="mr-2" /> Coupon
                        </button>
                    </div>
                </div>
            )})}
        </div>
      )}

      {activeTab === 'upcoming' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Birthdays & Anniversaries (Next 30 Days)</h3>
                  <span className="text-xs text-gray-500">Sorted by upcoming date</span>
              </div>
              <ul className="divide-y divide-gray-100">
                  {upcomingEvents.map(({customer, events}, idx) => (
                      <li key={idx} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                          <div className="flex items-center">
                               <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-4">
                                    <User size={20} />
                               </div>
                               <div>
                                   <p className="font-bold text-gray-900">{customer.name}</p>
                                   <div className="text-sm text-gray-500 flex gap-4">
                                       <span className="flex items-center"><Phone size={12} className="mr-1"/> {customer.phone}</span>
                                       {customer.apartment && <span className="flex items-center"><Home size={12} className="mr-1"/> {customer.apartment}</span>}
                                   </div>
                               </div>
                          </div>
                          <div className="flex gap-4">
                               {events.map((evt, eIdx) => (
                                   <div key={eIdx} className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                                       evt.type === 'Birthday' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                                   }`}>
                                       {evt.type === 'Birthday' ? <Cake size={14} className="mr-2"/> : <Heart size={14} className="mr-2"/>}
                                       <span>{evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                                   </div>
                               ))}
                          </div>
                      </li>
                  ))}
                  {upcomingEvents.length === 0 && (
                      <li className="p-8 text-center text-gray-500 italic">No upcoming events in the next 30 days.</li>
                  )}
              </ul>
          </div>
      )}

      {/* Edit/Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Edit Client" : "New Client"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
             <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Apartment Name / Address</label>
                <input type="text" value={formData.apartment} onChange={e => setFormData({...formData, apartment: e.target.value})} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
            
            {/* Birthday Select */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday (Day / Month)</label>
                <div className="flex gap-2">
                    <select value={bDay} onChange={e => setBDay(e.target.value)} className="block w-1/3 border p-2 rounded-md border-gray-300">
                        <option value="">Day</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={bMonth} onChange={e => setBMonth(e.target.value)} className="block w-2/3 border p-2 rounded-md border-gray-300">
                        <option value="">Month</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Anniversary Select */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anniversary (Day / Month)</label>
                <div className="flex gap-2">
                    <select value={aDay} onChange={e => setADay(e.target.value)} className="block w-1/3 border p-2 rounded-md border-gray-300">
                        <option value="">Day</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={aMonth} onChange={e => setAMonth(e.target.value)} className="block w-2/3 border p-2 rounded-md border-gray-300">
                        <option value="">Month</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="mt-5 sm:mt-6">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700">
                  Save Client
                </button>
            </div>
        </form>
      </Modal>

      {/* Wallet Topup Modal */}
      <Modal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} title="Add Funds / Buy Membership">
        <div className="space-y-4">
            <p className="text-sm text-gray-500">
                Adding funds for <span className="font-bold text-gray-800">{editingCustomer?.name}</span>. 
                Current Balance: ₹{editingCustomer?.walletBalance}
            </p>
            
            <div className="space-y-3">
                {memberships.map(m => (
                    <div 
                        key={m.id} 
                        onClick={() => setSelectedMembershipId(m.id)}
                        className={`border rounded-lg p-3 cursor-pointer flex flex-col gap-2 ${selectedMembershipId === m.id ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <div className="flex justify-between items-center w-full">
                            <div>
                                <p className="font-bold text-gray-900">{m.name}</p>
                                <p className="text-xs text-green-600">Get ₹{m.creditValue} • Valid {m.validityMonths} months</p>
                            </div>
                            <p className="font-bold text-gray-700">Pay ₹{m.cost}</p>
                        </div>
                        {m.complimentaryServices && m.complimentaryServices.length > 0 && (
                            <div className="text-xs text-gray-500 border-t border-gray-200/50 pt-2">
                                <span className="font-semibold text-rose-500">Free: </span>
                                {m.complimentaryServices.join(', ')}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-5 sm:mt-6">
                <button 
                    onClick={handleTopUp}
                    disabled={!selectedMembershipId}
                    className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="mr-2 w-4 h-4" /> Process Payment & Add Credit
                </button>
            </div>
        </div>
      </Modal>

      {/* Coupon Modal */}
      <Modal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} title="Assign Coupon">
         <div className="space-y-4">
             <p className="text-sm text-gray-600">Select a coupon to add to <span className="font-bold">{editingCustomer?.name}</span>.</p>
             <div className="space-y-3 max-h-60 overflow-y-auto">
                 {coupons.map(coupon => (
                     <div 
                        key={coupon.id}
                        onClick={() => setSelectedCouponTemplateId(coupon.id)}
                        className={`border rounded-lg p-3 cursor-pointer flex justify-between items-center ${selectedCouponTemplateId === coupon.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}
                     >
                         <div>
                             <p className="font-bold text-gray-900">{coupon.name}</p>
                             <p className="text-xs text-gray-500 font-mono bg-gray-100 inline-block px-1 rounded">{coupon.code}</p>
                             <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                         </div>
                         <div className="text-right">
                             <span className="block font-bold text-purple-600 text-lg">
                                 {coupon.discountType === 'Percentage' ? `${coupon.value}%` : `₹${coupon.value}`}
                             </span>
                             <span className="text-[10px] text-gray-400">Valid {coupon.validityDays} days</span>
                         </div>
                     </div>
                 ))}
                 {coupons.length === 0 && (
                     <p className="text-gray-500 italic text-center text-sm">No active coupon templates available.</p>
                 )}
             </div>
             <div className="mt-5 sm:mt-6">
                <button 
                    onClick={handleAssignCoupon}
                    disabled={!selectedCouponTemplateId}
                    className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TicketPercent className="mr-2 w-4 h-4" /> Assign Coupon
                </button>
            </div>
         </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`History: ${historyCustomer?.name || ''}`}>
          <div className="max-h-[60vh] overflow-y-auto">
              {customerHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No history found for this customer.</p>
              ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {customerHistory.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {new Date(item.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.type === 'Service' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                          {item.type}
                                      </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                      {item.details}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                      ₹{item.amount}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>
          <div className="mt-4 border-t pt-4 flex justify-end">
              <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                  Close
              </button>
          </div>
      </Modal>
    </div>
  );
};

export default Customers;
