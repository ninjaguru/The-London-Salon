
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { CouponTemplate } from '../types';
import { Plus, Edit2, Trash2, Download, TicketPercent } from 'lucide-react';
import Modal from './ui/Modal';

const Coupons: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponTemplate | null>(null);

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discountType: 'Percentage' as 'Percentage' | 'Fixed',
    value: 0,
    validityDays: 30,
    description: ''
  });

  useEffect(() => {
    setCoupons(db.couponTemplates.getAll());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newList;
    const couponData = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        value: Number(formData.value),
        validityDays: Number(formData.validityDays),
        description: formData.description
    };

    if (editingCoupon) {
      newList = coupons.map(c => c.id === editingCoupon.id ? { ...c, ...couponData } : c);
    } else {
      const newCoupon: CouponTemplate = {
        id: crypto.randomUUID(),
        ...couponData
      };
      newList = [...coupons, newCoupon];
    }
    
    setCoupons(newList);
    db.couponTemplates.save(newList);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to delete this coupon template?')) {
      const newList = coupons.filter(c => c.id !== id);
      setCoupons(newList);
      db.couponTemplates.save(newList);
    }
  };

  const openModal = (coupon?: CouponTemplate) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        name: coupon.name,
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        validityDays: coupon.validityDays,
        description: coupon.description
      });
    } else {
      setEditingCoupon(null);
      setFormData({ 
        name: '', 
        code: '', 
        discountType: 'Percentage', 
        value: 0, 
        validityDays: 30, 
        description: '' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Coupon Management</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(coupons, 'coupons')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            {isAdmin && (
                <button 
                    onClick={() => openModal()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Add Coupon
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600 mr-3">
                            <TicketPercent size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{coupon.name}</h3>
                            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded font-mono mt-1">
                                {coupon.code}
                            </div>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex space-x-2">
                            <button onClick={() => openModal(coupon)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(coupon.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    )}
                </div>
                
                <div className="mb-4">
                    <div className="text-3xl font-extrabold text-rose-600">
                        {coupon.discountType === 'Percentage' ? `${coupon.value}%` : `₹${coupon.value}`}
                        <span className="text-sm font-medium text-gray-500 ml-1">OFF</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-600">
                    <span>Valid for: <strong>{coupon.validityDays} Days</strong></span>
                </div>
            </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCoupon ? "Edit Coupon" : "Add Coupon"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Coupon Name</label>
            <input 
              name="name" type="text" required value={formData.name} onChange={handleChange}
              placeholder="e.g. Waffle Discount"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input 
                  name="code" type="text" required value={formData.code} onChange={handleChange}
                  placeholder="WAFFLE50" style={{ textTransform: 'uppercase' }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2 font-mono"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Validity (Days)</label>
                <input 
                  name="validityDays" type="number" required value={formData.validityDays} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select 
                    name="discountType" value={formData.discountType} onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Value</label>
                <input 
                  name="value" type="number" required value={formData.value} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                />
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              name="description" value={formData.description} onChange={handleChange} rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          <div className="mt-5 sm:mt-6">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none"
            >
              Save Coupon
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Coupons;
