// components/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = true 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const Wrapper = fullScreen ? 'div' : 'div';
  const wrapperClasses = fullScreen 
    ? 'flex items-center justify-center min-h-screen bg-gray-50' 
    : 'flex items-center justify-center p-8';

  return (
    <div className={wrapperClasses}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
        {text && <p className="text-gray-600 text-sm">{text}</p>}
      </div>
    </div>
  );
};