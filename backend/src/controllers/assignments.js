const db = require('../models/db');

// ── POST /assignments — Create a new assignment ──────────────────────────────
const createAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, due_date, onedrive_link, target, group_ids, course_id, submission_type } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!due_date) {
      return res.status(400).json({ error: 'Due date is required' });
    }

    // Validate course_id if provided
    if (course_id) {
      const courseCheck = await db.query('SELECT id, professor_id FROM courses WHERE id = $1', [course_id]);
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (courseCheck.rows[0].professor_id !== userId) {
        return res.status(403).json({ error: 'You can only create assignments for your own courses' });
      }
    }

    const assignmentTarget = target === 'specific' ? 'specific' : 'all';
    const subType = submission_type === 'individual' ? 'individual' : 'group';

    // Validate group_ids if target is specific
    if (assignmentTarget === 'specific') {
      if (!group_ids || !Array.isArray(group_ids) || group_ids.length === 0) {
        return res.status(400).json({ error: 'At least one group must be selected when target is "specific"' });
      }
    }

    // Create the assignment
    const result = await db.query(
      `INSERT INTO assignments (title, description, due_date, onedrive_link, created_by, target, course_id, submission_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, description, due_date, onedrive_link, created_by, target, course_id, submission_type, created_at`,
      [title.trim(), description || null, due_date, onedrive_link || null, userId, assignmentTarget, course_id || null, subType]
    );
    const assignment = result.rows[0];

    // If targeting specific groups, insert assignment_targets
    if (assignmentTarget === 'specific' && group_ids && group_ids.length > 0) {
      const targetValues = group_ids.map((gid, i) => `($1, $${i + 2})`).join(', ');
      const targetParams = [assignment.id, ...group_ids];
      await db.query(
        `INSERT INTO assignment_targets (assignment_id, group_id) VALUES ${targetValues}`,
        targetParams
      );
    }

    // Fetch the targeted groups for the response
    let targetedGroups = [];
    if (assignmentTarget === 'specific') {
      const tgResult = await db.query(
        `SELECT g.id, g.name FROM assignment_targets at
         JOIN groups g ON g.id = at.group_id
         WHERE at.assignment_id = $1`,
        [assignment.id]
      );
      targetedGroups = tgResult.rows;
    }

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: { ...assignment, targeted_groups: targetedGroups },
    });
  } catch (error) {
    console.error('Create Assignment Error:', error);
    res.status(500).json({ error: 'Server error while creating assignment' });
  }
};

// ── PUT /assignments/:id — Update an assignment ──────────────────────────────
const updateAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const assignmentId = parseInt(req.params.id);
    const { title, description, due_date, onedrive_link, target, group_ids, course_id, submission_type } = req.body;

    // Check ownership
    const existing = await db.query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (existing.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'You can only edit your own assignments' });
    }

    const assignmentTarget = target === 'specific' ? 'specific' : 'all';

    if (assignmentTarget === 'specific') {
      if (!group_ids || !Array.isArray(group_ids) || group_ids.length === 0) {
        return res.status(400).json({ error: 'At least one group must be selected when target is "specific"' });
      }
    }

    const subType = submission_type === 'individual' ? 'individual' : (submission_type === 'group' ? 'group' : existing.rows[0].submission_type);
    const updatedCourseId = course_id !== undefined ? (course_id || null) : existing.rows[0].course_id;

    // Update the assignment
    const result = await db.query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3, onedrive_link = $4, target = $5, course_id = $6, submission_type = $7
       WHERE id = $8
       RETURNING id, title, description, due_date, onedrive_link, created_by, target, course_id, submission_type, created_at`,
      [
        title?.trim() || existing.rows[0].title,
        description !== undefined ? description : existing.rows[0].description,
        due_date || existing.rows[0].due_date,
        onedrive_link !== undefined ? onedrive_link : existing.rows[0].onedrive_link,
        assignmentTarget,
        updatedCourseId,
        subType,
        assignmentId,
      ]
    );
    const assignment = result.rows[0];

    // Update assignment targets: delete old, insert new
    await db.query('DELETE FROM assignment_targets WHERE assignment_id = $1', [assignmentId]);

    if (assignmentTarget === 'specific' && group_ids && group_ids.length > 0) {
      const targetValues = group_ids.map((gid, i) => `($1, $${i + 2})`).join(', ');
      const targetParams = [assignmentId, ...group_ids];
      await db.query(
        `INSERT INTO assignment_targets (assignment_id, group_id) VALUES ${targetValues}`,
        targetParams
      );
    }

    // Fetch updated targeted groups
    let targetedGroups = [];
    if (assignmentTarget === 'specific') {
      const tgResult = await db.query(
        `SELECT g.id, g.name FROM assignment_targets at
         JOIN groups g ON g.id = at.group_id
         WHERE at.assignment_id = $1`,
        [assignmentId]
      );
      targetedGroups = tgResult.rows;
    }

    res.json({
      message: 'Assignment updated successfully',
      assignment: { ...assignment, targeted_groups: targetedGroups },
    });
  } catch (error) {
    console.error('Update Assignment Error:', error);
    res.status(500).json({ error: 'Server error while updating assignment' });
  }
};

// ── GET /assignments — Get all assignments (admin view) ──────────────────────
const getAllAssignments = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as creator_name
       FROM assignments a
       JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC`
    );

    // For each assignment, fetch targeted groups if applicable
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
        return { ...assignment, targeted_groups };
      })
    );

    res.json({ assignments });
  } catch (error) {
    console.error('Get All Assignments Error:', error);
    res.status(500).json({ error: 'Server error while fetching assignments' });
  }
};

// ── GET /assignments/:id — Get a single assignment ───────────────────────────
const getAssignment = async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);

    const result = await db.query(
      `SELECT a.*, u.name as creator_name
       FROM assignments a
       JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [assignmentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = result.rows[0];

    let targeted_groups = [];
    if (assignment.target === 'specific') {
      const tgResult = await db.query(
        `SELECT g.id, g.name FROM assignment_targets at
         JOIN groups g ON g.id = at.group_id
         WHERE at.assignment_id = $1`,
        [assignmentId]
      );
      targeted_groups = tgResult.rows;
    }

    res.json({ assignment: { ...assignment, targeted_groups } });
  } catch (error) {
    console.error('Get Assignment Error:', error);
    res.status(500).json({ error: 'Server error while fetching assignment' });
  }
};

// ── DELETE /assignments/:id — Delete an assignment ───────────────────────────
const deleteAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const assignmentId = parseInt(req.params.id);

    const existing = await db.query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (existing.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'You can only delete your own assignments' });
    }

    await db.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete Assignment Error:', error);
    res.status(500).json({ error: 'Server error while deleting assignment' });
  }
};

// ── GET /assignments/groups — Get all groups (for admin to target) ───────────
const getAllGroups = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, COUNT(gm.id) as member_count
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, g.name
       ORDER BY g.name ASC`
    );
    res.json({ groups: result.rows });
  } catch (error) {
    console.error('Get All Groups Error:', error);
    res.status(500).json({ error: 'Server error while fetching groups' });
  }
};

module.exports = { createAssignment, updateAssignment, getAllAssignments, getAssignment, deleteAssignment, getAllGroups };
