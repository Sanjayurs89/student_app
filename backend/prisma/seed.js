// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing database records
  await prisma.professorSubjectSection.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.professorProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Create Departments
  const cse = await prisma.department.create({
    data: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
    },
  });

  const ece = await prisma.department.create({
    data: {
      name: 'Electronics and Communication Engineering',
      code: 'ECE',
    },
  });

  console.log('Created Departments: CSE, ECE');

  // 3. Create Sections for CSE & ECE across Semesters 1, 2, 3
  const cseSections = [];
  const eceSections = [];

  // CSE Sections (Semesters 1-3, Sections A, B, C)
  for (let sem = 1; sem <= 3; sem++) {
    for (const secName of ['A', 'B', 'C']) {
      const sec = await prisma.section.create({
        data: {
          name: secName,
          semester: sem,
          departmentId: cse.id,
        },
      });
      cseSections.push(sec);
    }
  }

  // ECE Sections (Semesters 1-3, Sections A, B, C)
  for (let sem = 1; sem <= 3; sem++) {
    for (const secName of ['A', 'B', 'C']) {
      const sec = await prisma.section.create({
        data: {
          name: secName,
          semester: sem,
          departmentId: ece.id,
        },
      });
      eceSections.push(sec);
    }
  }

  console.log('Created Sections for Semesters 1-3');

  // 4. Create Subjects for CSE
  const cseSubjects = [
    // Semester 1
    { name: 'Mathematics I', code: 'MA101', semester: 1, departmentId: cse.id },
    { name: 'Introduction to Programming', code: 'CS101', semester: 1, departmentId: cse.id },
    // Semester 2
    { name: 'Mathematics II', code: 'MA102', semester: 2, departmentId: cse.id },
    { name: 'Data Structures', code: 'CS102', semester: 2, departmentId: cse.id },
    // Semester 3
    { name: 'Discrete Mathematics', code: 'CS201', semester: 3, departmentId: cse.id },
    { name: 'Object Oriented Programming', code: 'CS202', semester: 3, departmentId: cse.id },
    { name: 'Database Management Systems', code: 'CS203', semester: 3, departmentId: cse.id },
  ];

  for (const sub of cseSubjects) {
    await prisma.subject.create({ data: sub });
  }

  // Create Subjects for ECE
  const eceSubjects = [
    // Semester 1
    { name: 'Mathematics I', code: 'MA101-EC', semester: 1, departmentId: ece.id },
    { name: 'Basic Electronics', code: 'EC101', semester: 1, departmentId: ece.id },
    // Semester 2
    { name: 'Mathematics II', code: 'MA102-EC', semester: 2, departmentId: ece.id },
    { name: 'Network Analysis', code: 'EC102', semester: 2, departmentId: ece.id },
    // Semester 3
    { name: 'Digital Electronics', code: 'EC201', semester: 3, departmentId: ece.id },
    { name: 'Signals and Systems', code: 'EC202', semester: 3, departmentId: ece.id },
  ];

  for (const sub of eceSubjects) {
    await prisma.subject.create({ data: sub });
  }

  console.log('Created Subjects for CSE & ECE');
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
