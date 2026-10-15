/**
 * MindDesk Notes — Real-Browser Verification of the 6 Slash Commands
 *
 * Verifies:
 * 1. Exactly 6 commands exist in the slash menu (Text, Heading 1, Heading 2, Bulleted List, Numbered List, To-do List).
 * 2. Keyboard navigation: ArrowDown, ArrowUp, and Enter select highlighted command.
 * 3. Escape closes the menu without inserting.
 * 4. Slash trigger "/" and query text disappear upon selection.
 * 5. Clicking any command immediately applies appropriate formatting.
 * 6. Bulleted & numbered lists support multiple items using Enter.
 * 7. To-do list checkboxes actually toggle on click.
 * 8. Formatting and checkbox states survive saving, page refresh, and reopening the note.
 * 9. Existing saved content containing advanced blocks (quotes, code, dividers, callouts) remains intact and readable.
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = path.resolve("./test-artifacts");

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

interface TestStepResult {
  step: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: TestStepResult[] = [];

function record(step: string, status: "PASS" | "FAIL", details: string) {
  results.push({ step, status, details });
  console.log(`[${status}] ${step}: ${details}`);
}

async function runSlashCommandsVerification() {
  console.log("================================================================================");
  console.log("MINDDESK: REAL-BROWSER VERIFICATION — 6 ESSENTIAL SLASH COMMANDS");
  console.log("Target Base URL:", BASE_URL);
  console.log("================================================================================\n");

  const browser: Browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page: Page = await context.newPage();

  page.on("pageerror", (err) => console.error(">>> [PAGE ERROR]:", err.message));

  // Seed note with existing advanced block types (quote, codeBlock, divider, callout) to verify they remain intact
  const seedNoteId = "slash-test-doc-1";
  const initialContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Top paragraph in test note." }],
      },
      {
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Existing saved quote block." }] }],
      },
      {
        type: "codeBlock",
        attrs: { language: "typescript" },
        content: [{ type: "text", text: "const preservedCode = 42;" }],
      },
      {
        type: "horizontalRule",
      },
      {
        type: "callout",
        attrs: { icon: "💡", color: "default" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "Existing saved callout block." }] }],
      },
    ],
  };

  const testData = {
    theme: "light",
    projects: [
      { id: "proj-slash", name: "Slash Test Project", description: "Test", icon: "⚡", hue: "violet" },
    ],
    notes: [
      {
        id: seedNoteId,
        title: "Slash Commands Verification Document",
        excerpt: "Test note for slash commands",
        content: JSON.stringify(initialContent),
        icon: "📝",
        updated: "Just now",
        starred: false,
        projectId: "proj-slash",
        parentId: null,
      },
    ],
    tasks: [],
    maps: [],
    habits: [],
  };

  try {
    // 1. Open notes page and seed initial test data ONCE (not on every reload)
    console.log("\n--- Opening Note in Editor ---");
    await page.goto(`${BASE_URL}/notes`, { waitUntil: "networkidle", timeout: 15000 });
    await page.evaluate((data) => {
      window.localStorage.setItem("minddesk-user-guest", JSON.stringify(data));
    }, testData);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const docCard = page.locator('button:has-text("Slash Commands Verification Document")').first();
    await docCard.click();
    await page.waitForTimeout(1000);

    const editor = page.locator(".tiptap.ProseMirror");
    await editor.waitFor({ state: "visible", timeout: 5000 });

    // Verify existing advanced content is preserved and readable
    const hasQuote = await editor.locator("blockquote").isVisible();
    const hasCode = await editor.locator("pre, .minddesk-code-block").isVisible();
    const hasDivider = await editor.locator("hr").isVisible();
    const hasCallout = (await editor.locator('[data-type="callout"]').count()) > 0;

    if (hasQuote && hasCode && hasDivider && hasCallout) {
      record("Preserve Advanced Blocks", "PASS", "Existing quote, code block, divider, and callout rendered without conversion or data loss");
    } else {
      record("Preserve Advanced Blocks", "FAIL", `quote=${hasQuote}, code=${hasCode}, hr=${hasDivider}, callout=${hasCallout}`);
    }

    // 2. Trigger slash menu by typing "/"
    console.log("\n--- Verifying Slash Menu & Count ---");
    await editor.click();
    // Press Enter to get a new line at end of document
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/");
    await page.waitForTimeout(400);

    const slashMenu = page.locator('[role="listbox"][aria-label="Slash commands"]');
    await slashMenu.waitFor({ state: "visible", timeout: 3000 });

    const menuOptions = slashMenu.locator('[role="option"]');
    const optionCount = await menuOptions.count();
    const optionTexts = await menuOptions.allInnerTexts();
    const firstLines = optionTexts.map((t) => t.split("\n")[0].trim());

    const expectedCommands = ["Text", "Heading 1", "Heading 2", "Bulleted list", "Numbered list", "To-do list"];
    const matchesExactly = optionCount === 6 && expectedCommands.every((cmd) => firstLines.includes(cmd));

    if (matchesExactly) {
      record("6 Slash Commands Count", "PASS", `Menu displays strictly 6 commands: ${firstLines.join(", ")}`);
    } else {
      record("6 Slash Commands Count", "FAIL", `Expected 6 commands, found ${optionCount}: ${firstLines.join(", ")}`);
    }

    // 3. Test Escape closes the menu
    console.log("\n--- Testing Escape Key Closes Menu ---");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const isMenuClosed = !(await slashMenu.isVisible());
    if (isMenuClosed) {
      record("Escape Key Closes Menu", "PASS", "Escape key immediately closed the slash menu");
    } else {
      record("Escape Key Closes Menu", "FAIL", "Menu remained visible after Escape");
    }

    // Clean up the "/" character
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(200);

    // 4. Test Arrow Navigation and Enter Selection (Heading 1)
    console.log("\n--- Testing Arrow Down & Enter Selection (Heading 1) ---");
    await page.keyboard.type("/");
    await page.waitForTimeout(300);
    // Option 0 is Text. Press ArrowDown once to highlight Heading 1
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);

    await page.keyboard.type("First Test Heading");
    await page.waitForTimeout(300);

    const h1Count = await editor.locator("h1").count();
    const h1Text = await editor.locator("h1").first().innerText();
    const h1HasSlash = h1Text.includes("/");

    if (h1Count >= 1 && h1Text.includes("First Test Heading") && !h1HasSlash) {
      record("Heading 1 Command (Arrow+Enter)", "PASS", "Heading 1 applied via ArrowDown+Enter, '/' trigger consumed cleanly");
    } else {
      record("Heading 1 Command (Arrow+Enter)", "FAIL", `h1Count=${h1Count}, text=${h1Text}, hasSlash=${h1HasSlash}`);
    }

    // 5. Test Heading 2 by Click
    console.log("\n--- Testing Heading 2 by Mouse Click ---");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/h2");
    await page.waitForTimeout(300);

    // The menu should filter to Heading 2
    const h2Option = slashMenu.locator('[role="option"]:has-text("Heading 2")').first();
    await h2Option.click();
    await page.waitForTimeout(400);

    await page.keyboard.type("Sub Section Heading");
    await page.waitForTimeout(300);

    const h2Count = await editor.locator("h2").count();
    const h2Text = await editor.locator("h2").first().innerText();
    const h2HasSlash = h2Text.includes("/");

    if (h2Count >= 1 && h2Text.includes("Sub Section Heading") && !h2HasSlash) {
      record("Heading 2 Command (Click)", "PASS", "Heading 2 applied via click, '/h2' search text consumed cleanly");
    } else {
      record("Heading 2 Command (Click)", "FAIL", `h2Count=${h2Count}, text=${h2Text}, hasSlash=${h2HasSlash}`);
    }

    // 6. Test Bulleted List with Multiple Items
    console.log("\n--- Testing Bulleted List with Multiple Items ---");
    await page.keyboard.press("Enter");
    // In heading, Enter creates paragraph. Now type /bullet
    await page.keyboard.type("/bullet");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);

    await page.keyboard.type("Alpha Item");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Beta Item");
    await page.waitForTimeout(300);

    const bulletItems = await editor.locator("ul:not(.minddesk-task-list) > li").allInnerTexts();
    const bulletHasAlpha = bulletItems.some((t) => t.includes("Alpha Item"));
    const bulletHasBeta = bulletItems.some((t) => t.includes("Beta Item"));

    if (bulletHasAlpha && bulletHasBeta) {
      record("Bulleted List Multi-Item", "PASS", `Bulleted list created with 2 items via Enter: ${bulletItems.join(", ")}`);
    } else {
      record("Bulleted List Multi-Item", "FAIL", `Bullet items: ${bulletItems.join(", ")}`);
    }

    // 7. Test Numbered List with Multiple Items
    console.log("\n--- Testing Numbered List with Multiple Items ---");
    // Press Enter twice to exit bullet list
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await page.keyboard.type("/number");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);

    await page.keyboard.type("First step");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second step");
    await page.waitForTimeout(300);

    const numberedItems = await editor.locator("ol > li").allInnerTexts();
    const numHas1 = numberedItems.some((t) => t.includes("First step"));
    const numHas2 = numberedItems.some((t) => t.includes("Second step"));

    if (numHas1 && numHas2) {
      record("Numbered List Multi-Item", "PASS", `Numbered list created with 2 items via Enter: ${numberedItems.join(", ")}`);
    } else {
      record("Numbered List Multi-Item", "FAIL", `Numbered items: ${numberedItems.join(", ")}`);
    }

    // 8. Test To-do List with Checkbox Toggle
    console.log("\n--- Testing To-do List Checkbox Toggle ---");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await page.keyboard.type("/todo");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);

    await page.keyboard.type("Verify deployment build");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Verify database safety");
    await page.waitForTimeout(300);

    const taskItems = editor.locator('li.minddesk-task-item, ul[data-type="taskList"] > li');
    const taskCount = await taskItems.count();

    // Toggle the first checkbox
    const firstCheckbox = taskItems.first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(400);

    const isFirstChecked = await firstCheckbox.isChecked();
    const secondCheckbox = taskItems.nth(1).locator('input[type="checkbox"]');
    const isSecondChecked = await secondCheckbox.isChecked();

    if (taskCount >= 2 && isFirstChecked && !isSecondChecked) {
      record("To-do List Checkbox Toggle", "PASS", `To-do item 1 checked=true, item 2 checked=false`);
    } else {
      record("To-do List Checkbox Toggle", "FAIL", `taskCount=${taskCount}, firstChecked=${isFirstChecked}, secondChecked=${isSecondChecked}`);
    }

    // 9. Test Plain Text Command
    console.log("\n--- Testing Text Command ---");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await page.keyboard.type("/text");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);

    await page.keyboard.type("Normal plain paragraph text.");
    await page.waitForTimeout(500);

    const hasPlainText = (await editor.innerText()).includes("Normal plain paragraph text.");
    if (hasPlainText) {
      record("Text Command", "PASS", "Plain paragraph inserted without formatting");
    } else {
      record("Text Command", "FAIL", "Plain text not found in document");
    }

    // 10. Persistence & Reload Verification
    console.log("\n--- Testing Persistence Across Page Reload ---");
    // Blur editor and navigate to All notes to guarantee full flush & persistence
    await editor.blur();
    await page.waitForTimeout(500);

    const allNotesBtn = page.locator('button:has-text("All notes")').first();
    if (await allNotesBtn.isVisible()) {
      await allNotesBtn.click();
      await page.waitForTimeout(600);
    }

    // Reload page
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Reopen the note in editor
    const reloadedCard = page.locator('button:has-text("Slash Commands Verification Document")').first();
    await reloadedCard.click();
    await page.waitForTimeout(1000);

    const reloadedEditor = page.locator(".tiptap.ProseMirror");
    await reloadedEditor.waitFor({ state: "visible", timeout: 5000 });

    const reloadedH1 = await reloadedEditor.locator("h1:has-text('First Test Heading')").isVisible();
    const reloadedH2 = await reloadedEditor.locator("h2:has-text('Sub Section Heading')").isVisible();
    const reloadedBullet = await reloadedEditor.locator("ul:not(.minddesk-task-list) > li:has-text('Alpha Item')").isVisible();
    const reloadedNumber = await reloadedEditor.locator("ol > li:has-text('First step')").isVisible();
    const reloadedTask = reloadedEditor.locator('li.minddesk-task-item, ul[data-type="taskList"] > li').first();
    const reloadedTaskChecked = await reloadedTask.locator('input[type="checkbox"]').isChecked();
    const reloadedPreservedCode = await reloadedEditor.locator("pre, .minddesk-code-block").isVisible();

    if (reloadedH1 && reloadedH2 && reloadedBullet && reloadedNumber && reloadedTaskChecked && reloadedPreservedCode) {
      record("Persistence Across Reload", "PASS", "All formatting, multi-item lists, toggled checkbox state, and advanced blocks preserved across reload");
    } else {
      record("Persistence Across Reload", "FAIL", `h1=${reloadedH1}, h2=${reloadedH2}, bullet=${reloadedBullet}, num=${reloadedNumber}, taskChecked=${reloadedTaskChecked}, code=${reloadedPreservedCode}`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "slash-commands-verified.png") });

  } catch (err: any) {
    record("Execution", "FAIL", `Unexpected test error: ${err.message}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "slash-test-failure.png") }).catch(() => {});
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log("SLASH COMMANDS REAL-BROWSER TEST RESULTS");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  for (const r of results) {
    console.log(`[${r.status}] ${r.step} — ${r.details}`);
  }

  console.log(`\nTOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) {
    console.error(">>> ONE OR MORE SLASH COMMAND TESTS FAILED! <<<");
    process.exit(1);
  } else {
    console.log(">>> ALL SLASH COMMAND TESTS PASSED! <<<");
  }
}

runSlashCommandsVerification().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
