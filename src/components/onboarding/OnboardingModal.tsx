import React, { useState } from 'react';
import { ArrowRight, Check, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type ProductCategory,
  type SustainabilityPriority,
} from '../../shared/types';
import { Button } from '../ui/primitives';

const REASONS = [
  {
    id: 'make_healthier_sustainable_choices',
    label: 'Make healthier & greener daily swaps',
    desc: 'Discover transparent food, personal care, and home alternatives across India.',
  },
  {
    id: 'check_ingredients_safety',
    label: 'Understand product ingredients clearly',
    desc: 'Decode FSSAI & INCI labels without confusing chemical jargon.',
  },
  {
    id: 'reduce_plastic_waste',
    label: 'Cut down single-use plastic & MLP waste',
    desc: 'Prioritize refillable glass, aluminum, and compostable packaging.',
  },
  {
    id: 'support_ethical_brands',
    label: 'Support transparent & ethical brands',
    desc: 'Highlight verified certifications and honest sourcing disclosures.',
  },
];

const ALL_CATEGORIES: ProductCategory[] = [
  'food_beverages',
  'beauty_cosmetics',
  'personal_care',
  'household',
];

const ALL_PRIORITIES: SustainabilityPriority[] = [
  'ingredient_transparency',
  'environmental_sustainability',
  'packaging',
  'ethical_brands',
];

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, setShowOnboarding, preferences, updatePreferences } = useApp();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState(preferences.mainReason);
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

  if (!showOnboarding) return null;

  const toggleCategory = (cat: ProductCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePriority = (p: SustainabilityPriority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSkip = async () => {
    setShowOnboarding(false);
    await updatePreferences({ onboardingCompleted: true });
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        mainReason: reason,
        preferredCategories: categories.length > 0 ? categories : ['food_beverages'],
        priorities: priorities.length > 0 ? priorities : ['ingredient_transparency'],
        onboardingCompleted: true,
      });
      setShowOnboarding(false);
      toast.success('Preferences saved — SUvita recommendations are now personalized for you.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#1C2421] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FFAA]/15 text-[#00FFAA]">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-white">Welcome to SUvita</span>
            <span className="text-xs text-[#8E9B94] font-mono tabular-nums">
              Step {step} of 3
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-[#A0AAA5] hover:text-white transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[#00FFAA] transition-all duration-200"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="mt-6">
            <h2 id="onboarding-title" className="text-xl font-semibold text-white">
              What brings you to SUvita?
            </h2>
            <p className="mt-1 text-sm text-[#A0AAA5]">
              We tailor product recommendations and SUvita AI explanations around your primary goal.
            </p>
            <div className="mt-5 space-y-2.5">
              {REASONS.map((item) => {
                const selected = reason === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReason(item.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00FFAA]/60 bg-[#00FFAA]/10'
                        : 'border-white/8 bg-[#202923] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{item.label}</span>
                      {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                    </div>
                    <p className="mt-1 text-xs text-[#A0AAA5]">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <h2 id="onboarding-title" className="text-xl font-semibold text-white">
              Which product categories do you explore most?
            </h2>
            <p className="mt-1 text-sm text-[#A0AAA5]">
              Select all categories you shop for regularly.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00FFAA]/60 bg-[#00FFAA]/10 text-white'
                        : 'border-white/8 bg-[#202923] text-[#C8D3CD] hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
                    {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6">
            <h2 id="onboarding-title" className="text-xl font-semibold text-white">
              What matters most in a sustainability score?
            </h2>
            <p className="mt-1 text-sm text-[#A0AAA5]">
              Choose your top priorities to rank greener alternatives and guide SUvita AI.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_PRIORITIES.map((p) => {
                const selected = priorities.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePriority(p)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00FFAA]/60 bg-[#00FFAA]/10 text-white'
                        : 'border-white/8 bg-[#202923] text-[#C8D3CD] hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-medium">{PRIORITY_LABELS[p]}</span>
                    {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving}>
              {saving ? 'Saving...' : 'Start Exploring SUvita'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
