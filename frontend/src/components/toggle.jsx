import React, { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('xcrm-theme');
    if (saved === 'light') {
      setIsLight(true);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const handleToggle = (e) => {
    const next = e.target.checked;
    setIsLight(next);
    document.documentElement.setAttribute('data-theme', next ? 'light' : 'dark');
    localStorage.setItem('xcrm-theme', next ? 'light' : 'dark');
  };

  return (
    <div className="toggle-container">
      <label className="toggle-switch">
        <input 
          className="toggle-checkbox" 
          type="checkbox" 
          checked={isLight}
          onChange={handleToggle}
          aria-label="Toggle theme"
        />
        <div className="toggle-indicator left" />
        <div className="toggle-indicator right" />
        <div className="toggle-button" />
      </label>
    </div>
  );
};

export default ThemeToggle;
