import React from 'react';
import { CourseAnalyticsDashboard } from '../components/admin/CourseAnalyticsDashboard';

export const AdminCourseAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F6F8FB] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <CourseAnalyticsDashboard />
      </div>
    </div>
  );
};

