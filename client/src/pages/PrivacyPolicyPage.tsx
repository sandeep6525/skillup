import React from 'react';
import { Shield, Lock, Eye, FileText, Database, UserCheck, Bell, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = 'October 30, 2026';

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0866E8] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#DBEAFE]">
              <Shield className="w-3.5 h-3.5" />
              Official Legal Document
            </span>
            <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092653] tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
            SkillUp (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), operated under TRI-CUBE DIGITAL SOLUTIONS, is committed to safeguarding your personal data and privacy. This Privacy Policy details how we collect, handle, store, and protect your information when you access our website, applications, courses, question papers, and associated services.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E2E8F0] shadow-sm space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">1. Information We Collect</h2>
            </div>
            <p>We collect essential information to deliver personalized learning services:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>
                <strong className="text-slate-800">Account Credentials:</strong> Full name, verified email address, encrypted password, phone number, and optional college or educational institution.
              </li>
              <li>
                <strong className="text-slate-800">Academic & Activity Records:</strong> Course progress, lesson completion, assignment submissions, quiz evaluations, certificates earned, and live session attendance.
              </li>
              <li>
                <strong className="text-slate-800">Purchases & Transactions:</strong> Order identifiers, purchased courses, unlocked question papers/materials, coupon codes used, and payment status receipts.
              </li>
              <li>
                <strong className="text-slate-800">Technical Diagnostics:</strong> IP address, browser type, device telemetry, access timestamps, and session logs to maintain system security.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">2. Payment Security & Financial Data</h2>
            </div>
            <p>
              Your transaction security is our top priority. We do <strong>not</strong> store or hold your sensitive payment credentials (such as credit card numbers, CVVs, debit card PINs, or UPI netbanking passwords) on our servers.
            </p>
            <p className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs sm:text-sm text-blue-900">
              All transactions are processed through authorized, RBI-compliant payment gateways (including Razorpay). Transactions use 256-bit SSL/TLS end-to-end encryption complying with PCI-DSS standards.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Eye className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">3. DRM & Protected Document Watermarking</h2>
            </div>
            <p>
              To protect valuable intellectual property, including proprietary question papers, code solutions, and handbooks:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>Certain materials are strictly stream-only and cannot be downloaded directly to personal disk drives.</li>
              <li>When viewing in-dialog documents, our reader dynamically applies an encrypted, semi-transparent watermark containing your verified name, user ID, and access timestamp.</li>
              <li>This digital fingerprinting is utilized strictly to trace and curb unauthorized redistribution or commercial resale of proprietary academic content.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">4. How We Use Your Information</h2>
            </div>
            <p>The information gathered is used strictly for legitimate educational purposes, including:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>Enrolling you in batches, delivering video curriculum, and enabling mentor evaluations.</li>
              <li>Issuing digitally verifiable certificates of completion with unique credentials.</li>
              <li>Sending automated order invoices, password resets, and critical schedule notifications.</li>
              <li>Detecting fraudulent activity, duplicate logins, or violations of platform rules.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">5. Zero Data Brokering Policy</h2>
            </div>
            <p>
              We adhere to a strict <strong>no-sale policy</strong>. SkillUp never sells, leases, or trades your personal information, phone number, or academic performance records to third-party telemarketers or advertisers.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">6. Your Rights & Data Retention</h2>
            </div>
            <p>
              You maintain rights over your personal profile data. You may review and update your name, profile photo, and password at any time inside your Account Settings. If you wish to request account closure or data erasure, you may submit a request to our administrative desk.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2.5 text-[#092653]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">7. Contact & Grievance Officer</h2>
            </div>
            <p>
              For privacy-related questions, concerns, or data rights inquiries, please reach out to our team:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-1 text-xs sm:text-sm text-slate-700">
              <p><strong>Entity:</strong> TRI-CUBE DIGITAL SOLUTIONS (SkillUp Platform)</p>
              <p><strong>Email:</strong> <a href="mailto:support@skillup.com" className="text-blue-600 hover:underline">support@skillup.com</a></p>
              <p><strong>Response Time:</strong> We review and resolve privacy requests within 48 business hours.</p>
            </div>
          </section>

          {/* Quick Nav */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 SkillUp – All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-blue-600 hover:underline font-medium">Terms of Service</Link>
              <Link to="/" className="text-slate-600 hover:underline">Return to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PrivacyPolicyPage;
