import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { WsGateway } from '../ws/ws.gateway';

export interface SendMessageParams {
  toUserId: number;
  title: string;
  content?: string;
  type?: string;
  level?: string;
  objectCode?: string;
  billId?: number;
  link?: string;
  fromUserId?: number;
}

@Injectable()
export class MessageService {
  constructor(
    private db: DbService,
    private wsGateway: WsGateway,
  ) {}

  async send(p: SendMessageParams) {
    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_message (id, msg_type, level, title, content, to_user_id, from_user_id, object_code, bill_id, link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        p.type || 'NOTICE',
        p.level || 'INFO',
        p.title,
        p.content || null,
        p.toUserId,
        p.fromUserId || null,
        p.objectCode || null,
        p.billId || null,
        p.link || null,
      ],
    );

    this.db.afterCommit(() => {
      this.wsGateway.emitToUser(p.toUserId, 'msg.new', {
        id,
        title: p.title,
        content: p.content,
        level: p.level || 'INFO',
        type: p.type || 'NOTICE',
      });
    });

    return id;
  }

  async sendByTemplate(code: string, toUserId: number, vars: Record<string, string>, extra: Partial<SendMessageParams> = {}) {
    const tpl = await this.db.one<{ title_tpl: string; content_tpl: string }>(
      `SELECT title_tpl, content_tpl FROM sys_message_template WHERE code = ?`,
      [code],
    );

    let title = tpl ? tpl.title_tpl : code;
    let content = tpl?.content_tpl || '';

    for (const [k, v] of Object.entries(vars)) {
      const reg = new RegExp(`{{${k}}}`, 'g');
      title = title.replace(reg, v);
      content = content.replace(reg, v);
    }

    return this.send({
      toUserId,
      title,
      content,
      ...extra,
    });
  }

  async list(toUserId: number, q: { unread?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where = ['to_user_id = ?'];
    const params: unknown[] = [toUserId];

    if (q.unread === '1' || q.unread === 'true') {
      where.push('read_at IS NULL');
    }

    const w = `WHERE ${where.join(' AND ')}`;
    const rows = await this.db.q(
      `SELECT id, msg_type AS msgType, level, title, content, from_user_id AS fromUserId,
              object_code AS objectCode, bill_id AS billId, link, read_at AS readAt, confirmed_at AS confirmedAt, created_at AS createdAt
       FROM sys_message ${w} ORDER BY id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_message ${w}`, params);

    return { rows, total: Number(total), page, size };
  }

  async markAsRead(id: number, toUserId: number) {
    await this.db.exec(
      `UPDATE sys_message SET read_at = NOW() WHERE id = ? AND to_user_id = ? AND read_at IS NULL`,
      [id, toUserId],
    );
    return { ok: true };
  }

  async markAllAsRead(toUserId: number) {
    await this.db.exec(
      `UPDATE sys_message SET read_at = NOW() WHERE to_user_id = ? AND read_at IS NULL`,
      [toUserId],
    );
    return { ok: true };
  }

  async confirm(id: number, toUserId: number) {
    await this.db.exec(
      `UPDATE sys_message SET confirmed_at = NOW(), read_at = COALESCE(read_at, NOW()) WHERE id = ? AND to_user_id = ?`,
      [id, toUserId],
    );
    return { ok: true };
  }

  async unreadCount(toUserId: number) {
    const [{ count }] = await this.db.q(
      `SELECT COUNT(*) AS count FROM sys_message WHERE to_user_id = ? AND read_at IS NULL`,
      [toUserId],
    );
    return { count: Number(count) };
  }
}
