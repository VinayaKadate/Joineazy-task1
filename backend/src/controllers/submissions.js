const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../models/db');

// ── Multer config for file uploads ──────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'submissions');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `submission-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common document/archive types
  const allowed = [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.txt', '.csv', '.json',
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${ext}" is not allowed. Accepted: ${allowed.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

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
              s.file_path,
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

    // Map file_path to a download URL (don't expose server paths)
    const assignments = result.rows.map(a => ({
      ...a,
      file_url: a.file_path ? `/submissions/file/${path.basename(a.file_path)}` : null,
      file_name: a.file_path ? path.basename(a.file_path) : null,
    }));
    delete assignments.forEach(a => delete a.file_path);

    res.json({ assignments, group_id: groupId });
  } catch (error) {
    console.error('Get My Assignments Error:', error);
    res.status(500).json({ error: 'Server error while fetching assignments' });
  }
};

// ── POST /submissions/:assignmentId/confirm-step1 — First confirmation + file upload
const confirmStep1 = [
  upload.single('file'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const assignmentId = parseInt(req.params.assignmentId);

      // File is required for step 1
      if (!req.file) {
        return res.status(400).json({ error: 'A file upload is required as proof of submission' });
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
        // Clean up uploaded file
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Assignment not found or not assigned to your group' });
      }

      const filePath = req.file.path;

      // Upsert the submission record — set to step1_confirmed with file
      const result = await db.query(
        `INSERT INTO submissions (assignment_id, group_id, status, file_path)
         VALUES ($1, $2, 'step1_confirmed', $3)
         ON CONFLICT (assignment_id, group_id)
         DO UPDATE SET status = 'step1_confirmed', file_path = $3
         WHERE submissions.status = 'pending'
         RETURNING id, assignment_id, group_id, status, file_path, confirmed_at, created_at`,
        [assignmentId, groupId, filePath]
      );

      if (result.rows.length === 0) {
        // Clean up uploaded file since we didn't use it
        fs.unlinkSync(filePath);
        const existing = await db.query(
          'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
          [assignmentId, groupId]
        );
        const currentStatus = existing.rows[0]?.status;
        if (currentStatus === 'step1_confirmed' || currentStatus === 'confirmed') {
          return res.status(400).json({ error: 'Submission has already been confirmed at this step or beyond' });
        }
      }

      res.json({ message: 'Step 1 confirmed with file upload — please do final confirmation', submission: result.rows[0] });
    } catch (error) {
      // Handle multer errors
      if (error.message && error.message.includes('File type')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Confirm Step 1 Error:', error);
      res.status(500).json({ error: 'Server error during step 1 confirmation' });
    }
  },
];

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
        return res.status(400).json({ error: 'You must complete Step 1 (with file upload) first' });
      }
      if (existing.rows[0].status === 'confirmed') {
        return res.status(400).json({ error: 'Submission is already fully confirmed' });
      }
      if (existing.rows[0].status === 'pending') {
        return res.status(400).json({ error: 'You must complete Step 1 before final confirmation' });
      }
    }

    res.json({ message: 'Submission fully confirmed!', submission: result.rows[0] });
  } catch (error) {
    console.error('Confirm Final Error:', error);
    res.status(500).json({ error: 'Server error during final confirmation' });
  }
};

// ── GET /submissions/file/:filename — Serve uploaded files ───────────────────
const getFile = (req, res) => {
  const filename = req.params.filename;
  // Prevent directory traversal
  const safeName = path.basename(filename);
  const filePath = path.join(uploadDir, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
};

module.exports = { getMyAssignments, confirmStep1, confirmFinal, getFile };
