import type { LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';

interface Props { selected: LLMModel; onChange: (model: LLMModel) => void; }

export default function ModelSelector({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-400 hidden sm:inline">模型</span>
      <div className="relative">
        <select
          value={`${selected.provider}:${selected.name}`}
          onChange={(e) => {
            const [provider, name] = e.target.value.split(':');
            const model = AVAILABLE_MODELS.find(m => m.provider === provider && m.name === name);
            if (model) onChange(model);
          }}
          className="appearance-none pl-3 pr-7 py-1.5 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 hover:bg-stone-100 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition-smooth cursor-pointer"
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
