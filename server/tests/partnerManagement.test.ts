import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import path from 'path';
import fs from 'fs';

const app = createApp();

describe('Partner Management & Carousel API Integration Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let adminUser: any;
  let studentUser: any;
  let createdPartnerId: string;

  beforeAll(async () => {
    // 1. Fetch or create an Admin user for testing
    adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: `admin-partner-test-${Date.now()}@skillup.internal`,
          password: 'Password123!',
          name: 'Super Admin',
          role: 'ADMIN',
          isVerified: true,
        },
      });
    }

    adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role, email: adminUser.email },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Fetch or create a Student user for testing RBAC
    studentUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
    });

    if (!studentUser) {
      studentUser = await prisma.user.create({
        data: {
          email: `student-partner-test-${Date.now()}@skillup.internal`,
          password: 'Password123!',
          name: 'Student Test',
          role: 'STUDENT',
          isVerified: true,
        },
      });
    }

    studentToken = jwt.sign(
      { id: studentUser.id, role: studentUser.role, email: studentUser.email },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up created test partners
    if (createdPartnerId) {
      await prisma.partner.deleteMany({
        where: { id: createdPartnerId },
      });
    }
    await prisma.$disconnect();
  });

  describe('Security & RBAC Enforcement', () => {
    it('should reject unauthenticated request to GET /api/admin/partners with 401', async () => {
      const res = await request(app).get('/api/admin/partners');
      expect(res.status).toBe(401);
    });

    it('should reject student request to GET /api/admin/partners with 403', async () => {
      const res = await request(app)
        .get('/api/admin/partners')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject student request to POST /api/admin/partners with 403', async () => {
      const res = await request(app)
        .post('/api/admin/partners')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Hacker Corp', logoUrl: '/uploads/partners/fake.png' });
      expect(res.status).toBe(403);
    });
  });

  describe('Partner CRUD operations', () => {
    it('should allow admin to create a partner with valid data', async () => {
      const res = await request(app)
        .post('/api/admin/partners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Acme Corporation Test',
          logoUrl: '/uploads/partners/test-logo.png',
          websiteUrl: 'https://acme.example.com',
          description: 'Premier enterprise cloud partner',
          displayOrder: 1,
          isActive: true,
          isFeatured: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Corporation Test');
      expect(res.body.data.displayOrder).toBe(1);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.isFeatured).toBe(true);

      createdPartnerId = res.body.data.id;
    });

    it('should reject partner creation if required company name is missing', async () => {
      const res = await request(app)
        .post('/api/admin/partners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          logoUrl: '/uploads/partners/test.png',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject partner creation if invalid website URL is supplied', async () => {
      const res = await request(app)
        .post('/api/admin/partners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid URL Partner',
          logoUrl: '/uploads/partners/test.png',
          websiteUrl: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return active partners on public GET /api/partners', async () => {
      const res = await request(app).get('/api/partners');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((p: any) => p.id === createdPartnerId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Acme Corporation Test');
    });

    it('should allow admin to update partner details and display order', async () => {
      const res = await request(app)
        .patch(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Acme Global Corp Updated',
          displayOrder: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Global Corp Updated');
      expect(res.body.data.displayOrder).toBe(5);
    });

    it('should hide partner from public endpoint when deactivated', async () => {
      // 1. Disable the partner
      const patchRes = await request(app)
        .patch(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.isActive).toBe(false);

      // 2. Query public endpoint
      const publicRes = await request(app).get('/api/partners');
      const found = publicRes.body.data.find((p: any) => p.id === createdPartnerId);
      expect(found).toBeUndefined();

      // 3. Admin still sees it
      const adminRes = await request(app)
        .get('/api/admin/partners')
        .set('Authorization', `Bearer ${adminToken}`);
      const adminFound = adminRes.body.data.find((p: any) => p.id === createdPartnerId);
      expect(adminFound).toBeDefined();
      expect(adminFound.isActive).toBe(false);

      // 4. Re-enable the partner
      await request(app)
        .patch(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });
    });

    it('should allow admin to delete partner', async () => {
      const deleteRes = await request(app)
        .delete(`/api/admin/partners/${createdPartnerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify deletion from db
      const check = await prisma.partner.findUnique({
        where: { id: createdPartnerId },
      });
      expect(check).toBeNull();
      createdPartnerId = '';
    });
  });
});
