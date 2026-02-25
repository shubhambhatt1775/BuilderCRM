import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SalesmanDashboard from './pages/SalesmanDashboard';
import SalesmanDetailView from './pages/SalesmanDetailView';
import { LogOut, LayoutDashboard, User } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
    const { user, token } = useAuth();
    if (!token) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to="/" />;
    return children;
};

const Navbar = () => {
    const { user, logout } = useAuth();
    if (!user) return null;

    return (
        <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-40">
            <div className="flex items-center space-x-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <LayoutDashboard className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">BuilderCRM</span>
            </div>
            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-sm text-gray-600 border-r pr-6">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User size={16} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 leading-none">{user.name}</div>
                        <div className="text-[10px] uppercase font-bold text-blue-600 tracking-widest">{user.role}</div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="text-gray-500 hover:text-red-500 transition-colors flex items-center space-x-2 text-sm font-semibold"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
};

const DashboardRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/salesman" />;
};

function App() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-[#f8fafc]">
                <Navbar />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={
                        <ProtectedRoute role="admin">
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/salesman" element={
                        <ProtectedRoute role="salesman">
                            <SalesmanDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/salesman-dashboard/:salesmanId" element={
                        <ProtectedRoute role="admin">
                            <SalesmanDetailView />
                        </ProtectedRoute>
                    } />
                    <Route path="/" element={<DashboardRedirect />} />
                </Routes>
            </div>
        </AuthProvider>
    );
}

export default App;
