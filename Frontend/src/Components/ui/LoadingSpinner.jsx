import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable loading spinner component
 * @param {Object} props
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg', 'xl'
 * @param {string} props.message - Optional loading message
 * @param {boolean} props.fullScreen - Whether to display full screen
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({ size = 'md', message = '', fullScreen = false, className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-solid animate-spin`} />
      {message && <p className="mt-3 text-sm text-moringa-muted dark:text-slate-400">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fufu dark:bg-slate-900">
        {spinner}
      </div>
    );
  }

  return spinner;
};

/**
 * Loading overlay for sections
 */
export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="absolute inset-0 bg-white dark:bg-slate-900/80 flex items-center justify-center z-50">
    <LoadingSpinner size="lg" message={message} />
  </div>
);

/**
 * Inline loading indicator
 */
export const InlineLoader = ({ text = 'Loading' }) => (
  <span className="inline-flex items-center gap-2 text-moringa-muted dark:text-slate-400">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span className="text-sm">{text}</span>
  </span>
);

/**
 * Skeleton loader for content placeholders
 */
export const Skeleton = ({ className = '', variant = 'text' }) => {
  const baseClasses = 'animate-pulse bg-hairline dark:bg-slate-700 rounded';

  const variantClasses = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-10 w-10 rounded-full',
    thumbnail: 'h-24 w-24 rounded-lg',
    card: 'h-48 w-full rounded-xl',
    button: 'h-10 w-24 rounded-lg',
  };

  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />;
};

/**
 * Card skeleton for product/order cards
 */
export const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-hairline dark:border-slate-700">
    <Skeleton variant="thumbnail" className="w-full h-32 mb-4" />
    <Skeleton variant="title" className="mb-2" />
    <Skeleton variant="text" className="w-1/2 mb-2" />
    <Skeleton variant="text" className="w-1/4" />
  </div>
);

/**
 * Table row skeleton
 */
export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr className="animate-pulse">
    {[...Array(columns)].map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton variant="text" className="w-3/4" />
      </td>
    ))}
  </tr>
);

export default LoadingSpinner;
