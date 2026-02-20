/**
 * SalamHub API - Get Current User
 * GET /api/v1/users/me
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuth, getCurrentUser } from '@/lib/auth'

type ResponseData = {
  success: boolean
  data?: {
    id: string
    email: string
    username: string
    displayName: string | null
    bio: string | null
    avatar: string | null
    coverImage: string | null
    website: string | null
    location: string | null
    isVerified: boolean
    isPrivate: boolean
    role: string
    language: string
    createdAt: Date
    lastActiveAt: Date | null
    _count: {
      followers: number
      following: number
      posts: number
    }
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
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET method is allowed',
      },
    })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || null
    const payload = await verifyAuth(authHeader)

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    // Get current user
    const user = await getCurrentUser(payload.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      })
    }

    return res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Get current user error:', error)

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user data',
      },
    })
  }
}
