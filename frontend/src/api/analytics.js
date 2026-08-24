import api from './axios';

/** Get analytics summary (total groups, students, assignments, completion rate) */
export const getAnalyticsSummary = () => api.get('/analytics/summary');

/** Get submission status breakdown for a specific assignment */
export const getAssignmentStatus = (id) => api.get(`/analytics/assignments/${id}/status`);

/** Accept a submission */
export const acceptSubmission = (assignmentId, groupId) => api.put(`/analytics/assignments/${assignmentId}/groups/${groupId}/accept`);

/** Reject a submission */
export const rejectSubmission = (assignmentId, groupId) => api.put(`/analytics/assignments/${assignmentId}/groups/${groupId}/reject`);
