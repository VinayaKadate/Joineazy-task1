import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getMyGroup, createGroup, addMember, removeMember, leaveGroup } from '../api/groups';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [hasGroup, setHasGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create group form
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Add member form
  const [memberEmail, setMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);

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

  useEffect(() => {
    fetchGroup();
  }, []);

  // ── Clear feedback after 4s ───────────────────────────────────────────────
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave group');
    }
  };

  // ── Helper: avatar initial ────────────────────────────────────────────────
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
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            🎓 Student Dashboard
          </h2>
          <p className="text-indigo-200 font-medium">
            {hasGroup ? 'Manage your group and members' : 'Create or join a group to get started'}
          </p>
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

        {/* ── Has Group → Group Panel ───────────────────────────────────────── */}
        {hasGroup && group && (
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
                      {/* Remove button — only visible to creator, not for self */}
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
      </main>
    </div>
  );
};

export default StudentDashboard;
