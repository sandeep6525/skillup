import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CreditCard,
  Ban,
  CheckCircle,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage: React.FC = () => {
  const lastUpdated = 'October 30, 2026';

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0866E8] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#DBEAFE]">
              <FileText className="w-3.5 h-3.5" />
              Terms of Service & Usage Agreement
            </span>
            <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092653] tracking-tight">
            Terms and Conditions
          </h1>

          <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
            Welcome to SkillUp. By registering for an account, purchasing courses or question papers, attending mentor live sessions, or browsing our platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E2E8F0] shadow-sm space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">1. User Accounts & Eligibility</h2>
            </div>
            <p>
              To access courses, study materials, and assessments, you must create a verified account:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>You agree to provide accurate, up-to-date, and complete registration details.</li>
              <li>Each user account is single-seat and personal. Account sharing, credential pooling, or multi-device concurrent broadcasting is strictly prohibited.</li>
              <li>You are solely responsible for maintaining the confidentiality of your login password.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">2. Course Enrollments, Purchases & Access</h2>
            </div>
            <p>
              Upon completing payment verification through our integrated gateway (Razorpay), you are granted a non-transferable, revocable license to access the specific course, webinar, or study materials for the duration designated at checkout.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>All prices are quoted in Indian Rupees (INR) unless explicitly indicated otherwise.</li>
              <li>Coupons and institutional scholarships are valid exclusively for their stipulated terms and cannot be exchanged for cash.</li>
              <li>SkillUp reserves the right to adjust catalog pricing or modify course curricula to reflect ongoing technology advances.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">3. Intellectual Property & Digital Rights Management (DRM)</h2>
            </div>
            <p>
              All video lectures, problem statements, source code samples, handbooks, and <strong>question papers</strong> hosted on SkillUp are the exclusive intellectual property of SkillUp and its partnered instructors.
            </p>
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-900 space-y-2 text-xs sm:text-sm">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Strict Prohibition on Downloading & Redistribution of Protected Papers:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>Protected question papers and exams are rendered exclusively within the secure in-app dialog viewer and cannot be downloaded, printed, or saved locally.</li>
                <li>Any attempt to capture, rip, scrape, photograph with external cameras, or redistribute protected documents via third-party channels (Telegram, WhatsApp, Discord, GitHub, Drive) will result in immediate and permanent account suspension without refund, and potential legal action under applicable copyright laws.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Ban className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">4. Prohibited Student Conduct</h2>
            </div>
            <p>You agree not to engage in any of the following prohibited behaviors:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>Submitting plagiarized solutions or utilizing automated bots to complete internship milestones or assignments.</li>
              <li>Disrupting live classes, harassing mentors, or posting abusive messages in public chat rooms.</li>
              <li>Attempting to bypass access controls, exploit vulnerabilities, or inspect unauthorized server endpoints.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">5. Certificates of Completion</h2>
            </div>
            <p>
              Certificates are awarded upon satisfactory completion of all required course lessons, project milestones, and minimum passing grades on assessments. SkillUp certificates demonstrate completion of practical training and do not guarantee university academic degree credit unless specifically accredited in a stated partnership.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">6. Disclaimers & Limitation of Liability</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Our educational programs provide software engineering instruction. While we provide career mentoring and interview preparation materials, SkillUp makes no absolute guarantee of employment or specific salary placements. In no circumstance shall SkillUp or TRI-CUBE DIGITAL SOLUTIONS be liable for indirect, incidental, or punitive damages arising from the use or inability to use our services.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">7. Inquiries & Governing Jurisdiction</h2>
            </div>
            <p>
              These Terms are governed by and construed under the laws of India. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in Tamil Nadu, India.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-1 text-xs sm:text-sm text-slate-700">
              <p><strong>Platform:</strong> SkillUp (TRI-CUBE DIGITAL SOLUTIONS)</p>
              <p><strong>Legal & Support Desk:</strong> <a href="mailto:support@skillup.com" className="text-blue-600 hover:underline">support@skillup.com</a></p>
            </div>
          </section>

          {/* Quick Nav */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 SkillUp – All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>
              <Link to="/" className="text-slate-600 hover:underline">Return to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TermsOfServicePage;
