import api from './axios';

/** Get assignments for the current student's group */
export const getMyAssignments = () => api.get('/submissions/my-assignments');

/** Step 1 confirmation — now accepts submission_link */
export const confirmStep1 = (assignmentId, data) => api.post(`/submissions/${assignmentId}/confirm-step1`, data);

/** Final confirmation */
export const confirmFinal = (assignmentId) => api.post(`/submissions/${assignmentId}/confirm-final`);
