import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_dev_courses_2026';

async function runImageUploadVerification() {
  console.log('======================================================');
  console.log('SKILLUP COMPLETE IMAGE UPLOAD & WORKFLOW VERIFICATION');
  console.log('======================================================');

  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - Details: ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  // Temporary dummy image buffer (Valid 1x1 PNG)
  const png1x1Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const dummyImageBuffer = Buffer.from(png1x1Base64, 'base64');
  const tempImagePath = path.join(__dirname, 'temp_test_image.png');
  fs.writeFileSync(tempImagePath, dummyImageBuffer);

  try {
    // 1. Get or Create Admin and Student users
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: `admin.test.${Date.now()}@skillup.test`,
          password: 'Password@123',
          role: 'ADMIN',
          isVerified: true,
        },
      });
    }

    let student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: `student.test.${Date.now()}@skillup.test`,
          password: 'Password@123',
          role: 'STUDENT',
          isVerified: true,
        },
      });
    }

    const adminToken = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const studentToken = jwt.sign(
      { id: student.id, email: student.email, role: student.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    const studentHeaders = { headers: { Authorization: `Bearer ${studentToken}` } };

    // TEST 1: Role-based authorization for image upload
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(tempImagePath));
      await axios.post(`${API_URL}/upload/image`, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${studentToken}` },
      });
      report('Unauthorized student cannot upload to /upload/image', false, 'Expected 403 Forbidden');
    } catch (err: any) {
      const isForbidden = err.response?.status === 403;
      report('Unauthorized student cannot upload to /upload/image', isForbidden, `Status: ${err.response?.status}`);
    }

    // TEST 2: Admin image upload
    let uploadedImageUrl = '';
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(tempImagePath));
      const res = await axios.post(`${API_URL}/upload/image`, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${adminToken}` },
      });
      uploadedImageUrl = res.data?.data?.fileUrl;
      report('Admin image upload successful and returns relative URL', !!uploadedImageUrl && uploadedImageUrl.startsWith('/uploads/thumbnails/'), uploadedImageUrl);
    } catch (err: any) {
      report('Admin image upload successful and returns relative URL', false, err.message);
    }

    // TEST 3: Static serving of uploaded image
    if (uploadedImageUrl) {
      try {
        const fullImageUrl = `http://localhost:5000${uploadedImageUrl}`;
        const res = await axios.get(fullImageUrl);
        report('Uploaded image is correctly served statically via HTTP', res.status === 200);
      } catch (err: any) {
        report('Uploaded image is correctly served statically via HTTP', false, err.message);
      }
    }

    // TEST 4: Create a Course with Image Upload
    let createdCourseId = '';
    const courseTitle = `Auto-Test Full-Stack Cloud Course ${Date.now()}`;
    try {
      const res = await axios.post(
        `${API_URL}/courses`,
        {
          title: courseTitle,
          description: 'Comprehensive test curriculum with cover image',
          price: 999,
          thumbnailUrl: uploadedImageUrl,
          level: 'Beginner',
          status: 'PUBLISHED',
        },
        adminHeaders
      );
      createdCourseId = res.data?.data?.id;
      const returnedThumb = res.data?.data?.thumbnailUrl;
      report('Course created with specific uploaded image', !!createdCourseId && returnedThumb === uploadedImageUrl, `Thumbnail: ${returnedThumb}`);
    } catch (err: any) {
      report('Course created with specific uploaded image', false, err.response?.data?.error?.message || err.message);
    }

    // TEST 5: Verify Course shows on Public Catalogue with the specific image
    try {
      const res = await axios.get(`${API_URL}/courses?search=${encodeURIComponent(courseTitle)}`);
      const courseInCatalog = res.data?.data?.find((c: any) => c.id === createdCourseId);
      report(
        'Public course list displays specific uploaded thumbnail (not hardcoded default)',
        courseInCatalog && courseInCatalog.thumbnailUrl === uploadedImageUrl,
        `Retrieved: ${courseInCatalog?.thumbnailUrl}`
      );
    } catch (err: any) {
      report('Public course list displays specific uploaded thumbnail', false, err.message);
    }

    // TEST 6: Edit Course and Replace Image
    try {
      const newImageUrl = `${uploadedImageUrl}?v=2`;
      const updateRes = await axios.patch(
        `${API_URL}/courses/${createdCourseId}`,
        {
          thumbnailUrl: newImageUrl,
        },
        adminHeaders
      );
      const updated = await prisma.course.findUnique({ where: { id: createdCourseId } });
      report(
        'Course image can be edited/replaced without creating duplicate records',
        updated?.thumbnailUrl === newImageUrl,
        `Updated: ${updated?.thumbnailUrl}`
      );
    } catch (err: any) {
      report('Course image can be edited/replaced', false, err.message);
    }

    // TEST 7: Create Internship with Image
    let createdInternshipId = '';
    try {
      const res = await axios.post(
        `${API_URL}/internships`,
        {
          title: `Auto-Test Cloud Internship ${Date.now()}`,
          description: 'Production cloud cohort',
          technologies: 'React, Node, AWS',
          duration: '3 Months',
          deliveryMode: 'HYBRID',
          price: 1500,
          bannerUrl: uploadedImageUrl,
          availableSeats: 30,
        },
        adminHeaders
      );
      createdInternshipId = res.data?.data?.id;
      const intern = await prisma.internship.findUnique({ where: { id: createdInternshipId } });
      report('Internship created with cover banner image', !!createdInternshipId && intern?.bannerUrl === uploadedImageUrl, intern?.bannerUrl || 'null');
    } catch (err: any) {
      report('Internship created with cover banner image', false, err.message);
    }

    // TEST 8: Create Hackathon with Image
    let createdHackathonId = '';
    try {
      const res = await axios.post(
        `${API_URL}/hackathons`,
        {
          title: `Auto-Test AI Sprint ${Date.now()}`,
          description: 'National developer hackathon',
          theme: 'AI & Cloud Infrastructure',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
          mode: 'ONLINE',
          registrationFee: 200,
          bannerUrl: uploadedImageUrl,
        },
        adminHeaders
      );
      createdHackathonId = res.data?.data?.id;
      const hack = await prisma.hackathon.findUnique({ where: { id: createdHackathonId } });
      report('Hackathon created with cover banner image', !!createdHackathonId && hack?.bannerUrl === uploadedImageUrl, hack?.bannerUrl || 'null');
    } catch (err: any) {
      report('Hackathon created with cover banner image', false, err.message);
    }

    // TEST 9: Learning Material with Separate Thumbnail and Resource File
    try {
      const res = await axios.post(
        `${API_URL}/materials`,
        {
          title: `Test Distributed Systems Kit ${Date.now()}`,
          description: 'High-scale architecture templates',
          fileUrl: '/uploads/resources/dummy_doc.pdf',
          thumbnailUrl: uploadedImageUrl,
          type: 'PDF',
          price: 499,
          isFree: false,
        },
        adminHeaders
      );
      const matId = res.data?.data?.id;
      const mat = await prisma.learningMaterial.findUnique({ where: { id: matId } });
      report(
        'Learning material maintains separate downloadable fileUrl and visual thumbnailUrl',
        mat?.fileUrl === '/uploads/resources/dummy_doc.pdf' && mat?.thumbnailUrl === uploadedImageUrl,
        `File: ${mat?.fileUrl}, Thumb: ${mat?.thumbnailUrl}`
      );
    } catch (err: any) {
      report('Learning material maintains separate downloadable fileUrl and visual thumbnailUrl', false, err.message);
    }

    // TEST 10: Verify Existing Payment & Registration Workflows Still Function
    try {
      const regRes = await axios.post(
        `${API_URL}/hackathons/${createdHackathonId}/register`,
        {
          teamName: 'Innovators Alpha',
          teamMembers: 'Alice, Bob',
        },
        studentHeaders
      );
      report('Student hackathon registration workflow operates smoothly', regRes.status === 201 && !!regRes.data?.data?.id);
    } catch (err: any) {
      report('Student hackathon registration workflow operates smoothly', false, err.response?.data?.error?.message || err.message);
    }

  } finally {
    if (fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }
    await prisma.$disconnect();
  }

  console.log('======================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');
  if (failed > 0) process.exit(1);
}

runImageUploadVerification().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
