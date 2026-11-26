import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type ProductCategory,
  type SustainabilityPriority,
} from '../shared/types';
import { Button, Dialog } from './ui/primitives';

const REASONS = [
  {
    id: 'make_healthier_sustainable_choices',
    title: 'Everyday sustainable shopping',
    detail: 'Quickly verify EcoScores before buying groceries and home essentials.',
  },
  {
    id: 'check_ingredient_safety',
    title: 'Understand product ingredients',
    detail: 'Decode complex INCI and food additive labels in plain language.',
  },
  {
    id: 'reduce_packaging_waste',
    title: 'Cut down plastic & packaging waste',
    detail: 'Spot refillable, glass, aluminum, and mono-material options.',
  },
  {
    id: 'discover_ethical_brands',
    title: 'Support transparent brands',
    detail: 'Compare brand disclosures and verified third-party certifications.',
  },
];

export function OnboardingFlow() {
  const { showOnboarding, setShowOnboarding, preferences, updatePreferences } = useApp();

  const [step, setStep] = useState(0);
  const [mainReason, setMainReason] = useState(preferences.mainReason);
  const [categories, setCategories] = useState<ProductCategory[]>(
    preferences.preferredCategories.length > 0
      ? preferences.preferredCategories
      : ['food_beverages', 'personal_care']
  );
  const [priorities, setPriorities] = useState<SustainabilityPriority[]>(
    preferences.priorities.length > 0
      ? preferences.priorities
      : ['ingredient_transparency', 'packaging']
  );
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: ProductCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? (prev.length > 1 ? prev.filter((c) => c !== cat) : prev) : [...prev, cat]
    );
  };

  const togglePriority = (pri: SustainabilityPriority) => {
    setPriorities((prev) =>
      prev.includes(pri) ? (prev.length > 1 ? prev.filter((p) => p !== pri) : prev) : [...prev, pri]
    );
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await updatePreferences({ onboardingCompleted: true });
      setShowOnboarding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        mainReason,
        preferredCategories: categories,
        priorities,
        onboardingCompleted: true,
      });
      setShowOnboarding(false);
      toast.success('Preferences saved. Your recommendations are now personalized.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={showOnboarding}
      onOpenChange={(open) => {
        if (!open) handleSkip();
      }}
      title="Welcome to SUvita"
      description="Scan Smart. Live Green. Personalize your sustainability lens in 30 seconds."
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Step Progress Indicator */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx <= step ? 'bg-[#00FFAA]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">
              1. What is your main goal with SUvita?
            </h3>
            <div className="grid gap-2.5">
              {REASONS.map((r) => {
                const selected = mainReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setMainReason(r.id)}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00FFAA]/60 bg-[#00FFAA]/[0.08]'
                        : 'border-white/[0.08] bg-[#161D1A] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{r.title}</div>
                      <div className="mt-0.5 text-xs text-[#A0AAA5]">{r.detail}</div>
                    </div>
                    {selected && <Check className="h-4 w-4 text-[#00FFAA] shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">
              2. Which product categories do you explore most?
            </h3>
            <p className="text-xs text-[#A0AAA5]">
              Select one or more categories to prioritize on your dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00FFAA]/60 bg-[#00FFAA]/[0.08] text-white'
                        : 'border-white/[0.08] bg-[#161D1A] text-[#C2CCC6] hover:border-white/20'
                    }`}
                  >
                    <span>{CATEGORY_LABELS[cat]}</span>
                    {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">
              3. What sustainability factors matter most to you?
            </h3>
            <p className="text-xs text-[#A0AAA5]">
              We use these priorities when ranking greener alternatives for scanned products.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(PRIORITY_LABELS) as SustainabilityPriority[]).map((pri) => {
                const selected = priorities.includes(pri);
                return (
                  <button
                    key={pri}
                    type="button"
                    onClick={() => togglePriority(pri)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00FFAA]/60 bg-[#00FFAA]/[0.08] text-white'
                        : 'border-white/[0.08] bg-[#161D1A] text-[#C2CCC6] hover:border-white/20'
                    }`}
                  >
                    <span>{PRIORITY_LABELS[pri]}</span>
                    {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" size="sm" onClick={handleSkip} disabled={saving}>
            Skip for now
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button type="button" size="sm" onClick={() => setStep((s) => s + 1)}>
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleFinish} disabled={saving}>
                Save Preferences
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
