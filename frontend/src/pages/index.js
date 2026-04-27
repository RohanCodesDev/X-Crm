'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { Button3D } from '../components/buttons';
import ThemeToggle from '../components/toggle';

const TypingIntro = ({ text, speed = 50 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!isTyping || displayedText.length >= text.length) {
      setIsTyping(false);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, displayedText.length + 1));
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedText, isTyping, text, speed]);

  return (
    <p className="typing-text">
      {displayedText}
      {isTyping && <span className="cursor">|</span>}
    </p>
  );
};

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Google Forms Sync',
    desc: 'Connect any Google Form and auto-import responses into your CRM pipeline instantly.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Lead Management',
    desc: 'Classify, tag, and route every respondent to the right follow-up workflow.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    title: 'Email Campaigns',
    desc: 'Send targeted bulk emails to segmented respondent lists directly from your dashboard.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    title: 'Unified Dashboard',
    desc: 'See all forms, respondents, and campaign stats in a single command center.',
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Head>
        <title>X-CRM — Transform Google Forms Into a Powerful CRM</title>
        <meta name="description" content="Centralize, manage, and automate your customer interactions from Google Forms with professional-grade CRM tools." />
      </Head>

      <main className="landing-container">
        {/* Floating orbs */}
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />

        {/* Navbar */}
        <nav className="landing-nav">
          <div className="landing-nav-logo">
            <img src="/logo.png" alt="X-CRM Logo" style={{ height: '110px', objectFit: 'contain' }} />
          </div>
          <div className="landing-nav-actions">
            <Link href="/login">
              <Button3D id="nav-login-btn">Sign In</Button3D>
            </Link>
            <Link href="/signup">
              <Button3D id="nav-signup-btn">Get Started</Button3D>
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        {/* Hero */}
        <section className={`landing-hero ${mounted ? 'visible' : ''}`}>
          <h1 className="landing-title">
            Turn form responses<br />
            into <span className="landing-title-accent">revenue</span>
          </h1>
          <TypingIntro
            text="Connect Google Forms, classify intent, route leads, and automate follow-ups — all from one workspace."
            speed={30}
          />
          <div className="landing-cta">
            <Link href="/signup">
              <Button3D id="hero-cta-btn">
                Start Free
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Button3D>
            </Link>
            <Link href="/login">
              <Button3D id="hero-signin-btn">Sign In</Button3D>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className={`landing-features ${mounted ? 'visible' : ''}`}>
          <p className="landing-section-label">WHAT YOU GET</p>
          <h2 className="landing-section-title">Everything you need to close the loop</h2>
          <div className="marquee-container">
            <div className="marquee-track">
              {features.map((f, i) => (
                <div key={`card-1-${i}`} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
              {features.map((f, i) => (
                <div key={`card-2-${i}`} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>&copy; {new Date().getFullYear()} X-CRM. Built for teams that ship.</p>
        </footer>
      </main>
    </>
  );
}
