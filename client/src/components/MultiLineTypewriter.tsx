import React, { useState, useEffect } from 'react';

export interface MultiLineTypewriterProps {
  lines: {
    text: string;
    className?: string;
  }[];
  typingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorColor?: string;
  cursorCharacter?: string;
}

export const MultiLineTypewriter: React.FC<MultiLineTypewriterProps> = ({
  lines = [],
  typingSpeed = 50,
  pauseDuration = 2400,
  showCursor = true,
  cursorColor = '#55B957',
  cursorCharacter = '_',
}) => {
  // Track typed characters count across all lines
  // lines = [ { text: "Learn Skills." }, { text: "Build Projects." }, { text: "Launch Your Career." } ]
  const totalLength = lines.reduce((acc, curr) => acc + curr.text.length, 0);

  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let timeout: any;

    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (!isDeleting) {
      if (charIndex < totalLength) {
        timeout = setTimeout(() => {
          setCharIndex((prev) => prev + 1);
        }, typingSpeed);
      } else {
        setIsPaused(true);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setCharIndex((prev) => Math.max(0, prev - 2)); // smoothly delete slightly faster
        }, Math.max(20, Math.floor(typingSpeed * 0.6)));
      } else {
        setIsDeleting(false);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, isPaused, totalLength, typingSpeed, pauseDuration]);

  // Compute how many characters belong to each line
  let runningCount = 0;

  return (
    <div className="flex flex-col space-y-1 sm:space-y-2">
      {lines.map((line, idx) => {
        const lineStart = runningCount;
        const lineEnd = runningCount + line.text.length;
        runningCount = lineEnd;

        // How much of this line is currently typed
        let typedLength = 0;
        if (charIndex >= lineEnd) {
          typedLength = line.text.length;
        } else if (charIndex > lineStart) {
          typedLength = charIndex - lineStart;
        }

        const visibleChars = line.text.slice(0, typedLength);
        const isCurrentActiveLine =
          (charIndex >= lineStart && charIndex <= lineEnd) ||
          (idx === lines.length - 1 && charIndex >= totalLength);

        return (
          <div key={idx} className="block whitespace-nowrap leading-tight">
            <span className={line.className || 'text-white'}>
              {visibleChars}
            </span>
            {showCursor && isCurrentActiveLine && (
              <span
                className="inline-block select-none ml-1 animate-pulse"
                style={{
                  color: cursorColor,
                  fontFamily: 'monospace',
                }}
                aria-hidden="true"
              >
                {cursorCharacter}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};


