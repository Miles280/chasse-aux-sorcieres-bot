export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export interface ValidationResponse {
	message: string;
}

export interface PaginationData {
	currentPage: number;
	totalPages: number;
	totalItems: number;
}
