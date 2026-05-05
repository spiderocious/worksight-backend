import {
  AssignmentInstanceModel,
  AssignmentModel,
  CandidateModel,
  IAssignment,
  IAssignmentInstance,
  ScoreModel,
  SessionModel,
  normalizeAssignment,
} from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { logger } from '@utils';
import { sessionService } from './session.service';

// `closesInMs` is a server-computed convenience: how many ms until the
// reviewer's deadline. Negative would mean already closed (sweeper hasn't
// caught it yet); the candidate UI can hide those proactively.
interface PendingItem extends IAssignmentInstance {
  assignment: IAssignment;
  closesInMs: number | null;
}

interface ClosedItem extends IAssignmentInstance {
  assignment: IAssignment;
}

interface CandidateDashboard {
  candidate: { id: string; name: string; email: string };
  pending: PendingItem[];
  inProgress: Array<IAssignmentInstance & { assignment: IAssignment; sessionId: string; expiresAt: Date }>;
  closed: ClosedItem[];
  completed: Array<{
    instance: IAssignmentInstance;
    assignment: IAssignment;
    sessionId: string;
    score?: { numericScore: number; feedback: string } | null;
  }>;
  topBarStatus: string;
}

export class CandidatePortalService {
  private static instance: CandidatePortalService;
  private constructor() {}
  static getInstance(): CandidatePortalService {
    if (!this.instance) this.instance = new CandidatePortalService();
    return this.instance;
  }

  async dashboard(candidateId: string): Promise<ServiceResult<CandidateDashboard>> {
    try {
      const candidate = await CandidateModel.findOne({ id: candidateId }).lean();
      if (!candidate) return new ServiceError('Not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      if (!candidate.isActive) return new ServiceError('Inactive', MESSAGE_KEYS.CANDIDATE_INACTIVE);

      // Lazily auto-close any sessions that have expired for this candidate.
      await sessionService.sweepCandidate(candidateId);

      const instances = await AssignmentInstanceModel.find({ candidateId }).sort({ createdAt: -1 }).lean();
      const aIds = Array.from(new Set(instances.map((i) => i.assignmentId)));
      const assignments = await AssignmentModel.find({ id: { $in: aIds } }).lean();
      const aMap = new Map(assignments.map((a) => [a.id, normalizeAssignment(a as IAssignment)]));

      const pending: CandidateDashboard['pending'] = [];
      const inProgress: CandidateDashboard['inProgress'] = [];
      const closed: CandidateDashboard['closed'] = [];
      const completed: CandidateDashboard['completed'] = [];

      const now = Date.now();

      const inProgressInstances = instances.filter((i) => i.status === 'in_progress');
      const submittedInstances = instances.filter((i) => i.status === 'submitted' || i.status === 'scored');

      const sessions = await SessionModel.find({
        candidateId,
        instanceId: { $in: [...inProgressInstances.map((i) => i.id), ...submittedInstances.map((i) => i.id)] },
      }).lean();
      const sessionByInstance = new Map(sessions.map((s) => [s.instanceId, s]));
      const scores = await ScoreModel.find({ sessionId: { $in: sessions.map((s) => s.id) } }).lean();
      const scoreBySession = new Map(scores.map((s) => [s.sessionId, s]));

      for (const i of instances) {
        const assignment = aMap.get(i.assignmentId);
        if (!assignment) continue;
        if (i.status === 'pending') {
          const closesInMs = i.deadline ? i.deadline.getTime() - now : null;
          pending.push({ ...(i as IAssignmentInstance), assignment, closesInMs });
        } else if (i.status === 'closed') {
          closed.push({ ...(i as IAssignmentInstance), assignment });
        } else if (i.status === 'in_progress') {
          const s = sessionByInstance.get(i.id);
          if (s) {
            inProgress.push({
              ...(i as IAssignmentInstance),
              assignment,
              sessionId: s.id,
              expiresAt: s.expiresAt,
            });
          }
        } else {
          // submitted / scored
          const s = sessionByInstance.get(i.id);
          if (s) {
            const sc = scoreBySession.get(s.id);
            completed.push({
              instance: i as IAssignmentInstance,
              assignment,
              sessionId: s.id,
              score: sc ? { numericScore: sc.numericScore, feedback: sc.feedback } : null,
            });
          }
        }
      }

      const status = (() => {
        if (inProgress.length > 0) return `${inProgress.length} in progress`;
        if (pending.length === 0) return 'No assignments';
        if (pending.length === 1) return '1 pending';
        return `${pending.length} pending`;
      })();

      return new ServiceSuccess(
        {
          candidate: { id: candidate.id, name: candidate.name, email: candidate.email },
          pending,
          inProgress,
          closed,
          completed,
          topBarStatus: status,
        },
        MESSAGE_KEYS.SUCCESS
      );
    } catch (err) {
      logger.error('Candidate dashboard failed', err);
      return new ServiceError('Dashboard failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getInstance(
    candidateId: string,
    instanceId: string
  ): Promise<ServiceResult<{ instance: IAssignmentInstance; assignment: IAssignment }>> {
    try {
      const instance = await AssignmentInstanceModel.findOne({ id: instanceId, candidateId }).lean();
      if (!instance) return new ServiceError('Not found', MESSAGE_KEYS.INSTANCE_NOT_FOUND);
      const assignment = await AssignmentModel.findOne({ id: instance.assignmentId }).lean();
      if (!assignment) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      return new ServiceSuccess(
        { instance: instance as IAssignmentInstance, assignment: normalizeAssignment(assignment as IAssignment) },
        MESSAGE_KEYS.INSTANCE_FETCHED
      );
    } catch (err) {
      logger.error('Candidate instance fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const candidatePortalService = CandidatePortalService.getInstance();
