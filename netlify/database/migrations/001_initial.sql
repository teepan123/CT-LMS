CREATE TABLE IF NOT EXISTS classrooms (
 id uuid PRIMARY KEY, name text NOT NULL, code text UNIQUE NOT NULL,
 rewards_enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, login text UNIQUE NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('student','teacher','admin')),
 class_id uuid REFERENCES classrooms(id), alias text NOT NULL,
 avatar text NOT NULL DEFAULT 'fox' CHECK(avatar IN ('fox','rabbit','bear')),
 CHECK(role <> 'student' OR class_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS teacher_classes (user_id uuid REFERENCES users(id), class_id uuid REFERENCES classrooms(id), PRIMARY KEY(user_id,class_id));
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS login_limits (bucket text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS content_versions (id text PRIMARY KEY, catalog jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS enrollments (user_id uuid PRIMARY KEY REFERENCES users(id), version text NOT NULL REFERENCES content_versions(id));
CREATE TABLE IF NOT EXISTS assignments (class_id uuid REFERENCES classrooms(id), skill text NOT NULL CHECK(skill IN ('decomposition','pattern','abstraction','algorithm')), enabled boolean NOT NULL DEFAULT true, PRIMARY KEY(class_id,skill));
CREATE TABLE IF NOT EXISTS attempts (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
 version text NOT NULL REFERENCES content_versions(id), skill text,
 kind text NOT NULL CHECK(kind IN ('diagnostic','game','guided','independent','quiz','reflection','final_draft','final','course_reflection')),
 payload jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS attempts_student ON attempts(user_id,created_at);
CREATE TABLE IF NOT EXISTS assessment_locks (user_id uuid PRIMARY KEY REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS hints (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
 skill text NOT NULL, version text NOT NULL REFERENCES content_versions(id), stage text NOT NULL,
 action text NOT NULL, level integer NOT NULL CHECK(level BETWEEN 1 AND 3),
 input text NOT NULL, response text NOT NULL, source text NOT NULL CHECK(source IN ('prepared','live')),
 after_attempt_id uuid REFERENCES attempts(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS hint_revisions (hint_id uuid REFERENCES hints(id), attempt_id uuid REFERENCES attempts(id), PRIMARY KEY(hint_id,attempt_id));
CREATE TABLE IF NOT EXISTS reviews (
 id uuid PRIMARY KEY, submission_id uuid NOT NULL REFERENCES attempts(id), teacher_id uuid NOT NULL REFERENCES users(id),
 request_id uuid NOT NULL, rubric jsonb NOT NULL, feedback text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(teacher_id,request_id)
);
CREATE INDEX IF NOT EXISTS reviews_submission ON reviews(submission_id,created_at);
