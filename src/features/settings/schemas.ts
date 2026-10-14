import { z } from "zod";

export const appearanceSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("light"),
  compactMode: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
});

export const productivitySettingsSchema = z.object({
  defaultCalendarView: z.enum(["month", "week", "day", "agenda"]).default("month"),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  timeFormat: z.enum(["12h", "24h"]).default("12h"),
  defaultTaskPriority: z.enum(["low", "medium", "high"]).default("medium"),
  defaultTaskDueOffsetDays: z.number().int().min(0).max(365).default(0),
  defaultDurationMinutes: z.number().int().min(5).max(480).default(30),
});

export const notificationSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  browserNotifications: z.boolean().default(false),
  taskReminders: z.boolean().default(true),
  calendarReminders: z.boolean().default(true),
  dailyDigest: z.boolean().default(false),
  quietHoursEnabled: z.boolean().default(true),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:mm format").default("22:00"),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:mm format").default("07:00"),
});

export const userPreferencesSchema = z.object({
  appearance: appearanceSettingsSchema.default({
    theme: "light",
    compactMode: false,
    reducedMotion: false,
  }),
  productivity: productivitySettingsSchema.default({
    defaultCalendarView: "month",
    weekStartsOn: 1,
    timeFormat: "12h",
    defaultTaskPriority: "medium",
    defaultTaskDueOffsetDays: 0,
    defaultDurationMinutes: 30,
  }),
  notifications: notificationSettingsSchema.default({
    enabled: true,
    browserNotifications: false,
    taskReminders: true,
    calendarReminders: true,
    dailyDigest: false,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  }),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Name must be at least 1 character")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  avatarUrl: z
    .union([
      z.string().trim().url("Must be a valid URL"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  preferences: z
    .object({
      appearance: appearanceSettingsSchema.partial().optional(),
      productivity: productivitySettingsSchema.partial().optional(),
      notifications: notificationSettingsSchema.partial().optional(),
    })
    .optional(),
});

export type UpdateProfileSchemaInput = z.infer<typeof updateProfileSchema>;
