import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getMyGroup, createGroup, addMember, removeMember, leaveGroup } from '../api/groups';
import { getMyAssignments, confirmStep1, confirmFinal } from '../api/submissions';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [hasGroup, setHasGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState('group');

  // Create group form
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Add member form
  const [memberEmail, setMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Two-step confirm modal
  const [confirmModal, setConfirmModal] = useState(null); // { assignment, step: 'step1' | 'final' }
  const [confirming, setConfirming] = useState(false);
  const [submissionLink, setSubmissionLink] = useState('');

  // Feedback
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ── Fetch Group Data ──────────────────────────────────────────────────────
  const fetchGroup = async () => {
    try {
      const res = await getMyGroup();
      if (res.data.group) {
        setGroup(res.data.group);
        setHasGroup(true);
      } else {
        setGroup(null);
        setHasGroup(false);
      }
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Assignments ─────────────────────────────────────────────────────
  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await getMyAssignments();
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, []);

  useEffect(() => {
    if (hasGroup && activeTab === 'assignments') {
      fetchAssignments();
    }
  }, [hasGroup, activeTab]);

  // ── Clear feedback after 4s ───────────────────────────────────────────────
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ── Group Handlers ────────────────────────────────────────────────────────
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);
    try {
      await createGroup(groupName);
      setSuccess('Group created!');
      setGroupName('');
      await fetchGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAdding(true);
    try {
      const res = await addMember(group.id, memberEmail);
      setSuccess(res.data.message);
      setMemberEmail('');
      await fetchGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await removeMember(group.id, memberId);
      setSuccess(`${memberName} removed`);
      await fetchGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await leaveGroup();
      setSuccess(res.data.message);
      setGroup(null);
      setHasGroup(false);
      setActiveTab('group');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave group');
    }
  };

  // ── Submission Handlers ───────────────────────────────────────────────────
  const handleConfirmStep1 = async (assignment) => {
    setConfirmModal({ assignment, step: 'step1' });
  };

  const handleConfirmFinal = async (assignment) => {
    setConfirmModal({ assignment, step: 'final' });
  };

  const executeConfirmation = async () => {
    if (!confirmModal) return;
    
    if (confirmModal.step === 'step1' && (!submissionLink || !submissionLink.trim())) {
      setError('Please provide a submission link as proof');
      return;
    }

    setConfirming(true);
    setError(null);
    setSuccess(null);
    try {
      if (confirmModal.step === 'step1') {
        await confirmStep1(confirmModal.assignment.id, { submission_link: submissionLink });
        setSuccess(`Step 1 confirmed for "${confirmModal.assignment.title}"`);
      } else {
        await confirmFinal(confirmModal.assignment.id);
        setSuccess(`Submission fully confirmed for "${confirmModal.assignment.title}"! 🎉`);
      }
      setConfirmModal(null);
      setSubmissionLink('');
      await fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.error || 'Confirmation failed');
      // don't close modal on error so they can fix it
    } finally {
      setConfirming(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : '?');

  const avatarColors = [
    'from-indigo-400 to-blue-500',
    'from-purple-400 to-pink-500',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-red-500',
    'from-cyan-400 to-blue-500',
    'from-rose-400 to-fuchsia-500',
    'from-amber-400 to-yellow-500',
    'from-lime-400 to-green-500',
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'accepted':
        return { label: 'Accepted ✅', color: 'bg-green-500/20 border-green-500/40 text-green-300', progress: 100 };
      case 'rejected':
        return { label: 'Rejected ❌', color: 'bg-red-500/20 border-red-500/40 text-red-300', progress: 0 };
      case 'confirmed':
        return { label: 'Confirmed ✓', color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', progress: 100 };
      case 'step1_confirmed':
        return { label: 'Step 1 Done', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300', progress: 50 };
      default:
        return { label: 'Pending', color: 'bg-white/10 border-white/20 text-indigo-200', progress: 0 };
    }
  };

  // ── Compute progress stats ────────────────────────────────────────────────
  const totalAssignments = assignments.length;
  const confirmedCount = assignments.filter(a => a.submission_status === 'accepted').length;
  const progressPercent = totalAssignments > 0 ? Math.round((confirmedCount / totalAssignments) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-indigo-200 font-medium">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-4000"></div>

      {/* ── Confirmation Modal ─────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md mx-4 transform transition-all">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                confirmModal.step === 'step1'
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : 'bg-gradient-to-br from-emerald-400 to-teal-500'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {confirmModal.step === 'step1' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  )}
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {confirmModal.step === 'step1' ? 'Step 1: Initial Confirmation' : 'Final Confirmation'}
              </h3>
              <p className="text-indigo-200 text-sm mb-1">
                <span className="font-semibold text-white">{confirmModal.assignment.title}</span>
              </p>
              <p className="text-indigo-300 text-sm">
                {confirmModal.step === 'step1'
                  ? 'Please provide a link to your work (e.g. Google Drive, OneDrive) as proof.'
                  : 'This is the final step. Are you absolutely sure the submission is complete?'
                }
              </p>
              
              {confirmModal.step === 'step1' && (
                <div className="mt-4 text-left">
                  <label className="block text-sm font-semibold text-indigo-100 mb-2">Submission Link *</label>
                  <input
                    type="url"
                    required
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://docs.google.com/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {error && <p className="mt-2 text-red-300 text-xs text-center">{error}</p>}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setConfirmModal(null);
                  setSubmissionLink('');
                  setError(null);
                }}
                className="flex-1 py-3 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmation}
                disabled={confirming}
                className={`flex-1 py-3 px-4 font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex justify-center items-center gap-2 ${
                  confirmModal.step === 'step1'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white'
                }`}
              >
                {confirming ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span>{confirmModal.step === 'step1' ? 'Yes, Confirm' : 'Confirm Final'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Joineazy</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-indigo-200 text-sm font-medium hidden sm:block">
            👋 Hey, {user?.name || 'Student'}
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
      <main className="relative z-10 max-w-2xl mx-auto px-4 md:px-6 pb-12">
        {/* Page Title */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            🎓 Student Dashboard
          </h2>
          <p className="text-indigo-200 font-medium">
            {hasGroup ? 'Manage your group and track assignments' : 'Create or join a group to get started'}
          </p>
        </div>

        {/* ── Tab Navigation (only when in a group) ────────────────────────── */}
        {hasGroup && (
          <div className="flex gap-2 mb-6 bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/10">
            <button
              onClick={() => setActiveTab('group')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'group'
                  ? 'bg-white/15 text-white shadow-lg'
                  : 'text-indigo-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              My Group
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'assignments'
                  ? 'bg-white/15 text-white shadow-lg'
                  : 'text-indigo-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Assignments
              {totalAssignments > 0 && (
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-xs font-bold rounded-full">
                  {confirmedCount}/{totalAssignments}
                </span>
              )}
            </button>
          </div>
        )}

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

        {/* ── No Group → Create Group Form ──────────────────────────────────── */}
        {!hasGroup && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Create Your Group</h3>
              <p className="text-indigo-200 text-sm">Give your group a name and start adding members</p>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1 group">
                <label className="text-sm font-semibold text-indigo-100 ml-1 group-focus-within:text-white transition-colors">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300"
                  placeholder="e.g. Team Alpha, Study Squad…"
                  maxLength={100}
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
              >
                {creating ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Group
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── GROUP TAB ────────────────────────────────────────────────────── */}
        {hasGroup && group && activeTab === 'group' && (
          <div className="space-y-6">
            {/* Group Info Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{group.name}</h3>
                  </div>
                  <p className="text-indigo-200 text-sm ml-[52px]">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''} · 
                    {group.is_creator ? ' You are the creator' : ` Created by ${group.members.find(m => m.id === group.created_by)?.name || 'Unknown'}`}
                  </p>
                </div>
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-semibold rounded-xl hover:bg-red-500/30 transition-all duration-300"
                >
                  Leave Group
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider ml-1">Members</h4>
                <div className="space-y-2">
                  {group.members.map((member, idx) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} rounded-full flex items-center justify-center shadow-md`}>
                          <span className="text-white font-bold text-sm">{getInitial(member.name)}</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm flex items-center gap-2">
                            {member.name}
                            {member.id === group.created_by && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                                Creator
                              </span>
                            )}
                            {member.id === user?.id && (
                              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-indigo-300 text-xs">{member.email}</p>
                        </div>
                      </div>
                      {group.is_creator && member.id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg hover:bg-red-500/30 transition-all duration-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Member Card — Only for group creator */}
            {group.is_creator && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-1">Add a Member</h3>
                <p className="text-indigo-200 text-sm mb-5">Enter the email address of a student to add them to your group.</p>

                <form onSubmit={handleAddMember} className="flex gap-3">
                  <div className="flex-grow">
                    <input
                      type="email"
                      required
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/10 transition-all duration-300"
                      placeholder="student@university.edu"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    {adding ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── ASSIGNMENTS TAB ──────────────────────────────────────────────── */}
        {hasGroup && activeTab === 'assignments' && (
          <div className="space-y-6">
            {/* Progress Card */}
            {totalAssignments > 0 && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-6 transition-all duration-500">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">Group Progress</h3>
                  <span className="text-2xl font-extrabold text-white">{progressPercent}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progressPercent}%`,
                      background: progressPercent === 100
                        ? 'linear-gradient(90deg, #34d399, #10b981)'
                        : 'linear-gradient(90deg, #818cf8, #6366f1)',
                    }}
                  ></div>
                </div>
                <p className="text-indigo-200 text-xs mt-2">
                  {confirmedCount} of {totalAssignments} assignment{totalAssignments !== 1 ? 's' : ''} confirmed
                </p>
              </div>
            )}

            {/* Assignment List */}
            {loadingAssignments ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : assignments.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Assignments Yet</h3>
                <p className="text-indigo-200 text-sm">Your professor hasn't assigned any work to your group yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const statusInfo = getStatusInfo(assignment.submission_status);
                  return (
                    <div
                      key={assignment.id}
                      className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 p-6 transition-all duration-500 hover:shadow-2xl hover:bg-white/[0.12]"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-grow">
                          <h3 className="text-lg font-bold text-white mb-1">{assignment.title}</h3>
                          {assignment.description && (
                            <p className="text-indigo-200/80 text-sm line-clamp-2">{assignment.description}</p>
                          )}
                        </div>
                        {/* Status badge */}
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusInfo.color} ml-3 whitespace-nowrap`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Progress bar for this assignment */}
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${statusInfo.progress}%`,
                            background: statusInfo.progress === 100
                              ? 'linear-gradient(90deg, #34d399, #10b981)'
                              : statusInfo.progress === 50
                              ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                              : 'transparent',
                          }}
                        ></div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                        <span className={`px-3 py-1.5 rounded-full font-semibold border ${
                          isOverdue(assignment.due_date)
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        }`}>
                          📅 {formatDate(assignment.due_date)}
                        </span>
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
                        {assignment.submission_link && (
                          <a
                            href={assignment.submission_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-full font-semibold border bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-all"
                          >
                            🔗 View Submission
                          </a>
                        )}
                        <span className="text-indigo-300/60">by {assignment.creator_name}</span>
                      </div>

                      {/* Action Buttons */}
                      {(assignment.submission_status === 'pending' || assignment.submission_status === 'rejected') && (
                        <button
                          onClick={() => handleConfirmStep1(assignment)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-0.5 hover:shadow-amber-500/30 flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {assignment.submission_status === 'rejected' ? 'Resubmit Link' : 'Yes, I Have Submitted'}
                        </button>
                      )}

                      {assignment.submission_status === 'step1_confirmed' && (
                        <button
                          onClick={() => handleConfirmFinal(assignment)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Confirm Final Submission
                        </button>
                      )}

                      {assignment.submission_status === 'confirmed' && assignment.confirmed_at && (
                        <p className="text-emerald-300 text-xs text-center mt-1">
                          ✓ Confirmed on {formatDate(assignment.confirmed_at)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
