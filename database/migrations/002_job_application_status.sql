ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS application_status VARCHAR(32)
NOT NULL DEFAULT 'DRAFT';

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS jobs_application_status_idx
ON jobs(application_status);
