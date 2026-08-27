import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getMyGroup, createGroup, addMember, removeMember, leaveGroup } from '../api/groups';
import { getMyAssignments, confirmStep1, confirmFinal } from '../api/submissions';
import { getMyCourses, getCourseAssignments, getAllCourses, enrollCourse } from '../api/courses';
import ThemeToggle from '../components/ThemeToggle';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [hasGroup, setHasGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tab state: 'courses' | 'group' | 'assignments' (legacy) 
  const [activeTab, setActiveTab] = useState('courses');

  // Courses
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [loadingAllCourses, setLoadingAllCourses] = useState(false);
  const [enrolling, setEnrolling] = useState(null); // courseId

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loadingCourseAssignments, setLoadingCourseAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [leaderInfo, setLeaderInfo] = useState(null);

  // Create group form
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Add member form
  const [memberEmail, setMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);

  // Leader info
  const [isLeader, setIsLeader] = useState(false);

  // Two-step confirm modal
  const [confirmModal, setConfirmModal] = useState(null);
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

  // ── Fetch Courses ─────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await getMyCourses();
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchAllCourses = async () => {
    setLoadingAllCourses(true);
    try {
      const res = await getAllCourses();
      setAllCourses(res.data.courses || []);
    } catch (err) {
      console.error('Failed to fetch all courses:', err);
    } finally {
      setLoadingAllCourses(false);
    }
  };

  const handleEnroll = async (courseId) => {
    setEnrolling(courseId);
    setError(null);
    setSuccess(null);
    try {
      await enrollCourse(courseId);
      setSuccess('Successfully enrolled in course!');
      await fetchAllCourses();
      await fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  // ── Fetch Course Assignments ──────────────────────────────────────────────
  const fetchCourseAssignments = async (courseId) => {
    setLoadingCourseAssignments(true);
    try {
      const res = await getCourseAssignments(courseId);
      setCourseAssignments(res.data.assignments || []);
      if (res.data.leader_info) {
        setLeaderInfo(res.data.leader_info);
        setIsLeader(res.data.leader_info.is_leader);
      }
    } catch (err) {
      console.error('Failed to fetch course assignments:', err);
    } finally {
      setLoadingCourseAssignments(false);
    }
  };

  // ── Fetch leader info ─────────────────────────────────────────────────────
  const fetchLeaderInfo = async () => {
    try {
      const res = await getMyAssignments();
      setIsLeader(res.data.is_leader || false);
    } catch (err) {
      // non-critical
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchCourses();
    fetchAllCourses();
    fetchLeaderInfo();
  }, []);

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
    setError(null); setSuccess(null); setCreating(true);
    try {
      await createGroup(groupName);
      setSuccess('Group created!');
      setGroupName('');
      await fetchGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally { setCreating(false); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null); setAdding(true);
    try {
      const res = await addMember(group.id, memberEmail);
      setSuccess(res.data.message);
      setMemberEmail('');
      await fetchGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { setAdding(false); }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return;
    setError(null); setSuccess(null);
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
    setError(null); setSuccess(null);
    try {
      const res = await leaveGroup();
      setSuccess(res.data.message);
      setGroup(null); setHasGroup(false); setActiveTab('courses');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave group');
    }
  };

  // ── Submission Handlers ───────────────────────────────────────────────────
  const handleConfirmStep1 = (assignment) => {
    setConfirmModal({ assignment, step: 'step1' });
  };

  const handleConfirmFinal = (assignment) => {
    setConfirmModal({ assignment, step: 'final' });
  };

  const executeConfirmation = async () => {
    if (!confirmModal) return;
    if (confirmModal.step === 'step1' && (!submissionLink || !submissionLink.trim())) {
      setError('Please provide a submission link as proof');
      return;
    }
    setConfirming(true); setError(null); setSuccess(null);
    try {
      if (confirmModal.step === 'step1') {
        await confirmStep1(confirmModal.assignment.id, { submission_link: submissionLink });
        setSuccess(`Step 1 confirmed for "${confirmModal.assignment.title}"`);
      } else {
        await confirmFinal(confirmModal.assignment.id);
        setSuccess(`Submission fully confirmed for "${confirmModal.assignment.title}"!`);
      }
      setConfirmModal(null); setSubmissionLink('');
      if (selectedCourse) {
        await fetchCourseAssignments(selectedCourse.id);
        // Update the selectedAssignment in-place so the detail view reflects the new status
        if (selectedAssignment) {
          const updatedAssignments = (await getCourseAssignments(selectedCourse.id)).data.assignments || [];
          const updated = updatedAssignments.find(a => a.id === selectedAssignment.id);
          if (updated) setSelectedAssignment(updated);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Confirmation failed');
    } finally { setConfirming(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : '?');
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const isOverdue = (dateStr) => dateStr && new Date(dateStr) < new Date();

  const getProgress = (status) => {
    switch (status) {
      case 'accepted': return 100;
      case 'rejected': return 0;
      case 'confirmed': return 100;
      case 'step1_confirmed': return 50;
      default: return 0;
    }
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 dark:bg-black/50 p-4">
          <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-xl font-serif text-ink dark:text-ink-dark mb-2">
                {confirmModal.step === 'step1' ? 'Step 1: Initial Confirmation' : 'Final Confirmation'}
              </h3>
              <p className="text-ink-muted text-sm mb-1">
                <span className="font-semibold text-ink dark:text-ink-dark">{confirmModal.assignment.title}</span>
              </p>
              <p className="text-ink-faint text-sm">
                {confirmModal.step === 'step1'
                  ? 'Please provide a link to your work as proof.'
                  : 'This is the final step. Are you sure the submission is complete?'
                }
              </p>
              {confirmModal.step === 'step1' && (
                <div className="mt-4 text-left">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Submission Link *</label>
                  <input
                    type="url" required value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://docs.google.com/..."
                    className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark text-sm placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                  />
                  {error && <p className="mt-2 text-accent-warn text-xs text-center">{error}</p>}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setConfirmModal(null); setSubmissionLink(''); setError(null); }}
                className="flex-1 py-3 px-4 border border-rule text-ink dark:text-ink-dark font-semibold rounded hover:bg-paper dark:hover:bg-paper-dark transition-all duration-200">
                Cancel
              </button>
              <button onClick={executeConfirmation} disabled={confirming}
                className="flex-1 py-3 px-4 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
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
          <ThemeToggle />
          <span className="text-ink-muted text-sm hidden sm:block">{user?.name || 'Student'}</span>
          <button onClick={logout}
            className="px-4 py-2 border border-rule text-ink dark:text-ink-dark text-sm font-semibold rounded hover:bg-paper dark:hover:bg-paper-dark transition-all duration-200">
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-serif text-ink dark:text-ink-dark tracking-tight mb-1">
            Student Dashboard
          </h2>
          <p className="text-ink-muted text-sm">
            {hasGroup ? 'Browse your courses and manage your group' : 'Create or join a group to get started'}
          </p>
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────────── */}
        <div className="flex border-b border-rule dark:border-rule-strong mb-6">
          <button
            onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }}
            className={`py-3 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
              activeTab === 'courses'
                ? 'border-accent text-ink dark:text-ink-dark'
                : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            My Courses
            {courses.length > 0 && (
              <span className="ml-2 font-mono text-xs text-ink-faint">{courses.length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('all_courses'); setSelectedCourse(null); }}
            className={`py-3 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
              activeTab === 'all_courses'
                ? 'border-accent text-ink dark:text-ink-dark'
                : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            All Courses
          </button>
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
        </div>

        {/* ── Feedback Banners ──────────────────────────────────────────────── */}
        {error && !confirmModal && (
          <div className="mb-6 p-3 border border-accent-warn/40 bg-accent-warn/5 rounded-lg flex items-center gap-3 text-accent-warn text-sm animate-shake">
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── COURSES TAB ──────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && !selectedCourse && (
          <div>
            {loadingCourses ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Courses Yet</h3>
                <p className="text-ink-muted text-sm">You haven't been enrolled in any courses yet.</p>
              </div>
            ) : (
              /* ── Course Grid ──────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course, idx) => (
                  <button
                    key={course.id}
                    onClick={() => { setSelectedCourse(course); fetchCourseAssignments(course.id); }}
                    className="text-left bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6 hover:border-accent/50 hover:shadow-sm transition-all duration-200 group animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'backwards' }}
                  >
                    {/* Course code — mono */}
                    <p className="text-xs font-mono text-ink-faint uppercase tracking-wider mb-2">
                      Course #{course.id}
                    </p>
                    {/* Title — serif */}
                    <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-2 group-hover:text-accent transition-colors">
                      {course.title}
                    </h3>
                    {/* Description */}
                    {course.description && (
                      <p className="text-ink-muted text-sm line-clamp-2 mb-4">{course.description}</p>
                    )}
                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-ink-faint mt-auto pt-3 border-t border-rule dark:border-rule-strong">
                      <span>{course.professor_name}</span>
                      <span className="font-mono">{course.assignment_count || 0} assignments</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ALL COURSES TAB (Browse & Enroll) ─────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'all_courses' && (
          <div>
            {loadingAllCourses ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : allCourses.length === 0 ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Courses Available</h3>
                <p className="text-ink-muted text-sm">There are currently no courses offered.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCourses.map((course, idx) => (
                  <div
                    key={course.id}
                    className="flex flex-col text-left bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6 group animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'backwards' }}
                  >
                    <p className="text-xs font-mono text-ink-faint uppercase tracking-wider mb-2">
                      Course #{course.id}
                    </p>
                    <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-2">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-ink-muted text-sm line-clamp-2 mb-4 flex-grow">{course.description}</p>
                    )}
                    <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-rule dark:border-rule-strong">
                      <div className="flex items-center justify-between text-xs text-ink-faint">
                        <span>Prof. {course.professor_name}</span>
                      </div>
                      
                      {course.is_enrolled ? (
                        <div className="w-full text-center py-2 px-4 rounded border border-accent/20 bg-accent/5 text-accent text-sm font-semibold">
                          Enrolled
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrolling === course.id}
                          className="w-full py-2 px-4 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                        >
                          {enrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── COURSE DETAIL (assignments for selected course) ─────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && selectedCourse && !selectedAssignment && (
          <div className="space-y-6 animate-fade-in">
            {/* Back button + course title */}
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => { setSelectedCourse(null); setCourseAssignments([]); setLeaderInfo(null); }}
                className="p-2 rounded hover:bg-rule/50 dark:hover:bg-rule-strong/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-xs font-mono text-ink-faint uppercase tracking-wider">Course #{selectedCourse.id}</p>
                <h3 className="text-xl font-serif text-ink dark:text-ink-dark">{selectedCourse.title}</h3>
              </div>
            </div>

            {/* Assignment ledger rows */}
            {loadingCourseAssignments ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : courseAssignments.length === 0 ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Assignments</h3>
                <p className="text-ink-muted text-sm">No assignments have been posted for this course yet.</p>
              </div>
            ) : (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl overflow-hidden">
                {/* Ledger header */}
                <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-rule dark:border-rule-strong text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  <span className="col-span-5">Assignment</span>
                  <span className="col-span-2 text-center">Type</span>
                  <span className="col-span-3 text-center">Due Date</span>
                  <span className="col-span-2 text-center">Status</span>
                </div>
                {/* Ledger rows */}
                {courseAssignments.map((assignment, idx) => {
                  const status = assignment.submission_status?.status || assignment.submission_status || 'pending';
                  const subType = assignment.submission_type || 'group';
                  return (
                    <button
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className={`w-full grid grid-cols-12 gap-2 items-center px-5 py-4 text-left hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors duration-150 group ${
                        idx < courseAssignments.length - 1 ? 'border-b border-rule dark:border-rule-strong' : ''
                      }`}
                      style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'backwards' }}
                    >
                      {/* Title */}
                      <div className="col-span-5 flex items-center gap-2">
                        <h4 className="text-sm font-serif text-ink dark:text-ink-dark group-hover:text-accent transition-colors truncate">
                          {assignment.title}
                        </h4>
                      </div>
                      {/* Type badge */}
                      <div className="col-span-2 flex justify-center">
                        <span className="text-xs font-mono text-ink-faint px-2 py-0.5 border border-rule dark:border-rule-strong rounded">
                          {subType}
                        </span>
                      </div>
                      {/* Due date */}
                      <div className="col-span-3 text-center">
                        <span className={`text-xs ${isOverdue(assignment.due_date) ? 'text-accent-warn font-semibold' : 'text-ink-muted'}`}>
                          {formatDate(assignment.due_date)}
                        </span>
                      </div>
                      {/* Status */}
                      <div className="col-span-2 flex justify-center">
                        <StatusBadge status={status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ASSIGNMENT DETAIL VIEW ──────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && selectedCourse && selectedAssignment && (() => {
          const assignment = selectedAssignment;
          const status = assignment.submission_status?.status || assignment.submission_status || 'pending';
          const subType = assignment.submission_type || 'group';
          const confirmedAt = assignment.submission_status?.confirmed_at || assignment.confirmed_at;
          const submittedLink = assignment.submission_status?.submission_link || assignment.submission_link;
          const isConfirmedOrAccepted = status === 'confirmed' || status === 'accepted';

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Back to assignment list */}
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="p-2 rounded hover:bg-rule/50 dark:hover:bg-rule-strong/30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <p className="text-xs font-mono text-ink-faint uppercase tracking-wider">{selectedCourse.title}</p>
                  <h3 className="text-xl font-serif text-ink dark:text-ink-dark">{assignment.title}</h3>
                </div>
              </div>

              {/* Main card */}
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl overflow-hidden">

                {/* ── Header strip ─────────────────────────────────── */}
                <div className="px-6 py-5 border-b border-rule dark:border-rule-strong">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-ink-faint px-2.5 py-1 border border-rule dark:border-rule-strong rounded">
                        {subType}
                      </span>
                      <StatusBadge status={status} showCheckmark={true} />
                    </div>
                    {assignment.onedrive_link && (
                      <a href={assignment.onedrive_link} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-xs font-semibold">
                        Open OneDrive ↗
                      </a>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-grow">
                      <ProgressBar percentage={getProgress(status)} heightClass="h-1.5" containerClass="mt-0" />
                    </div>
                    <span className="text-xs font-mono text-ink-faint w-8 text-right">{getProgress(status)}%</span>
                  </div>
                </div>

                {/* ── Description ──────────────────────────────────── */}
                {assignment.description && (
                  <div className="px-6 py-5 border-b border-rule dark:border-rule-strong">
                    <h5 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Description</h5>
                    <p className="text-ink dark:text-ink-dark text-sm leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
                  </div>
                )}

                {/* ── Deadline ─────────────────────────────────────── */}
                <div className="px-6 py-4 border-b border-rule dark:border-rule-strong flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 flex-shrink-0 ${isOverdue(assignment.due_date) ? 'text-accent-warn' : 'text-ink-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Deadline</span>
                    <p className={`text-sm font-semibold ${isOverdue(assignment.due_date) ? 'text-accent-warn' : 'text-ink dark:text-ink-dark'}`}>
                      {formatDate(assignment.due_date)}
                      {isOverdue(assignment.due_date) && <span className="ml-2 text-xs font-normal">(Overdue)</span>}
                    </p>
                  </div>
                </div>

                {/* ── Group / Leader Info (group assignments only) ── */}
                {subType === 'group' && leaderInfo && (
                  <div className="px-6 py-4 border-b border-rule dark:border-rule-strong">
                    <h5 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Group Information</h5>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent/10 text-accent rounded-full flex items-center justify-center text-sm font-bold">
                          {getInitial(leaderInfo.leader_name)}
                        </div>
                        <div>
                          <p className="text-sm text-ink dark:text-ink-dark font-semibold">{leaderInfo.group_name}</p>
                          <p className="text-xs text-ink-muted">Leader: {leaderInfo.leader_name}</p>
                        </div>
                      </div>
                      {leaderInfo.is_leader ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold text-accent bg-accent/10 uppercase tracking-wide">
                          You are the leader
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold text-ink-faint bg-ink-faint/10 italic">
                          Waiting on leader
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Submitted Link (if exists) ──────────────────── */}
                {submittedLink && (
                  <div className="px-6 py-4 border-b border-rule dark:border-rule-strong flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div>
                      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Submission Link</span>
                      <a href={submittedLink} target="_blank" rel="noopener noreferrer"
                        className="block text-sm text-accent hover:underline truncate max-w-md">{submittedLink}</a>
                    </div>
                  </div>
                )}

                {/* ── Action Area ─────────────────────────────────── */}
                <div className="px-6 py-5">
                  {/* Confirmed / Accepted — checkmark animation */}
                  {isConfirmedOrAccepted && (
                    <div className="flex flex-col items-center py-4">
                      <div className="relative mb-3">
                        {/* Pulse ring */}
                        <div className="absolute inset-0 w-14 h-14 rounded-full bg-accent/20 animate-pulse-ring"></div>
                        {/* Checkmark circle */}
                        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center animate-checkmark">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            style={{ strokeDasharray: 24, strokeDashoffset: 24 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"
                              className="animate-draw-check" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-accent">
                        {status === 'accepted' ? 'Submission Accepted' : 'Submission Confirmed'}
                      </p>
                      {confirmedAt && (
                        <p className="text-xs text-ink-faint mt-1">on {formatDate(confirmedAt)}</p>
                      )}
                    </div>
                  )}

                  {/* Rejected state */}
                  {status === 'rejected' && (
                    <div className="text-center mb-4">
                      <p className="text-sm text-accent-warn font-semibold mb-1">Submission Rejected</p>
                      <p className="text-xs text-ink-muted">Please review feedback and resubmit.</p>
                    </div>
                  )}

                  {/* Pending / Rejected — Step 1 button */}
                  {(subType === 'individual' || (subType === 'group' && leaderInfo?.is_leader)) && (status === 'pending' || status === 'rejected') && (
                    <button onClick={() => handleConfirmStep1(assignment)}
                      className="w-full py-3 px-4 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90 hover:shadow-md">
                      {status === 'rejected' ? 'Resubmit Link' : 'Yes, I Have Submitted'}
                    </button>
                  )}

                  {/* Step 1 done — Final confirm button */}
                  {(subType === 'individual' || (subType === 'group' && leaderInfo?.is_leader)) && status === 'step1_confirmed' && (
                    <button onClick={() => handleConfirmFinal(assignment)}
                      className="w-full py-3 px-4 bg-accent text-paper font-semibold text-sm rounded transition-all duration-200 hover:opacity-90 hover:shadow-md">
                      Confirm Final Submission
                    </button>
                  )}

                  {/* Non-leader, group assignment, not yet confirmed */}
                  {subType === 'group' && leaderInfo && !leaderInfo.is_leader && !isConfirmedOrAccepted && status !== 'rejected' && (
                    <div className="text-center py-3 border border-rule dark:border-rule-strong rounded-lg bg-ink-faint/5">
                      <p className="text-ink-muted text-sm">
                        Only <span className="font-semibold text-ink dark:text-ink-dark">{leaderInfo.leader_name}</span> (group leader) can acknowledge this assignment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── GROUP TAB ────────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'group' && (
          <div className="space-y-6">
            {/* No Group → Create */}
            {!hasGroup && (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-serif text-ink dark:text-ink-dark mb-1">Create Your Group</h3>
                  <p className="text-ink-muted text-sm">Give your group a name and start adding members</p>
                </div>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Group Name</label>
                    <input type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                      placeholder="e.g. Team Alpha, Study Squad…" maxLength={100} />
                  </div>
                  <button type="submit" disabled={creating}
                    className="w-full py-3 px-6 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                    {creating ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : <span>Create Group</span>}
                  </button>
                </form>
              </div>
            )}

            {/* Has Group */}
            {hasGroup && group && (
              <>
                <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-xl font-serif text-ink dark:text-ink-dark mb-1">{group.name}</h3>
                      <p className="text-ink-muted text-sm">
                        {group.members.length} member{group.members.length !== 1 ? 's' : ''} · 
                        {group.is_creator ? ' You are the creator' : ` Created by ${group.members.find(m => m.id === group.created_by)?.name || 'Unknown'}`}
                        {isLeader && ' · Leader'}
                      </p>
                    </div>
                    <button onClick={handleLeaveGroup}
                      className="px-3 py-1.5 border border-accent-warn/40 text-accent-warn text-xs font-semibold rounded hover:bg-accent-warn/5 transition-all duration-200">
                      Leave Group
                    </button>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Members</h4>
                    <div className="border-t border-rule dark:border-rule-strong">
                      {group.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between py-3 border-b border-rule dark:border-rule-strong group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent text-paper rounded-full flex items-center justify-center text-sm font-semibold">
                              {getInitial(member.name)}
                            </div>
                            <div>
                              <p className="text-ink dark:text-ink-dark text-sm font-semibold flex items-center gap-2">
                                {member.name}
                                {member.id === group.created_by && <span className="text-ink-faint text-xs font-normal">Creator</span>}
                                {member.id === user?.id && <span className="text-ink-faint text-xs font-normal">You</span>}
                              </p>
                              <p className="text-ink-faint text-xs font-mono">{member.email}</p>
                            </div>
                          </div>
                          {group.is_creator && member.id !== user?.id && (
                            <button onClick={() => handleRemoveMember(member.id, member.name)}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 px-3 py-1 border border-accent-warn/30 text-accent-warn text-xs font-semibold rounded hover:bg-accent-warn/5 transition-all duration-200">
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {group.is_creator && (
                  <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6">
                    <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">Add a Member</h3>
                    <p className="text-ink-muted text-sm mb-4">Enter the email address of a student to add them to your group.</p>
                    <form onSubmit={handleAddMember} className="flex gap-3">
                      <div className="flex-grow">
                        <input type="email" required value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
                          placeholder="student@university.edu" />
                      </div>
                      <button type="submit" disabled={adding}
                        className="px-5 py-3 bg-accent text-paper font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        {adding ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : <span>Add</span>}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
