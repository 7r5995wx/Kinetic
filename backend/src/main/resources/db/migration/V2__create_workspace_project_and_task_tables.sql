CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_workspaces_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE TABLE workspace_memberships (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_memberships_user_workspace ON workspace_memberships(user_id, workspace_id);

CREATE TABLE projects (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(2000),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_projects_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_projects_workspace_created ON projects(workspace_id, created_at DESC);

CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, position),
    CONSTRAINT ck_columns_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_kanban_columns_project_position ON kanban_columns(project_id, position);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(5000),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    assignee_id UUID REFERENCES users(id),
    due_date DATE,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_by UUID NOT NULL REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_tasks_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX idx_tasks_project_column_position ON tasks(project_id, column_id, position);
CREATE INDEX idx_tasks_column_position ON tasks(column_id, position);
CREATE INDEX idx_tasks_project_assignee_due ON tasks(project_id, assignee_id, due_date);
