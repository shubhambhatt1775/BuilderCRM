import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, User, Clock, CheckCircle, XCircle, TrendingUp, Target, BarChart2, RefreshCw, ExternalLink, Phone, MessageSquare } from 'lucide-react';

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
        <path d="M6 3h12v2h-4c-.6 0-1 .4-1 1v2h5v2h-5v2c0 .6.4 1 1 1h4v2H6c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z"/>
        <path d="M10 7h4M10 11h4"/>
    </svg>
);

const AdminDashboard = () => {
    const { token, logout } = useAuth();
    const [leads, setLeads] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [reports, setReports] = useState(null);
    const [activeTab, setActiveTab] = useState('leads');
    const [showSalesmanModal, setShowSalesmanModal] = useState(false);
    const [newSalesman, setNewSalesman] = useState({ name: '', email: '', password: '' });
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
    const [followupStatusLeads, setFollowupStatusLeads] = useState([]);
    const [followupStats, setFollowupStats] = useState(null);
    const [showFollowupHistoryModal, setShowFollowupHistoryModal] = useState(false);
    const [selectedLeadHistory, setSelectedLeadHistory] = useState(null);
    const [viewMessage, setViewMessage] = useState(null);

    useEffect(() => {
        if (!token) return;

        fetchLeads();
        fetchSalesmen();
        fetchReports();
        fetchFollowupStatusLeads();

        // Auto-refresh data every 30 seconds
        const pollInterval = setInterval(() => {
            fetchLeads();
            fetchReports();
            fetchFollowupStatusLeads();
        }, 30000);

        return () => clearInterval(pollInterval);
    }, [token]);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(res.data);
            setLastSync(new Date().toLocaleTimeString());
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                logout();
            }
        }
    };

    const fetchSalesmen = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/users/salesmen', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSalesmen(res.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                logout();
            }
        }
    };

    const fetchReports = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/admin-reports', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(res.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                logout();
            }
        }
    };

    const fetchFollowupStatusLeads = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/followup-status/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFollowupStatusLeads(res.data.leads || []);
            setFollowupStats(res.data.stats);
        } catch (err) {
            console.error('Error fetching follow-up status leads:', err);
            if (err.response?.status === 401) {
                logout();
            }
        }
    };

    const fetchLeadFollowupHistory = async (leadId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/leads/followup-history/lead/${leadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedLeadHistory(res.data);
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

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/leads/assign',
                { leadId: selectedLead, salesmanId: parseInt(selectedSalesman) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSelectedLead(null);
            fetchLeads();
            fetchReports();
            alert('Lead assigned successfully!');
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                logout();
            } else {
                alert('Failed to assign lead.');
            }
        }
    };

    const handleRegisterSalesman = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/users/register',
                { ...newSalesman, role: 'salesman' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowSalesmanModal(false);
            setNewSalesman({ name: '', email: '', password: '' });
            fetchSalesmen();
            fetchReports();
            alert('Salesman created successfully!');
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                logout();
            } else {
                alert('Failed to create salesman.');
            }
        }
    };

    const getStatusCount = (status) => {
        return reports?.overallStatus?.find(s => s.status === status)?.count || 0;
    };

    return (
        <div className="bg-gray-50/50 min-h-screen">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10">
                {/* Mobile-friendly touch targets */}
                <style jsx>{`
                    @media (max-width: 640px) {
                        button, a {
                            min-height: 44px;
                            min-width: 44px;
                        }
                        input, select, textarea {
                            min-height: 44px;
                        }
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 4px;
                            height: 4px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: #f1f1f1;
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #888;
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #555;
                        }
                    }
                `}</style>
                {/* Premium Glass Header */}
                <header className="flex flex-col justify-between items-start p-4 sm:p-6 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 sm:-mr-32 sm:-mt-32"></div>
                    <div className="relative z-10 w-full">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">Control Center</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-1">
                            <p className="text-gray-500 font-medium text-sm">Strategic oversight for <span className="text-blue-600 font-bold">Premier Enterprises</span></p>
                            <div className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live: {lastSync}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6 relative z-10 w-full sm:w-auto">
                        <button
                            onClick={() => setShowSalesmanModal(true)}
                            className="w-full sm:w-auto bg-gray-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-[24px] font-black text-sm hover:scale-105 transition-all shadow-xl shadow-gray-300 flex items-center justify-center space-x-3 active:scale-95 touch-manipulation"
                        >
                            <UserPlus size={20} />
                            <span>Onboard Salesman</span>
                        </button>
                        <button
                            onClick={async () => { 
                                try {
                                    const res = await axios.post('http://localhost:5000/api/refresh-emails', {}, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    alert(`Email refresh completed! Processed: ${res.data.processed}, Skipped: ${res.data.skipped}`);
                                    fetchLeads(); 
                                    fetchReports(); 
                                } catch (error) {
                                    console.error('Refresh error:', error);
                                    alert('Failed to refresh emails. Please try again.');
                                }
                            }}
                            className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-[24px] border-2 border-gray-100 hover:border-gray-200 transition-all text-gray-400 hover:text-gray-900 touch-manipulation"
                            title="Fetch new emails from inbox"
                        >
                            <RefreshCw size={24} />
                        </button>
                    </div>
                </header>

                {/* Tracking Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Leads', value: leads.length, icon: <Mail />, color: 'blue' },
                        { label: 'Deals Won', value: getStatusCount('Deal Won'), icon: <TrendingUp />, color: 'emerald' },
                        { label: 'In Pipeline', value: getStatusCount('Assigned') + getStatusCount('Follow-up'), icon: <Target />, color: 'amber' },
                        { label: 'Revenue Generated', value: `₹${reports?.salesmanPerf?.reduce((acc, s) => acc + parseFloat(s.total_revenue), 0).toLocaleString() || 0}`, icon: <RupeeIcon />, color: 'indigo' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-3 sm:space-x-4 hover:shadow-md transition-all">
                            <div className={`p-3 sm:p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl sm:rounded-2xl flex-shrink-0`}>
                                {stat.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-black text-gray-400 capitalize tracking-widest block mb-0.5">{stat.label}</span>
                                <span className="text-lg sm:text-2xl font-black text-gray-900 leading-none truncate">{stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabbed Interface */}
                <div className="space-y-6">
                    <div className="flex p-2 bg-white rounded-2xl sm:rounded-[32px] border border-gray-100 w-full shadow-sm overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('leads')}
                            className={`flex items-center space-x-2 sm:space-x-3 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[24px] font-black text-sm transition-all whitespace-nowrap touch-manipulation ${activeTab === 'leads' ? 'bg-gray-900 text-white shadow-xl px-6 sm:px-12' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Target size={16} />
                            <span className="hidden xs:inline">Lead Tracker</span>
                            <span className="xs:hidden">Leads</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`flex items-center space-x-2 sm:space-x-3 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[24px] font-black text-sm transition-all whitespace-nowrap ${activeTab === 'performance' ? 'bg-gray-900 text-white shadow-xl px-6 sm:px-12' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <BarChart2 size={16} />
                            <span className="hidden xs:inline">Sales Performance</span>
                            <span className="xs:hidden">Performance</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('followup')}
                            className={`flex items-center space-x-2 sm:space-x-3 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[24px] font-black text-sm transition-all whitespace-nowrap ${activeTab === 'followup' ? 'bg-gray-900 text-white shadow-xl px-6 sm:px-12' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Clock size={16} />
                            <span className="hidden xs:inline">Follow-up Status</span>
                            <span className="xs:hidden">Follow-up</span>
                        </button>
                    </div>

                    {activeTab === 'leads' ? (
                        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                <h2 className="text-base sm:text-lg font-black text-gray-900">Lead Database</h2>
                                <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">{leads.length} Records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left table-auto min-w-[600px]">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/10">
                                            <th className="px-3 sm:px-6 py-2 sm:py-4">Identity</th>
                                            <th className="px-3 sm:px-6 py-2 sm:py-4">Contact & Automation</th>
                                            <th className="px-3 sm:px-6 py-2 sm:py-4">Lead Content</th>
                                            <th className="px-3 sm:px-6 py-2 sm:py-4">Assigned To</th>
                                            <th className="px-3 sm:px-6 py-2 sm:py-4">Status</th>
                                            <th className="px-3 sm:px-6 py-2 sm:py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {leads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-blue-50/20 transition-all group">
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="font-extrabold text-gray-900 text-sm sm:text-base">{lead.sender_name || 'Anonymous'}</div>
                                                    <div className="text-gray-400 font-medium text-xs">{lead.sender_email}</div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="flex flex-col space-y-2">
                                                        <div className="font-bold text-gray-900 flex items-center space-x-2">
                                                            {lead.phone ? (
                                                                <a href={`tel:${lead.phone}`} className="hover:text-blue-600 transition-colors flex items-center space-x-2 text-sm">
                                                                    <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                                                    <span className="truncate">{lead.phone}</span>
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-400 text-sm">No Number</span>
                                                            )}
                                                        </div>
                                                        {lead.phone && (
                                                            <a
                                                                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-emerald-500 hover:text-emerald-600 transition-colors flex items-center space-x-1 text-sm"
                                                            >
                                                                <MessageSquare size={12} className="flex-shrink-0" />
                                                                <span>WhatsApp</span>
                                                            </a>
                                                        )}
                                                        <div className="mt-1">
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${lead.whatsapp_status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                    lead.whatsapp_status === 'Failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                        lead.whatsapp_status === 'Not Configured' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                            'bg-gray-50 text-gray-400 border border-gray-100'
                                                                }`}>
                                                                WA: {lead.whatsapp_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 max-w-xs">
                                                    <div
                                                        onClick={() => setViewMessage(lead)}
                                                        className="cursor-pointer hover:bg-gray-100 p-2 rounded-xl transition-all border border-transparent hover:border-blue-100 group/msg"
                                                    >
                                                        <div className="font-bold text-[10px] text-gray-400 mb-0.5 uppercase tracking-tight truncate group-hover/msg:text-blue-500">{lead.subject}</div>
                                                        <div className="text-xs text-gray-600 line-clamp-1">{lead.body}</div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide bg-gray-50 text-gray-500 border border-gray-100`}>
                                                            {lead.source || 'Direct'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    {lead.assigned_to ? (
                                                        <div className="flex items-center space-x-2 bg-gray-50 rounded-xl px-2 py-1 border border-gray-100 w-fit">
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                                                                {salesmen.find(s => s.id === lead.assigned_to)?.name?.[0] || 'U'}
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[100px] sm:max-w-none">{salesmen.find(s => s.id === lead.assigned_to)?.name || 'Admin'}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${lead.status === 'New' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' :
                                                        lead.status === 'Assigned' ? 'bg-purple-50 text-purple-700 ring-purple-700/10' :
                                                            lead.status === 'Deal Won' ? 'bg-emerald-50 text-emerald-700 ring-emerald-700/10' :
                                                                'bg-gray-50 text-gray-600 ring-gray-600/10'
                                                        }`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="flex justify-center">
                                                        {!lead.assigned_to ? (
                                                            <button
                                                                onClick={() => setSelectedLead(lead.id)}
                                                                className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-black transition-all shadow-sm flex items-center space-x-1.5"
                                                            >
                                                                <UserPlus size={12} />
                                                                <span className="hidden sm:inline">Assign</span>
                                                            </button>
                                                        ) : (
                                                            <button className="text-gray-300 hover:text-blue-500 transition-colors">
                                                                <ExternalLink size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeTab === 'followup' ? (
                        <div className="space-y-6">
                            {/* Follow-up Status Overview Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-blue-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 sm:p-3 bg-blue-600 rounded-xl sm:rounded-2xl">
                                            <Target className="text-white" size={16} />
                                        </div>
                                        <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Total</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">{followupStatusLeads.length}</h3>
                                    <p className="text-xs sm:text-sm text-blue-700 font-medium">Leads in Follow-up</p>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 sm:p-3 bg-amber-600 rounded-xl sm:rounded-2xl">
                                            <Clock className="text-white" size={16} />
                                        </div>
                                        <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Pending</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
                                        {parseInt(followupStatusLeads.reduce((acc, lead) => acc + (parseInt(lead.pending_followups) || 0), 0)).toLocaleString()}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-amber-700 font-medium">Follow-ups Pending</p>
                                </div>

                                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-red-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 sm:p-3 bg-red-600 rounded-xl sm:rounded-2xl">
                                            <XCircle className="text-white" size={16} />
                                        </div>
                                        <span className="text-xs font-black text-red-700 uppercase tracking-widest">Overdue</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
                                        {followupStatusLeads.filter(lead => 
                                            lead.followupHistory.some(f => f.urgency_status === 'overdue')
                                        ).length}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-red-700 font-medium">Overdue Follow-ups</p>
                                </div>

                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 sm:p-3 bg-emerald-600 rounded-xl sm:rounded-2xl">
                                            <CheckCircle className="text-white" size={16} />
                                        </div>
                                        <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Today</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
                                        {followupStatusLeads.filter(lead => 
                                            lead.followupHistory.some(f => f.urgency_status === 'today')
                                        ).length}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-emerald-700 font-medium">Today's Follow-ups</p>
                                </div>
                            </div>

                            {/* Follow-up Leads Table */}
                            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                    <h2 className="text-base sm:text-lg font-black text-gray-900">Leads in Follow-up Status</h2>
                                    <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                                        {followupStatusLeads.length} Leads
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead>
                                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/10">
                                                <th className="px-3 sm:px-6 py-2 sm:py-4">Lead Information</th>
                                                <th className="px-3 sm:px-6 py-2 sm:py-4">Assigned To</th>
                                                <th className="px-3 sm:px-6 py-2 sm:py-4">Follow-up Summary</th>
                                                <th className="px-3 sm:px-6 py-2 sm:py-4">Next Action</th>
                                                <th className="px-3 sm:px-6 py-2 sm:py-4">Status</th>
                                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {followupStatusLeads.map(lead => {
                                                const hasTodayFollowup = lead.followupHistory.some(f => f.urgency_status === 'today');
                                                return (
                                                <tr key={lead.id} className={`hover:bg-blue-50/20 transition-all ${hasTodayFollowup ? 'bg-emerald-50/30 border-l-4 border-emerald-500' : ''}`}>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                        <div className="flex items-start space-x-2">
                                                            <div className="flex-1">
                                                                <div className="font-extrabold text-gray-900 text-sm sm:text-base">{lead.sender_name}</div>
                                                                <div className="text-gray-400 font-medium text-xs truncate max-w-[200px]">{lead.sender_email}</div>
                                                                {lead.phone && (
                                                                    <div className="text-xs text-gray-500 mt-1">{lead.phone}</div>
                                                                )}
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    Created: {new Date(lead.lead_created).toLocaleDateString()}
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
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                        {lead.assigned_salesman ? (
                                                            <div className="flex items-center space-x-2 bg-gray-50 rounded-xl px-2 py-1 border border-gray-100 w-fit">
                                                                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                                                                    {lead.assigned_salesman[0]}
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-700 truncate max-w-[80px] sm:max-w-none">{lead.assigned_salesman}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-medium text-gray-500">Total:</span>
                                                                <span className="text-xs font-bold text-gray-900">{lead.total_followups}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-medium text-emerald-600">Completed:</span>
                                                                <span className="text-xs font-bold text-emerald-600">{lead.completed_followups}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-medium text-amber-600">Pending:</span>
                                                                <span className="text-xs font-bold text-amber-600">{lead.pending_followups}</span>
                                                            </div>
                                                            {lead.missed_followups > 0 && (
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs font-medium text-red-600">Missed:</span>
                                                                    <span className="text-xs font-bold text-red-600">{lead.missed_followups}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs">
                                                            {lead.upcoming_followup ? (
                                                                <div>
                                                                    <div className="font-bold text-gray-900">
                                                                        {new Date(lead.upcoming_followup).toLocaleDateString()}
                                                                    </div>
                                                                    <div className="text-gray-500">
                                                                        {new Date(lead.upcoming_followup).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400">No scheduled follow-up</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            {lead.followupHistory.slice(0, 2).map((followup, index) => (
                                                                <div key={index} className="flex items-center space-x-2">
                                                                    <span className={`w-2 h-2 rounded-full ${
                                                                        followup.urgency_status === 'overdue' ? 'bg-red-500' :
                                                                        followup.urgency_status === 'today' ? 'bg-emerald-500' :
                                                                        followup.urgency_status === 'upcoming' ? 'bg-blue-500' :
                                                                        followup.status === 'Completed' ? 'bg-gray-400' :
                                                                        'bg-amber-500'
                                                                    }`}></span>
                                                                    <span className="text-xs text-gray-600">{followup.status}</span>
                                                                    <span className="text-xs text-gray-400">
                                                                        {new Date(followup.followup_date).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {lead.followupHistory.length > 2 && (
                                                                <div className="text-xs text-gray-400">
                                                                    +{lead.followupHistory.length - 2} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center space-x-2">
                                                            <button
                                                                onClick={() => {/* View details logic */}}
                                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                title="View complete follow-up history"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </button>
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
                                    
                                    {followupStatusLeads.length === 0 && (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Target className="text-gray-400" size={24} />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">No leads in follow-up status</h3>
                                            <p className="text-sm text-gray-500">All leads are either new, assigned, or closed</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Performance Overview Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 sm:p-3 bg-emerald-600 rounded-xl sm:rounded-2xl">
                                            <TrendingUp className="text-white" size={16} />
                                        </div>
                                        <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">This Month</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">{reports?.salesmanPerf?.reduce((acc, s) => acc + parseInt(s.deals_won), 0) || 0}</h3>
                                    <p className="text-xs sm:text-sm text-emerald-700 font-medium">Total Deals Closed</p>
                                    <div className="mt-3 flex items-center space-x-2">
                                        <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full font-medium">+23%</span>
                                        <span className="text-xs text-emerald-600">vs last month</span>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-blue-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 sm:p-3 bg-blue-600 rounded-xl sm:rounded-2xl">
                                            <RupeeIcon className="text-white" size={16} />
                                        </div>
                                        <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Revenue</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">₹{reports?.salesmanPerf?.reduce((acc, s) => acc + parseFloat(s.total_revenue), 0).toLocaleString() || 0}</h3>
                                    <p className="text-xs sm:text-sm text-blue-700 font-medium">Total Revenue Generated</p>
                                    <div className="mt-3 flex items-center space-x-2">
                                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">+15%</span>
                                        <span className="text-xs text-blue-600">growth rate</span>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 sm:p-8 rounded-3xl border border-amber-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-amber-600 rounded-2xl">
                                            <Target className="text-white" size={20} />
                                        </div>
                                        <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Conversion</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-1">
                                        {reports?.salesmanPerf?.length > 0 ? 
                                            (reports.salesmanPerf.reduce((acc, s) => acc + (parseInt(s.total_assigned) > 0 ? (parseInt(s.deals_won) / parseInt(s.total_assigned)) * 100 : 0), 0) / reports.salesmanPerf.length).toFixed(1) 
                                            : 0}%
                                    </h3>
                                    <p className="text-sm text-amber-700 font-medium">Average Success Rate</p>
                                    <div className="mt-3 flex items-center space-x-2">
                                        <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-full font-medium">+8%</span>
                                        <span className="text-xs text-amber-600">improvement</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sales Team Performance Table */}
                            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                    <h2 className="text-xl font-black text-gray-900 italic">Sales Team Performance Leaderboard</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                                <th className="p-8">Team Member</th>
                                                <th className="p-8">Workload</th>
                                                <th className="p-8">Conversion (Won)</th>
                                                <th className="p-8">Lost Opportunity</th>
                                                <th className="p-8">Total Revenue</th>
                                                <th className="p-8">Success Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {reports?.salesmanPerf?.map(s => {
                                                const total = parseInt(s.total_assigned) || 0;
                                                const won = parseInt(s.deals_won) || 0;
                                                const lost = parseInt(s.deals_lost) || 0;
                                                const rate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;
                                                const revenue = parseFloat(s.total_revenue) || 0;

                                                return (
                                                    <tr key={s.id} className="hover:bg-blue-50/20 transition-all">
                                                        <td className="p-8">
                                                            <div className="flex items-center space-x-4">
                                                                <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                                                                    {s.name[0]}
                                                                </div>
                                                                <div>
                                                                    <div className="font-extrabold text-gray-900">{s.name}</div>
                                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active Consultant</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="font-black text-gray-900 text-lg">{s.total_assigned} <span className="text-xs text-gray-400 font-medium">Leads</span></div>
                                                            <div className="mt-1 text-xs text-gray-500">Active: {won + lost}</div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex items-center space-x-2 text-emerald-600">
                                                                <CheckCircle size={16} />
                                                                <span className="font-black text-lg">{s.deals_won}</span>
                                                            </div>
                                                            <div className="mt-1 text-xs text-emerald-600 font-medium">Won Deals</div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex items-center space-x-2 text-red-500">
                                                                <XCircle size={16} />
                                                                <span className="font-black text-lg">{s.deals_lost}</span>
                                                            </div>
                                                            <div className="mt-1 text-xs text-red-500 font-medium">Lost Deals</div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="font-black text-gray-900 text-xl font-mono">₹{revenue.toLocaleString()}</div>
                                                            <div className="mt-1 text-xs text-gray-500">Total Revenue</div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden relative shadow-inner flex-1">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                                                                        style={{ width: `${rate}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-sm font-black text-blue-600 min-w-[50px] text-right">{rate}%</span>
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-500">Success Rate</div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Salesman Modal */}
            {showSalesmanModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                    <div className="bg-white rounded-2xl sm:rounded-[40px] p-6 sm:p-12 max-w-md w-full shadow-2xl animate-in relative border border-white max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 sm:mb-8">
                            <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight italic">New Consultant</h2>
                            <button onClick={() => setShowSalesmanModal(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRegisterSalesman} className="space-y-4 sm:space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Full Identity</label>
                                <input
                                    type="text" className="w-full p-3 sm:p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl sm:rounded-2xl outline-none transition-all font-bold"
                                    placeholder="e.g. Victor Sullivan"
                                    value={newSalesman.name}
                                    onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Corporate Email</label>
                                <input
                                    type="email" className="w-full p-3 sm:p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl sm:rounded-2xl outline-none transition-all font-bold"
                                    placeholder="sales.pro@company.com"
                                    value={newSalesman.email}
                                    onChange={(e) => setNewSalesman({ ...newSalesman, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Access Credential</label>
                                <input
                                    type="password" className="w-full p-3 sm:p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl sm:rounded-2xl outline-none transition-all font-bold"
                                    placeholder="Minimum 8 characters"
                                    value={newSalesman.password}
                                    onChange={(e) => setNewSalesman({ ...newSalesman, password: e.target.value })}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 sm:py-5 bg-gray-900 text-white rounded-xl sm:rounded-[24px] font-black text-sm sm:text-lg hover:bg-black transition-all shadow-2xl shadow-gray-400 mt-4 sm:mt-6 active:scale-95"
                            >
                                Activate Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {selectedLead && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                    <div className="bg-white rounded-2xl sm:rounded-[40px] p-6 sm:p-12 max-w-md w-full shadow-2xl animate-in border border-white max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 sm:mb-8 text-center w-full">
                            <div className="w-full">
                                <h2 className="text-xl sm:text-3xl font-black text-gray-900 italic">Delegate Lead</h2>
                                <p className="text-gray-400 text-sm font-medium mt-1">Select the best closer for this deal</p>
                            </div>
                        </div>
                        <form onSubmit={handleAssign}>
                            <div className="mb-6 sm:mb-10">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Available Team Members</label>
                                <div className="grid grid-cols-1 gap-3 max-h-48 sm:max-h-60 overflow-y-auto px-1 custom-scrollbar">
                                    {salesmen.map(s => (
                                        <div key={s.id} className="relative">
                                            <input
                                                type="radio" name="salesman" id={`s-${s.id}`} className="peer hidden"
                                                value={s.id} onChange={(e) => setSelectedSalesman(e.target.value)} required
                                            />
                                            <label
                                                htmlFor={`s-${s.id}`}
                                                className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border-2 border-gray-100 rounded-xl sm:rounded-2xl cursor-pointer hover:bg-gray-50 transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50"
                                            >
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 text-white rounded-lg sm:rounded-xl flex items-center justify-center font-black text-sm sm:text-base">{s.name[0]}</div>
                                                <span className="font-extrabold text-gray-800 text-sm sm:text-base">{s.name}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3 sm:space-y-4">
                                <button
                                    type="submit"
                                    className="w-full py-3 sm:py-5 bg-blue-600 text-white rounded-xl sm:rounded-[24px] font-black text-sm sm:text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-100 active:scale-95"
                                >
                                    Confirm Delegation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLead(null)}
                                    className="w-full py-3 sm:py-4 text-gray-400 font-bold hover:text-gray-900 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Follow-up History Modal */}
            {showFollowupHistoryModal && selectedLeadHistory && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                    <div className="bg-white rounded-2xl sm:rounded-[40px] p-4 sm:p-8 max-w-4xl w-full shadow-2xl animate-in border border-white max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 sm:mb-8">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl sm:text-3xl font-black text-gray-900 italic">Follow-up History</h2>
                                <p className="text-gray-400 text-sm font-medium mt-1 truncate">
                                    {selectedLeadHistory.leadDetails?.sender_name} - {selectedLeadHistory.leadDetails?.sender_email}
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowFollowupHistoryModal(false)}
                                className="text-gray-400 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition flex-shrink-0"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Lead Summary */}
                        <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Lead Subject</span>
                                    <p className="font-bold text-gray-900 mt-1 text-sm sm:text-base truncate">{selectedLeadHistory.leadDetails?.subject || 'No subject'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Assigned To</span>
                                    <p className="font-bold text-gray-900 mt-1 text-sm sm:text-base truncate">{selectedLeadHistory.leadDetails?.assigned_salesman || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Follow-ups</span>
                                    <p className="font-bold text-gray-900 mt-1 text-sm sm:text-base">{selectedLeadHistory.followupHistory?.length || 0}</p>
                                </div>
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
                                                        <div className={`p-3 rounded-full ${
                                                            followup.status === 'Completed' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
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
                                                    <div className={`flex-1 rounded-2xl p-4 border ${
                                                        followup.status === 'Completed' ? 'bg-emerald-50 border-emerald-100' :
                                                        followup.status === 'Pending' ? 'bg-amber-50 border-amber-100' :
                                                        followup.status === 'Missed' ? 'bg-red-50 border-red-100' :
                                                        'bg-gray-50 border-gray-100'
                                                    }`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className={`text-xs font-black uppercase tracking-widest ${
                                                                followup.status === 'Completed' ? 'text-emerald-600' :
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

            {/* Message Detail Modal */}
            {viewMessage && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[120] backdrop-blur-lg">
                    <div className="bg-white rounded-2xl sm:rounded-[40px] p-4 sm:p-10 max-w-3xl w-full shadow-2xl animate-in max-h-[85vh] overflow-hidden border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex-shrink-0">
                                    <MessageSquare size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg sm:text-2xl font-black text-gray-900 leading-tight truncate">Client Requirement</h3>
                                    <p className="text-gray-500 font-medium text-sm truncate">From: <span className="text-blue-600 font-bold">{viewMessage.sender_name}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setViewMessage(null)} className="bg-gray-100 text-gray-400 hover:text-gray-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl transition hover:rotate-90 flex-shrink-0">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="bg-gray-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 border border-gray-100">
                            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Subject Line</span>
                                <h4 className="text-base sm:text-lg font-bold text-gray-900">{viewMessage.subject}</h4>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Message Body</span>
                                <div className="text-gray-700 leading-relaxed font-medium whitespace-pre-line text-sm sm:text-lg">
                                    {viewMessage.body}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-8 flex space-x-3 sm:space-x-4">
                            <button
                                onClick={() => setViewMessage(null)}
                                className="px-6 sm:px-8 py-3 sm:py-4 bg-gray-100 text-gray-500 rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg hover:bg-gray-200 transition"
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

export default AdminDashboard;
