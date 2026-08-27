import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getMyCourses, getCourseAssignments, getCourseStudents } from '../api/courses';
import { getAllAssignments, createAssignment, updateAssignment, deleteAssignment, getAllGroups } from '../api/assignments';
import { getAnalyticsSummary, getAssignmentStatus, acceptSubmission, rejectSubmission } from '../api/analytics';
import ThemeToggle from '../components/ThemeToggle';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'assignments'
  const [selectedCourse, setSelectedCourse] = useState(null);

  // ── Courses state ─────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseSubmissionStats, setCourseSubmissionStats] = useState({}); // { courseId: { total, confirmed } }

  // ── Course detail state ───────────────────────────────────────────────────
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loadingCourseAssignments, setLoadingCourseAssignments] = useState(false);
  const [assignmentStats, setAssignmentStats] = useState({}); // { assignmentId: { total, confirmed, pending, ... } }
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [assignmentStatuses, setAssignmentStatuses] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // ── Manage Assignments tab state (preserved from original) ────────────────
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
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

  // ── Feedback ──────────────────────────────────────────────────────────────
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ── Clear feedback after 4s ───────────────────────────────────────────────
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ══════════════════════════════════════════════════════════════════════════
  // COURSES TAB — Data Fetching
  // ══════════════════════════════════════════════════════════════════════════

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await getMyCourses();
      const fetchedCourses = res.data.courses || [];
      setCourses(fetchedCourses);

      // For each course, fetch assignments to compute submission stats
      const statsMap = {};
      await Promise.all(
        fetchedCourses.map(async (course) => {
          try {
            const assignRes = await getCourseAssignments(course.id);
            const courseAssigns = assignRes.data.assignments || [];
            let totalExpected = 0;
            let totalConfirmed = 0;

            // For each assignment, get status breakdown
            await Promise.all(
              courseAssigns.map(async (assignment) => {
                try {
                  const statusRes = await getAssignmentStatus(assignment.id);
                  const statuses = statusRes.data.statuses || [];
                  totalExpected += statuses.length;
                  totalConfirmed += statuses.filter(
                    s => s.submission_status === 'confirmed' || s.submission_status === 'accepted'
                  ).length;
                } catch {
                  // skip silently
                }
              })
            );

            statsMap[course.id] = { total: totalExpected, confirmed: totalConfirmed, assignmentCount: courseAssigns.length };
          } catch {
            statsMap[course.id] = { total: 0, confirmed: 0, assignmentCount: 0 };
          }
        })
      );
      setCourseSubmissionStats(statsMap);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ── Course drill-in ───────────────────────────────────────────────────────
  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setLoadingCourseAssignments(true);
    setExpandedAssignment(null);
    setAssignmentStatuses([]);
    try {
      const res = await getCourseAssignments(course.id);
      const assigns = res.data.assignments || [];
      setCourseAssignments(assigns);

      // Fetch per-assignment stats
      const statsMap = {};
      await Promise.all(
        assigns.map(async (assignment) => {
          try {
            const statusRes = await getAssignmentStatus(assignment.id);
            const statuses = statusRes.data.statuses || [];
            const confirmed = statuses.filter(s => s.submission_status === 'confirmed' || s.submission_status === 'accepted').length;
            const pending = statuses.filter(s => s.submission_status === 'pending').length;
            const partial = statuses.filter(s => s.submission_status === 'step1_confirmed').length;
            const rejected = statuses.filter(s => s.submission_status === 'rejected').length;
            statsMap[assignment.id] = { total: statuses.length, confirmed, pending, partial, rejected };
          } catch {
            statsMap[assignment.id] = { total: 0, confirmed: 0, pending: 0, partial: 0, rejected: 0 };
          }
        })
      );
      setAssignmentStats(statsMap);
    } catch (err) {
      console.error('Failed to fetch course assignments:', err);
    } finally {
      setLoadingCourseAssignments(false);
    }
  };

  // ── Expand assignment to see group-level detail ───────────────────────────
  const handleExpandAssignment = async (assignmentId) => {
    if (expandedAssignment === assignmentId) {
      setExpandedAssignment(null);
      setAssignmentStatuses([]);
      return;
    }
    setExpandedAssignment(assignmentId);
    setLoadingStatuses(true);
    try {
      const res = await getAssignmentStatus(assignmentId);
      setAssignmentStatuses(res.data.statuses || []);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  // ── Accept / Reject ───────────────────────────────────────────────────────
  const handleAccept = async (assignmentId, groupId) => {
    try {
      await acceptSubmission(assignmentId, groupId);
      setSuccess('Submission accepted');
      if (expandedAssignment === assignmentId) handleExpandAssignment(assignmentId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept submission');
    }
  };

  const handleReject = async (assignmentId, groupId) => {
    if (!window.confirm('Are you sure you want to reject this submission?')) return;
    try {
      await rejectSubmission(assignmentId, groupId);
      setSuccess('Submission rejected');
      if (expandedAssignment === assignmentId) handleExpandAssignment(assignmentId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject submission');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MANAGE ASSIGNMENTS TAB — Data Fetching (preserved from original)
  // ══════════════════════════════════════════════════════════════════════════

  const fetchAssignmentsData = async () => {
    setLoadingAssignments(true);
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
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchAssignmentsData();
    }
  }, [activeTab]);

  // ── Form Handlers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ title: '', description: '', due_date: '', onedrive_link: '', target: 'all', group_ids: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => { resetForm(); setShowForm(true); };

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
    setError(null); setSuccess(null); setSubmitting(true);
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
      await fetchAssignmentsData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete assignment "${title}"?`)) return;
    setError(null); setSuccess(null);
    try {
      await deleteAssignment(id);
      setSuccess('Assignment deleted');
      await fetchAssignmentsData();
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

  // ── Spinner component ────────────────────────────────────────────────────
  const Spinner = ({ text = 'Loading…', className = '' }) => (
    <div className={`flex flex-col items-center gap-4 py-12 ${className}`}>
      <svg className="animate-spin h-8 w-8 text-ink-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-ink-muted text-sm">{text}</p>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingCourses && activeTab === 'courses') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-paper-dark">
        <Spinner text="Loading dashboard…" />
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
              Professor Dashboard
            </h2>
            <p className="text-ink-muted text-sm">
              Manage your courses and track student submissions
            </p>
          </div>
          <div className="flex border-b border-rule dark:border-rule-strong">
            <button
              onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }}
              className={`py-2 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
                activeTab === 'courses' ? 'border-accent text-ink dark:text-ink-dark' : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`py-2 px-5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
                activeTab === 'assignments' ? 'border-accent text-ink dark:text-ink-dark' : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              Manage Assignments
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MY COURSES TAB — Course List (Landing) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && !selectedCourse && (
          <div>
            {courses.length === 0 ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Courses Yet</h3>
                <p className="text-ink-muted text-sm">You haven't created any courses. Use the seed script or create courses to get started.</p>
              </div>
            ) : (
              <div className="border border-rule dark:border-rule-strong rounded-xl overflow-hidden">
                {courses.map((course, idx) => {
                  const stats = courseSubmissionStats[course.id] || { total: 0, confirmed: 0, assignmentCount: 0 };
                  const completionPct = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;
                  return (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      className={`w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-paper dark:hover:bg-paper-dark transition-colors duration-150 group ${
                        idx !== 0 ? 'border-t border-rule dark:border-rule-strong' : ''
                      }`}
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      {/* Left: Course info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-mono text-ink-faint uppercase tracking-wider flex-shrink-0">
                            Course #{course.id}
                          </span>
                          <h3 className="text-base font-serif text-ink dark:text-ink-dark truncate group-hover:text-accent transition-colors duration-200">
                            {course.title}
                          </h3>
                        </div>
                        {course.description && (
                          <p className="text-ink-muted text-sm truncate">{course.description}</p>
                        )}
                        {/* Thin progress bar */}
                        <div className="w-full max-w-xs h-1 bg-rule dark:bg-rule-strong rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${completionPct}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Right: Stats */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-ink-muted uppercase tracking-wider">Students</p>
                          <p className="text-lg font-mono font-bold text-ink dark:text-ink-dark">{course.student_count || 0}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-ink-muted uppercase tracking-wider">Assignments</p>
                          <p className="text-lg font-mono font-bold text-ink dark:text-ink-dark">{stats.assignmentCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-ink-muted uppercase tracking-wider">Submitted</p>
                          <p className="text-lg font-mono font-bold text-ink dark:text-ink-dark">
                            {stats.confirmed}/{stats.total}
                          </p>
                        </div>
                        {/* Arrow */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ink-faint group-hover:text-accent transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MY COURSES TAB — Course Detail (Drill-In) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && selectedCourse && (
          <div className="space-y-6 animate-fade-in">
            {/* Back button + course header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedCourse(null); setCourseAssignments([]); setAssignmentStats({}); setExpandedAssignment(null); }}
                className="p-2 rounded hover:bg-rule/50 dark:hover:bg-rule-strong/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-grow">
                <p className="text-xs font-mono text-ink-faint uppercase tracking-wider">Course #{selectedCourse.id}</p>
                <h3 className="text-xl font-serif text-ink dark:text-ink-dark">{selectedCourse.title}</h3>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-ink-muted uppercase tracking-wider">Students Enrolled</p>
                <p className="text-lg font-mono font-bold text-ink dark:text-ink-dark">{selectedCourse.student_count || 0}</p>
              </div>
            </div>

            {selectedCourse.description && (
              <p className="text-ink-muted text-sm -mt-2 ml-11">{selectedCourse.description}</p>
            )}

            {/* Assignment list */}
            {loadingCourseAssignments ? (
              <Spinner text="Loading assignments…" />
            ) : courseAssignments.length === 0 ? (
              <div className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-12 text-center">
                <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">No Assignments</h3>
                <p className="text-ink-muted text-sm">No assignments have been created for this course yet. Use the "Manage Assignments" tab to create one.</p>
              </div>
            ) : (
              <div className="border border-rule dark:border-rule-strong rounded-xl overflow-hidden">
                {courseAssignments.map((assignment, idx) => {
                  const stats = assignmentStats[assignment.id] || { total: 0, confirmed: 0, pending: 0, partial: 0, rejected: 0 };
                  const completionPct = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;
                  const isExpanded = expandedAssignment === assignment.id;
                  const subType = assignment.submission_type || 'group';

                  return (
                    <div
                      key={assignment.id}
                      className={idx !== 0 ? 'border-t border-rule dark:border-rule-strong' : ''}
                    >
                      {/* Assignment row */}
                      <button
                        onClick={() => handleExpandAssignment(assignment.id)}
                        className="w-full text-left px-6 py-5 hover:bg-paper dark:hover:bg-paper-dark transition-colors duration-150 group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Assignment info */}
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-base font-serif text-ink dark:text-ink-dark group-hover:text-accent transition-colors truncate">
                                {assignment.title}
                              </h4>
                              <span className="text-xs font-mono text-ink-faint px-2 py-0.5 border border-rule dark:border-rule-strong rounded flex-shrink-0">
                                {subType}
                              </span>
                            </div>
                            {assignment.description && (
                              <p className="text-ink-muted text-sm truncate mb-2">{assignment.description}</p>
                            )}
                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                              <span className={isOverdue(assignment.due_date) ? 'text-accent-warn font-semibold' : ''}>
                                Due {formatDate(assignment.due_date)}
                              </span>
                              {assignment.onedrive_link && (
                                <a
                                  href={assignment.onedrive_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  OneDrive
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Right: Stats */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-ink-muted uppercase tracking-wider">Submitted</p>
                              <p className="text-lg font-mono font-bold text-ink dark:text-ink-dark">
                                {stats.confirmed}<span className="text-ink-faint font-normal">/{stats.total}</span>
                              </p>
                            </div>
                            {/* Progress ring (text-based) */}
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-ink-muted uppercase tracking-wider">Rate</p>
                              <p className="text-lg font-mono font-bold text-ink dark:text-ink-dark">{completionPct}%</p>
                            </div>
                            {/* Expand chevron */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-4 w-4 text-ink-faint transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        {/* Thin progress bar */}
                        <div className="w-full h-1 bg-rule dark:bg-rule-strong rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${completionPct}%` }}
                          ></div>
                        </div>

                        {/* Status summary text */}
                        <div className="flex gap-4 mt-2 text-xs text-ink-muted">
                          {stats.pending > 0 && <span>pending: {stats.pending}</span>}
                          {stats.partial > 0 && <span>partial: {stats.partial}</span>}
                          {stats.confirmed > 0 && <span>confirmed: {stats.confirmed}</span>}
                          {stats.rejected > 0 && <span className="text-accent-warn">rejected: {stats.rejected}</span>}
                        </div>
                      </button>

                      {/* Expanded: Group-level status table */}
                      {isExpanded && (
                        <div className="bg-paper dark:bg-paper-dark border-t border-rule dark:border-rule-strong">
                          {loadingStatuses ? (
                            <Spinner text="Loading group statuses…" />
                          ) : assignmentStatuses.length === 0 ? (
                            <div className="px-6 py-8 text-center text-ink-muted text-sm">
                              No groups assigned to this task.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-rule dark:border-rule-strong">
                                    <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                                      {subType === 'individual' ? 'Student' : 'Group'}
                                    </th>
                                    {subType !== 'individual' && (
                                      <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Members</th>
                                    )}
                                    <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Confirmed At</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {assignmentStatuses.map((row) => {
                                    const statusLabels = {
                                      pending: 'pending',
                                      step1_confirmed: 'partial (step 1)',
                                      confirmed: 'needs review',
                                      accepted: 'accepted',
                                      rejected: 'rejected',
                                    };

                                    return (
                                      <tr key={row.id} className="border-b border-rule dark:border-rule-strong last:border-b-0 hover:bg-paper-raised dark:hover:bg-paper-dark-raised transition-colors">
                                        <td className="px-6 py-3 font-semibold text-ink dark:text-ink-dark whitespace-nowrap">
                                          {row.name}
                                          {subType === 'individual' && (
                                            <div className="text-xs font-normal text-ink-muted mt-0.5">{row.email}</div>
                                          )}
                                        </td>
                                        {subType !== 'individual' && (
                                          <td className="px-6 py-3">
                                            <div className="flex flex-col gap-0.5">
                                              {row.members?.map((m) => (
                                                <span key={m.id} className="text-xs text-ink-muted">{m.name}</span>
                                              ))}
                                            </div>
                                          </td>
                                        )}
                                        <td className="px-6 py-3">
                                          <div className="flex flex-col gap-2 items-start">
                                            <span className="text-xs font-mono font-semibold text-ink dark:text-ink-dark uppercase tracking-wide">
                                              {statusLabels[row.submission_status]}
                                            </span>
                                            {row.submission_link && (
                                              <a
                                                href={row.submission_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-accent hover:underline font-medium"
                                              >
                                                view submission →
                                              </a>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-ink-muted font-mono text-xs">
                                          {row.confirmed_at ? formatDate(row.confirmed_at) : '—'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                          {row.submission_status === 'confirmed' && (
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => handleAccept(assignment.id, row.id)}
                                                className="px-3 py-1.5 border border-rule text-ink dark:text-ink-dark text-xs font-semibold rounded hover:border-accent hover:text-accent transition-all"
                                              >
                                                Accept
                                              </button>
                                              <button
                                                onClick={() => handleReject(assignment.id, row.id)}
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MANAGE ASSIGNMENTS TAB */}
        {/* ══════════════════════════════════════════════════════════════════ */}
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
            {loadingAssignments ? (
              <Spinner text="Loading assignments…" />
            ) : assignments.length === 0 && !showForm ? (
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
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl p-6 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-grow">
                        <h3 className="text-lg font-serif text-ink dark:text-ink-dark mb-1">{assignment.title}</h3>
                        {assignment.description && (
                          <p className="text-ink-muted text-sm line-clamp-2">{assignment.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
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

      </main>
    </div>
  );
};

export default AdminDashboard;
