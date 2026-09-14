// controllers/academicController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get list of all departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Error fetching departments' });
  }
};

// Get subjects and sections for a department
exports.getOnboardingData = async (req, res) => {
  try {
    const { departmentId } = req.query;
    if (!departmentId) {
      return res.status(400).json({ message: 'departmentId query parameter is required' });
    }

    const subjects = await prisma.subject.findMany({
      where: { departmentId },
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
    });

    const sections = await prisma.section.findMany({
      where: { departmentId },
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
    });

    res.json({ subjects, sections });
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    res.status(500).json({ message: 'Error fetching onboarding data' });
  }
};

// Get live enrolled count for student or professor
exports.getLiveCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: userId },
        include: {
          department: true,
          section: true,
        },
      });

      if (!studentProfile) {
        return res.status(400).json({ message: 'Student profile not found. Please complete onboarding.' });
      }

      // Live classmates count
      const count = await prisma.studentProfile.count({
        where: {
          departmentId: studentProfile.departmentId,
          semester: studentProfile.semester,
          sectionId: studentProfile.sectionId,
        },
      });

      // Get subjects for this student (auto-derived from department & semester)
      const subjects = await prisma.subject.findMany({
        where: {
          departmentId: studentProfile.departmentId,
          semester: studentProfile.semester,
        },
        orderBy: { name: 'asc' },
      });

      return res.json({
        role: 'STUDENT',
        sectionCount: count,
        sectionName: studentProfile.section.name,
        semester: studentProfile.semester,
        departmentCode: studentProfile.department.code,
        subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })),
      });

    } else if (userRole === 'PROFESSOR') {
      const professorProfile = await prisma.professorProfile.findUnique({
        where: { id: userId },
        include: {
          subjects: {
            include: {
              subject: true,
              section: true,
            },
          },
        },
      });

      if (!professorProfile) {
        return res.status(400).json({ message: 'Professor profile not found. Please complete onboarding.' });
      }

      const results = [];

      for (const mapping of professorProfile.subjects) {
        // Enrolled count = count of students matching the same department, semester, and section
        const count = await prisma.studentProfile.count({
          where: {
            departmentId: mapping.subject.departmentId,
            semester: mapping.subject.semester,
            sectionId: mapping.sectionId,
          },
        });

        results.push({
          mappingId: mapping.id,
          subjectId: mapping.subjectId,
          subjectName: mapping.subject.name,
          subjectCode: mapping.subject.code,
          sectionId: mapping.sectionId,
          sectionName: mapping.section.name,
          semester: mapping.subject.semester,
          enrolledCount: count,
        });
      }

      return res.json({
        role: 'PROFESSOR',
        classCounts: results,
      });
    }

    res.status(400).json({ message: 'Invalid user role' });
  } catch (error) {
    console.error('Error getting live counts:', error);
    res.status(500).json({ message: 'Error fetching live counts' });
  }
};

// Get subject dashboard data (subject details, slots, announcements, doubts, notes)
exports.getSubjectDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch the subject
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        department: true,
      }
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Get user section information to filter timetable slots & announcements
    let sectionId = null;
    let sectionName = '';
    let semester = null;

    if (userRole === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: userId },
        include: { section: true }
      });
      if (studentProfile) {
        sectionId = studentProfile.sectionId;
        sectionName = studentProfile.section.name;
        semester = studentProfile.semester;
      }
    }

    // Query Timetable Slots
    // If student, filter by subjectId and sectionId. If professor, return all slots for this subject taught by them.
    const slotsQuery = {
      subjectId: id,
    };
    if (userRole === 'STUDENT' && sectionId) {
      slotsQuery.sectionId = sectionId;
    } else if (userRole === 'PROFESSOR') {
      slotsQuery.professorId = userId;
    }

    const slots = await prisma.timetableSlot.findMany({
      where: slotsQuery,
      include: {
        section: true,
        professor: {
          include: {
            user: { select: { name: true } }
          }
        }
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    // Query Announcements
    // If student, filter by subjectId and sectionId. If professor, return all announcements for this subject sent by them.
    const annQuery = {
      subjectId: id,
    };
    if (userRole === 'STUDENT' && sectionId) {
      annQuery.sectionId = sectionId;
    } else if (userRole === 'PROFESSOR') {
      annQuery.senderId = userId;
    }

    const announcements = await prisma.announcement.findMany({
      where: annQuery,
      include: {
        sender: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Query Doubts
    // Doubts are linked to subjectId
    const doubts = await prisma.doubt.findMany({
      where: { subjectId: id },
      include: {
        user: { select: { name: true } },
        _count: { select: { answers: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Query Notes
    // Public notes linked to this subjectId
    const notes = await prisma.note.findMany({
      where: {
        subjectId: id,
        visibility: 'PUBLIC'
      },
      include: {
        user: { select: { name: true, role: true } },
        tags: true,
        _count: { select: { upvotes: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      subject,
      sectionName,
      semester,
      slots,
      announcements,
      doubts,
      notes
    });
  } catch (error) {
    console.error('Error fetching subject dashboard data:', error);
    res.status(500).json({ message: 'Error fetching subject dashboard data' });
  }
};
