import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, RefreshCw, Phone, MessageSquare, Clock, Target, TrendingUp, User, Mail, ExternalLink, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const SalesmanDetailView = () => {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const { salesmanId } = useParams();
    
    const [salesman, setSalesman] = useState(null);
    const [leads, setLeads] = useState([]);
    const [todayFollowups, setTodayFollowups] = useState([]);
    const [overdueFollowups, setOverdueFollowups] = useState([]);
    const [stats, setStats] = useState(null);
    const [kpiData, setKpiData] = useState({
        total: 0,
        won: 0,
        missed: 0,
        successRate: 0.0
    });
    const [loading, setLoading] = useState(true);

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
                return followupDate < today && f.status === 'Pending';
            });
            console.log('Overdue followups:', overdue);
            setOverdueFollowups(overdue);

            // Fetch real KPI data
            fetchKPIData();

            // Calculate remaining stats (keep for compatibility)
            const totalLeads = leadsRes.data.length;
            const wonLeads = leadsRes.data.filter(l => l.status === 'Won').length;
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

    const hasMissedFollowup = (lead) => {
        return overdueFollowups.some(f => f.lead_id === lead.id);
    };

    const hasTodayFollowup = (lead) => {
        return todayFollowups.some(f => f.lead_id === lead.id);
    };

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
                    <h3 className="text-2xl font-black text-gray-900">{kpiData.total}</h3>
                    <p className="text-sm text-gray-600">Leads Assigned</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <CheckCircle className="text-emerald-600" size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">WON</span>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600">{kpiData.won}</h3>
                    <p className="text-sm text-gray-600">Deals Closed</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <AlertCircle className="text-red-600" size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">MISSED</span>
                    </div>
                    <h3 className="text-2xl font-black text-red-600">{kpiData.missed}</h3>
                    <p className="text-sm text-gray-600">Overdue Follow-ups</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <TrendingUp className="text-purple-600" size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 uppercase">RATE</span>
                    </div>
                    <h3 className="text-2xl font-black text-purple-600">{kpiData.successRate}%</h3>
                    <p className="text-sm text-gray-600">Success Rate</p>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <h2 className="text-xl font-black text-gray-900 italic">All Leads</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                <th className="p-6">Client Profile</th>
                                <th className="p-6">Contact Details</th>
                                <th className="p-6">Requirement</th>
                                <th className="p-6">Current Status</th>
                                <th className="p-6">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-300 italic font-medium">No leads found for this salesman.</td>
                                </tr>
                            ) : leads.map(lead => {
                                const hasTodayFollowupLocal = hasTodayFollowup(lead);
                                const hasMissedFollowupLocal = hasMissedFollowup(lead);
                                
                                return (
                                    <tr key={lead.id} className={`hover:bg-blue-50/20 transition-all group ${
                                        hasTodayFollowupLocal ? 'bg-emerald-50/30 border-l-4 border-emerald-500' : 
                                        hasMissedFollowupLocal ? 'bg-red-50/50 border-l-4 border-red-500' : ''
                                    }`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg">
                                                        {lead.sender_name?.[0] || 'A'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="font-extrabold text-gray-900 text-sm">{lead.sender_name || 'Anonymous User'}</div>
                                                            {hasMissedFollowupLocal && (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-200 animate-pulse">
                                                                    MISSED
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-400">{lead.sender_email}</div>
                                                    </div>
                                                </div>
                                                {hasTodayFollowupLocal && (
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
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} className="font-black text-gray-900 text-sm hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                                                        <Phone size={12} className="text-gray-400" />
                                                        <span>{lead.phone}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No phone</span>
                                                )}
                                                {lead.whatsapp_number && (
                                                    <a href={`https://wa.me/${lead.whatsapp_number.replace(/[^\d]/g, '')}`} className="text-emerald-600 hover:text-emerald-800 transition-colors">
                                                        <MessageSquare size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-xl transition-all border border-transparent hover:border-blue-100 group/msg">
                                                <div className="font-bold text-[10px] text-gray-400 mb-0.5 uppercase tracking-tight truncate group-hover/msg:text-blue-500">{lead.subject}</div>
                                                <div className="text-xs text-gray-600 line-clamp-1">{lead.body}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${
                                                    lead.status === 'Follow-up' && hasMissedFollowupLocal ? 
                                                        'bg-red-100 text-red-800 ring-red-800/20 animate-pulse' :
                                                    lead.status === 'Won' ? 'bg-emerald-50 text-emerald-700 ring-emerald-700/10' :
                                                    lead.status === 'Follow-up' ? 'bg-amber-50 text-amber-700 ring-amber-700/10' :
                                                        'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                }`}>
                                                    {lead.status}
                                                </span>
                                                {lead.status === 'Follow-up' && hasMissedFollowupLocal && (
                                                    <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                                        MISSED
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center space-x-2">
                                                <button className="text-gray-300 hover:text-blue-500 transition-colors">
                                                    <ExternalLink size={16} />
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
        </div>
    );
};

export default SalesmanDetailView;
