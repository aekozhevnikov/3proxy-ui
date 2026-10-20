const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string) {
    return this.request<{ success: boolean; user: { id: number; username: string; name?: string; isAdmin: boolean } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async getSession() {
    return this.request<{ isAuthorized: boolean; userId?: number; username?: string }>("/api/auth/session");
  }

  async logout() {
    return this.request<{ success: boolean }>("/api/auth/logout", { method: "POST" });
  }

  async changeCredentials(username: string, currentPassword: string, newPassword?: string) {
    return this.request<{ success: boolean; user: { id: number; username: string; name?: string; isAdmin: boolean } }>("/api/auth/change-credentials", {
      method: "POST",
      body: JSON.stringify({ username, currentPassword, newPassword }),
    });
  }

  // Users
  async getUsers(params?: { page?: number; pageSize?: number; username?: string; isActive?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());
    if (params?.username) searchParams.set("username", params.username);
    if (params?.isActive !== undefined) searchParams.set("isActive", params.isActive.toString());
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<{ success: boolean; users: any[]; total: number; page: number; pageSize: number }>(`/api/admin/users${query}`);
  }

  async getUser(id: number) {
    return this.request<{ user: any }>(`/api/admin/users/${id}`);
  }

  async createUser(data: any) {
    return this.request<{ success: boolean; user: any }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUser(data: any) {
    return this.request<{ success: boolean; user: any }>(`/api/admin/users/${data.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: number) {
    return this.request<{ success: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" });
  }

  async shareUser(id: number) {
    return this.request<{ success: boolean; password: string }>(`/api/admin/users/${id}/share`);
  }

  // Config
  async generateConfig() {
    return this.request<{ success: boolean; config: string; userCount: number; generatedAt: string }>("/api/config/generate");
  }

  async reloadConfig() {
    return this.request<{ success: boolean; message: string }>("/api/config/reload", { method: "POST" });
  }

  async getProxyConfig() {
    return this.request<{ domain: string; httpPort: string; socksPort: string }>("/api/proxy-config");
  }

  // Logs
  async getLogs(params?: {
    startDate?: string;
    endDate?: string;
    username?: string;
    logType?: "all" | "PROXY" | "SOCKS" | "ADMIN";
    limit?: number;
    offset?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.username) searchParams.set("username", params.username);
    if (params?.logType) searchParams.set("logType", params.logType);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<any>(`/api/logs${query}`);
  }

  // Traffic
  async getTraffic() {
    return this.request<Record<string, { requests: number; sent: number; received: number }>>("/api/users/traffic");
  }

  // System
  async getSystemStatus() {
    return this.request<{ success: boolean; status: SystemStatus }>("/api/system/status");
  }

  async getHealth() {
    return this.request<{ status: string; timestamp: string; uptime: number }>("/api/health");
  }

  // Maintenance
  async runMaintenance() {
    return this.request<{ success: boolean; message: string; updatedCount: number; deactivatedCount: number; totalTraffic: number; sourceFile: string }>("/api/users/maintenance", { method: "POST" });
  }
}

export interface SessionResponse {
  isAuthorized: boolean;
  userId?: number;
  username?: string;
}

export interface User {
  id: number;
  username: string;
  name?: string;
  isAdmin: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: {
    id: number;
    username: string;
    name?: string;
    isAdmin: boolean;
  };
}

export interface SystemStatus {
  success: boolean;
  status: {
    isRunning: boolean;
    version: string;
    memoryUsage: number | null;
    pid: number | null;
  };
  config: {
    exists: boolean;
    modified: string | null;
    path: string;
  };
  users: {
    count: number;
    proxyauthSize: number;
    proxyauthModified: string | null;
  };
  proxy: {
    host: string;
    socks5Port: number;
    httpPort: number;
  };
  logs: {
    size: number;
    fileCount: number;
    path: string | null;
  };
  trafficSync?: {
    lastSync: string | null;
    updatedCount: number;
  };
  timestamp: string;
}

export interface LogEntry {
  time_unix: number;
  proxy: {
    type: string;
    port: number;
  };
  error: {
    code: string;
  };
  auth: {
    user: string;
  };
  client: {
    ip: string;
    port: number;
  };
  server: {
    ip: string;
    port: number;
  };
  bytes: {
    sent: number;
    received: number;
  };
  request: {
    hostname: string;
  };
  message: string;
  raw: string;
}

export interface LogsResponse {
  success: boolean;
  logs: LogEntry[];
  total: number;
  filesScanned: number;
  availableDates: string[];
  stats: {
    totalLogs: number;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
    files: number;
    size: number;
  };
}

export interface TrafficStats {
  requests: number;
  sent: number;
  received: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

export interface MaintenanceResponse {
  success: boolean;
  message: string;
  updatedCount: number;
  deactivatedCount: number;
  totalTraffic: number;
  sourceFile: string;
}

export interface ConfigGenerateResponse {
  success: boolean;
  config: string;
  userCount: number;
  generatedAt: string;
}

export interface ProxyConfigResponse {
  domain: string;
  httpPort: string;
  socksPort: string;
}

export interface MaintenanceResponse {
  success: boolean;
  message: string;
  updatedCount: number;
  deactivatedCount: number;
  totalTraffic: number;
  sourceFile: string;
}

export const api = new ApiClient(API_URL);