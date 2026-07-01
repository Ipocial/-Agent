import type { LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';

interface Props { selected: LLMModel; onChange: (model: LLMModel) => void; }

export default function ModelSelector({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-3.5 h-3.5 text-brand-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
          </svg>
        </div>
        <select
          value={`${selected.provider}:${selected.name}`}
          onChange={(e) => {
            const [provider, name] = e.target.value.split(':');
            const model = AVAILABLE_MODELS.find(m => m.provider === provider && m.name === name);
            if (model) onChange(model);
          }}
          className="appearance-none pl-8 pr-7 py-1.5 bg-brand-50/50 border border-brand-100 rounded-lg text-sm text-stone-700 hover:bg-brand-50 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition-smooth cursor-pointer font-medium"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={`${model.provider}:${model.name}`} value={`${model.provider}:${model.name}`}>{model.label}</option>
          ))}
        </select>
        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
