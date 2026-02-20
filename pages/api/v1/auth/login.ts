/**
 * SalamHub API - User Login
 * POST /api/v1/auth/login
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { loginUser } from '@/lib/auth'

// Validation schema
const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

type ResponseData = {
    success: boolean
    data?: {
        user: {
            id: string
            email: string
            username: string
            displayName: string | null
            avatar: string | null
            isVerified: boolean
            role: string
        }
        tokens: {
            accessToken: string
            refreshToken: string
            expiresIn: number
        }
    }
    error?: {
        code: string
        message: string
        details?: Array<{ field: string; message: string }>
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: 'Only POST method is allowed',
            },
        })
    }

    try {
        // Validate input
        const validationResult = loginSchema.safeParse(req.body)

        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: validationResult.error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
            })
        }

        const { email, password } = validationResult.data

        // Get client info
        const userAgent = req.headers['user-agent']
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress

        // Login user
        const result = await loginUser(
            { email, password },
            userAgent,
            ipAddress
        )

        return res.status(200).json({
            success: true,
            data: result,
        })
    } catch (error) {
        console.error('Login error:', error)

        if (error instanceof Error) {
            if (error.message === 'INVALID_CREDENTIALS') {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password',
                    },
                })
            }

            if (error.message === 'EMAIL_NOT_VERIFIED') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'EMAIL_NOT_VERIFIED',
                        message: 'Please verify your email address before logging in',
                    },
                })
            }
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred during login',
            },
        })
    }
}
