import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'emerald' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }[size];

  const variantStyles = {
    primary: 'bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white shadow-sm',
    secondary: 'bg-[#262626] hover:bg-[#2e2e2e] active:bg-[#333333] text-[#f1f1f1] border border-[#2e2e2e]',
    emerald: 'bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-white shadow-sm',
    danger: 'bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c] text-white shadow-sm',
    ghost: 'hover:bg-[#262626] text-[#9ca3af] hover:text-[#f1f1f1]',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
