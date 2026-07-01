import type { LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';

interface Props {
  selected: LLMModel;
  onChange: (model: LLMModel) => void;
}

export default function ModelSelector({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600 whitespace-nowrap">AI模型:</label>
      <select
        value={`${selected.provider}:${selected.name}`}
        onChange={(e) => {
          const [provider, name] = e.target.value.split(':');
          const model = AVAILABLE_MODELS.find(m => m.provider === provider && m.name === name);
          if (model) onChange(model);
        }}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        {AVAILABLE_MODELS.map((model) => (
          <option key={`${model.provider}:${model.name}`} value={`${model.provider}:${model.name}`}>
            {model.label}
          </option>
        ))}
      </select>
    </div>
  );
}
