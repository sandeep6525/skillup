import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { generateLiveKitToken } from '../services/livekitService';
import { config } from '../config';
import { sendEmail, emailTemplates } from '../services/emailService';

/**
 * 1. GET /api/live-classes — List classes scoped to authenticated student enrollments
 */
export const getLiveClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const isPublicQuery = req.query.public === 'true' || !user;

    let whereClause: any = {};

    if (user && !isPublicQuery) {
      if (user.role === 'ADMIN') {
        // Admin sees all classes
        whereClause = {};
      } else if (user.role === 'INSTRUCTOR') {
        // Instructors see classes they teach or for courses/internships they mentor
        const [courseAssignments, mentoredInternships] = await Promise.all([
          prisma.mentorAssignment.findMany({
            where: { mentorId: user.id },
            select: { courseId: true, batchId: true },
          }),
          prisma.internship.findMany({
            where: { mentorId: user.id },
            select: { id: true },
          }),
        ]);
        const assignedCourseIds = courseAssignments.map((a) => a.courseId);
        const assignedInternshipIds = mentoredInternships.map((i) => i.id);

        whereClause = {
          OR: [
            { instructorId: user.id },
            ...(assignedCourseIds.length > 0 ? [{ courseId: { in: assignedCourseIds } }] : []),
            ...(assignedInternshipIds.length > 0 ? [{ internshipId: { in: assignedInternshipIds } }] : []),
          ],
        };
      } else {
        // STUDENT: Retrieve their enrolled/registered classes
        const [courseEnrollments, batchEnrollments, internshipEnrollments, paidRegistrations] = await Promise.all([
          prisma.enrollment.findMany({
            where: { userId: user.id },
            select: { courseId: true },
          }),
          prisma.batchEnrollment.findMany({
            where: { studentId: user.id, isActive: true },
            select: { batchId: true },
          }),
          prisma.internshipApplication.findMany({
            where: { userId: user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } },
            select: { internshipId: true },
          }),
          prisma.liveClassRegistration.findMany({
            where: { studentId: user.id, status: 'PAID' },
            select: { liveClassId: true },
          }),
        ]);

        const enrolledCourseIds = courseEnrollments.map((e) => e.courseId);
        const enrolledBatchIds = batchEnrollments.map((b) => b.batchId);
        const enrolledInternshipIds = internshipEnrollments.map((i) => i.internshipId);
        const registeredLiveClassIds = paidRegistrations.map((r) => r.liveClassId);

        whereClause = {
          OR: [
            // Paid or registered live classes for student
            ...(registeredLiveClassIds.length > 0 ? [{ id: { in: registeredLiveClassIds } }] : []),
            // Classes for student's specific assigned batches
            ...(enrolledBatchIds.length > 0 ? [{ batchId: { in: enrolledBatchIds } }] : []),
            // Course live classes for courses student has purchased/enrolled in (all course classes included)
            ...(enrolledCourseIds.length > 0 ? [{ courseId: { in: enrolledCourseIds } }] : []),
            // Internship live classes for active accepted internships
            ...(enrolledInternshipIds.length > 0 ? [{ internshipId: { in: enrolledInternshipIds } }] : []),
          ],
        };
      }
    } else {
      // Public browse view: display all scheduled or live classes across platform
      whereClause = { status: { in: ['SCHEDULED', 'LIVE', 'COMPLETED'] } };
    }

    const [liveClasses, userRegistrations, studentCourseEnrollments, studentInternshipEnrollments] = await Promise.all([
      prisma.liveClass.findMany({
        where: whereClause,
        include: {
          course: { select: { id: true, title: true, slug: true } },
          batch: { select: { id: true, name: true, code: true } },
          internship: { select: { id: true, title: true, organization: true } },
          instructor: { select: { id: true, name: true, email: true, avatarUrl: true, title: true } },
          _count: { select: { attendees: true, messages: true, registrations: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      user
        ? prisma.liveClassRegistration.findMany({
            where: { studentId: user.id },
            select: { liveClassId: true, status: true, amount: true, registeredAt: true },
          })
        : [],
      user
        ? prisma.enrollment.findMany({
            where: { userId: user.id },
            select: { courseId: true },
          })
        : [],
      user
        ? prisma.internshipApplication.findMany({
            where: { userId: user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } },
            select: { internshipId: true },
          })
        : [],
    ]);

    const registrationMap = new Map<string, any>();
    for (const reg of userRegistrations) {
      registrationMap.set(reg.liveClassId, reg);
    }

    const studentEnrolledCourseSet = new Set(studentCourseEnrollments.map((e) => e.courseId));
    const studentEnrolledInternshipSet = new Set(studentInternshipEnrollments.map((i) => i.internshipId));

    const now = new Date();
    const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes before start

    // Sanitize and mask private meeting URLs for students outside the early join window
    const sanitized = liveClasses.map((cls) => {
      const startTime = new Date(cls.startTime).getTime();
      const endTime = startTime + (cls.duration || 60) * 60 * 1000;
      const currentTime = now.getTime();

      const isStartingSoonOrLive =
        (currentTime >= startTime - EARLY_JOIN_WINDOW_MS && currentTime <= endTime) ||
        cls.status === 'LIVE';

      const userReg = registrationMap.get(cls.id);
      const isPaid = userReg?.status === 'PAID';
      const isCourseEnrolled = cls.courseId ? studentEnrolledCourseSet.has(cls.courseId) : false;
      const isInternshipEnrolled = cls.internshipId ? studentEnrolledInternshipSet.has(cls.internshipId) : false;
      const isFreeClass = Number(cls.price) === 0;

      const isPrivileged = user && (user.role === 'ADMIN' || cls.instructorId === user.id);
      const isEntitledStudent = user && (isPaid || isCourseEnrolled || isInternshipEnrolled || isFreeClass);
      const isEligibleToJoin = (isPrivileged || (isEntitledStudent && isStartingSoonOrLive)) && cls.status !== 'CANCELLED';

      return {
        ...cls,
        price: Number(cls.price),
        registeredCount: cls._count?.registrations ?? 0,
        remainingSeats: cls.maxCapacity ? Math.max(0, cls.maxCapacity - (cls._count?.registrations ?? 0)) : null,
        isRegistered: Boolean(userReg && userReg.status === 'PAID'),
        isCourseEnrolled,
        isInternshipEnrolled,
        registrationStatus: userReg?.status || (isCourseEnrolled || isInternshipEnrolled ? 'ENROLLED' : isFreeClass ? 'FREE' : 'UNREGISTERED'),
        canJoin: isEligibleToJoin,
        isEarlyJoinOpen: isStartingSoonOrLive,
        // Strictly protect meeting URL: only disclosed when eligible to join
        meetingUrl: isEligibleToJoin ? cls.meetingUrl : null,
      };
    });

    res.json({ success: true, data: sanitized });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/live-classes/:id — Get details of a single live class
 */
export const getLiveClassById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const user = req.user;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, slug: true, instructorId: true } },
        batch: { select: { id: true, name: true, code: true } },
        internship: { select: { id: true, title: true, organization: true, mentorId: true } },
        instructor: { select: { id: true, name: true, email: true, avatarUrl: true, title: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { attendees: true, messages: true } },
      },
    });

    if (!liveClass) {
      throw new AppError('Live class session not found', 404);
    }

    // Check authorization and registration for students
    let userRegistration = null;
    let isCourseEnrolled = false;
    if (user && user.role === 'STUDENT') {
      const [courseEnrollment, batchEnrollment, internshipEnrollment, registration] = await Promise.all([
        liveClass.courseId
          ? prisma.enrollment.findUnique({
              where: { userId_courseId: { userId: user.id, courseId: liveClass.courseId } },
            })
          : null,
        liveClass.batchId
          ? prisma.batchEnrollment.findUnique({
              where: { batchId_studentId: { batchId: liveClass.batchId, studentId: user.id } },
            })
          : null,
        liveClass.internshipId
          ? prisma.internshipApplication.findFirst({
              where: {
                userId: user.id,
                internshipId: liveClass.internshipId,
                status: { in: ['ACCEPTED', 'COMPLETED'] },
              },
            })
          : null,
        prisma.liveClassRegistration.findUnique({
          where: { liveClassId_studentId: { liveClassId: liveClass.id, studentId: user.id } },
        }),
      ]);

      userRegistration = registration;
      isCourseEnrolled = Boolean(courseEnrollment);
      const isPaid = registration?.status === 'PAID';
      const isFree = Number(liveClass.price) === 0;

      const isEnrolled = Boolean(
        isPaid ||
        isCourseEnrolled ||
        (isFree && (batchEnrollment?.isActive || internshipEnrollment))
      );
      if (!isEnrolled && Number(liveClass.price) > 0 && !isCourseEnrolled) {
        // Unpaid students can view preview information, but cannot join or get meetingUrl
      }
    }

    const now = new Date().getTime();
    const startTime = new Date(liveClass.startTime).getTime();
    const endTime = startTime + (liveClass.duration || 60) * 60 * 1000;
    const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000;

    const isStartingSoonOrLive =
      (now >= startTime - EARLY_JOIN_WINDOW_MS && now <= endTime) ||
      liveClass.status === 'LIVE';

    const isPaidRegistration = userRegistration?.status === 'PAID';
    const isFreeClass = Number(liveClass.price) === 0;
    const isPrivileged = user && (user.role === 'ADMIN' || liveClass.instructorId === user.id);
    const isEligibleToJoin =
      (isPrivileged || ((isPaidRegistration || isCourseEnrolled || isFreeClass) && isStartingSoonOrLive)) &&
      liveClass.status !== 'CANCELLED';

    res.json({
      success: true,
      data: {
        ...liveClass,
        isCourseEnrolled,
        isRegistered: Boolean(isPaidRegistration),
        canJoin: isEligibleToJoin,
        isEarlyJoinOpen: isStartingSoonOrLive,
        meetingUrl: isEligibleToJoin ? liveClass.meetingUrl : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/live-classes — Create a live class (Instructors / Admins)
 */
export const createLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || (req.user.role !== 'INSTRUCTOR' && req.user.role !== 'ADMIN')) {
      throw new AppError('Only instructors or administrators can schedule live classes', 403);
    }

    const {
      title,
      description,
      startTime,
      duration = 60,
      courseId,
      batchId,
      internshipId,
      meetingUrl,
      meetingProvider,
      isRecorded = false,
    } = req.body;

    if (!title || !startTime) {
      throw new AppError('Class title and scheduled start time are required', 400);
    }

    // Role-based validation if instructor: verify instructor is assigned to course/batch/internship
    if (req.user.role === 'INSTRUCTOR') {
      const [mentorAssignments, instructedCourses, mentoredInternships] = await Promise.all([
        prisma.mentorAssignment.findMany({
          where: { mentorId: req.user.id },
          select: { courseId: true, batchId: true, scope: true },
        }),
        prisma.course.findMany({
          where: { instructorId: req.user.id },
          select: { id: true },
        }),
        prisma.internship.findMany({
          where: { mentorId: req.user.id },
          select: { id: true },
        }),
      ]);

      const allowedCourseIds = new Set([
        ...instructedCourses.map((c) => c.id),
        ...mentorAssignments.map((a) => a.courseId),
      ]);
      const allowedInternshipIds = new Set(mentoredInternships.map((i) => i.id));
      const allowedBatchIds = new Set<string>();

      for (const a of mentorAssignments) {
        if (a.scope === 'SPECIFIC_BATCH' && a.batchId) {
          allowedBatchIds.add(a.batchId);
        } else if (a.scope === 'COURSE_WIDE' || !a.batchId) {
          const batches = await prisma.batch.findMany({ where: { courseId: a.courseId }, select: { id: true } });
          batches.forEach((b) => allowedBatchIds.add(b.id));
        }
      }

      if (courseId && !allowedCourseIds.has(String(courseId))) {
        throw new AppError('You are not authorized to schedule classes for this course', 403);
      }
      if (batchId && !allowedBatchIds.has(String(batchId))) {
        throw new AppError('You are not authorized to schedule classes for this batch', 403);
      }
      if (internshipId && !allowedInternshipIds.has(String(internshipId))) {
        throw new AppError('You are not authorized to schedule classes for this internship', 403);
      }
    }

    // Generate unique unguessable room identifier
    const roomName = `skillup-room-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const liveClass = await prisma.liveClass.create({
      data: {
        roomName,
        title,
        description,
        startTime: new Date(startTime),
        duration: parseInt(String(duration), 10) || 60,
        courseId: courseId ? String(courseId) : null,
        batchId: batchId ? String(batchId) : null,
        internshipId: internshipId ? String(internshipId) : null,
        instructorId: req.user.id,
        isRecorded: Boolean(isRecorded),
        meetingUrl: meetingUrl ? String(meetingUrl).trim() : `/live-classes/${roomName}/room`,
        meetingProvider: meetingProvider ? String(meetingProvider).trim() : 'OTHER',
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        internship: { select: { id: true, title: true } },
      },
    });

    // Asynchronously notify enrolled students via email and in-app notifications
    (async () => {
      try {
        const recipientMap = new Map<string, { id: string; email: string; name: string }>();

        if (liveClass.batchId) {
          const batchEnrollments = await prisma.batchEnrollment.findMany({
            where: { batchId: liveClass.batchId, isActive: true },
            include: { student: { select: { id: true, email: true, name: true } } },
          });
          for (const item of batchEnrollments) {
            if (item.student) recipientMap.set(item.student.id, item.student);
          }
        } else if (liveClass.courseId) {
          const courseEnrollments = await prisma.enrollment.findMany({
            where: { courseId: liveClass.courseId },
            include: { user: { select: { id: true, email: true, name: true } } },
          });
          for (const item of courseEnrollments) {
            if (item.user) recipientMap.set(item.user.id, item.user);
          }
        } else if (liveClass.internshipId) {
          const internshipApps = await prisma.internshipApplication.findMany({
            where: { internshipId: liveClass.internshipId, status: { in: ['ACCEPTED', 'COMPLETED'] } },
            include: { user: { select: { id: true, email: true, name: true } } },
          });
          for (const item of internshipApps) {
            if (item.user) recipientMap.set(item.user.id, item.user);
          }
        }

        const meetingRoomUrl = `${config.clientUrl}/live-classes/${roomName}/room`;
        const programTitle = liveClass.course?.title || liveClass.internship?.title || 'Interactive Session';

        for (const recipient of recipientMap.values()) {
          // In-app notification
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: `New Live Class Scheduled: ${liveClass.title}`,
              message: `A new live session "${liveClass.title}" for "${programTitle}" has been scheduled for ${new Date(liveClass.startTime).toLocaleString()}.`,
              type: 'COURSE',
              link: `/dashboard/live-classes`,
            },
          }).catch(() => {});

          // Email notification
          if (recipient.email) {
            const emailData = emailTemplates.liveClassNotification({
              studentName: recipient.name,
              courseTitle: programTitle,
              classTitle: liveClass.title,
              startTime: new Date(liveClass.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
              durationMins: liveClass.duration,
              mentorName: req.user?.name || 'Assigned Instructor',
              meetingUrl: meetingRoomUrl,
            });
            sendEmail({
              to: recipient.email,
              subject: emailData.subject,
              html: emailData.html,
              templateCode: 'LIVE_CLASS_REMINDER',
              idempotencyKey: `live_class_${liveClass.id}_${recipient.id}`,
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error notifying students of new live class:', err);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Live class created successfully',
      data: liveClass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. POST /api/live-classes/:id/start — Host starts the class
 */
export const startLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || (req.user.role !== 'INSTRUCTOR' && req.user.role !== 'ADMIN')) {
      throw new AppError('Unauthorized', 403);
    }

    const id = String(req.params.id);
    const liveClass = await prisma.liveClass.findUnique({ where: { id } });

    if (!liveClass) throw new AppError('Live class not found', 404);

    if (req.user.role !== 'ADMIN' && liveClass.instructorId && liveClass.instructorId !== req.user.id) {
      throw new AppError('You are not authorized to start this instructor session', 403);
    }

    const updated = await prisma.liveClass.update({
      where: { id },
      data: {
        status: 'LIVE',
        actualStart: liveClass.actualStart || new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Class session is now LIVE',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/live-classes/:id/end — Host ends the class session
 */
export const endLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || (req.user.role !== 'INSTRUCTOR' && req.user.role !== 'ADMIN')) {
      throw new AppError('Unauthorized to end session', 403);
    }

    const id = String(req.params.id);
    const liveClass = await prisma.liveClass.findUnique({ where: { id } });

    if (!liveClass) throw new AppError('Live class not found', 404);

    if (req.user.role !== 'ADMIN' && liveClass.instructorId && liveClass.instructorId !== req.user.id) {
      throw new AppError('Students and non-host instructors cannot end this class', 403);
    }

    const updated = await prisma.liveClass.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualEnd: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Class session has been officially ended',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/live-classes/:id/join — Validate enrollment and issue LiveKit token
 */
export const joinLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required to join live class', 401);

    const id = String(req.params.id);

    // Look up class by ID or by roomName
    const liveClass = await prisma.liveClass.findFirst({
      where: {
        OR: [{ id }, { roomName: id }],
      },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
      },
    });

    if (!liveClass) {
      throw new AppError('Class session not found or invalid room link', 404);
    }

    if (liveClass.status === 'CANCELLED') {
      throw new AppError('This live class session has been cancelled by the instructor', 400);
    }

    const isHost =
      req.user.role === 'ADMIN' ||
      (req.user.role === 'INSTRUCTOR' && (liveClass.instructorId === req.user.id || liveClass.course?.instructorId === req.user.id));

    // Time window enforcement for non-host participants
    const now = Date.now();
    const startTime = new Date(liveClass.startTime).getTime();
    const endTime = startTime + (liveClass.duration || 60) * 60 * 1000;
    const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    if (!isHost) {
      if (now < startTime - EARLY_JOIN_WINDOW_MS) {
        throw new AppError('The session joining window has not opened yet. You can join 5 minutes before scheduled start.', 403);
      }
      if (now > endTime && liveClass.status !== 'LIVE') {
        throw new AppError('This live class session has already ended.', 400);
      }

      // Check payment/enrollment access
      const isPaidClass = Number(liveClass.price) > 0;
      if (isPaidClass) {
        const registration = await prisma.liveClassRegistration.findUnique({
          where: {
            liveClassId_studentId: {
              liveClassId: liveClass.id,
              studentId: req.user.id,
            },
          },
        });
        if (!registration || registration.status !== 'PAID') {
          throw new AppError('Payment required to join this live class. Please complete registration & payment.', 403);
        }
      } else if (liveClass.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: req.user.id,
              courseId: liveClass.courseId,
            },
          },
        });
        if (!enrollment && !liveClass.internshipId) {
          // Allow if registered
          const registration = await prisma.liveClassRegistration.findUnique({
            where: {
              liveClassId_studentId: {
                liveClassId: liveClass.id,
                studentId: req.user.id,
              },
            },
          });
          if (!registration) {
            throw new AppError('Enrollment or registration required to join this session.', 403);
          }
        }
      }
    }

    const roomName = liveClass.roomName || `room-${liveClass.id}`;

    // Generate cryptographically signed short-lived LiveKit token
    const token = await generateLiveKitToken({
      roomName,
      participantIdentity: req.user.id,
      participantName: req.user.name,
      isHost,
    });

    // Record attendance
    await prisma.liveClassAttendee.upsert({
      where: {
        liveClassId_userId: {
          liveClassId: liveClass.id,
          userId: req.user.id,
        },
      },
      create: {
        liveClassId: liveClass.id,
        userId: req.user.id,
        role: isHost ? 'HOST' : req.user.role,
        joinedAt: new Date(),
      },
      update: {
        role: isHost ? 'HOST' : req.user.role,
      },
    });

    res.json({
      success: true,
      message: 'Access granted to live session',
      data: {
        token,
        wsUrl: config.livekit.url,
        roomName,
        isHost,
        classDetails: {
          id: liveClass.id,
          title: liveClass.title,
          description: liveClass.description,
          status: liveClass.status,
          startTime: liveClass.startTime,
          actualStart: liveClass.actualStart,
          actualEnd: liveClass.actualEnd,
          duration: liveClass.duration,
          isRecorded: liveClass.isRecorded,
          course: liveClass.course,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. POST /api/live-classes/:id/leave — Record participant leave timestamp
 */
export const leaveLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.json({ success: true });

    const id = String(req.params.id);

    const attendee = await prisma.liveClassAttendee.findFirst({
      where: {
        userId: req.user.id,
        OR: [{ liveClassId: id }, { liveClass: { roomName: id } }],
      },
    });

    if (attendee) {
      const now = new Date();
      const diffSec = Math.round((now.getTime() - new Date(attendee.joinedAt).getTime()) / 1000);

      await prisma.liveClassAttendee.update({
        where: { id: attendee.id },
        data: {
          leftAt: now,
          durationSec: diffSec > 0 ? diffSec : 0,
        },
      });
    }

    res.json({ success: true, message: 'Session left safely and attendance updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. GET /api/live-classes/:id/messages — Persistent Chat Messages
 */
export const getLiveClassMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const messages = await prisma.liveClassMessage.findMany({
      where: {
        OR: [{ liveClassId: id }, { liveClass: { roomName: id } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. POST /api/live-classes/:id/messages — Send & Store chat message in MySQL
 */
export const sendLiveClassMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const id = String(req.params.id);
    const { text } = req.body;

    if (!text || !text.trim()) {
      throw new AppError('Message cannot be empty', 400);
    }

    const liveClass = await prisma.liveClass.findFirst({
      where: {
        OR: [{ id }, { roomName: id }],
      },
    });

    if (!liveClass) throw new AppError('Live class not found', 404);

    const message = await prisma.liveClassMessage.create({
      data: {
        liveClassId: liveClass.id,
        userId: req.user.id,
        senderName: req.user.name,
        text: text.trim().substring(0, 1000), // bounded length
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. GET /api/live-classes/my/registrations — Get all live class registrations for authenticated student
 */
export const getStudentRegistrations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    // Fetch standalone registrations, course enrollments, batch enrollments, and accepted internship applications
    const [registrations, enrollments, batchEnrollments, internshipApplications] = await Promise.all([
      prisma.liveClassRegistration.findMany({
        where: { studentId: req.user.id },
        include: {
          liveClass: {
            include: {
              course: { select: { id: true, title: true, slug: true } },
              batch: { select: { id: true, name: true, code: true } },
              internship: { select: { id: true, title: true, organization: true } },
              instructor: { select: { id: true, name: true, email: true, avatarUrl: true, title: true } },
            },
          },
          payment: {
            select: { id: true, razorpayOrderId: true, razorpayPaymentId: true, amount: true, status: true },
          },
        },
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.enrollment.findMany({
        where: { userId: req.user.id },
        select: { courseId: true, enrolledAt: true },
      }),
      prisma.batchEnrollment.findMany({
        where: { studentId: req.user.id, isActive: true },
        select: { batchId: true, enrolledAt: true },
      }),
      prisma.internshipApplication.findMany({
        where: { userId: req.user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } },
        select: { internshipId: true, appliedAt: true },
      }),
    ]);

    const enrolledCourseIds = enrollments.map((e) => e.courseId);
    const enrolledBatchIds = batchEnrollments.map((b) => b.batchId);
    const enrolledInternshipIds = internshipApplications.map((a) => a.internshipId);
    const registeredLiveClassIds = new Set(registrations.map((r) => r.liveClassId));

    // Fetch all live classes associated with enrolled courses, batches, or internships not already in standalone registrations
    let programClasses: any[] = [];
    if (enrolledCourseIds.length > 0 || enrolledBatchIds.length > 0 || enrolledInternshipIds.length > 0) {
      programClasses = await prisma.liveClass.findMany({
        where: {
          AND: [
            { id: { notIn: Array.from(registeredLiveClassIds) } },
            {
              OR: [
                // Course-level classes (where batch is null or belongs to the course)
                ...(enrolledCourseIds.length > 0
                  ? [
                      {
                        courseId: { in: enrolledCourseIds },
                        OR: [
                          { batchId: null },
                          ...(enrolledBatchIds.length > 0 ? [{ batchId: { in: enrolledBatchIds } }] : []),
                        ],
                      },
                    ]
                  : []),
                // Specific batch classes directly enrolled
                ...(enrolledBatchIds.length > 0 ? [{ batchId: { in: enrolledBatchIds } }] : []),
                // Accepted internship live classes
                ...(enrolledInternshipIds.length > 0 ? [{ internshipId: { in: enrolledInternshipIds } }] : []),
              ],
            },
          ],
        },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          batch: { select: { id: true, name: true, code: true } },
          internship: { select: { id: true, title: true, organization: true } },
          instructor: { select: { id: true, name: true, email: true, avatarUrl: true, title: true } },
        },
        orderBy: { startTime: 'asc' },
      });
    }

    const now = Date.now();
    const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000;

    const formattedFromRegistrations = registrations.map((reg) => {
      const cls = reg.liveClass;
      const startTime = new Date(cls.startTime).getTime();
      const endTime = startTime + (cls.duration || 60) * 60 * 1000;
      const isWindowOpen = (now >= startTime - EARLY_JOIN_WINDOW_MS && now <= endTime) || cls.status === 'LIVE';
      const isPaid = reg.status === 'PAID';
      const canJoin = isPaid && isWindowOpen && cls.status !== 'CANCELLED';

      return {
        id: reg.id,
        liveClassId: reg.liveClassId,
        status: reg.status,
        amount: Number(reg.amount),
        registeredAt: reg.registeredAt,
        attended: reg.attended,
        isCourseEnrolled: Boolean(cls.courseId && enrolledCourseIds.includes(cls.courseId)),
        isInternshipEnrolled: Boolean(cls.internshipId && enrolledInternshipIds.includes(cls.internshipId)),
        liveClass: {
          ...cls,
          price: Number(cls.price),
          meetingUrl: canJoin ? cls.meetingUrl : null,
          canJoin,
          isEarlyJoinOpen: isWindowOpen,
        },
        payment: reg.payment,
      };
    });

    const formattedFromPrograms = programClasses.map((cls) => {
      const startTime = new Date(cls.startTime).getTime();
      const endTime = startTime + (cls.duration || 60) * 60 * 1000;
      const isWindowOpen = (now >= startTime - EARLY_JOIN_WINDOW_MS && now <= endTime) || cls.status === 'LIVE';
      const canJoin = isWindowOpen && cls.status !== 'CANCELLED';

      const isCourseEnrolled = Boolean(cls.courseId && enrolledCourseIds.includes(cls.courseId));
      const isInternshipEnrolled = Boolean(cls.internshipId && enrolledInternshipIds.includes(cls.internshipId));

      return {
        id: `program-enrolled-${cls.id}`,
        liveClassId: cls.id,
        status: 'PAID',
        amount: 0,
        registeredAt: cls.createdAt,
        attended: false,
        isCourseEnrolled,
        isInternshipEnrolled,
        liveClass: {
          ...cls,
          price: Number(cls.price),
          meetingUrl: canJoin ? cls.meetingUrl : null,
          canJoin,
          isEarlyJoinOpen: isWindowOpen,
        },
        payment: null,
      };
    });

    const allRegistrations = [...formattedFromRegistrations, ...formattedFromPrograms].sort(
      (a, b) => new Date(b.liveClass.startTime).getTime() - new Date(a.liveClass.startTime).getTime()
    );

    res.json({ success: true, data: allRegistrations });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. GET /api/live-classes/:id/meeting-url — Retrieve meeting URL with strict server-side authorization & time check
 */
export const getMeetingUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const liveClass = await prisma.liveClass.findFirst({
      where: { OR: [{ id }, { roomName: id }] },
      include: { instructor: { select: { id: true, name: true } } },
    });

    if (!liveClass) throw new AppError('Live class not found', 404);

    if (liveClass.status === 'CANCELLED') {
      throw new AppError('This live class session has been cancelled. Joining link is deactivated.', 400);
    }

    const isHost =
      req.user.role === 'ADMIN' ||
      (req.user.role === 'INSTRUCTOR' && liveClass.instructorId === req.user.id);

    if (!isHost) {
      const now = Date.now();
      const startTime = new Date(liveClass.startTime).getTime();
      const endTime = startTime + (liveClass.duration || 60) * 60 * 1000;
      const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000;

      if (now < startTime - EARLY_JOIN_WINDOW_MS) {
        throw new AppError('The join window is not yet open. You can join 5 minutes before scheduled start time.', 403);
      }
      if (now > endTime && liveClass.status !== 'LIVE') {
        throw new AppError('This live class session has already ended.', 400);
      }

      // Check enrollment or paid registration for non-host
      let hasAccess = false;

      // 1. Check if user is enrolled in the course associated with this live class
      if (liveClass.courseId) {
        const courseEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: req.user.id,
              courseId: liveClass.courseId,
            },
          },
        });
        if (courseEnrollment) {
          hasAccess = true;
        }
      }

      // 2. Check if user is enrolled in the specific batch
      if (!hasAccess && liveClass.batchId) {
        const batchEnrollment = await prisma.batchEnrollment.findUnique({
          where: {
            batchId_studentId: {
              batchId: liveClass.batchId,
              studentId: req.user.id,
            },
          },
        });
        if (batchEnrollment && batchEnrollment.isActive) {
          hasAccess = true;
        }
      }

      // 3. Check if user is enrolled in internship
      if (!hasAccess && liveClass.internshipId) {
        const internshipApp = await prisma.internshipApplication.findFirst({
          where: {
            userId: req.user.id,
            internshipId: liveClass.internshipId,
            status: { in: ['ACCEPTED', 'COMPLETED'] },
          },
        });
        if (internshipApp) {
          hasAccess = true;
        }
      }

      // 4. Check if student has paid liveClassRegistration or if it is a standalone free class
      if (!hasAccess) {
        if (Number(liveClass.price) > 0) {
          const registration = await prisma.liveClassRegistration.findUnique({
            where: {
              liveClassId_studentId: {
                liveClassId: liveClass.id,
                studentId: req.user.id,
              },
            },
          });
          if (registration && registration.status === 'PAID') {
            hasAccess = true;
          }
        } else if (!liveClass.courseId && !liveClass.batchId && !liveClass.internshipId) {
          // Free open public masterclass
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        throw new AppError('Course enrollment or registration required to access this live class meeting URL.', 403);
      }
    }

    res.json({
      success: true,
      meetingUrl: liveClass.meetingUrl,
      data: {
        meetingUrl: liveClass.meetingUrl,
        meetingProvider: liveClass.meetingProvider,
        roomName: liveClass.roomName,
        title: liveClass.title,
      },
    });
  } catch (error) {
    next(error);
  }
};
