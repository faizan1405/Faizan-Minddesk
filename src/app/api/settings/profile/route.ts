import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  const appearance = {
    ...DEFAULT_PREFERENCES.appearance,
    ...appearanceRaw,
  };

  const productivity = {
    ...DEFAULT_PREFERENCES.productivity,
    ...productivityRaw,
  };

  const notifications = {
    ...DEFAULT_PREFERENCES.notifications,
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
    const existingProfile = await prisma.profile.findUnique({
      where: { id: verifiedUser.id },
      select: { preferences: true, fullName: true, avatarUrl: true },
    });

    const currentPrefs = mergePreferences(existingProfile?.preferences);

    let nextPrefs: UserSettingsPreferences = currentPrefs;
    if (input.preferences) {
      nextPrefs = {
        appearance: {
          ...currentPrefs.appearance,
          ...(input.preferences.appearance || {}),
        },
        productivity: {
          ...currentPrefs.productivity,
          ...(input.preferences.productivity || {}),
        },
        notifications: {
          ...currentPrefs.notifications,
          ...(input.preferences.notifications || {}),
        },
      };
    }

    const updatedName = input.fullName !== undefined ? input.fullName : undefined;
    const updatedAvatar =
      input.avatarUrl !== undefined
        ? input.avatarUrl === ""
          ? null
          : input.avatarUrl
        : undefined;

    await prisma.$transaction(async (tx) => {
      if (updatedName !== undefined || updatedAvatar !== undefined) {
        await tx.user.update({
          where: { id: verifiedUser.id },
          data: {
            ...(updatedName !== undefined ? { name: updatedName } : {}),
            ...(updatedAvatar !== undefined ? { image: updatedAvatar } : {}),
          },
        });
      }

      await tx.profile.update({
        where: { id: verifiedUser.id },
        data: {
          ...(updatedName !== undefined ? { fullName: updatedName } : {}),
          ...(updatedAvatar !== undefined ? { avatarUrl: updatedAvatar } : {}),
          preferences: nextPrefs as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      profile: {
        id: verifiedUser.id,
        fullName: updatedName !== undefined ? updatedName : existingProfile?.fullName || verifiedUser.fullName,
        avatarUrl: updatedAvatar !== undefined ? updatedAvatar : existingProfile?.avatarUrl ?? verifiedUser.avatarUrl,
        preferences: nextPrefs,
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
