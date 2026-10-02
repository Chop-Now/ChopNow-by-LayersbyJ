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
      defaultTitle: 'Something went sideways',
      defaultMessage: 'An unexpected error occurred. Please try again.',
      tile: 'bg-peach text-clay',
    },
    network: {
      icon: WifiOff,
      defaultTitle: 'The line went quiet',
      defaultMessage: "We can't reach the kitchen. Check your internet connection and try again.",
      tile: 'bg-yellow text-moringa',
    },
    server: {
      icon: ServerCrash,
      defaultTitle: 'Too many cooks',
      defaultMessage: 'Our server is swamped right now. Give it a minute and try again.',
      tile: 'bg-peach text-clay',
    },
    auth: {
      icon: ShieldAlert,
      defaultTitle: 'Your session went stale',
      defaultMessage: 'It sat out too long. Please log in again to keep going.',
      tile: 'bg-yellow text-moringa',
    },
    notFound: {
      icon: AlertCircle,
      defaultTitle: 'Nothing on this plate',
      defaultMessage: "We looked everywhere, even behind the fridge. It isn't here.",
      tile: 'bg-mint text-moringa',
    },
  };

  const config = errorConfig[type] || errorConfig.generic;
  const Icon = config.icon;

  const content = (
    <div className={`text-center ${className}`}>
      <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center ${config.tile}`}>
        <Icon className="w-8 h-8" aria-hidden="true" />
      </div>
      <h3 className="display text-[32px] text-moringa dark:text-fufu mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-moringa-muted dark:text-fufu/70 mb-5 max-w-md mx-auto">
        {message || config.defaultMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-12 px-5 bg-moringa text-fufu hover:bg-moringa-dark text-sm font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fufu dark:bg-char p-4">
        <div className="bg-white dark:bg-moringa-dark p-8 border border-char/10 dark:border-moringa-2 max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-moringa-dark p-8 border border-char/10 dark:border-moringa-2">
      {content}
    </div>
  );
};

/**
 * Inline error message for forms
 */
export const InlineError = ({ message, className = '' }) => (
  <div className={`flex items-center gap-2 text-clay text-sm font-medium ${className}`}>
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    <span>{message}</span>
  </div>
);

/**
 * Error banner for page-level errors
 */
export const ErrorBanner = ({ message, onDismiss, onRetry }) => (
  <div className="bg-peach text-clay p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-semibold">{message}</p>
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-bold underline underline-offset-4 cursor-pointer"
            >
              Try again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm underline-offset-4 hover:underline cursor-pointer"
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
