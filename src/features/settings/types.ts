export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  compactMode: boolean;
  reducedMotion: boolean;
}

export interface ProductivitySettings {
  defaultCalendarView: "month" | "week" | "day" | "agenda";
  weekStartsOn: 0 | 1; // 0: Sunday, 1: Monday
  timeFormat: "12h" | "24h";
  defaultTaskPriority: "low" | "medium" | "high";
  defaultTaskDueOffsetDays: number; // 0 = today, 1 = tomorrow, 7 = next week
  defaultDurationMinutes: number; // 15, 30, 45, 60
}

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  taskReminders: boolean;
  calendarReminders: boolean;
  dailyDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string;   // e.g. "07:00"
}

export interface UserSettingsPreferences {
  appearance: AppearanceSettings;
  productivity: ProductivitySettings;
  notifications: NotificationSettings;
}

export interface UserProfileData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  defaultWorkspaceId: string | null;
  workspaceName: string;
  provider: string;
  preferences: UserSettingsPreferences;
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
}

export interface SyncOverviewInfo {
  isConfigured: boolean;
  syncEngine: string;
  databaseProvider: string;
  accountIsolation: string;
  lastSyncedAt?: string | null;
}

export interface SettingsApiResponse {
  user: UserProfileData;
  sessions: SessionInfo[];
  syncInfo: SyncOverviewInfo;
}

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string | null;
  preferences?: Partial<{
    appearance: Partial<AppearanceSettings>;
    productivity: Partial<ProductivitySettings>;
    notifications: Partial<NotificationSettings>;
  }>;
}

export const DEFAULT_PREFERENCES: UserSettingsPreferences = {
  appearance: {
    theme: "light",
    compactMode: false,
    reducedMotion: false,
  },
  productivity: {
    defaultCalendarView: "month",
    weekStartsOn: 1, // Monday
    timeFormat: "12h",
    defaultTaskPriority: "medium",
    defaultTaskDueOffsetDays: 0,
    defaultDurationMinutes: 30,
  },
  notifications: {
    enabled: true,
    browserNotifications: false,
    taskReminders: true,
    calendarReminders: true,
    dailyDigest: false,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  },
};
