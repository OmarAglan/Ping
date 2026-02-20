/**
 * SalamHub API - Create Post
 * POST /api/v1/posts
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Validation schema
const createPostSchema = z.object({
    content: z.string().max(5000, 'Content must be at most 5000 characters').optional(),
    media: z.array(z.string()).max(4, 'Maximum 4 media files allowed').optional(),
    visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'MENTIONED', 'GROUP']).default('PUBLIC'),
    groupId: z.string().optional(),
    replyToId: z.string().optional(),
})

type ResponseData = {
    success: boolean
    data?: {
        id: string
        content: string | null
        author: {
            id: string
            username: string
            displayName: string | null
            avatar: string | null
        }
        media: Array<{
            id: string
            url: string
            type: string
        }>
        hashtags: string[]
        likeCount: number
        commentCount: number
        repostCount: number
        createdAt: Date
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

        // Validate input
        const validationResult = createPostSchema.safeParse(req.body)

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

        const { content, media, visibility, groupId, replyToId } = validationResult.data

        // Ensure at least content or media is provided
        if (!content && (!media || media.length === 0)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'EMPTY_POST',
                    message: 'Post must have content or media',
                },
            })
        }

        // Extract hashtags from content
        const hashtagRegex = /#[\u0600-\u06FF\w]+/g
        const hashtags = content?.match(hashtagRegex)?.map((tag) => tag.slice(1)) || []

        // Create post
        const post = await prisma.post.create({
            data: {
                content,
                authorId: payload.userId,
                visibility,
                groupId: groupId || null,
                replyToId: replyToId || null,
                // Connect media if provided
                ...(media && media.length > 0
                    ? {
                        media: {
                            connect: media.map((id) => ({ id })),
                        },
                    }
                    : {}),
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                },
                media: {
                    select: {
                        id: true,
                        url: true,
                        type: true,
                    },
                },
            },
        })

        // Create hashtags
        if (hashtags.length > 0) {
            await prisma.hashtag.createMany({
                data: hashtags.map((name) => ({
                    name,
                    postId: post.id,
                })),
                skipDuplicates: true,
            })
        }

        return res.status(201).json({
            success: true,
            data: {
                id: post.id,
                content: post.content,
                author: post.author,
                media: post.media,
                hashtags,
                likeCount: post.likeCount,
                commentCount: post.commentCount,
                repostCount: post.repostCount,
                createdAt: post.createdAt,
            },
        })
    } catch (error) {
        console.error('Create post error:', error)

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred while creating post',
            },
        })
    }
}
