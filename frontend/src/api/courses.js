import api from './axios';

/** Get courses for the current user (student: enrolled, professor: taught) */
export const getMyCourses = () => api.get('/courses/mine');

/** Get all courses (student browsing) */
export const getAllCourses = () => api.get('/courses');

/** Enroll in a course (student) */
export const enrollCourse = (courseId) => api.post(`/courses/${courseId}/enroll`);

/** Get a single course by ID */
export const getCourse = (id) => api.get(`/courses/${id}`);

/** Get assignments scoped to a course */
export const getCourseAssignments = (courseId) => api.get(`/courses/${courseId}/assignments`);

/** Create a new course (professor only) */
export const createCourse = (data) => api.post('/courses', data);

/** Get enrolled students for a course (professor only) */
export const getCourseStudents = (courseId) => api.get(`/courses/${courseId}/students`);
