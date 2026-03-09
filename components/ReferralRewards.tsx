
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { ReferralReward, Customer } from '../types';
import { Plus, Edit2, Trash2, Gift, Users, Trophy, ChevronRight } from 'lucide-react';
import Modal from './ui/Modal';

const ReferralRewards: React.FC = () => {
    const [rewards, setRewards] = useState<ReferralReward[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<ReferralReward | null>(null);

    const user = authService.getCurrentUser();
    const isAdmin = user?.role === 'Admin';

    // Form State
    const [formData, setFormData] = useState({
        referralThreshold: 1,
        rewardText: ''
    });

    useEffect(() => {
        const loadData = () => {
            setRewards(db.referralRewards.getAll());
            setCustomers(db.customers.getAll());
        };
        loadData();
        window.addEventListener('db-updated', loadData);
        return () => window.removeEventListener('db-updated', loadData);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;

        let newList;
        const rewardData = {
            ...formData,
            referralThreshold: Number(formData.referralThreshold)
        };

        if (editingReward) {
            newList = rewards.map(r => r.id === editingReward.id ? { ...r, ...rewardData } : r);
        } else {
            const newReward: ReferralReward = { id: crypto.randomUUID(), ...rewardData };
            newList = [...rewards, newReward];
        }

        setRewards(newList);
        db.referralRewards.save(newList);
        closeModal();
    };

    const handleDelete = (id: string) => {
        if (!isAdmin) return;
        if (confirm('Delete this reward configuration?')) {
            const newList = rewards.filter(r => r.id !== id);
            setRewards(newList);
            db.referralRewards.save(newList);
        }
    };

    const openModal = (reward?: ReferralReward) => {
        if (reward) {
            setEditingReward(reward);
            setFormData({
                referralThreshold: reward.referralThreshold,
                rewardText: reward.rewardText
            });
        } else {
            setEditingReward(null);
            setFormData({ referralThreshold: 1, rewardText: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingReward(null);
    };

    // Top Referrers
    const topReferrers = [...customers]
        .filter(c => (c.referralCount || 0) > 0)
        .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
        .slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Referral Program</h2>
                {isAdmin && (
                    <button
                        onClick={() => openModal()}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={18} /> Add Reward Tier
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rewards Configuration List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <Gift className="text-rose-500" size={20} />
                            <h3 className="font-bold text-gray-700">Reward Tiers</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {rewards.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 italic">No reward tiers configured yet.</div>
                            ) : (
                                rewards.sort((a, b) => a.referralThreshold - b.referralThreshold).map(reward => {
                                    return (
                                        <div key={reward.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 font-bold text-lg">
                                                    {reward.referralThreshold}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{reward.rewardText}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Awarded at {reward.referralThreshold} successful referrals
                                                    </p>
                                                </div>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal(reward)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(reward.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Top Referrers */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <Trophy className="text-yellow-500" size={20} />
                            <h3 className="font-bold text-gray-700">Top Referrers</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {topReferrers.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm italic">No referrals yet.</p>
                            ) : (
                                topReferrers.map((ref, idx) => (
                                    <div key={ref.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <p className="text-sm font-bold text-gray-800">{ref.name}</p>
                                        </div>
                                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                                            {ref.referralCount} Refs
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg space-y-4">
                        <h4 className="font-black italic uppercase tracking-widest text-indigo-100 text-xs">How it works</h4>
                        <div className="space-y-3">
                            <div className="flex gap-3 text-sm">
                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                                <p>Every customer gets a unique code (e.g. 4 letters of name + 4 digits of phone).</p>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                                <p>When a new client joins, enter the referral code of their friend.</p>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                                <p>When someone reaches a reward tier, they automatically get a coupon in their profile!</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Referral History Table */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <Users className="text-blue-500" size={20} />
                            <h3 className="font-bold text-gray-700">Referral History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Referrer</th>
                                        <th className="px-6 py-3">New Client (Referee)</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {customers.filter(c => c.referredById).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                                                No referral history found.
                                            </td>
                                        </tr>
                                    ) : (
                                        customers
                                            .filter(c => c.referredById)
                                            .map(referee => {
                                                const referrer = customers.find(c => c.id === referee.referredById);
                                                return { referee, referrer };
                                            })
                                            .sort((a, b) => new Date(b.referee.joinDate).getTime() - new Date(a.referee.joinDate).getTime())
                                            .map(({ referee, referrer }) => (
                                                <tr key={referee.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {new Date(referee.joinDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {referrer ? (
                                                            <div>
                                                                <p className="font-bold text-gray-800">{referrer.name}</p>
                                                                <p className="text-xs text-gray-500">{referrer.phone}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Unknown</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-bold text-gray-800">{referee.name}</p>
                                                            <p className="text-xs text-gray-500">{referee.phone}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            Successful
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingReward ? "Edit Reward Tier" : "New Reward Tier"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Reward Description (Plain Text)</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Free Haircut, 50% Off, etc."
                            value={formData.rewardText}
                            onChange={e => setFormData({ ...formData, rewardText: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Referral Threshold</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.referralThreshold}
                            onChange={e => setFormData({ ...formData, referralThreshold: Number(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Number of successful referrals needed to trigger this reward.</p>
                    </div>
                    <div className="mt-5 sm:mt-6">
                        <button
                            type="submit"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 transition-colors"
                        >
                            Save Configuration
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ReferralRewards;
