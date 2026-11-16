CREATE UNIQUE INDEX "Board_workspaceId_name_lower_key"
ON "Board" ("workspaceId", LOWER("name"));