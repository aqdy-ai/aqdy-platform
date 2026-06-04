export interface UpdateProfileInput {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
}

export interface ProfileResponse {
  name: string;
  email: string;
  plan: string;
  memberSince: Date;
  lastLogin?: Date;
}
