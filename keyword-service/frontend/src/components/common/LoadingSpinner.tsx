import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={clsx(
          'animate-spin rounded-full border-4 border-gray-200 border-t-primary-500',
          sizeClasses[size]
        )}
      />
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
};
