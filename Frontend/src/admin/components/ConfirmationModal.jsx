import React from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Trash2, X } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'logout', // 'logout' or 'delete'
  title,
  message,
}) => {
  if (!isOpen) return null;

  const isLogout = type === 'logout';
  const Icon = isLogout ? LogOut : Trash2;

  const modalContent = (
    <div className="fixed inset-0 z-99999 flex items-center justify-center">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex flex-col items-center bg-white dark:bg-slate-800 shadow-xl rounded-xl py-6 px-5 md:w-[460px] w-[370px] border border-gray-200 dark:border-slate-700 z-10">
        {/* Icon */}
        <div
          className={`flex items-center justify-center p-4 rounded-full ${
            isLogout ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}
        >
          <Icon
            className={`w-6 h-6 ${
              isLogout ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
            }`}
            strokeWidth={1.8}
          />
        </div>

        {/* Title */}
        <h2 className="text-gray-900 dark:text-white font-semibold mt-4 text-xl">
          {title || (isLogout ? 'Sign Out?' : 'Are you sure?')}
        </h2>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
          {message ||
            (isLogout
              ? 'Do you really want to sign out from your account?'
              : 'Do you really want to continue? This action cannot be undone.')}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4 mt-5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full md:w-36 h-10 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-slate-600 active:scale-95 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full md:w-36 h-10 rounded-md text-white font-medium text-sm active:scale-95 transition cursor-pointer ${
              isLogout
                ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'
                : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;
