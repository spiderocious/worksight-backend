import { Response } from 'express';
import { HTTP_STATUS, MESSAGES, MESSAGE_KEYS, MessageKey } from '@shared/constants';

const messageFor = (key?: MessageKey): string => {
  if (!key) return MESSAGES.SUCCESS;
  return MESSAGES[key] ?? MESSAGES.SUCCESS;
};

export class ResponseUtil {
  static success<T>(res: Response, data: T, messageKey: MessageKey = MESSAGE_KEYS.SUCCESS, status: number = HTTP_STATUS.OK): void {
    res.status(status).json({ success: true, data, message: messageFor(messageKey) });
  }

  static created<T>(res: Response, data: T, messageKey: MessageKey): void {
    this.success(res, data, messageKey, HTTP_STATUS.CREATED);
  }

  static error(res: Response, messageKey: MessageKey = MESSAGE_KEYS.INTERNAL_SERVER_ERROR, status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, details?: unknown): void {
    res.status(status).json({
      success: false,
      error: messageFor(messageKey),
      ...(details !== undefined ? { details } : {}),
    });
  }

  static badRequest(res: Response, messageKey: MessageKey, details?: unknown): void {
    this.error(res, messageKey, HTTP_STATUS.BAD_REQUEST, details);
  }
  static unauthorized(res: Response, messageKey: MessageKey = MESSAGE_KEYS.UNAUTHORIZED): void {
    this.error(res, messageKey, HTTP_STATUS.UNAUTHORIZED);
  }
  static forbidden(res: Response, messageKey: MessageKey = MESSAGE_KEYS.FORBIDDEN): void {
    this.error(res, messageKey, HTTP_STATUS.FORBIDDEN);
  }
  static notFound(res: Response, messageKey: MessageKey = MESSAGE_KEYS.NOT_FOUND): void {
    this.error(res, messageKey, HTTP_STATUS.NOT_FOUND);
  }
  static conflict(res: Response, messageKey: MessageKey): void {
    this.error(res, messageKey, HTTP_STATUS.CONFLICT);
  }
}
