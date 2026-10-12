-- ============================================================================
-- MindDesk MySQL Migration: 20261013000000_init_mysql_schema
-- Target: Hostinger MySQL 8.0+ / MariaDB (InnoDB, utf8mb4_unicode_ci)
-- Can be applied via `npx prisma migrate deploy` OR imported directly in
-- Hostinger hPanel -> phpMyAdmin -> SQL / Import tab.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Better Auth Core Tables (users, sessions, accounts, verifications)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified` BOOLEAN NOT NULL DEFAULT false,
  `image` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(36) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `sessions_token_key` (`token`),
  INDEX `idx_sessions_user` (`user_id`),
  CONSTRAINT `sessions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` VARCHAR(36) NOT NULL,
  `account_id` VARCHAR(255) NOT NULL,
  `provider_id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `access_token` TEXT NULL,
  `refresh_token` TEXT NULL,
  `id_token` TEXT NULL,
  `access_token_expires_at` DATETIME(3) NULL,
  `refresh_token_expires_at` DATETIME(3) NULL,
  `scope` TEXT NULL,
  `password` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_accounts_user` (`user_id`),
  CONSTRAINT `accounts_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `verifications` (
  `id` VARCHAR(36) NOT NULL,
  `identifier` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_verifications_identifier` (`identifier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Profiles & Workspaces (Tables 1-3 of 13 Domain Entities)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL DEFAULT '',
  `avatar_url` TEXT NULL,
  `default_workspace_id` VARCHAR(36) NULL,
  `preferences` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_profiles_default_workspace` (`default_workspace_id`),
  CONSTRAINT `profiles_id_fkey`
    FOREIGN KEY (`id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `workspaces` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `owner_id` VARCHAR(36) NOT NULL,
  `is_personal` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_workspaces_owner` (`owner_id`),
  CONSTRAINT `workspaces_owner_id_fkey`
    FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

ALTER TABLE `profiles`
  ADD CONSTRAINT `profiles_default_workspace_id_fkey`
    FOREIGN KEY (`default_workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `workspace_members` (
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `role` ENUM('owner', 'editor', 'viewer') NOT NULL DEFAULT 'owner',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`workspace_id`, `user_id`),
  INDEX `idx_workspace_members_user` (`user_id`),
  CONSTRAINT `workspace_members_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `workspace_members_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Projects (Table 4 of 13 Domain Entities)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `color` VARCHAR(32) NOT NULL DEFAULT '#6366f1',
  `icon` VARCHAR(64) NOT NULL DEFAULT 'folder',
  `status` ENUM('active', 'archived', 'completed') NOT NULL DEFAULT 'active',
  `position` DOUBLE NOT NULL DEFAULT 1000.0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_projects_id_workspace` (`id`, `workspace_id`),
  UNIQUE INDEX `uq_projects_id_user_workspace` (`id`, `user_id`, `workspace_id`),
  INDEX `idx_projects_workspace_pos` (`workspace_id`, `status`, `position`),
  INDEX `idx_projects_user` (`user_id`),
  CONSTRAINT `projects_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `projects_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. Task Lists & Tasks (Tables 5-6 of 13 Domain Entities)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `task_lists` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `project_id` VARCHAR(36) NULL,
  `name` VARCHAR(255) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `position` DOUBLE NOT NULL DEFAULT 1000.0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_task_lists_id_workspace` (`id`, `workspace_id`),
  UNIQUE INDEX `uq_task_lists_id_user_workspace` (`id`, `user_id`, `workspace_id`),
  INDEX `idx_task_lists_workspace_pos` (`workspace_id`, `position`),
  INDEX `idx_task_lists_user` (`user_id`),
  INDEX `idx_task_lists_project` (`project_id`),
  CONSTRAINT `task_lists_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_lists_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_lists_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `task_list_id` VARCHAR(36) NULL,
  `project_id` VARCHAR(36) NULL,
  `parent_task_id` VARCHAR(36) NULL,
  `recurrence_source_id` VARCHAR(36) NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  `priority` ENUM('none', 'low', 'medium', 'high') NOT NULL DEFAULT 'none',
  `due_date` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `recurrence_rule` JSON NULL,
  `position` DOUBLE NOT NULL DEFAULT 1000.0,
  `version` INT NOT NULL DEFAULT 1,
  `is_archived` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_tasks_id_workspace` (`id`, `workspace_id`),
  UNIQUE INDEX `uq_tasks_id_user_workspace` (`id`, `user_id`, `workspace_id`),
  INDEX `idx_tasks_workspace_list_pos` (`workspace_id`, `task_list_id`, `status`, `position`),
  INDEX `idx_tasks_project` (`project_id`),
  INDEX `idx_tasks_parent` (`parent_task_id`),
  INDEX `idx_tasks_due_date` (`workspace_id`, `due_date`),
  INDEX `idx_tasks_user` (`user_id`),
  FULLTEXT INDEX `idx_tasks_fts` (`title`, `description`),
  CONSTRAINT `chk_tasks_version_positive` CHECK (`version` >= 1),
  CONSTRAINT `chk_tasks_no_self_parent` CHECK (`parent_task_id` IS NULL OR `parent_task_id` <> `id`),
  CONSTRAINT `tasks_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tasks_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tasks_task_list_id_fkey`
    FOREIGN KEY (`task_list_id`) REFERENCES `task_lists`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tasks_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tasks_parent_task_id_fkey`
    FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tasks_recurrence_source_id_fkey`
    FOREIGN KEY (`recurrence_source_id`) REFERENCES `tasks`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. Notes & Note Recovery Snapshots (Tables 7-8 of 13 Domain Entities)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notes` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `project_id` VARCHAR(36) NULL,
  `parent_note_id` VARCHAR(36) NULL,
  `title` VARCHAR(500) NOT NULL DEFAULT 'Untitled Note',
  `content_json` JSON NOT NULL,
  `content_text` LONGTEXT NOT NULL,
  `is_pinned` BOOLEAN NOT NULL DEFAULT false,
  `is_archived` BOOLEAN NOT NULL DEFAULT false,
  `position` DOUBLE NOT NULL DEFAULT 1000.0,
  `version` INT NOT NULL DEFAULT 1,
  `last_saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_notes_id_workspace` (`id`, `workspace_id`),
  UNIQUE INDEX `uq_notes_id_user_workspace` (`id`, `user_id`, `workspace_id`),
  INDEX `idx_notes_workspace_updated` (`workspace_id`, `is_archived`, `is_pinned`, `updated_at`),
  INDEX `idx_notes_project` (`project_id`),
  INDEX `idx_notes_parent` (`parent_note_id`),
  INDEX `idx_notes_user` (`user_id`),
  FULLTEXT INDEX `idx_notes_fts` (`title`, `content_text`),
  CONSTRAINT `chk_notes_version_positive` CHECK (`version` >= 1),
  CONSTRAINT `chk_notes_no_self_parent` CHECK (`parent_note_id` IS NULL OR `parent_note_id` <> `id`),
  CONSTRAINT `notes_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notes_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notes_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notes_parent_note_id_fkey`
    FOREIGN KEY (`parent_note_id`) REFERENCES `notes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `note_versions` (
  `id` VARCHAR(36) NOT NULL,
  `note_id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `version` INT NOT NULL,
  `content_json` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_note_versions_note` (`note_id`, `version`),
  INDEX `idx_note_versions_workspace` (`workspace_id`),
  INDEX `idx_note_versions_user` (`user_id`),
  INDEX `idx_note_versions_same_owner` (`note_id`, `user_id`, `workspace_id`),
  CONSTRAINT `chk_note_versions_positive` CHECK (`version` >= 1),
  CONSTRAINT `note_versions_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `note_versions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_note_versions_same_owner`
    FOREIGN KEY (`note_id`, `user_id`, `workspace_id`)
    REFERENCES `notes`(`id`, `user_id`, `workspace_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. Mind Maps, First-Class Nodes & Edges (Tables 9-11 of 13 Domain Entities)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `mind_maps` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `project_id` VARCHAR(36) NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NOT NULL,
  `viewport` JSON NOT NULL,
  `position` DOUBLE NOT NULL DEFAULT 1000.0,
  `version` INT NOT NULL DEFAULT 1,
  `is_archived` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_mind_maps_id_workspace` (`id`, `workspace_id`),
  UNIQUE INDEX `uq_mind_maps_id_user_workspace` (`id`, `user_id`, `workspace_id`),
  INDEX `idx_mind_maps_workspace_updated` (`workspace_id`, `is_archived`, `updated_at`),
  INDEX `idx_mind_maps_project` (`project_id`),
  INDEX `idx_mind_maps_user` (`user_id`),
  FULLTEXT INDEX `idx_mind_maps_fts` (`title`, `description`),
  CONSTRAINT `chk_mind_maps_version_positive` CHECK (`version` >= 1),
  CONSTRAINT `mind_maps_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mind_maps_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mind_maps_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `mind_map_nodes` (
  `id` VARCHAR(36) NOT NULL,
  `mind_map_id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('idea', 'task_ref', 'note_ref', 'group') NOT NULL DEFAULT 'idea',
  `label` VARCHAR(500) NOT NULL DEFAULT 'New Idea',
  `note_excerpt` TEXT NOT NULL,
  `position_x` DOUBLE NOT NULL DEFAULT 0.0,
  `position_y` DOUBLE NOT NULL DEFAULT 0.0,
  `width` DOUBLE NULL,
  `height` DOUBLE NULL,
  `z_index` INT NOT NULL DEFAULT 0,
  `style` JSON NOT NULL,
  `data` JSON NOT NULL,
  `linked_task_id` VARCHAR(36) NULL,
  `linked_note_id` VARCHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_nodes_id_map_user_workspace` (`id`, `mind_map_id`, `user_id`, `workspace_id`),
  UNIQUE INDEX `uq_nodes_id_user_workspace` (`id`, `user_id`, `workspace_id`),
  INDEX `idx_mind_map_nodes_map` (`mind_map_id`),
  INDEX `idx_mind_map_nodes_linked_task` (`linked_task_id`),
  INDEX `idx_mind_map_nodes_linked_note` (`linked_note_id`),
  INDEX `idx_mind_map_nodes_workspace` (`workspace_id`),
  INDEX `idx_mind_map_nodes_user` (`user_id`),
  INDEX `idx_nodes_mind_map_same_owner` (`mind_map_id`, `user_id`, `workspace_id`),
  FULLTEXT INDEX `idx_mind_map_nodes_fts` (`label`, `note_excerpt`),
  CONSTRAINT `mind_map_nodes_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mind_map_nodes_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nodes_mind_map_same_owner`
    FOREIGN KEY (`mind_map_id`, `user_id`, `workspace_id`)
    REFERENCES `mind_maps`(`id`, `user_id`, `workspace_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mind_map_nodes_linked_task_id_fkey`
    FOREIGN KEY (`linked_task_id`) REFERENCES `tasks`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `mind_map_nodes_linked_note_id_fkey`
    FOREIGN KEY (`linked_note_id`) REFERENCES `notes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `mind_map_edges` (
  `id` VARCHAR(36) NOT NULL,
  `mind_map_id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `source_node_id` VARCHAR(36) NOT NULL,
  `target_node_id` VARCHAR(36) NOT NULL,
  `source_handle` VARCHAR(64) NULL,
  `target_handle` VARCHAR(64) NULL,
  `label` VARCHAR(255) NOT NULL DEFAULT '',
  `type` ENUM('default', 'smoothstep', 'bezier', 'straight') NOT NULL DEFAULT 'smoothstep',
  `animated` BOOLEAN NOT NULL DEFAULT false,
  `style` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_edges_connection` (`mind_map_id`, `source_node_id`, `target_node_id`, `source_handle`, `target_handle`),
  INDEX `idx_mind_map_edges_map` (`mind_map_id`),
  INDEX `idx_mind_map_edges_workspace` (`workspace_id`),
  INDEX `idx_mind_map_edges_user` (`user_id`),
  INDEX `idx_edges_source_same_map` (`source_node_id`, `mind_map_id`, `user_id`, `workspace_id`),
  INDEX `idx_edges_target_same_map` (`target_node_id`, `mind_map_id`, `user_id`, `workspace_id`),
  CONSTRAINT `chk_edges_no_self_loop` CHECK (`source_node_id` <> `target_node_id`),
  CONSTRAINT `mind_map_edges_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mind_map_edges_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_edges_mind_map_same_owner`
    FOREIGN KEY (`mind_map_id`, `user_id`, `workspace_id`)
    REFERENCES `mind_maps`(`id`, `user_id`, `workspace_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_edges_source_node_same_map`
    FOREIGN KEY (`source_node_id`, `mind_map_id`, `user_id`, `workspace_id`)
    REFERENCES `mind_map_nodes`(`id`, `mind_map_id`, `user_id`, `workspace_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_edges_target_node_same_map`
    FOREIGN KEY (`target_node_id`, `mind_map_id`, `user_id`, `workspace_id`)
    REFERENCES `mind_map_nodes`(`id`, `mind_map_id`, `user_id`, `workspace_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. Cross-Links & Attachments (Tables 12-13 of 13 Domain Entities)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `entity_links` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `source_type` ENUM('task', 'note', 'mind_map', 'mind_map_node') NOT NULL,
  `source_id` VARCHAR(36) NOT NULL,
  `target_type` ENUM('task', 'note', 'mind_map', 'mind_map_node') NOT NULL,
  `target_id` VARCHAR(36) NOT NULL,
  `relationship` ENUM('references', 'derived_from', 'blocks', 'related') NOT NULL DEFAULT 'references',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_entity_links_pair` (`workspace_id`, `source_type`, `source_id`, `target_type`, `target_id`),
  INDEX `idx_entity_links_source` (`workspace_id`, `source_type`, `source_id`),
  INDEX `idx_entity_links_target` (`workspace_id`, `target_type`, `target_id`),
  INDEX `idx_entity_links_user` (`user_id`),
  CONSTRAINT `chk_entity_links_no_self_link`
    CHECK (NOT (`source_type` = `target_type` AND `source_id` = `target_id`)),
  CONSTRAINT `entity_links_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `entity_links_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `attachments` (
  `id` VARCHAR(36) NOT NULL,
  `workspace_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `entity_type` ENUM('task', 'note', 'mind_map', 'mind_map_node') NOT NULL,
  `entity_id` VARCHAR(36) NOT NULL,
  `storage_path` VARCHAR(512) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(128) NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_attachments_storage_path` (`storage_path`),
  INDEX `idx_attachments_entity` (`workspace_id`, `entity_type`, `entity_id`),
  INDEX `idx_attachments_user` (`user_id`),
  CONSTRAINT `chk_attachments_size_non_negative` CHECK (`size_bytes` >= 0),
  CONSTRAINT `attachments_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attachments_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
