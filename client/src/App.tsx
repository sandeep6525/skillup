import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClassroomPlayerPage } from './pages/ClassroomPlayerPage';
import { MentorsPage } from './pages/MentorsPage';
import { LiveClassesPage } from './pages/LiveClassesPage';
import { LiveClassRoomPage } from './pages/LiveClassRoomPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordRecoveryPages';
import { ActivateMentorPage } from './pages/ActivateMentorPage';
import { AdminHubPage } from './pages/AdminHubPage';
import { AdminCoursePaymentsPage } from './pages/AdminCoursePaymentsPage';
import { AdminCourseAnalyticsPage } from './pages/AdminCourseAnalyticsPage';
import { AdminPartnersPage } from './pages/AdminPartnersPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { OrdersPaymentsPage } from './pages/OrdersPaymentsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { NotificationsSupportPage } from './pages/NotificationsSupportPage';
import { MentorDashboardPage } from './pages/MentorDashboardPage';
import { CourseManagementPage } from './pages/CourseManagementPage';
import { AboutPage, BlogPage, ContactPage } from './pages/StaticPages';
import { InternshipPage } from './pages/InternshipPage';
import { InternshipLearningPage } from './pages/InternshipLearningPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { HackathonsPage } from './pages/HackathonsPage';
import { HackathonDetailPage } from './pages/HackathonDetailPage';
import { InternshipDetailPage } from './pages/InternshipDetailPage';
import { MaterialDetailPage } from './pages/MaterialDetailPage';
import { AllFeedbackPage } from './pages/AllFeedbackPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { AchievementsPage } from './pages/AchievementsPage';
import { AchievementDetailPage } from './pages/AchievementDetailPage';

// Student Portal Layout & Sub-Views
import { StudentPortalLayout } from './components/student/StudentPortalLayout';
import { StudentDashboardOverview } from './components/student/StudentDashboardOverview';
import { StudentMyLearningView } from './components/student/StudentMyLearningView';
import { StudentLiveClassesView } from './components/student/StudentLiveClassesView';
import { StudentAssignmentsView } from './components/student/StudentAssignmentsView';
import { StudentCertificatesView } from './components/student/StudentCertificatesView';
import { StudentCoursesCatalogView } from './components/student/StudentCoursesCatalogView';
import { StudentHackathonsView } from './components/student/StudentHackathonsView';
import { StudentInternshipsView } from './components/student/StudentInternshipsView';
import { StudentMyMaterialsView } from './components/student/StudentMyMaterialsView';
import { StudentOrdersView } from './components/student/StudentOrdersView';
import { StudentProfileView } from './components/student/StudentProfileView';
import { StudentMyFeedbackView } from './components/student/StudentMyFeedbackView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('STUDENT' | 'INSTRUCTOR' | 'ADMIN')[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F6F8FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Authenticating session...</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized users to their appropriate portal
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'INSTRUCTOR') return <Navigate to="/mentor-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isStudentPortalRoute = location.pathname.startsWith('/dashboard');
  const isStaffPortalRoute = ['/mentor-dashboard', '/admin'].some((path) =>
    location.pathname.startsWith(path)
  );

  // Student Portal manages its own persistent header and sidebar (Single-Page Portal LMS)
  if (isStudentPortalRoute) {
    return (
      <div key="portal-layout" className="h-screen w-screen flex flex-col bg-[#F6F8FB] text-slate-800 overflow-hidden">
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  // Mentor & Admin Portals
  if (isStaffPortalRoute) {
    return (
      <div key="staff-layout" className="h-screen flex flex-col bg-[#fafafa] text-slate-800 overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div key="public-layout" className="min-h-screen flex flex-col bg-[#fafafa] text-slate-800">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
};

import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { ScrollToTop } from './components/ScrollToTop';
import { SEO } from './components/SEO';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <LanguageProvider>
            <BrowserRouter>
              <SEO />
              <ScrollToTop />
              <AppLayout>
              <Routes>
                {/* Public Discovery */}
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:slug" element={<CourseDetailPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/internship" element={<InternshipPage />} />
                <Route path="/internships" element={<InternshipPage />} />
                <Route path="/internship/:id" element={<InternshipDetailPage />} />
                <Route path="/internships/:id" element={<InternshipDetailPage />} />
                <Route path="/materials/:id" element={<MaterialDetailPage />} />
                <Route path="/hackathons/:id" element={<HackathonDetailPage />} />
                <Route path="/hackathons" element={<HackathonsPage />} />
                <Route path="/feedback" element={<AllFeedbackPage />} />
                <Route path="/materials" element={<MaterialsPage />} />
                <Route path="/metrals" element={<MaterialsPage />} />
                <Route path="/mentors" element={<MentorsPage />} />
                <Route path="/live-classes" element={<LiveClassesPage />} />
                <Route path="/live-classes/:id/room" element={<LiveClassRoomPage />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/activate-mentor" element={<ActivateMentorPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/achievements/:id" element={<AchievementDetailPage />} />

                {/* Student Single-Page Portal System */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <StudentPortalLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<StudentDashboardOverview />} />
                  <Route path="learning" element={<StudentMyLearningView />} />
                  <Route path="live-classes" element={<StudentLiveClassesView />} />
                  <Route path="assignments" element={<StudentAssignmentsView />} />
                  <Route path="certificates" element={<StudentCertificatesView />} />
                  <Route path="courses" element={<StudentCoursesCatalogView />} />
                  <Route path="hackathons" element={<StudentHackathonsView />} />
                  <Route path="internships" element={<StudentInternshipsView />} />
                  <Route path="materials" element={<StudentMyMaterialsView />} />
                  <Route path="feedback" element={<StudentMyFeedbackView />} />
                  <Route path="orders" element={<StudentOrdersView />} />
                  <Route path="profile" element={<StudentProfileView />} />
                </Route>

                {/* Legacy/Direct route redirects to unified portal for authenticated students */}
                <Route
                  path="/my-learning"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <Navigate to="/dashboard/learning" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <Navigate to="/dashboard/orders" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assignments"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <Navigate to="/dashboard/assignments" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/certificates"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <Navigate to="/dashboard/certificates" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <Navigate to="/dashboard/profile" replace />
                    </ProtectedRoute>
                  }
                />

                {/* Classroom Player (Immersive Fullscreen Lesson Player) */}
                <Route
                  path="/classroom/:slug"
                  element={
                    <ProtectedRoute>
                      <ClassroomPlayerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/internship/:id/learning"
                  element={
                    <ProtectedRoute>
                      <InternshipLearningPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsSupportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute>
                      <NotificationsSupportPage />
                    </ProtectedRoute>
                  }
                />

                {/* Mentor & Instructor Modules */}
                <Route
                  path="/mentor-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                      <MentorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/course-management"
                  element={
                    <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                      <CourseManagementPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Control Center */}
                {/* Admin Control Center & Payment Dashboards */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminHubPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/course-analytics"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminCourseAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/course-payments"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminCoursePaymentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/course-payments/:courseId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminCoursePaymentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/partners"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminPartnersPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </AppLayout>
        </BrowserRouter>
        </LanguageProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
