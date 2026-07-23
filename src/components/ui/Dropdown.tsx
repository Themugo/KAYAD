import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

const sizeStyles = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  size = 'md',
  className = '',
  id,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          if (!option.disabled) {
            onChange?.(option.value);
            setIsOpen(false);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center justify-between gap-2
          ${sizeStyles[size]}
          bg-white
          border border-[var(--border)]
          rounded-lg
          text-left
          transition-colors duration-150
          ${isOpen ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20' : 'hover:border-[var(--border-hover,#C5C6CD)]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {selectedOption?.icon && <span className="mr-2">{selectedOption.icon}</span>}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className={`
            absolute z-[var(--z-dropdown)]
            w-full mt-1 py-1
            bg-white
            border border-[var(--border)]
            rounded-lg
            shadow-lg
            max-h-60 overflow-auto
            animate-in fade-in slide-in-from-top-2 duration-150
          `}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onChange?.(option.value);
                  setIsOpen(false);
                }
              }}
              onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
              className={`
                flex items-center gap-2
                px-4 py-2.5
                cursor-pointer
                transition-colors duration-100
                ${option.danger ? 'text-red-600' : 'text-[var(--text-secondary)]'}
                ${highlightedIndex === index ? 'bg-[var(--surface)]' : ''}
                ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${option.value === value ? 'bg-[var(--brand)]/10 text-[var(--brand)] font-medium' : ''}
              `}
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              {option.label}
              {option.value === value && (
                <svg className="ml-auto w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Menu Dropdown (for actions menu)
export interface MenuDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function MenuDropdown({
  trigger,
  children,
  align = 'right',
  className = '',
}: MenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`
            absolute z-[var(--z-dropdown)]
            ${align === 'right' ? 'right-0' : 'left-0'}
            mt-2 py-1 min-w-[180px]
            bg-white
            border border-[var(--border)]
            rounded-lg shadow-lg
            animate-in fade-in slide-in-from-top-2 duration-150
            ${className}
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Menu Item
export interface MenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function MenuItem({
  children,
  onClick,
  danger = false,
  disabled = false,
  icon,
  className = '',
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5
        text-sm text-left
        transition-colors duration-100
        ${danger ? 'text-red-600 hover:bg-red-50' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}

// Menu Divider
export function MenuDivider() {
  return <div className="my-1 border-t border-[var(--border)]" />;
}

export default Dropdown;
