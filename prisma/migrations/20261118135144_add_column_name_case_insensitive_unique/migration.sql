CREATE UNIQUE INDEX "BoardColumn_boardId_name_lower_key"
ON "BoardColumn" ("boardId", LOWER("name"));
