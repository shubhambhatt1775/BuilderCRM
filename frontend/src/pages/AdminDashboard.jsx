import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, User, Clock, CheckCircle, XCircle, TrendingUp, DollarSign, Target, BarChart2, RefreshCw, ExternalLink } from 'lucide-react';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [leads, setLeads] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [reports, setReports] = useState(null);
    const [activeTab, setActiveTab] = useState('leads');
    const [showSalesmanModal, setShowSalesmanModal] = useState(false);
    const [newSalesman, setNewSalesman] = useState({ name: '', email: '', password: '' });
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        fetchLeads();
        fetchSalesmen();
        fetchReports();

        // Auto-refresh data every 30 seconds
        const pollInterval = setInterval(() => {
            fetchLeads();
            fetchReports();
        }, 30000);

        return () => clearInterval(pollInterval);
    }, []);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(res.data);
            setLastSync(new Date().toLocaleTimeString());
        } catch (err) {
            console.error(err);
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
            alert('Failed to assign lead.');
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
            alert('Failed to create salesman.');
        }
    };

    const getStatusCount = (status) => {
        return reports?.overallStatus?.find(s => s.status === status)?.count || 0;
    };

    return (
        <div className="bg-gray-50/50 min-h-screen">
            <div className="p-8 max-w-7xl mx-auto space-y-10">
                {/* Premium Glass Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white shadow-2xl shadow-gray-200/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">Control Center</h1>
                        <div className="flex items-center space-x-2 mt-1">
                            <p className="text-gray-500 font-medium text-sm">Strategic oversight for <span className="text-blue-600 font-bold">Premier Enterprises</span></p>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live: {lastSync}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-6 md:mt-0 relative z-10">
                        <button
                            onClick={() => setShowSalesmanModal(true)}
                            className="bg-gray-900 text-white px-8 py-4 rounded-[24px] font-black text-sm hover:scale-105 transition-all shadow-xl shadow-gray-300 flex items-center space-x-3 active:scale-95"
                        >
                            <UserPlus size={20} />
                            <span>Onboard Salesman</span>
                        </button>
                        <button
                            onClick={() => { fetchLeads(); fetchReports(); }}
                            className="bg-white p-4 rounded-[24px] border-2 border-gray-100 hover:border-gray-200 transition-all text-gray-400 hover:text-gray-900"
                        >
                            <RefreshCw size={24} />
                        </button>
                    </div>
                </header>

                {/* Tracking Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Leads', value: leads.length, icon: <Mail />, color: 'blue' },
                        { label: 'Deals Won', value: getStatusCount('Deal Won'), icon: <TrendingUp />, color: 'emerald' },
                        { label: 'In Pipeline', value: getStatusCount('Assigned') + getStatusCount('Follow-up'), icon: <Target />, color: 'amber' },
                        { label: 'Revenue Generated', value: `$${reports?.salesmanPerf?.reduce((acc, s) => acc + parseFloat(s.total_revenue), 0).toLocaleString() || 0}`, icon: <DollarSign />, color: 'indigo' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-8 rounded-[36px] border border-gray-100 shadow-sm flex items-center space-x-6 hover:shadow-xl hover:-translate-y-1 transition-all">
                            <div className={`p-5 bg-${stat.color}-50 text-${stat.color}-600 rounded-[28px] shadow-inner`}>
                                {stat.icon}
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-gray-400 capitalize tracking-widest block mb-1">{stat.label}</span>
                                <span className="text-3xl font-black text-gray-900 leading-none">{stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabbed Interface */}
                <div className="space-y-6">
                    <div className="flex p-2 bg-white rounded-[32px] border border-gray-100 w-fit shadow-sm">
                        <button
                            onClick={() => setActiveTab('leads')}
                            className={`flex items-center space-x-3 px-8 py-4 rounded-[24px] font-black text-sm transition-all ${activeTab === 'leads' ? 'bg-gray-900 text-white shadow-xl px-12' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Target size={18} />
                            <span>Lead Tracker</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`flex items-center space-x-3 px-8 py-4 rounded-[24px] font-black text-sm transition-all ${activeTab === 'performance' ? 'bg-gray-900 text-white shadow-xl px-12' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <BarChart2 size={18} />
                            <span>Sales Performance</span>
                        </button>
                    </div>

                    {activeTab === 'leads' ? (
                        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                <h2 className="text-xl font-black text-gray-900 italic">Centralized Lead Pool</h2>
                                <span className="text-xs font-bold text-gray-400 bg-white px-4 py-2 rounded-full border border-gray-100">{leads.length} Total Records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                            <th className="p-8">Prospect Identity</th>
                                            <th className="p-8">Requirement Body</th>
                                            <th className="p-8">Assignment</th>
                                            <th className="p-8">Status</th>
                                            <th className="p-8 text-center">Operation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {leads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-blue-50/20 transition-all group">
                                                <td className="p-8">
                                                    <div className="font-extrabold text-gray-900 text-lg">{lead.sender_name || 'Anonymous Prospect'}</div>
                                                    <div className="text-gray-400 font-medium text-sm flex items-center space-x-1">
                                                        <span>{lead.sender_email}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="font-bold text-gray-900 text-xs truncate max-w-[200px] mb-1">{lead.subject}</div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${lead.source === 'GitHub' ? 'bg-gray-100 text-gray-700' :
                                                            lead.source === 'Vercel' ? 'bg-blue-50 text-blue-600' :
                                                                lead.source === 'MagicBricks' ? 'bg-red-50 text-red-600' :
                                                                    'bg-gray-50 text-gray-400'
                                                            }`}>
                                                            {lead.source || 'Direct Email'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    {lead.assigned_to ? (
                                                        <div className="flex items-center space-x-3 bg-gray-50 rounded-2xl p-3 border border-gray-100 w-fit">
                                                            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-black ring-4 ring-blue-50">
                                                                {salesmen.find(s => s.id === lead.assigned_to)?.name?.[0] || 'U'}
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-700">{salesmen.find(s => s.id === lead.assigned_to)?.name || 'Processing'}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-black text-amber-500 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 tracking-widest uppercase">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="p-8 text-center">
                                                    <span className={`status-badge status-${lead.status.toLowerCase().replace(' ', '-')} ring-4 ring-opacity-10`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex justify-center">
                                                        {!lead.assigned_to ? (
                                                            <button
                                                                onClick={() => setSelectedLead(lead.id)}
                                                                className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg shadow-blue-100 flex items-center space-x-2 active:scale-95"
                                                            >
                                                                <UserPlus size={16} />
                                                                <span>Delegate</span>
                                                            </button>
                                                        ) : (
                                                            <button className="text-gray-300 hover:text-blue-500 transition-colors p-2">
                                                                <ExternalLink size={20} />
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
                    ) : (
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
                                            const rate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

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
                                                    <td className="p-8 p-8">
                                                        <div className="font-black text-gray-900 text-lg">{s.total_assigned} <span className="text-xs text-gray-400 font-medium">Leads</span></div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex items-center space-x-2 text-emerald-600">
                                                            <CheckCircle size={16} />
                                                            <span className="font-black text-lg">{s.deals_won}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex items-center space-x-2 text-red-500">
                                                            <XCircle size={16} />
                                                            <span className="font-black text-lg">{s.deals_lost}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="font-black text-gray-900 text-xl font-mono">${parseFloat(s.total_revenue).toLocaleString()}</div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden relative shadow-inner">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                                                                style={{ width: `${rate}%` }}
                                                            ></div>
                                                            <span className="absolute right-0 -top-6 text-[10px] font-black text-blue-600">{rate}% SUCCESS</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Salesman Modal */}
            {showSalesmanModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                    <div className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl animate-in relative border border-white">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight italic">New Consultant</h2>
                            <button onClick={() => setShowSalesmanModal(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition">
                                <XCircle size={28} />
                            </button>
                        </div>
                        <form onSubmit={handleRegisterSalesman} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Full Identity</label>
                                <input
                                    type="text" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                    placeholder="e.g. Victor Sullivan"
                                    value={newSalesman.name}
                                    onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Corporate Email</label>
                                <input
                                    type="email" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                    placeholder="sales.pro@company.com"
                                    value={newSalesman.email}
                                    onChange={(e) => setNewSalesman({ ...newSalesman, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Access Credential</label>
                                <input
                                    type="password" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                    placeholder="Minimum 8 characters"
                                    value={newSalesman.password}
                                    onChange={(e) => setNewSalesman({ ...newSalesman, password: e.target.value })}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg hover:bg-black transition-all shadow-2xl shadow-gray-400 mt-6 active:scale-95"
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
                    <div className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl animate-in border border-white">
                        <div className="flex justify-between items-center mb-8 text-center w-full">
                            <div className="w-full">
                                <h2 className="text-3xl font-black text-gray-900 italic">Delegate Lead</h2>
                                <p className="text-gray-400 text-sm font-medium mt-1">Select the best closer for this deal</p>
                            </div>
                        </div>
                        <form onSubmit={handleAssign}>
                            <div className="mb-10">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Available Team Members</label>
                                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto px-1 custom-scrollbar">
                                    {salesmen.map(s => (
                                        <div key={s.id} className="relative">
                                            <input
                                                type="radio" name="salesman" id={`s-${s.id}`} className="peer hidden"
                                                value={s.id} onChange={(e) => setSelectedSalesman(e.target.value)} required
                                            />
                                            <label
                                                htmlFor={`s-${s.id}`}
                                                className="flex items-center space-x-4 p-4 border-2 border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50"
                                            >
                                                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-black">{s.name[0]}</div>
                                                <span className="font-extrabold text-gray-800">{s.name}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-4">
                                <button
                                    type="submit"
                                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-100 active:scale-95"
                                >
                                    Confirm Delegation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLead(null)}
                                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-900 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
