'use client';

import React from 'react';
import styled from 'styled-components';

export const Button3D = ({ children, onClick, type = "button", disabled, className, style, ...props }) => {
  return (
    <StyledWrapper className={className} style={style}>
      <button type={type} className="creative-button" onClick={onClick} disabled={disabled} {...props}>
        <span className="button-content">{children}</span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-flex;
  
  .creative-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #ffffff;
    background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .creative-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transform: skewX(-20deg);
    transition: left 0.7s ease;
  }

  .creative-button:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.18);
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .creative-button:hover:not(:disabled)::before {
    left: 200%;
  }

  .creative-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .creative-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.04);
    box-shadow: none;
  }

  .button-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;
