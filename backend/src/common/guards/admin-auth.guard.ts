import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization: unknown = request.headers.authorization;

    if (typeof authorization !== 'string') {
      throw new UnauthorizedException();
    }

    const match = /^Bearer ([^\s]+)$/.exec(authorization);

    if (!match) {
      throw new UnauthorizedException();
    }

    const token = match[1];
    const adminToken = this.configService.getOrThrow<string>('ADMIN_TOKEN');

    if (token !== adminToken) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
