# SalamHub (سلام هب)

> Social Media Platform with Islamic Values Foundation

![SalamHub Banner](./public/next.svg)

## 🌟 About SalamHub

SalamHub is a next-generation social media platform that combines the best features from successful platforms while emphasizing **free speech** and **Islamic moral values**. Open to everyone worldwide, the platform provides a safe, ethical, and engaging environment rooted in the Islamic principle of "Salam" (peace).

### Key Features

- 📝 **Posts & Threads** - Share your thoughts with text, images, and videos
- 🔄 **Feed System** - Chronological and algorithmic feed options
- 💬 **Comments & Replies** - Engage in meaningful discussions
- ❤️ **Reactions** - Express yourself with Islamic-appropriate reactions
- 👥 **Groups** - Create and join communities around shared interests
- 🔒 **End-to-End Encrypted DMs** - Private conversations with security
- 🌍 **Arabic-First** - Built with Arabic as the default language
- 🛡️ **Content Moderation** - Strict enforcement with community oversight

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/salamhub.git
   cd salamhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
salamhub/
├── components/          # React components
│   ├── Layout/         # Layout components (Sidebar, FollowBar)
│   ├── Button.tsx      # Reusable button component
│   └── Header.tsx      # Page header component
├── pages/              # Next.js pages
│   ├── api/            # API routes
│   │   └── v1/         # Versioned API endpoints
│   ├── _app.tsx        # App wrapper
│   └── index.tsx       # Home page
├── lib/                # Utility libraries
│   ├── prisma.ts       # Prisma client singleton
│   └── auth.ts         # Authentication utilities
├── prisma/             # Database schema
│   └── schema.prisma   # Prisma schema definition
├── styles/             # Global styles
├── public/             # Static assets
└── plans/              # Planning documents
    ├── social-platform-proposal.md
    ├── database-schema.md
    └── api-architecture.md
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/logout` | Logout user |
| POST | `/api/v1/auth/refresh` | Refresh access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/posts` | Create new post |
| GET | `/api/v1/feed` | Get feed |

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | JWT |
| **State Management** | Zustand |

## 📜 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**SalamHub** - Building a better social media experience, together. 🕊️
