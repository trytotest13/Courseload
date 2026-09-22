-- Runs once, on the first start of an empty postgres volume.
-- The test suite talks to portal_test so it never touches the seeded portal database.
CREATE DATABASE portal_test;
