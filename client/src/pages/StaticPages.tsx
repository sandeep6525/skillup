import React, { useState } from 'react';
import {
  Users,
  Award,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// -------------------------------------------------------------
// 1. ABOUT PAGE
// -------------------------------------------------------------
export const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-semibold text-[#0866E8] bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#D8E7FA]">
          About SkillUp
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#092653] tracking-tight">
          Practical Technical Training for Students & Engineers
        </h1>
        <p className="text-sm sm:text-base text-[#526B91] leading-relaxed">
          SkillUp is a technical learning platform designed to bridge the gap between classroom fundamentals and real software engineering. We offer structured courses, scheduled live classes, practical projects, and mentor feedback.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#D8E7FA] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#0866E8] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#092653]">Structured Curriculum</h3>
          <p className="text-xs text-[#526B91] leading-relaxed">
            Course outlines focused on production patterns, software architecture, modern frameworks, and clean code principles.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#D8E7FA] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#0866E8] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#092653]">Mentor Sessions</h3>
          <p className="text-xs text-[#526B91] leading-relaxed">
            Interactive live classes and doubt clearing sessions led by experienced working software engineers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#D8E7FA] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#0866E8] flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#092653]">Verified Certificates</h3>
          <p className="text-xs text-[#526B91] leading-relaxed">
            Digital course completion certificates that demonstrate your practical project work and assessments.
          </p>
        </div>
      </div>

      {/* College Partnership Callout */}
      <div className="bg-gradient-to-r from-[#092653] to-[#0866E8] rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Programs for Colleges and Universities
          </h2>
          <p className="text-xs sm:text-sm text-blue-100">
            We partner with academic institutions to provide cohort training, workshop series, and practical project guidance for students.
          </p>
        </div>
        <Link
          to="/contact"
          className="px-6 py-3 bg-white text-[#092653] hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors shadow-xs shrink-0"
        >
          Contact Our Team
        </Link>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. BLOG PAGE
// -------------------------------------------------------------
export const BlogPage: React.FC = () => {
  const blogs = [
    {
      id: 1,
      title: 'Building Scalable APIs with Node.js, Express, and Docker',
      category: 'Backend Development',
      date: 'Oct 24, 2026',
      readTime: '6 min read',
      excerpt: 'A practical guide on structuring Express applications with clean controller-service layers and containerized deployments.',
      author: 'Rahul Sharma',
    },
    {
      id: 2,
      title: 'Optimizing SQL Queries and Indexing in MySQL',
      category: 'Databases',
      date: 'Oct 20, 2026',
      readTime: '8 min read',
      excerpt: 'Understanding execution plans, composite indexes, and common query bottlenecks in production database workloads.',
      author: 'Priya Patel',
    },
    {
      id: 3,
      title: 'Preparing for Software Engineering Technical Interviews',
      category: 'Career Guidance',
      date: 'Oct 15, 2026',
      readTime: '5 min read',
      excerpt: 'Key topics to practice, including data structures, system design basics, coding assessments, and portfolio code reviews.',
      author: 'Arjun Mehta',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="space-y-3">
        <span className="text-xs font-semibold text-[#0866E8] bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#D8E7FA]">
          Articles & Tutorials
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092653] tracking-tight">
          Technical Articles and Engineering Guides
        </h1>
        <p className="text-xs sm:text-sm text-[#526B91] max-w-2xl">
          Practical programming guides, architecture notes, and interview preparation tips written by SkillUp instructors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {blogs.map((b) => (
          <article
            key={b.id}
            className="bg-white rounded-2xl border border-[#D8E7FA] overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between p-6 space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-[#0866E8] bg-[#EAF4FF] px-2.5 py-0.5 rounded-full">
                  {b.category}
                </span>
                <span className="text-[#526B91]">{b.readTime}</span>
              </div>
              <h3 className="text-base font-bold text-[#092653] hover:text-[#0866E8] transition-colors leading-snug">
                {b.title}
              </h3>
              <p className="text-xs text-[#526B91] leading-relaxed line-clamp-3">
                {b.excerpt}
              </p>
            </div>

            <div className="pt-4 border-t border-[#EDF2F7] flex justify-between items-center text-xs text-[#526B91]">
              <span>By {b.author}</span>
              <span>{b.date}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. CONTACT PAGE
// -------------------------------------------------------------
export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-semibold text-[#0866E8] bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#D8E7FA]">
          Help & Support
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092653] tracking-tight">
          Contact SkillUp Support
        </h1>
        <p className="text-xs sm:text-sm text-[#526B91]">
          Have questions about course enrollments, college programs, or mentor onboarding? Send us a message and our team will get back to you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Info panel */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-[#D8E7FA] shadow-2xs space-y-6">
          <h3 className="text-base font-bold text-[#092653]">Office & Inquiries</h3>
          <div className="space-y-4 text-xs text-[#526B91]">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#0866E8] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#092653] block">Email Support</span>
                <span>support@skillup.local</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#0866E8] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#092653] block">Phone</span>
                <span>+91 98765 43210</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#0866E8] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#092653] block">Location</span>
                <span>SkillUp Learning Center, Tech Park, India</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EDF2F7] space-y-2">
            <span className="text-xs font-semibold text-[#092653] block">Academic Partnerships</span>
            <p className="text-[11px] text-[#526B91] leading-relaxed">
              For college batch enrollments, institutional training workshops, or campus sessions, contact: <span className="text-[#0866E8] font-medium">colleges@skillup.local</span>
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#D8E7FA] shadow-2xs">
          {submitted ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EAF7F0] text-[#16845B] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#092653]">Message Sent Successfully</h3>
              <p className="text-xs text-[#526B91] max-w-sm mx-auto">
                Thank you for contacting us. A SkillUp coordinator will respond to your email address shortly.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#526B91] font-medium mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 rounded-xl border border-[#D8E7FA] text-[#092653] focus:outline-none focus:border-[#0866E8]"
                  />
                </div>
                <div>
                  <label className="block text-[#526B91] font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 rounded-xl border border-[#D8E7FA] text-[#092653] focus:outline-none focus:border-[#0866E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#526B91] font-medium mb-1">Inquiry Type</label>
                <select className="w-full px-3 py-2 rounded-xl border border-[#D8E7FA] bg-white text-[#092653] focus:outline-none focus:border-[#0866E8]">
                  <option>Course Information & Enrollment</option>
                  <option>College / Institutional Partnership</option>
                  <option>Mentor / Instructor Application</option>
                  <option>General Support</option>
                </select>
              </div>

              <div>
                <label className="block text-[#526B91] font-medium mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we help you?"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8E7FA] text-[#092653] focus:outline-none focus:border-[#0866E8]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#0866E8] hover:bg-[#0755C5] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
