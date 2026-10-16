package com.kinetic.foundation.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class FlywayMigrationIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void initialMigrationCreatesUsersTable() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME) = 'users' AND LOWER(COLUMN_NAME) = 'password_hash'",
                Integer.class
        );

        assertThat(count).isEqualTo(1);
    }

    @Test
    void secondMigrationCreatesWorkspaceProjectAndTaskTables() {
        for (String table : new String[]{"workspaces", "workspace_memberships", "projects", "kanban_columns", "tasks"}) {
            Integer tableCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = ?",
                    Integer.class,
                    table
            );
            assertThat(tableCount).as("Table " + table + " should exist").isEqualTo(1);
        }

        Integer versionCol = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME) = 'tasks' AND LOWER(COLUMN_NAME) = 'version'",
                Integer.class
        );
        assertThat(versionCol).isEqualTo(1);
    }
}
