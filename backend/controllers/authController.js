// controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'college_app_super_secret_jwt_key_2026_!',
    { expiresIn: '30d' }
  );
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.toUpperCase();
    if (cleanRole !== 'STUDENT' && cleanRole !== 'PROFESSOR') {
      return res.status(400).json({ message: 'Invalid role. Must be STUDENT or PROFESSOR' });
    }

    // Email domain validation
    const allowedDomain = (process.env.COLLEGE_EMAIL_DOMAIN || 'college.edu').toLowerCase();
    const emailDomain = cleanEmail.split('@')[1];
    
    if (!emailDomain || emailDomain.toLowerCase() !== allowedDomain) {
      return res.status(400).json({ 
        message: `Registration is restricted to the college email domain: @${allowedDomain}` 
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
        isOnboarded: false,
      },
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials. User does not exist or wrong password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials. Please check your password.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login: ' + error.message });
  }
};

// User onboarding
exports.onboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { departmentId, semester, sectionId, subjects } = req.body;

    if (!departmentId) {
      return res.status(400).json({ message: 'Department is required' });
    }

    if (userRole === 'STUDENT') {
      if (!semester || !sectionId) {
        return res.status(400).json({ message: 'Semester and Section are required for students' });
      }

      // Upsert Student Profile
      await prisma.studentProfile.upsert({
        where: { id: userId },
        update: {
          departmentId,
          semester: parseInt(semester, 10),
          sectionId,
        },
        create: {
          id: userId,
          departmentId,
          semester: parseInt(semester, 10),
          sectionId,
        },
      });
    } else if (userRole === 'PROFESSOR') {
      if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ message: 'At least one subject mapping is required for professors' });
      }

      // Upsert Professor Profile
      await prisma.professorProfile.upsert({
        where: { id: userId },
        update: { departmentId },
        create: {
          id: userId,
          departmentId,
        },
      });

      // Clear existing mappings
      await prisma.professorSubjectSection.deleteMany({
        where: { professorId: userId },
      });

      // Build mapping data from selected subjects & sections
      const mappingData = [];
      for (const item of subjects) {
        const { subjectId, sectionIds } = item;
        if (!subjectId || !sectionIds || !Array.isArray(sectionIds)) continue;

        for (const secId of sectionIds) {
          mappingData.push({
            professorId: userId,
            subjectId,
            sectionId: secId,
          });
        }
      }

      // Deduplicate mapping data before inserting to prevent unique constraint errors
      const uniqueMappings = [];
      const seenKeys = new Set();
      for (const item of mappingData) {
        const key = `${item.professorId}_${item.subjectId}_${item.sectionId}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueMappings.push(item);
        }
      }

      if (uniqueMappings.length > 0) {
        await prisma.professorSubjectSection.createMany({
          data: uniqueMappings,
        });
      }
    }

    // Mark user as onboarded
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isOnboarded: true },
    });

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isOnboarded: updatedUser.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ message: 'Server error during onboarding' });
  }
};

// Get current user session details
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnboarded: true,
        createdAt: true,
        studentProfile: {
          include: {
            department: true,
            section: true,
          },
        },
        professorProfile: {
          include: {
            department: true,
            subjects: {
              include: {
                subject: true,
                section: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
