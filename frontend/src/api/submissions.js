import api from './axios';

/** Get assignments for the current student's group */
export const getMyAssignments = () => api.get('/submissions/my-assignments');

/** Step 1 confirmation — now accepts FormData (file upload) */
export const confirmStep1 = (assignmentId, formData) => api.post(`/submissions/${assignmentId}/confirm-step1`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

/** Final confirmation */
export const confirmFinal = (assignmentId) => api.post(`/submissions/${assignmentId}/confirm-final`);
