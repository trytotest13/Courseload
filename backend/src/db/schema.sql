-- Schema for the assignment portal. Safe to run more than once.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'professor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_type') THEN
    CREATE TYPE submission_type AS ENUM ('individual', 'group');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    CREATE TYPE submission_status AS ENUM ('submitted', 'acknowledged');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          user_role NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  professor_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  accent       text NOT NULL DEFAULT 'teal',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  due_at          timestamptz NOT NULL,
  submission_type submission_type NOT NULL DEFAULT 'individual',
  max_points      integer NOT NULL DEFAULT 100 CHECK (max_points > 0),
  created_by      uuid NOT NULL REFERENCES users (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  name          text NOT NULL,
  leader_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, name)
);

CREATE TABLE IF NOT EXISTS group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);

-- One row per individual student, or one shared row per group.
-- The check constraint keeps those two worlds from mixing in a single row.
CREATE TABLE IF NOT EXISTS submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  student_id      uuid REFERENCES users (id) ON DELETE CASCADE,
  group_id        uuid REFERENCES groups (id) ON DELETE CASCADE,
  content         text NOT NULL DEFAULT '',
  link_url        text,
  status          submission_status NOT NULL DEFAULT 'submitted',
  is_late         boolean NOT NULL DEFAULT false,
  submitted_at    timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users (id) ON DELETE SET NULL,
  grade           integer,
  feedback        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_owner CHECK (
    (student_id IS NOT NULL AND group_id IS NULL)
    OR (student_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS submissions_individual_key
  ON submissions (assignment_id, student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS submissions_group_key
  ON submissions (assignment_id, group_id) WHERE group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE,
  submission_id uuid REFERENCES submissions (id) ON DELETE CASCADE,
  action        text NOT NULL,
  summary       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrollments_student_idx ON enrollments (student_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments (course_id);
CREATE INDEX IF NOT EXISTS assignments_course_idx ON assignments (course_id, due_at);
CREATE INDEX IF NOT EXISTS submissions_assignment_status_idx ON submissions (assignment_id, status);
CREATE INDEX IF NOT EXISTS group_members_student_idx ON group_members (student_id);
CREATE INDEX IF NOT EXISTS activities_assignment_idx ON activities (assignment_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assignments_touch_updated_at ON assignments;
CREATE TRIGGER assignments_touch_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS submissions_touch_updated_at ON submissions;
CREATE TRIGGER submissions_touch_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
