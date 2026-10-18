CREATE TABLE task_comments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content VARCHAR(5000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_comments_content_not_blank CHECK (length(trim(content)) > 0)
);

CREATE INDEX idx_task_comments_task_created ON task_comments(task_id, created_at ASC, id ASC);
CREATE INDEX idx_task_comments_author ON task_comments(author_id);
