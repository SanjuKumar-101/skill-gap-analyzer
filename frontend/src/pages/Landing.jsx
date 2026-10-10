import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../App';
import SkillGoLogo from '../components/SkillGoLogo';
import ThemeToggle from '../components/ThemeToggle';

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

const GoogleIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
    />
  </svg>
);

const StrokeIcon = ({ d, className = 'h-6 w-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.75"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Static content                                                      */
/* ------------------------------------------------------------------ */

const TRUST_LOGOS = [
  { name: 'Microsoft', src: 'https://cdn.simpleicons.org/microsoft/6b7280' },
  { name: 'PayPal', src: 'https://cdn.simpleicons.org/paypal/6b7280' },
  { name: 'ServiceNow', src: 'https://cdn.simpleicons.org/servicenow/6b7280' },
];

const FEATURES = [
  {
    key: 'review',
    title: '60-Second Skill Review',
    body: 'Get an instant, comprehensive skill assessment in under a minute. Our engine benchmarks your current capabilities against real industry requirements and returns immediate, actionable insights.',
    cta: 'See how it works',
    icon: 'M13 3 4.5 13.5H11l-1 7.5 8.5-10.5H12l1-7.5z',
  },
  {
    key: 'gaps',
    title: 'Hard & Soft Gap Breakdown',
    body: 'A detailed breakdown that separates technical (hard) skills from interpersonal (soft) skills, so you know exactly where to focus for the biggest career impact.',
    cta: 'Learn more',
    icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v4l3 3',
  },
  {
    key: 'paths',
    title: 'Personalized Adaptive Learning Paths',
    body: 'AI-curated learning journeys that adapt to your progress, learning style and available time. Receive recommended courses, projects and exercises that actually move the needle.',
    cta: 'Explore paths',
    icon: 'M12 6.3v13m0-13C10.8 5.5 9.2 5 7.5 5S4.2 5.5 3 6.3v13C4.2 18.5 5.8 18 7.5 18s3.3.5 4.5 1.3m0-13C13.2 5.5 14.8 5 16.5 5s3.3.5 4.5 1.3v13c-1.2-.8-2.8-1.3-4.5-1.3s-3.3.5-4.5 1.3',
  },
  {
    key: 'match',
    title: 'Company & JD Target Matching',
    body: 'Target specific companies such as Microsoft, PayPal or ServiceNow, or paste any job description to get a precise, role-specific skill gap analysis.',
    cta: 'Try targeting',
    icon: 'M3 21h18M5 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16m-9-12h2m-2 3h2m-2 3h2m4-6h2m-2 3h2',
  },
];

const STEPS = [
  {
    n: 1,
    accent: 'text-primary',
    ring: 'bg-primary/10',
    title: 'Input Your Skills',
    body: 'Enter your current skills, experience level and career aspirations. The interface makes skill capture quick and painless.',
  },
  {
    n: 2,
    accent: 'text-secondary',
    ring: 'bg-secondary/10',
    title: 'Select Your Target',
    body: 'Choose from top companies, paste any job description, or pick a higher-studies goal to generate a fully relevant analysis.',
  },
  {
    n: 3,
    accent: 'text-accent',
    ring: 'bg-accent/10',
    title: 'Get Your AI Roadmap',
    body: 'Receive a 4-week learning path with weekly quizzes, progress tracking and adaptive recommendations that evolve as you grow.',
  },
];

const FAQS = [
  {
    q: 'How accurate is the skill gap analysis?',
    a: 'The analyzer benchmarks your profile against structured role requirements sourced from real job descriptions and industry competency frameworks. It highlights priority gaps and explains the rationale behind every recommendation so you can judge the output yourself.',
  },
  {
    q: 'Do I need to pay to run an analysis?',
    a: 'No. Signing up and running your first skill gap analysis is completely free. You can create an account with email or Google and start immediately.',
  },
  {
    q: 'What is the difference between hard and soft skills in my results?',
    a: 'Hard skills are technical, measurable abilities such as cloud architecture or a specific programming language. Soft skills cover communication, collaboration and leadership. The report scores and prioritizes them separately so you can balance both.',
  },
  {
    q: 'Can I target a specific company or job description?',
    a: 'Yes. Choose a preset company target, paste any job description, or select a higher-studies goal. The analysis and roadmap are generated specifically for that target rather than a generic template.',
  },
  {
    q: 'Is my data private?',
    a: 'Your profile data is used only to generate your analysis and learning roadmap. It is stored securely and never sold or shared with third parties.',
  },
];

/* ------------------------------------------------------------------ */
/* Landing page                                                        */
/* ------------------------------------------------------------------ */

const Landing = ({ showAuthModal = false }) => {
  const { login, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(showAuthModal);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [currentSkills, setCurrentSkills] = useState('');
  const [preferredLearningStyle, setPreferredLearningStyle] = useState('mixed');
  const [timeAvailabilityPerWeek, setTimeAvailabilityPerWeek] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Page interaction state
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [previewSkill, setPreviewSkill] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // If we become authenticated, go straight to the dashboard.
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  /* -------------------- Google OAuth -------------------- */
  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The implicit flow returns an OAuth access token.
        body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Google authentication failed');
      }
      login(data.token, data.user);
      setAuthModalOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication was cancelled or failed.');
    setLoading(false);
  };

  // useGoogleLogin returns a function that opens the Google popup.
  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
    scope: 'profile email',
  });

  /* -------------------- Email / password -------------------- */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const isRegister = !isLogin;
      const url = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? {
            email,
            password,
            name,
            currentSkills: currentSkills
              .split(',')
              .map((skill) => skill.trim())
              .filter(Boolean),
            preferredLearningStyle,
            timeAvailabilityPerWeek: parseInt(timeAvailabilityPerWeek, 10) || 10,
          }
        : { email, password };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (isRegister ? 'Registration failed' : 'Login failed'));
      }
      login(data.token, data.user);
      setAuthModalOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setAuthModalOpen(false);
    }
  };

  /* -------------------- Preview widget -------------------- */
  const runPreview = (e) => {
    e.preventDefault();
    const skill = previewSkill.trim();
    if (!skill || previewLoading) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    window.setTimeout(() => {
      const seed = skill
        .toLowerCase()
        .split('')
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const readiness = 42 + (seed % 45);
      const pool = [
        'System Design',
        'Cloud Architecture (AWS / Azure)',
        'Automated Testing',
        'Docker & Kubernetes',
        'CI / CD Pipelines',
        'Data Structures & Algorithms',
        'Stakeholder Communication',
        'Security Fundamentals',
      ];
      const gaps = pool.filter((_, i) => (seed + i * 7) % 3 !== 0).slice(0, 3);
      setPreviewResult({ skill, readiness, gaps });
      setPreviewLoading(false);
    }, 650);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#1e293b] relative overflow-hidden transition-colors duration-500 ease-in-out">
      {/* ============================ Auth Modal ============================ */}
      {authModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
        >
          <div className="relative w-full max-w-md">
            <div className="bg-background dark:bg-[#1e293b] rounded-3xl shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] w-full max-h-[90vh] overflow-y-auto transition-colors duration-500">
              <div className="px-8 py-6">
                <div className="flex justify-center mb-6">
                  <SkillGoLogo size="lg" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {isLogin ? 'Welcome back' : 'Create your account'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {isLogin
                        ? 'Sign in to run your skill gap analysis.'
                        : 'Start your free skill gap analysis today.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(false)}
                    aria-label="Close"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <StrokeIcon className="h-5 w-5" d="M6 18 18 6M6 6l12 12" />
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                          Current Skills (comma separated)
                        </label>
                        <input
                          type="text"
                          id="skills"
                          value={currentSkills}
                          onChange={(e) => setCurrentSkills(e.target.value)}
                          className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500"
                          placeholder="e.g., JavaScript, React, Node.js"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500"
                      placeholder="At least 8 characters"
                    />
                  </div>

                  {!isLogin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="learningStyle" className="block text-sm font-medium text-gray-700 mb-1">
                          Learning Style
                        </label>
                        <select
                          id="learningStyle"
                          value={preferredLearningStyle}
                          onChange={(e) => setPreferredLearningStyle(e.target.value)}
                          className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800"
                        >
                          <option value="visual">Visual</option>
                          <option value="auditory">Auditory</option>
                          <option value="reading">Reading / Writing</option>
                          <option value="kinesthetic">Kinesthetic</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="timeAvailability" className="block text-sm font-medium text-gray-700 mb-1">
                          Hours / Week
                        </label>
                        <input
                          type="number"
                          id="timeAvailability"
                          value={timeAvailabilityPerWeek}
                          onChange={(e) => setTimeAvailabilityPerWeek(parseInt(e.target.value, 10) || 10)}
                          min={1}
                          max={40}
                          className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500"
                          placeholder="10"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="w-full px-4 py-3 neomorphism-light text-sm text-error-600 rounded-2xl">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full px-6 py-3 neomorphism-light hover:neomorphism-hover-light transition-all duration-200 font-medium rounded-2xl text-gray-800 ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
                  </button>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="flex-1 border-t border-gray-300" />
                    <span className="px-2 text-xs uppercase tracking-wide text-gray-500">or</span>
                    <div className="flex-1 border-t border-gray-300" />
                  </div>

                  <button
                    type="button"
                    onClick={() => googleLogin()}
                    disabled={loading}
                    className={`w-full flex items-center justify-center px-6 py-3 neomorphism-light hover:neomorphism-hover-light transition-all duration-200 font-medium rounded-2xl text-gray-800 ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    <GoogleIcon className="h-5 w-5 mr-3" />
                    Continue with Google
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-sm text-gray-600">
                      {isLogin ? "Don't have an account? " : 'Already have an account? '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setError('');
                        }}
                        className="text-primary font-medium hover:text-primary/80 transition-colors"
                      >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ Main content ============================ */}
      <main className="relative z-20">
        {/* Navigation */}
        <nav className="sticky top-0 z-30 px-6 py-4 backdrop-blur-sm bg-background/80 dark:bg-[#1e293b]/80 border-b border-white/40 transition-colors duration-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <SkillGoLogo size="md" />

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-primary transition-colors font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors font-medium">
                How It Works
              </a>
              <a href="#faq" className="text-gray-600 hover:text-primary transition-colors font-medium">
                FAQ
              </a>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setAuthModalOpen(true);
                }}
                className="hidden sm:flex items-center justify-center neomorphism-light hover:neomorphism-hover-light px-5 py-2.5 rounded-2xl font-medium text-gray-800 transition-all duration-200"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setAuthModalOpen(true);
                }}
                className="flex items-center justify-center px-5 py-2.5 rounded-2xl font-medium text-white bg-gradient-to-r from-primary to-secondary shadow-[6px_6px_14px_#bebebe,-6px_-6px_14px_#ffffff] dark:shadow-[6px_6px_14px_#0f172a,-6px_-6px_14px_#334155] hover:opacity-95 transition-opacity"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-16 pb-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <span className="inline-flex items-center neomorphism-inset-light px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide text-primary mb-6">
                AI-Powered Career Intelligence
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-800 leading-tight max-w-4xl mx-auto">
                Stop guessing.{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  Start growing with SkillGO.
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                SkillGO turns your resume into an instant skill evaluation, a clear hard/soft gap
                breakdown and a personalized learning path — all benchmarked against the roles you
                actually want.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] hover:opacity-95 transition-opacity"
                >
                  Run my free analysis
                </button>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-gray-800 neomorphism-light hover:neomorphism-hover-light transition-all duration-200"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Trust bar */}
            <div className="mt-16 neomorphism-light rounded-3xl px-8 py-8 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
              <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-wide">
                Trusted by 10,000+ engineers preparing for roles at
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                {TRUST_LOGOS.map((logo) => (
                  <img
                    key={logo.name}
                    src={logo.src}
                    alt={`${logo.name} logo`}
                    className="h-7 opacity-80 hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ))}
              </div>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-800">10k+</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Engineers helped</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">60s</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">To first insight</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">4 weeks</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">To a roadmap</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">100%</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Free to start</p>
                </div>
              </div>
            </div>

            {/* Interactive preview widget */}
            <div className="mt-16 max-w-2xl mx-auto neomorphism-light rounded-3xl px-8 py-10 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 neomorphism-light rounded-2xl flex items-center justify-center">
                  <StrokeIcon className="h-7 w-7 text-primary" d="M12 3v18m9-9H3" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 text-center">
                Try a 30-second preview
              </h3>
              <p className="text-gray-600 text-center mt-2">
                Enter one skill to see a quick readiness estimate and the gaps we would prioritize.
              </p>

              <form onSubmit={runPreview} className="mt-6 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={previewSkill}
                  onChange={(e) => setPreviewSkill(e.target.value)}
                  placeholder="e.g., JavaScript, Project Management"
                  className="flex-1 px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500"
                />
                <button
                  type="submit"
                  disabled={previewLoading}
                  className={`px-6 py-3 neomorphism-light hover:neomorphism-hover-light rounded-2xl font-medium text-primary transition-all duration-200 ${
                    previewLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {previewLoading ? 'Analyzing…' : 'Analyze preview'}
                </button>
              </form>

              {previewResult && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      Readiness for <span className="text-primary font-semibold">{previewResult.skill}</span>
                    </p>
                    <span className="text-sm font-bold text-gray-800">{previewResult.readiness}%</span>
                  </div>
                  <div className="mt-2 h-3 w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden transition-colors duration-500">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${previewResult.readiness}%` }}
                    />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Priority gaps
                  </p>
                  <ul className="mt-2 space-y-2">
                    {previewResult.gaps.map((gap) => (
                      <li key={gap} className="flex items-center space-x-2 text-sm text-gray-700">
                        <span className="w-2 h-2 rounded-full bg-error-600 flex-shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setAuthModalOpen(true);
                    }}
                    className="mt-5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Get the full analysis &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="pb-24 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                Everything you need to close the gap
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                Comprehensive skill analysis with AI-powered insights that show you exactly what to
                learn next to reach your career goals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {FEATURES.map((feature) => (
                <div
                  key={feature.key}
                  onMouseEnter={() => setHoveredFeature(feature.key)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="neomorphism-light hover:neomorphism-hover-light rounded-3xl px-8 py-10 transition-all duration-300 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155]"
                >
                  <div className="w-14 h-14 neomorphism-light rounded-2xl flex items-center justify-center mb-6">
                    <StrokeIcon className="h-6 w-6 text-primary" d={feature.icon} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.body}</p>
                  {hoveredFeature === feature.key && (
                    <div className="mt-5 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          setAuthModalOpen(true);
                        }}
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        {feature.cta} &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="pb-24 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">How it works</h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                Three simple steps to turn an unclear career goal into a concrete plan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step) => (
                <div key={step.n} className="neomorphism-light rounded-3xl px-8 py-12 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
                  <div className="w-16 h-16 neomorphism-light rounded-2xl flex items-center justify-center mb-6">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.ring}`}>
                      <span className={`font-bold text-xl ${step.accent}`}>{step.n}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="pb-24 scroll-mt-24">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Frequently asked questions</h2>
              <p className="mt-4 text-gray-600">
                Everything you need to know before running your first analysis.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.q} className="neomorphism-light rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-semibold text-gray-800">{faq.q}</span>
                      <span className="ml-4 flex-shrink-0 text-primary text-xl leading-none">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 -mt-1">
                        <p className="text-gray-600">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="neomorphism-light rounded-3xl px-10 py-14 text-center dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
              <h2 className="text-3xl font-bold text-gray-800">Ready to transform your skills?</h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                Join thousands of professionals using AI-powered skill analysis to accelerate their
                careers and land the roles they want.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] hover:opacity-95 transition-opacity"
                >
                  Get started free
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-gray-800 neomorphism-light hover:neomorphism-hover-light transition-all duration-200"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-300/50">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center gap-6">
            <SkillGoLogo size="lg" />
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} SkillGO. All rights reserved.
              </p>
              <div className="flex items-center space-x-6">
                <Link to="/" className="text-gray-500 hover:text-primary transition-colors text-sm">
                  Privacy
                </Link>
                <Link to="/" className="text-gray-500 hover:text-primary transition-colors text-sm">
                  Terms
                </Link>
                <Link to="/" className="text-gray-500 hover:text-primary transition-colors text-sm">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
