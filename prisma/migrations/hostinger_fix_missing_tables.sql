-- ============================================================================
-- MindDesk Production Repair Migration: Ensure All 13 Domain Tables Exist
-- Target: Hostinger MySQL 8.0+ / MariaDB (InnoDB, utf8mb4_unicode_ci)
-- 
-- SAFETY GUARANTEES:
-- - 100% Non-destructive: Uses CREATE TABLE IF NOT EXISTS
-- - Zero data deletion: Does NOT drop, alter, or reset existing tables or users
-- - Safe for phpMyAdmin direct SQL import
-- - Zero CHECK constraints that trigger MariaDB / MySQL parser errors
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Tasks
-- ----------------------------------------------------------------------------
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
-- 2. Notes & Note Recovery Snapshots
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
-- 3. Mind Maps, Nodes & Directed Connections
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
-- 4. Entity Links & Attachments
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
  CONSTRAINT `attachments_workspace_id_fkey`
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attachments_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
