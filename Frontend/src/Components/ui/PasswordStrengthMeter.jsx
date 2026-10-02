/**
 * PasswordStrengthMeter
 * Live client-side feedback for the password rules enforced server-side by
 * Backend/middleware/validation.js validateRegister: min 8 chars, at least
 * one uppercase, one lowercase, and one digit. Purely a UX aid - the
 * server remains the source of truth and still rejects anything that
 * doesn't pass those same checks.
 */
import React from 'react';
import { Check, X } from 'lucide-react';

const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

const LEVELS = [
  { label: 'Weak', color: '#dc2626' },
  { label: 'Fair', color: 'var(--color-solidOne)' },
  { label: 'Good', color: 'var(--color-yellow)' },
  { label: 'Strong', color: 'var(--color-solid)' },
];

const PasswordStrengthMeter = ({ password, className = '' }) => {
  if (!password) return null;

  const results = RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const passedCount = results.filter((r) => r.passed).length;
  const level = LEVELS[Math.max(passedCount - 1, 0)];

  return (
    <div className={`mt-2 ${className}`}>
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {RULES.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                backgroundColor: i < passedCount ? level.color : 'var(--color-fufu-border)',
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium shrink-0" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>

      {/* Rule checklist */}
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {results.map((rule) => (
          <li key={rule.key} className="flex items-center gap-1.5 text-xs">
            {rule.passed ? (
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-solid)' }} />
            ) : (
              <X className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-moringa-muted)' }} />
            )}
            <span
              style={{
                color: rule.passed ? 'var(--color-textColor)' : 'var(--color-moringa-muted)',
              }}
            >
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
