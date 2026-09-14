// controllers/roomController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new study room
exports.createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await prisma.studyRoom.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        creatorId: req.user.id,
        members: {
          create: {
            userId: req.user.id
          }
        }
      },
      include: {
        creator: {
          select: { name: true, role: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
            }
          }
        },
        _count: {
          select: { members: true, notes: true }
        }
      }
    });

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating study room:', error);
    res.status(500).json({ message: 'Error creating study room' });
  }
};

// Get all rooms the current user has joined
exports.getJoinedRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await prisma.studyRoom.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        creator: {
          select: { name: true, role: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
            }
          }
        },
        _count: {
          select: { members: true, notes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching joined study rooms:', error);
    res.status(500).json({ message: 'Error fetching joined study rooms' });
  }
};

// Search / discover study rooms that the user hasn't joined
exports.discoverRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await prisma.studyRoom.findMany({
      where: {
        NOT: {
          members: {
            some: { userId }
          }
        }
      },
      include: {
        creator: {
          select: { name: true, role: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rooms);
  } catch (error) {
    console.error('Error discovering study rooms:', error);
    res.status(500).json({ message: 'Error discovering study rooms' });
  }
};

// Join a study room
exports.joinRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ message: 'Study room not found' });
    }

    // Check if already a member
    const existingMember = await prisma.studyRoomMember.findUnique({
      where: {
        roomId_userId: { roomId, userId }
      }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this study room' });
    }

    await prisma.studyRoomMember.create({
      data: {
        roomId,
        userId
      }
    });

    res.json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Error joining study room:', error);
    res.status(500).json({ message: 'Error joining study room' });
  }
};

// Leave a study room
exports.leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ message: 'Study room not found' });
    }

    // Check membership
    const member = await prisma.studyRoomMember.findUnique({
      where: {
        roomId_userId: { roomId, userId }
      }
    });

    if (!member) {
      return res.status(400).json({ message: 'You are not a member of this study room' });
    }

    // If the creator leaves, delete the room entirely
    if (room.creatorId === userId) {
      await prisma.studyRoom.delete({
        where: { id: roomId }
      });
      return res.json({ message: 'Room deleted by its creator' });
    }

    // Otherwise just delete membership
    await prisma.studyRoomMember.delete({
      where: {
        roomId_userId: { roomId, userId }
      }
    });

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Error leaving study room:', error);
    res.status(500).json({ message: 'Error leaving study room' });
  }
};

// Get all notes uploaded to a specific room
exports.getRoomNotes = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    // Check membership
    const member = await prisma.studyRoomMember.findUnique({
      where: {
        roomId_userId: { roomId, userId }
      }
    });

    if (!member) {
      return res.status(403).json({ message: 'You must join this study room to view its notes' });
    }

    const notes = await prisma.note.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        tags: true,
        user: {
          select: { name: true, role: true }
        },
        _count: {
          select: { upvotes: true, comments: true }
        }
      }
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching room notes:', error);
    res.status(500).json({ message: 'Error fetching room notes' });
  }
};
