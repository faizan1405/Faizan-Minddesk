import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/auth/env";
import { prisma } from "@/lib/db/prisma";
import { updateProfileSchema } from "@/features/settings/schemas";
import {
  DEFAULT_PREFERENCES,
  type SessionInfo,
  type SettingsApiResponse,
  type UserSettingsPreferences,
} from "@/features/settings/types";
import { updateUserProfileSettingsSafely } from "@/lib/sync/sync-repository";

function mergePreferences(raw: unknown): UserSettingsPreferences {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PREFERENCES;
  }
  const obj = raw as Record<string, unknown>;

  const appearanceRaw =
    obj.appearance && typeof obj.appearance === "object"
      ? (obj.appearance as Record<string, unknown>)
      : {};
  const productivityRaw =
    obj.productivity && typeof obj.productivity === "object"
      ? (obj.productivity as Record<string, unknown>)
      : {};
  const notificationsRaw =
    obj.notifications && typeof obj.notifications === "object"
      ? (obj.notifications as Record<string, unknown>)
      : {};

  const calRaw =
    obj.calendar && typeof obj.calendar === "object"
      ? (obj.calendar as Record<string, unknown>)
      : {};
  const calSettingsRaw =
    calRaw.settings && typeof calRaw.settings === "object"
      ? (calRaw.settings as Record<string, unknown>)
      : {};

  const notifPrefsRaw =
    notificationsRaw.preferences && typeof notificationsRaw.preferences === "object"
      ? (notificationsRaw.preferences as Record<string, unknown>)
      : {};
  const notifCategoriesRaw =
    notifPrefsRaw.categories && typeof notifPrefsRaw.categories === "object"
      ? (notifPrefsRaw.categories as Record<string, unknown>)
      : {};
  const notifSettingsRaw =
    notificationsRaw.settings && typeof notificationsRaw.settings === "object"
      ? (notificationsRaw.settings as Record<string, unknown>)
      : {};

  const appearance = {
    ...DEFAULT_PREFERENCES.appearance,
    ...(obj.theme === "dark" || obj.theme === "light" ? { theme: obj.theme } : {}),
    ...appearanceRaw,
  };

  const productivity = {
    ...DEFAULT_PREFERENCES.productivity,
    ...(calSettingsRaw.defaultView ? { defaultCalendarView: calSettingsRaw.defaultView } : {}),
    ...(calSettingsRaw.weekStartsOn !== undefined ? { weekStartsOn: calSettingsRaw.weekStartsOn } : {}),
    ...(calSettingsRaw.timeFormat ? { timeFormat: calSettingsRaw.timeFormat } : {}),
    ...(calSettingsRaw.defaultDurationMinutes !== undefined ? { defaultDurationMinutes: calSettingsRaw.defaultDurationMinutes } : {}),
    ...productivityRaw,
  };

  const notifications = {
    ...DEFAULT_PREFERENCES.notifications,
    ...(notifPrefsRaw.enabled !== undefined ? { enabled: notifPrefsRaw.enabled } : {}),
    ...(notifPrefsRaw.browserNotificationsEnabled !== undefined
      ? { browserNotifications: notifPrefsRaw.browserNotificationsEnabled }
      : {}),
    ...(notifPrefsRaw.quietHoursEnabled !== undefined
      ? { quietHoursEnabled: notifPrefsRaw.quietHoursEnabled }
      : {}),
    ...(notifPrefsRaw.quietHoursStart ? { quietHoursStart: notifPrefsRaw.quietHoursStart } : {}),
    ...(notifPrefsRaw.quietHoursEnd ? { quietHoursEnd: notifPrefsRaw.quietHoursEnd } : {}),
    ...(notifCategoriesRaw.tasks !== undefined ? { taskReminders: notifCategoriesRaw.tasks } : {}),
    ...(notifCategoriesRaw.calendar !== undefined ? { calendarReminders: notifCategoriesRaw.calendar } : {}),
    ...(notifPrefsRaw.dailySummaryEnabled !== undefined ? { dailyDigest: notifPrefsRaw.dailySummaryEnabled } : {}),
    ...notifSettingsRaw,
    ...notificationsRaw,
  };

  return {
    appearance: {
      theme:
        appearance.theme === "dark" || appearance.theme === "light" || appearance.theme === "system"
          ? appearance.theme
          : "light",
      compactMode: Boolean(appearance.compactMode),
      reducedMotion: Boolean(appearance.reducedMotion),
    },
    productivity: {
      defaultCalendarView:
        productivity.defaultCalendarView === "week" ||
        productivity.defaultCalendarView === "day" ||
        productivity.defaultCalendarView === "agenda"
          ? productivity.defaultCalendarView
          : "month",
      weekStartsOn: productivity.weekStartsOn === 0 ? 0 : 1,
      timeFormat: productivity.timeFormat === "24h" ? "24h" : "12h",
      defaultTaskPriority:
        productivity.defaultTaskPriority === "low" || productivity.defaultTaskPriority === "high"
          ? productivity.defaultTaskPriority
          : "medium",
      defaultTaskDueOffsetDays:
        typeof productivity.defaultTaskDueOffsetDays === "number"
          ? Math.max(0, Math.min(365, productivity.defaultTaskDueOffsetDays))
          : 0,
      defaultDurationMinutes:
        typeof productivity.defaultDurationMinutes === "number"
          ? Math.max(5, Math.min(480, productivity.defaultDurationMinutes))
          : 30,
    },
    notifications: {
      enabled: notifications.enabled !== undefined ? Boolean(notifications.enabled) : true,
      browserNotifications: Boolean(notifications.browserNotifications),
      taskReminders: notifications.taskReminders !== undefined ? Boolean(notifications.taskReminders) : true,
      calendarReminders: notifications.calendarReminders !== undefined ? Boolean(notifications.calendarReminders) : true,
      dailyDigest: Boolean(notifications.dailyDigest),
      quietHoursEnabled: notifications.quietHoursEnabled !== undefined ? Boolean(notifications.quietHoursEnabled) : true,
      quietHoursStart: typeof notifications.quietHoursStart === "string" ? notifications.quietHoursStart : "22:00",
      quietHoursEnd: typeof notifications.quietHoursEnd === "string" ? notifications.quietHoursEnd : "07:00",
    },
  };
}

export async function GET() {
  const verifiedUser = await getVerifiedUser();
  if (!verifiedUser) {
    return NextResponse.json(
      { error: "Authentication required. Please sign in to view account settings." },
      { status: 401 }
    );
  }

  try {
    const [dbUser, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: verifiedUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          sessions: {
            select: {
              id: true,
              token: true,
              createdAt: true,
              expiresAt: true,
              userAgent: true,
              ipAddress: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          accounts: {
            select: {
              providerId: true,
            },
            take: 1,
          },
        },
      }),
      prisma.profile.findUnique({
        where: { id: verifiedUser.id },
        select: {
          fullName: true,
          avatarUrl: true,
          defaultWorkspaceId: true,
          preferences: true,
          defaultWorkspace: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const cookieStore = await cookies();
    const currentToken =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("__Secure-better-auth.session_token")?.value ||
      null;

    const sessions: SessionInfo[] = (dbUser?.sessions || []).map((s, idx) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      isCurrent: currentToken ? s.token === currentToken : idx === 0,
    }));

    const preferences = mergePreferences(profile?.preferences);
    const preferencesVersion =
      typeof profile?.preferences === "object" && profile?.preferences !== null
        ? ((profile.preferences as Record<string, unknown>)._version as number | undefined) ?? 1
        : 1;

    const response: SettingsApiResponse = {
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        fullName: profile?.fullName || dbUser?.name || verifiedUser.fullName || "MindDesk User",
        avatarUrl: profile?.avatarUrl ?? dbUser?.image ?? verifiedUser.avatarUrl ?? null,
        emailVerified: dbUser?.emailVerified ?? false,
        createdAt: dbUser?.createdAt ? dbUser.createdAt.toISOString() : new Date().toISOString(),
        defaultWorkspaceId: profile?.defaultWorkspaceId ?? verifiedUser.defaultWorkspaceId ?? null,
        workspaceName: profile?.defaultWorkspace?.name || "Personal Workspace",
        provider: dbUser?.accounts?.[0]?.providerId || "credential",
        preferences,
        preferencesVersion,
      },
      sessions,
      syncInfo: {
        isConfigured: isDatabaseConfigured(),
        syncEngine: "Hostinger MySQL Cloud Sync",
        databaseProvider: "MySQL (Prisma ORM)",
        accountIsolation: "Authenticated User & Workspace Row-Level Isolation",
        lastSyncedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[SETTINGS_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to retrieve account settings. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const verifiedUser = await getVerifiedUser();
  if (!verifiedUser) {
    return NextResponse.json(
      { error: "Authentication required. Please sign in to update account settings." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = updateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    const result = await updateUserProfileSettingsSafely(prisma, verifiedUser.id, {
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
      preferences: input.preferences,
      preferencesVersion: input.preferencesVersion,
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      profile: {
        id: verifiedUser.id,
        fullName: result.fullName,
        avatarUrl: result.avatarUrl,
        preferences: result.preferences,
        preferencesVersion: result.preferencesVersion,
      },
    });
  } catch (err) {
    console.error("[SETTINGS_PATCH_ERROR]", err);
    return NextResponse.json(
      { error: "Unable to save your settings. Please try again." },
      { status: 500 }
    );
  }
}
