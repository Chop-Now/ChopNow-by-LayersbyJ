import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react';

/**
 * Reusable error display component
 * @param {Object} props
 * @param {string} props.title - Error title
 * @param {string} props.message - Error message
 * @param {Function} props.onRetry - Retry callback function
 * @param {string} props.type - Error type: 'generic', 'network', 'server', 'auth', 'notFound'
 * @param {boolean} props.fullPage - Whether to display as full page
 * @param {string} props.className - Additional CSS classes
 */
const ErrorDisplay = ({
  title,
  message,
  onRetry,
  type = 'generic',
  fullPage = false,
  className = '',
}) => {
  const errorConfig = {
    generic: {
      icon: AlertCircle,
      defaultTitle: 'Something went wrong',
      defaultMessage: 'An unexpected error occurred. Please try again.',
      iconColor: 'text-red-500',
    },
    network: {
      icon: WifiOff,
      defaultTitle: 'Connection Error',
      defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
      iconColor: 'text-orange-500',
    },
    server: {
      icon: ServerCrash,
      defaultTitle: 'Server Error',
      defaultMessage: 'The server is temporarily unavailable. Please try again later.',
      iconColor: 'text-red-500',
    },
    auth: {
      icon: ShieldAlert,
      defaultTitle: 'Authentication Error',
      defaultMessage: 'Your session has expired. Please log in again.',
      iconColor: 'text-yellow-500',
    },
    notFound: {
      icon: AlertCircle,
      defaultTitle: 'Not Found',
      defaultMessage: 'The requested resource could not be found.',
      iconColor: 'text-slate-500',
    },
  };

  const config = errorConfig[type] || errorConfig.generic;
  const Icon = config.icon;

  const content = (
    <div className={`text-center ${className}`}>
      <div
        className={`w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}
      >
        <Icon className={`w-8 h-8 ${config.iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
        {message || config.defaultMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-solid hover:bg-tertiary text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50">
      {content}
    </div>
  );
};

/**
 * Inline error message for forms
 */
export const InlineError = ({ message, className = '' }) => (
  <div className={`flex items-center gap-2 text-red-500 text-sm ${className}`}>
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    <span>{message}</span>
  </div>
);

/**
 * Error banner for page-level errors
 */
export const ErrorBanner = ({ message, onDismiss, onRetry }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              Try again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default ErrorDisplay;
