import api from './axios';

/** Create a new assignment */
export const createAssignment = (data) => api.post('/assignments', data);

/** Update an assignment */
export const updateAssignment = (id, data) => api.put(`/assignments/${id}`, data);

/** Get all assignments */
export const getAllAssignments = () => api.get('/assignments');

/** Get a single assignment */
export const getAssignment = (id) => api.get(`/assignments/${id}`);

/** Delete an assignment */
export const deleteAssignment = (id) => api.delete(`/assignments/${id}`);

/** Get all groups (for admin targeting UI) */
export const getAllGroups = () => api.get('/assignments/groups');
