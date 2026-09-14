// controllers/assignmentController.js
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const { uploadToSupabasePrivate, getSignedUrl } = require('../utils/supabaseClient');

const prisma = new PrismaClient();

// Multer memory storage configuration for private assignments uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.zip', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Allowed formats: PDF, PNG, JPG, JPEG, DOCX, ZIP, TXT'), false);
  }
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Get all assignments for current user (student or professor)
exports.getAssignments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: userId },
      });

      if (!studentProfile) {
        return res.status(400).json({ message: 'Student profile not found. Please complete onboarding.' });
      }

      const assignments = await prisma.assignment.findMany({
        where: { sectionId: studentProfile.sectionId },
        include: {
          subject: true,
          section: true,
          professor: {
            include: { user: { select: { name: true, email: true } } }
          },
          submissions: {
            where: { studentId: userId }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      return res.json(assignments);

    } else if (userRole === 'PROFESSOR') {
      const assignments = await prisma.assignment.findMany({
        where: { professorId: userId },
        include: {
          subject: true,
          section: true,
          submissions: {
            include: {
              student: {
                include: {
                  user: { select: { name: true, email: true } }
                }
              }
            },
            orderBy: { submittedAt: 'desc' }
          },
          _count: { select: { submissions: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(assignments);
    }

    res.status(400).json({ message: 'Invalid user role' });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
};

// Get single assignment with detailed submission breakdown
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: true,
        section: true,
        professor: {
          include: { user: { select: { name: true, email: true } } }
        },
        submissions: userRole === 'PROFESSOR' ? {
          include: {
            student: {
              include: { user: { select: { name: true, email: true } } }
            }
          },
          orderBy: { submittedAt: 'desc' }
        } : {
          where: { studentId: userId }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Get assignment by id error:', error);
    res.status(500).json({ message: 'Error fetching assignment details' });
  }
};

// Create a new assignment (Faculty only)
exports.createAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'PROFESSOR') {
      return res.status(403).json({ message: 'Only faculty members can create assignments' });
    }

    const { title, description, dueDate, subjectId, sectionId } = req.body;

    if (!title || !dueDate || !subjectId || !sectionId) {
      return res.status(400).json({ message: 'Title, Due Date, Subject, and Section are required' });
    }

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      const uploaded = await uploadToSupabasePrivate(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'assignments'
      );
      fileUrl = uploaded.filePath;
      fileName = req.file.originalname;
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        dueDate: new Date(dueDate),
        fileUrl,
        fileName,
        subjectId,
        sectionId,
        professorId: userId,
      },
      include: {
        subject: true,
        section: true
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: error.message || 'Error creating assignment' });
  }
};

// Submit an assignment (Students only)
exports.submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can submit assignments' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select a file to submit' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Upload file to private 'assignments' bucket under 'submissions'
    const uploaded = await uploadToSupabasePrivate(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'submissions'
    );

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        studentId_assignmentId: {
          studentId: userId,
          assignmentId: id,
        }
      },
      update: {
        fileUrl: uploaded.filePath,
        fileName: req.file.originalname,
        submittedAt: new Date(),
      },
      create: {
        studentId: userId,
        assignmentId: id,
        fileUrl: uploaded.filePath,
        fileName: req.file.originalname,
      }
    });

    res.status(200).json(submission);
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: error.message || 'Error submitting assignment' });
  }
};

// Grade a student submission (Faculty only)
exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'PROFESSOR') {
      return res.status(403).json({ message: 'Only faculty members can grade submissions' });
    }

    if (!grade || !grade.trim()) {
      return res.status(400).json({ message: 'Grade value is required' });
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade: grade.trim() }
    });

    res.json(updated);
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Error grading submission' });
  }
};

// Generate temporary Signed URL (1 hour) for private assignment files
exports.getSignedFileUrl = async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ message: 'filePath query parameter is required' });
    }

    // If filePath is already an absolute HTTP URL, return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return res.json({ signedUrl: filePath });
    }

    // Generate signed URL (expires in 3600 seconds = 1 hour)
    const signedUrl = await getSignedUrl('assignments', filePath, 3600);
    res.json({ signedUrl });
  } catch (error) {
    console.error('Get signed URL error:', error);
    res.status(500).json({ message: 'Error generating file download URL' });
  }
};
