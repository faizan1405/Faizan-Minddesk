import { describe, it, expect } from "vitest";
import {
  parseHHMM,
  formatMinutesToHHMM,
  formatMinutesTo12h,
  calculateDayMapCubes,
  calculateDailyTimeSummary,
  scheduleFlexibleRoutines,
} from "../services/smart-scheduler";
import {
  DEFAULT_PLANNER_CATEGORIES,
  PlannerRoutine,
  PlannerRoutineException,
} from "../types";
import type { ScheduledTaskBlock } from "@/features/calendar/types";

describe("MindDesk Smart Scheduler & 24-Hour Map Logic", () => {
  it("accurately converts HH:mm and minutes", () => {
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("09:30")).toBe(570);
    expect(parseHHMM("15:00")).toBe(900);
    expect(parseHHMM("23:59")).toBe(1439);

    expect(formatMinutesToHHMM(0)).toBe("00:00");
    expect(formatMinutesToHHMM(570)).toBe("09:30");
    expect(formatMinutesToHHMM(900)).toBe("15:00");

    expect(formatMinutesTo12h(0)).toBe("12:00 AM");
    expect(formatMinutesTo12h(570)).toBe("9:30 AM");
    expect(formatMinutesTo12h(720)).toBe("12:00 PM");
    expect(formatMinutesTo12h(900)).toBe("3:00 PM");
  });

  it("generates exactly 48 cubes across 4 six-hour rows", () => {
    const cubes = calculateDayMapCubes("2026-10-15", []);
    expect(cubes).toHaveLength(48);

    // Row 0: 12 AM - 6 AM (cubes 0-11)
    expect(cubes[0].formattedLabel).toBe("12:00 AM");
    expect(cubes[11].formattedLabel).toBe("5:30 AM");
    expect(cubes[0].row).toBe(0);

    // Row 1: 6 AM - 12 PM (cubes 12-23)
    expect(cubes[12].formattedLabel).toBe("6:00 AM");
    expect(cubes[23].formattedLabel).toBe("11:30 AM");
    expect(cubes[12].row).toBe(1);

    // Row 2: 12 PM - 6 PM (cubes 24-35)
    expect(cubes[24].formattedLabel).toBe("12:00 PM");
    expect(cubes[35].formattedLabel).toBe("5:30 PM");
    expect(cubes[24].row).toBe(2);

    // Row 3: 6 PM - 12 AM (cubes 36-47)
    expect(cubes[36].formattedLabel).toBe("6:00 PM");
    expect(cubes[47].formattedLabel).toBe("11:30 PM");
    expect(cubes[36].row).toBe(3);
  });

  it("colors exactly 12 consecutive cubes for a 6-hour block (9 AM to 3 PM) spanning across rows", () => {
    const blocks: ScheduledTaskBlock[] = [
      {
        id: "block-dev",
        title: "Website Development",
        date: "2026-10-15",
        startTime: "09:00",
        endTime: "15:00",
        durationMinutes: 360,
        categoryId: "cat-work-focus",
        color: "#4f46e5",
        completed: false,
        status: "confirmed",
        createdAt: "2026-10-15T09:00:00Z",
      },
    ];

    const cubes = calculateDayMapCubes("2026-10-15", blocks, DEFAULT_PLANNER_CATEGORIES);

    // 9 AM is cube index 18 (9 * 2)
    // 3 PM is cube index 30 (15 * 2)
    // Cubes 18 to 29 (12 cubes) should be filled 100%
    const filledCubes = cubes.filter((c) => c.fillPercent === 100);
    expect(filledCubes).toHaveLength(12);

    expect(cubes[17].fillPercent).toBe(0); // 8:30 AM is empty
    expect(cubes[18].fillPercent).toBe(100); // 9:00 AM is filled
    expect(cubes[18].row).toBe(1); // In Row 1 (6 AM - 12 PM)
    expect(cubes[23].fillPercent).toBe(100); // 11:30 AM is filled (Row 1 end)
    expect(cubes[24].fillPercent).toBe(100); // 12:00 PM is filled (Row 2 start)
    expect(cubes[29].fillPercent).toBe(100); // 2:30 PM is filled
    expect(cubes[30].fillPercent).toBe(0); // 3:00 PM is empty

    // Color matches Work & Focus
    expect(cubes[18].color).toBe("#4f46e5");
  });

  it("handles overnight blocks correctly across midnight boundaries", () => {
    // Overnight sleep block from 11 PM to 7 AM
    const blocks: ScheduledTaskBlock[] = [
      {
        id: "sleep-1",
        title: "Sleep",
        date: "2026-10-14",
        startTime: "23:00",
        endTime: "07:00",
        durationMinutes: 480,
        categoryId: "cat-sleep",
        color: "#64748b",
        completed: false,
        status: "confirmed",
        createdAt: "2026-10-14T23:00:00Z",
      },
    ];

    // On 2026-10-14: cubes 46 and 47 (11 PM - 12 AM: 2 cubes = 1 hour) are filled
    const day1Cubes = calculateDayMapCubes("2026-10-14", blocks, DEFAULT_PLANNER_CATEGORIES);
    expect(day1Cubes[45].fillPercent).toBe(0);
    expect(day1Cubes[46].fillPercent).toBe(100); // 11:00 PM
    expect(day1Cubes[47].fillPercent).toBe(100); // 11:30 PM

    // On 2026-10-15: overnight spillover covers 00:00 to 07:00 (14 cubes = 7 hours)
    const day2Cubes = calculateDayMapCubes("2026-10-15", blocks, DEFAULT_PLANNER_CATEGORIES);
    const day2SleepCubes = day2Cubes.filter((c) => c.primaryBlock?.id === "sleep-1");
    expect(day2SleepCubes).toHaveLength(14); // 00:00 to 07:00 = 14 half hours
    expect(day2Cubes[0].fillPercent).toBe(100); // 12:00 AM
    expect(day2Cubes[13].fillPercent).toBe(100); // 06:30 AM
    expect(day2Cubes[14].fillPercent).toBe(0); // 07:00 AM
  });

  it("calculates daily time summary without double counting overlapping intervals", () => {
    const blocks: ScheduledTaskBlock[] = [
      {
        id: "b1",
        title: "Work 1",
        date: "2026-10-15",
        startTime: "09:00",
        endTime: "11:00", // 120m
        durationMinutes: 120,
        completed: false,
        status: "confirmed",
        createdAt: "",
      },
      {
        id: "b2",
        title: "Overlapping Work 2",
        date: "2026-10-15",
        startTime: "10:00",
        endTime: "12:00", // overlaps 10:00-11:00, merged 09:00-12:00 = 180m
        durationMinutes: 120,
        completed: false,
        status: "confirmed",
        createdAt: "",
      },
      {
        id: "b3",
        title: "Suggested Workout",
        date: "2026-10-15",
        startTime: "17:00",
        endTime: "18:00", // 60m
        durationMinutes: 60,
        completed: false,
        status: "suggested",
        createdAt: "",
      },
    ];

    const focusSessions = [
      { date: "2026-10-15", focusedMinutes: 50 },
      { date: "2026-10-15", focusedMinutes: 25 },
    ];

    const summary = calculateDailyTimeSummary("2026-10-15", blocks, focusSessions);

    expect(summary.confirmedMinutes).toBe(180); // 3 hours (not 240!)
    expect(summary.suggestedMinutes).toBe(60); // 1 hour
    expect(summary.unallocatedMinutes).toBe(1440 - 180 - 60); // exactly 20 hours (1200m)
    expect(summary.confirmedMinutes + summary.suggestedMinutes + summary.unallocatedMinutes).toBe(1440); // 24 hours total
    expect(summary.focusedMinutes).toBe(75); // 1h 15m
  });

  it("schedules flexible routines deterministically respecting preferred time and window", () => {
    // Routine: Reading 60m, preferred 8 PM (20:00), window 6 PM - 10 PM (18:00 - 22:00)
    // 2026-10-15 is Thursday (day 4)
    const routine: PlannerRoutine = {
      id: "routine-reading",
      title: "Reading",
      durationMinutes: 60,
      categoryId: "cat-personal",
      type: "flexible",
      frequency: "daily",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      preferredStartTime: "20:00",
      windowStartTime: "18:00",
      windowEndTime: "22:00",
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    // Case 1: Slot 20:00 is free -> suggests 20:00 - 21:00
    const result1 = scheduleFlexibleRoutines("2026-10-15", [routine], [], []);
    expect(result1.suggestedBlocks).toHaveLength(1);
    expect(result1.suggestedBlocks[0].startTime).toBe("20:00");
    expect(result1.suggestedBlocks[0].endTime).toBe("21:00");
    expect(result1.suggestedBlocks[0].status).toBe("suggested");
    expect(result1.unplacedRoutines).toHaveLength(0);

    // Case 2: 20:00 - 21:00 is occupied by Dinner -> suggests nearest free slot (e.g. 19:00 - 20:00 or 21:00 - 22:00)
    const dinnerBlock: ScheduledTaskBlock = {
      id: "dinner",
      title: "Dinner",
      date: "2026-10-15",
      startTime: "20:00",
      endTime: "21:00",
      durationMinutes: 60,
      completed: false,
      status: "confirmed",
      createdAt: "",
    };
    const result2 = scheduleFlexibleRoutines("2026-10-15", [routine], [], [dinnerBlock]);
    expect(result2.suggestedBlocks).toHaveLength(1);
    // Nearest free interval within 18:00 - 22:00: either 19:00 or 21:00
    expect(["19:00", "21:00"]).toContain(result2.suggestedBlocks[0].startTime);
    expect(result2.suggestedBlocks[0].durationMinutes).toBe(60);

    // Case 3: Entire window 18:00 - 22:00 is occupied -> placed into unplaced routines with reason!
    const fullBlock: ScheduledTaskBlock = {
      id: "busy",
      title: "Evening Event",
      date: "2026-10-15",
      startTime: "18:00",
      endTime: "22:00",
      durationMinutes: 240,
      completed: false,
      status: "confirmed",
      createdAt: "",
    };
    const result3 = scheduleFlexibleRoutines("2026-10-15", [routine], [], [fullBlock]);
    expect(result3.suggestedBlocks).toHaveLength(0);
    expect(result3.unplacedRoutines).toHaveLength(1);
    expect(result3.unplacedRoutines[0].reason).toContain("No free 60m slot available between 6:00 PM – 10:00 PM");
  });

  it("handles Skip Today exception without deleting the routine", () => {
    const routine: PlannerRoutine = {
      id: "routine-gym",
      title: "Workout",
      durationMinutes: 60,
      categoryId: "cat-health",
      type: "flexible",
      frequency: "daily",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      preferredStartTime: "08:00",
      windowStartTime: "07:00",
      windowEndTime: "11:00",
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    const exception: PlannerRoutineException = {
      id: "ex-1",
      routineId: "routine-gym",
      date: "2026-10-15",
      type: "skip",
      createdAt: "2026-10-15T00:00:00Z",
    };

    // On skipped date: no suggestion generated
    const resultToday = scheduleFlexibleRoutines("2026-10-15", [routine], [exception], []);
    expect(resultToday.suggestedBlocks).toHaveLength(0);
    expect(resultToday.unplacedRoutines).toHaveLength(0);

    // On tomorrow: routine schedules normally!
    const resultTomorrow = scheduleFlexibleRoutines("2026-10-16", [routine], [exception], []);
    expect(resultTomorrow.suggestedBlocks).toHaveLength(1);
    expect(resultTomorrow.suggestedBlocks[0].startTime).toBe("08:00");
  });
});
