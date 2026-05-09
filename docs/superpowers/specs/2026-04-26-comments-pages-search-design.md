# Design: Comments, Missing Pages & Search

**Date:** 2026-04-26  
**Scope:** Backend comments feature, four missing frontend pages, unified search endpoint  
**Branch:** dev

---

## Overview

Completes the three remaining core requirement gaps in the Reddit clone:
- **A — Comments:** Nested/threaded comments (adjacency list, client-side tree)
- **B — Pages:** PostDetailPage, CommunityPage, ProfilePage
- **C — Search:** Unified search (posts + communities + people) + SearchPage

---

## Architecture

### Approach: Adjacency List, Client-Side Tree

Comments store a nullable `parent` ObjectId. The backend returns a flat array for a post's comments. The frontend builds the tree in one pass (group by parent, sort by `createdAt`) and renders a recursive `<Comment>` component. No recursive DB queries needed.

---

## Backend

### A. Comment Model

**File:** `backend/src/features/comments/comment.model.js`

| Field | Type | Notes |
|-------|------|-------|
| `content` | String (required) | Comment body |
| `author` | ObjectId → User | |
| `post` | ObjectId → Post | |
| `parent` | ObjectId → Comment (nullable) | null = top-level |
| `depth` | Number (default 0) | Set at creation: `parent.depth + 1`, or `0` if top-level. Used to cap display nesting at 6+ levels like Reddit |
| `upvotes` | Number (default 0) | |
| `downvotes` | Number (default 0) | |
| `upvoters` | [ObjectId] | Prevents duplicate upvotes |
| `downvoters` | [ObjectId] | Prevents duplicate downvotes |
| `timestamps` | true | `createdAt`, `updatedAt` |

**Side effects:**
- Create: increment `post.commentCount`
- Delete: decrement `post.commentCount`, cascade-delete all descendant comments
- Upvote/downvote: adjust `commentKarma` on author (mirrors `postKarma` logic in `upvotePost`)

### B. Comment Routes

**File:** `backend/src/features/comments/comments.routes.js`  
**Controller:** `backend/src/features/comments/comments.controller.js`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/comments` | Required | Create comment. Body: `{ content, postId, parentId? }` |
| `GET` | `/api/posts/:id/comments` | Optional | Flat array of all comments for post, sorted by `createdAt` asc |
| `DELETE` | `/api/comments/:id` | Required (author only) | Delete comment + cascade children |
| `POST` | `/api/comments/:id/upvote` | Required | Toggle upvote (same pattern as posts) |
| `POST` | `/api/comments/:id/downvote` | Required | Toggle downvote |

Register in `server.js`: `app.use('/api/comments', commentsRouter)` and `app.use('/api/posts', postsRouter)` already exists — add the `GET /:id/comments` route there.

### C. Search Endpoint

**File:** `backend/src/features/search/search.routes.js` + `search.controller.js`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/search?q=&type=` | None | Unified search |

- `type` accepts: `all` (default), `posts`, `communities`, `people`
- Runs parallel regex queries (`$options: 'i'`)
  - Posts: match `title` or `content`
  - Communities: match `name` or `description`
  - Users: match `username`
- Returns `{ posts: [...], communities: [...], users: [...] }`, 10 results per type
- Escapes regex input (use existing `escapeRegex` utility from communities controller)

### D. New User Endpoints

Add to `backend/src/features/users/users.controller.js`:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users/:username/posts` | None | Posts authored by user, newest first, limit 20 |
| `GET` | `/api/users/:username/comments` | None | Comments by user, newest first, limit 20 |

### E. Community by Name Lookup

Add `GET /api/communities/name/:name` as a new dedicated route. CommunityPage uses `/r/:name` so lookup must be by name string, not ObjectId.

---

## Frontend

### New API File

**`frontend/src/api/comments.js`** — follows same `fetchWithAuth` + `parseResponse` pattern as `posts.js`:
- `getComments(postId)` → `GET /api/posts/:id/comments`
- `createComment({ content, postId, parentId })` → `POST /api/comments`
- `deleteComment(id)` → `DELETE /api/comments/:id`
- `upvoteComment(id)` → `POST /api/comments/:id/upvote`
- `downvoteComment(id)` → `POST /api/comments/:id/downvote`

### New Pages

#### PostDetailPage (`/post/:id`)

- Fetches post by ID, renders full post with vote buttons (reuse voting logic from PostCard)
- Fetches comments flat → builds tree client-side in one pass → renders recursive `<Comment>` component
- `<Comment>` renders: avatar, username, karma, relative timestamp, content, upvote/downvote buttons, Reply toggle (inline textarea), Delete button (own comments only)
- Nesting capped at depth 6 visually (Reddit behaviour); deeper replies still load but are indented at max level
- Top-level comment box: textarea + submit button, calls `createComment`

#### CommunityPage (`/r/:name`)

- Fetches community by name
- Renders: banner image, icon, community name, description, member count, rules
- Join/Leave button: visible to authenticated users, state derived from whether `req.user._id` is in `community.members`
- Posts list below with sort tabs (New / Top / Hot) — reuses `PostCard` component
- Right sidebar: community info card (same data, condensed)

#### ProfilePage (`/u/:username`)

- Fetches user by username
- Header: avatar, username, total karma (postKarma + commentKarma), cake day (formatted `createdAt`)
- Own profile: Edit button opens inline form for bio and profile picture upload
- Two tabs: **Posts** | **Comments**
  - Each tab lazy-fetches on first activation
  - Posts tab: list of user's posts using PostCard
  - Comments tab: list of user's comments (content + link to parent post)

#### SearchPage (`/search?q=`)

- Reads `q` from URL search params (`useSearchParams`)
- Three tabs: **Posts** | **Communities** | **People**
- Each tab renders its result type; empty state shown when no results
- Navbar search bar: on Enter/submit, navigates to `/search?q=<term>` using `useNavigate`

### Routing (`App.jsx`)

Add four routes:
```
/post/:id        → PostDetailPage
/r/:name         → CommunityPage
/u/:username     → ProfilePage
/search          → SearchPage
```

### Navigation Wiring

- PostCard: title and comment count link to `/post/:id`
- PostCard: community name links to `/r/:name`
- PostCard: author username links to `/u/:username`
- Navbar search bar: submits to `/search?q=`
- Sidebar community links: link to `/r/:name`

---

## Data Flow Summary

```
User visits /post/:id
  → GET /api/posts/:id          (post data)
  → GET /api/posts/:id/comments (flat comment array)
  → client builds tree, renders <Comment> recursively

User visits /r/:name
  → GET /api/communities/name/:name
  → GET /api/communities/:id/posts?sort=new

User visits /u/:username
  → GET /api/users/:username
  → GET /api/users/:username/posts  (on Posts tab)
  → GET /api/users/:username/comments (on Comments tab)

User searches
  → GET /api/search?q=term&type=all
  → renders tabbed results
```

---

## Out of Scope

- Real-time comment updates (no websockets)
- Comment editing (delete + re-post is acceptable)
- AI summarization (separate feature)
- Deployment
