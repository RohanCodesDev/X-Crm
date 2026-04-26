'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function HomePage() {
  return (
    <main className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">X-CRM</h1>
        <TypingIntro 
          text="Transform Google Forms responses into a powerful CRM platform. Centralize, manage, and automate your customer interactions with professional-grade tools."
          speed={35}
        />
        <div className="landing-cta">
          <Link href="/login">
            <button className="cta-button">Get Started</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
