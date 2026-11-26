import React from 'react';
import { AlertCircle, CheckCircle2, Scale } from 'lucide-react';
import type { ProductDTO, SmartComparisonSummaryDTO } from '../../shared/types';

interface ComparisonSummaryProps {
  summary: SmartComparisonSummaryDTO;
  products: ProductDTO[];
}

export const ComparisonSummary: React.FC<ComparisonSummaryProps> = ({
  summary,
  products,
}) => {
  const prodA = products[0];
  const prodB = products[1];

  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#1C2421] p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-xs font-medium text-[#00FFAA]">Smart Comparison Summary</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{summary.headline}</h2>
        <p className="mt-1.5 text-sm text-[#DCE5E0] leading-relaxed">
          {summary.higherRatedLabel}
        </p>
      </div>

      {prodA && prodB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="rounded-lg border border-white/[0.07] bg-[#161D1A] p-4">
            <div className="text-xs font-medium text-[#A0AAA5]">
              Main advantage · {prodA.name}
            </div>
            <p className="mt-1.5 text-sm text-white leading-relaxed">
              {summary.advantageA}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-[#161D1A] p-4">
            <div className="text-xs font-medium text-[#A0AAA5]">
              Main advantage · {prodB.name}
            </div>
            <p className="mt-1.5 text-sm text-white leading-relaxed">
              {summary.advantageB}
            </p>
          </div>
        </div>
      )}

      {summary.tradeOffs.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C8D3CD]">
            <Scale className="h-3.5 w-3.5 text-[#00FFAA]" />
            Key Trade-Offs to Consider
          </div>
          <ul className="space-y-1.5">
            {summary.tradeOffs.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-[#A0AAA5]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00FFAA] mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.missingDataNotes.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Missing Information Affecting This Comparison
          </div>
          {summary.missingDataNotes.map((note, idx) => (
            <p key={idx} className="text-xs text-amber-200/90 leading-relaxed">
              {note}
            </p>
          ))}
        </div>
      )}
    </section>
  );
};
