import React from 'react';

const ComingSoon = ({ title }) => {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">{title}</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400">Coming Soon</p>
      </div>
    </div>
  );
};

export default ComingSoon;
