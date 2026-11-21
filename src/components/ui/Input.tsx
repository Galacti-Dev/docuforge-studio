import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-[#9ca3af]">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-[#141414] border border-[#2e2e2e] focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] text-[#f1f1f1] placeholder-[#6b7280] text-sm rounded-xl px-3.5 py-2 transition-all outline-none disabled:opacity-50 ${
          error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#ef4444]">{error}</p>}
    </div>
  );
};
