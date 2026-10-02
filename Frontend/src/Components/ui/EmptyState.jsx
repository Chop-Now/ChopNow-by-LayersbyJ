import React from 'react';
import {
  Package,
  ShoppingBag,
  Users,
  Store,
  FileText,
  Search,
  Heart,
  Bell,
  MessageSquare,
  Inbox,
} from 'lucide-react';

/**
 * Reusable empty state component
 * @param {Object} props
 * @param {string} props.title - Empty state title
 * @param {string} props.message - Empty state message
 * @param {string} props.type - Content type: 'products', 'orders', 'users', 'vendors', 'listings', 'search', 'favorites', 'notifications', 'messages', 'generic'
 * @param {React.ReactNode} props.action - Optional action button/component
 * @param {React.ReactNode} props.icon - Custom icon component
 * @param {string} props.className - Additional CSS classes
 */
const EmptyState = ({
  title,
  message,
  type = 'generic',
  action,
  icon: CustomIcon,
  className = '',
}) => {
  const config = {
    products: {
      icon: Package,
      defaultTitle: 'No Products Found',
      defaultMessage: 'There are no products to display at the moment.',
    },
    orders: {
      icon: ShoppingBag,
      defaultTitle: 'No Orders Yet',
      defaultMessage: "You haven't placed any orders yet. Start shopping to see your orders here.",
    },
    users: {
      icon: Users,
      defaultTitle: 'No Users Found',
      defaultMessage: 'There are no users matching your criteria.',
    },
    vendors: {
      icon: Store,
      defaultTitle: 'No Vendors Found',
      defaultMessage: 'There are no vendors to display at the moment.',
    },
    listings: {
      icon: FileText,
      defaultTitle: 'No Listings',
      defaultMessage:
        "You haven't created any listings yet. Add your first product to start selling.",
    },
    search: {
      icon: Search,
      defaultTitle: 'No Results Found',
      defaultMessage: "We couldn't find anything matching your search. Try different keywords.",
    },
    favorites: {
      icon: Heart,
      defaultTitle: 'No Favorites Yet',
      defaultMessage:
        "You haven't added any favorites yet. Browse products and tap the heart to save them.",
    },
    notifications: {
      icon: Bell,
      defaultTitle: 'No Notifications',
      defaultMessage: "You're all caught up! Check back later for updates.",
    },
    messages: {
      icon: MessageSquare,
      defaultTitle: 'No Messages',
      defaultMessage: 'Your inbox is empty. Messages from vendors and support will appear here.',
    },
    disputes: {
      icon: Inbox,
      defaultTitle: 'No Active Issues',
      defaultMessage: 'All disputes have been resolved. Great job!',
    },
    generic: {
      icon: Inbox,
      defaultTitle: 'Nothing Here',
      defaultMessage: "There's nothing to display at the moment.",
    },
  };

  const typeConfig = config[type] || config.generic;
  const Icon = CustomIcon || typeConfig.icon;

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        {title || typeConfig.defaultTitle}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
        {message || typeConfig.defaultMessage}
      </p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

/**
 * Empty state card variant with border
 */
export const EmptyStateCard = (props) => (
  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
    <EmptyState {...props} />
  </div>
);

/**
 * Compact empty state for smaller spaces
 */
export const EmptyStateCompact = ({ message, icon: IconComponent = Inbox }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <IconComponent className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
    <p className="text-sm text-slate-500 dark:text-slate-400">{message || 'Nothing to show'}</p>
  </div>
);

/**
 * Empty state for tables
 */
export const TableEmptyState = ({ message, colSpan = 1 }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12 text-center">
      <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message || 'No data available'}</p>
    </td>
  </tr>
);

export default EmptyState;
