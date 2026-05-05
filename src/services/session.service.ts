import {
  AssignmentInstanceModel,
  AssignmentModel,
  BlockedAttemptModel,
  CandidateModel,
  IAssignment,
  IAssignmentInstance,
  IBlockedAttempt,
  ISession,
  IScreenshotRef,
  SessionModel,
  normalizeAssignment,
} from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';
import {
  SessionBlockedAttemptDTO,
  SessionScreenshotDTO,
  SessionStartDTO,
  SessionSubmitDTO,
} from '@requests/session.requests';

interface StartedSession {
  sessionId: string;
  startedAt: Date;
  expiresAt: Date;
  durationMinutes: number;
  screenshotIntervalSeconds: { min: number; max: number };
  showScreenshotWarning: boolean;
}

interface SessionDetail extends ISession {
  assignment: IAssignment | null;
  instance: IAssignmentInstance | null;
  candidate?: { id: string; name: string; email: string } | null;
  blockedAttempts: IBlockedAttempt[];
}

export class SessionService {
  private static instance: SessionService;
  private constructor() {}
  static getInstance(): SessionService {
    if (!this.instance) this.instance = new SessionService();
    return this.instance;
  }

  async start(candidateId: string, dto: SessionStartDTO): Promise<ServiceResult<StartedSession>> {
    try {
      const candidate = await CandidateModel.findOne({ id: candidateId }).lean();
      if (!candidate) return new ServiceError('Not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      if (!candidate.isActive) return new ServiceError('Inactive', MESSAGE_KEYS.CANDIDATE_INACTIVE);

      const active = await SessionModel.findOne({ candidateId, status: 'in_progress' }).lean();
      if (active) {
        // If it's expired, sweep it before rejecting.
        if (active.expiresAt.getTime() < Date.now()) {
          await this.autoCloseSession(active.id);
        } else {
          return new ServiceError('Already active', MESSAGE_KEYS.SESSION_ALREADY_ACTIVE);
        }
      }

      const instance = await AssignmentInstanceModel.findOne({ id: dto.instanceId, candidateId }).lean();
      if (!instance) return new ServiceError('Not found', MESSAGE_KEYS.INSTANCE_NOT_FOUND);
      if (instance.status === 'closed') {
        return new ServiceError('Closed', MESSAGE_KEYS.INSTANCE_CLOSED);
      }
      if (instance.status !== 'pending') return new ServiceError('Not pending', MESSAGE_KEYS.INSTANCE_NOT_PENDING);

      // Honor the reviewer's deadline. If we're already past it, close the
      // instance now and reject the start. The 30s sweeper would do this
      // eventually, but we check inline so the candidate gets immediate feedback
      // instead of "you have 0 seconds to start" → start → instant expire.
      if (instance.deadline && instance.deadline.getTime() <= Date.now()) {
        await AssignmentInstanceModel.updateOne(
          { id: instance.id, status: 'pending' },
          { $set: { status: 'closed' } }
        );
        return new ServiceError('Past deadline', MESSAGE_KEYS.INSTANCE_PAST_DEADLINE);
      }

      const assignment = await AssignmentModel.findOne({ id: instance.assignmentId }).lean();
      if (!assignment) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + assignment.durationMinutes * 60 * 1000);
      const id = generateId(16, 'ss');

      await SessionModel.create({
        id,
        instanceId: instance.id,
        candidateId,
        reviewerId: instance.reviewerId,
        startedAt,
        expiresAt,
        status: 'in_progress',
        screenshots: [],
        autoClosed: false,
      });
      await AssignmentInstanceModel.updateOne({ id: instance.id }, { $set: { status: 'in_progress' } });

      // Pull reviewer-controlled settings so the Electron app knows how often
      // to capture screenshots and whether to show the warning.
      const { reviewerSettingsService } = await import('./reviewer-settings.service');
      const settings = await reviewerSettingsService.getOrCreate(instance.reviewerId);

      return new ServiceSuccess(
        {
          sessionId: id,
          startedAt,
          expiresAt,
          durationMinutes: assignment.durationMinutes,
          screenshotIntervalSeconds: settings.screenshotIntervalSeconds,
          showScreenshotWarning: settings.showScreenshotWarning,
        },
        MESSAGE_KEYS.SESSION_STARTED
      );
    } catch (err) {
      logger.error('Session start failed', err);
      return new ServiceError('Start failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async registerScreenshot(
    candidateId: string,
    sessionId: string,
    dto: SessionScreenshotDTO
  ): Promise<ServiceResult<{ ok: true }>> {
    try {
      const session = await SessionModel.findOne({ id: sessionId, candidateId }).lean();
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      if (session.status !== 'in_progress') return new ServiceError('Not active', MESSAGE_KEYS.SESSION_NOT_ACTIVE);
      if (session.expiresAt.getTime() < Date.now()) {
        await this.autoCloseSession(session.id);
        return new ServiceError('Expired', MESSAGE_KEYS.SESSION_EXPIRED);
      }
      const ref: IScreenshotRef = { key: dto.key, capturedAt: new Date(dto.capturedAt) };
      await SessionModel.updateOne({ id: sessionId }, { $push: { screenshots: ref } });
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.SCREENSHOT_REGISTERED);
    } catch (err) {
      logger.error('Screenshot register failed', err);
      return new ServiceError('Register failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async submit(
    candidateId: string,
    sessionId: string,
    dto: SessionSubmitDTO
  ): Promise<ServiceResult<{ ok: true }>> {
    try {
      const session = await SessionModel.findOne({ id: sessionId, candidateId });
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      if (session.status !== 'in_progress') {
        // If autoClosed already, reject the submission per PRD.
        if (session.autoClosed) return new ServiceError('Expired', MESSAGE_KEYS.SESSION_EXPIRED);
        return new ServiceError('Not active', MESSAGE_KEYS.SESSION_NOT_ACTIVE);
      }
      const now = new Date();
      const wasExpired = session.expiresAt.getTime() < now.getTime();
      session.endedAt = now;
      session.durationSeconds = Math.round((now.getTime() - session.startedAt.getTime()) / 1000);
      session.submissionContent = dto.submissionContent ?? null;
      session.submissionLink = dto.submissionLink ?? null;
      session.terminationClean = !wasExpired && dto.terminationClean === true;
      session.autoClosed = false;
      session.status = 'submitted';
      await session.save();
      await AssignmentInstanceModel.updateOne({ id: session.instanceId }, { $set: { status: 'submitted' } });
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.SESSION_SUBMITTED);
    } catch (err) {
      logger.error('Session submit failed', err);
      return new ServiceError('Submit failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async reportAbnormal(candidateId: string, sessionId: string): Promise<ServiceResult<{ ok: true }>> {
    try {
      const session = await SessionModel.findOne({ id: sessionId, candidateId });
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      // Just flag the next clean submit as not-clean; persistent flag lives on the session record.
      session.terminationClean = false;
      await session.save();
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.ABNORMAL_REPORTED);
    } catch (err) {
      logger.error('Abnormal report failed', err);
      return new ServiceError('Report failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getOwnedSession(
    candidateId: string,
    sessionId: string
  ): Promise<ServiceResult<ISession>> {
    try {
      await this.lazyAutoClose(sessionId);
      const session = await SessionModel.findOne({ id: sessionId, candidateId }).lean();
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      return new ServiceSuccess(session as ISession, MESSAGE_KEYS.SESSION_FETCHED);
    } catch (err) {
      logger.error('Session fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getReviewerSession(reviewerId: string, sessionId: string): Promise<ServiceResult<SessionDetail>> {
    try {
      await this.lazyAutoClose(sessionId);
      const session = await SessionModel.findOne({ id: sessionId, reviewerId }).lean();
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      const [instance, candidate, blockedAttempts] = await Promise.all([
        AssignmentInstanceModel.findOne({ id: session.instanceId }).lean(),
        CandidateModel.findOne({ id: session.candidateId }).lean(),
        BlockedAttemptModel.find({ sessionId: session.id }).sort({ attemptedAt: 1 }).lean(),
      ]);
      const assignment = instance
        ? await AssignmentModel.findOne({ id: instance.assignmentId }).lean()
        : null;
      return new ServiceSuccess(
        {
          ...(session as ISession),
          assignment: normalizeAssignment((assignment as IAssignment | null) ?? null),
          instance: (instance as IAssignmentInstance | null) ?? null,
          candidate: candidate
            ? { id: candidate.id, name: candidate.name, email: candidate.email }
            : null,
          blockedAttempts: blockedAttempts as IBlockedAttempt[],
        },
        MESSAGE_KEYS.SESSION_FETCHED
      );
    } catch (err) {
      logger.error('Reviewer session fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Records that the candidate's machine tried to reach a blocked domain.
   * Called by the Electron app when its localhost listener catches a TLS or
   * HTTP attempt to a blocked host. The screenshot key is captured at the
   * same moment via the screenshot loop.
   */
  async recordBlockedAttempt(
    candidateId: string,
    sessionId: string,
    dto: SessionBlockedAttemptDTO
  ): Promise<ServiceResult<{ ok: true }>> {
    try {
      const session = await SessionModel.findOne({ id: sessionId, candidateId }).lean();
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      // Allow recording even slightly after expiry — the Electron app may have
      // captured the attempt right before the timer fired locally. We just
      // need it to belong to a session that exists.
      const id = generateId(16, 'ba');
      await BlockedAttemptModel.create({
        id,
        sessionId,
        candidateId,
        reviewerId: session.reviewerId,
        domain: dto.domain,
        attemptedAt: new Date(dto.attemptedAt),
        screenshotKey: dto.screenshotKey ?? null,
      });
      return new ServiceSuccess({ ok: true }, MESSAGE_KEYS.BLOCKED_ATTEMPT_RECORDED);
    } catch (err) {
      logger.error('Blocked attempt record failed', err);
      return new ServiceError('Record failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  // ----- Sweeper / auto-close -----

  private async autoCloseSession(sessionId: string): Promise<void> {
    const session = await SessionModel.findOne({ id: sessionId });
    if (!session) return;
    if (session.status !== 'in_progress') return;
    session.status = 'submitted';
    session.endedAt = session.expiresAt;
    session.durationSeconds = Math.round(
      (session.expiresAt.getTime() - session.startedAt.getTime()) / 1000
    );
    session.terminationClean = false;
    session.autoClosed = true;
    await session.save();
    await AssignmentInstanceModel.updateOne({ id: session.instanceId }, { $set: { status: 'submitted' } });
    logger.info('Auto-closed session', { sessionId });
  }

  async lazyAutoClose(sessionId: string): Promise<void> {
    const session = await SessionModel.findOne({ id: sessionId }).lean();
    if (!session) return;
    if (session.status === 'in_progress' && session.expiresAt.getTime() < Date.now()) {
      await this.autoCloseSession(session.id);
    }
  }

  async sweepCandidate(candidateId: string): Promise<void> {
    // Two parallel sweeps for one candidate: in-progress sessions past expiry,
    // and pending instances past their deadline.
    const now = new Date();
    const [expiredSessions, expiredInstances] = await Promise.all([
      SessionModel.find({ candidateId, status: 'in_progress', expiresAt: { $lt: now } }).lean(),
      AssignmentInstanceModel.find({
        candidateId,
        status: 'pending',
        deadline: { $ne: null, $lt: now },
      }).lean(),
    ]);
    for (const s of expiredSessions) await this.autoCloseSession(s.id);
    if (expiredInstances.length > 0) {
      await AssignmentInstanceModel.updateMany(
        { id: { $in: expiredInstances.map((i) => i.id) }, status: 'pending' },
        { $set: { status: 'closed' } }
      );
    }
  }

  async sweepAll(): Promise<{ sessions: number; instances: number }> {
    const now = new Date();
    const [expiredSessions, expiredInstances] = await Promise.all([
      SessionModel.find({ status: 'in_progress', expiresAt: { $lt: now } }).lean(),
      AssignmentInstanceModel.find({
        status: 'pending',
        deadline: { $ne: null, $lt: now },
      }).lean(),
    ]);
    for (const s of expiredSessions) await this.autoCloseSession(s.id);
    if (expiredInstances.length > 0) {
      await AssignmentInstanceModel.updateMany(
        { id: { $in: expiredInstances.map((i) => i.id) }, status: 'pending' },
        { $set: { status: 'closed' } }
      );
    }
    if (expiredSessions.length > 0 || expiredInstances.length > 0) {
      logger.info(
        `Sweeper auto-closed ${expiredSessions.length} session(s), ${expiredInstances.length} instance(s)`
      );
    }
    return { sessions: expiredSessions.length, instances: expiredInstances.length };
  }
}

export const sessionService = SessionService.getInstance();
