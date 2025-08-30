import type {
  ApiResponse,
  User,
  Safe,
  Trip,
  AuditLog,
  PaginatedResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;

    const config: RequestInit = {
      credentials: "include", // Include session cookies
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Request failed",
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<ApiResponse<User>> {
    return this.request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>("/api/auth/logout", {
      method: "POST",
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>("/api/auth/me");
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // User Management (Admin only)
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>("/api/admin/users");
  }

  async createUser(
    userData: Omit<User, "id" | "createdAt">
  ): Promise<ApiResponse<User>> {
    return this.request<User>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(
    userId: string,
    updates: Partial<User>
  ): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Safe Management
  async getSafes(): Promise<ApiResponse<Safe[]>> {
    return this.request<Safe[]>("/api/safes");
  }

  async getSafe(safeId: string): Promise<ApiResponse<Safe>> {
    return this.request<Safe>(`/api/safes/${safeId}`);
  }

  async registerSafe(serialNumber: string): Promise<ApiResponse<Safe>> {
    return this.request<Safe>("/api/safes/register", {
      method: "POST",
      body: JSON.stringify({ serialNumber }),
    });
  }

  async updateSafe(
    safeId: string,
    updates: Partial<Safe>
  ): Promise<ApiResponse<Safe>> {
    return this.request<Safe>(`/api/safes/${safeId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Trip Management
  async getTrips(
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<Trip>>> {
    return this.request<PaginatedResponse<Trip>>(
      `/api/trips?page=${page}&limit=${limit}`
    );
  }

  async createTrip(
    tripData: Omit<Trip, "id" | "createdAt" | "status">
  ): Promise<ApiResponse<Trip>> {
    return this.request<Trip>("/api/trips", {
      method: "POST",
      body: JSON.stringify(tripData),
    });
  }

  async updateTrip(
    tripId: string,
    updates: Partial<Trip>
  ): Promise<ApiResponse<Trip>> {
    return this.request<Trip>(`/api/trips/${tripId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async assignTrip(
    tripId: string,
    courierId: string,
    safeId: string
  ): Promise<ApiResponse<Trip>> {
    return this.request<Trip>(`/api/trips/${tripId}/assign`, {
      method: "PUT",
      body: JSON.stringify({ courierId, safeId }),
    });
  }

  // Safe Commands (Real-time control)
  async unlockSafe(
    safeId: string,
    otpCode: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/safes/${safeId}/unlock`, {
      method: "POST",
      body: JSON.stringify({ otpCode }),
    });
  }

  async lockSafe(safeId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/safes/${safeId}/lock`, {
      method: "POST",
    });
  }

  // Audit Logs
  async getAuditLogs(
    page = 1,
    limit = 50,
    filters?: {
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(
            key,
            value instanceof Date ? value.toISOString() : value.toString()
          );
        }
      });
    }

    return this.request<PaginatedResponse<AuditLog>>(
      `/api/audit/logs?${params}`
    );
  }
}

export const apiService = new ApiService();
