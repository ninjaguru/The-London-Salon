
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { Membership } from '../types';
import { Crown, Check, Plus, Edit2, Trash2, Download, Wallet, Calendar, Gift } from 'lucide-react';
import Modal from './ui/Modal';

const Memberships: React.FC = () => {
  const [tiers, setTiers] = useState<Membership[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Membership | null>(null);

  // Form
  const [formData, setFormData] = useState({
      name: '',
      cost: 0,
      creditValue: 0,
      description: '',
      validityMonths: 12,
      complimentaryServices: ''
  });

  useEffect(() => {
    setTiers(db.memberships.getAll());
  }, []);

  const openModal = (tier?: Membership) => {
      if (tier) {
          setEditingTier(tier);
          setFormData({
              name: tier.name,
              cost: tier.cost,
              creditValue: tier.creditValue,
              description: tier.description,
              validityMonths: tier.validityMonths || 12,
              complimentaryServices: tier.complimentaryServices ? tier.complimentaryServices.join(', ') : ''
          });
      } else {
          setEditingTier(null);
          setFormData({ name: '', cost: 0, creditValue: 0, description: '', validityMonths: 12, complimentaryServices: '' });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const services = formData.complimentaryServices.split(',').map(s => s.trim()).filter(Boolean);

      let updatedTiers;
      if (editingTier) {
          updatedTiers = tiers.map(t => t.id === editingTier.id ? { 
              ...t, 
              name: formData.name, 
              cost: Number(formData.cost), 
              creditValue: Number(formData.creditValue),
              description: formData.description,
              validityMonths: Number(formData.validityMonths),
              complimentaryServices: services
            } : t);
      } else {
          const newTier: Membership = {
              id: crypto.randomUUID(),
              name: formData.name,
              cost: Number(formData.cost),
              creditValue: Number(formData.creditValue),
              description: formData.description,
              validityMonths: Number(formData.validityMonths),
              complimentaryServices: services
          };
          updatedTiers = [...tiers, newTier];
      }
      setTiers(updatedTiers);
      db.memberships.save(updatedTiers);
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('Delete this membership tier? Clients on this tier will need manual updating.')) {
          const updated = tiers.filter(t => t.id !== id);
          setTiers(updated);
          db.memberships.save(updated);
      }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Wallet Memberships</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(tiers, 'memberships')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Plus size={18} /> Add Package
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
            const bonus = tier.creditValue - tier.cost;
            const percent = ((bonus / tier.cost) * 100).toFixed(0);

            return (
            <div key={tier.id} className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col transition hover:shadow-xl">
                <div className={`h-2 w-full bg-gradient-to-r from-rose-400 to-purple-500`}></div>
                <div className="absolute top-4 right-4 flex space-x-2">
                    <button onClick={() => openModal(tier)} className="text-gray-400 hover:text-indigo-600 bg-white rounded-full p-1 shadow-sm"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(tier.id)} className="text-gray-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm"><Trash2 size={16}/></button>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                        <Wallet className="h-6 w-6 text-purple-500" />
                    </div>
                    
                    <div className="flex flex-col mb-4">
                        <span className="text-sm text-gray-500">Pay</span>
                        <span className="text-3xl font-extrabold tracking-tight text-gray-900">₹{tier.cost.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-green-50 p-2 rounded-lg border border-green-100 mb-4">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                            Get <span className="font-bold">₹{tier.creditValue.toLocaleString()}</span> credit
                        </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 italic mb-4">{tier.description}</p>
                    
                    <div className="mb-4 space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                           <Calendar size={14} className="mr-2 text-indigo-500" />
                           Validity: <span className="font-semibold ml-1">{tier.validityMonths} Months</span>
                        </div>
                        {tier.complimentaryServices && tier.complimentaryServices.length > 0 && (
                            <div className="text-sm text-gray-600">
                                <div className="flex items-center mb-1">
                                    <Gift size={14} className="mr-2 text-rose-500" />
                                    <span className="font-semibold">Complimentary:</span>
                                </div>
                                <ul className="list-disc pl-8 space-y-1 text-xs text-gray-500">
                                    {tier.complimentaryServices.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {percent}% Extra Value
                        </span>
                    </div>
                </div>
            </div>
            )
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTier ? "Edit Package" : "Add Membership Package"}>
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Package Name</label>
                <input 
                    type="text" required value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Gold Wallet"
                    className="mt-1 block w-full border p-2 rounded-md border-gray-300" 
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cost to Client (₹)</label>
                    <input 
                        type="number" required value={formData.cost} 
                        onChange={e => setFormData({...formData, cost: Number(e.target.value)})} 
                        className="mt-1 block w-full border p-2 rounded-md border-gray-300" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Credit Value (₹)</label>
                    <input 
                        type="number" required value={formData.creditValue} 
                        onChange={e => setFormData({...formData, creditValue: Number(e.target.value)})} 
                        className="mt-1 block w-full border p-2 rounded-md border-gray-300" 
                    />
                </div>
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-700">Validity (Months)</label>
                 <input 
                    type="number" required value={formData.validityMonths} 
                    onChange={e => setFormData({...formData, validityMonths: Number(e.target.value)})} 
                    className="mt-1 block w-full border p-2 rounded-md border-gray-300" 
                 />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Complimentary Services (comma separated)</label>
                <input 
                    type="text" value={formData.complimentaryServices} 
                    onChange={e => setFormData({...formData, complimentaryServices: e.target.value})} 
                    placeholder="e.g. Free Haircut, Free Wash"
                    className="mt-1 block w-full border p-2 rounded-md border-gray-300" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea 
                    required value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    rows={2}
                    placeholder="Brief description of the package..."
                    className="mt-1 block w-full border p-2 rounded-md border-gray-300" 
                />
            </div>
            <div className="mt-5 sm:mt-6">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700">
                  Save Package
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Memberships;
