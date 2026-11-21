import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'red' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  className = '',
}) => {
  const variantStyles = {
    blue: 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30',
    emerald: 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30',
    amber: 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30',
    red: 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30',
    gray: 'bg-[#2e2e2e] text-[#9ca3af] border border-[#333333]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
