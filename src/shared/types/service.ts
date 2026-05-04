import { MessageKey } from '../constants/messages';

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  messageKey?: MessageKey;
  statusCode?: number;
}

export class ServiceSuccess<T> implements ServiceResult<T> {
  success = true as const;
  data: T;
  messageKey?: MessageKey;
  statusCode?: number;

  constructor(data: T, messageKey?: MessageKey, statusCode?: number) {
    this.data = data;
    this.messageKey = messageKey;
    this.statusCode = statusCode;
  }
}

export class ServiceError implements ServiceResult<never> {
  success = false as const;
  error: string;
  messageKey?: MessageKey;
  statusCode?: number;

  constructor(error: string, messageKey?: MessageKey, statusCode?: number) {
    this.error = error;
    this.messageKey = messageKey;
    this.statusCode = statusCode;
  }
}
