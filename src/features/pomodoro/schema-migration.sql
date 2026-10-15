-- =============================================================================
-- MINDDESK RELATIONAL DATABASE MIGRATION PROPOSAL: FOCUS & POMODORO SUBSYSTEM
-- Target Database: MariaDB 10.11+ / MySQL 8.0+
-- Mode: Non-destructive, idempotent migration with foreign key safety
-- IMPORTANT: Do not execute against production without separate approval.
-- =============================================================================

-- 1. Create table for relational focus sessions
CREATE TABLE IF NOT EXISTS `focus_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `session_id` VARCHAR(64) NOT NULL,
  `block_id` VARCHAR(36) NULL,
  `block_title` VARCHAR(500) NOT NULL,
  `category_color` VARCHAR(32) NULL,
  `session_type` ENUM('focus', 'short_break', 'long_break') NOT NULL DEFAULT 'focus',
  `planned_duration_minutes` INT NOT NULL DEFAULT 25,
  `actual_duration_seconds` INT NOT NULL DEFAULT 0,
  `started_at` DATETIME(3) NOT NULL,
  `completed_at` DATETIME(3) NOT NULL,
  `is_completed` BOOLEAN NOT NULL DEFAULT TRUE,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_focus_sessions_session_token` (`workspace_id`, `session_id`, `completed_at`),
  INDEX `idx_focus_sessions_workspace` (`workspace_id`),
  INDEX `idx_focus_sessions_user` (`user_id`),
  INDEX `idx_focus_sessions_block` (`block_id`),
  INDEX `idx_focus_sessions_started_at` (`started_at`),

  CONSTRAINT `fk_focus_sessions_workspace` FOREIGN KEY (`workspace_id`)
    REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_focus_sessions_user` FOREIGN KEY (`user_id`)
    REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create table for user pomodoro preferences
CREATE TABLE IF NOT EXISTS `pomodoro_preferences` (
  `user_id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `focus_duration_minutes` INT NOT NULL DEFAULT 25,
  `short_break_duration_minutes` INT NOT NULL DEFAULT 5,
  `long_break_duration_minutes` INT NOT NULL DEFAULT 15,
  `long_break_interval` INT NOT NULL DEFAULT 4,
  `auto_start_breaks` BOOLEAN NOT NULL DEFAULT FALSE,
  `auto_start_focus` BOOLEAN NOT NULL DEFAULT FALSE,
  `sound_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `sound_volume` DOUBLE NOT NULL DEFAULT 0.7,
  `notifications_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`user_id`, `workspace_id`),
  CONSTRAINT `fk_pomodoro_pref_user` FOREIGN KEY (`user_id`)
    REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pomodoro_pref_workspace` FOREIGN KEY (`workspace_id`)
    REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ROLLBACK SCRIPT (IF NEEDED)
-- =============================================================================
-- DROP TABLE IF EXISTS `pomodoro_preferences`;
-- DROP TABLE IF EXISTS `focus_sessions`;
