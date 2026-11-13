export interface UserInfo {
  id: number | string;
  username: string;
  name: string;
  orgName?: string;
  roles: string[];
  mustChangePwd?: boolean;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: UserInfo;
}
