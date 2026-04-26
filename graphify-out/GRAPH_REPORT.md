# Graph Report - C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone  (2026-04-26)

## Corpus Check
- 49 files · ~75,575 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 182 nodes · 207 edges · 44 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]

## God Nodes (most connected - your core abstractions)
1. `fetchWithAuth()` - 31 edges
2. `issueSessionTokens()` - 8 edges
3. `refreshSession()` - 6 edges
4. `validationError()` - 6 edges
5. `parseResponse()` - 6 edges
6. `getRefreshCookieOptions()` - 5 edges
7. `pruneExpiredRefreshTokens()` - 4 edges
8. `sendOtp()` - 4 edges
9. `logout()` - 4 edges
10. `createRefreshToken()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `fetchWithAuth()` --calls--> `updateProfile()`  [INFERRED]
  C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\auth.js → C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\users.js
- `fetchWithAuth()` --calls--> `getSavedPosts()`  [INFERRED]
  C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\auth.js → C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\users.js
- `fetchWithAuth()` --calls--> `savePost()`  [INFERRED]
  C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\auth.js → C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\users.js
- `fetchWithAuth()` --calls--> `unsavePost()`  [INFERRED]
  C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\auth.js → C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\frontend\src\api\users.js
- `getRefreshCookieOptions()` --calls--> `durationToMs()`  [INFERRED]
  C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\backend\src\features\auth\auth.controller.js → C:\Users\Michael Maged\Desktop\ASU\term 8\ip\Project\reddit-clone\backend\src\features\auth\auth.utils.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (27): fetchWithAuth(), createCommunity(), createFlair(), getCommunities(), getJoinedCommunities(), getPendingPosts(), joinCommunity(), leaveCommunity() (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (12): sendOtp(), verifyToken(), createAccessToken(), createRefreshToken(), durationToMs(), generateOtp(), getAccessSecret(), getRefreshSecret() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.35
Nodes (10): checkUsername(), completeProfile(), getRefreshCookieOptions(), issueSessionTokens(), logout(), normalizeUsername(), pruneExpiredRefreshTokens(), refreshSession() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.26
Nodes (7): createCommunity(), escapeRegex(), getCommunity(), joinCommunity(), leaveCommunity(), searchCommunities(), validationError()

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (3): formatScore(), PostCard(), timeAgo()

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (0): 

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (2): escapeRegex(), searchUsers()

### Community 7 - "Community 7"
Cohesion: 0.39
Nodes (7): completeProfile(), getMe(), logout(), parseResponse(), refreshAccessToken(), sendOtp(), verifyOtp()

### Community 8 - "Community 8"
Cohesion: 0.32
Nodes (7): getProfile(), getSavedPosts(), parseResponse(), savePost(), searchUsers(), unsavePost(), updateProfile()

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 14`** (2 nodes): `cloudinary.js`, `createCloudinaryStorage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `db.js`, `connectDB()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `otpMiddleware()`, `auth.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `getRefreshCookie()`, `auth.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `comments.test.js`, `seed()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `communities.routes.js`, `optionalAuth()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `posts.routes.js`, `optionalAuth()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `error.middleware.js`, `errorMiddleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `EmailPage.jsx`, `EmailPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `InterestsPage.jsx`, `InterestsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `OtpPage.jsx`, `OtpPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `server.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `auth.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `comment.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `comments.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `community.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `communities.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `message.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `messages.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `notification.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `notifications.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `post.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `posts.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `search.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `users.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `users.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetchWithAuth()` connect `Community 0` to `Community 8`, `Community 7`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `verifyOtp()` connect `Community 7` to `Community 2`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `verifyOtpHandler()` connect `Community 2` to `Community 7`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `fetchWithAuth()` (e.g. with `getJoinedCommunities()` and `joinCommunity()`) actually correct?**
  _`fetchWithAuth()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `issueSessionTokens()` (e.g. with `createAccessToken()` and `createRefreshToken()`) actually correct?**
  _`issueSessionTokens()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `refreshSession()` (e.g. with `verifyRefreshToken()` and `hashToken()`) actually correct?**
  _`refreshSession()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._