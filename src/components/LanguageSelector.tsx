import React from 'react';
import { Sparkles, Code2 } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { id: 'NOT_SURE', name: 'Not sure (Auto-detect language)', badge: 'AI Detect' },
  { id: 'Python', name: 'Python' },
  { id: 'JavaScript', name: 'JavaScript' },
  { id: 'TypeScript', name: 'TypeScript' },
  { id: 'C++', name: 'C++' },
  { id: 'Java', name: 'Java' },
  { id: 'C#', name: 'C#' },
  { id: 'C', name: 'C' },
  { id: 'Go', name: 'Go (Golang)' },
  { id: 'Rust', name: 'Rust' },
  { id: 'PHP', name: 'PHP' },
  { id: 'HTML/CSS', name: 'HTML / CSS' },
  { id: 'SQL', name: 'SQL' },
  { id: 'Ruby', name: 'Ruby' },
  { id: 'Swift', name: 'Swift' },
  { id: 'Kotlin', name: 'Kotlin' },
  { id: 'Shell', name: 'Shell / Bash' },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  label = "Select Programming Language",
  disabled = false
}) => {
  const isNotSure = value === 'NOT_SURE' || !value || value.toLowerCase().includes('not sure');

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-[#555] font-mono flex items-center justify-between">
        <span>{label}</span>
        {isNotSure && (
          <span className="inline-flex items-center space-x-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200 font-semibold">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>AI Auto-Detection Mode</span>
          </span>
        )}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none bg-white border ${
            isNotSure ? 'border-amber-400 ring-2 ring-amber-100' : 'border-[#E5E2D9]'
          } text-[#1A1A1A] font-medium text-sm px-4 py-3 pr-10 shadow-sm focus:outline-none focus:border-[#1A1A1A] transition-all cursor-pointer`}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id} className="py-2 text-[#1A1A1A]">
              {lang.name}
            </option>
          ))}
        </select>
        
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#666]">
          <Code2 className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
