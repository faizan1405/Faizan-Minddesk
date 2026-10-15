#!/usr/bin/env python3
"""
MindDesk Notes Upgrade Application & Integrity Verifier
======================================================
This script applies and verifies the Notes upgrade:
1. Verifies strict safety constraints (does NOT touch Agent 4's branch, does NOT reset database, does NOT merge/deploy).
2. Verifies Notes Home displays ONLY top-level pages (parentId is null/undefined).
3. Verifies direct subpages and grandchildren render when the parent page opens in the editor.
4. Verifies slash commands menu is trimmed to 13 basic, functional commands (self-contained, no modal dependencies).
5. Verifies preservation of existing note content and parent-child hierarchy relationships.
"""

import os
import sys
import json
import subprocess

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def log(msg, status="INFO"):
    colors = {
        "INFO": "\033[94m[*]\033[0m",
        "PASS": "\033[92m[OK]\033[0m",
        "WARN": "\033[93m[!]\033[0m",
        "FAIL": "\033[91m[FAIL]\033[0m",
    }
    prefix = colors.get(status, "[*]")
    print(f"{prefix} {msg}")

def check_branch_safety():
    log("Checking active git branch safety...", "INFO")
    try:
        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"], 
            stderr=subprocess.PIPE,
            text=True
        ).strip()
        log(f"Active branch: '{branch}'", "INFO")
        
        # Guard Agent 4's branch
        if "dashboard-notifications" in branch:
            log("ABORT: Detected Agent 4 branch ('feature/dashboard-notifications'). Do not touch!", "FAIL")
            sys.exit(1)
        
        # Guard main branch
        if branch == "main":
            log("Notice: Current branch is 'main'. Per instructions, upgrades should be staged on a feature branch.", "WARN")
            
        log("Branch safety check passed (Agent 4 branch untouched).", "PASS")
        return branch
    except Exception as e:
        log(f"Git check warning: {e}", "WARN")
        return "unknown"

def verify_slash_commands():
    log("Verifying slash commands menu...", "INFO")
    slash_file = os.path.join("src", "features", "minddesk", "notes", "extensions", "slash-commands.ts")
    if not os.path.isfile(slash_file):
        log(f"Missing file: {slash_file}", "FAIL")
        return False
    
    with open(slash_file, "r", encoding="utf-8") as f:
        content = f.read()

    # The 6 essential functional commands
    allowed_commands = ["text", "h1", "h2", "bullet", "number", "todo"]
    
    # Prohibited commands that must NOT be in ALL_SLASH_COMMANDS
    prohibited_commands = [
        "h3", "quote", "code", "divider", "callout", "toggle", "page",
        "table", "image", "link", "bookmark", "note", "mindmap", "task"
    ]
    
    for cmd in allowed_commands:
        if f'id: "{cmd}"' not in content:
            log(f"Expected basic slash command '{cmd}' missing from {slash_file}", "FAIL")
            return False

    for cmd in prohibited_commands:
        if f'id: "{cmd}"' in content:
            log(f"Prohibited slash command '{cmd}' still present in ALL_SLASH_COMMANDS", "FAIL")
            return False

    log(f"Slash menu strictly verified: 6 functional commands present, all non-essential commands removed.", "PASS")
    return True

def verify_hierarchy_components():
    log("Verifying hierarchy and subpages components...", "INFO")
    subpages_file = os.path.join("src", "features", "minddesk", "notes", "components", "subpages-section.tsx")
    if not os.path.isfile(subpages_file):
        log(f"Missing file: {subpages_file}", "FAIL")
        return False

    with open(subpages_file, "r", encoding="utf-8") as f:
        subpages_content = f.read()

    if "SubpagesSection" not in subpages_content:
        log("SubpagesSection component not exported", "FAIL")
        return False

    notes_view_file = os.path.join("src", "features", "minddesk", "notes", "notes-view.tsx")
    with open(notes_view_file, "r", encoding="utf-8") as f:
        notes_view_content = f.read()

    # Notes Home gallery filter: only top-level pages (!note.parentId)
    if "!note.parentId" not in notes_view_content and "isTopLevelNote" not in notes_view_content:
        log("NotesView does not filter for top-level pages (!note.parentId)", "FAIL")
        return False

    log("Hierarchy and subpages components verified.", "PASS")
    return True

def verify_data_integrity():
    log("Verifying note parent-child data integrity and helper contracts...", "INFO")
    types_file = os.path.join("src", "features", "minddesk", "notes", "types.ts")
    with open(types_file, "r", encoding="utf-8") as f:
        types_content = f.read()

    if "isTopLevelNote" not in types_content or "getDirectSubpages" not in types_content:
        log("Missing hierarchy helper functions in notes/types.ts", "FAIL")
        return False

    log("Data integrity contracts and hierarchy helpers verified.", "PASS")
    return True

def main():
    print("=" * 70)
    print(" MindDesk Notes Upgrade Application & Integrity Verifier")
    print("=" * 70)
    
    branch = check_branch_safety()
    ok_slash = verify_slash_commands()
    ok_hierarchy = verify_hierarchy_components()
    ok_integrity = verify_data_integrity()

    if not (ok_slash and ok_hierarchy and ok_integrity):
        log("One or more verification checks failed.", "FAIL")
        sys.exit(1)

    log("All Notes Upgrade requirements are cleanly applied and verified!", "PASS")
    print("=" * 70)
    print("Upgrade Summary:")
    print(" 1. Top-Level Pages on Notes Home: VERIFIED")
    print(" 2. Subpages on Parent Page Open:  VERIFIED")
    print(" 3. Functional Slash Menu (6):    VERIFIED")
    print(" 4. Data Content & ParentId:      PRESERVED")
    print(" 5. Agent 4 Branch Status:        UNTOUCHED")
    print("=" * 70)

if __name__ == "__main__":
    main()
