import { AssignmentInstanceModel, CandidateModel, ICandidate } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateAccessCode, generateId, JWTUtil, logger } from '@utils';
import { CandidateAuthDTO, CandidateCreateDTO, CandidateUpdateDTO } from '@requests/candidate.requests';

interface CandidateWithCounts extends ICandidate {
  counts: { total: number; pending: number; in_progress: number; submitted: number; scored: number };
}

export class CandidateService {
  private static instance: CandidateService;
  private constructor() {}
  static getInstance(): CandidateService {
    if (!this.instance) this.instance = new CandidateService();
    return this.instance;
  }

  private async newCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateAccessCode();
      const conflict = await CandidateModel.findOne({ accessCode: code }).lean();
      if (!conflict) return code;
    }
    throw new Error('Could not allocate access code');
  }

  async create(reviewerId: string, dto: CandidateCreateDTO): Promise<ServiceResult<ICandidate>> {
    try {
      const accessCode = await this.newCode();
      const id = generateId(16, 'cd');
      const created = await CandidateModel.create({
        id,
        reviewerId,
        name: dto.name,
        email: dto.email,
        accessCode,
        isActive: true,
      });
      return new ServiceSuccess(created.toObject() as ICandidate, MESSAGE_KEYS.CANDIDATE_CREATED);
    } catch (err) {
      logger.error('Candidate create failed', err);
      return new ServiceError('Create failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listForReviewer(reviewerId: string): Promise<ServiceResult<CandidateWithCounts[]>> {
    try {
      const candidates = await CandidateModel.find({ reviewerId }).sort({ createdAt: -1 }).lean();
      const ids = candidates.map((c) => c.id);
      const grouped = await AssignmentInstanceModel.aggregate<{ _id: { candidateId: string; status: string }; n: number }>([
        { $match: { candidateId: { $in: ids } } },
        { $group: { _id: { candidateId: '$candidateId', status: '$status' }, n: { $sum: 1 } } },
      ]);
      const map = new Map<string, CandidateWithCounts['counts']>();
      candidates.forEach((c) => map.set(c.id, { total: 0, pending: 0, in_progress: 0, submitted: 0, scored: 0 }));
      grouped.forEach((g) => {
        const counts = map.get(g._id.candidateId);
        if (!counts) return;
        counts.total += g.n;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (counts as any)[g._id.status] = g.n;
      });
      const result: CandidateWithCounts[] = candidates.map((c) => ({
        ...(c as ICandidate),
        counts: map.get(c.id)!,
      }));
      return new ServiceSuccess(result, MESSAGE_KEYS.CANDIDATES_FETCHED);
    } catch (err) {
      logger.error('Candidate list failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getOwned(reviewerId: string, id: string): Promise<ServiceResult<ICandidate>> {
    try {
      const c = await CandidateModel.findOne({ id, reviewerId }).lean();
      if (!c) return new ServiceError('Not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      return new ServiceSuccess(c as ICandidate, MESSAGE_KEYS.CANDIDATE_FETCHED);
    } catch (err) {
      logger.error('Candidate get failed', err);
      return new ServiceError('Get failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(reviewerId: string, id: string, dto: CandidateUpdateDTO): Promise<ServiceResult<ICandidate>> {
    try {
      const updated = await CandidateModel.findOneAndUpdate({ id, reviewerId }, { $set: dto }, { new: true }).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      return new ServiceSuccess(updated as ICandidate, MESSAGE_KEYS.CANDIDATE_UPDATED);
    } catch (err) {
      logger.error('Candidate update failed', err);
      return new ServiceError('Update failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async deactivate(reviewerId: string, id: string): Promise<ServiceResult<ICandidate>> {
    try {
      const updated = await CandidateModel.findOneAndUpdate(
        { id, reviewerId },
        { $set: { isActive: false } },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      return new ServiceSuccess(updated as ICandidate, MESSAGE_KEYS.CANDIDATE_DEACTIVATED);
    } catch (err) {
      logger.error('Candidate deactivate failed', err);
      return new ServiceError('Deactivate failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async regenerateCode(reviewerId: string, id: string): Promise<ServiceResult<ICandidate>> {
    try {
      const accessCode = await this.newCode();
      const updated = await CandidateModel.findOneAndUpdate(
        { id, reviewerId },
        { $set: { accessCode } },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.CANDIDATE_NOT_FOUND);
      return new ServiceSuccess(updated as ICandidate, MESSAGE_KEYS.CODE_REGENERATED);
    } catch (err) {
      logger.error('Candidate regenerate code failed', err);
      return new ServiceError('Regenerate failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async exchangeCode(dto: CandidateAuthDTO): Promise<ServiceResult<{ token: string; candidate: ICandidate }>> {
    try {
      const candidate = await CandidateModel.findOne({ accessCode: dto.accessCode }).lean();
      if (!candidate) return new ServiceError('Invalid', MESSAGE_KEYS.INVALID_ACCESS_CODE);
      if (!candidate.isActive) return new ServiceError('Inactive', MESSAGE_KEYS.CANDIDATE_INACTIVE);
      const token = JWTUtil.signCandidate({ candidateId: candidate.id, type: 'candidate' });
      return new ServiceSuccess({ token, candidate: candidate as ICandidate }, MESSAGE_KEYS.SUCCESS);
    } catch (err) {
      logger.error('Candidate exchange failed', err);
      return new ServiceError('Exchange failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const candidateService = CandidateService.getInstance();
