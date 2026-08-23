import api from './axios';

/** Create a new group */
export const createGroup = (name) => api.post('/groups', { name });

/** Get the current student's group + members */
export const getMyGroup = () => api.get('/groups/mine');

/** Add a member to a group by email */
export const addMember = (groupId, email) => api.post(`/groups/${groupId}/members`, { email });

/** Remove a member from a group */
export const removeMember = (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`);

/** Leave your current group */
export const leaveGroup = () => api.post('/groups/leave');
