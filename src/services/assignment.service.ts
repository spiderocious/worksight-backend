import {
  AssignmentInstanceModel,
  AssignmentModel,
  BlockedAttemptModel,
  CandidateModel,
  IAssignment,
  IAssignmentInstance,
  ScoreModel,
  SessionModel,
  normalizeAssignment,
} from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';
import {
  AssignmentAssignDTO,
  AssignmentBulkAssignDTO,
  AssignmentCreateDTO,
  AssignmentUpdateDTO,
  InstanceUpdateDeadlineDTO,
} from '@requests/assignment.requests';

export interface InstanceWithAssignment extends IAssignmentInstance {
  assignment: IAssignment | null;
  candidate?: { id: string; name: string; email: string } | null;
}

export class AssignmentService {
  private static instance: AssignmentService;
  private constructor() {}
  static getInstance(): AssignmentService {
    if (!this.instance) this.instance = new AssignmentService();
    return this.instance;
  }

  async create(reviewerId: string, dto: AssignmentCreateDTO): Promise<ServiceResult<IAssignment>> {
    try {
      const id = generateId(16, 'as');
      const created = await AssignmentModel.create({ id, ...dto, createdBy: reviewerId });
      return new ServiceSuccess(normalizeAssignment(created.toObject() as IAssignment), MESSAGE_KEYS.ASSIGNMENT_CREATED);
    } catch (err) {
      logger.error('Assignment create failed', err);
      return new ServiceError('Create failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listForReviewer(reviewerId: string): Promise<ServiceResult<IAssignment[]>> {
    try {
      const list = await AssignmentModel.find({ createdBy: reviewerId }).sort({ createdAt: -1 }).lean();
      return new ServiceSuccess((list as IAssignment[]).map(normalizeAssignment), MESSAGE_KEYS.ASSIGNMENTS_FETCHED);
    } catch (err) {
      logger.error('Assignment list failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getOwned(reviewerId: string, id: string): Promise<ServiceResult<IAssignment>> {
    try {
      const assignment = await AssignmentModel.findOne({ id, createdBy: reviewerId }).lean();
      if (!assignment) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      return new ServiceSuccess(normalizeAssignment(assignment as IAssignment), MESSAGE_KEYS.ASSIGNMENT_FETCHED);
    } catch (err) {
      logger.error('Assignment get failed', err);
      return new ServiceError('Get failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(reviewerId: string, id: string, dto: AssignmentUpdateDTO): Promise<ServiceResult<IAssignment>> {
    try {
      // Note: edits are intentionally NOT locked when instances exist. The
      // data model joins live — there's no per-instance snapshot of brief /
      // title / submissionType — so an edit propagates to anyone whose
      // instance is still active. The reviewer UI surfaces a banner with the
      // blast radius before they save. Sessions snapshot `durationMinutes`
      // into `expiresAt` at start time, so in-progress timers are unaffected
      // by duration changes; only future starts use the new value. Delete is
      // still locked separately (see `delete()` below).
      const updated = await AssignmentModel.findOneAndUpdate(
        { id, createdBy: reviewerId },
        { $set: dto },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      return new ServiceSuccess(normalizeAssignment(updated as IAssignment), MESSAGE_KEYS.ASSIGNMENT_UPDATED);
    } catch (err) {
      logger.error('Assignment update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async delete(reviewerId: string, id: string): Promise<ServiceResult<{ ok: true }>> {
    try {
      const started = await AssignmentInstanceModel.findOne({
        assignmentId: id,
        status: { $in: ['in_progress', 'submitted', 'scored'] },
      }).lean();
      if (started) return new ServiceError('Locked', MESSAGE_KEYS.ASSIGNMENT_LOCKED);
      const result = await AssignmentModel.deleteOne({ id, createdBy: reviewerId });
      if (result.deletedCount === 0) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      await AssignmentInstanceModel.deleteMany({ assignmentId: id, status: 'pending' });
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.ASSIGNMENT_DELETED);
    } catch (err) {
      logger.error('Assignment delete failed', err);
      return new ServiceError('Delete failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async assignToCandidate(
    reviewerId: string,
    assignmentId: string,
    dto: AssignmentAssignDTO
  ): Promise<ServiceResult<IAssignmentInstance>> {
    try {
      const assignment = await AssignmentModel.findOne({ id: assignmentId, createdBy: reviewerId }).lean();
      if (!assignment) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      const candidate = await CandidateModel.findOne({ id: dto.candidateId, reviewerId }).lean();
      if (!candidate) return new ServiceError('Candidate not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      const id = generateId(16, 'in');
      const created = await AssignmentInstanceModel.create({
        id,
        assignmentId,
        candidateId: candidate.id,
        reviewerId,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: 'pending',
      });
      return new ServiceSuccess(created.toObject() as IAssignmentInstance, MESSAGE_KEYS.ASSIGNMENT_ASSIGNED);
    } catch (err) {
      logger.error('Assign to candidate failed', err);
      return new ServiceError('Assign failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Bulk assignment: each assignment in the body has its own deadline, and
   * every chosen candidate gets every chosen assignment with that
   * assignment's deadline. So 3 candidates × 3 assignments = 9 instances,
   * with 3 distinct deadlines.
   *
   * Ownership is enforced by reviewerId on both sides — silently drops any
   * assignment or candidate the reviewer doesn't own (which means the body
   * was tampered with; we don't surface those as errors). Skips combinations
   * the candidate already has (any status other than 'pending' too — we don't
   * stomp completed work).
   */
  async bulkAssign(
    reviewerId: string,
    dto: AssignmentBulkAssignDTO
  ): Promise<
    ServiceResult<{
      created: number;
      skipped: number;
      instances: IAssignmentInstance[];
    }>
  > {
    try {
      const assignmentIds = Array.from(new Set(dto.assignments.map((a) => a.assignmentId)));
      const candidateIds = Array.from(new Set(dto.candidateIds));

      // Filter to only assignments + candidates this reviewer actually owns.
      const [ownedAssignments, ownedCandidates] = await Promise.all([
        AssignmentModel.find({ id: { $in: assignmentIds }, createdBy: reviewerId })
          .select('id')
          .lean(),
        CandidateModel.find({ id: { $in: candidateIds }, reviewerId, isActive: true })
          .select('id')
          .lean(),
      ]);
      const ownedAssignmentIds = new Set(ownedAssignments.map((a) => a.id));
      const ownedCandidateIds = new Set(ownedCandidates.map((c) => c.id));

      // Map assignmentId → deadline (preserve nulls).
      const deadlineByAssignment = new Map<string, Date | null>();
      for (const a of dto.assignments) {
        if (!ownedAssignmentIds.has(a.assignmentId)) continue;
        deadlineByAssignment.set(
          a.assignmentId,
          a.deadline ? new Date(a.deadline) : null
        );
      }

      // Find existing instances so we don't create duplicates. Any existing
      // instance for the same (candidate, assignment) pair counts as a skip,
      // regardless of status — we don't want to start a fresh pending one
      // when the candidate already submitted, scored, or is mid-session.
      const existing = await AssignmentInstanceModel.find({
        reviewerId,
        candidateId: { $in: [...ownedCandidateIds] },
        assignmentId: { $in: [...ownedAssignmentIds] },
      })
        .select('candidateId assignmentId')
        .lean();
      const existingPairs = new Set(
        existing.map((e) => `${e.candidateId}::${e.assignmentId}`)
      );

      // Build the cartesian product, skipping owned-but-already-assigned pairs.
      const docsToInsert: Array<Partial<IAssignmentInstance>> = [];
      let skipped = 0;
      for (const candidateId of ownedCandidateIds) {
        for (const assignmentId of ownedAssignmentIds) {
          const key = `${candidateId}::${assignmentId}`;
          if (existingPairs.has(key)) {
            skipped += 1;
            continue;
          }
          docsToInsert.push({
            id: generateId(16, 'in'),
            assignmentId,
            candidateId,
            reviewerId,
            deadline: deadlineByAssignment.get(assignmentId) ?? null,
            status: 'pending',
          });
        }
      }

      // Also count requested-but-not-owned combos as skipped, so the UI
      // can show a meaningful "X created, Y skipped" summary.
      const requestedCombos = assignmentIds.length * candidateIds.length;
      const ownedCombos = ownedAssignmentIds.size * ownedCandidateIds.size;
      skipped += requestedCombos - ownedCombos;

      let created: IAssignmentInstance[] = [];
      if (docsToInsert.length > 0) {
        const inserted = await AssignmentInstanceModel.insertMany(docsToInsert);
        created = inserted.map((d) => d.toObject()) as IAssignmentInstance[];
      }

      return new ServiceSuccess(
        { created: created.length, skipped, instances: created },
        MESSAGE_KEYS.ASSIGNMENTS_BULK_ASSIGNED
      );
    } catch (err) {
      logger.error('Bulk assign failed', err);
      return new ServiceError('Bulk assign failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Reviewer-side: update an existing instance's deadline. Allowed while the
   * instance is still actionable (pending / in_progress / submitted). Terminal
   * states (scored, closed) are rejected — scored work shouldn't be re-opened
   * by silently extending its deadline, and a closed instance is closed.
   *
   * Passing `deadline: null` explicitly clears the deadline (turns it into an
   * open-ended assignment). Passing a past date is rejected — we don't want
   * to force-close via deadline edits; that's a separate concern.
   */
  async updateInstanceDeadline(
    reviewerId: string,
    instanceId: string,
    dto: InstanceUpdateDeadlineDTO
  ): Promise<ServiceResult<IAssignmentInstance>> {
    try {
      const instance = await AssignmentInstanceModel.findOne({ id: instanceId, reviewerId }).lean();
      if (!instance) return new ServiceError('Not found', MESSAGE_KEYS.INSTANCE_NOT_FOUND);
      if (instance.status === 'scored' || instance.status === 'closed') {
        return new ServiceError('Not editable', MESSAGE_KEYS.INSTANCE_NOT_EDITABLE);
      }
      const nextDeadline = dto.deadline ? new Date(dto.deadline) : null;
      if (nextDeadline && nextDeadline.getTime() <= Date.now()) {
        return new ServiceError('Past deadline', MESSAGE_KEYS.INSTANCE_DEADLINE_IN_PAST);
      }
      const updated = await AssignmentInstanceModel.findOneAndUpdate(
        { id: instanceId, reviewerId },
        { $set: { deadline: nextDeadline } },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.INSTANCE_NOT_FOUND);
      return new ServiceSuccess(updated as IAssignmentInstance, MESSAGE_KEYS.INSTANCE_UPDATED);
    } catch (err) {
      logger.error('Instance deadline update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Reviewer-side: remove a single assigned-instance from a candidate.
   *
   * Semantics by status (the UI surfaces the right copy per status, but this
   * method enforces the contract regardless of how the request arrived):
   *
   *  - pending      → revoke. No session exists; just drop the row.
   *  - in_progress  → blocked. Don't yank an active attempt out from under a
   *                   candidate; the reviewer should let it finish (or close
   *                   it via the deadline sweeper) before removing.
   *  - submitted    → discard submission. Delete session + blocked attempts.
   *                   No score yet by definition.
   *  - closed       → clean up. No session.
   *  - scored       → requires `force=true`. We also remove the score, since
   *                   the score's sessionId points at a session we're about
   *                   to delete, and orphaning it would be worse than the
   *                   destructive intent the reviewer just confirmed.
   *
   * Files (screenshots) are intentionally NOT cleaned up from the file
   * service here. The file service has no DELETE endpoint today — the
   * sessions-on-assignment-delete path already leaks them, and this matches
   * that behavior. Tracked separately.
   */
  async deleteInstance(
    reviewerId: string,
    instanceId: string,
    opts: { force?: boolean } = {}
  ): Promise<
    ServiceResult<{
      ok: true;
      deleted: {
        instance: string;
        session: string | null;
        score: string | null;
        blockedAttempts: number;
      };
    }>
  > {
    try {
      const instance = await AssignmentInstanceModel.findOne({ id: instanceId, reviewerId }).lean();
      if (!instance) return new ServiceError('Not found', MESSAGE_KEYS.INSTANCE_NOT_FOUND);

      if (instance.status === 'in_progress') {
        return new ServiceError('In progress', MESSAGE_KEYS.INSTANCE_IN_PROGRESS_BLOCKED);
      }
      if (instance.status === 'scored' && !opts.force) {
        return new ServiceError('Scored needs force', MESSAGE_KEYS.INSTANCE_SCORED_NEEDS_FORCE);
      }

      // Sessions are 1:1 with instances in practice (only one in_progress per
      // candidate at a time, and we never re-create sessions for the same
      // instance). Use findOne defensively anyway.
      const session = await SessionModel.findOne({ instanceId: instance.id, reviewerId }).lean();

      let deletedScore: string | null = null;
      let deletedBlockedAttempts = 0;
      const sessionId = session?.id ?? null;

      if (session) {
        // Score & blocked attempts both reference sessionId.
        const score = await ScoreModel.findOne({ sessionId: session.id }).lean();
        if (score) {
          await ScoreModel.deleteOne({ id: score.id });
          deletedScore = score.id;
        }
        const attemptsResult = await BlockedAttemptModel.deleteMany({ sessionId: session.id });
        deletedBlockedAttempts = attemptsResult.deletedCount ?? 0;
        await SessionModel.deleteOne({ id: session.id });
      }

      // Delete the instance last — so a mid-cascade failure leaves the system
      // with no orphaned dependent rows pointing at a deleted instance. Worst
      // case: instance still exists but its session is gone, which a retry
      // resolves (deleteOne on missing session is a no-op).
      await AssignmentInstanceModel.deleteOne({ id: instance.id, reviewerId });

      return new ServiceSuccess(
        {
          ok: true as const,
          deleted: {
            instance: instance.id,
            session: sessionId,
            score: deletedScore,
            blockedAttempts: deletedBlockedAttempts,
          },
        },
        MESSAGE_KEYS.INSTANCE_DELETED
      );
    } catch (err) {
      logger.error('Delete instance failed', err);
      return new ServiceError('Delete failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listInstancesForReviewer(
    reviewerId: string,
    filter: { candidateId?: string; status?: string } = {}
  ): Promise<ServiceResult<InstanceWithAssignment[]>> {
    try {
      const q: Record<string, unknown> = { reviewerId };
      if (filter.candidateId) q.candidateId = filter.candidateId;
      if (filter.status) q.status = filter.status;
      const instances = await AssignmentInstanceModel.find(q).sort({ createdAt: -1 }).lean();
      const aIds = Array.from(new Set(instances.map((i) => i.assignmentId)));
      const cIds = Array.from(new Set(instances.map((i) => i.candidateId)));
      const [assignments, candidates] = await Promise.all([
        AssignmentModel.find({ id: { $in: aIds } }).lean(),
        CandidateModel.find({ id: { $in: cIds } }).lean(),
      ]);
      const aMap = new Map(assignments.map((a) => [a.id, normalizeAssignment(a as IAssignment)]));
      const cMap = new Map(
        candidates.map((c) => [c.id, { id: c.id, name: c.name, email: c.email }])
      );
      const result: InstanceWithAssignment[] = instances.map((i) => ({
        ...(i as IAssignmentInstance),
        assignment: aMap.get(i.assignmentId) ?? null,
        candidate: cMap.get(i.candidateId) ?? null,
      }));
      return new ServiceSuccess(result, MESSAGE_KEYS.INSTANCES_FETCHED);
    } catch (err) {
      logger.error('Instance list failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const assignmentService = AssignmentService.getInstance();
