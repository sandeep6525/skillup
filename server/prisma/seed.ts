import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SkillUp database with realistic platform data...');

  // 1. Categories
  const webDevCat = await prisma.category.upsert({
    where: { slug: 'web-development' },
    update: {},
    create: {
      name: 'Web Development',
      slug: 'web-development',
      icon: 'code',
      description: 'Master full-stack web engineering, React, TypeScript, and modern backend architectures.',
    },
  });

  const aiCat = await prisma.category.upsert({
    where: { slug: 'ai-data-science' },
    update: {},
    create: {
      name: 'AI & Data Science',
      slug: 'ai-data-science',
      icon: 'brain',
      description: 'Explore neural networks, machine learning models, and Python data intelligence.',
    },
  });

  const cloudCat = await prisma.category.upsert({
    where: { slug: 'cloud-devops' },
    update: {},
    create: {
      name: 'Cloud & DevOps',
      slug: 'cloud-devops',
      icon: 'cloud',
      description: 'Deploy resilient containerized workloads with Docker, Kubernetes, and CI/CD pipelines.',
    },
  });

  // 2. Users: Admin, Instructors, Student
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillup.com' },
    update: {},
    create: {
      name: 'Elena Rostova',
      email: 'admin@skillup.com',
      password: passwordHash,
      role: 'ADMIN',
      title: 'Head of Learning & Platform Operations',
      isVerified: true,
      bio: 'Overseeing pedagogical standards and educational engineering across SkillUp.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    },
  });

  const instructor1 = await prisma.user.upsert({
    where: { email: 'sarah.chen@skillup.com' },
    update: {},
    create: {
      name: 'Sarah Chen',
      email: 'sarah.chen@skillup.com',
      password: passwordHash,
      role: 'INSTRUCTOR',
      title: 'Principal Architect at CloudScale',
      isVerified: true,
      bio: 'Ex-Google staff engineer specializing in high-concurrency systems, TypeScript, and distributed databases.',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
      mentorProfile: {
        create: {
          expertise: 'TypeScript, System Design, Node.js, Distributed Systems',
          hourlyRate: 2500,
          experience: 12,
          rating: 4.9,
          totalReviews: 84,
          about: 'I help intermediate and senior developers crack system design interviews and architect scalable cloud backends.',
          slots: {
            create: [
              {
                startTime: new Date(Date.now() + 86400000 * 2), // in 2 days
                endTime: new Date(Date.now() + 86400000 * 2 + 3600000),
              },
              {
                startTime: new Date(Date.now() + 86400000 * 3), // in 3 days
                endTime: new Date(Date.now() + 86400000 * 3 + 3600000),
              },
            ],
          },
        },
      },
    },
  });

  const instructor2 = await prisma.user.upsert({
    where: { email: 'marcus.vance@skillup.com' },
    update: {},
    create: {
      name: 'Marcus Vance',
      email: 'marcus.vance@skillup.com',
      password: passwordHash,
      role: 'INSTRUCTOR',
      title: 'Lead AI Engineer & Author',
      isVerified: true,
      bio: 'Building LLM workflows and enterprise generative intelligence pipelines.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
      mentorProfile: {
        create: {
          expertise: 'Python, PyTorch, LangChain, Production RAG Systems',
          hourlyRate: 3000,
          experience: 9,
          rating: 4.95,
          totalReviews: 62,
          about: 'Mentoring AI engineers on deploying production RAG models, latency optimization, and vector search.',
          slots: {
            create: [
              {
                startTime: new Date(Date.now() + 86400000 * 1), // tomorrow
                endTime: new Date(Date.now() + 86400000 * 1 + 3600000),
              },
            ],
          },
        },
      },
    },
  });

  const demoStudent = await prisma.user.upsert({
    where: { email: 'student@skillup.com' },
    update: {},
    create: {
      name: 'Alex Rivera',
      email: 'student@skillup.com',
      password: passwordHash,
      role: 'STUDENT',
      title: 'Aspiring Full-Stack Software Engineer',
      isVerified: true,
      bio: 'Curious developer leveling up React 19, TypeScript, and microservice backend patterns.',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
    },
  });

  // 3. Courses with Modules and Lessons
  const fullstackCourse = await prisma.course.upsert({
    where: { slug: 'enterprise-fullstack-typescript-react-node' },
    update: {},
    create: {
      title: 'Enterprise Full-Stack: React 19, Node.js & Clean Architecture',
      slug: 'enterprise-fullstack-typescript-react-node',
      subtitle: 'Build production-ready, testable SaaS systems with Prisma, MySQL, and Docker.',
      description:
        'A comprehensive deep dive into building production-grade web applications. You will learn modern React 19 server components and client state, clean backend architecture with Express and TypeScript, Prisma schema design, Razorpay payment processing, and container orchestration.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
      previewVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      price: 2499,
      discountPrice: 1999,
      status: 'PUBLISHED',
      level: 'Intermediate to Advanced',
      language: 'English',
      instructorId: instructor1.id,
      categoryId: webDevCat.id,
      isFeatured: true,
      modules: {
        create: [
          {
            title: 'Module 1: Architecture Foundations & TypeScript Core',
            order: 1,
            lessons: {
              create: [
                {
                  title: '1.1 Domain-Driven Clean Architecture in Node.js',
                  description: 'Separating controllers, services, repositories, and entity schemas.',
                  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                  duration: 1240,
                  order: 1,
                  isFree: true,
                },
                {
                  title: '1.2 Advanced TypeScript Types, Generics & Zod Schemas',
                  description: 'Enforcing runtime and static safety across API contracts.',
                  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                  duration: 1820,
                  order: 2,
                  isFree: false,
                },
              ],
            },
          },
          {
            title: 'Module 2: Relational Modeling with MySQL 8.0 & Prisma',
            order: 2,
            lessons: {
              create: [
                {
                  title: '2.1 Schema Design, Indexes & Transaction Guarantees',
                  description: 'Eliminating race conditions and establishing ACID compliance.',
                  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                  duration: 2100,
                  order: 1,
                  isFree: false,
                },
                {
                  title: '2.2 Building Idempotent Razorpay Payment Handlers',
                  description: 'Cryptographic signature verification and webhook resilience.',
                  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                  duration: 1950,
                  order: 2,
                  isFree: false,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const aiCourse = await prisma.course.upsert({
    where: { slug: 'production-generative-ai-rag-systems' },
    update: {},
    create: {
      title: 'Production Generative AI: Architecting Scalable RAG Systems',
      slug: 'production-generative-ai-rag-systems',
      subtitle: 'Build enterprise vector pipelines, embeddings search, and LLM evaluations.',
      description:
        'Move beyond toy tutorials and learn how top tech firms build, evaluate, and monitor retrieval-augmented generation systems with hybrid keyword/vector search, re-ranking, and low-latency cache layers.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      previewVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      price: 3499,
      discountPrice: 2899,
      status: 'PUBLISHED',
      level: 'Advanced',
      language: 'English',
      instructorId: instructor2.id,
      categoryId: aiCat.id,
      isFeatured: true,
      modules: {
        create: [
          {
            title: 'Module 1: Vector Embeddings & Index Strategies',
            order: 1,
            lessons: {
              create: [
                {
                  title: '1.1 Chunking Strategies & Semantic Similarity',
                  description: 'Understanding chunk boundary degradation and hybrid indexing.',
                  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                  duration: 1540,
                  order: 1,
                  isFree: true,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 4. Enroll demoStudent in fullstack course with progress
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: demoStudent.id, courseId: fullstackCourse.id } },
    update: {},
    create: {
      userId: demoStudent.id,
      courseId: fullstackCourse.id,
      progress: 50,
    },
  });

  // 5. Hero Banners & Testimonials (Demo Content)
  await prisma.heroBanner.createMany({
    data: [
      {
        title: 'Accelerate Your Tech Career with Industry Mentors',
        subtitle:
          'Comprehensive project-based courses, 1-on-1 mentorship, live coding sessions, and accredited certifications.',
        badgeText: '✨ Spring 2026 Cohort Enrollments Live',
        ctaText: 'Explore All Courses',
        ctaLink: '/courses',
        order: 1,
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&q=80',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.testimonial.createMany({
    data: [
      {
        name: 'David Kim',
        role: 'Software Engineer',
        company: 'Vercel (Alumni)',
        content:
          'SkillUp transformed how I think about full-stack engineering. The 1-on-1 mentor code reviews were instrumental in landing my current role.',
        rating: 5,
        isDemo: true,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      },
      {
        name: 'Priya Sharma',
        role: 'Backend Developer',
        company: 'Stripe (Alumni)',
        content:
          'The depth in MySQL transactions and Razorpay webhook security is unparalleled. Everything here is taught like actual production code.',
        rating: 5,
        isDemo: true,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
      },
    ],
    skipDuplicates: true,
  });

  // 6. Live Class Demo
  const demoLiveClass = await prisma.liveClass.create({
    data: {
      title: 'Building Real-Time Data Streaming with WebSockets & Redis',
      description: 'Hands-on live engineering workshop with live Q&A and architecture teardown.',
      startTime: new Date(Date.now() + 86400000 * 3), // 3 days from now
      duration: 90,
      meetingUrl: 'https://meet.jit.si/skillup-live-streaming-demo',
      courseId: fullstackCourse.id,
      instructorId: instructor1.id,
    },
  });

  // 7. Additional Students for realistic cohorts
  const student2 = await prisma.user.upsert({
    where: { email: 'rohan.patel@example.com' },
    update: {},
    create: {
      name: 'Rohan Patel',
      email: 'rohan.patel@example.com',
      password: passwordHash,
      role: 'STUDENT',
      title: 'Junior Frontend Engineer',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'ananya.iyer@example.com' },
    update: {},
    create: {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@example.com',
      password: passwordHash,
      role: 'STUDENT',
      title: 'Full Stack Trainee',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    },
  });

  const student4 = await prisma.user.upsert({
    where: { email: 'neha.kapoor@example.com' },
    update: {},
    create: {
      name: 'Neha Kapoor',
      email: 'neha.kapoor@example.com',
      password: passwordHash,
      role: 'STUDENT',
      title: 'Computer Science Undergraduate',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    },
  });

  // Enroll students in courses
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: fullstackCourse.id } },
    update: {},
    create: { userId: student2.id, courseId: fullstackCourse.id, progress: 70 },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student3.id, courseId: fullstackCourse.id } },
    update: {},
    create: { userId: student3.id, courseId: fullstackCourse.id, progress: 40 },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student4.id, courseId: aiCourse.id } },
    update: {},
    create: { userId: student4.id, courseId: aiCourse.id, progress: 25 },
  });

  // 8. Batches
  const batchFS2026A = await prisma.batch.upsert({
    where: { code: 'FS-2026-A' },
    update: {},
    create: {
      name: 'Full Stack Elite Cohort - Spring 2026 A',
      code: 'FS-2026-A',
      courseId: fullstackCourse.id,
      startDate: new Date('2026-02-01'),
      status: 'ACTIVE',
      maxStudents: 50,
    },
  });

  const batchAI2026A = await prisma.batch.upsert({
    where: { code: 'AI-2026-A' },
    update: {},
    create: {
      name: 'Generative AI Production Batch - 2026 A',
      code: 'AI-2026-A',
      courseId: aiCourse.id,
      startDate: new Date('2026-02-15'),
      status: 'ACTIVE',
      maxStudents: 40,
    },
  });

  // Batch enrollments
  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchFS2026A.id, studentId: demoStudent.id } },
    update: {},
    create: { batchId: batchFS2026A.id, studentId: demoStudent.id },
  });

  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchFS2026A.id, studentId: student2.id } },
    update: {},
    create: { batchId: batchFS2026A.id, studentId: student2.id },
  });

  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchFS2026A.id, studentId: student3.id } },
    update: {},
    create: { batchId: batchFS2026A.id, studentId: student3.id },
  });

  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchAI2026A.id, studentId: student4.id } },
    update: {},
    create: { batchId: batchAI2026A.id, studentId: student4.id },
  });

  // 9. Admin Mentor Assignments (Core Business Workflow)
  // Sarah Chen assigned to Full Stack Batch A
  await prisma.mentorAssignment.upsert({
    where: {
      mentorId_courseId_batchId: {
        mentorId: instructor1.id,
        courseId: fullstackCourse.id,
        batchId: batchFS2026A.id,
      },
    },
    update: {},
    create: {
      mentorId: instructor1.id,
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
      scope: 'SPECIFIC_BATCH',
    },
  });

  // Marcus Vance assigned to AI course wide
  await prisma.mentorAssignment.upsert({
    where: {
      mentorId_courseId_batchId: {
        mentorId: instructor2.id,
        courseId: aiCourse.id,
        batchId: batchAI2026A.id,
      },
    },
    update: {},
    create: {
      mentorId: instructor2.id,
      courseId: aiCourse.id,
      batchId: batchAI2026A.id,
      scope: 'COURSE_WIDE',
    },
  });

  // 10. Scheduled Classes with Batch association
  const class1 = await prisma.liveClass.upsert({
    where: { roomName: 'fs-batch-a-clean-arch' },
    update: {},
    create: {
      roomName: 'fs-batch-a-clean-arch',
      title: 'Clean Architecture & Microservices in Node.js',
      description: 'Interactive live session covering domain-driven design, repositories, and unit testing.',
      startTime: new Date(Date.now() + 3600000 * 2), // in 2 hours
      duration: 75,
      status: 'SCHEDULED',
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
      instructorId: instructor1.id,
      meetingUrl: 'https://meet.jit.si/skillup-clean-arch-fs2026',
    },
  });

  const completedClass = await prisma.liveClass.upsert({
    where: { roomName: 'fs-batch-a-prisma-mysql' },
    update: {},
    create: {
      roomName: 'fs-batch-a-prisma-mysql',
      title: 'Advanced Prisma ORM & MySQL Performance Optimization',
      description: 'Connection pooling, query logging, indexes, and deadlock prevention in production.',
      startTime: new Date(Date.now() - 86400000 * 2), // 2 days ago
      duration: 90,
      status: 'COMPLETED',
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
      instructorId: instructor1.id,
      meetingUrl: 'https://meet.jit.si/skillup-prisma-opt-fs2026',
    },
  });

  // Attendance Records for completed class
  await prisma.attendanceRecord.upsert({
    where: { liveClassId_studentId: { liveClassId: completedClass.id, studentId: demoStudent.id } },
    update: {},
    create: { liveClassId: completedClass.id, studentId: demoStudent.id, status: 'PRESENT' },
  });

  await prisma.attendanceRecord.upsert({
    where: { liveClassId_studentId: { liveClassId: completedClass.id, studentId: student2.id } },
    update: {},
    create: { liveClassId: completedClass.id, studentId: student2.id, status: 'PRESENT' },
  });

  await prisma.attendanceRecord.upsert({
    where: { liveClassId_studentId: { liveClassId: completedClass.id, studentId: student3.id } },
    update: {},
    create: { liveClassId: completedClass.id, studentId: student3.id, status: 'LATE', remarks: 'Joined 15 mins late' },
  });

  // 11. Learning Materials (Idempotent Upsert)
  await prisma.learningMaterial.upsert({
    where: { id: 'mat-fs-arch-handbook-2026' },
    update: {},
    create: {
      id: 'mat-fs-arch-handbook-2026',
      title: 'Full-Stack Architecture Handbook & Cheatsheet (2026)',
      description: 'Comprehensive guidelines for clean layered architecture, error handling, and Zod validation.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'PDF',
      fileSize: 2450000,
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
      uploaderId: instructor1.id,
    },
  });

  await prisma.learningMaterial.upsert({
    where: { id: 'mat-prisma-mysql-tuning-script' },
    update: {},
    create: {
      id: 'mat-prisma-mysql-tuning-script',
      title: 'Prisma 6 & MySQL Connection Tuning Script',
      description: 'Production-ready database pool config and connection diagnostics.',
      fileUrl: 'https://raw.githubusercontent.com/prisma/prisma-examples/latest/databases/mysql/package.json',
      type: 'CODE_FILE',
      fileSize: 45000,
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
      uploaderId: instructor1.id,
    },
  });

  // 12. Assignments & Submissions
  const assignment1 = await prisma.assignment.upsert({
    where: { id: 'asgn-clean-arch-fs2026' },
    update: {},
    create: {
      id: 'asgn-clean-arch-fs2026',
      title: 'Refactor Express Monolith to Clean Repository Pattern',
      description: 'Implement decoupled controller, service, repository layers with full unit test coverage.',
      totalPoints: 100,
      dueDate: new Date(Date.now() + 86400000 * 5),
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
    },
  });

  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment1.id, studentId: demoStudent.id } },
    update: {},
    create: {
      assignmentId: assignment1.id,
      studentId: demoStudent.id,
      content: 'GitHub repository: https://github.com/alexrivera/clean-express-api with Jest test suites.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      status: 'SUBMITTED',
      grade: null,
      submittedAt: new Date(Date.now() - 3600000 * 12),
    },
  });

  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment1.id, studentId: student2.id } },
    update: {},
    create: {
      assignmentId: assignment1.id,
      studentId: student2.id,
      content: 'Refactored services and added transactional rollback tests.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      status: 'GRADED',
      grade: 92,
      feedback: 'Excellent separation of concerns and clear DTO definitions. Well done!',
      submittedAt: new Date(Date.now() - 86400000 * 1),
      gradedAt: new Date(Date.now() - 3600000 * 4),
    },
  });

  // 13. Assessments & Questions
  const assessment1 = await prisma.assessment.upsert({
    where: { id: 'asmt-ts-react-midterm' },
    update: {},
    create: {
      id: 'asmt-ts-react-midterm',
      title: 'Full Stack Midterm Assessment: TypeScript & System Design',
      description: 'Evaluation covering generics, concurrency, caching, and state management.',
      durationMins: 60,
      totalMarks: 50,
      passingMarks: 25,
      courseId: fullstackCourse.id,
      batchId: batchFS2026A.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: 'What is the primary difference between type alias and interface declaration in TypeScript?',
            questionType: 'MCQ',
            optionsJson: JSON.stringify([
              'Interfaces support declaration merging, whereas types do not.',
              'Types can only represent primitive values.',
              'Interfaces cannot be implemented by classes.',
              'There is no functional difference.',
            ]),
            correctOpt: 'Interfaces support declaration merging, whereas types do not.',
            marks: 10,
            order: 1,
          },
          {
            questionText: 'Which HTTP status code is most appropriate when a resource is created asynchronously?',
            questionType: 'MCQ',
            optionsJson: JSON.stringify(['200 OK', '201 Created', '202 Accepted', '204 No Content']),
            correctOpt: '202 Accepted',
            marks: 10,
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.assessmentSubmission.upsert({
    where: { assessmentId_studentId: { assessmentId: assessment1.id, studentId: demoStudent.id } },
    update: {},
    create: {
      assessmentId: assessment1.id,
      studentId: demoStudent.id,
      score: 45,
      feedback: 'Great grasp of TypeScript type system and API status semantics.',
      answersJson: JSON.stringify({ '1': 'Interfaces support declaration merging', '2': '202 Accepted' }),
      submittedAt: new Date(Date.now() - 86400000 * 3),
      gradedAt: new Date(Date.now() - 86400000 * 2),
    },
  });

  // 14. Phase 3 Required Development Courses
  const pythonCourse = await prisma.course.upsert({
    where: { slug: 'python-programming-interview-prep' },
    update: {},
    create: {
      title: 'Python Programming and Interview Preparation',
      slug: 'python-programming-interview-prep',
      subtitle: 'Master data structures, algorithms, and technical interviews with Python 3.12.',
      description: 'Comprehensive Python interview preparation covering dynamic programming, graph traversal, concurrency, and OOP system design.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80',
      price: 1999,
      discountPrice: 1499,
      status: 'PUBLISHED',
      level: 'Beginner to Advanced',
      language: 'English',
      instructorId: instructor1.id,
      categoryId: webDevCat.id,
      isFeatured: true,
    },
  });

  const sqlCourse = await prisma.course.upsert({
    where: { slug: 'sql-and-database-management' },
    update: {},
    create: {
      title: 'SQL and Database Management',
      slug: 'sql-and-database-management',
      subtitle: 'Advanced MySQL, query tuning, indexing strategies, and relational schema modeling.',
      description: 'Master relational database management, query execution plans, transactions, replication, and performance optimization.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
      price: 1799,
      discountPrice: 1299,
      status: 'PUBLISHED',
      level: 'Intermediate',
      language: 'English',
      instructorId: instructor2.id,
      categoryId: webDevCat.id,
      isFeatured: true,
    },
  });

  // 15. Phase 3 Required Batches: PYTHON-2026-A, FULLSTACK-2026-A, DATA-2026-A
  const batchPython2026A = await prisma.batch.upsert({
    where: { code: 'PYTHON-2026-A' },
    update: {},
    create: {
      name: 'Python Masterclass Cohort 2026-A',
      code: 'PYTHON-2026-A',
      courseId: pythonCourse.id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-06-30'),
      status: 'ACTIVE',
      maxStudents: 50,
    },
  });

  const batchFullstack2026A = await prisma.batch.upsert({
    where: { code: 'FULLSTACK-2026-A' },
    update: {},
    create: {
      name: 'Full-Stack Web Engineering 2026-A',
      code: 'FULLSTACK-2026-A',
      courseId: fullstackCourse.id,
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-07-15'),
      status: 'ACTIVE',
      maxStudents: 60,
    },
  });

  const batchData2026A = await prisma.batch.upsert({
    where: { code: 'DATA-2026-A' },
    update: {},
    create: {
      name: 'Data Science and Analytics Cohort 2026-A',
      code: 'DATA-2026-A',
      courseId: aiCourse.id,
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-08-10'),
      status: 'ACTIVE',
      maxStudents: 45,
    },
  });

  // 16. Phase 3 Mentor Assignments
  // Sarah Chen assigned to Python and Full-Stack
  await prisma.mentorAssignment.upsert({
    where: {
      mentorId_courseId_batchId: {
        mentorId: instructor1.id,
        courseId: pythonCourse.id,
        batchId: batchPython2026A.id,
      },
    },
    update: {},
    create: {
      mentorId: instructor1.id,
      courseId: pythonCourse.id,
      batchId: batchPython2026A.id,
      scope: 'SPECIFIC_BATCH',
    },
  });

  await prisma.mentorAssignment.upsert({
    where: {
      mentorId_courseId_batchId: {
        mentorId: instructor1.id,
        courseId: fullstackCourse.id,
        batchId: batchFullstack2026A.id,
      },
    },
    update: {},
    create: {
      mentorId: instructor1.id,
      courseId: fullstackCourse.id,
      batchId: batchFullstack2026A.id,
      scope: 'SPECIFIC_BATCH',
    },
  });

  // Marcus Vance assigned to Data Science and SQL
  await prisma.mentorAssignment.upsert({
    where: {
      mentorId_courseId_batchId: {
        mentorId: instructor2.id,
        courseId: aiCourse.id,
        batchId: batchData2026A.id,
      },
    },
    update: {},
    create: {
      mentorId: instructor2.id,
      courseId: aiCourse.id,
      batchId: batchData2026A.id,
      scope: 'SPECIFIC_BATCH',
    },
  });

  const batchSql2026A = await prisma.batch.upsert({
    where: { code: 'SQL-2026-A' },
    update: {},
    create: {
      name: 'SQL & Database Architecture 2026-A',
      code: 'SQL-2026-A',
      courseId: sqlCourse.id,
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-07-30'),
      status: 'ACTIVE',
      maxStudents: 50,
    },
  });

  await prisma.mentorAssignment.upsert({
    where: {
      mentorId_courseId_batchId: {
        mentorId: instructor2.id,
        courseId: sqlCourse.id,
        batchId: batchSql2026A.id,
      },
    },
    update: {},
    create: {
      mentorId: instructor2.id,
      courseId: sqlCourse.id,
      batchId: batchSql2026A.id,
      scope: 'COURSE_WIDE',
    },
  });

  // 17. Phase 3 Required Students: Priya Sharma and Arjun Kumar
  const priyaStudent = await prisma.user.upsert({
    where: { email: 'priya.sharma@example.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      password: passwordHash,
      role: 'STUDENT',
      title: 'Aspiring Cloud Developer',
      isVerified: true,
      bio: 'Enthusiastic about databases, Python automation, and distributed web services.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    },
  });

  const arjunStudent = await prisma.user.upsert({
    where: { email: 'arjun.kumar@example.com' },
    update: {},
    create: {
      name: 'Arjun Kumar',
      email: 'arjun.kumar@example.com',
      password: passwordHash,
      role: 'STUDENT',
      title: 'Prospective Learner',
      isVerified: true,
      bio: 'Exploring platform offerings before enrolling.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    },
  });

  // Enrollments & Progress Variations
  // Priya: Completed fullstack course (100% progress + Certificate)
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: priyaStudent.id, courseId: fullstackCourse.id } },
    update: {},
    create: {
      userId: priyaStudent.id,
      courseId: fullstackCourse.id,
      progress: 100,
    },
  });

  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchFullstack2026A.id, studentId: priyaStudent.id } },
    update: {},
    create: { batchId: batchFullstack2026A.id, studentId: priyaStudent.id },
  });

  await prisma.certificate.upsert({
    where: { userId_courseId: { userId: priyaStudent.id, courseId: fullstackCourse.id } },
    update: {},
    create: {
      certificateNo: 'SKILLUP-2026-PRIYA-FS01',
      userId: priyaStudent.id,
      courseId: fullstackCourse.id,
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
  });

  // Neha Kapoor: Enrolled in Python course with 45% progress
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student4.id, courseId: pythonCourse.id } },
    update: {},
    create: {
      userId: student4.id,
      courseId: pythonCourse.id,
      progress: 45,
    },
  });

  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchPython2026A.id, studentId: student4.id } },
    update: {},
    create: { batchId: batchPython2026A.id, studentId: student4.id },
  });

  // Rohan Patel: Enrolled in Data Science course with 60% progress
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: aiCourse.id } },
    update: {},
    create: {
      userId: student2.id,
      courseId: aiCourse.id,
      progress: 60,
    },
  });

  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batchData2026A.id, studentId: student2.id } },
    update: {},
    create: { batchId: batchData2026A.id, studentId: student2.id },
  });

  // 18. Sample Coupons & Operational Records
  await prisma.coupon.upsert({
    where: { code: 'SKILLUP2026' },
    update: {},
    create: {
      code: 'SKILLUP2026',
      discountType: 'PERCENTAGE',
      discountVal: 20,
      minSpend: 999,
      maxDiscount: 1000,
      usageLimit: 200,
      isActive: true,
    },
  });

  // Sample Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEED',
      resource: 'PLATFORM_BOOTSTRAP',
      details: 'Automated platform seed executed with standard cohorts, courses, and role configurations.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✅ SkillUp Database seeded with realistic Cohorts, Mentors & Batches!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
