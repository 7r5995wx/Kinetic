CREATE TABLE workspace_activities (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(60) NOT NULL,
    description VARCHAR(500) NOT NULL,
    project_id UUID,
    task_id UUID,
    payload VARCHAR(2000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_activities_type_not_blank CHECK (length(trim(type)) > 0),
    CONSTRAINT ck_activities_description_not_blank CHECK (length(trim(description)) > 0)
);

CREATE INDEX idx_workspace_activities_ws_created ON workspace_activities(workspace_id, created_at DESC, id DESC);
CREATE INDEX idx_workspace_activities_actor ON workspace_activities(actor_id);
CREATE INDEX idx_workspace_activities_project ON workspace_activities(project_id);
CREATE INDEX idx_workspace_activities_task ON workspace_activities(task_id);
