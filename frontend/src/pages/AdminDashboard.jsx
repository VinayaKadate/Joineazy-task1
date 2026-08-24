import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getAllAssignments, createAssignment, updateAssignment, deleteAssignment, getAllGroups } from '../api/assignments';
import { getAnalyticsSummary, getAssignmentStatus, acceptSubmission, rejectSubmission } from '../api/analytics';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' or 'analytics'
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    onedrive_link: '',
    target: 'all',
    group_ids: [],
  });
  const [submitting, setSubmitting] = useState(false);

  // Analytics state
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assignmentStatuses, setAssignmentStatuses] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Feedback
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ── Fetch Data (assignments + groups only) ──────────────────────────────
  const fetchData = async () => {
    try {
      const [assignRes, groupRes] = await Promise.all([
        getAllAssignments(),
        getAllGroups(),
      ]);
      setAssignments(assignRes.data.assignments || []);
      setGroups(groupRes.data.groups || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (assignmentId, groupId) => {
    try {
      await acceptSubmission(assignmentId, groupId);
      setSuccess('Submission accepted!');
      if (selectedAssignmentId) fetchAssignmentStatuses(selectedAssignmentId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept submission');
    }
  };

  const handleReject = async (assignmentId, groupId) => {
    if (!window.confirm('Are you sure you want to reject this submission? The student will need to resubmit.')) return;
    try {
      await rejectSubmission(assignmentId, groupId);
      setSuccess('Submission rejected.');
      if (selectedAssignmentId) fetchAssignmentStatuses(selectedAssignmentId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject submission');
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Fetch analytics summary when Analytics tab is activated ────────────
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const summaryRes = await getAnalyticsSummary();
      setAnalyticsSummary(summaryRes.data.summary || null);
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchAssignmentStatuses = async (assignmentId) => {
    setLoadingAnalytics(true);
    try {
      const res = await getAssignmentStatus(assignmentId);
      setAssignmentStatuses(res.data.statuses || []);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch individual assignment statuses when selection changes
  useEffect(() => {
    if (!selectedAssignmentId) {
      setAssignmentStatuses([]);
      return;
    }
    fetchAssignmentStatuses(selectedAssignmentId);
  }, [selectedAssignmentId]);


  // ── Clear feedback after 4s ───────────────────────────────────────────────
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ── Form Handlers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ title: '', description: '', due_date: '', onedrive_link: '', target: 'all', group_ids: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (assignment) => {
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : '',
      onedrive_link: assignment.onedrive_link || '',
      target: assignment.target,
      group_ids: assignment.targeted_groups?.map(g => g.id) || [],
    });
    setEditingId(assignment.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (editingId) {
        await updateAssignment(editingId, payload);
        setSuccess('Assignment updated!');
      } else {
        await createAssignment(payload);
        setSuccess('Assignment created!');
      }
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete assignment "${title}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteAssignment(id);
      setSuccess('Assignment deleted');
      await fetchData(); // refreshes both assignments and analytics summary
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete assignment');
    }
  };

  const toggleGroupId = (id) => {
    setFormData(prev => ({
      ...prev,
      group_ids: prev.group_ids.includes(id)
        ? prev.group_ids.filter(gid => gid !== id)
        : [...prev.group_ids, id],
    }));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-indigo-200 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute top-[50%] right-[30%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000"></div>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Joineazy</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-indigo-200 text-sm font-medium hidden sm:block">
            👨‍🏫 Prof. {user?.name || 'Admin'}
          </span>
          <button
            onClick={logout}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pb-12">
        {/* Page Title & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1">
              👨‍🏫 Admin Dashboard
            </h2>
            <p className="text-indigo-200 font-medium">
              Manage assignments and track student progress
            </p>
          </div>
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20 w-fit">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === 'assignments' ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg' : 'text-indigo-200 hover:text-white'
              }`}
            >
              📝 Assignments
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === 'analytics' ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' : 'text-indigo-200 hover:text-white'
              }`}
            >
              📊 Analytics
            </button>
          </div>
        </div>

        {/* ── Feedback Banners ──────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-200 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {/* ==================================================================================================== */}
        {/* ASSIGNMENTS TAB */}
        {/* ==================================================================================================== */}
        {activeTab === 'assignments' && (
          <>
            <div className="flex justify-end mb-4">
               {!showForm && (
                  <button
                    onClick={openCreateForm}
                    className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/30 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Assignment
                  </button>
                )}
            </div>

            {/* ── Assignment Form (Create / Edit) ──────────────────────────────── */}
            {showForm && (
              <div className="mb-8 bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-8 transition-all duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    {editingId ? '✏️ Edit Assignment' : '📝 New Assignment'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-white/70 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div className="space-y-1 group">
                    <label className="text-sm font-semibold text-indigo-100 ml-1 group-focus-within:text-white transition-colors">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300"
                      placeholder="Assignment title"
                      maxLength={200}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1 group">
                    <label className="text-sm font-semibold text-indigo-100 ml-1 group-focus-within:text-white transition-colors">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300 resize-none"
                      placeholder="Describe the assignment…"
                      rows={3}
                    />
                  </div>

                  {/* Due Date + OneDrive Link row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 group">
                      <label className="text-sm font-semibold text-indigo-100 ml-1 group-focus-within:text-white transition-colors">Due Date *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1 group">
                      <label className="text-sm font-semibold text-indigo-100 ml-1 group-focus-within:text-white transition-colors">OneDrive Link</label>
                      <input
                        type="url"
                        value={formData.onedrive_link}
                        onChange={(e) => setFormData(prev => ({ ...prev, onedrive_link: e.target.value }))}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300"
                        placeholder="https://onedrive.live.com/..."
                      />
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-indigo-100 ml-1">Assign To</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, target: 'all', group_ids: [] }))}
                        className={`flex-1 py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-300 border ${
                          formData.target === 'all'
                            ? 'bg-indigo-500/30 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10'
                        }`}
                      >
                        🌐 All Groups
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, target: 'specific' }))}
                        className={`flex-1 py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-300 border ${
                          formData.target === 'specific'
                            ? 'bg-purple-500/30 border-purple-400/50 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10'
                        }`}
                      >
                        🎯 Specific Groups
                      </button>
                    </div>
                  </div>

                  {/* Group Picker (when target is specific) */}
                  {formData.target === 'specific' && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-indigo-100 ml-1">
                        Select Groups ({formData.group_ids.length} selected)
                      </label>
                      {groups.length === 0 ? (
                        <p className="text-indigo-300/70 text-sm p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                          No groups have been created yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {groups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => toggleGroupId(group.id)}
                              className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-300 border ${
                                formData.group_ids.includes(group.id)
                                  ? 'bg-purple-500/25 border-purple-400/50 text-white'
                                  : 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10'
                              }`}
                            >
                              <span>{group.name}</span>
                              <span className="text-xs text-indigo-300/70">{group.member_count} members</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
                  >
                    {submitting ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span>{editingId ? 'Update Assignment' : 'Create Assignment'}</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── Assignments List ─────────────────────────────────────────────── */}
            {assignments.length === 0 && !showForm ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-12 text-center transition-all duration-500 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Assignments Yet</h3>
                <p className="text-indigo-200 text-sm mb-6">Create your first assignment to get started</p>
                <button
                  onClick={openCreateForm}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/30"
                >
                  Create Assignment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-6 transition-all duration-500 hover:shadow-2xl hover:bg-white/[0.12] group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-white mb-1">{assignment.title}</h3>
                        {assignment.description && (
                          <p className="text-indigo-200/80 text-sm line-clamp-2">{assignment.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => openEditForm(assignment)}
                          className="p-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-all"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id, assignment.title)}
                          className="p-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Meta info row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {/* Due date badge */}
                      <span className={`px-3 py-1.5 rounded-full font-semibold border ${
                        isOverdue(assignment.due_date)
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      }`}>
                        📅 {formatDate(assignment.due_date)}
                      </span>

                      {/* Target badge */}
                      <span className={`px-3 py-1.5 rounded-full font-semibold border ${
                        assignment.target === 'all'
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      }`}>
                        {assignment.target === 'all' ? '🌐 All Groups' : `🎯 ${assignment.targeted_groups?.length || 0} Group${(assignment.targeted_groups?.length || 0) !== 1 ? 's' : ''}`}
                      </span>

                      {/* OneDrive link */}
                      {assignment.onedrive_link && (
                        <a
                          href={assignment.onedrive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-full font-semibold border bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30 transition-all"
                        >
                          🔗 OneDrive
                        </a>
                      )}
                    </div>

                    {/* Targeted groups list */}
                    {assignment.target === 'specific' && assignment.targeted_groups?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assignment.targeted_groups.map((g) => (
                          <span key={g.id} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-indigo-200 text-xs">
                            {g.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ==================================================================================================== */}
        {/* ANALYTICS TAB */}
        {/* ==================================================================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            {analyticsSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 shadow-lg">
                  <div className="text-indigo-300 text-sm font-semibold mb-1">Total Groups</div>
                  <div className="text-3xl font-extrabold text-white">{analyticsSummary.totalGroups}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 shadow-lg">
                  <div className="text-pink-300 text-sm font-semibold mb-1">Total Students</div>
                  <div className="text-3xl font-extrabold text-white">{analyticsSummary.totalStudents}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 shadow-lg">
                  <div className="text-blue-300 text-sm font-semibold mb-1">Assignments</div>
                  <div className="text-3xl font-extrabold text-white">{analyticsSummary.totalAssignments}</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/30 p-5 shadow-lg">
                  <div className="text-indigo-200 text-sm font-semibold mb-1">Overall Completion</div>
                  <div className="text-3xl font-extrabold text-white">{analyticsSummary.overallCompletionRate}%</div>
                </div>
              </div>
            )}

            {/* Assignment Selector */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-6">
              <label className="block text-sm font-semibold text-indigo-100 mb-2">Select Assignment to Track</label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300 [&>option]:text-slate-900"
              >
                <option value="">-- Choose an assignment --</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            {/* Status Breakdown Table */}
            {selectedAssignmentId && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white">Group Submission Status</h3>
                </div>
                
                {loadingAnalytics ? (
                   <div className="p-12 text-center text-indigo-200">
                     <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading statuses...
                   </div>
                ) : assignmentStatuses.length === 0 ? (
                  <div className="p-12 text-center text-indigo-200">
                    No groups assigned to this task yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-indigo-100">
                      <thead className="bg-white/5 text-xs uppercase font-bold text-indigo-200">
                        <tr>
                          <th className="px-6 py-4">Group Name</th>
                          <th className="px-6 py-4">Members</th>
                          <th className="px-6 py-4">Status & Link</th>
                          <th className="px-6 py-4">Confirmed At</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {assignmentStatuses.map((group) => {
                          const statusColors = {
                            pending: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                            step1_confirmed: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                            confirmed: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                            accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                            rejected: 'bg-red-500/20 text-red-300 border-red-500/30'
                          };
                          const statusLabels = {
                            pending: '⏳ Pending',
                            step1_confirmed: '⚠️ Partial (Step 1)',
                            confirmed: '📝 Confirmed (Review needed)',
                            accepted: '✅ Accepted',
                            rejected: '❌ Rejected'
                          };
                          
                          return (
                            <tr key={group.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-semibold text-white whitespace-nowrap">
                                {group.name}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {group.members?.map((m) => (
                                    <div 
                                      key={m.id} 
                                      title={m.name}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-slate-900 text-xs font-bold text-white shadow-sm"
                                    >
                                      {m.name.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-2 items-start">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[group.submission_status]}`}>
                                    {statusLabels[group.submission_status]}
                                  </span>
                                  {group.submission_link && (
                                    <a
                                      href={group.submission_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1 font-medium bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                                    >
                                      🔗 View Submission
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-indigo-200">
                                {group.confirmed_at ? formatDate(group.confirmed_at) : '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {group.submission_status === 'confirmed' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleAccept(selectedAssignmentId, group.id)}
                                      className="p-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all"
                                      title="Accept"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleReject(selectedAssignmentId, group.id)}
                                      className="p-1.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                                      title="Reject"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
