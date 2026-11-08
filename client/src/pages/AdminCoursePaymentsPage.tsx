import React from 'react';
import { CoursePaymentsManagement } from '../components/admin/CoursePaymentsManagement';

export const AdminCoursePaymentsPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F6F8FB] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <CoursePaymentsManagement />
      </div>
    </div>
  );
};

export default AdminCoursePaymentsPage;
