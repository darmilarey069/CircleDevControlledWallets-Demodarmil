CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(320),
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  circle_wallet_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_wallet_address_format
    CHECK (
      wallet_address ~ '^0x[0-9a-fA-F]{40}$'
    )
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  onchain_job_id NUMERIC(78, 0) UNIQUE,

  title VARCHAR(200) NOT NULL,
  task_description TEXT NOT NULL,

  requester_profile_id UUID NOT NULL
    REFERENCES profiles(id),

  provider_profile_id UUID NOT NULL
    REFERENCES profiles(id),

  verifier_profile_id UUID NOT NULL
    REFERENCES profiles(id),

  task_hash VARCHAR(66),
  result_description TEXT,
  result_reference TEXT,
  result_hash VARCHAR(66),

  amount NUMERIC(38, 18) NOT NULL
    CHECK (amount > 0),

  work_deadline TIMESTAMPTZ NOT NULL,
  verification_deadline TIMESTAMPTZ,
  verification_window_seconds BIGINT NOT NULL
    CHECK (verification_window_seconds > 0),

  chain_status_code SMALLINT,
  chain_status VARCHAR(32),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT jobs_task_hash_format
    CHECK (
      task_hash IS NULL OR
      task_hash ~ '^0x[0-9a-fA-F]{64}$'
    ),

  CONSTRAINT jobs_result_hash_format
    CHECK (
      result_hash IS NULL OR
      result_hash ~ '^0x[0-9a-fA-F]{64}$'
    )
);

CREATE TABLE job_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_id UUID NOT NULL
    REFERENCES jobs(id)
    ON DELETE CASCADE,

  action VARCHAR(40) NOT NULL,

  circle_transaction_id UUID NOT NULL UNIQUE,
  arc_transaction_hash VARCHAR(66),state VARCHAR(40) NOT NULL,
  explorer_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT job_transactions_action
    CHECK (
      action IN (
        'CREATE_JOB',
        'SUBMIT_RESULT',
        'APPROVE_RESULT',
        'REJECT_RESULT',
        'REFUND_EXPIRED_JOB',
        'REFUND_VERIFICATION_TIMEOUT'
      )
    ),

  CONSTRAINT job_transactions_hash_format
    CHECK (
      arc_transaction_hash IS NULL OR
      arc_transaction_hash ~ '^0x[0-9a-fA-F]{64}$'
    )
);

CREATE INDEX jobs_requester_profile_idx
  ON jobs(requester_profile_id);

CREATE INDEX jobs_provider_profile_idx
  ON jobs(provider_profile_id);

CREATE INDEX jobs_verifier_profile_idx
  ON jobs(verifier_profile_id);

CREATE INDEX jobs_onchain_job_id_idx
  ON jobs(onchain_job_id);

CREATE INDEX job_transactions_job_id_idx
  ON job_transactions(job_id);

CREATE INDEX job_transactions_state_idx
  ON job_transactions(state);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER jobs_set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER job_transactions_set_updated_at
BEFORE UPDATE ON job_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
