// controllers/notesController.js
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadToSupabase } = require('../utils/supabaseClient');

const prisma = new PrismaClient();

// Multer memory storage configuration for Supabase upload
const storage = multer.memoryStorage();

// File filter (PDF, Images, DOCX)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Images (PNG, JPG, JPEG), and DOCX files are allowed'), false);
  }
};

exports.upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, description, visibility, subjectId, roomId } = req.body;
    let { tags } = req.body;

    if (!title || !subjectId || !visibility) {
      return res.status(400).json({ message: 'Title, Subject, and Visibility are required fields' });
    }

    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    if (req.file) {
      // Upload file buffer to Supabase Storage
      const uploaded = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'notes'
      );
      fileUrl = uploaded.fileUrl;
      fileName = req.file.originalname;
      fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
    }

    // Parse tags (can be stringified JSON array or comma separated list)
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        // Fallback to comma separated split
        parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    // Process tags with lowercase unique mapping
    const tagConnectOrCreate = parsedTags.map(tagName => {
      const name = tagName.trim().toLowerCase();
      return {
        where: { name },
        create: { name },
      };
    });

    const note = await prisma.note.create({
      data: {
        title,
        content: content || null,
        fileUrl,
        fileName,
        fileType,
        description: description || null,
        visibility: visibility.toUpperCase(),
        roomId: roomId || null,
        subjectId,
        userId,
        tags: {
          connectOrCreate: tagConnectOrCreate,
        }
      },
      include: {
        tags: true,
        user: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: error.message || 'Error creating note' });
  }
};

// Browse and search notes
exports.getNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subjectId, tag, semester, search, sortBy, bookmarkedOnly } = req.query;

    // Fetch all study room IDs this user is a member of
    const joinedRooms = await prisma.studyRoomMember.findMany({
      where: { userId },
      select: { roomId: true }
    });
    const joinedRoomIds = joinedRooms.map(r => r.roomId);

    // Build the query where clause
    // A user can see their own notes, public notes, or notes in rooms they are members of
    const whereClause = {
      AND: [
        {
          OR: [
            { userId: userId },
            { visibility: 'PUBLIC' },
            {
              AND: [
                { visibility: 'ROOM' },
                { roomId: { in: joinedRoomIds } }
              ]
            }
          ]
        }
      ]
    };

    // Filters
    if (subjectId) {
      whereClause.AND.push({ subjectId });
    }

    if (semester) {
      whereClause.AND.push({
        subject: {
          semester: parseInt(semester, 10)
        }
      });
    }

    if (tag) {
      whereClause.AND.push({
        tags: {
          some: {
            name: tag.toLowerCase()
          }
        }
      });
    }

    if (search) {
      whereClause.AND.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { content: { contains: search } }
        ]
      });
    }

    if (bookmarkedOnly === 'true') {
      whereClause.AND.push({
        bookmarks: {
          some: {
            userId: userId
          }
        }
      });
    }

    // Determine sorting
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'upvotes') {
      orderBy = {
        upvotes: {
          _count: 'desc'
        }
      };
    } else if (sortBy === 'downloads') {
      orderBy = {
        downloadsCount: 'desc'
      };
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: orderBy,
      include: {
        tags: true,
        subject: {
          include: { department: true }
        },
        user: {
          select: { name: true, role: true }
        },
        _count: {
          select: { upvotes: true, comments: true }
        },
        upvotes: {
          where: { userId }
        },
        bookmarks: {
          where: { userId }
        }
      }
    });

    // Map output to include helper status booleans for frontend client
    const mappedNotes = notes.map(note => {
      const hasUpvoted = note.upvotes.length > 0;
      const hasBookmarked = note.bookmarks.length > 0;
      
      // Clean up relations we don't need to return fully
      const { upvotes, bookmarks, ...cleanedNote } = note;
      
      return {
        ...cleanedNote,
        upvotesCount: note._count.upvotes,
        commentsCount: note._count.comments,
        hasUpvoted,
        hasBookmarked
      };
    });

    res.json(mappedNotes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Error fetching notes' });
  }
};

// Fetch unique tags used on a specific subject
exports.getSubjectTags = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId query parameter is required' });
    }

    const tags = await prisma.tag.findMany({
      where: {
        notes: {
          some: {
            subjectId
          }
        }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(tags);
  } catch (error) {
    console.error('Error fetching subject tags:', error);
    res.status(500).json({ message: 'Error fetching tags' });
  }
};

// Toggle Pin Note (Faculty only)
exports.togglePinNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userRole = req.user.role;

    if (userRole !== 'PROFESSOR') {
      return res.status(403).json({ message: 'Only faculty members can pin recommended notes' });
    }

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
      include: {
        tags: true,
        user: { select: { name: true, role: true } }
      }
    });

    res.json(updatedNote);
  } catch (error) {
    console.error('Toggle pin note error:', error);
    res.status(500).json({ message: 'Error toggling pin status' });
  }
};


// Upvote / remove upvote from a note
exports.toggleUpvote = async (req, res) => {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        noteId_userId: {
          noteId,
          userId
        }
      }
    });

    if (existingUpvote) {
      await prisma.upvote.delete({
        where: {
          noteId_userId: {
            noteId,
            userId
          }
        }
      });
      return res.json({ upvoted: false, message: 'Upvote removed' });
    } else {
      await prisma.upvote.create({
        data: {
          noteId,
          userId
        }
      });
      return res.json({ upvoted: true, message: 'Note upvoted' });
    }
  } catch (error) {
    console.error('Toggle upvote error:', error);
    res.status(500).json({ message: 'Error toggling upvote' });
  }
};

// Bookmark / remove bookmark from a note
exports.toggleBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        noteId_userId: {
          noteId,
          userId
        }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          noteId_userId: {
            noteId,
            userId
          }
        }
      });
      return res.json({ bookmarked: false, message: 'Bookmark removed' });
    } else {
      await prisma.bookmark.create({
        data: {
          noteId,
          userId
        }
      });
      return res.json({ bookmarked: true, message: 'Note bookmarked' });
    }
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ message: 'Error toggling bookmark' });
  }
};

// Increment download counter
exports.incrementDownload = async (req, res) => {
  try {
    const noteId = req.params.id;
    await prisma.note.update({
      where: { id: noteId },
      data: {
        downloadsCount: {
          increment: 1
        }
      }
    });
    res.json({ message: 'Download counter incremented' });
  } catch (error) {
    console.error('Download increment error:', error);
    res.status(500).json({ message: 'Error incrementing download counter' });
  }
};

// Add comment to a note
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        noteId,
        userId
      },
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
};

// Fetch comments for a note
exports.getComments = async (req, res) => {
  try {
    const noteId = req.params.id;
    const comments = await prisma.comment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
};
