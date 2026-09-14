// controllers/chatController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get the rooms the current user is authorized to be in
exports.getRooms = async (req, res) => {
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

      // Class Room for the student's department, semester, and section
      const classRoom = {
        roomId: `class:${studentProfile.departmentId}:${studentProfile.semester}:${studentProfile.sectionId}`,
        name: `${studentProfile.department.code} - Semester ${studentProfile.semester} - Section ${studentProfile.section.name}`,
        type: 'CLASS',
        description: `Official class discussion channel for ${studentProfile.department.code} Semester ${studentProfile.semester} Section ${studentProfile.section.name}`,
      };

      // Subject Rooms for the subjects in the student's department and semester
      const subjects = await prisma.subject.findMany({
        where: {
          departmentId: studentProfile.departmentId,
          semester: studentProfile.semester,
        },
        orderBy: { name: 'asc' },
      });

      const subjectRooms = subjects.map((sub) => ({
        roomId: `subject:${sub.id}:${studentProfile.sectionId}`,
        name: `${sub.name} (${sub.code})`,
        type: 'SUBJECT',
        description: `Subject discussion forum for ${sub.name} (${sub.code}) - Section ${studentProfile.section.name}`,
      }));

      // Fetch study rooms the student has joined
      const joinedRooms = await prisma.studyRoom.findMany({
        where: {
          members: {
            some: { userId }
          }
        },
        orderBy: { name: 'asc' }
      });

      const studyRooms = joinedRooms.map(room => ({
        roomId: `room:${room.id}`,
        name: `${room.name} (Study Group)`,
        type: 'ROOM',
        description: room.description || `Study room group discussion channel for ${room.name}`,
      }));

      return res.json([classRoom, ...subjectRooms, ...studyRooms]);

    } else if (userRole === 'PROFESSOR') {
      const professorProfile = await prisma.professorProfile.findUnique({
        where: { id: userId },
        include: {
          subjects: {
            include: {
              subject: {
                include: { department: true }
              },
              section: true,
            },
          },
        },
      });

      if (!professorProfile) {
        return res.status(400).json({ message: 'Professor profile not found. Please complete onboarding.' });
      }

      const roomsMap = new Map();

      for (const mapping of professorProfile.subjects) {
        // Add Class Room for this teaching assignment
        const classRoomId = `class:${mapping.subject.departmentId}:${mapping.subject.semester}:${mapping.sectionId}`;
        if (!roomsMap.has(classRoomId)) {
          roomsMap.set(classRoomId, {
            roomId: classRoomId,
            name: `${mapping.subject.department.code} - Semester ${mapping.subject.semester} - Section ${mapping.section.name}`,
            type: 'CLASS',
            description: `Official class discussion channel for ${mapping.subject.department.code} Semester ${mapping.subject.semester} Section ${mapping.section.name}`,
          });
        }

        // Add Subject Room for this teaching assignment
        const subjectRoomId = `subject:${mapping.subjectId}:${mapping.sectionId}`;
        if (!roomsMap.has(subjectRoomId)) {
          roomsMap.set(subjectRoomId, {
            roomId: subjectRoomId,
            name: `${mapping.subject.name} (${mapping.subject.code}) - Section ${mapping.section.name}`,
            type: 'SUBJECT',
            description: `Subject discussion forum for ${mapping.subject.name} (${mapping.subject.code}) - Section ${mapping.section.name}`,
          });
        }
      }

      // Fetch study rooms the professor has joined
      const joinedRooms = await prisma.studyRoom.findMany({
        where: {
          members: {
            some: { userId }
          }
        },
        orderBy: { name: 'asc' }
      });

      const studyRooms = joinedRooms.map(room => ({
        roomId: `room:${room.id}`,
        name: `${room.name} (Study Group)`,
        type: 'ROOM',
        description: room.description || `Study room group discussion channel for ${room.name}`,
      }));

      return res.json([...Array.from(roomsMap.values()), ...studyRooms]);
    }

    res.status(400).json({ message: 'Invalid user role' });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ message: 'Error fetching chat rooms' });
  }
};

// Get the message history for a specific room
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Fetch last 100 messages for this room
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ message: 'Error fetching room messages' });
  }
};
