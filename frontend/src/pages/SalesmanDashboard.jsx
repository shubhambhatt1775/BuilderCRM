import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Phone, Calendar, CheckCircle, XCircle, Clock, Bell, ExternalLink, MessageSquare, Target, Trophy } from 'lucide-react';

// Rupee Icon Component
const RupeeIcon = ({ size = 16, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M6 3h12v2h-4c-.6 0-1 .4-1 1v2h5v2h-5v2c0 .6.4 1 1 1h4v2H6c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z" />
        <path d="M10 7h4M10 11h4" />
    </svg>
);

const SalesmanDashboard = () => {
    const { token, user, logout } = useAuth();
    const [leads, setLeads] = useState([]);
    const [todayFollowups, setTodayFollowups] = useState([]);
    const [overdueFollowups, setOverdueFollowups] = useState([]);
    const [upcomingFollowups, setUpcomingFollowups] = useState([]);
    const [showReminder, setShowReminder] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [statusUpdate, setStatusUpdate] = useState({
        status: '',
        remarks: '',
        followupDate: '',
        bookingDetails: { amount: '', project: '', bookingDate: '' },
        notInterestedMainReason: '',
        notInterestedReason: ''
    });
    const [activeTab, setActiveTab] = useState('active');
    const [viewMessage, setViewMessage] = useState(null);
    const [showFollowupHistoryModal, setShowFollowupHistoryModal] = useState(false);
    const [selectedLeadHistory, setSelectedLeadHistory] = useState(null);
    const [kpiData, setKpiData] = useState({
        total: 0,
        won: 0,
        missed: 0,
        successRate: 0.0
    });

    const fetchKPIData = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/kpi', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newKpiData = {
                total: parseInt(res.data.total) || 0,
                won: parseInt(res.data.won) || 0,
                missed: parseInt(res.data.missed) || 0,
                successRate: parseFloat(res.data.successRate) || 0.0
            };

            setKpiData(newKpiData);
        } catch (error) {
            console.error('Error fetching KPI data:', error);
            if (error.response?.status === 401) {
                logout();
            }
        }
    };

    const checkMissedFollowups = async () => {
        try {
            await axios.post('http://localhost:5000/api/leads/check-missed-followups', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Error checking missed follow-ups:', error);
        }
    };

    const hasMissedFollowup = (lead) => {
        // Check if lead has any missed follow-ups
        return overdueFollowups.some(f => Number(f.lead_id) === Number(lead.id));
    };

    const hasTodayFollowup = (lead) => {
        return todayFollowups.some(f => Number(f.lead_id) === Number(lead.id));
    };

    const hasFutureFollowup = (lead) => {
        return upcomingFollowups.some(f => Number(f.lead_id) === Number(lead.id));
    };

    const getNextFollowupDate = (lead) => {
        // Check overdue followups
        const overdueFollowup = overdueFollowups.find(f => f.lead_id === lead.id);
        if (overdueFollowup) {
            return new Date(overdueFollowup.followup_date).toLocaleDateString();
        }
        // Get the next follow-up date from today's followups
        const followup = todayFollowups.find(f => f.lead_id === lead.id);
        if (followup) {
            return new Date(followup.followup_date).toLocaleDateString();
        }
        // Check upcoming followups
        const upcomingFollowup = upcomingFollowups.find(f => f.lead_id === lead.id);
        if (upcomingFollowup) {
            return new Date(upcomingFollowup.followup_date).toLocaleDateString();
        }
        return null;
    };

    useEffect(() => {
        if (!token) return;
        checkMissedFollowups(); // Check for missed follow-ups first
        fetchLeads();
        fetchTodayFollowups();
        fetchOverdueFollowups();
        fetchKPIData();
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

    const fetchOverdueFollowups = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log('Today:', today);

            // Get all follow-ups for this salesman
            const res = await axios.get(`http://localhost:5000/api/leads/followup-history/my-followups`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('All followups fetched:', res.data);

            // Filter for overdue follow-ups (due date before today and still pending OR already marked Missed)
            const overdue = res.data.filter(f => {
                const followupDate = new Date(f.followup_date).toISOString().split('T')[0];
                return followupDate < today && (f.status === 'Pending' || f.status === 'Missed');
            });

            const upcoming = res.data.filter(f => {
                const followupDate = new Date(f.followup_date).toISOString().split('T')[0];
                return followupDate > today && f.status === 'Pending';
            });

            console.log('Overdue followups:', overdue);
            setOverdueFollowups(overdue);
            setUpcomingFollowups(upcoming);
        } catch (error) {
            console.error('Error fetching overdue followups:', error);
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

    const fetchLeadFollowupHistory = async (leadId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/leads/followup-history/lead/${leadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Process follow-up history to identify missed follow-ups
            const processedHistory = res.data.followupHistory.map(followup => {
                const followupDate = new Date(followup.followup_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                followupDate.setHours(0, 0, 0, 0);

                // If status is Pending and due date has passed, mark as missed
                if (followup.status === 'Pending' && followupDate < today) {
                    return {
                        ...followup,
                        status: 'Missed',
                        completion_date: new Date().toISOString(),
                        completion_notes: 'Automatically marked as missed - due date passed'
                    };
                }
                return followup;
            });

            setSelectedLeadHistory({
                ...res.data,
                followupHistory: processedHistory
            });
            setShowFollowupHistoryModal(true);
        } catch (err) {
            console.error('Error fetching lead follow-up history:', err);
            if (err.response?.status === 401) {
                logout();
            } else {
                alert('Failed to fetch follow-up history');
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
            setStatusUpdate({
                status: '',
                remarks: '',
                followupDate: '',
                bookingDetails: { amount: '', project: '', bookingDate: '' },
                notInterestedMainReason: '',
                notInterestedReason: ''
            });
            fetchLeads();
            fetchTodayFollowups();
            fetchKPIData();
            fetchOverdueFollowups();
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

    // Filter leads for different tabs and prioritize missed ones
    const filteredLeads = leads.filter(l => {
        if (activeTab === 'active') return ['Assigned', 'Follow-up'].includes(l.status);
        if (activeTab === 'won') return l.status === 'Deal Won';
        if (activeTab === 'closed') return l.status === 'Not Interested';
        return true;
    }).sort((a, b) => {
        const aMissed = a.status === 'Follow-up' && hasMissedFollowup(a);
        const bMissed = b.status === 'Follow-up' && hasMissedFollowup(b);
        if (aMissed && !bMissed) return -1;
        if (!aMissed && bMissed) return 1;
        if (aMissed && bMissed) {
            const getOverdueTime = (lead) => {
                const f = overdueFollowups.find(f => Number(f.lead_id) === Number(lead.id));
                return f ? new Date(f.followup_date).getTime() : 0;
            };
            return getOverdueTime(a) - getOverdueTime(b);
        }

        const aToday = a.status === 'Follow-up' && hasTodayFollowup(a);
        const bToday = b.status === 'Follow-up' && hasTodayFollowup(b);
        if (aToday && !bToday) return -1;
        if (!aToday && bToday) return 1;

        const aFuture = a.status === 'Follow-up' && hasFutureFollowup(a);
        const bFuture = b.status === 'Follow-up' && hasFutureFollowup(b);
        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;
        if (aFuture && bFuture) {
            const getFutureTime = (lead) => {
                const f = upcomingFollowups.find(f => Number(f.lead_id) === Number(lead.id));
                return f ? new Date(f.followup_date).getTime() : 0;
            };
            return getFutureTime(a) - getFutureTime(b);
        }

        return 0;
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
                    <button onClick={() => {
                        fetchLeads();
                        fetchKPIData();
                    }} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition shadow-xl">Refresh Data</button>
                </div>
            </header>

            {/* Insight Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">TOTAL</div>
                    <div className="text-3xl font-black text-blue-600">{leads.length || kpiData.total} <span className="text-sm font-medium text-gray-400">Leads Assigned</span></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">WON</div>
                    <div className="text-3xl font-black text-green-600">{stats.won || kpiData.won} <span className="text-sm font-medium text-gray-400">Deals Closed</span></div>
                </div>
                <div className={`p-6 rounded-3xl border shadow-sm transition-all ${(overdueFollowups.length || kpiData.missed) > 0 ? 'bg-red-50 border-red-200 animate-pulse ring-2 ring-red-100' : 'bg-white border-red-100'}`}>
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">MISSED</div>
                    <div className={`text-3xl font-black ${(overdueFollowups.length || kpiData.missed) > 0 ? 'text-red-700' : 'text-red-600'}`}>{overdueFollowups.length || kpiData.missed} <span className="text-sm font-medium text-gray-400">Overdue Follow-ups</span></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">RATE</div>
                    <div className="text-3xl font-black text-purple-600">{leads.length > 0 ? ((stats.won / leads.length) * 100).toFixed(1) : kpiData.successRate}% <span className="text-sm font-medium text-gray-400">Success Rate</span></div>
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
                <div className="overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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
                            ) : filteredLeads.map(lead => {
                                const booking = lead.booking_details ? (typeof lead.booking_details === 'string' ? JSON.parse(lead.booking_details) : lead.booking_details) : null;
                                const hasTodayFollowup = todayFollowups.some(f => f.lead_id === lead.id);
                                const hasMissedFollowupLocal = overdueFollowups.some(f => f.lead_id === lead.id);
                                console.log(`Lead ${lead.id}: hasMissedFollowupLocal = ${hasMissedFollowupLocal}, overdueFollowups = ${overdueFollowups.length}`);
                                return (
                                    <tr key={lead.id} className={`hover:bg-blue-50/20 transition-all group ${hasMissedFollowup(lead) ? 'bg-red-50 border-l-[6px] border-red-600 shadow-[inset_10px_0_10px_-10px_rgba(220,38,38,0.2)]' :
                                        hasTodayFollowup ? 'bg-emerald-50/30 border-l-4 border-emerald-500' :
                                            (lead.subject && (lead.subject.toLowerCase().includes('test 10') || lead.subject.toLowerCase().includes('test 11') || lead.subject.toLowerCase().includes('test10') || lead.subject.toLowerCase().includes('test11'))) ? 'bg-red-100 border-l-4 border-red-500' : ''
                                        }`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg">
                                                        {(lead.customer_name && lead.customer_name !== 'unknown client') ? lead.customer_name[0] : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="font-extrabold text-gray-900 text-sm">{lead.customer_name || 'unknown client'}</div>
                                                        </div>
                                                        <div className="text-xs text-gray-400">{lead.customer_email || 'no email'}</div>
                                                    </div>
                                                </div>
                                                {hasTodayFollowup && (
                                                    <div className="flex-shrink-0">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                                            TODAY
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {lead.customer_phone || lead.phone ? (
                                                    <a href={`tel:${lead.customer_phone || lead.phone}`} className="font-black text-gray-900 text-sm hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                                                        <Phone size={12} className="text-gray-400" />
                                                        <span>{lead.customer_phone || lead.phone}</span>
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
                                                        lead.whatsapp_status === 'Not Configured' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
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
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide bg-blue-50 text-blue-600 border border-blue-100`}>
                                                        Direct Email From {lead.sender_email}
                                                    </span>
                                                    {(lead.subject && (lead.subject.toLowerCase().includes('test 10') || lead.subject.toLowerCase().includes('test 11') || lead.subject.toLowerCase().includes('test10') || lead.subject.toLowerCase().includes('test11'))) && (
                                                        <div className="text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 animate-pulse">
                                                            MISSED LEAD
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${lead.status === 'Follow-up' && hasMissedFollowup(lead) ?
                                                    'bg-red-100 text-red-800 ring-red-800/20 animate-pulse' :
                                                    lead.status === 'Won' ? 'bg-emerald-50 text-emerald-700 ring-emerald-700/10' :
                                                        lead.status === 'Follow-up' ? 'bg-amber-50 text-amber-700 ring-amber-700/10' :
                                                            'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                                {lead.status === 'Follow-up' && hasMissedFollowup(lead) && (
                                                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-600 text-white border border-red-700 animate-pulse shadow-lg shadow-red-200 uppercase tracking-tighter">
                                                        🚨 OVERDUE MISSED
                                                    </div>
                                                )}
                                                {lead.status === 'Follow-up' && getNextFollowupDate(lead) && (
                                                    <div className={`text-xs font-medium px-2 py-1 rounded border ${hasMissedFollowup(lead) ?
                                                        'text-red-700 bg-red-100 border-red-300 font-bold' :
                                                        'text-amber-700 bg-amber-50 border-amber-200'
                                                        }`}>
                                                        📅 {getNextFollowupDate(lead)}
                                                        {hasMissedFollowup(lead) && ' (Overdue)'}
                                                    </div>
                                                )}
                                                {lead.status === 'Won' && booking && (
                                                    <div className="text-[10px] mt-2 p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex flex-col shadow-sm">
                                                        <span className="font-black flex items-center space-x-1 mb-1 text-emerald-800">
                                                            <CheckCircle size={10} className="text-emerald-500" />
                                                            <span className="uppercase tracking-wide">{booking.project || 'General Booking'}</span>
                                                        </span>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <span className="font-bold">₹{parseFloat(booking.amount || 0).toLocaleString()}</span>
                                                            <span className="italic text-emerald-600 font-medium">
                                                                {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {lead.status === 'Not Interested' && (lead.not_interested_main_reason || lead.not_interested_reason) && (
                                                    <div className="text-[10px] mt-2 p-2 bg-red-50 text-red-700 rounded-lg border border-red-100 flex flex-col shadow-sm">
                                                        <span className="font-black flex items-center space-x-1 mb-1 text-red-800">
                                                            <XCircle size={10} className="text-red-500" />
                                                            <span className="uppercase tracking-wide">{lead.not_interested_main_reason}</span>
                                                        </span>
                                                        {lead.not_interested_main_reason === 'Other' && lead.not_interested_reason && (
                                                            <span className="italic text-red-600 font-medium leading-tight">"{lead.not_interested_reason}"</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center space-x-2">
                                                {lead.status !== 'Deal Won' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLead(lead);
                                                            setStatusUpdate({
                                                                status: lead.status,
                                                                remarks: '',
                                                                followupDate: '',
                                                                bookingDetails: { amount: '', project: '', bookingDate: '' },
                                                                notInterestedMainReason: '',
                                                                notInterestedReason: ''
                                                            });
                                                        }}
                                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-black transition-all shadow-sm flex items-center space-x-1.5"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span>Update</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => fetchLeadFollowupHistory(lead.id)}
                                                    className="text-amber-600 hover:text-amber-800 transition-colors"
                                                    title="View follow-up history"
                                                >
                                                    <Clock size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                <p className="text-gray-500 font-medium">Customer: <span className="text-gray-900 font-bold">{selectedLead.customer_name || 'unknown client'}</span></p>
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

                            {statusUpdate.status === 'Not Interested' && (
                                <div className="space-y-6 animate-in p-8 bg-red-50/50 rounded-[32px] border border-red-100">
                                    <h3 className="font-black text-red-800 flex items-center space-x-3">
                                        <XCircle size={24} />
                                        <span>Specify Reason for Disinterest</span>
                                    </h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-red-700 uppercase mb-2">Primary Reason</label>
                                            <select
                                                className="w-full p-4 bg-white border-2 border-red-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-400/20 focus:border-red-400 font-bold appearance-none cursor-pointer"
                                                value={statusUpdate.notInterestedMainReason}
                                                onChange={(e) => setStatusUpdate({ ...statusUpdate, notInterestedMainReason: e.target.value })}
                                                required
                                            >
                                                <option value="">Select a reason</option>
                                                <option value="Too Expensive">Too Expensive</option>
                                                <option value="Location Issue">Location Issue</option>
                                                <option value="Property Size">Property Size</option>
                                                <option value="Not Ready to Buy">Not Ready to Buy</option>
                                                <option value="Already Bought Elsewhere">Already Bought Elsewhere</option>
                                                <option value="Investment not suitable">Investment not suitable</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        {statusUpdate.notInterestedMainReason === 'Other' && (
                                            <div className="animate-in">
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-2">Detailed Reason</label>
                                                <textarea
                                                    className="w-full p-4 bg-white border-2 border-red-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-400/20 focus:border-red-400 font-medium" rows="3"
                                                    placeholder="Type the customer's specific reason here..."
                                                    value={statusUpdate.notInterestedReason}
                                                    onChange={(e) => setStatusUpdate({ ...statusUpdate, notInterestedReason: e.target.value })}
                                                    required
                                                ></textarea>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                        <div className="p-2 bg-green-500 text-white rounded-xl flex items-center space-x-2">
                                            <RupeeIcon size={20} />
                                            <CheckCircle size={20} />
                                        </div>
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
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-2">Booking Amount (₹)</label>
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
                                Submit
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
                                                <div className="font-extrabold text-gray-900 text-lg">{f.customer_name || 'unknown client'}</div>
                                                <div className="text-gray-400 text-sm font-medium">{f.customer_email || 'no email'}</div>
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
                                                            setStatusUpdate({
                                                                status: lead.status,
                                                                remarks: '',
                                                                followupDate: '',
                                                                bookingDetails: { amount: '', project: '', bookingDate: '' },
                                                                notInterestedMainReason: '',
                                                                notInterestedReason: ''
                                                            });
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
                                    <p className="text-gray-500 font-medium text-sm">Customer: <span className="text-blue-600 font-bold">{viewMessage.customer_name || 'unknown client'}</span></p>
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
                                    setStatusUpdate({
                                        status: viewMessage.status,
                                        remarks: '',
                                        followupDate: '',
                                        bookingDetails: { amount: '', project: '', bookingDate: '' },
                                        notInterestedMainReason: '',
                                        notInterestedReason: ''
                                    });
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

            {/* Follow-up History Modal */}
            {showFollowupHistoryModal && selectedLeadHistory && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                    <div className="bg-white rounded-[40px] p-8 max-w-4xl w-full shadow-2xl animate-in border border-white max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 italic">Follow-up History</h2>
                                <p className="text-gray-400 text-sm font-medium mt-1">
                                    {selectedLeadHistory.leadDetails?.customer_name || selectedLeadHistory.leadDetails?.sender_name || 'Anonymous'} - {selectedLeadHistory.leadDetails?.customer_email && selectedLeadHistory.leadDetails?.customer_email !== 'no email' ? selectedLeadHistory.leadDetails?.customer_email : selectedLeadHistory.leadDetails?.sender_email}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowFollowupHistoryModal(false)}
                                className="text-gray-400 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition"
                            >
                                <XCircle size={28} />
                            </button>
                        </div>

                        {/* Lead Summary */}
                        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Lead Subject</span>
                                    <p className="font-bold text-gray-900 mt-1">{selectedLeadHistory.leadDetails?.subject || 'No subject'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Assigned To</span>
                                    <p className="font-bold text-gray-900 mt-1">{selectedLeadHistory.leadDetails?.assigned_salesman || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Follow-ups</span>
                                    <p className="font-bold text-gray-900 mt-1">{selectedLeadHistory.followupHistory?.length || 0}</p>
                                </div>
                                {selectedLeadHistory.leadDetails?.status === 'Deal Won' && (
                                    <div className="col-span-full mt-4 p-5 bg-emerald-600 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl shadow-emerald-200 border-4 border-white">
                                        <div className="flex items-center space-x-5">
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                                                <Trophy size={32} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-1 opacity-80">Mission Accomplished</div>
                                                <h4 className="font-black text-2xl leading-tight">
                                                    {selectedLeadHistory.leadDetails?.booking_details?.project || 'General Booking'}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 sm:text-right flex flex-col justify-center min-w-[150px]">
                                            <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block opacity-70">Payout Value</span>
                                            <div className="text-2xl font-black">
                                                ₹{parseFloat(selectedLeadHistory.leadDetails?.booking_details?.amount || 0).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] font-bold text-emerald-200 italic mt-1 uppercase tracking-tighter">
                                                Closed on {selectedLeadHistory.leadDetails?.booking_details?.bookingDate ? new Date(selectedLeadHistory.leadDetails.booking_details.bookingDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Follow-up Timeline */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-gray-900">Follow-up Timeline</h3>

                            {selectedLeadHistory.followupHistory && selectedLeadHistory.followupHistory.length > 0 ? (
                                <div className="relative">
                                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-100"></div>

                                    <div className="space-y-6">
                                        {selectedLeadHistory.followupHistory
                                            .sort((a, b) => new Date(b.followup_date) - new Date(a.followup_date))
                                            .map((followup, index) => (
                                                <div key={followup.id} className="relative flex items-start space-x-4">
                                                    <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                                                        <div className={`p-3 rounded-full ${followup.status === 'Completed' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                            followup.status === 'Pending' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                                followup.status === 'Missed' ? 'bg-red-100 text-red-600 border-red-200' :
                                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                            }`}>
                                                            {followup.status === 'Completed' ? <CheckCircle size={20} /> :
                                                                followup.status === 'Pending' ? <Clock size={20} /> :
                                                                    followup.status === 'Missed' ? <XCircle size={20} /> :
                                                                        <Target size={20} />}
                                                        </div>
                                                    </div>
                                                    <div className={`flex-1 rounded-2xl p-4 border ${followup.status === 'Completed' ? 'bg-emerald-50 border-emerald-100' :
                                                        followup.status === 'Pending' ? 'bg-amber-50 border-amber-100' :
                                                            followup.status === 'Missed' ? 'bg-red-50 border-red-100' :
                                                                'bg-gray-50 border-gray-100'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className={`text-xs font-black uppercase tracking-widest ${followup.status === 'Completed' ? 'text-emerald-600' :
                                                                followup.status === 'Pending' ? 'text-amber-600' :
                                                                    followup.status === 'Missed' ? 'text-red-600' :
                                                                        'text-gray-600'
                                                                }`}>
                                                                {followup.status}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(followup.followup_date).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        <div className="mb-2">
                                                            <span className="text-xs font-medium text-gray-500">Salesman:</span>
                                                            <span className="text-xs text-gray-700 ml-2">{followup.salesman_name}</span>
                                                        </div>

                                                        {followup.remarks && (
                                                            <div className="mb-2">
                                                                <span className="text-xs font-medium text-gray-500">Remarks:</span>
                                                                <p className="text-sm text-gray-700 mt-1">{followup.remarks}</p>
                                                            </div>
                                                        )}

                                                        {followup.completion_date && (
                                                            <div className="mb-2">
                                                                <span className="text-xs font-medium text-gray-500">Completed on:</span>
                                                                <span className="text-xs text-gray-700 ml-2">
                                                                    {new Date(followup.completion_date).toLocaleDateString()} at {new Date(followup.completion_date).toLocaleTimeString()}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {followup.completion_notes && (
                                                            <div>
                                                                <span className="text-xs font-medium text-gray-500">Completion Notes:</span>
                                                                <p className="text-sm text-gray-700 mt-1">{followup.completion_notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock className="text-gray-400" size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Follow-up History</h3>
                                    <p className="text-sm text-gray-500">No follow-up activities recorded for this lead yet</p>
                                </div>
                            )}
                        </div>

                        {/* Summary Stats */}
                        {selectedLeadHistory.summary && (
                            <div className="mt-6 bg-blue-50 rounded-2xl p-4">
                                <h4 className="text-sm font-black text-blue-900 mb-3">Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-500">Total:</span>
                                        <span className="font-bold text-gray-900 ml-2">{selectedLeadHistory.summary.totalFollowups}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Pending:</span>
                                        <span className="font-bold text-amber-600 ml-2">{selectedLeadHistory.summary.pendingFollowups}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Completed:</span>
                                        <span className="font-bold text-emerald-600 ml-2">{selectedLeadHistory.summary.completedFollowups}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Missed:</span>
                                        <span className="font-bold text-red-600 ml-2">{selectedLeadHistory.summary.missedFollowups}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesmanDashboard;
