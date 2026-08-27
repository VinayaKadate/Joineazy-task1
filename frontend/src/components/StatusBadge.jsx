import React from 'react';

const StatusBadge = ({ status, showCheckmark = false }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'accepted': return { label: 'Accepted', color: 'text-accent bg-accent/10' };
      case 'rejected': return { label: 'Rejected', color: 'text-accent-warn bg-accent-warn/10' };
      case 'confirmed': return { label: 'Confirmed', color: 'text-accent bg-accent/10' };
      case 'step1_confirmed': return { label: 'Step 1 Done', color: 'text-ink-muted bg-ink-muted/10' };
      default: return { label: 'Pending', color: 'text-ink-faint bg-ink-faint/10' };
    }
  };

  const info = getStatusInfo(status);

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-mono font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${info.color}`}>
        {info.label}
      </span>
      {showCheckmark && (status === 'confirmed' || status === 'accepted') && (
        <span className="w-4 h-4 rounded-full bg-accent text-paper flex items-center justify-center animate-pulse-ring">
          <svg
            className="w-2.5 h-2.5 animate-draw-check"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
