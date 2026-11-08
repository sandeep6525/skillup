import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    home: 'Home',
    about: 'About',
    courses: 'Courses',
    blog: 'Blog',
    contact: 'Contact',
    internship: 'Internship',
    hackathons: 'Hackathons',
    materials: 'Materials',
    myLearning: 'My Learning',
    dashboard: 'Dashboard',
    adminDashboard: 'Admin Dashboard',
    mentorDashboard: 'Mentor Dashboard',
    profile: 'Profile',
    signIn: 'Sign In',
    register: 'Register',
    logout: 'Logout',
    
    // Actions & Common
    enrollNow: 'Enroll Now',
    previewVideo: 'Free Preview',
    startLearning: 'Start Learning',
    curriculum: 'Curriculum',
    overview: 'Overview',
    studyMaterials: 'Study Materials',
    fullPayment: 'Full Payment',
    partialPayment: 'Custom / Partial Payment',
    payNow: 'Pay Now',
    minimumPayment: 'Minimum Payment',
    remainingBalance: 'Remaining Balance',
    viewDetails: 'View Details',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    upload: 'Upload',
    filter: 'Filter',
    search: 'Search',
    allCourses: 'All Courses',
    
    // Status
    completed: 'Completed',
    inProgress: 'In Progress',
    pending: 'Pending',
    verified: 'Verified',
    
    // Tamil toggle banner
    currentLangName: 'English'
  },
  ta: {
    // Navigation
    home: 'முகப்பு',
    about: 'எங்களை பற்றி',
    courses: 'பாடநெறிகள்',
    blog: 'வலைப்பதிவு',
    contact: 'தொடர்புக்கு',
    internship: 'பயிற்சி (Internship)',
    hackathons: 'ஹேக்கத்தான்',
    materials: 'பாடப் பொருட்கள்',
    myLearning: 'என் கற்றல்',
    dashboard: 'டாஷ்போர்டு',
    adminDashboard: 'நிர்வாக டாஷ்போர்டு',
    mentorDashboard: 'ஆசிரியர் டாஷ்போர்டு',
    profile: 'சுயவிவரம்',
    signIn: 'உள்நுழைக',
    register: 'பதிவு செய்க',
    logout: 'வெளியேறு',
    
    // Actions & Common
    enrollNow: 'இப்போதே சேருங்கள்',
    previewVideo: 'இலவச முன்னோட்டம்',
    startLearning: 'கற்க தொடங்குங்கள்',
    curriculum: 'பாடத்திட்டம்',
    overview: 'கண்ணோட்டம்',
    studyMaterials: 'படிப்பு பொருட்கள்',
    fullPayment: 'முழு கட்டணம்',
    partialPayment: 'தவணை / பகுதி கட்டணம்',
    payNow: 'இப்போது செலுத்தவும்',
    minimumPayment: 'குறைந்தபட்ச கட்டணம்',
    remainingBalance: 'மீதமுள்ள தொகை',
    viewDetails: 'விவரங்களை காண்க',
    submit: 'சமர்ப்பிக்கவும்',
    cancel: 'ரத்து செய்',
    save: 'சேமி',
    upload: 'பதிவேற்று',
    filter: 'வடிகட்டு',
    search: 'தேடுக',
    allCourses: 'அனைத்து படிப்புகள்',
    
    // Status
    completed: 'முடிந்தது',
    inProgress: 'நடப்பில் உள்ளது',
    pending: 'நிலுவையில் உள்ளது',
    verified: 'சரிபார்க்கப்பட்டது',
    
    // Tamil toggle banner
    currentLangName: 'தமிழ்'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('skillup_language') as Language;
    return saved === 'ta' || saved === 'en' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('skillup_language', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language] || translations.en;
    if (langDict[key]) return langDict[key];
    if (translations.en[key]) return translations.en[key];
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
