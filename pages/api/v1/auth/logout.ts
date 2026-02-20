/**
 * SalamHub API - User Logout
 * POST /api/v1/auth/logout
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteSession } from '@/lib/auth'

type ResponseData = {
    success: boolean
    data?: {
        message: string
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
        // Get refresh token from body or header
        const { refreshToken } = req.body

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Refresh token is required',
                },
            })
        }

        // Delete session
        await deleteSession(refreshToken)

        return res.status(200).json({
            success: true,
            data: {
                message: 'Logged out successfully',
            },
        })
    } catch (error) {
        console.error('Logout error:', error)

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred during logout',
            },
        })
    }
}
