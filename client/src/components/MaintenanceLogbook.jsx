import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
    AlertCircle, CheckCircle, Clock, TrendingUp, Wrench, User, BarChart3,
    Home, Wifi, Droplet, Zap, Trash2, Upload, X, Menu, Bell, ServerCrash, LogOut, Shield, UserPlus, Paperclip
} from 'lucide-react';

//CONSTANTS
const categories = [
    { id: 'electricity', name: 'Electricity', icon: Zap, color: 'bg-yellow-500' },
    { id: 'water', name: 'Water', icon: Droplet, color: 'bg-blue-500' },
    { id: 'wifi', name: 'WiFi', icon: Wifi, color: 'bg-purple-500' },
    { id: 'cleaning', name: 'Cleaning', icon: Trash2, color: 'bg-green-500' }
];

const SLA_HOURS = {
    electricity: 4, water: 2, wifi: 6, cleaning: 12
};

// --- MAIN COMPONENT ---
export default function MaintenanceLogbook() {
    const [complaints, setComplaints] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showComplaintForm, setShowComplaintForm] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'complaints', or 'admin'
    const { user, logout } = useContext(AuthContext);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                setError(null);
                const [complaintsRes, techniciansRes] = await Promise.all([
                    fetch('/api/complaints', { headers: { 'Authorization': `Bearer ${user.token}` } }),
                    user.role === 'admin' ? fetch('/api/users/technicians', { headers: { 'Authorization': `Bearer ${user.token}` } }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
                ]);

                if (!complaintsRes.ok) throw new Error('Failed to fetch complaints.');
                const complaintsData = await complaintsRes.json();
                setComplaints(complaintsData);

                if (user.role === 'admin') {
                    if (!techniciansRes.ok) throw new Error('Failed to fetch technicians.');
                    const techniciansData = await techniciansRes.json();
                    setTechnicians(techniciansData);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // --- HELPER FUNCTIONS ---
    const getTimeSince = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const isEscalated = (complaint) => {
        if (complaint.status === 'resolved') return false;
        const hoursSince = (Date.now() - new Date(complaint.createdAt)) / 3600000;
        return hoursSince > SLA_HOURS[complaint.category];
    };

    // --- API HANDLERS ---
    const handleCreateComplaint = async (formData, images) => {
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        data.append('resident', user.email);
        images.forEach(image => data.append('images', image));

        try {
            const response = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: data
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to create complaint.');
            }
            const newComplaint = await response.json();
            setComplaints([newComplaint, ...complaints]);
            setShowComplaintForm(false);
        } catch (err) { alert(err.message); }
    };

    const handleUpdateComplaint = async (complaintId, updateData) => {
        try {
            const response = await fetch(`/api/complaints/${complaintId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify(updateData),
            });
            if (!response.ok) throw new Error('Failed to update complaint.');
            const updatedComplaint = await response.json();
            setComplaints(prev => prev.map(c => c._id === updatedComplaint._id ? updatedComplaint : c));
            if (selectedComplaint?._id === updatedComplaint._id) {
                setSelectedComplaint(updatedComplaint);
            }
        } catch (err) { alert(err.message); }
    };

    const handleAssignTechnician = (complaint, technician) => {
        handleUpdateComplaint(complaint._id, {
            technician: { id: technician._id, name: technician.name },
            status: 'in-progress',
            updates: [...(complaint.updates || []), { time: new Date().toISOString(), message: `Assigned to ${technician.name}`, by: 'Admin' }]
        });
    };

    const handleStatusUpdate = (complaint, newStatus, message) => {
        const updatePayload = {
            status: newStatus,
            updates: [...(complaint.updates || []), { time: new Date().toISOString(), message, by: user.role === 'admin' ? 'Admin' : user.name }]
        };
        if (newStatus === 'resolved') updatePayload.resolvedAt = new Date().toISOString();
        handleUpdateComplaint(complaint._id, updatePayload);
    };

    const handleAddTechnician = async (techData, callback) => {
        try {
            const response = await fetch('/api/users/add-technician', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify(techData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to add technician.');
            setTechnicians([...technicians, data.user]);
            callback(true, 'Technician added successfully!');
        } catch (err) {
            callback(false, err.message);
        }
    };

    // --- COMPUTED DATA ---
    const analytics = (() => {
        if (complaints.length === 0) return { total: 0, open: 0, inProgress: 0, resolved: 0, escalated: 0, categoryCount: {}, avgResponseTime: 0 };
        const total = complaints.length;
        const open = complaints.filter(c => c.status === 'open').length;
        const inProgress = complaints.filter(c => c.status === 'in-progress').length;
        const resolved = complaints.filter(c => c.status === 'resolved').length;
        const escalated = complaints.filter(c => isEscalated(c) && c.status !== 'resolved').length;
        const categoryCount = categories.reduce((acc, cat) => ({ ...acc, [cat.id]: complaints.filter(c => c.category === cat.id).length }), {});
        const resolvedComplaints = complaints.filter(c => c.status === 'resolved' && c.resolvedAt);
        const avgResponseTime = resolvedComplaints.length > 0 ? resolvedComplaints.reduce((acc, c) => acc + (new Date(c.resolvedAt) - new Date(c.createdAt)), 0) / resolvedComplaints.length / 3600000 : 0;
        return { total, open, inProgress, resolved, escalated, categoryCount, avgResponseTime };
    })();

    const filteredComplaints = complaints.filter(c => {
        const statusMatch = filterStatus === 'all' || (filterStatus === 'escalated' ? isEscalated(c) && c.status !== 'resolved' : c.status === filterStatus);
        const categoryMatch = filterCategory === 'all' || c.category === filterCategory;
        return statusMatch && categoryMatch;
    });

    if (loading) return <div className="flex h-screen items-center justify-center text-lg font-semibold">Loading...</div>;
    if (error) return <div className="flex h-screen flex-col items-center justify-center text-red-600"><ServerCrash className="w-16 h-16 mb-4" /><h2 className="text-2xl font-bold">Error</h2><p>{error}</p></div>;

    // --- NESTED SUB-COMPONENTS ---
    const ComplaintForm = () => {
        const [formData, setFormData] = useState({ title: '', description: '', category: 'electricity', priority: 'medium', roomNumber: '' });
        const [images, setImages] = useState([]);
        const [imagePreviews, setImagePreviews] = useState([]);

        const handleImageChange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length + images.length > 5) {
                alert("You can only upload a maximum of 5 images.");
                return;
            }
            setImages([...images, ...files]);
            const previews = files.map(file => URL.createObjectURL(file));
            setImagePreviews([...imagePreviews, ...previews]);
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            handleCreateComplaint(formData, images);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">New Complaint</h2><button onClick={() => setShowComplaintForm(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button></div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label className="text-sm font-medium">Title</label><input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="mt-1 w-full p-2 border rounded-md" /></div>
                            <div><label className="text-sm font-medium">Description</label><textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1 w-full p-2 border rounded-md" rows="4" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium">Category</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="mt-1 w-full p-2 border rounded-md">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div><label className="text-sm font-medium">Priority</label><select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="mt-1 w-full p-2 border rounded-md"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                            </div>
                            <div><label className="text-sm font-medium">Room / Location</label><input required value={formData.roomNumber} onChange={e => setFormData({ ...formData, roomNumber: e.target.value })} className="mt-1 w-full p-2 border rounded-md" /></div>
                            <div>
                                <label className="text-sm font-medium">Add Images (Optional, max 5)</label>
                                <label htmlFor="image-upload" className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 flex flex-col items-center justify-center">
                                    <Upload className="w-10 h-10 mx-auto text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-600">Click to upload files</p>
                                </label>
                                <input id="image-upload" type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                            </div>
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-5 gap-2">
                                    {imagePreviews.map((src, index) => <img key={index} src={src} alt="Preview" className="w-full h-20 object-cover rounded-md" />)}
                                </div>
                            )}
                            <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowComplaintForm(false)} className="flex-1 py-2 px-4 border rounded-md font-semibold hover:bg-gray-50">Cancel</button><button type="submit" className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">Submit</button></div>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const ComplaintCard = ({ complaint }) => {
        const categoryInfo = categories.find(c => c.id === complaint.category);
        const CategoryIcon = categoryInfo?.icon || AlertCircle;
        const escalated = isEscalated(complaint) && complaint.status !== 'resolved';
        const cardClasses = `bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-5 cursor-pointer border-2 ${escalated ? 'border-red-500' : 'border-gray-200'}`;

        return (
            <div onClick={() => setSelectedComplaint(complaint)} className={cardClasses}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3"><div className={`${categoryInfo?.color} p-2 rounded-lg text-white`}><CategoryIcon size={20} /></div><div><h3 className="font-semibold text-gray-800">{complaint.title}</h3><p className="text-sm text-gray-500">{complaint.roomNumber} • {complaint.resident}</p></div></div>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${complaint.status === 'open' ? 'bg-red-100 text-red-800' : complaint.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{complaint.status.replace('-', ' ')}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{complaint.description}</p>
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-4 text-gray-500"><span className={`flex items-center gap-1.5 capitalize font-semibold ${complaint.priority === 'high' ? 'text-red-600' : complaint.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}><AlertCircle size={16} />{complaint.priority}</span><span className="flex items-center gap-1.5"><Clock size={16} />{getTimeSince(complaint.createdAt)}</span></div>
                    {escalated && <span className="flex items-center gap-1 font-semibold text-red-600 animate-pulse"><Bell size={16} />Escalated</span>}
                </div>
                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        {complaint.technician?.name ? <><User size={16} className="text-gray-500" /><span className="font-medium text-gray-700">{complaint.technician.name}</span></> : <span className="text-gray-400">Unassigned</span>}
                    </div>
                    {complaint.images?.length > 0 && <div className="flex items-center gap-1 text-sm text-gray-500"><Paperclip size={14} />{complaint.images.length}</div>}
                </div>
            </div>
        );
    };

    const ComplaintDetail = ({ complaint }) => {
        const [updateMessage, setUpdateMessage] = useState('');
        const categoryInfo = categories.find(c => c.id === complaint.category);
        const CategoryIcon = categoryInfo?.icon || AlertCircle;
        const canUpdate = user.role === 'admin' || (user.role === 'technician' && complaint.technician?.id === user._id);

        // --- IMPROVEMENT: Pre-filter technicians to make the JSX cleaner ---
        const relevantTechnicians = technicians.filter(t => t.specialization === complaint.category);
        const otherTechnicians = technicians.filter(t => t.specialization !== complaint.category);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedComplaint(null)}>
                <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className={`${categoryInfo?.color} p-3 rounded-lg text-white`}><CategoryIcon size={24} /></div><div><h2 className="text-2xl font-bold">{complaint.title}</h2><p className="text-gray-600">{complaint.roomNumber} • {complaint.resident}</p></div></div><button onClick={() => setSelectedComplaint(null)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button></div>
                    <div className="mb-6"><h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3><p className="bg-gray-50 p-4 rounded-lg text-gray-700">{complaint.description}</p></div>

                    {complaint.images && complaint.images.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Attached Images</h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                {complaint.images.map((image, index) => (
                                    <a key={index} href={`/${image}`} target="_blank" rel="noopener noreferrer">
                                        <img src={`/${image}`} alt={`attachment ${index + 1}`} className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {user.role === 'admin' && complaint.status === 'open' && (
                        <div className="my-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Assign Technician</h3>

                            {/* --- IMPROVEMENT: Conditional rendering for the dropdown --- */}
                            {technicians.length === 0 ? (
                                <p className="text-gray-600 text-center p-2">You haven't added any technicians yet. Please go to the Admin Panel.</p>
                            ) : relevantTechnicians.length > 0 ? (
                                <select
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const tech = technicians.find(t => t._id === e.target.value);
                                        if (tech) handleAssignTechnician(complaint, tech);
                                    }}
                                    className="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a suitable technician...</option>
                                    {relevantTechnicians.map(tech => <option key={tech._id} value={tech._id}>{tech.name} ({tech.specialization})</option>)}
                                    {otherTechnicians.length > 0 && <option disabled>--- Other Technicians ---</option>}
                                    {otherTechnicians.map(tech => <option key={tech._id} value={tech._id} disabled>{tech.name} ({tech.specialization})</option>)}
                                </select>
                            ) : (
                                <p className="text-gray-600 text-center p-2">No technicians found with the required specialization ({complaint.category}).</p>
                            )}
                        </div>
                    )}

                    {complaint.technician?.name && <div className="mb-6"><h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned Technician</h3><div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg"><div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center"><User size={20} /></div><div><p className="font-medium text-gray-800">{complaint.technician.name}</p></div></div></div>}
                    <div className="mb-6"><h3 className="text-lg font-semibold text-gray-800 mb-3">Updates Timeline</h3><div className="space-y-3">{(complaint.updates && complaint.updates.length > 0) ? complaint.updates.slice().reverse().map((update, idx) => <div key={idx} className="flex gap-4"><div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center mt-1"><CheckCircle className="text-blue-600" size={18} /></div><div><p className="text-gray-800">{update.message}</p><p className="text-xs text-gray-500 mt-1">{update.by} • {getTimeSince(update.time)}</p></div></div>) : <p className="text-gray-500 text-center py-4">No updates yet.</p>}</div></div>

                    {canUpdate && complaint.status !== 'resolved' && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Update / Action</h3>
                            <textarea value={updateMessage} onChange={e => setUpdateMessage(e.target.value)} rows="3" className="w-full p-2 border rounded-md mb-3" placeholder="Enter resolution details or progress update..." />
                            <div className="flex gap-2">
                                <button disabled={!updateMessage.trim()} onClick={() => { handleStatusUpdate(complaint, 'in-progress', updateMessage); setUpdateMessage(''); }} className="px-4 py-2 bg-yellow-500 text-white rounded-md font-semibold disabled:opacity-50 hover:bg-yellow-600">Update Progress</button>
                                <button onClick={() => { handleStatusUpdate(complaint, 'resolved', updateMessage.trim() || 'Issue resolved.'); setUpdateMessage(''); setSelectedComplaint(null); }} className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700">Mark as Resolved</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const AnalyticsView = () => (<div className="space-y-6"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5"> <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-lg shadow-lg"><div className="flex justify-between items-center"><h3 className="text-sm font-medium opacity-90">Total Complaints</h3><BarChart3 size={20} className="opacity-80" /></div><p className="text-3xl font-bold mt-2">{analytics.total}</p></div> <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-5 rounded-lg shadow-lg"><div className="flex justify-between items-center"><h3 className="text-sm font-medium opacity-90">Open</h3><AlertCircle size={20} className="opacity-80" /></div><p className="text-3xl font-bold mt-2">{analytics.open}</p></div> <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-5 rounded-lg shadow-lg"><div className="flex justify-between items-center"><h3 className="text-sm font-medium opacity-90">In Progress</h3><Clock size={20} className="opacity-80" /></div><p className="text-3xl font-bold mt-2">{analytics.inProgress}</p></div> <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-lg shadow-lg"><div className="flex justify-between items-center"><h3 className="text-sm font-medium opacity-90">Resolved</h3><CheckCircle size={20} className="opacity-80" /></div><p className="text-3xl font-bold mt-2">{analytics.resolved}</p></div> <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-lg shadow-lg"><div className="flex justify-between items-center"><h3 className="text-sm font-medium opacity-90">Escalated</h3><Bell size={20} className="opacity-80" /></div><p className="text-3xl font-bold mt-2">{analytics.escalated}</p></div> </div> <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> <div className="bg-white rounded-lg shadow-md p-6 border"><h3 className="text-lg font-bold text-gray-800 mb-4">Issues by Category</h3><div className="space-y-4">{categories.map(cat => { const count = analytics.categoryCount[cat.id] || 0; const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0; return (<div key={cat.id}><div className="flex justify-between items-center mb-1"><span className="font-semibold text-gray-700">{cat.name}</span><span className="text-sm font-medium text-gray-600">{count}</span></div><div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className={`${cat.color} h-full`} style={{ width: `${percentage}%` }} /></div></div>); })}</div></div> <div className="bg-white rounded-lg shadow-md p-6 border"><h3 className="text-lg font-bold text-gray-800 mb-4">Performance Metrics</h3><div className="space-y-4"><div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center"><div ><p className="text-sm text-gray-600">Avg. Resolution Time</p><p className="text-2xl font-bold text-blue-700">{analytics.avgResponseTime.toFixed(1)} hours</p></div><TrendingUp size={32} className="text-blue-300" /></div><div className="bg-green-50 p-4 rounded-lg flex justify-between items-center"><div><p className="text-sm text-gray-600">Resolution Rate</p><p className="text-2xl font-bold text-green-700">{analytics.total > 0 ? ((analytics.resolved / analytics.total) * 100).toFixed(0) : 0}%</p></div><CheckCircle size={32} className="text-green-300" /></div></div></div> </div> </div>);

    const ComplaintsView = () => (<> <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4"> <div><h2 className="text-2xl font-bold text-gray-800">Complaints Log</h2><p className="text-gray-600">Track and manage all maintenance issues.</p></div> <div className="flex items-center gap-2 flex-wrap"> <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-md bg-white"> <option value="all">All Statuses</option> <option value="open">Open</option> <option value="in-progress">In Progress</option> <option value="resolved">Resolved</option> <option value="escalated">Escalated</option> </select> <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-4 py-2 border rounded-md bg-white"><option value="all">All Categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select> </div> </div> <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">{filteredComplaints.length > 0 ? filteredComplaints.map(c => <ComplaintCard key={c._id} complaint={c} />) : <div className="col-span-full text-center py-16 text-gray-500"><p>No complaints match the current filters.</p></div>}</div> </>);

    const AdminView = () => {
        const [techData, setTechData] = useState({ name: '', email: '', password: '', specialization: 'electricity' });
        const [message, setMessage] = useState({ type: '', content: '' });

        const handleFormSubmit = async (e) => {
            e.preventDefault();
            setMessage({ type: '', content: '' });
            if (!techData.name || !techData.email || !techData.password) {
                setMessage({ type: 'error', content: 'Please fill all fields.' });
                return;
            }
            handleAddTechnician(techData, (success, msg) => {
                setMessage({ type: success ? 'success' : 'error', content: msg });
                if (success) {
                    setTechData({ name: '', email: '', password: '', specialization: 'electricity' });
                }
            });
        };

        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Admin Panel</h2>
                    <p className="text-gray-600">Manage system users and settings.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add Technician Form */}
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus /> Add New Technician</h3>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <input type="text" placeholder="Full Name" value={techData.name} onChange={e => setTechData({ ...techData, name: e.target.value })} className="w-full p-2 border rounded-md" />
                            <input type="email" placeholder="Email Address" value={techData.email} onChange={e => setTechData({ ...techData, email: e.target.value })} className="w-full p-2 border rounded-md" />
                            <input type="password" placeholder="Temporary Password" value={techData.password} onChange={e => setTechData({ ...techData, password: e.target.value })} className="w-full p-2 border rounded-md" />
                            <select value={techData.specialization} onChange={e => setTechData({ ...techData, specialization: e.target.value })} className="w-full p-2 border rounded-md">
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {message.content && <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.content}</p>}
                            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">Add Technician</button>
                        </form>
                    </div>
                    {/* List of Technicians */}
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Existing Technicians</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {technicians.length > 0 ? technicians.map(tech => (
                                <div key={tech._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                    <div>
                                        <p className="font-semibold text-gray-800">{tech.name}</p>
                                        <p className="text-sm text-gray-500">{tech.email}</p>
                                    </div>
                                    <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">{tech.specialization}</span>
                                </div>
                            )) : <p className="text-gray-500">No technicians found.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN JSX LAYOUT ---
    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 flex">
            <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
                <div className="p-6 text-2xl font-bold text-blue-600 flex items-center gap-3"><Wrench /><span>Logbook</span></div>
                <nav className="flex-1 px-4 py-2">
                    <ul className="space-y-2">
                        <li><button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left font-semibold ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}><Home size={20} /><span>Dashboard</span></button></li>
                        <li><button onClick={() => setActiveView('complaints')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left font-semibold ${activeView === 'complaints' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}><BarChart3 size={20} /><span>Complaints</span></button></li>
                        {user.role === 'admin' && (
                            <li><button onClick={() => setActiveView('admin')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left font-semibold ${activeView === 'admin' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}><Shield size={20} /><span>Admin Panel</span></button></li>
                        )}
                    </ul>
                </nav>
                <div className="p-4 border-t space-y-3">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Logged in as:</p>
                        <p className="font-semibold text-gray-800 truncate" title={user.email}>{user.name}</p>
                        <p className="text-sm font-medium text-blue-600 capitalize">{user.role}</p>
                    </div>
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 px-4 border rounded-md font-semibold hover:bg-red-50 hover:text-red-600 transition-colors">
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col">
                <header className="bg-white shadow-sm p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3"><button className="md:hidden p-2 rounded-md hover:bg-gray-100"><Menu size={20} /></button><h1 className="text-xl font-bold capitalize text-gray-800">{activeView}</h1></div>
                    <div className="flex items-center gap-4">
                        {user.role === 'resident' && (
                            <button onClick={() => setShowComplaintForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                                <Wrench size={16} /><span>New Complaint</span>
                            </button>
                        )}
                        <div className="relative"><Bell size={24} className="text-gray-600" /><div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{analytics.escalated}</div></div>
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border"><User className="text-gray-500" /></div>
                    </div>
                </header>
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                    {activeView === 'dashboard' ? <AnalyticsView /> : activeView === 'complaints' ? <ComplaintsView /> : <AdminView />}
                </div>
            </main>
            {showComplaintForm && <ComplaintForm />}
            {selectedComplaint && <ComplaintDetail complaint={selectedComplaint} />}
        </div>
    );
}