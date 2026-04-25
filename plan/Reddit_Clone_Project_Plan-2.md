# Reddit Clone Project - Comprehensive Planning Guide

## 📋 Project Overview

This is a solo project to build a minimal Reddit clone. This guide breaks down requirements into user stories, provides a realistic timeline, database design, and implementation strategy.

### Key Points for Solo Beginners

- ✅ Start with core features only—don't over-engineer
- ✅ Use MERN stack (MongoDB, Express, React, Node.js) as recommended
- ✅ Implement features incrementally—test after each feature
- ✅ Focus on basic requirements (25% of grade) before bonus features
- ✅ You have ~10 weeks to complete this project

---

## 👤 User Stories by Feature

### 1. Authentication (OTP-Based - 6 user stories)

| ID | Feature | Description |
|----|---------|-------------|
| US 1.1 | User Registration - Enter Info | User enters username, email, bio. Does NOT enter password. |
| US 1.2 | User Registration - Verify OTP | System sends OTP to email. User enters OTP to complete signup. |
| US 1.3 | User Login - Enter Email | User enters email/username. System sends OTP to email. |
| US 1.4 | User Login - Verify OTP | User enters OTP. Return JWT token for authenticated requests. |
| US 1.5 | Logout | Clear authentication token from frontend. Optional: invalidate on backend. |
| US 1.6 | Profile Viewing & Editing | View own profile with username, email, creation date. Edit bio & profile picture. |

### 2. Communities (5 user stories)

| ID | Feature | Description |
|----|---------|-------------|
| US 2.1 | Create Community | User can create new community with name, description, rules. User becomes moderator. |
| US 2.2 | View Community | View community details, member count, list of posts in chronological order. |
| US 2.3 | Join Community | Add user to community members list. User can now post in community. |
| US 2.4 | Leave Community | Remove user from community members list. User can no longer post. |
| US 2.5 | Search Communities | Search for communities by name/description. Show partial matches. |

### 3. Posts (5 user stories)

| ID | Feature | Description |
|----|---------|-------------|
| US 3.1 | Create Post | User can post text to a community they've joined. Include title + content. |
| US 3.2 | View Feed | Show posts from all communities user has joined. Default: newest first. Can sort by trending (most upvotes). |
| US 3.3 | View Post Details | Show post with comments, upvote count. Show author + timestamp. |
| US 3.4 | Delete Post | Author can delete their own post. Deletes associated comments too. |
| US 3.5 | Upvote Posts | Users can upvote posts. Track upvotes per user (prevent double-voting). Show upvote count. |

### 4. Comments (4 user stories)

| ID | Feature | Description |
|----|---------|-------------|
| US 4.1 | Create Comment | Post text comment on a post. Track author + timestamp. |
| US 4.2 | View Comments | Show all comments on a post in chronological order. Show upvote count. |
| US 4.3 | Delete Comment | Author can delete their own comment. |
| US 4.4 | Upvote Comment | Users can upvote comments. Track upvotes per user (prevent double-voting). |

### 5. AI Integration (Bonus - 2 user stories)

| ID | Feature | Description |
|----|---------|-------------|
| US 5.1 | Summarize Post | Button on post detail page. Call AI API to summarize post + top comments. |
| US 5.2 | Show Summary | Display summary in modal or separate section on page. |

---

## 🗄️ Database Schema

### Users Collection

```json
{
  "_id": ObjectId,
  "username": String (unique),
  "email": String (unique),
  "bio": String,
  "profilePicture": String (URL),
  "otp": String (temporary, 6-digit code),
  "otpExpiry": Date (expiry time for OTP),
  "verified": Boolean (true after OTP verification),
  "createdAt": Date,
  "updatedAt": Date
}
```

**Notes:**
- `password` field is NOT needed - using OTP instead
- `otp` is temporary and should be deleted/overwritten when user verifies
- `otpExpiry` is typically 10-15 minutes from generation
- `verified` tracks if user has verified their email via OTP

### Communities Collection

```json
{
  "_id": ObjectId,
  "name": String (unique),
  "description": String,
  "creator": ObjectId (ref: Users),
  "members": [ObjectId],
  "memberCount": Number,
  "rules": String,
  "createdAt": Date,
  "updatedAt": Date
}
```

**Notes:**
- `memberCount` is denormalized for faster queries
- Update `memberCount` whenever user joins/leaves

### Posts Collection

```json
{
  "_id": ObjectId,
  "title": String,
  "content": String,
  "author": ObjectId (ref: Users),
  "community": ObjectId (ref: Communities),
  "upvotes": Number,
  "upvoters": [ObjectId],
  "commentCount": Number,
  "createdAt": Date,
  "updatedAt": Date
}
```

**Notes:**
- Only `upvotes` count - no downvotes
- `upvoters` array stores user IDs to prevent duplicate upvotes
- When user upvotes: add to `upvoters` array and increment `upvotes`
- When user removes upvote: remove from array and decrement `upvotes`

### Comments Collection

```json
{
  "_id": ObjectId,
  "content": String,
  "author": ObjectId (ref: Users),
  "post": ObjectId (ref: Posts),
  "upvotes": Number,
  "upvoters": [ObjectId],
  "createdAt": Date,
  "updatedAt": Date
}
```

**Notes:**
- Only `upvotes` - no downvotes
- `upvoters` array prevents duplicate upvotes

---

## 🔌 Core API Endpoints

### Authentication

| Method | Endpoint | Body/Params | Description |
|--------|----------|------------|-------------|
| POST | `/api/auth/register/info` | `{ username, email, bio }` | User enters registration info |
| POST | `/api/auth/register/verify` | `{ email, otp }` | User verifies OTP & completes signup |
| POST | `/api/auth/login/email` | `{ email }` | Send OTP to email for login |
| POST | `/api/auth/login/verify` | `{ email, otp }` | Verify OTP & return JWT token |
| POST | `/api/auth/logout` | N/A | Clear session (optional) |
| GET | `/api/auth/me` | None (JWT) | Get current user info |

### Users

| Method | Endpoint | Body/Params | Description |
|--------|----------|------------|-------------|
| GET | `/api/users/:id` | None | Get user profile |
| PUT | `/api/users/:id` | `{ bio, profilePicture }` | Update profile (JWT req) |
| GET | `/api/users/search` | `?q=name` | Search users by name |

### Communities

| Method | Endpoint | Body/Params | Description |
|--------|----------|------------|-------------|
| POST | `/api/communities` | `{ name, description, rules }` | Create community (JWT req) |
| GET | `/api/communities/:id` | None | Get community details |
| GET | `/api/communities` | `?sort=name` | List all communities |
| GET | `/api/communities/search` | `?q=name` | Search communities |
| POST | `/api/communities/:id/join` | None | Join community (JWT req) |
| POST | `/api/communities/:id/leave` | None | Leave community (JWT req) |

### Posts

| Method | Endpoint | Body/Params | Description |
|--------|----------|------------|-------------|
| POST | `/api/posts` | `{ title, content, community }` | Create post (JWT req) |
| GET | `/api/posts/:id` | None | Get post details + comments |
| GET | `/api/communities/:id/posts` | `?sort=newest` | Get posts in community (newest/trending) |
| GET | `/api/feed` | `?sort=newest` | Get feed (user's communities) |
| DELETE | `/api/posts/:id` | None | Delete post (JWT req) |
| POST | `/api/posts/:id/upvote` | None | Upvote post (JWT req) |
| DELETE | `/api/posts/:id/upvote` | None | Remove upvote from post (JWT req) |

### Comments

| Method | Endpoint | Body/Params | Description |
|--------|----------|------------|-------------|
| POST | `/api/comments` | `{ content, post }` | Create comment (JWT req) |
| DELETE | `/api/comments/:id` | None | Delete comment (JWT req) |
| POST | `/api/comments/:id/upvote` | None | Upvote comment (JWT req) |
| DELETE | `/api/comments/:id/upvote` | None | Remove upvote from comment (JWT req) |

---

## 📅 Implementation Timeline (10 weeks)

### Week 1-2: Planning & Setup

- [x] Finalize user stories & database schema
- [x] Initialize Node/Express backend repository
- [x] Initialize React frontend repository
- [ ] Set up MongoDB Atlas (free tier)
- [ ] Create GitHub repository

**Deliverable:** Repos initialized, schemas finalized, ready to code

### Week 2-3: Backend—Authentication

- [x] Create User model & register endpoint
- [x] Implement JWT authentication middleware
- [x] Create login endpoint (OTP-based)
- [ ] Test endpoints with Postman
- [x] Add input validation & error handling

**Deliverable:** Users can register and login

### Week 3-4: Backend—Core Models & Endpoints

- [x] Create Community model & CRUD endpoints
- [x] Create Post model & CRUD endpoints
- [x] Create Notification model & endpoints
- [x] Create Message/Thread model & endpoints
- [x] Add voting logic for posts (prevent double-voting)
- [ ] Create Comment model (`comment.model.js`)
- [ ] Implement comment endpoints (create, delete, upvote) (`comments.controller.js`, `comments.routes.js`)
- [ ] Test all endpoints with Postman

**Deliverable:** All API endpoints working

### Week 4-5: Frontend—Setup & Auth UI

- [x] Set up React + React Router
- [x] Build register page (EmailPage, OtpPage)
- [x] Build interests/onboarding page
- [x] Implement JWT token storage
- [x] Create protected routes

**Deliverable:** Users can login/register on frontend

### Week 5-7: Frontend—Core Features

- [x] Build posts feed (HomePage with PostCard)
- [x] Build create post modal
- [x] Build create community modal
- [x] Build chat/messages panel
- [x] Build notifications dropdown
- [ ] Build post detail page with comments (`PostDetailPage.jsx`) — route: `/post/:id`
- [ ] Build community detail page (`CommunityPage.jsx`) — route: `/r/:name`
- [ ] Build user profile page (`ProfilePage.jsx`) — route: `/u/:id`
- [ ] Build search results page (`SearchPage.jsx`) — route: `/search`
- [ ] Wire up search bar in navbar to search API
- [ ] Build comment form & comment list UI
- [ ] Add routes for new pages in `App.jsx`

**Deliverable:** All pages built, styled (basic styling OK)

### Week 7-8: Integration & Bug Fixes

- [x] Connect frontend to backend API (feed, communities, auth, messages, notifications)
- [ ] Connect post detail page to backend
- [ ] Connect comments to backend
- [ ] Connect community page to backend
- [ ] Connect profile page to backend
- [ ] Test end-to-end user flows
- [ ] Fix bugs
- [ ] Refine UI styling

**Deliverable:** App fully functional

### Week 8-9: AI Integration (Bonus)

- [ ] Research Claude API or OpenAI API
- [ ] Build backend endpoint to summarize post + top comments
- [ ] Add "Summarize" button to post detail page
- [ ] Display summary in modal or section
- [ ] Test summarization feature

**Deliverable:** AI summarization working (10% bonus)

### Week 9-10: Documentation & Deployment

- [ ] Write API documentation (Postman or Swagger)
- [ ] Create database schema diagram
- [ ] Deploy backend (Heroku, Railway, Render, etc.)
- [ ] Deploy frontend (Vercel or Netlify)
- [ ] Write README with setup instructions

**Deliverable:** Project deployed & documented

---

## 🛠️ Recommended Tech Stack

### Backend

- **Node.js + Express.js** - API server
- **MongoDB + Mongoose** - Database & ODM
- **JWT (jsonwebtoken)** - Authentication
- **bcryptjs** - Password hashing
- **Postman** - API testing & documentation
- **dotenv** - Environment variables

### Frontend

- **React 18+** - UI library
- **React Router** - Navigation & routing
- **Axios** - API calls
- **CSS Modules or Tailwind CSS** - Styling
- **Context API** - State management (start simple, upgrade to Redux if needed)

### Optional

- **Redux** - If Context API feels limiting
- **Socket.io** - Real-time notifications (bonus)

### AI Integration

- **Claude API (Anthropic)** - Recommended for summarization
- **OpenAI API** - Alternative
- Use free tier or student credits if available

### Deployment

- **Backend:** Heroku (free tier), Railway, Render, or Vercel
- **Frontend:** Vercel, Netlify
- **Database:** MongoDB Atlas (free tier)

---

## ✅ Best Practices for Solo Development

### Code Organization

**Backend:**
```
reddit-backend/
├── models/          # Mongoose schemas
├── routes/          # API routes
├── controllers/     # Business logic
├── middleware/      # Auth, error handling
├── config/          # Database, env
└── server.js        # Entry point
```

**Frontend:**
```
reddit-frontend/
├── components/      # By feature (not by type)
│   ├── Auth/
│   ├── Communities/
│   ├── Posts/
│   └── Comments/
├── pages/           # Page components
├── hooks/           # Custom hooks
├── utils/           # Helper functions
├── services/        # API calls
└── App.js           # Main component
```

### Version Control

- Create GitHub repository immediately
- Commit after completing each feature
- Use meaningful commit messages: `"Add JWT authentication"` not `"stuff"`
- Branch for features: `feature/user-auth`, `feature/posts`, etc.

### Testing

- **Backend:** Use Postman to test endpoints
- **Frontend:** Test manually in browser
- Test end-to-end: Register → Create Community → Post → Comment → Vote

### Documentation

- Document API endpoints (Postman collection)
- Add comments for complex logic
- Write README with setup instructions
- Include database schema diagram

### Common Pitfalls to Avoid

❌ **Don't:** Commit to main branch repeatedly
✅ **Do:** Use feature branches

❌ **Don't:** Skip error handling
✅ **Do:** Validate all inputs, return meaningful errors

❌ **Don't:** Hardcode API URLs
✅ **Do:** Use environment variables (.env file)

❌ **Don't:** Forget to verify JWT on backend
✅ **Do:** Check token on protected routes

❌ **Don't:** Allow duplicate votes
✅ **Do:** Check if user already voted before storing vote

❌ **Don't:** Try to style everything perfectly initially
✅ **Do:** Get features working first, then polish UI

---

## 🎨 UI/UX Tips (Match Reddit)

### Layout Structure

```
┌─────────────────────────────────────────┐
│          Navbar (Logo, Search)          │
├──────────────┬───────────────┬──────────┤
│  Sidebar     │               │          │
│  - Home      │   Main Feed   │ Right    │
│  - Communities    - Posts     │ Sidebar  │
│  - Create    │   - Comments   │(Optional)│
│  - Search    │               │          │
└──────────────┴───────────────┴──────────┘
```

### Post Card Design

Show:
- Author username + avatar (optional)
- Timestamp (e.g., "2 hours ago")
- Community name
- Post title
- First few lines of content
- Upvote/downvote counts
- Comment count
- Hover effects (highlight on hover)

### Color Scheme

- **Background:** Light gray (#f6f7f8 or #f5f5f5)
- **Text:** Dark gray (#1a1a1b)
- **Upvote:** Orange/red (#ff4500)
- **Downvote:** Blue/purple (#818c91)
- **Links:** Blue (#0079d3)
- **Cards:** White (#fff)

### Responsive Design

- Sidebar: Hide on mobile (hamburger menu)
- Right sidebar: Hide on tablet/mobile
- Post cards: Stack vertically on mobile
- Navbar: Compact on mobile

---

## 📦 Deliverables Checklist

Before submitting, ensure you have:

### Code & Repo
- [ ] GitHub repository (public)
- [ ] Clean code with meaningful names
- [ ] .gitignore file (node_modules, .env)
- [ ] No hardcoded values

### Documentation
- [ ] README.md with setup instructions
- [ ] Database schema diagram (draw.io, Lucidchart, or image)
- [ ] API documentation (Postman collection or Swagger)
- [ ] List of all API endpoints with examples

### Features
- [x] Basic Requirement 1: Account creation & login (OTP-based, JWT, refresh tokens) ✅
- [ ] Basic Requirement 2: View/Edit profile — backend done, frontend page missing
- [x] Basic Requirement 3: Create communities ✅
- [x] Basic Requirement 4: Join/Leave communities ✅
- [x] Basic Requirement 5: Create posts (text + image upload) ✅
- [ ] Basic Requirement 6: View posts in community — backend done (`GET /communities/:id/posts`), frontend community page missing
- [x] Basic Requirement 7: Feed page (personalized feed with sort) ✅
- [x] Basic Requirement 8: Upvote/Downvote posts ✅
- [ ] Basic Requirement 9: Comment on posts — backend missing (no comment model/routes), frontend missing
- [ ] Basic Requirement 10: Search communities & users — backend done, frontend search bar not wired up
- [ ] AI Integration: Summarize posts (10% bonus)

### Quality
- [x] UI matches Reddit layout & color scheme (navbar, sidebar, feed, post cards) ✅
- [x] Database design is efficient (denormalized counts, indexes, ref population) ✅
- [x] Code is clean & organized (feature-based folder structure) ✅
- [ ] No console errors or warnings

### Deployment
- [ ] Backend deployed (Heroku, Railway, etc.)
- [ ] Frontend deployed (Vercel, Netlify, etc.)
- [ ] Project accessible from anywhere (5% bonus)

### Discussion Prep
- [ ] Document what YOU built (be honest)
- [ ] Understand every line of code you submitted
- [ ] Prepare to explain design decisions

**Important:** Team grade capped at 80% of project mark. Focus on understanding your code for the discussion.

---

## 🆘 Common Issues & Solutions

### Backend Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Add `const cors = require('cors');` and `app.use(cors());` in Express |
| JWT not working | Ensure token sent in header: `Authorization: Bearer <token>` |
| MongoDB connection fails | Check connection string, IP whitelist, network access in Atlas |
| Password not hashing | Use bcrypt: `bcrypt.hash(password, 10)` before saving |
| Votes duplicating | Check if vote already exists before adding new vote |
| Comments not showing | Ensure comments are being returned in posts endpoint |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| API calls returning 404 | Check endpoint URL in `.env` file, verify backend is running |
| Token lost on page refresh | Store token in `localStorage` or `sessionStorage` |
| State not updating | Check React State, use `setstate()` not direct mutation |
| Images not loading | Use `require()` for static images, URL for API images |
| Styling not applying | Check CSS scope, use CSS modules to avoid conflicts |
| Components not re-rendering | Check dependencies in `useEffect()` hook |

### Deployment Issues

| Issue | Solution |
|-------|----------|
| Backend won't start | Check `PORT` environment variable, ensure MongoDB connection string |
| Frontend 404 errors | Set `_redirects` file in Netlify or `vercel.json` for routing |
| CORS errors after deploy | Check backend CORS config, ensure frontend URL is whitelisted |

---

## 📚 Resources

### Tutorials & Documentation

- **MERN Stack Tutorial:** freeCodeCamp on YouTube
- **MongoDB Docs:** https://docs.mongodb.com/
- **Express.js Guide:** https://expressjs.com/
- **React Docs:** https://react.dev/
- **JWT Guide:** https://jwt.io/introduction

### Useful Tools

- **Postman:** API testing (https://www.postman.com/)
- **MongoDB Atlas:** Free database (https://www.mongodb.com/cloud/atlas)
- **Draw.io:** Schema diagrams (https://www.draw.io/)
- **VS Code:** Code editor

### Free Deployment

- **Backend:** Heroku (free tier), Railway, Render
- **Frontend:** Vercel, Netlify
- **Database:** MongoDB Atlas (free tier)

---

## 🎯 Final Notes

1. **Start simple.** Get basic features working before adding bells & whistles.
2. **Test frequently.** Don't wait until the end to test your app.
3. **Commit often.** Small commits are easier to debug.
4. **Ask for help.** Use discussion forums, Stack Overflow, ask instructors.
5. **Understand your code.** You'll be asked about every part in the discussion.
6. **Focus on requirements first.** Basic requirements (25%) are worth more than bonus features.

**Build iteratively. Get the basics working first, then add styling and bonus features. Good luck! 🚀**

---

## 📋 Quick Start Checklist

This week:
- [x] Finalize requirements & user stories
- [x] Create GitHub repositories (backend & frontend)
- [x] Initialize Node.js + Express project
- [x] Initialize React project
- [ ] Set up MongoDB Atlas
- [ ] Commit initial setup

Next week:
- [x] Build User model & authentication
- [x] Build frontend login/register pages

Week after:
- [x] Build Post & Community models
- [ ] Build remaining pages (comments, post detail, community page, profile page, search)

## 🚧 Remaining Work (What Still Needs to Be Built)

### Backend
- [ ] `comment.model.js` — Comment schema (content, author, post ref, upvotes, upvoters)
- [ ] `comments.controller.js` — createComment, getComments, deleteComment, upvoteComment
- [ ] `comments.routes.js` — wire up routes and register in `server.js`
- [ ] `GET /api/posts/:id/comments` — fetch comments for a post
- [ ] Add `comments` API file in frontend (`frontend/src/api/comments.js`)

### Frontend Pages
- [ ] `PostDetailPage.jsx` — show post + comments list + add comment form + upvote comment
- [ ] `CommunityPage.jsx` — show community info, member count, rules, posts list, join/leave button
- [ ] `ProfilePage.jsx` — show user info, karma, bio, profile picture, edit form (own profile), saved posts
- [ ] `SearchPage.jsx` — show search results for communities and users

### Frontend Routing (`App.jsx`)
- [ ] Add `/post/:id` → `PostDetailPage`
- [ ] Add `/r/:name` → `CommunityPage`
- [ ] Add `/u/:id` → `ProfilePage`
- [ ] Add `/search` → `SearchPage`

### Frontend Wiring
- [ ] Make post card title/comments button navigate to `/post/:id`
- [ ] Make community name in post card navigate to `/r/:name`
- [ ] Make author username navigate to `/u/:id`
- [ ] Wire navbar search bar to call search API and navigate to `/search`
- [ ] Wire sidebar community links to real joined communities

### Bonus
- [ ] AI summarization endpoint (`POST /api/posts/:id/summarize`)
- [ ] "Summarize" button on post detail page
- [ ] Deploy backend + frontend

---

**Last Updated:** May 2026  
**Project Timeline:** ~10 weeks  
**Difficulty:** Intermediate (for beginners, but achievable)

Good luck! 🎉
