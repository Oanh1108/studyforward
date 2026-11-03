import React, { Fragment } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** 'filter' is the roomy dropdown used for list filters: taller trigger, the chosen item shown as a tinted row. */
  variant?: 'default' | 'filter';
}

export function Select({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = 'Chọn một giá trị...',
  ariaLabel,
  variant = 'default',
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const filter = variant === 'filter';

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`relative ${className}`}>
        <Listbox.Button
          aria-label={ariaLabel}
          className={
            filter
              ? `group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 text-left text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand)]/15 data-[open]:border-[var(--brand)] ${
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`
              : `relative w-full cursor-default rounded-lg bg-[var(--bg-card)] py-2 pl-3 pr-10 text-left border border-[var(--border)] shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm min-h-[36px] transition-colors ${
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-300'
                }`
          }
        >
          <span className={`block truncate ${!selectedOption ? 'text-[var(--text-muted)]' : filter ? '' : 'text-[var(--text-primary)] font-medium'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {filter ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--brand)] transition-transform group-data-[open]:rotate-180" aria-hidden="true" />
          ) : (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
            </span>
          )}
        </Listbox.Button>
        <Listbox.Options
          anchor="bottom start"
          className={
            filter
              ? 'z-50 mt-1.5 max-h-72 w-[var(--button-width)] min-w-44 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-md)] focus:outline-none data-[closed]:opacity-0 transition duration-100 ease-in'
              : 'z-50 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-lg bg-[var(--bg-card)] py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm border border-[var(--border)] data-[closed]:opacity-0 transition duration-100 ease-in'
          }
        >
            {options.length === 0 ? (
              <div className="relative cursor-default select-none py-2 px-4 text-[var(--text-muted)] text-sm text-center">
                Không có dữ liệu
              </div>
            ) : filter ? (
              options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={({ active, selected }) =>
                    `flex min-h-10 cursor-pointer select-none items-center rounded-xl px-3 text-sm transition-colors ${
                      selected
                        ? 'bg-[var(--brand-light)] font-bold text-[var(--brand-text)]'
                        : active
                        ? 'bg-[var(--bg-subtle)] font-medium text-[var(--text-primary)]'
                        : 'font-medium text-[var(--text-secondary)]'
                    } ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}`
                  }
                >
                  <span className="block truncate">{option.label}</span>
                </Listbox.Option>
              ))
            ) : (
              options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 min-h-[40px] flex items-center transition-colors ${
                      active ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'text-[var(--text-secondary)]'
                    } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`
                  }
                  value={option.value}
                  disabled={option.disabled}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'font-normal'
                        }`}
                      >
                        {option.label}
                      </span>
                      {selected ? (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? 'text-indigo-700 dark:text-indigo-300' : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))
            )}
          </Listbox.Options>
      </div>
    </Listbox>
  );
}
