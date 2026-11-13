import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { config } from '../../config/config';

@WebSocketGateway({ path: '/ws', cors: { origin: '*' } })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const rawToken =
      client.handshake.auth?.token ||
      client.handshake.query?.token ||
      (typeof client.handshake.headers['authorization'] === 'string'
        ? client.handshake.headers['authorization'].replace(/^Bearer\s+/i, '')
        : null);

    if (!rawToken || typeof rawToken !== 'string') {
      client.disconnect(true);
      return;
    }

    try {
      const payload: any = await this.jwtService.verifyAsync(rawToken, { secret: config.jwt.secret });
      if (!payload || payload.typ !== 'access' || !payload.sub) {
        client.disconnect(true);
        return;
      }
      const userId = Number(payload.sub);
      client.data.userId = userId;
      void client.join(`user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      void client.leave(`user:${userId}`);
    }
  }

  emitToUser(userId: number, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcast(event: string, payload: unknown) {
    if (!this.server) return;
    this.server.emit(event, payload);
  }
}
