
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, generateId, getTodayIST } from '../services/db';
import { Staff, Attendance } from '../types';
import { Clock, CheckCircle2, User, LogIn, LogOut, ArrowLeft, QrCode } from 'lucide-react';

const StaffAttendanceScan: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [step, setStep] = useState<'type' | 'staff' | 'qr' | 'confirm' | 'success'>('type');
    const [selectedAction, setSelectedAction] = useState<'login' | 'logout' | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Check for query params (staff member's phone after scanning)
    useEffect(() => {
        const staffIdParam = searchParams.get('staffId');
        const actionParam = searchParams.get('action');

        if (staffIdParam && actionParam) {
            const staff = db.staff.getAll().find(s => s.id === staffIdParam);
            if (staff) {
                setSelectedStaff(staff);
                setSelectedAction(actionParam as 'login' | 'logout');
                setStep('confirm');
            }
        }

        const list = db.staff.getAll().filter(s => s.active);
        setStaffList(list);
    }, [searchParams]);

    const handleActionSelect = (action: 'login' | 'logout') => {
        setSelectedAction(action);
        setStep('staff');
    };

    const handleStaffSelect = (staff: Staff) => {
        setSelectedStaff(staff);
        setStep('qr');
    };

    const handleConfirm = () => {
        if (!selectedStaff || !selectedAction) return;

        setLoading(true);
        const today = getTodayIST();
        const allAttendance = db.attendance.getAll();

        if (selectedAction === 'login') {
            const alreadyIn = allAttendance.find(a => a.userId === selectedStaff.id && a.date === today && !a.logoutTime);
            if (alreadyIn) {
                setStatus({ type: 'error', message: `Already punched in at ${new Date(alreadyIn.loginTime).toLocaleTimeString()}.` });
                setLoading(false);
                setStep('success');
                return;
            }

            const newEntry: Attendance = {
                id: generateId(),
                userId: selectedStaff.id,
                userName: selectedStaff.name,
                date: today,
                loginTime: new Date().toISOString()
            };
            db.attendance.add(newEntry);
            setStatus({ type: 'success', message: `Punch In successful! Have a great shift, ${selectedStaff.name}.` });
        } else {
            const activeSession = allAttendance.find(a => a.userId === selectedStaff.id && a.date === today && !a.logoutTime);
            if (!activeSession) {
                setStatus({ type: 'error', message: 'No active punch-in found for today.' });
                setLoading(false);
                setStep('success');
                return;
            }

            const updated = allAttendance.map(a =>
                a.id === activeSession.id ? { ...a, logoutTime: new Date().toISOString() } : a
            );
            db.attendance.save(updated);
            setStatus({ type: 'success', message: `Punch Out successful! Goodbye, ${selectedStaff.name}.` });
        }

        setLoading(false);
        setStep('success');
    };

    const reset = () => {
        setStep('type');
        setSelectedAction(null);
        setSelectedStaff(null);
        setStatus(null);
        navigate('/attendance-scan');
    };

    const generateQrUrl = () => {
        if (!selectedStaff || !selectedAction) return '';
        const baseUrl = window.location.origin + window.location.pathname + '#/attendance-scan';
        const fullUrl = `${baseUrl}?staffId=${selectedStaff.id}&action=${selectedAction}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullUrl)}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white/10 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden">

                {/* Header */}
                <div className="p-8 text-center bg-gradient-to-r from-rose-500/20 to-orange-500/20 border-b border-white/10">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center gap-4">
                        <Clock className="w-10 h-10 text-rose-400" />
                        Staff Terminal
                    </h1>
                </div>

                <div className="p-8 md:p-12">
                    {/* Step: Select Action */}
                    {step === 'type' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
                            <button
                                onClick={() => handleActionSelect('login')}
                                className="group relative bg-green-500/10 hover:bg-green-500/20 border-4 border-green-500/30 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <div className="p-6 bg-green-500 rounded-3xl shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                                    <LogIn className="w-16 h-16 text-white" />
                                </div>
                                <span className="text-4xl font-black text-green-400 tracking-tight uppercase">Login</span>
                            </button>

                            <button
                                onClick={() => handleActionSelect('logout')}
                                className="group relative bg-orange-500/10 hover:bg-orange-500/20 border-4 border-orange-500/30 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <div className="p-6 bg-orange-500 rounded-3xl shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                                    <LogOut className="w-16 h-16 text-white" />
                                </div>
                                <span className="text-4xl font-black text-orange-400 tracking-tight uppercase">Logout</span>
                            </button>
                        </div>
                    )}

                    {/* Step: Select Staff */}
                    {step === 'staff' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setStep('type')} className="p-3 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-colors">
                                    <ArrowLeft />
                                </button>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Select Your Name</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {staffList.map((staff) => (
                                    <button
                                        key={staff.id}
                                        onClick={() => handleStaffSelect(staff)}
                                        className="group p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-4 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all hover:-translate-y-1"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-2xl font-black shadow-lg group-hover:rotate-6 transition-transform">
                                            {staff.name.charAt(0)}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold tracking-tight">{staff.name}</p>
                                            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">{staff.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step: QR Code */}
                    {step === 'qr' && (
                        <div className="text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="flex items-center justify-center gap-4">
                                <button onClick={() => setStep('staff')} className="p-3 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-colors">
                                    <ArrowLeft />
                                </button>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Scan to {selectedAction}</h3>
                            </div>
                            <div className="inline-block p-8 bg-white rounded-[3rem] shadow-2xl shadow-rose-500/20 ring-8 ring-rose-500/10">
                                <img src={generateQrUrl()} alt="QR" className="w-64 h-64 md:w-80 md:h-80" />
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-w-sm mx-auto">
                                <p className="text-rose-300 font-bold mb-1">Authenticating as</p>
                                <p className="text-white text-xl font-black">{selectedStaff?.name}</p>
                            </div>
                            <p className="text-white/40 text-sm font-medium animate-pulse">Waiting for scan...</p>
                        </div>
                    )}

                    {/* Step: Confirm (Phone View) */}
                    {step === 'confirm' && (
                        <div className="text-center space-y-8 animate-in fade-in duration-500">
                            <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/50">
                                <QrCode className="text-white w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-white uppercase italic">Confirm {selectedAction}</h3>
                                <p className="text-rose-300 font-medium">Hello, {selectedStaff?.name}</p>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="w-full max-w-md py-6 bg-gradient-to-r from-rose-600 to-orange-600 text-white text-2xl font-black rounded-3xl shadow-xl shadow-rose-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : `SUBMIT ${selectedAction?.toUpperCase()}`}
                            </button>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <div className="text-center space-y-8 animate-in zoom-in duration-500">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl ${status?.type === 'success' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}>
                                {status?.type === 'success' ? <CheckCircle2 className="text-white w-12 h-12" /> : <User className="text-white w-12 h-12" />}
                            </div>
                            <div className="space-y-4">
                                <h3 className={`text-4xl font-black uppercase tracking-tighter ${status?.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {status?.type === 'success' ? 'Success!' : 'Oops!'}
                                </h3>
                                <p className="text-white/70 text-xl font-medium max-w-md mx-auto">{status?.message}</p>
                            </div>
                            <button
                                onClick={reset}
                                className="px-12 py-5 bg-white/10 hover:bg-white/20 text-white font-black rounded-3xl border border-white/20 transition-all"
                            >
                                DONE
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/20 border-t border-white/5 flex justify-between items-center text-white/30 text-xs font-bold uppercase tracking-[0.3em]">
                    <span>SalonVault Attendance v2.0</span>
                    {step !== 'type' && (
                        <button onClick={reset} className="hover:text-rose-400 transition-colors uppercase">Cancel / Back</button>
                    )}
                </div>
            </div>

            <button
                onClick={() => navigate('/')}
                className="mt-12 group flex items-center text-white/40 hover:text-white transition-all text-sm font-black tracking-widest uppercase"
            >
                <ArrowLeft className="mr-2 group-hover:-translate-x-2 transition-transform" /> Back to Dashboard
            </button>
        </div>
    );
};

export default StaffAttendanceScan;
