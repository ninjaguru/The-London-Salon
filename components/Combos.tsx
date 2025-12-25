
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Combo, GenderTarget } from '../types';
import { Plus, Edit2, Trash2, Download, Layers } from 'lucide-react';
import Modal from './ui/Modal';

const Combos: React.FC = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // Form
  const [formData, setFormData] = useState({
      name: '',
      price: 0,
      description: '',
      active: true,
      gender: 'Unisex' as GenderTarget
  });

  useEffect(() => {
    setCombos(db.combos.getAll());
  }, []);

  const openModal = (combo?: Combo) => {
      if (combo) {
          setEditingCombo(combo);
          setFormData({
              name: combo.name,
              price: combo.price,
              description: combo.description,
              active: combo.active,
              gender: combo.gender || 'Unisex'
          });
      } else {
          setEditingCombo(null);
          setFormData({ name: '', price: 0, description: '', active: true, gender: 'Unisex' });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      let updatedCombos;
      const comboData = {
          name: formData.name,
          price: Number(formData.price),
          description: formData.description,
          active: formData.active,
          gender: formData.gender
      };

      if (editingCombo) {
          updatedCombos = combos.map(c => c.id === editingCombo.id ? { ...c, ...comboData } : c);
      } else {
          const newCombo: Combo = {
              id: crypto.randomUUID(),
              ...comboData
          };
          updatedCombos = [...combos, newCombo];
      }
      setCombos(updatedCombos);
      db.combos.save(updatedCombos);
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (!isAdmin) return;
      if (confirm('Delete this combo?')) {
          const updated = combos.filter(c => c.id !== id);
          setCombos(updated);
          db.combos.save(updated);
      }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Service Combos</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(combos, 'combos')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            {isAdmin && (
                <button 
                    onClick={() => openModal()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Add Combo
                </button>
            )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {combos.map((combo) => (
            <div key={combo.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mr-3">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{combo.name}</h3>
                            <div className="flex gap-1 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${combo.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {combo.active ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium 
                                    ${combo.gender === 'Women' ? 'bg-pink-100 text-pink-800' : 
                                      combo.gender === 'Men' ? 'bg-blue-100 text-blue-800' : 
                                      'bg-purple-100 text-purple-800'}`}>
                                    {combo.gender || 'Unisex'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex space-x-2">
                            <button onClick={() => openModal(combo)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(combo.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    )}
                </div>
                
                <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">₹{combo.price.toLocaleString()}</p>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p className="font-semibold text-gray-500 text-xs uppercase mb-2">Includes:</p>
                    <ul className="space-y-1">
                        {combo.description.split(/,|\n/).map((item, i) => {
                            const trimmed = item.trim();
                            if (!trimmed) return null;
                            return (
                                <li key={i} className="flex items-start">
                                    <span className="text-rose-400 mr-2 font-bold">•</span>
                                    <span>{trimmed}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCombo ? "Edit Combo" : "Add Service Combo"}>
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Combo Name</label>
                <input 
                    type="text" required value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Bridal Package"
                    className="mt-1 block w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500" 
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input 
                        type="number" required value={formData.price} 
                        onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                        className="mt-1 block w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Target Gender</label>
                    <select 
                        value={formData.gender} 
                        onChange={e => setFormData({...formData, gender: e.target.value as GenderTarget})}
                        className="mt-1 block w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 bg-white"
                    >
                        <option value="Unisex">Unisex</option>
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Included Services / Description (One per line or comma separated)</label>
                <textarea 
                    required value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    rows={4}
                    placeholder="Service 1&#10;Service 2&#10;Service 3"
                    className="mt-1 block w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500" 
                />
            </div>
            <div className="flex items-center">
                <input 
                    id="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData({...formData, active: e.target.checked})}
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                    Active
                </label>
            </div>
            <div className="mt-5 sm:mt-6">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700">
                  Save Combo
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Combos;
