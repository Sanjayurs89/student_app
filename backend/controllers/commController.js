// controllers/commController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: userId }
      });

      if (!studentProfile) {
        return res.status(400).json({ message: 'Student profile not found. Please complete onboarding.' });
      }

      const announcements = await prisma.announcement.findMany({
        where: {
          sectionId: studentProfile.sectionId
        },
        include: {
          subject: true,
          sender: {
            select: { name: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(announcements);

    } else if (userRole === 'PROFESSOR') {
      const announcements = await prisma.announcement.findMany({
        where: {
          senderId: userId
        },
        include: {
          subject: true,
          section: {
            include: { department: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(announcements);
    }

    res.status(400).json({ message: 'Invalid user role' });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
};

// Create a course announcement (Professors only)
exports.createAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'PROFESSOR') {
      return res.status(403).json({ message: 'Only faculty members can post announcements' });
    }

    const { title, content, subjectId, sectionId } = req.body;

    if (!title || !title.trim() || !content || !content.trim() || !subjectId || !sectionId) {
      return res.status(400).json({ message: 'Announcement title, message body, subject, and section are required' });
    }

    // Verify teaching assignment
    const mapping = await prisma.professorSubjectSection.findUnique({
      where: {
        professorId_subjectId_sectionId: {
          professorId: userId,
          subjectId,
          sectionId
        }
      }
    });

    if (!mapping) {
      return res.status(403).json({ message: 'You are not assigned to teach this subject to this section' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        subjectId,
        sectionId,
        senderId: userId
      },
      include: {
        subject: true,
        section: {
          include: { department: true }
        }
      }
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Error creating announcement' });
  }
};

// Get doubts list (filterable by subject)
exports.getDoubts = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const whereClause = {};

    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    const doubts = await prisma.doubt.findMany({
      where: whereClause,
      include: {
        subject: true,
        user: {
          select: { name: true, role: true }
        },
        _count: {
          select: { answers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(doubts);
  } catch (error) {
    console.error('Error fetching doubts:', error);
    res.status(500).json({ message: 'Error fetching doubts' });
  }
};

// Ask a doubt (Students only)
exports.createDoubt = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can ask doubts' });
    }

    const { title, content, subjectId } = req.body;

    if (!title || !title.trim() || !content || !content.trim() || !subjectId) {
      return res.status(400).json({ message: 'Title, content, and subject are required' });
    }

    const doubt = await prisma.doubt.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        subjectId,
        userId
      },
      include: {
        subject: true,
        user: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(201).json(doubt);
  } catch (error) {
    console.error('Error creating doubt:', error);
    res.status(500).json({ message: 'Error creating doubt' });
  }
};

// Get doubt details and answers list
exports.getDoubtDetails = async (req, res) => {
  try {
    const doubtId = req.params.id;

    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId },
      include: {
        subject: true,
        user: {
          select: { name: true, role: true }
        },
        answers: {
          include: {
            user: {
              select: { name: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt post not found' });
    }

    res.json(doubt);
  } catch (error) {
    console.error('Error fetching doubt details:', error);
    res.status(500).json({ message: 'Error fetching doubt details' });
  }
};

// Answer a doubt (Students or Professors)
exports.answerDoubt = async (req, res) => {
  try {
    const userId = req.user.id;
    const doubtId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Resolution message cannot be empty' });
    }

    // Verify doubt exists
    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId }
    });

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt post not found' });
    }

    const answer = await prisma.doubtAnswer.create({
      data: {
        content: content.trim(),
        doubtId,
        userId
      },
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(201).json(answer);
  } catch (error) {
    console.error('Error answering doubt:', error);
    res.status(500).json({ message: 'Error resolution submit' });
  }
};
