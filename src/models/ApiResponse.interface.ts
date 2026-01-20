export interface ApiResponse1 {
	message?: string;
	error?: string;
}

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
