import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedQATestData() {
  console.log('--- Setting up Phase 1 QA Test Data ---');
  const passwordHash = await bcrypt.hash('QATestPass123!', 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'qa.admin@skillup.local' },
    update: {
      name: 'SkillUp QA Admin',
      role: 'ADMIN',
      isVerified: true,
      password: passwordHash,
    },
    create: {
      name: 'SkillUp QA Admin',
      email: 'qa.admin@skillup.local',
      role: 'ADMIN',
      isVerified: true,
      password: passwordHash,
      title: 'Senior QA Administrator',
    },
  });

  // 2. Mentor 1: Priya Raman
  const mentor1 = await prisma.user.upsert({
    where: { email: 'qa.mentor1@skillup.local' },
    update: {
      name: 'Priya Raman',
      role: 'INSTRUCTOR',
      isVerified: true,
      password: passwordHash,
      title: 'Python and Django Specialist',
    },
    create: {
      name: 'Priya Raman',
      email: 'qa.mentor1@skillup.local',
      role: 'INSTRUCTOR',
      isVerified: true,
      password: passwordHash,
      title: 'Python and Django Specialist',
    },
  });

  // 3. Mentor 2: Arjun Kumar
  const mentor2 = await prisma.user.upsert({
    where: { email: 'qa.mentor2@skillup.local' },
    update: {
      name: 'Arjun Kumar',
      role: 'INSTRUCTOR',
      isVerified: true,
      password: passwordHash,
      title: 'SQL and Database Management Specialist',
    },
    create: {
      name: 'Arjun Kumar',
      email: 'qa.mentor2@skillup.local',
      role: 'INSTRUCTOR',
      isVerified: true,
      password: passwordHash,
      title: 'SQL and Database Management Specialist',
    },
  });

  // 4. Student 1: Kavya Raj
  const student1 = await prisma.user.upsert({
    where: { email: 'qa.student1@skillup.local' },
    update: {
      name: 'Kavya Raj',
      role: 'STUDENT',
      isVerified: true,
      password: passwordHash,
    },
    create: {
      name: 'Kavya Raj',
      email: 'qa.student1@skillup.local',
      role: 'STUDENT',
      isVerified: true,
      password: passwordHash,
    },
  });

  // 5. Student 2: Naveen Kumar
  const student2 = await prisma.user.upsert({
    where: { email: 'qa.student2@skillup.local' },
    update: {
      name: 'Naveen Kumar',
      role: 'STUDENT',
      isVerified: true,
      password: passwordHash,
    },
    create: {
      name: 'Naveen Kumar',
      email: 'qa.student2@skillup.local',
      role: 'STUDENT',
      isVerified: true,
      password: passwordHash,
    },
  });

  // 6. Student 3: Divya S
  const student3 = await prisma.user.upsert({
    where: { email: 'qa.student3@skillup.local' },
    update: {
      name: 'Divya S',
      role: 'STUDENT',
      isVerified: true,
      password: passwordHash,
    },
    create: {
      name: 'Divya S',
      email: 'qa.student3@skillup.local',
      role: 'STUDENT',
      isVerified: true,
      password: passwordHash,
    },
  });

  // Category
  const cat = await prisma.category.upsert({
    where: { slug: 'qa-engineering' },
    update: {},
    create: {
      name: 'QA & Engineering',
      slug: 'qa-engineering',
      description: 'QA Certification Tracks',
    },
  });

  // Course A: Python Programming and Interview Preparation
  const courseA = await prisma.course.upsert({
    where: { slug: 'qa-python-programming-and-interview-prep' },
    update: {
      title: 'Python Programming and Interview Preparation',
      titleTa: 'பைதான் நிரலாக்கம் மற்றும் நேர்காணல் தயாரிப்பு',
      price: 1500,
      discountPrice: 1500,
      allowInstallments: true,
      minInstallmentAmount: 500,
      installmentCount: 3,
      installmentPolicy: 'RESTRICTED',
      instructorId: mentor1.id,
    },
    create: {
      title: 'Python Programming and Interview Preparation',
      titleTa: 'பைதான் நிரலாக்கம் மற்றும் நேர்காணல் தயாரிப்பு',
      slug: 'qa-python-programming-and-interview-prep',
      description: '[QA TEST RECORD] Comprehensive Python Programming & Interview Course',
      descriptionTa: '[QA TEST RECORD] பைதான் நிரலாக்க முழுமையான பாடநெறி',
      price: 1500,
      discountPrice: 1500,
      allowInstallments: true,
      minInstallmentAmount: 500,
      installmentCount: 3,
      installmentPolicy: 'RESTRICTED',
      status: 'PUBLISHED',
      level: 'All Levels',
      instructorId: mentor1.id,
      categoryId: cat.id,
    },
  });

  // Course B: SQL and Database Management
  const courseB = await prisma.course.upsert({
    where: { slug: 'qa-sql-and-database-management' },
    update: {
      title: 'SQL and Database Management',
      titleTa: 'SQL மற்றும் தரவுத்தள மேலாண்மை',
      price: 2000,
      discountPrice: 2000,
      allowInstallments: true,
      minInstallmentAmount: 500,
      installmentCount: 4,
      installmentPolicy: 'RESTRICTED',
      instructorId: mentor2.id,
    },
    create: {
      title: 'SQL and Database Management',
      titleTa: 'SQL மற்றும் தரவுத்தள மேலாண்மை',
      slug: 'qa-sql-and-database-management',
      description: '[QA TEST RECORD] Relational database engineering and SQL masterclass',
      descriptionTa: '[QA TEST RECORD] SQL மற்றும் தரவுத்தள முழுமையான பாடநெறி',
      price: 2000,
      discountPrice: 2000,
      allowInstallments: true,
      minInstallmentAmount: 500,
      installmentCount: 4,
      installmentPolicy: 'RESTRICTED',
      status: 'PUBLISHED',
      level: 'Intermediate',
      instructorId: mentor2.id,
      categoryId: cat.id,
    },
  });

  // Course C: React Full-Stack Development
  const courseC = await prisma.course.upsert({
    where: { slug: 'qa-react-full-stack-development' },
    update: {
      title: 'React Full-Stack Development',
      price: 2500,
      discountPrice: 2500,
      allowInstallments: false,
      minInstallmentAmount: null,
      installmentCount: 1,
      instructorId: admin.id,
    },
    create: {
      title: 'React Full-Stack Development',
      slug: 'qa-react-full-stack-development',
      description: '[QA TEST RECORD] Full Stack React & Node application development',
      price: 2500,
      discountPrice: 2500,
      allowInstallments: false,
      minInstallmentAmount: null,
      installmentCount: 1,
      status: 'PUBLISHED',
      level: 'Advanced',
      instructorId: admin.id,
      categoryId: cat.id,
    },
  });

  console.log('QA Test data initialized successfully.');
  return {
    admin,
    mentor1,
    mentor2,
    student1,
    student2,
    student3,
    courseA,
    courseB,
    courseC,
  };
}

if (require.main === module) {
  seedQATestData()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
