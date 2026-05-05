import { CandidateModel, ReviewerModel } from '@models';
import { ServiceError, ServiceResult, ServiceSuccess } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { logger } from '@utils';
import { downloadsService } from './downloads.service';
import { sessionRuleService } from './session-rule.service';

interface InviteRule {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  order: number;
}

interface InvitePayload {
  candidate: {
    name: string;
    accessCode: string;
  };
  reviewer: {
    name: string;
  };
  install: {
    installCommand: string;
    installScriptUrl: string;
    releasesUrl: string;
    latestVersion: string;
    releasedAt: string;
  };
  // The reviewer's active session rules — same list the candidate sees inside
  // the desktop app on the rules screen. Surfaced on the invite page so the
  // candidate sees what they're agreeing to before they install anything.
  rules: InviteRule[];
}

export class InviteService {
  private static instance: InviteService;
  private constructor() {}
  static getInstance(): InviteService {
    if (!this.instance) this.instance = new InviteService();
    return this.instance;
  }

  /**
   * Resolve a candidate-facing invite by access code. Public, no auth.
   * Used by the /candidate/invite/:code page on the marketing site.
   *
   * If the code doesn't exist or the candidate has been deactivated, we return
   * a soft "no longer valid" error rather than leaking which case it was —
   * keeps probing harder.
   */
  async resolve(accessCode: string): Promise<ServiceResult<InvitePayload>> {
    try {
      const candidate = await CandidateModel.findOne({ accessCode }).lean();
      if (!candidate || !candidate.isActive) {
        return new ServiceError('Invalid invite', MESSAGE_KEYS.INVITE_INVALID);
      }
      const reviewer = await ReviewerModel.findOne({ id: candidate.reviewerId }).lean();
      if (!reviewer) {
        return new ServiceError('Invalid invite', MESSAGE_KEYS.INVITE_INVALID);
      }

      const [downloadsResult, rulesResult] = await Promise.all([
        downloadsService.get(),
        sessionRuleService.listActiveForCandidate(candidate.reviewerId),
      ]);

      if (!downloadsResult.success || !downloadsResult.data) {
        return new ServiceError('Could not load install metadata', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
      }

      const rules: InviteRule[] = rulesResult.success && rulesResult.data
        ? rulesResult.data.filter((r) => r.active).map((r) => ({
            id: r.id,
            icon: r.icon,
            title: r.title,
            subtitle: r.subtitle,
            order: r.order,
          }))
        : [];

      return new ServiceSuccess(
        {
          candidate: { name: candidate.name, accessCode: candidate.accessCode },
          reviewer: { name: reviewer.name },
          install: downloadsResult.data.mac,
          rules,
        },
        MESSAGE_KEYS.INVITE_FETCHED
      );
    } catch (err) {
      logger.error('Invite resolve failed', err);
      return new ServiceError('Resolve failed', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const inviteService = InviteService.getInstance();
