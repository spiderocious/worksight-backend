import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler.util';
import { ResponseUtil } from '@utils/response.util';
import { adminService, blocklistService, downloadsService } from '@services';
import { HTTP_STATUS, MESSAGE_KEYS } from '@shared/constants';
import { AdminRequest } from '@shared/types';
import { usersListQuerySchema } from '@requests';

export class AdminController {
  private static instance: AdminController;
  static getInstance(): AdminController {
    if (!this.instance) this.instance = new AdminController();
    return this.instance;
  }

  // POST /api/admin/setup — idempotent. Creates the admin only if none exists,
  // returns generated email + plain-text password ONCE.
  setup = asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.bootstrap();
    if (!result.success) {
      const status =
        result.messageKey === MESSAGE_KEYS.ADMIN_ALREADY_EXISTS
          ? HTTP_STATUS.CONFLICT
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return ResponseUtil.error(res, result.messageKey!, status);
    }
    return ResponseUtil.created(res, result.data, result.messageKey!);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.login(req.body);
    if (!result.success)
      return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.UNAUTHORIZED);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  me = asyncHandler(async (req: AdminRequest, res: Response) => {
    const result = await adminService.getById(req.adminId!);
    if (!result.success) return ResponseUtil.notFound(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  stats = asyncHandler(async (_req: AdminRequest, res: Response) => {
    const result = await adminService.stats();
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  listReviewers = asyncHandler(async (req: AdminRequest, res: Response) => {
    const parsed = usersListQuerySchema.safeParse(req.query);
    if (!parsed.success) return ResponseUtil.badRequest(res, MESSAGE_KEYS.VALIDATION_ERROR);
    const result = await adminService.listReviewers(parsed.data.page, parsed.data.limit);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  listCandidates = asyncHandler(async (req: AdminRequest, res: Response) => {
    const parsed = usersListQuerySchema.safeParse(req.query);
    if (!parsed.success) return ResponseUtil.badRequest(res, MESSAGE_KEYS.VALIDATION_ERROR);
    const result = await adminService.listCandidates(parsed.data.page, parsed.data.limit);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  // Downloads — admin can edit the public /downloads payload.
  getDownloads = asyncHandler(async (_req: AdminRequest, res: Response) => {
    const result = await downloadsService.get();
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  updateDownloads = asyncHandler(async (req: AdminRequest, res: Response) => {
    const result = await downloadsService.update(req.body);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  // Blocklist — admin can edit the domains list.
  getBlocklist = asyncHandler(async (_req: AdminRequest, res: Response) => {
    const result = await blocklistService.get();
    if (!result.success) return ResponseUtil.error(res, result.messageKey!);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });

  updateBlocklist = asyncHandler(async (req: AdminRequest, res: Response) => {
    const result = await blocklistService.update(req.body.domains ?? []);
    if (!result.success) return ResponseUtil.error(res, result.messageKey!, HTTP_STATUS.BAD_REQUEST);
    return ResponseUtil.success(res, result.data, result.messageKey!);
  });
}

export const adminController = AdminController.getInstance();
