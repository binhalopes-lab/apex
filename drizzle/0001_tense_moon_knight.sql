CREATE TABLE `collective_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`zeroAccidents` boolean NOT NULL DEFAULT true,
	`zeroCriticalRework` boolean NOT NULL DEFAULT true,
	`qualityApproved` boolean NOT NULL DEFAULT true,
	`deadlineMet` boolean NOT NULL DEFAULT true,
	`customerSatisfaction` boolean NOT NULL DEFAULT true,
	`collectiveScore` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collective_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `collective_metrics_cycleId_unique` UNIQUE(`cycleId`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`cpf` varchar(14),
	`position` varchar(100),
	`level` enum('N1','N2','N3','N4','N5') NOT NULL DEFAULT 'N1',
	`baseSalary` int DEFAULT 0,
	`hireDate` date,
	`department` enum('factory','field') NOT NULL DEFAULT 'factory',
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`consecutiveMonthsAtLevel` int DEFAULT 0,
	`isInBerlinda` boolean DEFAULT false,
	`berlindaStartDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`totalRevenue` int DEFAULT 0,
	`flagLevel` int DEFAULT 0,
	`flagPercentage` int DEFAULT 0,
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluation_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`cycleId` int NOT NULL,
	`evaluatorId` int NOT NULL,
	`punctuality` int NOT NULL DEFAULT 0,
	`organization` int NOT NULL DEFAULT 0,
	`productivity` int NOT NULL DEFAULT 0,
	`quality` int NOT NULL DEFAULT 0,
	`behavior` int NOT NULL DEFAULT 0,
	`totalScore` int NOT NULL DEFAULT 0,
	`lateCount` int NOT NULL DEFAULT 0,
	`isOfficial` boolean NOT NULL DEFAULT false,
	`notes` text,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` int NOT NULL,
	`minRevenue` int NOT NULL,
	`bonusPercentage` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `flags_level_unique` UNIQUE(`level`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`cycleId` int NOT NULL,
	`evaluationId` int,
	`reportedBy` int NOT NULL,
	`type` enum('rework','warning','accident','absence','other') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`description` text,
	`blocksBonus` boolean NOT NULL DEFAULT false,
	`incidentDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) NOT NULL,
	`maxScore` int NOT NULL DEFAULT 20,
	`weight` int NOT NULL DEFAULT 1,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `indicators_id` PRIMARY KEY(`id`),
	CONSTRAINT `indicators_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `promotion_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromLevel` enum('N1','N2','N3','N4') NOT NULL,
	`toLevel` enum('N2','N3','N4','N5') NOT NULL,
	`minScore` int NOT NULL,
	`consecutiveMonths` int NOT NULL DEFAULT 2,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotion_requirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`createdBy` int NOT NULL,
	`amount` int NOT NULL,
	`projectName` varchar(255),
	`description` text,
	`revenueDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','leader','captain','employee') NOT NULL DEFAULT 'employee';--> statement-breakpoint
ALTER TABLE `collective_metrics` ADD CONSTRAINT `collective_metrics_cycleId_evaluation_cycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `evaluation_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluation_cycles` ADD CONSTRAINT `evaluation_cycles_closedBy_users_id_fk` FOREIGN KEY (`closedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_cycleId_evaluation_cycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `evaluation_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_evaluatorId_users_id_fk` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_cycleId_evaluation_cycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `evaluation_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_evaluationId_evaluations_id_fk` FOREIGN KEY (`evaluationId`) REFERENCES `evaluations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_reportedBy_users_id_fk` FOREIGN KEY (`reportedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_cycleId_evaluation_cycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `evaluation_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;