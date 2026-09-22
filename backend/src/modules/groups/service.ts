import { query } from '../../db/pool';
import { ApiError } from '../../lib/errors';
import type { AuthUser } from '../../lib/jwt';
import { assertAssignmentAccess, isEnrolled, loadAssignment } from '../access';
import { loadGroups } from '../assignments/service';
import type { GroupInput } from '../assignments/schema';

async function assertMembers(
  courseId: string,
  memberIds: string[],
  leaderId: string,
): Promise<void> {
  if (!memberIds.includes(leaderId)) {
    throw ApiError.badRequest('The leader has to be a member of the group.');
  }
  for (const studentId of memberIds) {
    if (!(await isEnrolled(studentId, courseId))) {
      throw ApiError.badRequest('Everyone in a group has to be enrolled in the course.');
    }
  }
}

export async function listGroupsForAssignment(user: AuthUser, assignmentId: string) {
  const assignment = await loadAssignment(assignmentId);
  await assertAssignmentAccess(user, assignment);
  return loadGroups(assignmentId);
}

export async function createGroup(user: AuthUser, assignmentId: string, input: GroupInput) {
  const assignment = await loadAssignment(assignmentId);
  await assertAssignmentAccess(user, assignment);

  if (assignment.submissionType !== 'group') {
    throw ApiError.badRequest('That assignment is individual work, so it has no groups.');
  }

  await assertMembers(assignment.courseId, input.memberIds, input.leaderId);

  const existing = await query<{ id: string }>('SELECT id FROM groups WHERE assignment_id = $1 AND name = $2', [
    assignmentId,
    input.name,
  ]);
  if (existing.rowCount) {
    throw ApiError.conflict('There is already a group called ' + input.name + '.');
  }

  const { rows } = await query<{ id: string }>(
    'INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id',
    [assignmentId, input.name, input.leaderId],
  );
  const groupId = rows[0]?.id;
  if (!groupId) throw new Error('group insert returned no row');

  await query('INSERT INTO group_members (group_id, student_id) SELECT $1, unnest($2::uuid[])', [
    groupId,
    input.memberIds,
  ]);

  const groups = await loadGroups(assignmentId);
  return groups.find((group) => group.id === groupId) ?? null;
}

export async function setGroupLeader(user: AuthUser, groupId: string, leaderId: string) {
  const { rows } = await query<{ assignment_id: string }>(
    'SELECT assignment_id FROM groups WHERE id = $1',
    [groupId],
  );
  const group = rows[0];
  if (!group) throw ApiError.notFound('We could not find that group.');

  const assignment = await loadAssignment(group.assignment_id);
  await assertAssignmentAccess(user, assignment);

  const { rowCount } = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND student_id = $2',
    [groupId, leaderId],
  );
  if (!rowCount) {
    throw ApiError.badRequest('A group leader has to be a member of the group.');
  }

  await query('UPDATE groups SET leader_id = $2 WHERE id = $1', [groupId, leaderId]);

  const groups = await loadGroups(group.assignment_id);
  return groups.find((entry) => entry.id === groupId) ?? null;
}

export async function deleteGroup(user: AuthUser, groupId: string) {
  const { rows } = await query<{ assignment_id: string }>(
    'SELECT assignment_id FROM groups WHERE id = $1',
    [groupId],
  );
  const group = rows[0];
  if (!group) throw ApiError.notFound('We could not find that group.');

  const assignment = await loadAssignment(group.assignment_id);
  await assertAssignmentAccess(user, assignment);

  await query('DELETE FROM groups WHERE id = $1', [groupId]);
}
