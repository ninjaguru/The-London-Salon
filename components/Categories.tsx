
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Category } from '../types';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import Modal from './ui/Modal';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const loadCategories = () => {
      setCategories(db.categories.getAll());
    };
    loadCategories();
    window.addEventListener('db-updated', loadCategories);
    return () => window.removeEventListener('db-updated', loadCategories);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newList;
    if (editingCategory) {
      newList = categories.map(c => c.id === editingCategory.id ? { ...c, name, description } : c);
    } else {
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name,
        description
      };
      newList = [...categories, newCategory];
    }
    setCategories(newList);
    db.categories.save(newList);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this category?')) {
      const newList = categories.filter(c => c.id !== id);
      setCategories(newList);
      db.categories.save(newList);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setEditingCategory(null);
      setName('');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Category Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(categories, 'categories')}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                if (window.confirm('CRITICAL: Delete ALL categories? This cannot be undone.')) {
                  setCategories([]);
                  db.categories.save([]);
                }
              }}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-all border border-red-100 font-black text-sm"
            >
              <Trash2 size={18} /> Delete All
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200 font-black text-sm"
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{category.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {category.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openModal(category)} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 size={18} /></button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                  )}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No categories found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          <div className="mt-5 sm:mt-6">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
