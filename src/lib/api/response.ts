import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

export function successResponse<T>(data: T, message?: string) {
    return NextResponse.json({
        success: true,
        data,
        message,
    } as ApiResponse<T>)
}

export function errorResponse(error: string, status: number = 400) {
    return NextResponse.json({
        success: false,
        error,
    } as ApiResponse, { status })
}

export function validationErrorResponse(errors: Record<string, string[]>) {
    return NextResponse.json({
        success: false,
        error: 'Validation failed',
        data: errors,
    } as ApiResponse, { status: 422 })
}

export function notFoundResponse(message: string = 'Resource not found') {
    return NextResponse.json({
        success: false,
        error: message,
    } as ApiResponse, { status: 404 })
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
    return NextResponse.json({
        success: false,
        error: message,
    } as ApiResponse, { status: 401 })
}

export function serverErrorResponse(message: string = 'Internal server error') {
    return NextResponse.json({
        success: false,
        error: message,
    } as ApiResponse, { status: 500 })
}