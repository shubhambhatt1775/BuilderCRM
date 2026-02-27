import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, RefreshCw, Phone, MessageSquare, Clock, Target, TrendingUp, User, Mail, ExternalLink, Calendar, CheckCircle, XCircle, AlertCircle, Trophy } from 'lucide-react';

const SalesmanDetailView = () => {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const { salesmanId } = useParams();

    const [salesman, setSalesman] = useState(null);
    const [leads, setLeads] = useState([]);
    const [todayFollowups, setTodayFollowups] = useState([]);
    const [overdueFollowups, setOverdueFollowups] = useState([]);
    const [upcomingFollowups, setUpcomingFollowups] = useState([]);
    const [stats, setStats] = useState(null);
    const [kpiData, setKpiData] = useState({
        total: 0,
        won: 0,
        missed: 0,
        successRate: 0.0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');
    const [selectedLeadHistory, setSelectedLeadHistory] = useState(null);
    const [showFollowupHistoryModal, setShowFollowupHistoryModal] = useState(false);

    useEffect(() => {
        if (!token || !salesmanId) return;
        fetchSalesmanData();
    }, [token, salesmanId]);

    const fetchKPIData = async () => {
        try {
            console.log('🔄 Admin fetching KPI data for salesman:', salesmanId);
            const res = await axios.get(`http://localhost:5000/api/leads/kpi/${salesmanId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('📊 Admin KPI Response:', res.data);
            setKpiData({
                total: res.data.total,
                won: res.data.won,
                missed: res.data.missed,
                successRate: res.data.successRate
            });
            console.log('✅ Admin KPI Data Set:', {
                total: res.data.total,
                won: res.data.won,
                missed: res.data.missed,
                successRate: res.data.successRate
            });
        } catch (error) {
            console.error('❌ Admin error fetching KPI data:', error);
            if (error.response?.status === 401) {
                logout();
            }
        }
    };

    const fetchSalesmanData = async () => {
        setLoading(true);
        try {
            console.log('Fetching data for salesman ID:', salesmanId);

            // Fetch salesman details
            const salesmanRes = await axios.get(`http://localhost:5000/api/users/salesmen`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const selectedSalesman = salesmanRes.data.find(s => s.id === parseInt(salesmanId));
            console.log('Selected salesman:', selectedSalesman);
            setSalesman(selectedSalesman);

            // Fetch leads for this salesman using the existing endpoint but modified
            let leadsRes;
            try {
                leadsRes = await axios.get(`http://localhost:5000/api/leads/my-leads/${salesmanId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.log('New endpoint failed, using fallback...');
                // Fallback: get all leads and filter by salesman
                const allLeadsRes = await axios.get(`http://localhost:5000/api/leads/all`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                leadsRes = { data: allLeadsRes.data.filter(lead => lead.assigned_to === parseInt(salesmanId)) };
            }
            console.log('Leads data:', leadsRes.data);
            setLeads(leadsRes.data);

            // Fetch today's follow-ups
            let todayRes;
            try {
                todayRes = await axios.get(`http://localhost:5000/api/leads/today-followups/${salesmanId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.log('Today followups endpoint failed, using fallback...');
                // Fallback: get all today followups and filter by salesman
                const allTodayRes = await axios.get(`http://localhost:5000/api/leads/today-followups`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                todayRes = { data: allTodayRes.data.filter(f => f.salesman_id === parseInt(salesmanId)) };
            }
            console.log('Today followups:', todayRes.data);
            setTodayFollowups(todayRes.data);

            // Fetch all follow-ups to get overdue ones
            let followupsRes;
            try {
                followupsRes = await axios.get(`http://localhost:5000/api/leads/followup-history/my-followups/${salesmanId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.log('Followups endpoint failed, using fallback...');
                // Fallback: get all followups and filter by salesman
                const allFollowupsRes = await axios.get(`http://localhost:5000/api/leads/followup-history/my-followups`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                followupsRes = { data: allFollowupsRes.data.filter(f => f.salesman_id === parseInt(salesmanId)) };
            }
            console.log('All followups:', followupsRes.data);
            const today = new Date().toISOString().split('T')[0];
            const overdue = followupsRes.data.filter(f => {
                const followupDate = new Date(f.followup_date).toISOString().split('T')[0];
                return followupDate < today && (f.status === 'Pending' || f.status === 'Missed');
            });
            const upcoming = followupsRes.data.filter(f => {
                const followupDate = new Date(f.followup_date).toISOString().split('T')[0];
                return followupDate > today && f.status === 'Pending';
            });
            console.log('Overdue followups:', overdue);
            setOverdueFollowups(overdue);
            setUpcomingFollowups(upcoming);

            // Fetch real KPI data
            fetchKPIData();

            // Calculate remaining stats (keep for compatibility)
            const totalLeads = leadsRes.data.length;
            const wonLeads = leadsRes.data.filter(l => l.status === 'Deal Won').length;
            const lostLeads = leadsRes.data.filter(l => l.status === 'Not Interested').length;
            const followupLeads = leadsRes.data.filter(l => l.status === 'Follow-up').length;
            const newLeads = leadsRes.data.filter(l => l.status === 'New').length;
            const assignedLeads = leadsRes.data.filter(l => l.status === 'Assigned').length;

            const calculatedStats = {
                total: totalLeads,
                won: wonLeads,
                lost: lostLeads,
                followup: followupLeads,
                new: newLeads,
                assigned: assignedLeads,
                conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
                todayFollowups: todayRes.data.length,
                overdueFollowups: overdue.length
            };

            console.log('Calculated stats:', calculatedStats);
            setStats(calculatedStats);

        } catch (error) {
            console.error('Error fetching salesman data:', error);
            if (error.response?.status === 401) {
                logout();
            } else {
                console.error('API Error:', error.response?.data);
            }
        } finally {
            setLoading(false);
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

    const hasMissedFollowup = (lead) => {
        return overdueFollowups.some(f => Number(f.lead_id) === Number(lead.id));
    };

    const hasTodayFollowup = (lead) => {
        return todayFollowups.some(f => Number(f.lead_id) === Number(lead.id));
    };

    const hasFutureFollowup = (lead) => {
        return upcomingFollowups.some(f => Number(f.lead_id) === Number(lead.id));
    };

    const getNextFollowupDate = (lead) => {
        const overdueFollowup = overdueFollowups.find(f => Number(f.lead_id) === Number(lead.id));
        if (overdueFollowup) return new Date(overdueFollowup.followup_date).toLocaleDateString();

        const todayFollowup = todayFollowups.find(f => Number(f.lead_id) === Number(lead.id));
        if (todayFollowup) return new Date(todayFollowup.followup_date).toLocaleDateString();

        const upcomingFollowup = upcomingFollowups.find(f => Number(f.lead_id) === Number(lead.id));
        if (upcomingFollowup) return new Date(upcomingFollowup.followup_date).toLocaleDateString();

        return null;
    };

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

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (!salesman) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Salesman not found</h2>
                    <button
                        onClick={() => navigate('/admin')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{salesman.name}'s Dashboard</h1>
                        <p className="text-gray-500">{salesman.email}</p>
                    </div>
                </div>
                <button
                    onClick={fetchSalesmanData}
                    className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition shadow-xl flex items-center space-x-2"
                >
                    <RefreshCw size={16} />
                    <span>Refresh</span>
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Target className="text-blue-600" size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">TOTAL</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{stats?.total || kpiData.total}</h3>
                    <p className="text-sm text-gray-600">Leads Assigned</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <CheckCircle className="text-emerald-600" size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">WON</span>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600">{stats?.won || kpiData.won}</h3>
                    <p className="text-sm text-gray-600">Deals Closed</p>
                </div>

                <div className={`p-6 rounded-2xl shadow-lg border transition-all ${(stats?.overdueFollowups || kpiData.missed) > 0 ? 'bg-red-50 border-red-200 animate-pulse ring-2 ring-red-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${(stats?.overdueFollowups || kpiData.missed) > 0 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>
                            <AlertCircle size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">MISSED</span>
                    </div>
                    <h3 className={`text-2xl font-black ${(stats?.overdueFollowups || kpiData.missed) > 0 ? 'text-red-700' : 'text-red-600'}`}>
                        {stats?.overdueFollowups || kpiData.missed}
                    </h3>
                    <p className="text-sm text-gray-600">Overdue Follow-ups</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <TrendingUp className="text-purple-600" size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">RATE</span>
                    </div>
                    <h3 className="text-2xl font-black text-purple-600">{stats?.conversionRate || kpiData.successRate}%</h3>
                    <p className="text-sm text-gray-600">Success Rate</p>
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
                        {tab} {tab === 'active' && stats ? `(${stats.assigned + stats.followup})` : ''}
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
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-300 italic font-medium">No {activeTab} leads available for tracking.</td>
                                </tr>
                            ) : filteredLeads.map(lead => {
                                const booking = lead.booking_details ? (typeof lead.booking_details === 'string' ? JSON.parse(lead.booking_details) : lead.booking_details) : null;
                                const isMissed = hasMissedFollowup(lead);
                                const isToday = hasTodayFollowup(lead);

                                return (
                                    <tr key={lead.id} className={`hover:bg-blue-50/20 transition-all group ${isMissed ? 'bg-red-50 border-l-[6px] border-red-600 shadow-[inset_10px_0_10px_-10px_rgba(220,38,38,0.2)]' :
                                        isToday ? 'bg-emerald-50/30 border-l-4 border-emerald-500' : ''
                                        }`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg">
                                                        {(lead.customer_name && lead.customer_name !== 'unknown client') ? lead.customer_name[0] : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-gray-900 text-sm">{lead.customer_name || 'unknown client'}</div>
                                                        <div className="text-xs text-gray-400">{lead.customer_email || 'no email'}</div>
                                                    </div>
                                                </div>
                                                {isToday && (
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
                                                {(lead.customer_phone || lead.phone) && (
                                                    <a
                                                        href={`https://wa.me/${(lead.customer_phone || lead.phone).replace(/\D/g, '')}`}
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
                                                    WA: {lead.whatsapp_status || 'NOT FOUND'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-xl transition-all border border-transparent hover:border-blue-100 group/msg">
                                                <div className="font-bold text-[10px] text-gray-400 mb-0.5 uppercase tracking-tight truncate group-hover/msg:text-blue-500">{lead.subject}</div>
                                                <div className="text-xs text-gray-600 line-clamp-1">{lead.body}</div>
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide bg-blue-50 text-blue-600 border border-blue-100`}>
                                                        Direct Email From {lead.sender_email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${isMissed ?
                                                    'bg-red-100 text-red-800 ring-red-800/20 animate-pulse' :
                                                    lead.status === 'Deal Won' ? 'bg-emerald-50 text-emerald-700 ring-emerald-700/10' :
                                                        lead.status === 'Follow-up' ? 'bg-amber-50 text-amber-700 ring-amber-700/10' :
                                                            'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                                {isMissed && (
                                                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-600 text-white border border-red-700 animate-pulse shadow-lg shadow-red-200 uppercase tracking-tighter">
                                                        🚨 OVERDUE MISSED
                                                    </div>
                                                )}
                                                {lead.status === 'Follow-up' && getNextFollowupDate(lead) && (
                                                    <div className={`text-xs font-medium px-2 py-1 rounded border ${isMissed ?
                                                        'text-red-700 bg-red-100 border-red-300 font-bold' :
                                                        'text-amber-700 bg-amber-50 border-amber-200'
                                                        }`}>
                                                        📅 {getNextFollowupDate(lead)}
                                                        {isMissed && ' (Overdue)'}
                                                    </div>
                                                )}
                                                {lead.status === 'Deal Won' && booking && (
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
                                                <button className="text-gray-300 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-xl">
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button
                                                    onClick={() => fetchLeadFollowupHistory(lead.id)}
                                                    className="text-gray-300 hover:text-amber-500 transition-colors p-2 hover:bg-amber-50 rounded-xl"
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
                                                    {typeof selectedLeadHistory.leadDetails?.booking_details === 'string'
                                                        ? JSON.parse(selectedLeadHistory.leadDetails.booking_details).project
                                                        : selectedLeadHistory.leadDetails?.booking_details?.project || 'General Booking'}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 sm:text-right flex flex-col justify-center min-w-[150px]">
                                            <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block opacity-70">Payout Value</span>
                                            <div className="text-2xl font-black">
                                                ₹{parseFloat(
                                                    (typeof selectedLeadHistory.leadDetails?.booking_details === 'string'
                                                        ? JSON.parse(selectedLeadHistory.leadDetails.booking_details).amount
                                                        : selectedLeadHistory.leadDetails?.booking_details?.amount) || 0
                                                ).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] font-bold text-emerald-200 italic mt-1 uppercase tracking-tighter">
                                                Closed on {
                                                    (typeof selectedLeadHistory.leadDetails?.booking_details === 'string'
                                                        ? JSON.parse(selectedLeadHistory.leadDetails.booking_details).bookingDate
                                                        : selectedLeadHistory.leadDetails?.booking_details?.bookingDate)
                                                        ? new Date(
                                                            typeof selectedLeadHistory.leadDetails?.booking_details === 'string'
                                                                ? JSON.parse(selectedLeadHistory.leadDetails.booking_details).bookingDate
                                                                : selectedLeadHistory.leadDetails?.booking_details?.bookingDate
                                                        ).toLocaleDateString() : 'N/A'
                                                }
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

                                                    <div className="flex-1 pt-2">
                                                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Action Date</div>
                                                                    <div className="text-lg font-bold text-gray-900">{new Date(followup.followup_date).toLocaleDateString()}</div>
                                                                </div>
                                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${followup.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                    followup.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                                        followup.status === 'Missed' ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' :
                                                                            'bg-gray-50 text-gray-500'
                                                                    }`}>
                                                                    {followup.status}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div>
                                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Update Narrative</div>
                                                                    <p className="text-gray-700 font-medium leading-relaxed italic block p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                                        "{followup.remarks || 'No notes were recorded for this action.'}"
                                                                    </p>
                                                                </div>

                                                                {followup.completion_notes && (
                                                                    <div>
                                                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Result / Outcome</div>
                                                                        <div className="text-emerald-700 text-sm font-bold bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                                                                            {followup.completion_notes}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock size={32} className="text-gray-300" />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-400">No History Recorded</h4>
                                    <p className="text-gray-400 mt-2">This lead hasn't had any follow-up actions logged yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-10">
                            <button
                                onClick={() => setShowFollowupHistoryModal(false)}
                                className="w-full py-5 bg-gray-900 text-white rounded-[28px] font-black text-xl hover:bg-black transition-all shadow-xl shadow-gray-200"
                            >
                                Back to Tracking View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesmanDetailView;
