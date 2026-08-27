const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const coursesController = require('../controllers/courses');

// All course routes require authentication
router.use(verifyToken);

// GET /courses — Get all courses (used by students to browse)
router.get('/', coursesController.getAllCourses);

// GET /courses/mine — Enrolled courses (student) or taught courses (professor)
router.get('/mine', coursesController.getMyCourses);

// POST /courses — Professor creates a new course
router.post('/', requireRole('admin'), coursesController.createCourse);

// POST /courses/:id/enroll — Student enrolls in a course
router.post('/:id/enroll', requireRole('student'), coursesController.enrollCourse);

// GET /courses/:id — Get a single course (both roles, access-checked in controller)
router.get('/:id', coursesController.getCourse);

// GET /courses/:id/assignments — Assignments scoped to a course (both roles)
router.get('/:id/assignments', coursesController.getCourseAssignments);

// GET /courses/:id/students — Enrolled students (professor only)
router.get('/:id/students', requireRole('admin'), coursesController.getCourseStudents);

module.exports = router;
