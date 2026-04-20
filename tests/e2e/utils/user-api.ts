/**
 * API client for admin operations
 */

import { apiCall, createAdminSession, TEST_CONFIG } from './helpers.js';

export interface UserData {
  username: string;
  password: string;
  dataLimit?: number | null;
  ipLimit?: number;
  telegramUserId?: string | null;
  isActive?: boolean;
  expiresAt?: string | null;
}

export interface ProxyUser {
  id: number;
  username: string;
  isActive: boolean;
  dataLimit: number | null;
  dataUsed: number;
  ipLimit: number;
  expiresAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class UserApiClient {
  private token: string | null = null;

  async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      this.token = await createAdminSession();
    }
  }

  async createUser(data: UserData): Promise<ProxyUser> {
    await this.ensureAuthenticated();
    const result = await apiCall(this.token, '/api/admin/users', 'POST', data);

    if (!result.success) {
      throw new Error(`Failed to create user: ${result.error || JSON.stringify(result)}`);
    }

    return result as ProxyUser;
  }

  async getUser(id: number): Promise<ProxyUser> {
    await this.ensureAuthenticated();
    const result = await apiCall(this.token, `/api/admin/users/${id}`);

    if (!result) {
      throw new Error(`User with id ${id} not found`);
    }

    return result as ProxyUser;
  }

  async updateUser(id: number, data: Partial<UserData>): Promise<ProxyUser> {
    await this.ensureAuthenticated();
    const result = await apiCall(this.token, `/api/admin/users/${id}`, 'PATCH', data);

    if (!result.success) {
      throw new Error(`Failed to update user: ${result.error || JSON.stringify(result)}`);
    }

    return result as ProxyUser;
  }

  async deleteUser(id: number): Promise<void> {
    await this.ensureAuthenticated();
    const result = await apiCall(this.token, `/api/admin/users/${id}`, 'DELETE');

    if (!result.success) {
      throw new Error(`Failed to delete user: ${result.error || JSON.stringify(result)}`);
    }
  }

  async listUsers(): Promise<ProxyUser[]> {
    await this.ensureAuthenticated();
    const result = await apiCall(this.token, '/api/admin/users');

    if (!Array.isArray(result)) {
      throw new Error('Failed to fetch users list');
    }

    return result as ProxyUser[];
  }

  async triggerMaintenance(): Promise<{ updatedCount: number; deactivatedCount: number }> {
    await this.ensureAuthenticated();
    const result = await apiCall(this.token, '/api/users/maintenance', 'POST', {});

    if (!result.success) {
      throw new Error(`Maintenance failed: ${result.error}`);
    }

    return {
      updatedCount: result.updatedCount,
      deactivatedCount: result.deactivatedCount
    };
  }
}

export const userApi = new UserApiClient();
