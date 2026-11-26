import React from 'react';
import { Bell, Bot, Globe2, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { Button, SurfaceCard, ToggleSwitch } from '../components/ui/primitives';

export const SettingsPage: React.FC = () => {
  const {
    preferences,
    isAuthenticated,
    profile,
    updatePreferences,
    setAuthModalOpen,
    logout,
  } = useApp();

  const handleToggle = async (
    key: 'emailNotifications' | 'weeklyDigest' | 'alternativeAlerts' | 'saveChatHistory',
    value: boolean,
    label: string
  ) => {
    try {
      await updatePreferences({ [key]: value });
      toast.success(`${label} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Could not update setting');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1.5 text-sm text-[#A0AAA5]">
          Control notifications, SUvita AI conversation privacy, account sync, and review our
          scoring methodology.
        </p>
      </header>

      {/* Notifications */}
      <SurfaceCard className="space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Notifications</h2>
        </div>

        <div className="divide-y divide-white/[0.07]">
          <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0">
            <div>
              <p className="text-sm font-medium text-white">Product Data Alerts</p>
              <p className="text-xs text-[#A0AAA5] mt-0.5">
                Get notified when ingredient or packaging updates change a saved product&apos;s
                EcoScore.
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.emailNotifications}
              onChange={(v) => handleToggle('emailNotifications', v, 'Product data alerts')}
              ariaLabel="Toggle Product Data Alerts"
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-white">Weekly Sustainability Digest</p>
              <p className="text-xs text-[#A0AAA5] mt-0.5">
                A concise weekly summary of your scanned items and average EcoScore progress.
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.weeklyDigest}
              onChange={(v) => handleToggle('weeklyDigest', v, 'Weekly sustainability digest')}
              ariaLabel="Toggle Weekly Sustainability Digest"
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5 last:pb-0">
            <div>
              <p className="text-sm font-medium text-white">Greener Alternative Suggestions</p>
              <p className="text-xs text-[#A0AAA5] mt-0.5">
                Surface higher-rated Indian alternatives when you scan a C, D, or E rated product.
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.alternativeAlerts}
              onChange={(v) => handleToggle('alternativeAlerts', v, 'Greener alternative alerts')}
              ariaLabel="Toggle Greener Alternative Suggestions"
            />
          </div>
        </div>
      </SurfaceCard>

      {/* SUvita AI & Privacy */}
      <SurfaceCard className="space-y-5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">SUvita AI &amp; Privacy</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Save SUvita AI Conversation History</p>
            <p className="text-xs text-[#A0AAA5] mt-0.5">
              Keep private conversation threads tied to your signed-in account so you can revisit
              previous product explanations.
            </p>
          </div>
          <ToggleSwitch
            checked={preferences.saveChatHistory}
            onChange={(v) => handleToggle('saveChatHistory', v, 'AI conversation history')}
            ariaLabel="Toggle Save SUvita AI Conversation History"
          />
        </div>
      </SurfaceCard>

      {/* Account & Localization */}
      <SurfaceCard className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Region &amp; Account</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.07] pb-4">
          <div>
            <p className="text-sm font-medium text-white">Market &amp; Currency</p>
            <p className="text-xs text-[#A0AAA5] mt-0.5">
              India · INR (₹) · GS1 India (890) barcode support · FSSAI, BIS &amp; CPCB EPR context
            </p>
          </div>
          <span className="font-mono text-xs text-[#00FFAA] tabular-nums">IN · ₹ INR</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <p className="text-sm font-medium text-white">
              {isAuthenticated ? `Signed in as ${profile.email}` : 'Guest Session Active'}
            </p>
            <p className="text-xs text-[#A0AAA5] mt-0.5">
              {isAuthenticated
                ? 'Your scans, collections, saved comparisons, and AI history sync securely to your account.'
                : 'Sign in with Google or email to persist your collections and scan history across devices.'}
            </p>
          </div>
          {isAuthenticated ? (
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setAuthModalOpen(true)}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </SurfaceCard>

      {/* Transparent Methodology & Attribution */}
      <SurfaceCard className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">
            SUvita EcoScore v1.0 Methodology &amp; Data Attribution
          </h2>
        </div>

        <p className="text-xs text-[#A0AAA5] leading-relaxed">
          SUvita computes deterministic sustainability scores from four weighted pillars:
          Ingredient Safety (<span className="font-mono text-white">40%</span>), Packaging Type (
          <span className="font-mono text-white">30%</span>), Brand Ethics (
          <span className="font-mono text-white">20%</span>), and Energy Footprint (
          <span className="font-mono text-white">10%</span>). Grades map cleanly to A (80–100), B
          (65–79), C (50–64), D (35–49), and E (0–34).
        </p>

        <p className="text-xs text-[#A0AAA5] leading-relaxed">
          <strong className="text-white">Missing-Data Transparency:</strong> Unavailable dimensions
          are never invented or treated as zero. When fewer than 50% of weighted dimensions are
          available, SUvita explicitly displays <em>Insufficient Data</em> instead of guessing a
          grade. Live external barcode lookups query Open Food Facts and Open Beauty Facts (ODbL
          1.0). Curated Indian demo items are clearly labeled as demo catalog entries.
        </p>
      </SurfaceCard>
    </div>
  );
};
