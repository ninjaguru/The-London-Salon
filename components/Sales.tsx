
import React, { useState, useEffect } from 'react';
import { db, exportToCSV, getTodayIST } from '../services/db';
import { Sale, Product, Customer, Staff } from '../types';
import { Plus, Receipt, Download, X, Search, User, Phone } from 'lucide-react';
import Modal from './ui/Modal';

const Sales: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filters State - Default: 1st of current month to Today (IST)
    const getFirstDayOfMonth = () => {
        const today = getTodayIST();
        const [year, month] = today.split('-');
        return `${year}-${month}-01`;
    };

    const [filterStartDate, setFilterStartDate] = useState(getFirstDayOfMonth());
    const [filterEndDate, setFilterEndDate] = useState(getTodayIST());
    const [filterProduct, setFilterProduct] = useState('');

    // New Sale Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [cart, setCart] = useState<Array<{ id: string, name: string, price: number, quantity: number }>>([]);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Wallet'>('Cash');
    const [soldById, setSoldById] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);

    useEffect(() => {
        const loadData = () => {
            setSales(db.sales.getAll().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setProducts(db.inventory.getAll());
            setCustomers(db.customers.getAll());
            setStaff(db.staff.getAll());
        };
        loadData();
        window.addEventListener('db-updated', loadData);
        return () => window.removeEventListener('db-updated', loadData);
    }, []);

    const addToCart = () => {
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;
        setCart([...cart, { id: product.id, name: product.name, price: product.price, quantity }]);
        setSelectedProduct('');
        setQuantity(1);
    };

    const handleCheckout = () => {
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        if (!selectedCustomerId) {
            alert("Please select a customer. Sales must be linked to a customer.");
            return;
        }

        if (!soldById) {
            alert("Please select the staff member who sold these items.");
            return;
        }

        // Wallet Logic
        if (paymentMethod === 'Wallet' && selectedCustomerId) {
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer) {
                if (customer.walletBalance < total) {
                    alert(`Insufficient wallet balance (₹${customer.walletBalance}). Please use another method or top up.`);
                    return;
                }
                // Deduct from wallet
                const updatedCustomer = { ...customer, walletBalance: customer.walletBalance - total };
                const updatedCustomers = customers.map(c => c.id === customer.id ? updatedCustomer : c);
                setCustomers(updatedCustomers);
                db.customers.save(updatedCustomers);
            }
        } else if (paymentMethod === 'Wallet' && !selectedCustomerId) {
            alert("Please select a customer to pay with Wallet.");
            return;
        }

        const newSale: Sale = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            customerId: selectedCustomerId,
            staffId: soldById,
            items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, type: 'Product' })),
            total,
            paymentMethod
        };

        const updatedSales = [newSale, ...sales];
        setSales(updatedSales);
        db.sales.save(updatedSales);

        // Update local stock
        const updatedProducts = products.map(p => {
            const cartItem = cart.find(c => c.id === p.id);
            if (cartItem) return { ...p, quantity: p.quantity - cartItem.quantity };
            return p;
        });
        db.inventory.save(updatedProducts);
        setProducts(updatedProducts);

        setCart([]);
        setIsModalOpen(false);
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    const clearFilters = () => {
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterProduct('');
    };

    // Filter Sales
    const filteredSales = sales.filter(s => {
        const saleDate = s.date.split('T')[0];
        const matchesStartDate = filterStartDate ? saleDate >= filterStartDate : true;
        const matchesEndDate = filterEndDate ? saleDate <= filterEndDate : true;
        const matchesProduct = filterProduct
            ? s.items.some(item => item.name === filterProduct)
            : true;

        return matchesStartDate && matchesEndDate && matchesProduct;
    });

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').toString().includes(customerSearch)
    );

    const selectCustomer = (customer: Customer) => {
        setSelectedCustomerId(customer.id);
        setCustomerSearch(customer.name);
        setShowCustomerList(false);
    };

    const getCustomerName = (id: string | null) => {
        if (!id) return 'Guest';
        return customers.find(c => c.id === id)?.name || 'Unknown';
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportToCSV(filteredSales, 'sales')}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={18} /> New Transaction
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
                    <label className="block text-xs font-medium text-gray-500 mb-1">Contains Product</label>
                    <select
                        value={filterProduct}
                        onChange={e => setFilterProduct(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[200px]"
                    >
                        <option value="">All Products</option>
                        {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-rose-600 flex items-center pb-2 ml-auto md:ml-0"
                >
                    <X size={14} className="mr-1" /> Clear
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-md">
                <ul className="divide-y divide-gray-200">
                    {filteredSales.map(sale => (
                        <li key={sale.id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-green-100 rounded-md p-2">
                                        <Receipt className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-indigo-600 truncate">
                                            Sale #{sale.id.slice(0, 8)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(sale.date).toLocaleString()} • {sale.paymentMethod} • Sold by: {staff.find(s => s.id === sale.staffId)?.name || 'Unknown'}
                                        </p>
                                        <p className="text-sm text-gray-600 font-medium">
                                            Customer: {getCustomerName(sale.customerId)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 ml-10">
                                    <p className="text-sm text-gray-600">
                                        {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </p>
                                </div>
                                <div>
                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        ₹{sale.total.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                    {filteredSales.length === 0 && (
                        <li className="px-6 py-10 text-center text-gray-500">
                            No sales match your filters.
                        </li>
                    )}
                </ul>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setCart([]);
                    setSelectedCustomerId('');
                    setCustomerSearch('');
                    setSoldById('');
                }}
                title="New Sale (POS)"
            >
                <div className="space-y-4">
                    {/* Customer Selection - Type Ahead */}
                    <div className="relative z-20">
                        <label className="block text-sm font-medium text-gray-700">Customer <span className="text-rose-500">*</span></label>
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
                                    onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); setShowCustomerList(false); }}
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
                        {selectedCustomerId && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex justify-between items-center text-sm text-blue-700">
                                <div className="flex items-center">
                                    <User size={16} className="mr-2" />
                                    <span className="font-medium">{customers.find(c => c.id === selectedCustomerId)?.name}</span>
                                </div>
                                {customers.find(c => c.id === selectedCustomerId)?.walletBalance! > 0 && (
                                    <span className="text-xs font-bold text-green-600">Wallet: ₹{customers.find(c => c.id === selectedCustomerId)?.walletBalance}</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sold By <span className="text-rose-500">*</span></label>
                        <select
                            value={soldById}
                            onChange={e => setSoldById(e.target.value)}
                            className="mt-1 block w-full border p-2 rounded-md border-gray-300"
                            required
                        >
                            <option value="">Select Staff...</option>
                            {staff.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Product</label>
                            <select
                                value={selectedProduct}
                                onChange={e => setSelectedProduct(e.target.value)}
                                className="mt-1 block w-full border p-2 rounded-md border-gray-300"
                            >
                                <option value="">Select Item...</option>
                                {products.filter(p => p.quantity > 0).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-20">
                            <label className="block text-sm font-medium text-gray-700">Qty</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="mt-1 block w-full border p-2 rounded-md border-gray-300"
                            />
                        </div>
                        <button
                            onClick={addToCart}
                            className="bg-gray-800 text-white px-3 py-2 rounded-md mb-[2px]"
                        >Add</button>
                    </div>

                    {/* Cart Preview */}
                    <div className="bg-gray-50 p-4 rounded-md min-h-[100px]">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Current Cart</h4>
                        {cart.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Cart is empty</p>
                        ) : (
                            <ul className="space-y-2">
                                {cart.map((item, idx) => (
                                    <li key={idx} className="flex justify-between text-sm">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {cart.length > 0 && (
                            <div className="mt-4 pt-2 border-t border-gray-200 flex justify-between font-bold">
                                <span>Total</span>
                                <span>₹{cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['Cash', 'Card', 'UPI', 'Wallet'].map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method as any)}
                                    className={`py-2 text-sm font-medium rounded-md border ${paymentMethod === method
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-6">
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Complete Sale
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Sales;
