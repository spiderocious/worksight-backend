import {
  AssignmentInstanceModel,
  AssignmentModel,
  CandidateModel,
  IAssignment,
  IAssignmentInstance,
} from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { generateId, logger } from '@utils';
import {
  AssignmentAssignDTO,
  AssignmentCreateDTO,
  AssignmentUpdateDTO,
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
      return new ServiceSuccess(created.toObject() as IAssignment, MESSAGE_KEYS.ASSIGNMENT_CREATED);
    } catch (err) {
      logger.error('Assignment create failed', err);
      return new ServiceError('Create failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async listForReviewer(reviewerId: string): Promise<ServiceResult<IAssignment[]>> {
    try {
      const list = await AssignmentModel.find({ createdBy: reviewerId }).sort({ createdAt: -1 }).lean();
      return new ServiceSuccess(list as IAssignment[], MESSAGE_KEYS.ASSIGNMENTS_FETCHED);
    } catch (err) {
      logger.error('Assignment list failed', err);
      return new ServiceError('List failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async getOwned(reviewerId: string, id: string): Promise<ServiceResult<IAssignment>> {
    try {
      const assignment = await AssignmentModel.findOne({ id, createdBy: reviewerId }).lean();
      if (!assignment) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      return new ServiceSuccess(assignment as IAssignment, MESSAGE_KEYS.ASSIGNMENT_FETCHED);
    } catch (err) {
      logger.error('Assignment get failed', err);
      return new ServiceError('Get failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  async update(reviewerId: string, id: string, dto: AssignmentUpdateDTO): Promise<ServiceResult<IAssignment>> {
    try {
      const started = await AssignmentInstanceModel.findOne({
        assignmentId: id,
        status: { $in: ['in_progress', 'submitted', 'scored'] },
      }).lean();
      if (started) return new ServiceError('Locked', MESSAGE_KEYS.ASSIGNMENT_LOCKED);
      const updated = await AssignmentModel.findOneAndUpdate(
        { id, createdBy: reviewerId },
        { $set: dto },
        { new: true }
      ).lean();
      if (!updated) return new ServiceError('Not found', MESSAGE_KEYS.ASSIGNMENT_NOT_FOUND);
      return new ServiceSuccess(updated as IAssignment, MESSAGE_KEYS.ASSIGNMENT_UPDATED);
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
      const aMap = new Map(assignments.map((a) => [a.id, a as IAssignment]));
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
