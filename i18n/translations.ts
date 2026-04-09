export const translations = {
  en: {
    // App
    appName: 'KaaM',
    tagline: 'Swipe Karo. KaaM Pao.',

    // Tabs
    findJob: 'Find Job',
    matches: 'Matches',
    postJob: 'Post Job',

    // Swipe screen
    skip: 'Skip',
    apply: 'Apply',
    applied: 'Applied!',
    skipped: 'Skipped!',
    allCaughtUp: 'All caught up!',
    newJobsDaily: 'New jobs added daily',
    fullTime: 'Full Time',
    partTime: 'Part Time',
    remote: 'Remote',
    onsite: 'Onsite',
    salary: 'Salary',

    // Login
    createAccount: 'Create Account',
    welcomeBack: 'Welcome Back',
    email: 'Email',
    password: 'Password',
    register: 'Register',
    login: 'Login',
    noAccount: 'No account? Register',
    haveAccount: 'Already have account? Login',
    selectYourCity: 'Select your city',

    // Matches
    yourMatches: 'Your Matches',
    noMatchesYet: 'No matches yet',
    keepSwiping: 'Keep swiping to find your KaaM!',

    // Profile
    myProfile: 'My Profile',
    fullName: 'Full Name',
    phone: 'Phone',
    location: 'Location',
    skills: 'Skills',
    experience: 'Experience',
    saveProfile: 'Save Profile',
    logout: 'Logout',
    addPhoto: 'Add Photo',

    // Post Job
    postAJob: 'Post a Job',
    jobTitle: 'Job Title',
    jobDescription: 'Job Description',
    jobType: 'Job Type',
    salaryRange: 'Salary Range (₹/month)',
    postJobBtn: 'Post Job',
    jobPosted: 'Your job is now live!',
  },

  hi: {
    // App
    appName: 'काम',
    tagline: 'स्वाइप करो। काम पाओ।',

    // Tabs
    findJob: 'नौकरी खोजें',
    matches: 'मैच',
    postJob: 'नौकरी दें',

    // Swipe screen
    skip: 'छोड़ें',
    apply: 'आवेदन करें',
    applied: 'आवेदन हो गया!',
    skipped: 'छोड़ दिया!',
    allCaughtUp: 'सब देख लिया!',
    newJobsDaily: 'रोज नई नौकरियां आती हैं',
    fullTime: 'पूर्णकालिक',
    partTime: 'अंशकालिक',
    remote: 'घर से काम',
    onsite: 'दफ्तर में',
    salary: 'वेतन',

    // Login
    createAccount: 'खाता बनाएं',
    welcomeBack: 'वापस स्वागत है',
    email: 'ईमेल',
    password: 'पासवर्ड',
    register: 'रजिस्टर करें',
    login: 'लॉगिन करें',
    noAccount: 'खाता नहीं है? रजिस्टर करें',
    haveAccount: 'खाता है? लॉगिन करें',
    selectYourCity: 'अपना शहर चुनें',

    // Matches
    yourMatches: 'आपके मैच',
    noMatchesYet: 'अभी कोई मैच नहीं',
    keepSwiping: 'स्वाइप करते रहें!',

    // Profile
    myProfile: 'मेरी प्रोफाइल',
    fullName: 'पूरा नाम',
    phone: 'फोन',
    location: 'स्थान',
    skills: 'कौशल',
    experience: 'अनुभव',
    saveProfile: 'प्रोफाइल सेव करें',
    logout: 'लॉगआउट',
    addPhoto: 'फोटो जोड़ें',

    // Post Job
    postAJob: 'नौकरी पोस्ट करें',
    jobTitle: 'नौकरी का नाम',
    jobDescription: 'नौकरी का विवरण',
    jobType: 'नौकरी का प्रकार',
    salaryRange: 'वेतन सीमा (₹/माह)',
    postJobBtn: 'नौकरी पोस्ट करें',
    jobPosted: 'आपकी नौकरी लाइव है!',
  },
};

export type Language = 'en' | 'hi';
export type TranslationKey = keyof typeof translations.en;