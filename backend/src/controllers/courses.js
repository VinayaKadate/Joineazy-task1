const db = require('../models/db');

// ── GET /courses/mine — Courses for the current user ─────────────────────────
// Student: enrolled courses | Admin/Professor: courses taught
const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let courses;

    if (role === 'admin') {
      // Professor: courses they teach
      const result = await db.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
                (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS assignment_count
         FROM courses c
         WHERE c.professor_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      );
      courses = result.rows;
    } else {
      // Student: courses they're enrolled in
      const result = await db.query(
        `SELECT c.*,
                u.name AS professor_name,
                (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS assignment_count
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = c.professor_id
         WHERE e.student_id = $1
         ORDER BY c.title ASC`,
        [userId]
      );
      courses = result.rows;
    }

    res.json({ courses });
  } catch (error) {
    console.error('Get My Courses Error:', error);
    res.status(500).json({ error: 'Server error while fetching courses' });
  }
};

// ── GET /courses/:id — Get a single course ───────────────────────────────────
const getCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    const result = await db.query(
      `SELECT c.*, u.name AS professor_name
       FROM courses c
       JOIN users u ON u.id = c.professor_id
       WHERE c.id = $1`,
      [courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = result.rows[0];

    // Verify access: professor must own the course, student must be enrolled
    if (role === 'admin' && course.professor_id !== userId) {
      return res.status(403).json({ error: 'You do not teach this course' });
    }
    if (role === 'student') {
      const enrolled = await db.query(
        'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      if (enrolled.rows.length === 0) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }

    // Fetch enrolled students count
    const studentCount = await db.query(
      'SELECT COUNT(*) FROM enrollments WHERE course_id = $1',
      [courseId]
    );
    course.student_count = parseInt(studentCount.rows[0].count);

    res.json({ course });
  } catch (error) {
    console.error('Get Course Error:', error);
    res.status(500).json({ error: 'Server error while fetching course' });
  }
};

// ── GET /courses/:id/assignments — Assignments scoped to a course ────────────
const getCourseAssignments = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    // Verify the course exists
    const courseResult = await db.query('SELECT id, professor_id FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Verify access
    if (role === 'admin' && course.professor_id !== userId) {
      return res.status(403).json({ error: 'You do not teach this course' });
    }
    if (role === 'student') {
      const enrolled = await db.query(
        'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      if (enrolled.rows.length === 0) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }

    // Fetch assignments for this course
    const result = await db.query(
      `SELECT a.*, u.name AS creator_name
       FROM assignments a
       JOIN users u ON u.id = a.created_by
       WHERE a.course_id = $1
       ORDER BY a.due_date ASC`,
      [courseId]
    );

    // For each assignment, fetch targeted groups and submission status
    const assignments = await Promise.all(
      result.rows.map(async (assignment) => {
        let targeted_groups = [];
        if (assignment.target === 'specific') {
          const tgResult = await db.query(
            `SELECT g.id, g.name FROM assignment_targets at
             JOIN groups g ON g.id = at.group_id
             WHERE at.assignment_id = $1`,
            [assignment.id]
          );
          targeted_groups = tgResult.rows;
        }

        // For students, include their group's submission status
        let submission_status = null;
        if (role === 'student') {
          let subQuery = '';
          if (assignment.submission_type === 'individual') {
            subQuery = `SELECT s.status, s.confirmed_at, s.submission_link
                        FROM submissions s
                        WHERE s.assignment_id = $1 AND s.user_id = $2
                        LIMIT 1`;
          } else {
            subQuery = `SELECT s.status, s.confirmed_at, s.submission_link
                        FROM submissions s
                        JOIN group_members gm ON gm.group_id = s.group_id
                        WHERE s.assignment_id = $1 AND gm.user_id = $2
                        LIMIT 1`;
          }
          const subResult = await db.query(subQuery, [assignment.id, userId]);
          if (subResult.rows.length > 0) {
            submission_status = subResult.rows[0];
          }
        }

        return { ...assignment, targeted_groups, submission_status };
      })
    );

    // For students, include their group's leader info
    let leader_info = null;
    if (role === 'student') {
      const leaderResult = await db.query(
        `SELECT g.id AS group_id, g.name AS group_name, g.leader_id, u.name AS leader_name
         FROM group_members gm
         JOIN groups g ON g.id = gm.group_id
         JOIN users u ON u.id = g.leader_id
         WHERE gm.user_id = $1
         LIMIT 1`,
        [userId]
      );
      if (leaderResult.rows.length > 0) {
        leader_info = {
          ...leaderResult.rows[0],
          is_leader: leaderResult.rows[0].leader_id === userId,
        };
      }
    }

    res.json({ assignments, leader_info });
  } catch (error) {
    console.error('Get Course Assignments Error:', error);
    res.status(500).json({ error: 'Server error while fetching course assignments' });
  }
};

// ── POST /courses — Create a new course (Admin/Professor) ──────────────────
const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const professorId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    const result = await db.query(
      'INSERT INTO courses (title, description, professor_id) VALUES ($1, $2, $3) RETURNING *',
      [title, description || null, professorId]
    );

    res.status(201).json({ course: result.rows[0] });
  } catch (error) {
    console.error('Create Course Error:', error);
    res.status(500).json({ error: 'Server error while creating course' });
  }
};

// ── GET /courses — Get all courses (for student enrollment) ──────────────────
const getAllCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    // Get all courses with professor name and a flag indicating if the student is enrolled
    const result = await db.query(
      `SELECT c.*, 
              u.name AS professor_name,
              EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1) as is_enrolled
       FROM courses c
       JOIN users u ON u.id = c.professor_id
       ORDER BY c.title ASC`,
      [userId]
    );

    res.json({ courses: result.rows });
  } catch (error) {
    console.error('Get All Courses Error:', error);
    res.status(500).json({ error: 'Server error while fetching all courses' });
  }
};

// ── POST /courses/:id/enroll — Student enrolls in a course ───────────────────
const enrollCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verify course exists
    const courseCheck = await db.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const enrollCheck = await db.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    if (enrollCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    await db.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)',
      [userId, courseId]
    );

    res.status(200).json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Enroll Course Error:', error);
    res.status(500).json({ error: 'Server error while enrolling in course' });
  }
};

// ── GET /courses/:id/students — Enrolled students for a course ───────────────
const getCourseStudents = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verify course exists and professor owns it
    const courseResult = await db.query('SELECT id, professor_id FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (courseResult.rows[0].professor_id !== userId) {
      return res.status(403).json({ error: 'You do not teach this course' });
    }

    const result = await db.query(
      `SELECT u.id, u.name, u.email, e.enrolled_at,
              g.name AS group_name, g.id AS group_id
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       LEFT JOIN group_members gm ON gm.user_id = u.id
       LEFT JOIN groups g ON g.id = gm.group_id
       WHERE e.course_id = $1
       ORDER BY u.name ASC`,
      [courseId]
    );

    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get Course Students Error:', error);
    res.status(500).json({ error: 'Server error while fetching course students' });
  }
};

module.exports = {
  getMyCourses,
  getCourse,
  getCourseAssignments,
  getCourseStudents,
  createCourse,
  getAllCourses,
  enrollCourse,
};
