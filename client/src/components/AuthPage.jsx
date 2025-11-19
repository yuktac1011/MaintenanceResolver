import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Wrench, User, Home, Shield, Loader2 } from 'lucide-react';

// A small, reusable component for our tabs
const AuthTab = ({ activeTab, tabName, onClick, children }) => {
    const isActive = activeTab === tabName;
    return (
        <button
            onClick={() => onClick(tabName)}
            className={`w-full p-3 font-semibold text-center transition rounded-t-lg
        ${isActive ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
            {children}
        </button>
    );
};

// --- LOGIN FORM COMPONENT ---
const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to login');
            login(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Log In'}
            </button>
        </form>
    );
};

// --- SIGNUP FORM COMPONENT ---
const SignupForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('resident');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to sign up');
            login(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg" required />
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" required />
            <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">I am a:</label>
                <div className="grid grid-cols-2 gap-3">
                    {/* Resident Option */}
                    <div>
                        <input type="radio" id="resident" name="role" value="resident" checked={role === 'resident'} onChange={(e) => setRole(e.target.value)} className="hidden peer" />
                        <label htmlFor="resident" className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer text-center peer-checked:border-blue-600 peer-checked:text-blue-600 hover:bg-gray-50">
                            <Home className="w-7 h-7 mb-1" /><span className="font-semibold text-sm">Resident</span>
                        </label>
                    </div>
                    {/* Admin Option */}
                    <div>
                        <input type="radio" id="admin" name="role" value="admin" checked={role === 'admin'} onChange={(e) => setRole(e.target.value)} className="hidden peer" />
                        <label htmlFor="admin" className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer text-center peer-checked:border-blue-600 peer-checked:text-blue-600 hover:bg-gray-50">
                            <Shield className="w-7 h-7 mb-1" /><span className="font-semibold text-sm">Admin</span>
                        </label>
                    </div>
                </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </button>
        </form>
    );
};


// --- MAIN AUTH PAGE ---
export default function AuthPage() {
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
                        <Wrench className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">Welcome to Resident Resolve</h1>
                    <p className="text-gray-500 mt-2">
                        {activeTab === 'login' ? 'Log in to continue.' : 'Create an account to get started.'}
                    </p>
                </div>
                <div className="bg-white rounded-2xl shadow-xl">
                    <div className="grid grid-cols-2">
                        <AuthTab activeTab={activeTab} tabName="login" onClick={setActiveTab}>Log In</AuthTab>
                        <AuthTab activeTab={activeTab} tabName="signup" onClick={setActiveTab}>Sign Up</AuthTab>
                    </div>
                    <div className="p-8">
                        {activeTab === 'login' ? <LoginForm /> : <SignupForm />}
                    </div>
                </div>
            </div>
        </div>
    );
}