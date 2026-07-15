// components/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const wrapperClasses = fullScreen 
    ? `flex items-center justify-center min-h-screen bg-gray-50 ${className}` 
    : `flex items-center justify-center p-8 ${className}`;

  return (
    <div className={wrapperClasses}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
        {text && <p className="text-gray-600 text-sm">{text}</p>}
      </div>
    </div>
  );
};