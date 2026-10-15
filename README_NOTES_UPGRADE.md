# MindDesk Notes Upgrade Package

## Overview
This upgrade package modernizes the MindDesk Notes experience with Notion-style document hierarchy and a refined, functional slash command menu.

### Core Enhancements

1. **Top-Level Pages on Notes Home (`/notes`)**
   - The Notes Home gallery now displays only root documents (`!note.parentId`).
   - Cards with child notes display an interactive badge indicating the number of direct subpages (e.g. `2 subpages`).
   - Deeply nested subpages and grandchild documents no longer clutter the top-level gallery.

2. **Subpages Section on Parent Page Open**
   - When any parent page opens in the editor, a dedicated **Subpages** shelf appears below the document header.
   - Users can view and navigate directly to child documents.
   - Cards display nested grandchild counts (e.g. `1 nested`).
   - Includes a one-click `+ Add subpage` button and clear empty states.

3. **Functional Slash Commands Menu**
   - Refined to strictly the six essential, self-contained functional commands:
     - Text (`/text`)
     - Heading 1 (`/h1`)
     - Heading 2 (`/h2`)
     - Bulleted List (`/bullet`)
     - Numbered List (`/number`)
     - To-do List (`/todo`)
   - All other commands are removed from the visible menu, ensuring a clean, distraction-free writing experience.
   - Preserves reading and editing compatibility for existing notes containing code blocks, quotes, dividers, callouts, and tables.

4. **Data Preservation & Safety**
   - All existing note content (`content`, `excerpt`, `icon`, `coverImage`, `projectId`) is 100% preserved.
   - Parent-child relationships (`parentId`) remain completely intact.
   - Deletion supports both orphan promotion and cascade subtree deletion.

### Verification Script
Execute from repository root:
```bash
python apply_notes_upgrade.py
```
