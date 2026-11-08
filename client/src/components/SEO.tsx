import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteSEO {
  title: string;
  description: string;
}

const ROUTE_SEO_MAP: Record<string, RouteSEO> = {
  '/': {
    title: 'SkillUp - Student Skill Development Platform',
    description: 'SkillUp - Next-generation tech skill development platform offering cohort courses, live classes, internships, and capstone projects.',
  },
  '/about': {
    title: 'About Us | SkillUp',
    description: 'About SkillUp - Learn our mission, industry mentor network, hiring partners, and our commitment to practical tech education.',
  },
  '/courses': {
    title: 'Explore Courses | SkillUp',
    description: 'Explore industry-curated courses in Full Stack Web Development, Cloud Computing, AI & Data Science, DevOps, and Cybersecurity.',
  },
  '/internship': {
    title: 'Internship Program | SkillUp',
    description: 'Hands-on virtual internship program with verified industry projects, letter of recommendation, and mentor code reviews.',
  },
  '/internships': {
    title: 'Internship Program | SkillUp',
    description: 'Hands-on virtual internship program with verified industry projects, letter of recommendation, and mentor code reviews.',
  },
  '/hackathons': {
    title: 'Hackathons & Contests | SkillUp',
    description: 'Compete in live coding hackathons, build innovative real-world software, win prizes, and get noticed by tech recruiters.',
  },
  '/materials': {
    title: 'Study Materials & Notes | SkillUp',
    description: 'Download curated cheat-sheets, syllabus notes, code templates, interview question banks, and learning roadmaps.',
  },
  '/metrals': {
    title: 'Study Materials & Notes | SkillUp',
    description: 'Download curated cheat-sheets, syllabus notes, code templates, interview question banks, and learning roadmaps.',
  },
  '/live-classes': {
    title: 'Live Interactive Classes | SkillUp',
    description: 'Attend scheduled live interactive sessions, real-time doubt clearing with industry leads, and hands-on workshops.',
  },
  '/blog': {
    title: 'Tech Blog & Articles | SkillUp',
    description: 'Tech tutorials, career guidance, programming roadmaps, interview preparation tips, and developer insights.',
  },
  '/contact': {
    title: 'Contact Us | SkillUp',
    description: 'Get in touch with SkillUp admissions, technical support, student grievance cell, and corporate partnership teams.',
  },
  '/mentors': {
    title: 'Our Mentors | SkillUp',
    description: 'Learn directly from top industry software engineers, architects, and instructors dedicated to your growth.',
  },
  '/feedback': {
    title: 'Student Reviews & Feedback | SkillUp',
    description: 'Read reviews and verified testimonials from students and learners who transformed their careers with SkillUp.',
  },
  '/privacy': {
    title: 'Privacy Policy | SkillUp',
    description: 'Read the privacy policy of SkillUp outlining how your data and account information are safely handled.',
  },
  '/terms': {
    title: 'Terms of Service | SkillUp',
    description: 'Review the terms of service and conditions for using the SkillUp skill development platform.',
  },
  '/login': {
    title: 'Sign In | SkillUp',
    description: 'Sign in to your SkillUp student or instructor account to access learning tracks, live classes, and certificates.',
  },
  '/register': {
    title: 'Create an Account | SkillUp',
    description: 'Join SkillUp today to learn in-demand tech skills, enroll in cohort courses, and earn verified certifications.',
  },
};

const DEFAULT_SEO: RouteSEO = {
  title: 'SkillUp - Student Skill Development Platform',
  description: 'Next-generation tech skill development platform offering cohort courses, live classes, internships, and capstone projects.',
};

function setOrCreateMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export const SEO: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // 1. Check exact match
    let config = ROUTE_SEO_MAP[location.pathname];

    // 2. Pattern matching for dynamic detail routes
    if (!config) {
      if (location.pathname.startsWith('/courses/')) {
        config = {
          title: 'Course Details | SkillUp',
          description: 'Detailed syllabus, mentor information, live schedule, and prerequisites for this SkillUp course.',
        };
      } else if (location.pathname.startsWith('/internships/')) {
        config = {
          title: 'Internship Details | SkillUp',
          description: 'Explore real-world deliverables, industry mentorship, and certification requirements for this internship.',
        };
      } else if (location.pathname.startsWith('/hackathons/')) {
        config = {
          title: 'Hackathon Details | SkillUp',
          description: 'Problem statements, timeline, submission criteria, and prizes for this coding competition.',
        };
      } else if (location.pathname.startsWith('/materials/')) {
        config = {
          title: 'Study Material | SkillUp',
          description: 'Detailed study resource, downloadable code assets, and reference guides.',
        };
      } else if (location.pathname.startsWith('/dashboard')) {
        config = {
          title: 'Student Dashboard | SkillUp',
          description: 'Track your ongoing courses, enrolled internships, upcoming live sessions, and achievements.',
        };
      } else if (location.pathname.startsWith('/classroom/')) {
        config = {
          title: 'Classroom Player | SkillUp',
          description: 'Watch video modules, follow course timelines, and track lesson progress on SkillUp.',
        };
      } else {
        config = DEFAULT_SEO;
      }
    }

    // Apply document title
    document.title = config.title;

    // Apply meta descriptions
    setOrCreateMeta('description', config.description);
    setOrCreateMeta('og:title', config.title, true);
    setOrCreateMeta('og:description', config.description, true);
    setOrCreateMeta('og:url', window.location.href, true);
    setOrCreateMeta('twitter:title', config.title);
    setOrCreateMeta('twitter:description', config.description);
  }, [location.pathname]);

  return null;
};
