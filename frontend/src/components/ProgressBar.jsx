import React from 'react';

const ProgressBar = ({ percentage = 0, heightClass = 'h-1', colorClass = 'bg-accent', containerClass = 'mt-3' }) => {
  return (
    <div className={`w-full ${heightClass} bg-rule dark:bg-rule-strong rounded-full overflow-hidden ${containerClass}`}>
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
