import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ProductDTO } from '../../shared/types';
import { Button } from '../ui/primitives';

interface AIComparisonProps {
  products: ProductDTO[];
}

const SUGGESTED_PROMPTS = [
  'Which product should I choose?',
  'Which has better ingredients?',
  'Which has more sustainable packaging?',
  'Why are their scores different?',
  'Is there a better third alternative?',
];

export const AIComparison: React.FC<AIComparisonProps> = ({ products }) => {
  const { setAIContext } = useApp();
  const navigate = useNavigate();

  const openAIWithPrompt = (prompt?: string) => {
    setAIContext({
      product: null,
      comparisonProducts: products,
      initialPrompt: prompt || 'Which product should I choose based on my priorities and these real comparison scores?',
    });
    navigate('/assistant');
  };

  return (
    <section className="rounded-xl border border-[#00FFAA]/25 bg-[#1C2421] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00FFAA]/15 text-[#00FFAA]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Need help deciding? Ask SUvita AI
            </h2>
            <p className="mt-1 text-xs text-[#A0AAA5] leading-relaxed max-w-xl">
              Open SUvita AI with both products and their verified comparison breakdown already loaded as context.
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => openAIWithPrompt()}>
          <Bot className="h-4 w-4" />
          Ask SUvita AI
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => openAIWithPrompt(q)}
            className="rounded-lg border border-white/10 bg-[#161D1A] px-3 py-1.5 text-xs font-medium text-[#C8D3CD] hover:border-[#00FFAA]/45 hover:text-[#00FFAA] transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </section>
  );
};
