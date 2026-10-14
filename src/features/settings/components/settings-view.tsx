"use client";

import * as React from "react";
import { useSettings } from "@/features/settings/hooks/use-settings";
import {
  SettingsShell,
  type SettingsTabId,
} from "@/features/settings/components/settings-shell";
import { ProfileSection } from "@/features/settings/components/profile-section";
import { AppearanceSection } from "@/features/settings/components/appearance-section";
import { ProductivitySection } from "@/features/settings/components/productivity-section";
import { SecuritySection } from "@/features/settings/components/security-section";
import { SyncInfoSection } from "@/features/settings/components/sync-info-section";
import { DEFAULT_PREFERENCES } from "@/features/settings/types";

export interface SettingsViewProps {
  theme?: "light" | "dark";
  onTheme?: () => void;
  onProfile?: () => void;
  defaultTab?: SettingsTabId;
}

export function SettingsView({
  theme: themeProp,
  onTheme: onThemeProp,
  defaultTab = "profile",
}: SettingsViewProps = {}) {
  const [activeTab, setActiveTab] = React.useState<SettingsTabId>(defaultTab);

  const {
    data,
    isLoading,
    isSaving,
    error,
    successMessage,
    updateProfile,
    clearFeedback,
  } = useSettings();

  // If initial fetch is still loading
  if (isLoading && !data) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-8">
        <header className="mb-8 space-y-2">
          <div className="h-4 w-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-8 w-60 rounded-xl bg-muted animate-pulse" />
          <div className="h-4 w-96 rounded-lg bg-muted animate-pulse" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-8">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-full rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-28 w-full rounded-2xl bg-muted animate-pulse" />
            <div className="h-44 w-full rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // Fallback offline preview data if user is not authenticated or server unavailable
  const fallbackUser = {
    id: "offline-preview-user",
    email: "workspace@minddesk.local",
    fullName: "Faizan",
    avatarUrl: null,
    emailVerified: false,
    createdAt: new Date().toISOString(),
    defaultWorkspaceId: "offline-ws",
    workspaceName: "Personal Workspace",
    provider: "local",
    preferences: {
      ...DEFAULT_PREFERENCES,
      appearance: {
        ...DEFAULT_PREFERENCES.appearance,
        theme: themeProp || DEFAULT_PREFERENCES.appearance.theme,
      },
    },
  };

  const user = data?.user || fallbackUser;
  const sessions = data?.sessions || [];
  const syncInfo = data?.syncInfo || {
    isConfigured: false,
    syncEngine: "Local Offline Storage",
    databaseProvider: "Browser LocalStorage Cache",
    accountIsolation: "Local device sandbox",
  };

  const handleSaveProfile = async (profileUpdate: {
    fullName?: string;
    avatarUrl?: string | null;
  }) => {
    return updateProfile({
      fullName: profileUpdate.fullName,
      avatarUrl: profileUpdate.avatarUrl,
    });
  };

  const handleUpdateAppearance = async (appearance: Partial<typeof user.preferences.appearance>) => {
    if (onThemeProp && appearance.theme && appearance.theme !== "system") {
      onThemeProp();
    }
    return updateProfile({
      preferences: {
        appearance,
      },
    });
  };

  const handleUpdateProductivity = async (productivity: Partial<typeof user.preferences.productivity>) => {
    return updateProfile({
      preferences: {
        productivity,
      },
    });
  };

  const handleUpdateNotifications = async (notifications: Partial<typeof user.preferences.notifications>) => {
    return updateProfile({
      preferences: {
        notifications,
      },
    });
  };

  const currentTheme =
    themeProp || user.preferences.appearance.theme || "light";

  const handleQuickThemeToggle = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    if (onThemeProp) {
      onThemeProp();
    }
    updateProfile({
      preferences: {
        appearance: {
          theme: nextTheme,
        },
      },
    });
  };

  return (
    <SettingsShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      successMessage={successMessage}
      errorMessage={error}
      onClearFeedback={clearFeedback}
      currentTheme={currentTheme}
      onQuickThemeToggle={handleQuickThemeToggle}
    >
      {activeTab === "profile" && (
        <ProfileSection
          user={user}
          onSave={handleSaveProfile}
          isSaving={isSaving}
        />
      )}

      {activeTab === "appearance" && (
        <AppearanceSection
          appearance={user.preferences.appearance}
          onUpdate={handleUpdateAppearance}
          isSaving={isSaving}
        />
      )}

      {activeTab === "productivity" && (
        <ProductivitySection
          productivity={user.preferences.productivity}
          notifications={user.preferences.notifications}
          onUpdateProductivity={handleUpdateProductivity}
          onUpdateNotifications={handleUpdateNotifications}
          isSaving={isSaving}
        />
      )}

      {activeTab === "security" && (
        <SecuritySection
          user={user}
          sessions={sessions}
        />
      )}

      {activeTab === "sync" && (
        <SyncInfoSection
          syncInfo={syncInfo}
        />
      )}
    </SettingsShell>
  );
}
