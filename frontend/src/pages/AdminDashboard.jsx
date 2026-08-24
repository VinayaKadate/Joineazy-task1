import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getAllAssignments, createAssignment, updateAssignment, deleteAssignment, getAllGroups } from '../api/assignments';
import { getAnalyticsSummary, getAssignmentStatus, acceptSubmission, rejectSubmission } from '../api/analytics';
import ThemeToggle from '../components/ThemeToggle';

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
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-paper-dark">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-ink-muted text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-paper-raised dark:bg-paper-dark-raised border-b border-rule dark:border-rule-strong px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl text-ink dark:text-ink-dark tracking-tight">Joineazy</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-ink-muted text-sm hidden sm:block">
            Prof. {user?.name || 'Admin'}
          </span>
          <button
            onClick={logout}
            className="px-4 py-2 border border-rule text-ink dark:text-ink-dark text-sm font-semibold rounded hover:bg-paper dark:hover:bg-paper-dark transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* Page Title & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-ink dark:text-ink-dark tracking-tight mb-1">
              Admin Dashboard
            </h2>
            <p className="text-ink-muted text-sm">
              Manage assignments and track student progress
            </p>
          </div>
          <div className="flex border-b border-rule dark:border-rule-strong">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`py-2 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
                activeTab === 'assignments' ? 'border-accent text-ink dark:text-ink-dark' : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
                activeTab === 'analytics' ? 'border-accent text-ink dark:text-ink-dark' : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* ── Feedback Banners ──────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-3 border border-accent-warn/40 bg-accent-warn/5 rounded-lg flex items-center gap-3 text-accent-warn text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 border border-accent/30 bg-accent/5 rounded-lg flex items-center gap-3 text-accent dark:text-ink-dark text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{success}</p>
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
                    className="px-5 py-2.5 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Assignment
                  </button>
                )}
            </div>

            {/* ── Assignment Form (Create / Edit) ──────────────────────────────── */}
            {showForm && (
              <div className="mb-8 bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-serif text-ink dark:text-ink-dark">
                    {editingId ? 'Edit Assignment' : 'New Assignment'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="p-2 text-ink-muted hover:text-ink dark:hover:text-ink-dark transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                      placeholder="Assignment title"
                      maxLength={200}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-transparent border border-rule dark:border-rule-strong rounded-lg text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Describe the assignment…"
                      rows={3}
                    />
                  </div>

                  {/* Due Date + OneDrive Link row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Due Date *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">OneDrive Link</label>
                      <input
                        type="url"
                        value={formData.onedrive_link}
                        onChange={(e) => setFormData(prev => ({ ...prev, onedrive_link: e.target.value }))}
                        className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                        placeholder="https://onedrive.live.com/..."
                      />
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Assign To</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, target: 'all', group_ids: [] }))}
                        className={`flex-1 py-2.5 px-4 rounded text-sm font-semibold transition-all duration-200 border ${
                          formData.target === 'all'
                            ? 'bg-accent text-paper border-accent'
                            : 'bg-transparent border-rule text-ink-muted hover:border-ink-muted'
                        }`}
                      >
                        All Groups
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, target: 'specific' }))}
                        className={`flex-1 py-2.5 px-4 rounded text-sm font-semibold transition-all duration-200 border ${
                          formData.target === 'specific'
                            ? 'bg-accent text-paper border-accent'
                            : 'bg-transparent border-rule text-ink-muted hover:border-ink-muted'
                        }`}
                      >
                        Specific Groups
                      </button>
                    </div>
                  </div>

                  {/* Group Picker (when target is specific) */}
                  {formData.target === 'specific' && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Select Groups ({formData.group_ids.length} selected)
                      </label>
                      {groups.length === 0 ? (
                        <p className="text-ink-faint text-sm p-4 border border-rule dark:border-rule-strong rounded-lg text-center">
                          No groups have been created yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {groups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => toggleGroupId(group.id)}
                              className={`flex items-center justify-between p-3 rounded text-sm font-medium transition-all duration-200 border ${
                                formData.group_ids.includes(group.id)
                                  ? 'bg-accent text-paper border-accent'
                                  : 'bg-transparent border-rule text-ink-muted hover:border-ink-muted'
                              }`}
                            >
                              <span>{group.name}</span>
                              <span className="text-xs opacity-70 font-mono">{group.member_count} members</span>
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
                    className="w-full py-3 px-6 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {submitting ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

            {/* ── Assignments List — ledger style ─────────────────────────────── */}
            {assignments.length === 0 && !showForm ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Assignments Yet</h3>
                <p className="text-ink-muted text-sm mb-6">Create your first assignment to get started</p>
                <button
                  onClick={openCreateForm}
                  className="px-6 py-2.5 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90"
                >
                  Create Assignment
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {assignments.map((assignment, idx) => (
                  <div
                    key={assignment.id}
                    className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6 shadow-sm group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-grow">
                        <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">{assignment.title}</h3>
                        {assignment.description && (
                          <p className="text-ink-muted text-sm line-clamp-2">{assignment.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => openEditForm(assignment)}
                          className="px-3 py-1.5 border border-rule text-ink-muted text-xs font-semibold rounded hover:border-ink-muted hover:text-ink dark:hover:text-ink-dark transition-all"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id, assignment.title)}
                          className="px-3 py-1.5 border border-accent-warn/30 text-accent-warn text-xs font-semibold rounded hover:bg-accent-warn/5 transition-all"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Meta info row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                      {/* Due date */}
                      <span className={`flex items-center ${isOverdue(assignment.due_date) ? 'text-accent-warn font-semibold' : ''}`}>
                        Due {formatDate(assignment.due_date)}
                      </span>

                      {/* Target */}
                      <span>
                        {assignment.target === 'all' ? 'All Groups' : `${assignment.targeted_groups?.length || 0} Group${(assignment.targeted_groups?.length || 0) !== 1 ? 's' : ''}`}
                      </span>

                      {/* OneDrive link */}
                      {assignment.onedrive_link && (
                        <div className="flex gap-2">
                          <a
                            href={assignment.onedrive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium flex items-center gap-1"
                          >
                            OneDrive
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Targeted groups list */}
                    {assignment.target === 'specific' && assignment.targeted_groups?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {assignment.targeted_groups.map((g) => (
                          <span key={g.id} className="text-ink-faint text-xs font-mono">
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
            {/* Summary Cards — ledger grid */}
            {analyticsSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-5">
                  <div className="text-ink-muted text-xs font-semibold uppercase tracking-wider mb-1">Total Groups</div>
                  <div className="text-2xl font-mono font-bold text-ink dark:text-ink-dark">{analyticsSummary.totalGroups}</div>
                </div>
                <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-5">
                  <div className="text-ink-muted text-xs font-semibold uppercase tracking-wider mb-1">Total Students</div>
                  <div className="text-2xl font-mono font-bold text-ink dark:text-ink-dark">{analyticsSummary.totalStudents}</div>
                </div>
                <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-5">
                  <div className="text-ink-muted text-xs font-semibold uppercase tracking-wider mb-1">Assignments</div>
                  <div className="text-2xl font-mono font-bold text-ink dark:text-ink-dark">{analyticsSummary.totalAssignments}</div>
                </div>
                <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-5">
                  <div className="text-ink-muted text-xs font-semibold uppercase tracking-wider mb-1">Completion</div>
                  <div className="text-2xl font-mono font-bold text-ink dark:text-ink-dark">{analyticsSummary.overallCompletionRate}%</div>
                </div>
              </div>
            )}

            {/* Assignment Selector */}
            <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-5">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Select Assignment to Track</label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark focus:outline-none focus:border-accent transition-colors [&>option]:text-ink"
              >
                <option value="">-- Choose an assignment --</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            {/* Status Breakdown — ledger table */}
            {selectedAssignmentId && (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl overflow-hidden">
                <div className="p-5 border-b border-rule dark:border-rule-strong">
                  <h3 className="text-lg font-serif text-ink dark:text-ink-dark">Group Submission Status</h3>
                </div>
                
                {loadingAnalytics ? (
                   <div className="p-12 text-center text-ink-muted">
                     <svg className="animate-spin h-8 w-8 text-ink-muted mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading statuses...
                   </div>
                ) : assignmentStatuses.length === 0 ? (
                  <div className="p-12 text-center text-ink-muted text-sm">
                    No groups assigned to this task yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-rule dark:border-rule-strong">
                          <th className="px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Group</th>
                          <th className="px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Members</th>
                          <th className="px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Confirmed At</th>
                          <th className="px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentStatuses.map((group) => {
                          const statusLabels = {
                            pending: 'Pending',
                            step1_confirmed: 'Partial (Step 1)',
                            confirmed: 'Needs Review',
                            accepted: 'Accepted',
                            rejected: 'Rejected'
                          };
                          const statusColors = {
                            pending: 'text-ink-faint bg-ink-faint/10',
                            step1_confirmed: 'text-ink-muted bg-ink-muted/10',
                            confirmed: 'text-accent bg-accent/10',
                            accepted: 'text-accent bg-accent/10',
                            rejected: 'text-accent-warn bg-accent-warn/10'
                          };
                          
                          return (
                            <tr key={group.id} className="border-b border-rule dark:border-rule-strong last:border-b-0 hover:bg-paper dark:hover:bg-paper-dark transition-colors">
                              <td className="px-5 py-3 font-semibold text-ink dark:text-ink-dark whitespace-nowrap">
                                {group.name}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-0.5">
                                  {group.members?.map((m) => (
                                    <span key={m.id} className="text-xs text-ink-muted">{m.name}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-2 items-start">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${statusColors[group.submission_status]}`}>
                                    {statusLabels[group.submission_status]}
                                  </span>
                                  {group.submission_link && (
                                    <a
                                      href={group.submission_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded bg-ink-muted/10 text-ink dark:text-ink-dark hover:bg-ink-muted/20 transition-colors font-medium flex items-center gap-1 text-xs"
                                    >
                                      View Submission
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-ink-muted font-mono text-xs">
                                {group.confirmed_at ? formatDate(group.confirmed_at) : '—'}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                {group.submission_status === 'confirmed' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleAccept(selectedAssignmentId, group.id)}
                                      className="px-3 py-1.5 border border-rule text-ink dark:text-ink-dark text-xs font-semibold rounded hover:border-accent hover:text-accent transition-all"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleReject(selectedAssignmentId, group.id)}
                                      className="px-3 py-1.5 border border-accent-warn/30 text-accent-warn text-xs font-semibold rounded hover:bg-accent-warn/5 transition-all"
                                    >
                                      Reject
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
