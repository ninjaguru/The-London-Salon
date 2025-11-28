
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Service, Category, GenderTarget } from '../types';
import { Plus, Edit2, Trash2, Download, Tag, Clock, Search, X } from 'lucide-react';
import Modal from './ui/Modal';

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Filter State
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTarget, setFilterTarget] = useState('');

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // Form State
  const [formData, setFormData] = useState({
    name: '', 
    categoryId: '', 
    price: 0, 
    offerPrice: '', 
    gender: 'Unisex' as GenderTarget,
    durationMin: 60,
    description: ''
  });

  useEffect(() => {
    setServices(db.services.getAll());
    setCategories(db.categories.getAll());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newList;
    
    const serviceData = {
        name: formData.name,
        categoryId: formData.categoryId,
        price: Number(formData.price),
        offerPrice: formData.offerPrice ? Number(formData.offerPrice) : undefined,
        gender: formData.gender,
        durationMin: Number(formData.durationMin),
        description: formData.description
    };

    if (editingService) {
      newList = services.map(s => s.id === editingService.id ? { ...s, ...serviceData } : s);
    } else {
      const newService: Service = {
        id: crypto.randomUUID(),
        ...serviceData
      };
      newList = [...services, newService];
    }
    
    setServices(newList);
    db.services.save(newList);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to delete this service?')) {
      const newList = services.filter(s => s.id !== id);
      setServices(newList);
      db.services.save(newList);
    }
  };

  const openModal = (service?: Service) => {
    setCategories(db.categories.getAll()); // Refresh categories

    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        categoryId: service.categoryId,
        price: service.price,
        offerPrice: service.offerPrice ? String(service.offerPrice) : '',
        gender: service.gender,
        durationMin: service.durationMin,
        description: service.description || ''
      });
    } else {
      setEditingService(null);
      setFormData({ 
        name: '', 
        categoryId: '', 
        price: 0, 
        offerPrice: '', 
        gender: 'Unisex', 
        durationMin: 60, 
        description: '' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  const clearFilters = () => {
    setFilterName('');
    setFilterCategory('');
    setFilterTarget('');
  };

  const filteredServices = services.filter(service => {
    const matchesName = service.name.toLowerCase().includes(filterName.toLowerCase());
    const matchesCategory = filterCategory ? service.categoryId === filterCategory : true;
    const matchesTarget = filterTarget ? service.gender === filterTarget : true;
    return matchesName && matchesCategory && matchesTarget;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Services Menu</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(filteredServices, 'services')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            {isAdmin && (
                <button 
                    onClick={() => openModal()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Add Service
                </button>
            )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end flex-wrap">
          <div className="w-full md:w-auto flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search Service</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                      type="text" 
                      value={filterName} 
                      onChange={e => setFilterName(e.target.value)}
                      placeholder="e.g. Haircut"
                      className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-1.5 text-sm"
                  />
              </div>
          </div>
          <div className="w-full md:w-auto min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select 
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
          </div>
          <div className="w-full md:w-auto min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Target</label>
              <select 
                  value={filterTarget}
                  onChange={e => setFilterTarget(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                  <option value="">All Targets</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Unisex">Unisex</option>
              </select>
          </div>
          <button 
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-rose-600 flex items-center pb-2 ml-auto md:ml-0"
          >
              <X size={14} className="mr-1" /> Clear
          </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredServices.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                    <div>
                        <span className="font-bold text-gray-900 block">{service.name}</span>
                        <span className="text-sm text-gray-500">{service.description}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                       <Tag size={12} className="mr-1"/> {getCategoryName(service.categoryId)}
                   </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                   <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium 
                        ${service.gender === 'Women' ? 'bg-pink-100 text-pink-800' : 
                          service.gender === 'Men' ? 'bg-blue-100 text-blue-800' : 
                          'bg-purple-100 text-purple-800'}`}>
                       {service.gender}
                   </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" /> {service.durationMin} min
                    </div>
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                   {service.offerPrice ? (
                       <div className="flex flex-col items-end">
                           <span className="text-green-600 font-bold">₹{service.offerPrice}</span>
                           <span className="text-gray-400 text-xs line-through">₹{service.price}</span>
                       </div>
                   ) : (
                       <span className="text-gray-900 font-bold">₹{service.price}</span>
                   )}
                </td>
                {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => openModal(service)} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </td>
                )}
              </tr>
            ))}
            {filteredServices.length === 0 && (
                <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-4 text-center text-gray-500">No services match your filters.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingService ? "Edit Service" : "Add Service"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Name</label>
            <input 
              name="name" type="text" required value={formData.name} onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select 
                    name="categoryId" required value={formData.categoryId} onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                <select 
                    name="gender" required value={formData.gender} onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                >
                    <option value="Unisex">Unisex</option>
                    <option value="Women">Women</option>
                    <option value="Men">Men</option>
                </select>
             </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                <input 
                  name="durationMin" type="number" required value={formData.durationMin} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                <input 
                  name="price" type="number" required value={formData.price} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Offer (Optional)</label>
                <input 
                  name="offerPrice" type="number" value={formData.offerPrice} onChange={handleChange}
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
              Save Service
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Services;
