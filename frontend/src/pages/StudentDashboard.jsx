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
        setSuccess(`Submission fully confirmed for "${confirmModal.assignment.title}"!`);
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
        return { label: 'Accepted', color: 'text-accent bg-accent/10', progress: 100 };
      case 'rejected':
        return { label: 'Rejected', color: 'text-accent-warn bg-accent-warn/10', progress: 0 };
      case 'confirmed':
        return { label: 'Confirmed', color: 'text-accent bg-accent/10', progress: 100 };
      case 'step1_confirmed':
        return { label: 'Step 1 Done', color: 'text-ink-muted bg-ink-muted/10', progress: 50 };
      default:
        return { label: 'Pending', color: 'text-ink-faint bg-ink-faint/10', progress: 0 };
    }
  };

  // ── Compute progress stats ────────────────────────────────────────────────
  const totalAssignments = assignments.length;
  const confirmedCount = assignments.filter(a => a.submission_status === 'accepted').length;
  const progressPercent = totalAssignments > 0 ? Math.round((confirmedCount / totalAssignments) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-paper-dark">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-ink-muted text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark">

      {/* ── Confirmation Modal ─────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 dark:bg-black/50">
          <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-8 max-w-md mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-serif text-ink dark:text-ink-dark mb-2">
                {confirmModal.step === 'step1' ? 'Step 1: Initial Confirmation' : 'Final Confirmation'}
              </h3>
              <p className="text-ink-muted text-sm mb-1">
                <span className="font-semibold text-ink dark:text-ink-dark">{confirmModal.assignment.title}</span>
              </p>
              <p className="text-ink-faint text-sm">
                {confirmModal.step === 'step1'
                  ? 'Please provide a link to your work (e.g. Google Drive, OneDrive) as proof.'
                  : 'This is the final step. Are you absolutely sure the submission is complete?'
                }
              </p>
              
              {confirmModal.step === 'step1' && (
                <div className="mt-4 text-left">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Submission Link *</label>
                  <input
                    type="url"
                    required
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://docs.google.com/..."
                    className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark text-sm placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                  />
                  {error && <p className="mt-2 text-accent-warn text-xs text-center">{error}</p>}
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
                className="flex-1 py-3 px-4 border border-rule text-ink dark:text-ink-dark font-semibold rounded hover:bg-paper dark:hover:bg-paper-dark transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmation}
                disabled={confirming}
                className="flex-1 py-3 px-4 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {confirming ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      <header className="bg-paper-raised dark:bg-paper-dark-raised border-b border-rule dark:border-rule-strong px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl text-ink dark:text-ink-dark tracking-tight">Joineazy</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-ink-muted text-sm hidden sm:block">
            {user?.name || 'Student'}
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
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-serif text-ink dark:text-ink-dark tracking-tight mb-1">
            Student Dashboard
          </h2>
          <p className="text-ink-muted text-sm">
            {hasGroup ? 'Manage your group and track assignments' : 'Create or join a group to get started'}
          </p>
        </div>

        {/* ── Tab Navigation (only when in a group) ────────────────────────── */}
        {hasGroup && (
          <div className="flex border-b border-rule dark:border-rule-strong mb-6">
            <button
              onClick={() => setActiveTab('group')}
              className={`py-3 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
                activeTab === 'group'
                  ? 'border-accent text-ink dark:text-ink-dark'
                  : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              My Group
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`py-3 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'border-accent text-ink dark:text-ink-dark'
                  : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              Assignments
              {totalAssignments > 0 && (
                <span className="font-mono text-xs text-ink-faint">
                  {confirmedCount}/{totalAssignments}
                </span>
              )}
            </button>
          </div>
        )}

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

        {/* ── No Group → Create Group Form ──────────────────────────────────── */}
        {!hasGroup && (
          <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-8">
            <div className="mb-6">
              <h3 className="text-xl font-serif text-ink dark:text-ink-dark mb-1">Create Your Group</h3>
              <p className="text-ink-muted text-sm">Give your group a name and start adding members</p>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                  placeholder="e.g. Team Alpha, Study Squad…"
                  maxLength={100}
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 px-6 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {creating ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span>Create Group</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── GROUP TAB ────────────────────────────────────────────────────── */}
        {hasGroup && group && activeTab === 'group' && (
          <div className="space-y-6">
            {/* Group Info Card */}
            <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-serif text-ink dark:text-ink-dark mb-1">{group.name}</h3>
                  <p className="text-ink-muted text-sm">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''} · 
                    {group.is_creator ? ' You are the creator' : ` Created by ${group.members.find(m => m.id === group.created_by)?.name || 'Unknown'}`}
                  </p>
                </div>
                <button
                  onClick={handleLeaveGroup}
                  className="px-3 py-1.5 border border-accent-warn/40 text-accent-warn text-xs font-semibold rounded hover:bg-accent-warn/5 transition-all duration-200"
                >
                  Leave Group
                </button>
              </div>

              {/* Members List — ledger style */}
              <div>
                <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Members</h4>
                <div className="border-t border-rule dark:border-rule-strong">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 border-b border-rule dark:border-rule-strong group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent text-paper rounded-full flex items-center justify-center text-sm font-semibold">
                          {getInitial(member.name)}
                        </div>
                        <div>
                          <p className="text-ink dark:text-ink-dark text-sm font-semibold flex items-center gap-2">
                            {member.name}
                            {member.id === group.created_by && (
                              <span className="text-ink-faint text-xs font-normal">Creator</span>
                            )}
                            {member.id === user?.id && (
                              <span className="text-ink-faint text-xs font-normal">You</span>
                            )}
                          </p>
                          <p className="text-ink-faint text-xs font-mono">{member.email}</p>
                        </div>
                      </div>
                      {group.is_creator && member.id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1 border border-accent-warn/30 text-accent-warn text-xs font-semibold rounded hover:bg-accent-warn/5 transition-all duration-200"
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
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">Add a Member</h3>
                <p className="text-ink-muted text-sm mb-4">Enter the email address of a student to add them to your group.</p>

                <form onSubmit={handleAddMember} className="flex gap-3">
                  <div className="flex-grow">
                    <input
                      type="email"
                      required
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                      placeholder="student@university.edu"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-5 py-3 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {adding ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span>Add</span>
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
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-serif text-ink dark:text-ink-dark">Group Progress</h3>
                  <span className="text-lg font-mono font-semibold text-ink dark:text-ink-dark">{progressPercent}%</span>
                </div>
                {/* Progress bar — thin ledger track */}
                <div className="w-full h-1.5 bg-rule dark:bg-rule-strong rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-ink-faint text-xs mt-2">
                  {confirmedCount} of {totalAssignments} assignment{totalAssignments !== 1 ? 's' : ''} confirmed
                </p>
              </div>
            )}

            {/* Assignment List — ledger style */}
            {loadingAssignments ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : assignments.length === 0 ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Assignments Yet</h3>
                <p className="text-ink-muted text-sm">Your professor hasn't assigned any work to your group yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {assignments.map((assignment, idx) => {
                  const statusInfo = getStatusInfo(assignment.submission_status);
                  return (
                    <div
                      key={assignment.id}
                      className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6 shadow-sm"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-grow">
                          <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">{assignment.title}</h3>
                          {assignment.description && (
                            <p className="text-ink-muted text-sm line-clamp-2">{assignment.description}</p>
                          )}
                        </div>
                        {/* Status — Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ml-4 whitespace-nowrap ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Progress bar — thin track */}
                      <div className="w-full h-1 bg-rule dark:bg-rule-strong rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${statusInfo.progress}%` }}
                        ></div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-ink-muted">
                        <span className={`flex items-center ${isOverdue(assignment.due_date) ? 'text-accent-warn font-semibold' : ''}`}>
                          Due {formatDate(assignment.due_date)}
                        </span>
                        <div className="flex gap-2">
                          {assignment.onedrive_link && (
                            <a
                              href={assignment.onedrive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium flex items-center gap-1"
                            >
                              OneDrive
                            </a>
                          )}
                          {assignment.submission_link && (
                            <a
                              href={assignment.submission_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-ink-muted/10 text-ink dark:text-ink-dark hover:bg-ink-muted/20 transition-colors font-medium flex items-center gap-1"
                            >
                              View Submission
                            </a>
                          )}
                        </div>
                        <span className="text-ink-faint ml-auto">by {assignment.creator_name}</span>
                      </div>

                      {/* Action Buttons */}
                      {(assignment.submission_status === 'pending' || assignment.submission_status === 'rejected') && (
                        <button
                          onClick={() => handleConfirmStep1(assignment)}
                          className="w-full py-2.5 px-4 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90"
                        >
                          {assignment.submission_status === 'rejected' ? 'Resubmit Link' : 'Yes, I Have Submitted'}
                        </button>
                      )}

                      {assignment.submission_status === 'step1_confirmed' && (
                        <button
                          onClick={() => handleConfirmFinal(assignment)}
                          className="w-full py-2.5 px-4 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90"
                        >
                          Confirm Final Submission
                        </button>
                      )}

                      {assignment.submission_status === 'confirmed' && assignment.confirmed_at && (
                        <p className="text-ink-faint text-xs text-center mt-1">
                          Confirmed on {formatDate(assignment.confirmed_at)}
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
