import React, { useEffect, useState } from 'react';

interface StaggeredTextProps {
  text: string;
  type: 'heading' | 'supporting';
  baseDelayMs: number;
  className?: string;
  as?: 'h1' | 'h2' | 'p' | 'span';
}

export const StaggeredText: React.FC<StaggeredTextProps> = ({
  text,
  type,
  baseDelayMs,
  className = '',
  as: Component = 'span',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger on mount
    const timer = setTimeout(() => {
      setMounted(true);
    }, 20);
    return () => clearTimeout(timer);
  }, []);

  const words = text.split(' ');

  // Heading specs:
  // - Starts at translateY(26px), opacity 0
  // - Duration: 720ms
  // - Stagger: 85ms
  // - Ease: cubic-bezier(0.215, 0.61, 0.355, 1)

  // Supporting specs:
  // - Starts at translateY(14px), opacity 0
  // - Duration: 600ms
  // - Stagger: 22ms
  // - Ease: cubic-bezier(0.215, 0.61, 0.355, 1)

  const isHeading = type === 'heading';
  const startY = isHeading ? '26px' : '14px';
  const durationMs = isHeading ? 720 : 600;
  const staggerMs = isHeading ? 85 : 22;
  const easing = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

  return (
    <Component className={`inline-block flex-wrap ${className}`}>
      {words.map((word, index) => {
        const delay = baseDelayMs + index * staggerMs;
        return (
          <span
            key={index}
            className="inline-block"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0px)' : `translateY(${startY})`,
              transition: `opacity ${durationMs}ms ${easing} ${delay}ms, transform ${durationMs}ms ${easing} ${delay}ms`,
              marginRight: index < words.length - 1 ? '0.28em' : 0,
              willChange: 'opacity, transform',
            }}
          >
            {word}
          </span>
        );
      })}
    </Component>
  );
};
