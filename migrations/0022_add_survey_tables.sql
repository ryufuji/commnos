-- 0022_add_survey_tables.sql
-- アンケート機能の追加

-- surveysテーブル（アンケート定義）
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('join', 'leave')),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_surveys_tenant ON surveys(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(tenant_id, type, is_active);

-- survey_questionsテーブル（質問）
CREATE TABLE IF NOT EXISTS survey_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK(question_type IN ('text', 'textarea', 'radio', 'checkbox', 'scale')),
  question_text TEXT NOT NULL,
  options TEXT,
  scale_min INTEGER,
  scale_max INTEGER,
  is_required BOOLEAN DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id, display_order);

-- survey_responsesテーブル（回答）
CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  response_type TEXT NOT NULL CHECK(response_type IN ('join', 'leave')),
  answer TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted ON survey_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_type ON survey_responses(response_type, tenant_id);
