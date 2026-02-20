/**
 * SalamHub - Authentication Utilities
 * Handles JWT tokens, password hashing, and authentication helpers
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'

// ==================== TYPES ====================

export interface JWTPayload {
    userId: string
    email: string
    role: string
    iat: number
    exp: number
}

export interface TokenPair {
    accessToken: string
    refreshToken: string
    expiresIn: number
}

export interface RegisterInput {
    email: string
    username: string
    password: string
    displayName?: string
    language?: string
}

export interface LoginInput {
    email: string
    password: string
}

// ==================== CONFIGURATION ====================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

// ==================== PASSWORD UTILITIES ====================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

// ==================== JWT UTILITIES ====================

/**
 * Generate an access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
        { userId: payload.userId, email: payload.email, role: payload.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    )
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(): string {
    return uuidv4() + '.' + Date.now().toString(36)
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
        return null
    }
}

/**
 * Generate a token pair (access + refresh)
 */
export function generateTokenPair(userId: string, email: string, role: string): TokenPair {
    const accessToken = generateAccessToken({ userId, email, role })
    const refreshToken = generateRefreshToken()

    // Parse expiry time in seconds
    const expiresIn = parseExpiryToSeconds(JWT_EXPIRES_IN)

    return { accessToken, refreshToken, expiresIn }
}

/**
 * Parse expiry string to seconds
 */
function parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1)
    const value = parseInt(expiry.slice(0, -1))

    switch (unit) {
        case 's': return value
        case 'm': return value * 60
        case 'h': return value * 60 * 60
        case 'd': return value * 60 * 60 * 24
        default: return 900 // Default 15 minutes
    }
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Create a new session in the database
 */
export async function createSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    return prisma.session.create({
        data: {
            userId,
            token: refreshToken,
            userAgent,
            ipAddress,
            expiresAt,
        },
    })
}

/**
 * Validate a refresh token
 */
export async function validateRefreshToken(token: string) {
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    })

    if (!session) return null
    if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } })
        return null
    }

    return session
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string) {
    try {
        await prisma.session.delete({ where: { token } })
        return true
    } catch {
        return false
    }
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } })
}

// ==================== USER REGISTRATION ====================

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput) {
    const { email, username, password, displayName, language = 'ar' } = input

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email }, { username }],
        },
    })

    if (existingUser) {
        if (existingUser.email === email) {
            throw new Error('EMAIL_ALREADY_EXISTS')
        }
        if (existingUser.username === username) {
            throw new Error('USERNAME_ALREADY_EXISTS')
        }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            username,
            passwordHash,
            displayName: displayName || username,
            language,
        },
    })

    return user
}

// ==================== USER LOGIN ====================

/**
 * Login a user
 */
export async function loginUser(input: LoginInput, userAgent?: string, ipAddress?: string) {
    const { email, password } = input

    // Find user
    const user = await prisma.user.findUnique({
        where: { email },
    })

    if (!user) {
        throw new Error('INVALID_CREDENTIALS')
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
        throw new Error('INVALID_CREDENTIALS')
    }

    // Check if user is verified (optional - can be made configurable)
    // if (!user.isVerified) {
    //   throw new Error('EMAIL_NOT_VERIFIED')
    // }

    // Generate tokens
    const tokenPair = generateTokenPair(user.id, user.email, user.role)

    // Create session
    await createSession(user.id, tokenPair.refreshToken, userAgent, ipAddress)

    // Update last active
    await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
    })

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            isVerified: user.isVerified,
            role: user.role,
        },
        tokens: tokenPair,
    }
}

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * Verify authentication from request headers
 */
export async function verifyAuth(authHeader: string | null): Promise<JWTPayload | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.slice(7)
    return verifyAccessToken(token)
}

/**
 * Get current user from token
 */
export async function getCurrentUser(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            bio: true,
            avatar: true,
            coverImage: true,
            website: true,
            location: true,
            isVerified: true,
            isPrivate: true,
            role: true,
            language: true,
            createdAt: true,
            lastActiveAt: true,
            _count: {
                select: {
                    followers: true,
                    following: true,
                    posts: true,
                },
            },
        },
    })
}
