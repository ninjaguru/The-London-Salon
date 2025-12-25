
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Service, Combo, Package, Category, GenderTarget } from '../types';
import { Sparkles, Phone, MapPin, Clock, Tag, Layers, Crown, ChevronRight } from 'lucide-react';

const PublicMenu: React.FC = () => {
    const [activeGender, setActiveGender] = useState<GenderTarget | 'All'>('All');
    const [activeTab, setActiveTab] = useState<'Services' | 'Combos' | 'Packages'>('Services');
    
    const [services, setServices] = useState<Service[]>([]);
    const [combos, setCombos] = useState<Combo[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        setServices(db.services.getAll());
        setCombos(db.combos.getAll().filter(c => c.active));
        setPackages(db.packages.getAll());
        setCategories(db.categories.getAll());
        
        // Ensure we scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    const filteredServices = services.filter(s => 
        (activeGender === 'All' || s.gender === activeGender || s.gender === 'Unisex')
    );

    const filteredCombos = combos.filter(c => 
        (activeGender === 'All' || c.gender === activeGender || c.gender === 'Unisex')
    );

    // Group services by category
    const servicesByCategory = categories.map(cat => ({
        ...cat,
        items: filteredServices.filter(s => s.categoryId === cat.id)
    })).filter(cat => cat.items.length > 0);

    return (
        <div className="min-h-screen bg-white text-gray-900 pb-20">
            {/* Header Hero */}
            <div className="relative h-64 bg-gray-900 flex items-center justify-center overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200" 
                    className="absolute inset-0 w-full h-full object-cover opacity-40" 
                    alt="Salon Background" 
                />
                <div className="relative z-10 text-center px-4">
                    <img src="/logo.png" alt="The London Salon" className="h-24 w-auto mx-auto mb-4 brightness-0 invert" />
                    <p className="text-rose-200 uppercase tracking-[0.3em] text-xs font-bold">Premium Hair & Beauty</p>
                </div>
            </div>

            {/* Sticky Navigation */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
                <div className="flex justify-center p-4 gap-2">
                    {['All', 'Men', 'Women'].map(g => (
                        <button
                            key={g}
                            onClick={() => setActiveGender(g as any)}
                            className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${
                                activeGender === g 
                                ? 'bg-rose-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
                <div className="flex border-t border-gray-50">
                    {['Services', 'Combos', 'Packages'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                                activeTab === tab 
                                ? 'border-rose-600 text-rose-600' 
                                : 'border-transparent text-gray-400'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Content */}
            <div className="max-w-2xl mx-auto px-4 mt-8">
                {activeTab === 'Services' && (
                    <div className="space-y-10">
                        {servicesByCategory.map(cat => (
                            <div key={cat.id}>
                                <div className="flex items-center gap-3 mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest">{cat.name}</h3>
                                    <div className="h-px flex-1 bg-gray-100"></div>
                                </div>
                                <div className="space-y-6">
                                    {cat.items.map(service => (
                                        <div key={service.id} className="group">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-gray-800 text-lg group-hover:text-rose-600 transition-colors">
                                                    {service.name}
                                                </h4>
                                                <div className="text-right">
                                                    {service.offerPrice ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-rose-600 font-bold">₹{service.offerPrice}</span>
                                                            <span className="text-gray-400 text-xs line-through">₹{service.price}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-gray-900">₹{service.price}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                                <span className="flex items-center"><Clock size={12} className="mr-1" /> {service.durationMin}m</span>
                                                <span className="flex items-center capitalize"><Tag size={12} className="mr-1" /> {service.gender}</span>
                                            </div>
                                            {service.description && (
                                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{service.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'Combos' && (
                    <div className="space-y-6">
                        {filteredCombos.map(combo => (
                            <div key={combo.id} className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Layers size={18} className="text-rose-500" />
                                            <h3 className="text-xl font-bold text-gray-900">{combo.name}</h3>
                                        </div>
                                        <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase">{combo.gender}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">₹{combo.price.toLocaleString()}</p>
                                </div>
                                <ul className="space-y-2">
                                    {combo.description.split(/,|\n/).map((item, i) => {
                                        const trimmed = item.trim();
                                        if (!trimmed) return null;
                                        return (
                                            <li key={i} className="flex items-start text-sm text-gray-600">
                                                <ChevronRight size={14} className="text-rose-400 mt-1 mr-2 flex-shrink-0" />
                                                <span>{trimmed}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                        {filteredCombos.length === 0 && (
                            <p className="text-center py-20 text-gray-400">No combos available for {activeGender}.</p>
                        )}
                    </div>
                )}

                {activeTab === 'Packages' && (
                    <div className="space-y-6">
                        {packages.map(pkg => (
                            <div key={pkg.id} className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 overflow-hidden relative">
                                <Crown className="absolute -right-4 -top-4 text-indigo-100 w-24 h-24 rotate-12" />
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Wallet Membership</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">₹{pkg.cost.toLocaleString()}</p>
                                            <p className="text-xs text-green-600 font-bold">Get ₹{pkg.creditValue.toLocaleString()} Credit</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                                    {pkg.complimentaryServices && pkg.complimentaryServices.length > 0 && (
                                        <div className="bg-white/60 rounded-xl p-3 border border-indigo-100/50">
                                            <p className="text-xs font-bold text-indigo-700 uppercase mb-2">Bonus Services:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {pkg.complimentaryServices.map((s, i) => (
                                                    <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg font-medium">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Contact */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <a 
                        href="tel:+910000000000" 
                        className="flex-1 bg-gray-900 text-white py-3 rounded-xl flex items-center justify-center font-bold gap-2 shadow-lg active:scale-95 transition-transform"
                    >
                        <Phone size={18} /> Call Now
                    </a>
                    <a 
                        href="https://maps.google.com" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 bg-rose-600 text-white py-3 rounded-xl flex items-center justify-center font-bold gap-2 shadow-lg active:scale-95 transition-transform"
                    >
                        <MapPin size={18} /> Directions
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PublicMenu;
