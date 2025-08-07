export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, string[]>; // Field-specific validation errors
        timestamp: string;
        requestId: string;
    };
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    meta?: {
        pagination?: PaginationMeta;
        timestamp: string;
    };
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;