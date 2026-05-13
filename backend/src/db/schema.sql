BEGIN;

-- Auto-update helper for tables with updated_at.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS roles (
  id SMALLSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasons (
  id BIGSERIAL PRIMARY KEY,
  academy_id BIGINT NOT NULL REFERENCES academies(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seasons_date_range_chk CHECK (ends_on >= starts_on),
  CONSTRAINT seasons_academy_name_unique UNIQUE (academy_id, name)
);

CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  age_min SMALLINT NULL,
  age_max SMALLINT NULL,
  capacity SMALLINT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT groups_season_name_unique UNIQUE (season_id, name),
  CONSTRAINT groups_age_min_chk CHECK (age_min IS NULL OR age_min >= 0),
  CONSTRAINT groups_age_max_chk CHECK (
    age_max IS NULL OR age_min IS NULL OR age_max >= age_min
  ),
  CONSTRAINT groups_capacity_chk CHECK (capacity IS NULL OR capacity > 0)
);

CREATE TABLE IF NOT EXISTS children (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NULL,
  gender VARCHAR(30) NULL,
  parent_name VARCHAR(150) NULL,
  parent_email VARCHAR(255) NULL,
  parent_phone VARCHAR(50) NULL,
  medical_notes TEXT NULL,
  general_notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT children_gender_chk CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')
  )
);

CREATE TABLE IF NOT EXISTS coach_groups (
  id BIGSERIAL PRIMARY KEY,
  coach_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ NULL,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT coach_groups_unassigned_after_assigned_chk CHECK (
    unassigned_at IS NULL OR unassigned_at >= assigned_at
  )
);

CREATE TABLE IF NOT EXISTS child_group_assignments (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  starts_on DATE NOT NULL,
  ends_on DATE NULL,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT child_group_assignments_date_range_chk CHECK (
    ends_on IS NULL OR ends_on >= starts_on
  )
);

CREATE TABLE IF NOT EXISTS group_social_active_days (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  day_of_week SMALLINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_social_active_days_day_of_week_chk CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT group_social_active_days_group_day_unique UNIQUE (group_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS daily_social_evaluations (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  evaluation_date DATE NOT NULL,
  coach_relation_color VARCHAR(20) NOT NULL,
  children_relation_color VARCHAR(20) NOT NULL,
  rules_color VARCHAR(20) NOT NULL,
  internal_score SMALLINT NOT NULL,
  daily_status VARCHAR(20) NOT NULL,
  external_points SMALLINT NOT NULL,
  optional_comment TEXT NULL,
  evaluated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_social_evaluations_coach_relation_color_chk CHECK (
    coach_relation_color IN ('green', 'orange', 'red')
  ),
  CONSTRAINT daily_social_evaluations_children_relation_color_chk CHECK (
    children_relation_color IN ('green', 'orange', 'red')
  ),
  CONSTRAINT daily_social_evaluations_rules_color_chk CHECK (
    rules_color IN ('green', 'orange', 'red')
  ),
  CONSTRAINT daily_social_evaluations_internal_score_chk CHECK (
    internal_score BETWEEN -3 AND 3
  ),
  CONSTRAINT daily_social_evaluations_daily_status_chk CHECK (
    daily_status IN ('green', 'orange', 'red')
  ),
  CONSTRAINT daily_social_evaluations_external_points_chk CHECK (
    external_points IN (-1, 0, 1)
  ),
  CONSTRAINT daily_social_evaluations_unique_child_group_date UNIQUE (
    child_id,
    group_id,
    evaluation_date
  )
);

CREATE TABLE IF NOT EXISTS daily_social_summaries (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  summary_date DATE NOT NULL,
  is_active_day BOOLEAN NOT NULL DEFAULT TRUE,
  number_of_children INTEGER NOT NULL DEFAULT 0,
  internal_daily_maximum INTEGER NOT NULL DEFAULT 0,
  external_daily_maximum INTEGER NOT NULL DEFAULT 0,
  daily_social_result INTEGER NOT NULL DEFAULT 0,
  green_children_count INTEGER NOT NULL DEFAULT 0,
  orange_children_count INTEGER NOT NULL DEFAULT 0,
  red_children_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_social_summaries_number_of_children_chk CHECK (number_of_children >= 0),
  CONSTRAINT daily_social_summaries_internal_daily_maximum_chk CHECK (internal_daily_maximum >= 0),
  CONSTRAINT daily_social_summaries_external_daily_maximum_chk CHECK (external_daily_maximum >= 0),
  CONSTRAINT daily_social_summaries_green_children_count_chk CHECK (green_children_count >= 0),
  CONSTRAINT daily_social_summaries_orange_children_count_chk CHECK (orange_children_count >= 0),
  CONSTRAINT daily_social_summaries_red_children_count_chk CHECK (red_children_count >= 0),
  CONSTRAINT daily_social_summaries_group_date_unique UNIQUE (group_id, summary_date)
);

CREATE TABLE IF NOT EXISTS weekly_social_summaries (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  active_days_count INTEGER NOT NULL DEFAULT 0,
  number_of_children INTEGER NOT NULL DEFAULT 0,
  weekly_maximum INTEGER NOT NULL DEFAULT 0,
  weekly_social_result INTEGER NOT NULL DEFAULT 0,
  weekly_percentage NUMERIC(6,2) NOT NULL DEFAULT 0,
  weekly_alpha_balls SMALLINT NOT NULL DEFAULT 0,
  weekly_status VARCHAR(50) NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_social_summaries_week_range_chk CHECK (week_end_date >= week_start_date),
  CONSTRAINT weekly_social_summaries_active_days_count_chk CHECK (active_days_count >= 0),
  CONSTRAINT weekly_social_summaries_number_of_children_chk CHECK (number_of_children >= 0),
  CONSTRAINT weekly_social_summaries_weekly_maximum_chk CHECK (weekly_maximum >= 0),
  CONSTRAINT weekly_social_summaries_weekly_alpha_balls_chk CHECK (
    weekly_alpha_balls BETWEEN 0 AND 10
  ),
  CONSTRAINT weekly_social_summaries_weekly_status_chk CHECK (
    weekly_status IN ('target_reached', 'target_not_reached')
  ),
  CONSTRAINT weekly_social_summaries_group_week_unique UNIQUE (group_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS questionnaire_tokens (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  token VARCHAR(128) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT questionnaire_tokens_status_chk CHECK (
    status IN ('pending', 'submitted', 'expired', 'revoked')
  ),
  CONSTRAINT questionnaire_tokens_expires_after_created_chk CHECK (
    expires_at > created_at
  ),
  CONSTRAINT questionnaire_tokens_submitted_after_created_chk CHECK (
    submitted_at IS NULL OR submitted_at >= created_at
  ),
  CONSTRAINT questionnaire_tokens_revoked_after_created_chk CHECK (
    revoked_at IS NULL OR revoked_at >= created_at
  )
);

CREATE TABLE IF NOT EXISTS comfort_zone_spheres (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comfort_zone_subspheres (
  id BIGSERIAL PRIMARY KEY,
  sphere_id BIGINT NOT NULL REFERENCES comfort_zone_spheres(id) ON DELETE RESTRICT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comfort_zone_subspheres_sphere_code_unique UNIQUE (sphere_id, code)
);

CREATE TABLE IF NOT EXISTS comfort_zone_actions (
  id BIGSERIAL PRIMARY KEY,
  sphere_id BIGINT NOT NULL REFERENCES comfort_zone_spheres(id) ON DELETE RESTRICT,
  subsphere_id BIGINT NULL REFERENCES comfort_zone_subspheres(id) ON DELETE RESTRICT,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL,
  description TEXT NULL,
  scale_type VARCHAR(50) NOT NULL DEFAULT 'standard_comfort',
  input_type VARCHAR(30) NOT NULL DEFAULT 'score',
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  has_note BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comfort_zone_actions_scale_type_chk CHECK (
    scale_type IN (
      'standard_comfort',
      'temperament',
      'emotional_sensitivity',
      'rules_tendency',
      'text_only'
    )
  ),
  CONSTRAINT comfort_zone_actions_input_type_chk CHECK (
    input_type IN ('score', 'text')
  ),
  CONSTRAINT comfort_zone_actions_text_input_scale_chk CHECK (
    input_type <> 'text' OR scale_type = 'text_only'
  )
);

CREATE TABLE IF NOT EXISTS questionnaires (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id BIGSERIAL PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL REFERENCES questionnaires(id) ON DELETE RESTRICT,
  action_id BIGINT NULL REFERENCES comfort_zone_actions(id) ON DELETE RESTRICT,
  code VARCHAR(100) NOT NULL,
  label VARCHAR(250) NOT NULL,
  help_text TEXT NULL,
  input_type VARCHAR(30) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT questionnaire_questions_unique_code_per_questionnaire UNIQUE (questionnaire_id, code),
  CONSTRAINT questionnaire_questions_input_type_chk CHECK (
    input_type IN ('score', 'text')
  )
);

CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id BIGSERIAL PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL REFERENCES questionnaires(id) ON DELETE RESTRICT,
  questionnaire_token_id BIGINT NOT NULL REFERENCES questionnaire_tokens(id) ON DELETE RESTRICT,
  child_id BIGINT NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  submitted_by_name VARCHAR(150) NULL,
  submitted_by_relation VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT questionnaire_submissions_unique_token UNIQUE (questionnaire_token_id),
  CONSTRAINT questionnaire_submissions_relation_chk CHECK (
    submitted_by_relation IN ('parent', 'guardian', 'other')
  )
);

CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES questionnaire_submissions(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questionnaire_questions(id) ON DELETE RESTRICT,
  score_value SMALLINT NULL,
  text_value TEXT NULL,
  note TEXT NULL,
  zone VARCHAR(50) NULL,
  interpretation TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT questionnaire_answers_unique_question_per_submission UNIQUE (submission_id, question_id),
  CONSTRAINT questionnaire_answers_score_range_chk CHECK (
    score_value IS NULL OR score_value BETWEEN 1 AND 10
  ),
  CONSTRAINT questionnaire_answers_zone_chk CHECK (
    zone IS NULL OR zone IN ('red', 'yellow', 'green', 'behavior_indicator', 'neutral')
  )
);

CREATE TABLE IF NOT EXISTS comfort_zone_profiles (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  source_submission_id BIGINT NOT NULL UNIQUE REFERENCES questionnaire_submissions(id) ON DELETE RESTRICT,
  completed_by_type VARCHAR(50) NOT NULL DEFAULT 'parent',
  completed_by_name VARCHAR(150) NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comfort_zone_profiles_completed_by_type_chk CHECK (
    completed_by_type IN ('parent', 'guardian', 'coach', 'admin', 'other')
  )
);

CREATE TABLE IF NOT EXISTS comfort_zone_scores (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES comfort_zone_profiles(id) ON DELETE CASCADE,
  action_id BIGINT NOT NULL REFERENCES comfort_zone_actions(id) ON DELETE RESTRICT,
  source_answer_id BIGINT NULL REFERENCES questionnaire_answers(id) ON DELETE SET NULL,
  score_value SMALLINT NOT NULL,
  zone VARCHAR(50) NOT NULL,
  interpretation TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comfort_zone_scores_unique_action_per_profile UNIQUE (profile_id, action_id),
  CONSTRAINT comfort_zone_scores_score_range_chk CHECK (score_value BETWEEN 1 AND 10),
  CONSTRAINT comfort_zone_scores_zone_chk CHECK (
    zone IN ('red', 'yellow', 'green', 'behavior_indicator', 'neutral')
  )
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(100) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_role_id_idx
  ON users (role_id);
CREATE INDEX IF NOT EXISTS users_is_active_idx
  ON users (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS academies_name_unique
  ON academies (name);
CREATE INDEX IF NOT EXISTS academies_is_active_idx
  ON academies (is_active);

CREATE INDEX IF NOT EXISTS seasons_academy_id_idx
  ON seasons (academy_id);
CREATE INDEX IF NOT EXISTS seasons_starts_on_ends_on_idx
  ON seasons (starts_on, ends_on);
CREATE INDEX IF NOT EXISTS seasons_is_active_idx
  ON seasons (is_active);

CREATE INDEX IF NOT EXISTS groups_season_id_idx
  ON groups (season_id);
CREATE INDEX IF NOT EXISTS groups_is_active_idx
  ON groups (is_active);

CREATE INDEX IF NOT EXISTS coach_groups_coach_id_idx
  ON coach_groups (coach_id);
CREATE INDEX IF NOT EXISTS coach_groups_group_id_idx
  ON coach_groups (group_id);
CREATE UNIQUE INDEX IF NOT EXISTS coach_groups_active_unique_idx
  ON coach_groups (coach_id, group_id)
  WHERE unassigned_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS coach_groups_primary_per_group_unique_idx
  ON coach_groups (group_id)
  WHERE is_primary = TRUE AND unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS children_parent_email_lower_idx
  ON children (LOWER(parent_email));
CREATE INDEX IF NOT EXISTS children_is_active_idx
  ON children (is_active);
CREATE INDEX IF NOT EXISTS children_last_name_first_name_idx
  ON children (last_name, first_name);

CREATE INDEX IF NOT EXISTS child_group_assignments_child_id_idx
  ON child_group_assignments (child_id);
CREATE INDEX IF NOT EXISTS child_group_assignments_group_id_idx
  ON child_group_assignments (group_id);
CREATE UNIQUE INDEX IF NOT EXISTS child_group_assignments_active_child_unique_idx
  ON child_group_assignments (child_id)
  WHERE ends_on IS NULL;

CREATE INDEX IF NOT EXISTS group_social_active_days_group_id_idx
  ON group_social_active_days (group_id);
CREATE INDEX IF NOT EXISTS group_social_active_days_is_active_idx
  ON group_social_active_days (is_active);

CREATE INDEX IF NOT EXISTS daily_social_evaluations_child_id_idx
  ON daily_social_evaluations (child_id);
CREATE INDEX IF NOT EXISTS daily_social_evaluations_group_id_idx
  ON daily_social_evaluations (group_id);
CREATE INDEX IF NOT EXISTS daily_social_evaluations_evaluation_date_idx
  ON daily_social_evaluations (evaluation_date);
CREATE INDEX IF NOT EXISTS daily_social_evaluations_group_date_idx
  ON daily_social_evaluations (group_id, evaluation_date);
CREATE INDEX IF NOT EXISTS daily_social_evaluations_evaluated_by_idx
  ON daily_social_evaluations (evaluated_by);
CREATE INDEX IF NOT EXISTS daily_social_evaluations_daily_status_idx
  ON daily_social_evaluations (daily_status);

CREATE INDEX IF NOT EXISTS daily_social_summaries_group_id_idx
  ON daily_social_summaries (group_id);
CREATE INDEX IF NOT EXISTS daily_social_summaries_summary_date_idx
  ON daily_social_summaries (summary_date);
CREATE INDEX IF NOT EXISTS daily_social_summaries_group_date_idx
  ON daily_social_summaries (group_id, summary_date);
CREATE INDEX IF NOT EXISTS daily_social_summaries_is_active_day_idx
  ON daily_social_summaries (is_active_day);

CREATE INDEX IF NOT EXISTS weekly_social_summaries_group_id_idx
  ON weekly_social_summaries (group_id);
CREATE INDEX IF NOT EXISTS weekly_social_summaries_week_start_date_idx
  ON weekly_social_summaries (week_start_date);
CREATE INDEX IF NOT EXISTS weekly_social_summaries_week_end_date_idx
  ON weekly_social_summaries (week_end_date);
CREATE INDEX IF NOT EXISTS weekly_social_summaries_weekly_status_idx
  ON weekly_social_summaries (weekly_status);

CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_tokens_token_unique
  ON questionnaire_tokens (token);
CREATE INDEX IF NOT EXISTS questionnaire_tokens_child_id_idx
  ON questionnaire_tokens (child_id);
CREATE INDEX IF NOT EXISTS questionnaire_tokens_status_idx
  ON questionnaire_tokens (status);
CREATE INDEX IF NOT EXISTS questionnaire_tokens_expires_at_idx
  ON questionnaire_tokens (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_tokens_pending_per_child_unique_idx
  ON questionnaire_tokens (child_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS comfort_zone_subspheres_sphere_id_idx
  ON comfort_zone_subspheres (sphere_id);
CREATE INDEX IF NOT EXISTS comfort_zone_subspheres_is_active_idx
  ON comfort_zone_subspheres (is_active);

CREATE INDEX IF NOT EXISTS comfort_zone_actions_sphere_id_idx
  ON comfort_zone_actions (sphere_id);
CREATE INDEX IF NOT EXISTS comfort_zone_actions_subsphere_id_idx
  ON comfort_zone_actions (subsphere_id);
CREATE INDEX IF NOT EXISTS comfort_zone_actions_scale_type_idx
  ON comfort_zone_actions (scale_type);
CREATE INDEX IF NOT EXISTS comfort_zone_actions_input_type_idx
  ON comfort_zone_actions (input_type);
CREATE INDEX IF NOT EXISTS comfort_zone_actions_is_active_idx
  ON comfort_zone_actions (is_active);

CREATE INDEX IF NOT EXISTS questionnaires_code_idx
  ON questionnaires (code);
CREATE INDEX IF NOT EXISTS questionnaires_is_active_idx
  ON questionnaires (is_active);

CREATE INDEX IF NOT EXISTS questionnaire_questions_questionnaire_id_idx
  ON questionnaire_questions (questionnaire_id);
CREATE INDEX IF NOT EXISTS questionnaire_questions_action_id_idx
  ON questionnaire_questions (action_id);
CREATE INDEX IF NOT EXISTS questionnaire_questions_is_active_idx
  ON questionnaire_questions (is_active);

CREATE INDEX IF NOT EXISTS questionnaire_submissions_questionnaire_id_idx
  ON questionnaire_submissions (questionnaire_id);
CREATE INDEX IF NOT EXISTS questionnaire_submissions_child_id_idx
  ON questionnaire_submissions (child_id);
CREATE INDEX IF NOT EXISTS questionnaire_submissions_submitted_at_idx
  ON questionnaire_submissions (submitted_at);

CREATE INDEX IF NOT EXISTS questionnaire_answers_submission_id_idx
  ON questionnaire_answers (submission_id);
CREATE INDEX IF NOT EXISTS questionnaire_answers_question_id_idx
  ON questionnaire_answers (question_id);
CREATE INDEX IF NOT EXISTS questionnaire_answers_zone_idx
  ON questionnaire_answers (zone);

CREATE INDEX IF NOT EXISTS comfort_zone_profiles_child_id_idx
  ON comfort_zone_profiles (child_id);
CREATE INDEX IF NOT EXISTS comfort_zone_profiles_completed_at_idx
  ON comfort_zone_profiles (completed_at);

CREATE INDEX IF NOT EXISTS comfort_zone_scores_profile_id_idx
  ON comfort_zone_scores (profile_id);
CREATE INDEX IF NOT EXISTS comfort_zone_scores_action_id_idx
  ON comfort_zone_scores (action_id);
CREATE INDEX IF NOT EXISTS comfort_zone_scores_zone_idx
  ON comfort_zone_scores (zone);

CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx
  ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_entity_id_idx
  ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON audit_logs (created_at);

DROP TRIGGER IF EXISTS users_set_updated_at_trg ON users;
CREATE TRIGGER users_set_updated_at_trg
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS academies_set_updated_at_trg ON academies;
CREATE TRIGGER academies_set_updated_at_trg
BEFORE UPDATE ON academies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS seasons_set_updated_at_trg ON seasons;
CREATE TRIGGER seasons_set_updated_at_trg
BEFORE UPDATE ON seasons
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS groups_set_updated_at_trg ON groups;
CREATE TRIGGER groups_set_updated_at_trg
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS children_set_updated_at_trg ON children;
CREATE TRIGGER children_set_updated_at_trg
BEFORE UPDATE ON children
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS group_social_active_days_set_updated_at_trg ON group_social_active_days;
CREATE TRIGGER group_social_active_days_set_updated_at_trg
BEFORE UPDATE ON group_social_active_days
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS daily_social_evaluations_set_updated_at_trg ON daily_social_evaluations;
CREATE TRIGGER daily_social_evaluations_set_updated_at_trg
BEFORE UPDATE ON daily_social_evaluations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS daily_social_summaries_set_updated_at_trg ON daily_social_summaries;
CREATE TRIGGER daily_social_summaries_set_updated_at_trg
BEFORE UPDATE ON daily_social_summaries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS weekly_social_summaries_set_updated_at_trg ON weekly_social_summaries;
CREATE TRIGGER weekly_social_summaries_set_updated_at_trg
BEFORE UPDATE ON weekly_social_summaries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS questionnaire_tokens_set_updated_at_trg ON questionnaire_tokens;
CREATE TRIGGER questionnaire_tokens_set_updated_at_trg
BEFORE UPDATE ON questionnaire_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS comfort_zone_spheres_set_updated_at_trg ON comfort_zone_spheres;
CREATE TRIGGER comfort_zone_spheres_set_updated_at_trg
BEFORE UPDATE ON comfort_zone_spheres
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS comfort_zone_subspheres_set_updated_at_trg ON comfort_zone_subspheres;
CREATE TRIGGER comfort_zone_subspheres_set_updated_at_trg
BEFORE UPDATE ON comfort_zone_subspheres
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS comfort_zone_actions_set_updated_at_trg ON comfort_zone_actions;
CREATE TRIGGER comfort_zone_actions_set_updated_at_trg
BEFORE UPDATE ON comfort_zone_actions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS questionnaires_set_updated_at_trg ON questionnaires;
CREATE TRIGGER questionnaires_set_updated_at_trg
BEFORE UPDATE ON questionnaires
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS questionnaire_questions_set_updated_at_trg ON questionnaire_questions;
CREATE TRIGGER questionnaire_questions_set_updated_at_trg
BEFORE UPDATE ON questionnaire_questions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
