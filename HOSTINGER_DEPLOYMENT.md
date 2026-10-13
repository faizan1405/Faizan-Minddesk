# MindDesk — Hostinger Node.js & MySQL Deployment Guide

This guide documents how to deploy **MindDesk** (Next.js 15 App Router, Prisma ORM, MySQL, Better Auth) from **GitHub to Hostinger** without relying on Vercel or Supabase.

---

## 1. Runtime & Version Compatibility

- **Node.js Version:** `20.x LTS` or `22.x LTS` (configured in `package.json` `"engines": { "node": ">=20.0.0" }`)
- **Framework:** Next.js `15.2.x` running in standard Node.js server mode (`next start`)
- **ORM:** Prisma `6.19.x` (`prisma-client-js`, MySQL provider)
- **Database:** Hostinger MySQL `8.0+` / MariaDB (`InnoDB`, `utf8mb4_unicode_ci`)
- **Authentication:** Better Auth `1.7.x` with server-verified MySQL sessions (`users`, `sessions`, `accounts`, `verifications`)

---

## 2. Step 1 — Create the Hostinger MySQL Database

1. Sign in to **Hostinger hPanel** and open **Databases → Management**.
2. Locate or create your MySQL database and user. On Hostinger, the database username has a distinct system-assigned suffix and differs from the database name:
   - **Database Name:** `u256504187_minddesk`
   - **Database Username:** `u256504187_u987654321_min`
   - **Database Password:** (Your assigned Hostinger MySQL user password)
3. Construct your server-side `DATABASE_URL`:
   ```env
   DATABASE_URL="mysql://u256504187_u987654321_min:YOUR_DB_PASSWORD@127.0.0.1:3306/u256504187_minddesk"
   ```
   > **Note:** When your Node.js Web App and MySQL database are hosted on the same Hostinger account, use `127.0.0.1:3306` (or `localhost:3306`). If connecting remotely from your local development machine, enable **Remote MySQL** in hPanel and use the Hostinger MySQL hostname shown in hPanel.

---

## 3. Step 2 — Apply the MySQL Schema Migration

Hostinger managed plans do not always provide interactive SSH access for running `npx prisma migrate deploy`. Two safe migration workflows are supported:

### Option A — Direct SQL Import via Hostinger phpMyAdmin (No SSH Required)

1. In **Hostinger hPanel**, go to **Databases → phpMyAdmin** and click **Enter phpMyAdmin** next to your MindDesk database (`u256504187_minddesk`).
2. Open the **Import** tab (or **SQL** tab).
3. Select and upload the production migration file from this repository:
   ```text
   prisma/migrations/20261013000000_init_mysql_schema/migration.sql
   ```
4. Click **Import / Go**.
5. Verify in the left sidebar of phpMyAdmin that all **17 tables** (`4` Better Auth tables + `13` MindDesk domain tables) have been created:
   - **Auth tables:** `users`, `sessions`, `accounts`, `verifications`
   - **Domain tables:** `profiles`, `workspaces`, `workspace_members`, `projects`, `task_lists`, `tasks`, `notes`, `note_versions`, `mind_maps`, `mind_map_nodes`, `mind_map_edges`, `entity_links`, `attachments`

### Option B — Automated Prisma CLI Migration (When SSH or Remote MySQL is Enabled)

If you have SSH access on Hostinger Cloud/VPS or Remote MySQL whitelisted from your workstation:

```bash
npm run db:migrate:deploy
```

---

## 4. Step 3 — Configure Environment Variables on Hostinger

In **Hostinger hPanel → Websites → Manage → Node.js → Environment Variables**, add the following production variables (never commit these to Git):

| Variable | Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://u256504187_u987654321_min:YOUR_PASSWORD@127.0.0.1:3306/u256504187_minddesk` |
| `BETTER_AUTH_SECRET` | Output of `openssl rand -base64 32` (at least 32 random characters) |
| `BETTER_AUTH_URL` | `https://minddesk.joinscaleflow.in` |
| `NEXT_PUBLIC_APP_URL` | `https://minddesk.joinscaleflow.in` |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `noreply@your-production-domain.com` |
| `SMTP_PASS` | Your Hostinger mailbox password |
| `SMTP_FROM` | `MindDesk <noreply@your-production-domain.com>` |

> **Security Check:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `SMTP_PASS` are strictly server-only variables. Never prefix them with `NEXT_PUBLIC_`.

---

## 5. Step 4 — Connect GitHub → Hostinger Node.js Deployment

1. Push your repository to **GitHub**.
2. In **Hostinger hPanel → Node.js** (or **Git** deployment settings):
   - **Repository:** Connect your GitHub repository and select the production branch (`main` / `master`).
   - **Node.js Version:** Select `20.x` or `22.x`.
   - **Install Command:** `npm install` (automatically runs `"postinstall": "prisma generate"`).
   - **Build Command:** `npm run build` (runs `prisma generate && next build`).
   - **Start Command:** `npm run start` (starts the Next.js production server).
3. Trigger a deployment and verify health by visiting:
   ```text
   https://your-production-domain.com/api/health
   ```
   Expected JSON response:
   ```json
   {
     "status": "ok",
     "app": "MindDesk",
     "phase": 2,
     "architecture": {
       "hosting": "Hostinger Node.js",
       "database": "MySQL (Prisma ORM)",
       "auth": "Better Auth",
       "databaseConfigured": true,
       "authConfigured": true,
       "smtpConfigured": true
     }
   }
   ```
