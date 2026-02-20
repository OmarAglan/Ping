/**
 * SalamHub API - Refresh Token
 * POST /api/v1/auth/refresh
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { validateRefreshToken, generateTokenPair, createSession, deleteSession } from '@/lib/auth'

// Validation schema
const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
})

type ResponseData = {
    success: boolean
    data?: {
        accessToken: string
        refreshToken: string
        expiresIn: number
    }
    error?: {
        code: string
        message: string
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
        const validationResult = refreshSchema.safeParse(req.body)

        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Refresh token is required',
                },
            })
        }

        const { refreshToken } = validationResult.data

        // Validate refresh token
        const session = await validateRefreshToken(refreshToken)

        if (!session) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired refresh token',
                },
            })
        }

        // Delete old session
        await deleteSession(refreshToken)

        // Generate new token pair
        const tokenPair = generateTokenPair(
            session.user.id,
            session.user.email,
            session.user.role
        )

        // Create new session
        const userAgent = req.headers['user-agent']
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress
        await createSession(session.user.id, tokenPair.refreshToken, userAgent, ipAddress)

        return res.status(200).json({
            success: true,
            data: tokenPair,
        })
    } catch (error) {
        console.error('Refresh token error:', error)

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred while refreshing token',
            },
        })
    }
}
