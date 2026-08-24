const db = require('../models/db');

// ── GET /submissions/my-assignments — Get assignments for the student's group ─
const getMyAssignments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the student's group
    const membershipResult = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );

    if (membershipResult.rows.length === 0) {
      return res.json({ assignments: [], message: 'You are not in any group yet' });
    }

    const groupId = membershipResult.rows[0].group_id;

    // Get assignments targeted to this group (target='all' OR specific target includes this group)
    const result = await db.query(
      `SELECT DISTINCT a.id, a.title, a.description, a.due_date, a.onedrive_link, a.target, a.created_at,
              u.name as creator_name,
              COALESCE(s.status, 'pending') as submission_status,
              s.submission_link,
              s.admin_remarks,
              s.confirmed_at
       FROM assignments a
       JOIN users u ON u.id = a.created_by
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.group_id = $1
       WHERE a.target = 'all'
          OR EXISTS (
            SELECT 1 FROM assignment_targets at
            WHERE at.assignment_id = a.id AND at.group_id = $1
          )
       ORDER BY a.due_date ASC`,
      [groupId]
    );

    res.json({ assignments: result.rows, group_id: groupId });
  } catch (error) {
    console.error('Get My Assignments Error:', error);
    res.status(500).json({ error: 'Server error while fetching assignments' });
  }
};

// ── POST /submissions/:assignmentId/confirm-step1 — First confirmation + submission link
const confirmStep1 = async (req, res) => {
  try {
    const userId = req.user.id;
    const assignmentId = parseInt(req.params.assignmentId);
    const { submission_link } = req.body;

    // Submission link is required for step 1
    if (!submission_link || !submission_link.trim()) {
      return res.status(400).json({ error: 'A submission link is required as proof of submission' });
    }

    // Find the student's group
    const membershipResult = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    if (membershipResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not in any group' });
    }
    const groupId = membershipResult.rows[0].group_id;

    // Verify the assignment exists and is targeted to this group
    const assignmentCheck = await db.query(
      `SELECT a.id FROM assignments a
       WHERE a.id = $1
         AND (a.target = 'all'
              OR EXISTS (SELECT 1 FROM assignment_targets at WHERE at.assignment_id = a.id AND at.group_id = $2))`,
      [assignmentId, groupId]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found or not assigned to your group' });
    }

    // Upsert the submission record — set to step1_confirmed with link
    const result = await db.query(
      `INSERT INTO submissions (assignment_id, group_id, status, submission_link)
       VALUES ($1, $2, 'step1_confirmed', $3)
       ON CONFLICT (assignment_id, group_id)
       DO UPDATE SET status = 'step1_confirmed', submission_link = $3
       WHERE submissions.status IN ('pending', 'rejected')
       RETURNING id, assignment_id, group_id, status, submission_link, confirmed_at, created_at`,
      [assignmentId, groupId, submission_link.trim()]
    );

    if (result.rows.length === 0) {
      const existing = await db.query(
        'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
        [assignmentId, groupId]
      );
      const currentStatus = existing.rows[0]?.status;
      if (currentStatus === 'step1_confirmed' || currentStatus === 'confirmed' || currentStatus === 'accepted') {
        return res.status(400).json({ error: 'Submission has already been confirmed at this step or beyond' });
      }
    }

    res.json({ message: 'Step 1 confirmed with submission link — please do final confirmation', submission: result.rows[0] });
  } catch (error) {
    console.error('Confirm Step 1 Error:', error);
    res.status(500).json({ error: 'Server error during step 1 confirmation' });
  }
};

// ── POST /submissions/:assignmentId/confirm-final — Final confirmation ───────
const confirmFinal = async (req, res) => {
  try {
    const userId = req.user.id;
    const assignmentId = parseInt(req.params.assignmentId);

    // Find the student's group
    const membershipResult = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    if (membershipResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not in any group' });
    }
    const groupId = membershipResult.rows[0].group_id;

    // Update status from step1_confirmed → confirmed
    const result = await db.query(
      `UPDATE submissions
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE assignment_id = $1 AND group_id = $2 AND status = 'step1_confirmed'
       RETURNING id, assignment_id, group_id, status, confirmed_at, created_at`,
      [assignmentId, groupId]
    );

    if (result.rows.length === 0) {
      const existing = await db.query(
        'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
        [assignmentId, groupId]
      );
      if (existing.rows.length === 0) {
        return res.status(400).json({ error: 'You must complete Step 1 first' });
      }
      if (existing.rows[0].status === 'confirmed' || existing.rows[0].status === 'accepted') {
        return res.status(400).json({ error: 'Submission is already fully confirmed' });
      }
      if (existing.rows[0].status === 'pending') {
        return res.status(400).json({ error: 'You must complete Step 1 before final confirmation' });
      }
      if (existing.rows[0].status === 'rejected') {
        return res.status(400).json({ error: 'Submission was rejected. Please re-submit from Step 1 with the correct link.' });
      }
    }

    res.json({ message: 'Submission fully confirmed!', submission: result.rows[0] });
  } catch (error) {
    console.error('Confirm Final Error:', error);
    res.status(500).json({ error: 'Server error during final confirmation' });
  }
};

module.exports = { getMyAssignments, confirmStep1, confirmFinal };
