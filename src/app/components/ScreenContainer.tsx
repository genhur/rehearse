import { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
}

export function ScreenContainer({ children, className = '' }: ScreenContainerProps) {
  return (
    <div className={`min-h-screen bg-r-bg text-r-text-primary ${className}`}>
      {children}
    </div>
  );
}
