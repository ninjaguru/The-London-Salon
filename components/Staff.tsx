
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Staff as StaffType, Role, AppointmentStatus, Appointment } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Download, Target, DollarSign, QrCode, Printer, X, Smartphone, RefreshCw } from 'lucide-react';
import Modal from './ui/Modal';

const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedStaffForQr, setSelectedStaffForQr] = useState<StaffType | null>(null);

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin';

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(Role.HairStylist);
  const [specialties, setSpecialties] = useState('');
  const [target, setTarget] = useState(0);
  const [salary, setSalary] = useState(0);

  useEffect(() => {
    const loadData = () => {
      setStaffList(db.staff.getAll());
      setAppointments(db.appointments.getAll());
    };
    loadData();
    window.addEventListener('db-updated', loadData);
    return () => window.removeEventListener('db-updated', loadData);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const specs = specialties.split(',').map(s => s.trim()).filter(Boolean);

    let newList;
    // If not admin, preserve existing target/salary when editing
    const existingTarget = editingStaff?.target || 0;
    const existingSalary = editingStaff?.salary || 0;

    const staffData = {
      name,
      role,
      specialties: specs,
      target: isAdmin ? target : existingTarget,
      salary: isAdmin ? salary : existingSalary,
    };

    if (editingStaff) {
      newList = staffList.map(s => s.id === editingStaff.id ? { ...s, ...staffData } : s);
    } else {
      const newStaff: StaffType = {
        id: crypto.randomUUID(),
        ...staffData,
        active: true
      };
      newList = [...staffList, newStaff];
    }

    setStaffList(newList);
    db.staff.save(newList);
    closeModal();
  };

  const handleResetDevice = (id: string, name: string) => {
    if (!isAdmin) return;
    if (confirm(`Are you sure you want to reset the device link for ${name}? This will allow them to register a new phone on their next scan.`)) {
      const newList = staffList.map(s => s.id === id ? { ...s, registeredDeviceId: undefined } : s);
      setStaffList(newList);
      db.staff.save(newList);
    }
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to delete this staff member?')) {
      const newList = staffList.filter(s => s.id !== id);
      setStaffList(newList);
      db.staff.save(newList);
    }
  };

  const openModal = (staff?: StaffType) => {
    if (staff) {
      setEditingStaff(staff);
      setName(staff.name);
      setRole(staff.role);
      setSpecialties(staff.specialties.join(', '));
      setTarget(staff.target || 0);
      setSalary(staff.salary || 0);
    } else {
      setEditingStaff(null);
      setName('');
      setRole(Role.HairStylist);
      setSpecialties('');
      setTarget(0);
      setSalary(0);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  // Helper to calculate this month's revenue for a staff member
  const getStaffMetrics = (staffId: string) => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    const monthlyAppointments = appointments.filter(a =>
      a.staffId === staffId &&
      a.status === AppointmentStatus.Completed &&
      a.date.startsWith(currentMonth)
    );

    const revenue = monthlyAppointments.reduce((acc, curr) => acc + curr.price, 0);
    return { revenue };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(staffList, 'staff')}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          <button
            onClick={() => openModal()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map((staff) => {
          const metrics = getStaffMetrics(staff.id);
          const currentTarget = staff.target || 1; // avoid divide by zero
          const percentAchieved = Math.min((metrics.revenue / currentTarget) * 100, 100);

          return (
            <div key={staff.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 flex justify-between items-start border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-gray-900">{staff.name}</h3>
                    <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {staff.role}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => { setSelectedStaffForQr(staff); setShowQrModal(true); }}
                    className="text-gray-400 hover:text-rose-600 p-1"
                    title="Attendance QR"
                  >
                    <QrCode size={16} />
                  </button>
                  <button onClick={() => openModal(staff)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 size={16} /></button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(staff.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col space-y-4">
                {/* Specialties */}
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {staff.specialties.map((spec, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">{spec}</span>
                    ))}
                    {staff.specialties.length === 0 && <span className="text-xs text-gray-400 italic">None listed</span>}
                  </div>
                </div>

                {/* Monthly Target Section - Only show if Admin or if logged in user matches (not implemented here, showing generally) or just hide for non-admins if sensitive */}
                {isAdmin && (
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold flex items-center">
                        <Target size={12} className="mr-1" /> Monthly Target
                      </p>
                      <span className="text-xs font-bold text-gray-700">
                        ₹{metrics.revenue.toLocaleString()} / ₹{(staff.target || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5" title={`${percentAchieved.toFixed(0)}% Achieved`}>
                      <div
                        className={`h-2.5 rounded-full ${percentAchieved >= 100 ? 'bg-green-500' : percentAchieved >= 50 ? 'bg-yellow-400' : 'bg-rose-500'}`}
                        style={{ width: `${percentAchieved}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="bg-gray-50 px-5 py-3 flex justify-between items-center border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  {isAdmin && (
                    <>
                      <DollarSign size={14} className="mr-1 text-green-600" />
                      Salary: <span className="font-semibold ml-1">₹{(staff.salary || 0).toLocaleString()}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {staff.active ?
                    <span className="flex items-center text-green-600 text-xs font-medium"><CheckCircle size={14} className="mr-1" /> Active</span> :
                    <span className="flex items-center text-red-500 text-xs font-medium"><XCircle size={14} className="mr-1" /> Inactive</span>
                  }

                  {isAdmin && staff.registeredDeviceId && (
                    <button
                      onClick={() => handleResetDevice(staff.id, staff.name)}
                      className="flex items-center bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                      title={`Device ID: ${staff.registeredDeviceId}`}
                    >
                      <Smartphone size={10} className="mr-1" /> Device Linked (Reset)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStaff ? "Edit Staff" : "Add New Staff"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            >
              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Specialties (comma separated)</label>
            <input
              type="text"
              value={specialties}
              onChange={e => setSpecialties(e.target.value)}
              placeholder="e.g. Cuts, Color, Styling"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
            />
          </div>
          {isAdmin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Target (₹)</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary (₹)</label>
                <input
                  type="number"
                  value={salary}
                  onChange={e => setSalary(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm border p-2"
                />
              </div>
            </div>
          )}
          <div className="mt-5 sm:mt-6">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:text-sm"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Unique Staff QR Modal */}
      {showQrModal && selectedStaffForQr && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900 bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white font-bold">
              <span className="flex items-center gap-2"><QrCode size={18} /> Staff ID Card</span>
              <button onClick={() => setShowQrModal(false)}><X size={20} /></button>
            </div>
            <div className="p-8 text-center space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center text-3xl font-black mb-2 ring-4 ring-rose-50 shadow-inner">
                  {selectedStaffForQr.name.charAt(0)}
                </div>
                <h3 className="text-xl font-black text-gray-900">{selectedStaffForQr.name}</h3>
                <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{selectedStaffForQr.role}</p>
              </div>

              <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl inline-block shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/attendance-scan/${selectedStaffForQr.id}`)}`}
                  alt="Staff QR"
                  className="w-48 h-48"
                />
              </div>

              <p className="text-xs text-gray-400 font-medium">Scan this code to record attendance for this specific staff member.</p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/attendance-scan/${selectedStaffForQr.id}`)}`;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                                    <html>
                                        <head>
                                            <title>Staff QR - ${selectedStaffForQr.name}</title>
                                            <style>
                                                body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                                                .card { border: 4px solid #111827; padding: 40px; text-align: center; border-radius: 30px; width: 350px; }
                                                .avatar { width: 80px; height: 80px; background: #e11d48; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 900; margin: 0 auto 20px; }
                                                img { width: 100%; margin: 20px 0; }
                                                h1 { font-size: 28px; color: #111827; margin: 0; }
                                                p { font-size: 16px; color: #e11d48; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="card">
                                                <div class="avatar">${selectedStaffForQr.name.charAt(0)}</div>
                                                <h1>${selectedStaffForQr.name}</h1>
                                                <p>${selectedStaffForQr.role}</p>
                                                <img src="${qrUrl}" />
                                                <div style="font-size:10px; color:#9ca3af; margin-top:10px;">The London Salon Staff Portal</div>
                                            </div>
                                            <script>window.onload = () => { window.print(); window.close(); }</script>
                                        </body>
                                    </html>
                                `);
                    printWindow.document.close();
                  }
                }}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <Printer size={18} /> Print ID Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
