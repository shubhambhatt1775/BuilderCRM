import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Phone, Calendar, CheckCircle, XCircle, Clock, Bell, ExternalLink, MessageSquare } from 'lucide-react';

const SalesmanDashboard = () => {
    const { token, user, logout } = useAuth();
    const [leads, setLeads] = useState([]);
    const [todayFollowups, setTodayFollowups] = useState([]);
    const [showReminder, setShowReminder] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [statusUpdate, setStatusUpdate] = useState({
        status: '',
        remarks: '',
        followupDate: '',
        bookingDetails: { amount: '', project: '', bookingDate: '' }
    });
    const [activeTab, setActiveTab] = useState('active');
    const [viewMessage, setViewMessage] = useState(null);

    useEffect(() => {
        if (!token) return;
        fetchLeads();
        fetchTodayFollowups();
    }, [token]);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/my-leads', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(res.data);
        } catch (error) {
            console.error('Error fetching leads:', error);
            if (error.response?.status === 401) {
                logout();
            }
        }
    };

    const fetchTodayFollowups = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/today-followups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTodayFollowups(res.data);
            // Only show auto-popup if it's "today's" first load
            if (res.data.length > 0 && !sessionStorage.getItem('notified')) {
                setShowReminder(true);
                sessionStorage.setItem('notified', 'true');
            }
        } catch (error) {
            console.error('Error fetching followups:', error);
            if (error.response?.status === 401) {
                logout();
            }
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/leads/update-status',
                { leadId: selectedLead.id, ...statusUpdate },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSelectedLead(null);
            fetchLeads();
            fetchTodayFollowups();
            alert('Lead status successfully updated!');
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                logout();
            } else {
                alert('Failed to update status.');
            }
        }
    };

    // Filter leads for different tabs
    const filteredLeads = leads.filter(l => {
        if (activeTab === 'active') return ['Assigned', 'Follow-up'].includes(l.status);
        if (activeTab === 'won') return l.status === 'Deal Won';
        if (activeTab === 'closed') return l.status === 'Not Interested';
        return true;
    });

    const stats = {
        active: leads.filter(l => ['Assigned', 'Follow-up'].includes(l.status)).length,
        won: leads.filter(l => l.status === 'Deal Won').length,
        lost: leads.filter(l => l.status === 'Not Interested').length
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Sales Dashboard</h1>
                    <p className="text-gray-500 font-medium">Hello, {user?.name}! You have <span className="text-blue-600 underline font-bold">{stats.active}</span> active leads to handle.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setShowReminder(true)}
                        className="p-3 bg-white rounded-2xl shadow-lg border hover:bg-gray-50 transition relative group"
                        title="Today's Reminders"
                    >
                        <Bell className="text-gray-600 group-hover:rotate-12 transition-transform" />
                        {todayFollowups.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold animate-pulse">
                                {todayFollowups.length}
                            </span>
                        )}
                    </button>
                    <button onClick={fetchLeads} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition shadow-xl">Refresh Data</button>
                </div>
            </header>

            {/* Insight Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">Active Pipeline</div>
                    <div className="text-3xl font-black text-blue-600">{stats.active} <span className="text-sm font-medium text-gray-400">Leads</span></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">Deals Won</div>
                    <div className="text-3xl font-black text-green-600">{stats.won} <span className="text-sm font-medium text-gray-400">Bookings</span></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">Closed/Lost</div>
                    <div className="text-3xl font-black text-gray-400">{stats.lost} <span className="text-sm font-medium text-gray-300">Leads</span></div>
                </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="flex space-x-2 mb-6 bg-gray-100 p-1.5 rounded-2xl w-fit">
                {['active', 'won', 'closed'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-3 rounded-[14px] font-bold text-sm transition-all capitalize ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab} {tab === 'active' && `(${stats.active})`}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left table-auto">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                                <th className="px-6 py-4">Client Profile</th>
                                <th className="px-6 py-4">Contact Details</th>
                                <th className="px-6 py-4">Requirement</th>
                                <th className="px-6 py-4">Current Status</th>
                                <th className="px-6 py-4 text-center">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-300 italic font-medium">No {activeTab} leads available for processing.</td>
                                </tr>
                            ) : filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg">
                                                {lead.sender_name?.[0] || 'A'}
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-gray-900 text-sm">{lead.sender_name || 'Anonymous User'}</div>
                                                <div className="text-xs text-gray-400">{lead.sender_email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {lead.phone ? (
                                                <a href={`tel:${lead.phone}`} className="font-black text-gray-900 text-sm hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                                                    <Phone size={12} className="text-gray-400" />
                                                    <span>{lead.phone}</span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 font-bold text-sm italic">Not Provided</span>
                                            )}
                                            {lead.phone && (
                                                <a
                                                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-emerald-500 hover:text-emerald-600 transition-colors"
                                                >
                                                    <MessageSquare size={14} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${lead.whatsapp_status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                lead.whatsapp_status === 'Failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    'bg-gray-50 text-gray-400 border border-gray-100'
                                                }`}>
                                                WA: {lead.whatsapp_status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <div
                                            onClick={() => setViewMessage(lead)}
                                            className="cursor-pointer hover:bg-gray-100 p-2 rounded-xl transition-all border border-transparent hover:border-blue-100 group/msg"
                                        >
                                            <div className="font-bold text-[10px] text-gray-400 mb-0.5 uppercase tracking-tight truncate group-hover/msg:text-blue-500">{lead.subject}</div>
                                            <div className="text-xs text-gray-600 line-clamp-1">{lead.body}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${lead.status === 'Won' ? 'bg-emerald-50 text-emerald-700 ring-emerald-700/10' :
                                                lead.status === 'Follow-up' ? 'bg-amber-50 text-amber-700 ring-amber-700/10' :
                                                    'bg-blue-50 text-blue-700 ring-blue-700/10'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedLead(lead);
                                                    setStatusUpdate({ ...statusUpdate, status: lead.status });
                                                }}
                                                className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-black transition-all shadow-sm flex items-center space-x-1.5"
                                            >
                                                <ExternalLink size={12} />
                                                <span>Update</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Update Modal */}
            {selectedLead && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110] backdrop-blur-md">
                    <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl animate-in max-h-[90vh] overflow-y-auto border border-gray-100 relative">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 mb-2">Lead Handler</h2>
                                <p className="text-gray-500 font-medium">Customer: <span className="text-gray-900 font-bold">{selectedLead.sender_name}</span></p>
                            </div>
                            <button onClick={() => setSelectedLead(null)} className="bg-gray-100 text-gray-400 hover:text-gray-600 p-3 rounded-2xl transition hover:rotate-90">
                                <XCircle size={28} />
                            </button>
                        </div>



                        <form onSubmit={handleUpdateStatus} className="space-y-8">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Choose Outcome Case</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'Not Interested', desc: 'Case 1: Lost', icon: <XCircle size={24} />, color: 'peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-500' },
                                        { id: 'Follow-up', desc: 'Case 2: Delayed', icon: <Calendar size={24} />, color: 'peer-checked:bg-yellow-500 peer-checked:text-white peer-checked:border-yellow-500' },
                                        { id: 'Deal Won', desc: 'Case 3: Booked', icon: <CheckCircle size={24} />, color: 'peer-checked:bg-green-600 peer-checked:text-white peer-checked:border-green-600' }
                                    ].map(opt => (
                                        <div key={opt.id} className="relative">
                                            <input
                                                type="radio" name="status" id={opt.id} className="peer hidden"
                                                value={opt.id} checked={statusUpdate.status === opt.id}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                                            />
                                            <label htmlFor={opt.id} className={`flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-[32px] cursor-pointer hover:border-blue-200 transition-all ${opt.color}`}>
                                                {opt.icon}
                                                <span className="text-sm font-black mt-3">{opt.id}</span>
                                                <span className="text-[10px] opacity-60 font-medium">{opt.desc}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {statusUpdate.status === 'Follow-up' && (
                                <div className="space-y-6 animate-in p-8 bg-yellow-50/50 rounded-[32px] border border-yellow-100">
                                    <h3 className="font-black text-yellow-800 flex items-center space-x-3">
                                        <Clock size={24} />
                                        <span>Schedule Follow-up</span>
                                    </h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-yellow-700 uppercase mb-2">Next Contact Date</label>
                                            <input
                                                type="date" className="w-full p-4 bg-white border-2 border-yellow-100 rounded-2xl outline-none focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 font-bold"
                                                value={statusUpdate.followupDate}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, followupDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-yellow-700 uppercase mb-2">Remarks / Discussion Points</label>
                                            <textarea
                                                className="w-full p-4 bg-white border-2 border-yellow-100 rounded-2xl outline-none focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 font-medium" rows="3"
                                                placeholder="e.g. Discussed about 2BHK, wants to visit site next Sunday."
                                                value={statusUpdate.remarks}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, remarks: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {statusUpdate.status === 'Deal Won' && (
                                <div className="space-y-6 animate-in p-8 bg-green-50 rounded-[32px] border border-green-100 shadow-sm">
                                    <h3 className="font-extrabold text-green-800 text-xl flex items-center space-x-3">
                                        <div className="p-2 bg-green-500 text-white rounded-xl"><CheckCircle size={20} /></div>
                                        <span>Booking Details</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-2">Project Name</label>
                                            <input
                                                type="text" className="w-full p-4 bg-white border border-green-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-400/20 font-bold"
                                                placeholder="e.g. Prestige Green Valley"
                                                value={statusUpdate.bookingDetails.project}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, bookingDetails: { ...statusUpdate.bookingDetails, project: e.target.value } })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-2">Booking Amount ($)</label>
                                            <input
                                                type="number" className="w-full p-4 bg-white border border-green-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-400/20 font-black text-lg"
                                                placeholder="0.00"
                                                value={statusUpdate.bookingDetails.amount}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, bookingDetails: { ...statusUpdate.bookingDetails, amount: e.target.value } })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-2">Finalization Date</label>
                                            <input
                                                type="date" className="w-full p-4 bg-white border border-green-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-400/20 font-bold"
                                                value={statusUpdate.bookingDetails.bookingDate}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, bookingDetails: { ...statusUpdate.bookingDetails, bookingDate: e.target.value } })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-xl hover:bg-black transition-all shadow-2xl hover:translate-y-[-2px] active:scale-95">
                                Submit Case Result
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reminder Popup */}
            {showReminder && todayFollowups.length > 0 && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200] backdrop-blur-xl">
                    <div className="bg-white rounded-[48px] p-12 max-w-5xl w-full shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] animate-in ring-1 ring-white/20">
                        <div className="text-center mb-10">
                            <div className="bg-red-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-6 border-2 border-red-100 shadow-inner">
                                <Bell className="text-red-500 animate-bounce" size={48} />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 mb-2 italic">Urgent Follow-up Required!</h2>
                            <p className="text-gray-500 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                                Today you have <span className="text-red-600 font-extrabold underline">{todayFollowups.length} pending</span> follow-ups. Start calling now to meet your targets!
                            </p>
                        </div>

                        <div className="space-y-4 mb-10 max-h-[45vh] overflow-y-auto pr-4 custom-scrollbar">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6">Customer</th>
                                        <th className="px-6">Status Info</th>
                                        <th className="px-6 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayFollowups.map(f => (
                                        <tr key={f.id} className="bg-gray-50/50 hover:bg-red-50/30 transition-all rounded-3xl overflow-hidden group">
                                            <td className="px-6 py-5 rounded-l-[24px]">
                                                <div className="font-extrabold text-gray-900 text-lg">{f.sender_name}</div>
                                                <div className="text-gray-400 text-sm font-medium">{f.sender_email}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-bold text-red-600 bg-red-100 flex items-center space-x-1.5 px-3 py-1 rounded-full w-fit mb-2">
                                                    <Clock size={12} />
                                                    <span>DUE TODAY</span>
                                                </div>
                                                <div className="text-gray-500 text-sm italic line-clamp-1 font-medium">"{f.remarks || 'Previous discussion notes missing'}"</div>
                                            </td>
                                            <td className="px-6 py-5 text-center rounded-r-[24px]">
                                                <button
                                                    onClick={() => {
                                                        const lead = leads.find(l => l.id === f.lead_id);
                                                        if (lead) {
                                                            setSelectedLead(lead);
                                                            setStatusUpdate({ ...statusUpdate, status: lead.status });
                                                            setShowReminder(false);
                                                        }
                                                    }}
                                                    className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-black transition-all shadow-md active:scale-95 flex items-center space-x-2 mx-auto"
                                                >
                                                    <Phone size={14} />
                                                    <span>Call Now</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowReminder(false)}
                                className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[28px] font-black text-lg hover:bg-gray-200 transition"
                            >
                                Minimize
                            </button>
                            <button
                                onClick={() => setShowReminder(false)}
                                className="flex-[2] py-5 bg-red-600 text-white rounded-[28px] font-black text-xl hover:bg-red-700 transition shadow-2xl shadow-red-200 transform hover:scale-[1.02] active:scale-95"
                            >
                                I'm Starting Calls!
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Message Detail Modal */}
            {viewMessage && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[120] backdrop-blur-lg">
                    <div className="bg-white rounded-[40px] p-10 max-w-3xl w-full shadow-2xl animate-in max-h-[85vh] overflow-hidden border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight">Client Requirement</h3>
                                    <p className="text-gray-500 font-medium text-sm">From: <span className="text-blue-600 font-bold">{viewMessage.sender_name}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setViewMessage(null)} className="bg-gray-100 text-gray-400 hover:text-gray-600 p-3 rounded-2xl transition hover:rotate-90">
                                <XCircle size={28} />
                            </button>
                        </div>

                        <div className="bg-gray-50/50 rounded-3xl p-8 overflow-y-auto custom-scrollbar flex-1 border border-gray-100">
                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Subject Line</span>
                                <h4 className="text-lg font-bold text-gray-900">{viewMessage.subject}</h4>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Message Body</span>
                                <div className="text-gray-700 leading-relaxed font-medium whitespace-pre-line text-lg">
                                    {viewMessage.body}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex space-x-4">
                            <button
                                onClick={() => {
                                    setSelectedLead(viewMessage);
                                    setStatusUpdate({ ...statusUpdate, status: viewMessage.status });
                                    setViewMessage(null);
                                }}
                                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl flex items-center justify-center space-x-3"
                            >
                                <ExternalLink size={20} />
                                <span>Handle This Lead</span>
                            </button>
                            <button
                                onClick={() => setViewMessage(null)}
                                className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-lg hover:bg-gray-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesmanDashboard;
