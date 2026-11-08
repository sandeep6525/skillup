import React, { useState, useEffect, useRef } from 'react';

export interface TextTypeProps {
  text: string[];
  typingSpeed?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  deleteMode?: 'backspace' | 'clear';
  typeEffect?: 'none' | 'natural';
  mistakes?: number;
  cursorStyle?: 'underscore' | 'bar' | 'block' | 'character';
  cursorGlide?: boolean;
  showCursor?: boolean;
  cursorColor?: string;
  prefixColor?: string;
  cursorBlinkDuration?: number;
  cursorCharacter?: string;
  prefix?: string;
  className?: string;
  activeClassName?: (index: number) => string;
}

export const TextType: React.FC<TextTypeProps> = ({
  text = [],
  typingSpeed = 75,
  pauseDuration = 1500,
  deletingSpeed = 50,
  deleteMode = 'backspace',
  cursorStyle = 'underscore',
  cursorGlide = true,
  showCursor = true,
  cursorColor = 'currentColor',
  cursorBlinkDuration = 0.5,
  cursorCharacter = '_',
  prefix = '',
  className = '',
  activeClassName,
}) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const sentences = text.length > 0 ? text : [''];

  useEffect(() => {
    let timeout: any;

    const currentSentence = sentences[currentSentenceIndex % sentences.length];

    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (!isDeleting) {
      if (displayText.length < currentSentence.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentSentence.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        setIsPaused(true);
      }
    } else {
      if (deleteMode === 'clear' || displayText.length === 0) {
        setIsDeleting(false);
        setCurrentSentenceIndex((prev) => (prev + 1) % sentences.length);
        setDisplayText('');
      } else {
        timeout = setTimeout(() => {
          setDisplayText(currentSentence.slice(0, displayText.length - 1));
          if (displayText.length - 1 === 0) {
            setIsDeleting(false);
            setCurrentSentenceIndex((prev) => (prev + 1) % sentences.length);
          }
        }, deletingSpeed);
      }
    }

    return () => clearTimeout(timeout);
  }, [
    displayText,
    isDeleting,
    isPaused,
    currentSentenceIndex,
    sentences,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    deleteMode,
  ]);

  const activeIndex = currentSentenceIndex % sentences.length;
  const sentenceColorClass = activeClassName ? activeClassName(activeIndex) : '';

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      {prefix && <span style={{ color: cursorColor }}>{prefix}</span>}
      <span className={sentenceColorClass}>
        {displayText}
      </span>
      {showCursor && (
        <span
          className={`inline-block select-none ml-0.5 ${
            cursorGlide ? 'transition-all duration-75' : ''
          }`}
          style={{
            color: cursorColor,
            animation: `textTypeBlink ${cursorBlinkDuration * 2}s step-start infinite`,
            display: 'inline-block',
          }}
          aria-hidden="true"
        >
          {cursorCharacter || (cursorStyle === 'underscore' ? '_' : '|')}
        </span>
      )}
      <style>{`
        @keyframes textTypeBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
};

export default TextType;
