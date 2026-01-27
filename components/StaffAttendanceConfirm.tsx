
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, generateId, getTodayIST } from '../services/db';
import { Staff, Attendance } from '../types';
import { CheckCircle2, User, ArrowLeft, QrCode } from 'lucide-react';

const StaffAttendanceConfirm: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [selectedAction, setSelectedAction] = useState<'login' | 'logout' | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const staffIdParam = searchParams.get('staffId');
        const actionParam = searchParams.get('action');

        if (staffIdParam && actionParam) {
            const staff = db.staff.getAll().find(s => s.id === staffIdParam);
            if (staff) {
                setSelectedStaff(staff);
                setSelectedAction(actionParam as 'login' | 'logout');
            }
        }
    }, [searchParams]);

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
                setSuccess(true);
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
                setSuccess(true);
                return;
            }

            const updated = allAttendance.map(a =>
                a.id === activeSession.id ? { ...a, logoutTime: new Date().toISOString() } : a
            );
            db.attendance.save(updated);
            setStatus({ type: 'success', message: `Punch Out successful! Goodbye, ${selectedStaff.name}.` });
        }

        setLoading(false);
        setSuccess(true);
    };

    if (!selectedStaff || !selectedAction) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 max-w-sm">
                    <QrCode className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-white text-xl font-black uppercase mb-2">Invalid Session</h2>
                    <p className="text-white/60 mb-6">Please scan the QR code from the salon terminal again.</p>
                    <button onClick={() => navigate('/')} className="w-full py-3 bg-rose-600 text-white font-black rounded-xl">Go Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 md:p-12">
                    {!success ? (
                        <div className="text-center space-y-8 animate-in fade-in duration-500">
                            <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/50">
                                <QrCode className="text-white w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-white uppercase italic">Confirm {selectedAction}</h3>
                                <p className="text-rose-300 font-medium text-xl">Hello, {selectedStaff.name}</p>
                                <p className="text-white/40 text-sm font-bold uppercase tracking-widest">{selectedStaff.role}</p>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="w-full py-6 bg-gradient-to-r from-rose-600 to-orange-600 text-white text-2xl font-black rounded-3xl shadow-xl shadow-rose-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : `SUBMIT ${selectedAction.toUpperCase()}`}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-8 animate-in zoom-in duration-500">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl ${status?.type === 'success' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}>
                                {status?.type === 'success' ? <CheckCircle2 className="text-white w-12 h-12" /> : <User className="text-white w-12 h-12" />}
                            </div>
                            <div className="space-y-4">
                                <h3 className={`text-4xl font-black uppercase tracking-tighter ${status?.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {status?.type === 'success' ? 'Success!' : 'Oops!'}
                                </h3>
                                <p className="text-white/70 text-xl font-medium">{status?.message}</p>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                className="px-12 py-5 bg-white/10 hover:bg-white/20 text-white font-black rounded-3xl border border-white/20 transition-all uppercase"
                            >
                                Back to Home
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <button
                onClick={() => navigate('/')}
                className="mt-12 group flex items-center text-white/40 hover:text-white transition-all text-sm font-black tracking-widest uppercase"
            >
                <ArrowLeft className="mr-2 group-hover:-translate-x-2 transition-transform" /> Back to Salon
            </button>
        </div>
    );
};

export default StaffAttendanceConfirm;
