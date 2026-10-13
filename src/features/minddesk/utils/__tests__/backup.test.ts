import { describe, expect, it } from "vitest";
import { getLocalBackupJson, parseLocalBackup } from "../backup";
import { initialDeskData } from "../../seed";

describe("MindDesk Local Prototype Backup Utility", () => {
  it("serializes desk data into a valid timestamped JSON payload", () => {
    const json = getLocalBackupJson(initialDeskData);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json);
    expect(parsed.app).toBe("MindDesk");
    expect(parsed.version).toBeGreaterThanOrEqual(2);
    expect(parsed.exportedAt).toBeDefined();
    expect(Array.isArray(parsed.data.tasks)).toBe(true);
  });

  it("safely restores valid backup JSON", () => {
    const json = getLocalBackupJson(initialDeskData);
    const restored = parseLocalBackup(json);
    expect(restored).not.toBeNull();
    expect(restored?.tasks.length).toBe(initialDeskData.tasks.length);
  });

  it("handles malformed JSON gracefully without crashing", () => {
    expect(parseLocalBackup("not-valid-json")).toBeNull();
    expect(parseLocalBackup("")).toBeNull();
    expect(parseLocalBackup("{}")).toBeNull();
  });
});
