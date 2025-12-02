
import React, { useState, useEffect } from 'react';
import { db, exportToCSV } from '../services/db';
import { authService } from '../services/auth';
import { Lead, LeadStatus, LeadComment, Customer } from '../types';
import { Plus, Download, MessageSquare, Phone, User, ExternalLink, Trash2, Send, CheckCircle, XCircle } from 'lucide-react';
import Modal from './ui/Modal';

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Comment State
  const [newComment, setNewComment] = useState('');

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    status: 'New' as LeadStatus,
    notes: ''
  });

  useEffect(() => {
    setLeads(db.leads.getAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        source: lead.source,
        status: lead.status,
        notes: lead.notes || ''
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: '', phone: '', email: '', source: '', status: 'New', notes: ''
      });
    }
    setNewComment('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedLeads;

    if (editingLead) {
      updatedLeads = leads.map(l => l.id === editingLead.id ? { 
        ...l, 
        ...formData,
        comments: l.comments // preserve comments, they are handled separately
      } : l);
    } else {
      const newLead: Lead = {
        id: crypto.randomUUID(),
        ...formData,
        createdAt: new Date().toISOString(),
        comments: []
      };
      updatedLeads = [newLead, ...leads];
    }
    
    setLeads(updatedLeads);
    db.leads.save(updatedLeads);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (confirm('Delete this lead?')) {
      const updated = leads.filter(l => l.id !== id);
      setLeads(updated);
      db.leads.save(updated);
      if (editingLead?.id === id) closeModal();
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !editingLead) return;
    
    const comment: LeadComment = {
      id: crypto.randomUUID(),
      text: newComment,
      date: new Date().toISOString(),
      author: user?.name || 'Staff'
    };

    const updatedLeads = leads.map(l => l.id === editingLead.id ? {
      ...l,
      comments: [comment, ...l.comments]
    } : l);

    setLeads(updatedLeads);
    db.leads.save(updatedLeads);
    setEditingLead({ ...editingLead, comments: [comment, ...editingLead.comments] });
    setNewComment('');
  };

  const convertToCustomer = () => {
    if (!editingLead) return;
    if (confirm(`Convert ${editingLead.name} to a Customer?`)) {
       // 1. Create Customer
       const newCustomer: Customer = {
         id: crypto.randomUUID(),
         name: editingLead.name,
         phone: editingLead.phone,
         email: editingLead.email || '',
         apartment: '', // Default empty
         birthday: '',
         anniversary: '',
         walletBalance: 0,
         joinDate: new Date().toISOString().split('T')[0],
         notes: `Converted from Lead. Source: ${editingLead.source}. Notes: ${editingLead.notes}`,
         activeCoupons: [],
         isMember: false
       };
       db.customers.add(newCustomer);

       // 2. Update Lead Status
       const updatedLeads = leads.map(l => l.id === editingLead.id ? { ...l, status: 'Converted' as LeadStatus } : l);
       setLeads(updatedLeads);
       db.leads.save(updatedLeads);
       
       alert('Lead converted successfully!');
       closeModal();
    }
  };

  // Status Columns for Kanban
  const columns: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'];

  const getStatusColor = (status: LeadStatus) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Interested': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Converted': return 'bg-green-100 text-green-800 border-green-200';
      case 'Lost': return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Leads Pipeline</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => exportToCSV(leads, 'leads')}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Export
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Plus size={18} /> Add Lead
            </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-4 pb-4 min-w-max">
          {columns.map(status => (
            <div key={status} className="w-80 flex flex-col bg-gray-100/50 rounded-lg border border-gray-200 h-full">
              {/* Column Header */}
              <div className={`p-3 border-b border-gray-200 font-bold flex justify-between items-center ${getStatusColor(status).split(' ')[0]} rounded-t-lg`}>
                 <span className={getStatusColor(status).split(' ')[1]}>{status}</span>
                 <span className="bg-white/50 px-2 py-0.5 rounded text-xs">
                    {leads.filter(l => l.status === status).length}
                 </span>
              </div>
              
              {/* Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                 {leads.filter(l => l.status === status).map(lead => (
                   <div 
                      key={lead.id} 
                      onClick={() => openModal(lead)}
                      className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow relative group"
                   >
                      <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-800">{lead.name}</h4>
                          {lead.source && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{lead.source}</span>}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center mb-1">
                          <Phone size={12} className="mr-1" /> {lead.phone}
                      </div>
                      {lead.notes && (
                        <p className="text-xs text-gray-500 line-clamp-2 italic mb-2">"{lead.notes}"</p>
                      )}
                      
                      <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-2">
                          <div className="flex items-center text-xs text-gray-400">
                             <MessageSquare size={12} className="mr-1"/> {lead.comments.length}
                          </div>
                          <div className="text-[10px] text-gray-400">
                              {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                      </div>
                   </div>
                 ))}
                 {leads.filter(l => l.status === status).length === 0 && (
                   <div className="text-center text-gray-400 text-xs py-4 italic">No leads</div>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/View Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingLead ? "Manage Lead" : "New Lead"}
        maxWidth={editingLead ? "sm:max-w-4xl" : "sm:max-w-lg"}
      >
         <div className={`flex flex-col ${editingLead ? 'md:flex-row h-[70vh]' : ''} gap-6`}>
            
            {/* Left: Form */}
            <div className={`flex-1 overflow-y-auto pr-2 ${editingLead ? '' : 'max-h-[70vh]'}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input name="name" type="text" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input name="phone" type="text" required value={formData.phone} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Source</label>
                            <select name="source" value={formData.source} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300 bg-white">
                                <option value="">Select Source</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Facebook">Facebook</option>
                                <option value="Google">Google</option>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Referral">Referral</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300 bg-white">
                                {columns.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md border-gray-300"></textarea>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button type="submit" className="flex-1 justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none">
                            Save Changes
                        </button>
                        
                        {editingLead && editingLead.status !== 'Converted' && (
                             <button 
                                type="button" 
                                onClick={convertToCustomer}
                                className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700"
                             >
                                <CheckCircle size={16} className="mr-2"/> Convert
                            </button>
                        )}
                         {editingLead && isAdmin && (
                             <button 
                                type="button" 
                                onClick={() => handleDelete(editingLead.id)}
                                className="inline-flex justify-center items-center rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 text-base"
                             >
                                <Trash2 size={16}/>
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Right: Comments / History */}
            {editingLead && (
                <div className="flex-1 flex flex-col border-l border-gray-200 pl-4 h-full">
                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                        <MessageSquare size={16} className="mr-2"/> Comments & Activity
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 bg-gray-50 p-2 rounded">
                        {editingLead.comments.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center mt-4">No comments yet.</p>
                        ) : (
                            editingLead.comments.map(c => (
                                <div key={c.id} className="bg-white p-2 rounded shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-gray-700">{c.author}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(c.date).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.text}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..." 
                            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        />
                        <button 
                            type="button" 
                            onClick={handleAddComment}
                            className="bg-indigo-600 text-white rounded px-3 hover:bg-indigo-700"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
         </div>
      </Modal>
    </div>
  );
};

export default Leads;
