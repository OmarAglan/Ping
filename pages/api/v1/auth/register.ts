/**
 * SalamHub API - User Registration
 * POST /api/v1/auth/register
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { registerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(1).max(50).optional(),
  language: z.enum(['ar', 'en']).optional(),
})

type ResponseData = {
  success: boolean
  data?: {
    message: string
    userId: string
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
    const validationResult = registerSchema.safeParse(req.body)

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

    const { email, username, password, displayName, language } = validationResult.data

    // Check if registration is enabled
    if (process.env.ENABLE_REGISTRATION === 'false') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'REGISTRATION_DISABLED',
          message: 'New user registration is currently disabled',
        },
      })
    }

    // Register user
    const user = await registerUser({
      email,
      username,
      password,
      displayName,
      language,
    })

    // TODO: Send verification email

    return res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. Please check your email for verification.',
        userId: user.id,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof Error) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists',
          },
        })
      }

      if (error.message === 'USERNAME_ALREADY_EXISTS') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USERNAME_ALREADY_EXISTS',
            message: 'This username is already taken',
          },
        })
      }
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration',
      },
    })
  }
}
