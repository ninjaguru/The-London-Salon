
import React, { useState, useEffect } from 'react';
import { db, createNotification, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Product, Category } from '../types';
import { Plus, Edit2, Trash2, AlertTriangle, Download } from 'lucide-react';
import Modal from './ui/Modal';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin';

  // Form State
  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', quantity: 0, price: 0, minThreshold: 5
  });

  useEffect(() => {
    const loadData = () => {
      setProducts(db.inventory.getAll());
      setCategories(db.categories.getAll());
    };
    loadData();
    window.addEventListener('db-updated', loadData);
    return () => window.removeEventListener('db-updated', loadData);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newList;
    const productData = {
      ...formData,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      minThreshold: Number(formData.minThreshold)
    };

    if (editingProduct) {
      newList = products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p);
    } else {
      const newProduct: Product = { id: crypto.randomUUID(), ...productData };
      newList = [...products, newProduct];
    }

    setProducts(newList);
    db.inventory.save(newList);

    if (productData.quantity <= productData.minThreshold) {
      createNotification(
        'alert',
        'Inventory Low',
        `${productData.name} stock (${productData.quantity}) is at or below threshold (${productData.minThreshold}).`,
        editingProduct?.id
      );
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (confirm('Delete this product?')) {
      const newList = products.filter(p => p.id !== id);
      setProducts(newList);
      db.inventory.save(newList);
    }
  };

  const openModal = (product?: Product) => {
    // Refresh categories in case they changed
    setCategories(db.categories.getAll());

    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name, brand: product.brand, category: product.category,
        quantity: product.quantity, price: product.price, minThreshold: product.minThreshold
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', brand: '', category: '', quantity: 0, price: 0, minThreshold: 5 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory Tracking</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(products, 'inventory')}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          <button
            onClick={() => openModal()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isLowStock = product.quantity <= product.minThreshold;
          return (
            <div key={product.id} className={`bg-white rounded-lg shadow-sm border ${isLowStock ? 'border-amber-300' : 'border-gray-200'} p-6 transition hover:shadow-md`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.brand}</p>
                  <span className="text-xs inline-block py-1 px-2 rounded bg-gray-100 text-gray-600 mt-1">{product.category}</span>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => openModal(product)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(product.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-500">Stock</p>
                  <p className={`text-2xl font-bold ${isLowStock ? 'text-amber-600' : 'text-gray-800'}`}>
                    {product.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-xl font-semibold text-gray-800">₹{product.price}</p>
                </div>
              </div>

              {isLowStock && (
                <div className="mt-4 flex items-center text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertTriangle size={16} className="mr-2" />
                  <span>Low Stock Warning (Min: {product.minThreshold})</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduct ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input name="name" type="text" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand</label>
              <input name="brand" type="text" required value={formData.brand} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300">
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Qty</label>
              <input name="quantity" type="number" required value={formData.quantity} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input name="price" type="number" required value={formData.price} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Min</label>
              <input name="minThreshold" type="number" required value={formData.minThreshold} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
            </div>
          </div>
          <div className="mt-5 sm:mt-6">
            <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700">
              Save Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
