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

    // Get the group's leader_id so the frontend knows if this user is the leader
    const groupResult = await db.query(
      'SELECT leader_id FROM groups WHERE id = $1',
      [groupId]
    );
    const leaderId = groupResult.rows[0]?.leader_id;

    // Get assignments targeted to this group (target='all' OR specific target includes this group)
    const result = await db.query(
      `SELECT DISTINCT a.id, a.title, a.description, a.due_date, a.onedrive_link, a.target,
              a.course_id, a.submission_type, a.created_at,
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

    res.json({
      assignments: result.rows,
      group_id: groupId,
      is_leader: leaderId === userId,
      leader_id: leaderId,
    });
  } catch (error) {
    console.error('Get My Assignments Error:', error);
    res.status(500).json({ error: 'Server error while fetching assignments' });
  }
};

// ── POST /submissions/:assignmentId/acknowledge — Leader or individual acknowledgment ──
// For group assignments: only the group leader can acknowledge; propagates to all members.
// For individual assignments: any enrolled student can acknowledge their own.
const acknowledge = async (req, res) => {
  try {
    const userId = req.user.id;
    const assignmentId = parseInt(req.params.assignmentId);
    const { submission_link } = req.body;

    // Submission link is required
    if (!submission_link || !submission_link.trim()) {
      return res.status(400).json({ error: 'A submission link is required as proof of submission' });
    }

    // Get the assignment details
    const assignmentResult = await db.query(
      'SELECT id, submission_type, target FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignment = assignmentResult.rows[0];

    // Find the student's group
    const membershipResult = await db.query(
      'SELECT gm.group_id, g.leader_id FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1',
      [userId]
    );
    if (membershipResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not in any group' });
    }
    const { group_id: groupId, leader_id: leaderId } = membershipResult.rows[0];

    // Verify the assignment is targeted to this group
    const targetCheck = await db.query(
      `SELECT 1 FROM assignments a
       WHERE a.id = $1
         AND (a.target = 'all'
              OR EXISTS (SELECT 1 FROM assignment_targets at WHERE at.assignment_id = a.id AND at.group_id = $2))`,
      [assignmentId, groupId]
    );
    if (targetCheck.rows.length === 0) {
      return res.status(403).json({ error: 'This assignment is not assigned to your group' });
    }

    if (assignment.submission_type === 'group') {
      // ── GROUP ASSIGNMENT: only the leader can acknowledge ──
      if (userId !== leaderId) {
        return res.status(403).json({
          error: 'Only the group leader can acknowledge group assignments. Please ask your group leader to submit.',
        });
      }

      // Upsert submission for the group → confirmed immediately (leader acknowledgment)
      const result = await db.query(
        `INSERT INTO submissions (assignment_id, group_id, status, submission_link, confirmed_at)
         VALUES ($1, $2, 'confirmed', $3, NOW())
         ON CONFLICT (assignment_id, group_id)
         DO UPDATE SET status = 'confirmed', submission_link = $3, confirmed_at = NOW()
         WHERE submissions.status IN ('pending', 'step1_confirmed', 'rejected')
         RETURNING id, assignment_id, group_id, status, submission_link, confirmed_at`,
        [assignmentId, groupId, submission_link.trim()]
      );

      if (result.rows.length === 0) {
        const existing = await db.query(
          'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
          [assignmentId, groupId]
        );
        const currentStatus = existing.rows[0]?.status;
        if (currentStatus === 'confirmed' || currentStatus === 'accepted') {
          return res.status(400).json({ error: 'This assignment has already been acknowledged' });
        }
      }

      // Get all group members for the response (acknowledgment propagates to all)
      const membersResult = await db.query(
        `SELECT u.id, u.name, u.email FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1`,
        [groupId]
      );

      res.json({
        message: 'Group assignment acknowledged by leader — status updated for all group members',
        submission: result.rows[0],
        propagated_to: membersResult.rows,
      });

    } else {
      // ── INDIVIDUAL ASSIGNMENT: each student acknowledges their own ──
      // For individual assignments, we use the student's group but the acknowledgment is personal.
      // We still use the submissions table keyed by (assignment_id, group_id) for backward compat,
      // but the individual student is tracked.
      const result = await db.query(
        `INSERT INTO submissions (assignment_id, group_id, status, submission_link, confirmed_at)
         VALUES ($1, $2, 'confirmed', $3, NOW())
         ON CONFLICT (assignment_id, group_id)
         DO UPDATE SET status = 'confirmed', submission_link = $3, confirmed_at = NOW()
         WHERE submissions.status IN ('pending', 'step1_confirmed', 'rejected')
         RETURNING id, assignment_id, group_id, status, submission_link, confirmed_at`,
        [assignmentId, groupId, submission_link.trim()]
      );

      if (result.rows.length === 0) {
        const existing = await db.query(
          'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
          [assignmentId, groupId]
        );
        const currentStatus = existing.rows[0]?.status;
        if (currentStatus === 'confirmed' || currentStatus === 'accepted') {
          return res.status(400).json({ error: 'You have already acknowledged this assignment' });
        }
      }

      res.json({
        message: 'Individual assignment acknowledged successfully',
        submission: result.rows[0],
      });
    }
  } catch (error) {
    console.error('Acknowledge Error:', error);
    res.status(500).json({ error: 'Server error during acknowledgment' });
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

    // Find the student's group and check leader status
    const membershipResult = await db.query(
      'SELECT gm.group_id, g.leader_id FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1',
      [userId]
    );
    if (membershipResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not in any group' });
    }
    const { group_id: groupId, leader_id: leaderId } = membershipResult.rows[0];

    // Check assignment type and enforce leader rule
    const assignmentResult = await db.query(
      'SELECT id, submission_type FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (assignmentResult.rows[0].submission_type === 'group' && userId !== leaderId) {
      return res.status(403).json({
        error: 'Only the group leader can confirm group assignments.',
      });
    }

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

    // Find the student's group and check leader status
    const membershipResult = await db.query(
      'SELECT gm.group_id, g.leader_id FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1',
      [userId]
    );
    if (membershipResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not in any group' });
    }
    const { group_id: groupId, leader_id: leaderId } = membershipResult.rows[0];

    // Check assignment type and enforce leader rule
    const assignmentResult = await db.query(
      'SELECT id, submission_type FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (assignmentResult.rows[0].submission_type === 'group' && userId !== leaderId) {
      return res.status(403).json({
        error: 'Only the group leader can confirm group assignments.',
      });
    }

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

// ── GET /submissions/:assignmentId/status — Per-student and per-group status ──
// Available to both students (for their own group) and professors (for all groups).
const getSubmissionStatus = async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.user.id;
    const role = req.user.role;
    const statusFilter = req.query.status; // optional filter: 'pending', 'confirmed', etc.

    // Verify assignment exists
    const assignmentResult = await db.query(
      'SELECT id, title, target, submission_type, course_id FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignment = assignmentResult.rows[0];

    // Build the groups query based on target type
    let groupsQuery;
    let queryParams = [assignmentId];

    const statusClause = statusFilter
      ? `AND COALESCE(s.status, 'pending') = $${queryParams.length + 1}`
      : '';
    if (statusFilter) queryParams.push(statusFilter);

    if (assignment.target === 'all') {
      groupsQuery = `
        SELECT g.id AS group_id, g.name AS group_name, g.leader_id,
               leader_u.name AS leader_name,
               COALESCE(s.status, 'pending') AS submission_status,
               s.submission_link,
               s.admin_remarks,
               s.confirmed_at,
               (
                 SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
                 FROM group_members gm
                 JOIN users u ON gm.user_id = u.id
                 WHERE gm.group_id = g.id
               ) AS members
        FROM groups g
        LEFT JOIN submissions s ON s.group_id = g.id AND s.assignment_id = $1
        LEFT JOIN users leader_u ON leader_u.id = g.leader_id
        WHERE 1=1 ${statusClause}
        ORDER BY g.name ASC
      `;
    } else {
      groupsQuery = `
        SELECT g.id AS group_id, g.name AS group_name, g.leader_id,
               leader_u.name AS leader_name,
               COALESCE(s.status, 'pending') AS submission_status,
               s.submission_link,
               s.admin_remarks,
               s.confirmed_at,
               (
                 SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
                 FROM group_members gm
                 JOIN users u ON gm.user_id = u.id
                 WHERE gm.group_id = g.id
               ) AS members
        FROM assignment_targets at
        JOIN groups g ON at.group_id = g.id
        LEFT JOIN submissions s ON s.group_id = g.id AND s.assignment_id = $1
        LEFT JOIN users leader_u ON leader_u.id = g.leader_id
        WHERE at.assignment_id = $1 ${statusClause}
        ORDER BY g.name ASC
      `;
    }

    const groupsResult = await db.query(groupsQuery, queryParams);

    // For students, only return their own group's status
    let statuses = groupsResult.rows;
    if (role === 'student') {
      const membershipResult = await db.query(
        'SELECT group_id FROM group_members WHERE user_id = $1',
        [userId]
      );
      if (membershipResult.rows.length > 0) {
        const myGroupId = membershipResult.rows[0].group_id;
        statuses = statuses.filter(s => s.group_id === myGroupId);
      } else {
        statuses = [];
      }
    }

    // Compute summary stats
    const summary = {
      total: groupsResult.rows.length,
      pending: groupsResult.rows.filter(s => s.submission_status === 'pending').length,
      step1_confirmed: groupsResult.rows.filter(s => s.submission_status === 'step1_confirmed').length,
      confirmed: groupsResult.rows.filter(s => s.submission_status === 'confirmed').length,
      accepted: groupsResult.rows.filter(s => s.submission_status === 'accepted').length,
      rejected: groupsResult.rows.filter(s => s.submission_status === 'rejected').length,
    };

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        target: assignment.target,
        submission_type: assignment.submission_type,
      },
      summary,
      statuses,
    });
  } catch (error) {
    console.error('Get Submission Status Error:', error);
    res.status(500).json({ error: 'Server error while fetching submission status' });
  }
};

module.exports = { getMyAssignments, acknowledge, confirmStep1, confirmFinal, getSubmissionStatus };
