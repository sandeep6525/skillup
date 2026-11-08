import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as mentorCtrl from '../controllers/mentorController';

const router = Router();

// Enforce Mentor / Instructor or Admin authorization
router.use(authenticate);
router.use(authorize('INSTRUCTOR', 'ADMIN'));

// Dashboard Overview Metrics & Feed
router.get('/dashboard', mentorCtrl.getDashboardStats);

// Courses & Syllabi
router.get('/courses', mentorCtrl.getMyCourses);
router.get('/courses/:id', mentorCtrl.getCourseDetail);
router.get('/internships', mentorCtrl.getMyInternships);

// Batches / Cohorts
router.get('/batches', mentorCtrl.getMyBatches);

// Automatic Student Discovery & Deep Profiles
router.get('/students', mentorCtrl.getAuthorizedStudents);
router.get('/students/:id', mentorCtrl.getStudentProfile);

// Class Scheduling & Sessions
router.get('/classes', mentorCtrl.getMyClasses);
router.post('/classes', mentorCtrl.scheduleClass);
router.patch('/classes/:id', mentorCtrl.updateLiveClass);
router.delete('/classes/:id', mentorCtrl.cancelLiveClass);

// Aliases for /live-classes
router.get('/live-classes', mentorCtrl.getMyClasses);
router.post('/live-classes', mentorCtrl.scheduleClass);
router.patch('/live-classes/:id', mentorCtrl.updateLiveClass);
router.delete('/live-classes/:id', mentorCtrl.cancelLiveClass);

// Attendance Register
router.get('/attendance/:classId', mentorCtrl.getClassAttendance);
router.post('/attendance/:classId', mentorCtrl.markAttendance);

// Learning Materials
router.get('/materials', mentorCtrl.getMaterials);
router.post('/materials', mentorCtrl.createMaterial);

// Assignments & Evaluation
router.get('/assignments', mentorCtrl.getMentorAssignments);
router.post('/assignments', mentorCtrl.createAssignment);
router.patch('/assignments/:id', mentorCtrl.updateAssignment);
router.delete('/assignments/:id', mentorCtrl.deleteAssignment);
router.patch('/submissions/:submissionId/grade', mentorCtrl.gradeSubmission);

// Tests & Assessments
router.get('/assessments', mentorCtrl.getAssessments);
router.post('/assessments', mentorCtrl.createAssessment);

// Communication & Announcements
router.get('/announcements', mentorCtrl.getAnnouncements);
router.post('/announcements', mentorCtrl.createAnnouncement);

export default router;
