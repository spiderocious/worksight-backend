import {
  AssignmentInstanceModel,
  AssignmentModel,
  IAssignment,
  IAssignmentInstance,
  IScore,
  ISession,
  ScoreModel,
  SessionModel,
} from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';
import { ScoreDTO } from '@requests/session.requests';

interface CandidateHistoryItem {
  instance: IAssignmentInstance;
  assignment: IAssignment | null;
  session: ISession | null;
  score: IScore | null;
}

export class ScoreService {
  private static instance: ScoreService;
  private constructor() {}
  static getInstance(): ScoreService {
    if (!this.instance) this.instance = new ScoreService();
    return this.instance;
  }

  async create(reviewerId: string, sessionId: string, dto: ScoreDTO): Promise<ServiceResult<IScore>> {
    try {
      const session = await SessionModel.findOne({ id: sessionId, reviewerId }).lean();
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      const existing = await ScoreModel.findOne({ sessionId }).lean();
      if (existing) {
        const updated = await ScoreModel.findOneAndUpdate(
          { sessionId, reviewerId },
          { $set: { numericScore: dto.numericScore, feedback: dto.feedback } },
          { new: true }
        ).lean();
        await AssignmentInstanceModel.updateOne(
          { id: session.instanceId },
          { $set: { status: 'scored' } }
        );
        return new ServiceSuccess(updated as IScore, MESSAGE_KEYS.SCORE_UPDATED);
      }
      const id = generateId(16, 'sc');
      const created = await ScoreModel.create({
        id,
        sessionId,
        reviewerId,
        numericScore: dto.numericScore,
        feedback: dto.feedback,
      });
      await AssignmentInstanceModel.updateOne({ id: session.instanceId }, { $set: { status: 'scored' } });
      return new ServiceSuccess(created.toObject() as IScore, MESSAGE_KEYS.SCORE_CREATED);
    } catch (err) {
      logger.error('Score create failed', err);
      return new ServiceError('Create failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getForSession(reviewerId: string, sessionId: string): Promise<ServiceResult<IScore | null>> {
    try {
      const session = await SessionModel.findOne({ id: sessionId, reviewerId }).lean();
      if (!session) return new ServiceError('Not found', MESSAGE_KEYS.SESSION_NOT_FOUND);
      const score = await ScoreModel.findOne({ sessionId }).lean();
      return new ServiceSuccess((score as IScore) ?? null, MESSAGE_KEYS.SCORE_FETCHED);
    } catch (err) {
      logger.error('Score get failed', err);
      return new ServiceError('Get failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async candidateHistory(
    reviewerId: string,
    candidateId: string
  ): Promise<ServiceResult<CandidateHistoryItem[]>> {
    try {
      const instances = await AssignmentInstanceModel.find({ reviewerId, candidateId })
        .sort({ createdAt: -1 })
        .lean();
      const aIds = Array.from(new Set(instances.map((i) => i.assignmentId)));
      const [assignments, sessions] = await Promise.all([
        AssignmentModel.find({ id: { $in: aIds } }).lean(),
        SessionModel.find({ candidateId, instanceId: { $in: instances.map((i) => i.id) } }).lean(),
      ]);
      const aMap = new Map(assignments.map((a) => [a.id, a as IAssignment]));
      const sMap = new Map(sessions.map((s) => [s.instanceId, s as ISession]));
      const scores = await ScoreModel.find({ sessionId: { $in: sessions.map((s) => s.id) } }).lean();
      const scMap = new Map(scores.map((s) => [s.sessionId, s as IScore]));
      const out: CandidateHistoryItem[] = instances.map((i) => {
        const sess = sMap.get(i.id) ?? null;
        return {
          instance: i as IAssignmentInstance,
          assignment: aMap.get(i.assignmentId) ?? null,
          session: sess,
          score: sess ? scMap.get(sess.id) ?? null : null,
        };
      });
      return new ServiceSuccess(out, MESSAGE_KEYS.HISTORY_FETCHED);
    } catch (err) {
      logger.error('History fetch failed', err);
      return new ServiceError('Fetch failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const scoreService = ScoreService.getInstance();
