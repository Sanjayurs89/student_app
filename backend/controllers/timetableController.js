// controllers/timetableController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get weekly timetable
exports.getTimetable = async (req, res) => {
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

      const slots = await prisma.timetableSlot.findMany({
        where: {
          sectionId: studentProfile.sectionId
        },
        include: {
          subject: true,
          professor: {
            include: {
              user: {
                select: { name: true, role: true }
              }
            }
          }
        }
      });

      return res.json(slots);

    } else if (userRole === 'PROFESSOR') {
      const slots = await prisma.timetableSlot.findMany({
        where: {
          professorId: userId
        },
        include: {
          subject: true,
          section: {
            include: {
              department: true
            }
          }
        }
      });

      return res.json(slots);
    }

    res.status(400).json({ message: 'Invalid user role' });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ message: 'Error fetching timetable' });
  }
};

// Create a timetable slot (Professors only)
exports.createSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'PROFESSOR') {
      return res.status(403).json({ message: 'Only faculty members can schedule classes' });
    }

    const { dayOfWeek, startTime, endTime, location, subjectId, sectionId } = req.body;

    if (!dayOfWeek || !startTime || !endTime || !location || !subjectId || !sectionId) {
      return res.status(400).json({ message: 'All slot details are required' });
    }

    // Verify teaching assignment mapping first
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

    // Create the slot
    const slot = await prisma.timetableSlot.create({
      data: {
        dayOfWeek: dayOfWeek.toUpperCase(),
        startTime,
        endTime,
        location: location.trim(),
        subjectId,
        sectionId,
        professorId: userId
      },
      include: {
        subject: true,
        section: {
          include: {
            department: true
          }
        }
      }
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error('Error creating timetable slot:', error);
    res.status(500).json({ message: 'Error creating timetable slot' });
  }
};

// Delete a timetable slot (Professors only)
exports.deleteSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const slotId = req.params.id;

    if (userRole !== 'PROFESSOR') {
      return res.status(403).json({ message: 'Only faculty members can modify schedules' });
    }

    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId }
    });

    if (!slot) {
      return res.status(404).json({ message: 'Schedule slot not found' });
    }

    // Verify ownership
    if (slot.professorId !== userId) {
      return res.status(403).json({ message: 'You cannot delete another professor\'s schedule slot' });
    }

    await prisma.timetableSlot.delete({
      where: { id: slotId }
    });

    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable slot:', error);
    res.status(500).json({ message: 'Error deleting timetable slot' });
  }
};
