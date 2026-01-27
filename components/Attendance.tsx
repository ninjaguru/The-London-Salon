
import React, { useState, useEffect, useMemo } from 'react';
import { db, exportToCSV } from '../services/db';
import { Attendance as AttendanceType, Staff } from '../types';
import { Clock, Download, Search, QrCode, Printer, X, CheckCircle2, Calendar, TrendingUp, User as UserIcon, LogIn, LogOut } from 'lucide-react';

const Attendance: React.FC = () => {
    const [entries, setEntries] = useState<AttendanceType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'logs' | 'summary'>('summary');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

    useEffect(() => {
        const loadEntries = () => {
            setEntries(db.attendance.getAll());
        };

        loadEntries();
        window.addEventListener('db-updated', loadEntries);
        return () => window.removeEventListener('db-updated', loadEntries);
    }, []);

    const calculateHours = (login?: string, logout?: string) => {
        if (!login || !logout) return 0;
        const start = new Date(login).getTime();
        const end = new Date(logout).getTime();
        return (end - start) / (1000 * 60 * 60);
    };

    const getStatusColor = (hours: number) => {
        if (hours === 0) return 'text-gray-400';
        if (hours < 9) return 'text-red-600 bg-red-50 border-red-100';
        if (hours < 10) return 'text-green-600 bg-green-50 border-green-100';
        return 'text-blue-600 bg-blue-50 border-blue-100';
    };

    const monthlySummary = useMemo(() => {
        const filtered = entries.filter(e => e.date.startsWith(selectedMonth));
        const staffMap = new Map<string, {
            name: string,
            totalHours: number,
            totalOvertime: number,
            daysWorked: number,
            details: any[]
        }>();

        filtered.forEach(entry => {
            const hours = calculateHours(entry.loginTime, entry.logoutTime);
            const ot = Math.max(0, hours - 9);

            if (!staffMap.has(entry.userId)) {
                staffMap.set(entry.userId, {
                    name: entry.userName,
                    totalHours: 0,
                    totalOvertime: 0,
                    daysWorked: 0,
                    details: []
                });
            }

            const stats = staffMap.get(entry.userId)!;
            stats.totalHours += hours;
            stats.totalOvertime += ot;
            stats.daysWorked += entry.logoutTime ? 1 : 0;
            stats.details.push({ ...entry, hours, ot });
        });

        return Array.from(staffMap.entries()).map(([id, stats]) => ({
            id,
            ...stats
        })).sort((a, b) => b.totalHours - a.totalHours);
    }, [entries, selectedMonth]);

    const filteredLogs = entries.filter(e =>
        (e.userName.toLowerCase().includes(searchTerm.toLowerCase()) || e.date.includes(searchTerm)) &&
        e.date.startsWith(selectedMonth)
    );

    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const months = useMemo(() => {
        const distinct = Array.from(new Set(entries.map(e => e.date.substring(0, 7))));
        if (!distinct.includes(new Date().toISOString().substring(0, 7))) {
            distinct.push(new Date().toISOString().substring(0, 7));
        }
        return distinct.sort().reverse();
    }, [entries]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Calendar className="text-rose-600" />
                        Attendance History
                    </h2>
                    <p className="text-slate-500 font-medium">Performance and overtime tracking.</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 appearance-none"
                        >
                            {months.map(m => (
                                <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>
                            ))}
                        </select>
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>
                    <button
                        onClick={() => window.open('#/attendance-terminal', '_blank')}
                        className="p-2.5 bg-rose-600 border border-rose-500 rounded-xl text-white hover:bg-rose-700 transition-all font-bold group flex items-center gap-2"
                        title="Open Staff Terminal"
                    >
                        <QrCode className="w-5 h-5" />
                        <span className="hidden md:inline">Staff Terminal</span>
                    </button>
                    <button
                        onClick={() => exportToCSV(entries, 'attendance_full_report')}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-bold group"
                        title="Export All Data"
                    >
                        <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* View Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                    onClick={() => setView('summary')}
                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${view === 'summary' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Monthly Summary
                </button>
                <button
                    onClick={() => setView('logs')}
                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${view === 'logs' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Daily Logs
                </button>
            </div>

            {view === 'summary' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {monthlySummary.map(staff => (
                        <div key={staff.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                                        {staff.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 tracking-tight leading-tight">{staff.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{staff.daysWorked} Days Worked</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Hours</p>
                                        <p className="text-2xl font-black text-slate-800">{staff.totalHours.toFixed(1)}h</p>
                                    </div>
                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                        <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">Overtime</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-2xl font-black text-rose-600">{staff.totalOvertime.toFixed(1)}h</p>
                                            <TrendingUp size={16} className="text-rose-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Daily Breakup</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {staff.details.map((day, idx) => (
                                            <div
                                                key={idx}
                                                className={`px-2 py-1 rounded-md text-[10px] font-black border ${getStatusColor(day.hours)}`}
                                                title={`${day.date}: ${day.hours.toFixed(1)}h`}
                                            >
                                                {new Date(day.date).getDate()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {monthlySummary.length === 0 && (
                        <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">No records for this month</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by name or date..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4 items-center px-4 overflow-x-auto no-scrollbar py-1">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">&lt; 9h</span>
                            </div>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">9-10h</span>
                            </div>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">&gt; 10h</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">In/Out</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Overtime</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredLogs.map((entry) => {
                                    const hours = calculateHours(entry.loginTime, entry.logoutTime);
                                    const ot = Math.max(0, hours - 9);
                                    return (
                                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-black text-slate-800">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{entry.date}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-black text-xs mr-3 border border-rose-100 group-hover:rotate-6 transition-transform">
                                                        {entry.userName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{entry.userName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                                        <LogIn size={10} /> {formatTime(entry.loginTime)}
                                                    </span>
                                                    <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                                                        <LogOut size={10} /> {formatTime(entry.logoutTime)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${getStatusColor(hours)}`}>
                                                    {hours.toFixed(1)}h
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {ot > 0 ? (
                                                    <div className="text-sm font-black text-rose-600 flex items-center gap-1">
                                                        +{ot.toFixed(1)}h
                                                        <TrendingUp size={12} />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-300">--</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <p className="font-bold">No records found for search criteria</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
