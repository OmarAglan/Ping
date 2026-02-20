/**
 * SalamHub API - Get Feed
 * GET /api/v1/feed
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ResponseData = {
    success: boolean
    data?: Array<{
        id: string
        content: string | null
        author: {
            id: string
            username: string
            displayName: string | null
            avatar: string | null
            isVerified: boolean
        }
        media: Array<{
            id: string
            url: string
            type: string
        }>
        likeCount: number
        commentCount: number
        repostCount: number
        isLiked: boolean
        isBookmarked: boolean
        createdAt: Date
    }>
    meta?: {
        page: number
        limit: number
        total: number
        hasMore: boolean
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

        // Parse query parameters
        const page = parseInt(req.query.page as string) || 1
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
        const type = (req.query.type as string) || 'algorithmic' // 'algorithmic' or 'chronological'

        const skip = (page - 1) * limit

        // Get user's following list
        const following = await prisma.follow.findMany({
            where: {
                followerId: payload.userId,
                status: 'ACCEPTED',
            },
            select: {
                followingId: true,
            },
        })

        const followingIds = following.map((f) => f.followingId)
        // Include user's own posts
        followingIds.push(payload.userId)

        // Build query based on feed type
        let posts
        let total

        if (type === 'chronological') {
            // Simple chronological feed of followed users
            [posts, total] = await Promise.all([
                prisma.post.findMany({
                    where: {
                        authorId: { in: followingIds },
                        deletedAt: null,
                        visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatar: true,
                                isVerified: true,
                            },
                        },
                        media: {
                            select: {
                                id: true,
                                url: true,
                                type: true,
                            },
                        },
                        likes: {
                            where: { userId: payload.userId },
                            select: { id: true },
                        },
                        bookmarks: {
                            where: { userId: payload.userId },
                            select: { id: true },
                        },
                    },
                }),
                prisma.post.count({
                    where: {
                        authorId: { in: followingIds },
                        deletedAt: null,
                        visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
                    },
                }),
            ])
        } else {
            // Algorithmic feed - mix of followed users and popular posts
            // For now, we'll use a simple algorithm that shows:
            // 70% from followed users, 30% popular posts from others
            const followingLimit = Math.floor(limit * 0.7)
            const popularLimit = limit - followingLimit

            const [followingPosts, popularPosts] = await Promise.all([
                prisma.post.findMany({
                    where: {
                        authorId: { in: followingIds },
                        deletedAt: null,
                        visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: followingLimit,
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatar: true,
                                isVerified: true,
                            },
                        },
                        media: {
                            select: {
                                id: true,
                                url: true,
                                type: true,
                            },
                        },
                        likes: {
                            where: { userId: payload.userId },
                            select: { id: true },
                        },
                        bookmarks: {
                            where: { userId: payload.userId },
                            select: { id: true },
                        },
                    },
                }),
                prisma.post.findMany({
                    where: {
                        authorId: { notIn: followingIds },
                        deletedAt: null,
                        visibility: 'PUBLIC',
                    },
                    orderBy: [
                        { likeCount: 'desc' },
                        { commentCount: 'desc' },
                        { createdAt: 'desc' },
                    ],
                    skip,
                    take: popularLimit,
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatar: true,
                                isVerified: true,
                            },
                        },
                        media: {
                            select: {
                                id: true,
                                url: true,
                                type: true,
                            },
                        },
                        likes: {
                            where: { userId: payload.userId },
                            select: { id: true },
                        },
                        bookmarks: {
                            where: { userId: payload.userId },
                            select: { id: true },
                        },
                    },
                }),
            ])

            posts = [...followingPosts, ...popularPosts].sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            )
            total = await prisma.post.count({
                where: {
                    OR: [
                        { authorId: { in: followingIds } },
                        { visibility: 'PUBLIC' },
                    ],
                    deletedAt: null,
                },
            })
        }

        // Format response
        const formattedPosts = posts.map((post) => ({
            id: post.id,
            content: post.content,
            author: post.author,
            media: post.media,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            repostCount: post.repostCount,
            isLiked: post.likes.length > 0,
            isBookmarked: post.bookmarks.length > 0,
            createdAt: post.createdAt,
        }))

        return res.status(200).json({
            success: true,
            data: formattedPosts,
            meta: {
                page,
                limit,
                total,
                hasMore: skip + posts.length < total,
            },
        })
    } catch (error) {
        console.error('Get feed error:', error)

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred while fetching feed',
            },
        })
    }
}
