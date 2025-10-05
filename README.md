# Updated HAKIKISHA Backend Application Structure (Enhanced Workflow)

```
hakikisha-backend/
├── 📁 src/
│   ├── 📁 config/
│   │   ├── database.js
│   │   ├── cloud.js
│   │   ├── auth.js
│   │   ├── cache.js
│   │   ├── constants.js
│   │   └── ai-config.js
│   ├── 📁 controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── claimController.js
│   │   ├── verdictController.js
│   │   ├── factCheckerController.js
│   │   ├── aiController.js
│   │   ├── analyticsController.js
│   │   ├── blogController.js
│   │   ├── adminController.js
│   │   ├── notificationController.js
│   │   ├── trendingController.js
│   │   ├── searchController.js
│   │   └── dashboardController.js
│   ├── 📁 middleware/
│   │   ├── authMiddleware.js
│   │   ├── validationMiddleware.js
│   │   ├── rateLimitMiddleware.js
│   │   ├── cacheMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── loggerMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── aiMiddleware.js
│   ├── 📁 models/
│   │   ├── User.js
│   │   ├── Claim.js
│   │   ├── Verdict.js
│   │   ├── FactChecker.js
│   │   ├── Blog.js
│   │   ├── Notification.js
│   │   ├── Analytics.js
│   │   ├── AIVerdict.js
│   │   ├── AdminActivity.js
│   │   ├── FactCheckerActivity.js
│   │   ├── TrendingTopic.js
│   │   ├── SearchLog.js
│   │   ├── UserSession.js
│   │   └── index.js
│   ├── 📁 services/
│   │   ├── authService.js
│   │   ├── claimService.js
│   │   ├── verdictService.js
│   │   ├── notificationService.js
│   │   ├── aiService.js
│   │   ├── cacheService.js
│   │   ├── emailService.js
│   │   ├── fileUploadService.js
│   │   ├── analyticsService.js
│   │   ├── blogService.js
│   │   ├── adminService.js
│   │   ├── trendingService.js
│   │   ├── factCheckerActivityService.js
│   │   ├── searchService.js
│   │   ├── dashboardService.js
│   │   ├── registrationService.js
│   │   └── userService.js
│   ├── 📁 utils/
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   ├── logger.js
│   │   ├── encryption.js
│   │   ├── pagination.js
│   │   ├── imageProcessor.js
│   │   ├── aiHelpers.js
│   │   ├── contentGenerator.js
│   │   └── searchIndexer.js
│   ├── 📁 workflows/
│   │   ├── claimWorkflow.js
│   │   ├── aiProcessingWorkflow.js
│   │   ├── humanReviewWorkflow.js
│   │   ├── blogPublishingWorkflow.js
│   │   ├── trendingDetectionWorkflow.js
│   │   ├── registrationWorkflow.js
│   │   └── dashboardWorkflow.js
│   ├── 📁 queues/
│   │   ├── claimQueue.js
│   │   ├── notificationQueue.js
│   │   ├── aiProcessingQueue.js
│   │   ├── humanReviewQueue.js
│   │   ├── blogGenerationQueue.js
│   │   ├── trendingAnalysisQueue.js
│   │   ├── searchIndexQueue.js
│   │   └── worker.js
│   ├── 📁 scripts/
│   │   ├── databaseMigration.js
│   │   ├── seedData.js
│   │   ├── backup.js
│   │   ├── cleanup.js
│   │   ├── aiTraining.js
│   │   ├── trendingDetector.js
│   │   └── searchIndexBuilder.js
│   ├── 📁 docs/
│   │   ├── api.md
│   │   ├── setup.md
│   │   ├── deployment.md
│   │   ├── ai-integration.md
│   │   └── workflow.md
│   ├── 📁 tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── performance/
│   │   ├── ai/
│   │   └── fixtures/
│   ├── app.js
│   └── server.js
├── 📁 migrations/
│   ├── 001_create_users_table.js
│   ├── 002_create_claims_table.js
│   ├── 003_create_verdicts_table.js
│   ├── 004_create_fact_checkers_table.js
│   ├── 005_create_blogs_table.js
│   ├── 006_create_notifications_table.js
│   ├── 007_create_ai_verdicts_table.js
│   ├── 008_create_admin_activities_table.js
│   ├── 009_create_fact_checker_activities_table.js
│   ├── 010_create_trending_topics_table.js
│   ├── 011_create_blog_articles_table.js
│   ├── 012_create_search_logs_table.js
│   ├── 013_create_user_sessions_table.js
│   └── 014_create_registration_requests_table.js
├── 📁 uploads/
│   ├── 📁 images/
│   ├── 📁 videos/
│   └── 📁 documents/
├── 📁 logs/
│   ├── access.log
│   ├── error.log
│   ├── ai-processing.log
│   ├── admin-activities.log
│   ├── fact-checker-activities.log
│   └── search-queries.log
├── .env
├── .env.example
├── package.json
├── docker-compose.yml
├── Dockerfile
├── jest.config.js
├── eslint.config.js
├── nginx.conf
└── README.md
```

## Enhanced Database Tables Structure

### 1. Users Table (Enhanced)
```sql
users:
- id (UUID, Primary Key)
- email (String, Unique)
- phone (String, Optional)
- password_hash (String)
- role (Enum: 'user', 'fact_checker', 'admin')
- profile_picture (String, Optional)
- is_verified (Boolean)
- verification_token (String, Optional)
- registration_status (Enum: 'pending', 'approved', 'rejected')
- created_at (Timestamp)
- updated_at (Timestamp)
- last_login (Timestamp)
- login_count (Integer)
```

### 2. Registration Requests Table
```sql
registration_requests:
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- request_type (Enum: 'user', 'fact_checker')
- status (Enum: 'pending', 'approved', 'rejected')
- admin_notes (Text, Optional)
- submitted_at (Timestamp)
- reviewed_at (Timestamp, Optional)
- reviewed_by (UUID, Foreign Key, Optional)
```

### 3. Claims Table (Enhanced Workflow)
```sql
claims:
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- title (String)
- description (Text)
- category (Enum: 'politics', 'health', 'education', etc.)
- media_type (Enum: 'text', 'image', 'video', 'link')
- media_url (String, Optional)
- status (Enum: 'pending', 'ai_processing', 'human_review', 'ai_approved', 'human_approved', 'published', 'rejected')
- priority (Enum: 'low', 'medium', 'high', 'critical')
- similarity_hash (String, For duplicate detection)
- submission_count (Integer, Number of users submitting similar claims)
- ai_verdict_id (UUID, Foreign Key to AI verdicts, Optional)
- human_verdict_id (UUID, Foreign Key to human verdicts, Optional)
- assigned_fact_checker_id (UUID, Foreign Key, Optional)
- is_trending (Boolean)
- trending_score (Float)
- created_at (Timestamp)
- updated_at (Timestamp)
- published_at (Timestamp, Optional)
```

### 4. Search Logs Table
```sql
search_logs:
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key, Optional)
- query (String)
- search_type (Enum: 'claims', 'verdicts', 'blogs', 'all')
- results_count (Integer)
- filters_applied (JSON)
- search_duration (Integer, Milliseconds)
- ip_address (String)
- user_agent (String)
- created_at (Timestamp)
```

### 5. User Sessions Table
```sql
user_sessions:
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- session_token (String, Unique)
- ip_address (String)
- user_agent (String)
- login_time (Timestamp)
- last_activity (Timestamp)
- is_active (Boolean)
- expires_at (Timestamp)
```

## Complete API Documentation

### Authentication & Registration Routes
```javascript
// POST /api/auth/register
// User registration (requires admin approval)
{
  "email": "user@example.com",
  "password": "securepassword",
  "phone": "+254712345678",
  "role": "user" // or "fact_checker"
}

// POST /api/auth/login
// User login
{
  "email": "user@example.com",
  "password": "securepassword"
}

// POST /api/auth/logout
// User logout (requires authentication)

// GET /api/auth/me
// Get current user profile (requires authentication)
```

### Admin Registration Management Routes
```javascript
// GET /api/admin/registration-requests
// Get all pending registration requests (admin only)
// Query params: ?status=pending&type=fact_checker

// POST /api/admin/approve-registration/:requestId
// Approve user registration (admin only)
{
  "notes": "Approved based on credentials verification"
}

// POST /api/admin/reject-registration/:requestId
// Reject user registration (admin only)
{
  "reason": "Incomplete documentation provided"
}
```

### Claims Management Routes
```javascript
// POST /api/claims
// Submit new claim (requires user authentication)
{
  "title": "Claim about election results",
  "description": "Detailed description of the claim",
  "category": "politics",
  "media_type": "text",
  "media_url": "https://example.com/source"
}

// GET /api/claims
// Get claims with filters and pagination
// Query params: ?status=pending&category=politics&page=1&limit=20

// GET /api/claims/:id
// Get specific claim details
// Returns full claim with verdicts and related data

// GET /api/claims/trending
// Get trending claims
// Query params: ?limit=10&timeframe=7d
```

### Fact-Checker Dashboard Routes
```javascript
// GET /api/dashboard/fact-checker/claims
// Get claims assigned to fact-checker for review
// Query params: ?status=human_review&priority=high

// POST /api/dashboard/fact-checker/claims/:id/assign
// Assign claim to fact-checker (auto or manual)

// POST /api/dashboard/fact-checker/verdicts
// Submit verdict for a claim (with or without AI input)
{
  "claim_id": "uuid",
  "verdict": "false",
  "explanation": "Detailed explanation with evidence",
  "evidence_sources": ["source1.com", "source2.org"],
  "approve_ai_verdict": true // Optional: if AI verdict exists
}

// PUT /api/dashboard/fact-checker/claims/:id/status
// Update claim status after review
{
  "status": "human_approved",
  "notes": "Ready for publication"
}
```

### Search & Discovery Routes
```javascript
// GET /api/search/claims
// Search claims and verdicts
// Query params: ?q=election+results&category=politics&date_from=2024-01-01

// GET /api/search/verdicts
// Search specific verdicts
// Query params: ?q=health+claims&verdict=false&limit=20

// GET /api/search/blogs
// Search blog articles
// Query params: ?q=educational+content&author=ai&trending=true

// GET /api/search/suggestions
// Get search suggestions
// Query params: ?q=elec&type=claims
```

### Blog & Trending Content Routes
```javascript
// GET /api/blogs
// Get blog articles with filters
// Query params: ?category=trending&author=human&page=1

// GET /api/blogs/trending
// Get trending blog articles
// Query params: ?limit=5&timeframe=24h

// POST /api/blogs
// Create blog article (fact-checkers and admins)
{
  "title": "Analysis of Trending Health Claims",
  "content": "Detailed analysis content...",
  "category": "health",
  "related_claim_ids": ["uuid1", "uuid2"],
  "is_trending": true
}

// POST /api/blogs/ai-generate
// AI-generated blog from trending claims (auto or manual)
{
  "trending_topic_id": "uuid",
  "template": "analysis" // or "educational", "fact_check"
}
```

### User Activity Routes
```javascript
// GET /api/user/my-claims
// Get claims submitted by current user
// Query params: ?status=published&page=1

// GET /api/user/notifications
// Get user notifications
// Query params: ?unread=true&limit=10

// POST /api/user/search-history
// Save search history (optional)
{
  "query": "election claims",
  "filters": {"category": "politics"}
}
```

## Enhanced Workflow System

### User Registration Workflow:
1. **User Sign Up** → User registers with email/password
2. **Admin Approval** → Admin reviews and approves registration
3. **Email Verification** → User verifies email address
4. **Login Access** → User can now login and use the platform

### Claim Processing Workflow:
1. **Claim Submission** → User submits claim
2. **Dashboard Visibility** → Claim appears in fact-checkers' dashboard
3. **Dual Verification Path**:
   - **Path A (AI First)**: AI processes → Human reviews → Approval
   - **Path B (Human Direct)**: Human fact-checker processes directly
4. **Dashboard Removal** → After approval, claim removed from active dashboard
5. **User Notification** → User receives verdict notification
6. **Publication** → Verdict published to searchable database

### Trending Content Detection:
1. **Claim Aggregation** → System groups similar claims
2. **Engagement Scoring** → Calculates trending metrics
3. **Blog Generation** → AI/human creates blog content
4. **Trending Section** → Published in trending/blog sections

## Complete API Function Specifications

### Authentication System
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (user, fact-checker, admin)
- **Session management** with activity tracking
- **Password strength enforcement** and encryption

### Claim Management System
- **Multi-media claim submission** (text, images, videos, links)
- **Duplicate detection** using similarity hashing
- **Priority assignment** based on content and urgency
- **Status tracking** throughout verification process

### Fact-Checker Dashboard
- **Real-time claim queue** with filtering and sorting
- **Workload management** with claim assignment
- **Verdict submission** with evidence attachment
- **Activity tracking** for performance monitoring

### Search & Discovery System
- **Full-text search** across claims, verdicts, and blogs
- **Advanced filtering** by category, date, verdict type
- **Search suggestions** and autocomplete
- **Search analytics** for improving results

### Blog & Content Management
- **Multi-author support** (human and AI)
- **Trending topic integration**
- **Content scheduling** and publishing
- **Engagement metrics** tracking

### Admin Management System
- **User registration approval**
- **Fact-checker performance monitoring**
- **System analytics** and reporting
- **Content moderation** tools

## Environment Configuration

```env
# Registration Settings
REGISTRATION_APPROVAL_REQUIRED=true
AUTO_APPROVE_USERS=false
FACT_CHECKER_APPROVAL_REQUIRED=true

# Dashboard Settings
CLAIMS_PER_PAGE=20
AUTO_ASSIGNMENT_ENABLED=true
MAX_ACTIVE_CLAIMS=5

# Search Settings
SEARCH_INDEX_ENABLED=true
AUTOCOMPLETE_ENABLED=true
SEARCH_HISTORY_ENABLED=true

# Trending Detection
TRENDING_THRESHOLD=10
TRENDING_TIME_WINDOW=24
AUTO_BLOG_GENERATION=true
```

This updated structure provides:
- **Flexible verification workflow** (AI-first or human-direct)
- **Complete registration system** with admin approval
- **Advanced search capabilities** for users
- **Real-time dashboard management** for fact-checkers
- **Comprehensive content publishing** system
- **Scalable architecture** for 5M+ users

The system ensures that all claims are properly tracked, verified, and made searchable while maintaining a smooth user experience and efficient fact-checker workflow.






fo


































































































for the mobile app i have this file structure
hakikisha-mobile/
├── 📁 android/                          # Android native code
│   ├── app/
│   ├── gradle/
│   └── build.gradle
├── 📁 ios/                              # iOS native code
│   ├── Hakikisha/
│   ├── Hakikisha.xcodeproj/
│   └── Podfile
├── 📁 assets/
│   ├── 📁 fonts/
│   │   ├── Inter-Bold.ttf
│   │   ├── Inter-Regular.ttf
│   │   ├── Inter-SemiBold.ttf
│   │   └── fontello.ttf
│   ├── 📁 icons/
│   │   ├── app-icon.png
│   │   ├── splash-icon.png
│   │   ├── tab-icons/
│   │   └── feature-icons/
│   ├── 📁 images/
│   │   ├── logo.png
│   │   ├── logo-dark.png
│   │   ├── empty-state/
│   │   ├── onboarding/
│   │   └── illustrations/
│   ├── 📁 animations/
│   │   ├── loading.json
│   │   ├── success.json
│   │   ├── error.json
│   │   └── empty.json
│   └── 📁 locales/
│       ├── en.json
│       ├── sw.json
│       └── fr.json
├── 📁 src/
│   ├── 📁 app/
│   │   ├── app.config.ts
│   │   ├── navigation.config.ts
│   │   ├── theme.config.ts
│   │   ├── feature-flags.config.ts
│   │   └── app.constants.ts
│   ├── 📁 components/
│   │   ├── 📁 common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── NetworkStatus.tsx
│   │   ├── 📁 auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── BiometricPrompt.tsx
│   │   │   └── SocialLoginButtons.tsx
│   │   ├── 📁 claims/
│   │   │   ├── ClaimCard.tsx
│   │   │   ├── ClaimForm.tsx
│   │   │   ├── MediaUploader.tsx
│   │   │   ├── CategorySelector.tsx
│   │   │   ├── ClaimStatus.tsx
│   │   │   ├── ClaimActions.tsx
│   │   │   └── SimilarClaims.tsx
│   │   ├── 📁 verdicts/
│   │   │   ├── VerdictCard.tsx
│   │   │   ├── EvidenceList.tsx
│   │   │   ├── RatingSystem.tsx
│   │   │   ├── VerdictBadge.tsx
│   │   │   ├── SourceCredibility.tsx
│   │   │   └── FactCheckerInfo.tsx
│   │   ├── 📁 search/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── SearchSuggestions.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── RecentSearches.tsx
│   │   │   └── SearchFilters.tsx
│   │   ├── 📁 dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ClaimQueue.tsx
│   │   │   ├── WorkloadIndicator.tsx
│   │   │   ├── PerformanceMetrics.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── DashboardHeader.tsx
│   │   ├── 📁 blog/
│   │   │   ├── BlogCard.tsx
│   │   │   ├── TrendingBadge.tsx
│   │   │   ├── ShareButton.tsx
│   │   │   ├── BlogActions.tsx
│   │   │   ├── AuthorInfo.tsx
│   │   │   └── ReadingProgress.tsx
│   │   ├── 📁 profile/
│   │   │   ├── ProfileHeader.tsx
│   │   │   ├── ProfileStats.tsx
│   │   │   ├── SettingsItem.tsx
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   ├── BiometricSettings.tsx
│   │   │   ├── DataUsageSettings.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── VerificationBadge.tsx
│   │   │   └── RoleBadge.tsx
│   │   └── 📁 notifications/
│   │       ├── NotificationItem.tsx
│   │       ├── NotificationList.tsx
│   │       ├── NotificationBadge.tsx
│   │       └── NotificationActions.tsx
│   ├── 📁 screens/
│   │   ├── 📁 auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── ForgotPasswordScreen.tsx
│   │   │   ├── VerificationScreen.tsx
│   │   │   ├── WelcomeScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── 📁 main/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── SearchScreen.tsx
│   │   │   ├── TrendingScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── NotificationsScreen.tsx
│   │   │   └── BookmarksScreen.tsx
│   │   ├── 📁 claims/
│   │   │   ├── SubmitClaimScreen.tsx
│   │   │   ├── ClaimDetailScreen.tsx
│   │   │   ├── MyClaimsScreen.tsx
│   │   │   ├── ClaimStatusScreen.tsx
│   │   │   ├── ClaimCategoriesScreen.tsx
│   │   │   └── SimilarClaimsScreen.tsx
│   │   ├── 📁 verdicts/
│   │   │   ├── VerdictDetailScreen.tsx
│   │   │   ├── VerdictListScreen.tsx
│   │   │   ├── EvidenceScreen.tsx
│   │   │   ├── RecentVerdictsScreen.tsx
│   │   │   └── TopRatedVerdictsScreen.tsx
│   │   ├── 📁 blogs/
│   │   │   ├── BlogListScreen.tsx
│   │   │   ├── BlogDetailScreen.tsx
│   │   │   ├── BlogBookmarksScreen.tsx
│   │   │   ├── TrendingBlogsScreen.tsx
│   │   │   ├── BlogCategoriesScreen.tsx
│   │   │   └── SavedArticlesScreen.tsx
│   │   ├── 📁 dashboard/                # Fact-checker specific
│   │   │   ├── DashboardHomeScreen.tsx
│   │   │   ├── ClaimReviewScreen.tsx
│   │   │   ├── VerdictSubmissionScreen.tsx
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── BlogCreationScreen.tsx
│   │   │   ├── PerformanceScreen.tsx
│   │   │   └── WorkloadScreen.tsx
│   │   ├── 📁 admin/                    # Admin specific
│   │   │   ├── AdminDashboardScreen.tsx
│   │   │   ├── UserManagementScreen.tsx
│   │   │   ├── RegistrationApprovalScreen.tsx
│   │   │   ├── SystemAnalyticsScreen.tsx
│   │   │   ├── ContentModerationScreen.tsx
│   │   │   └── SystemSettingsScreen.tsx
│   │   └── 📁 profile/
│   │       ├── ProfileScreen.tsx
│   │       ├── EditProfileScreen.tsx
│   │       ├── SettingsScreen.tsx
│   │       ├── NotificationSettingsScreen.tsx
│   │       ├── SecurityScreen.tsx
│   │       ├── MyClaimsScreen.tsx
│   │       ├── SavedItemsScreen.tsx
│   │       ├── ActivityHistoryScreen.tsx
│   │       ├── FactCheckerApplicationScreen.tsx
│   │       └── HelpSupportScreen.tsx
│   ├── 📁 navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   ├── DashboardNavigator.tsx
│   │   ├── AdminNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   ├── navigation.types.ts
│   │   ├── navigation.utils.ts
│   │   └── navigation.constants.ts
│   ├── 📁 services/
│   │   ├── 📁 api/
│   │   │   ├── api.client.ts
│   │   │   ├── api.interceptors.ts
│   │   │   ├── api.types.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── claims.api.ts
│   │   │   ├── verdicts.api.ts
│   │   │   ├── search.api.ts
│   │   │   ├── blogs.api.ts
│   │   │   ├── dashboard.api.ts
│   │   │   ├── admin.api.ts
│   │   │   ├── analytics.api.ts
│   │   │   ├── profile.api.ts
│   │   │   └── notifications.api.ts
│   │   ├── 📁 storage/
│   │   │   ├── asyncStorage.ts
│   │   │   ├── secureStorage.ts
│   │   │   ├── cacheManager.ts
│   │   │   ├── storage.keys.ts
│   │   │   └── storage.utils.ts
│   │   ├── 📁 push/
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.handler.ts
│   │   │   ├── notification.types.ts
│   │   │   └── notification.utils.ts
│   │   ├── 📁 media/
│   │   │   ├── imagePicker.service.ts
│   │   │   ├── camera.service.ts
│   │   │   ├── fileUpload.service.ts
│   │   │   ├── mediaProcessor.ts
│   │   │   └── media.types.ts
│   │   ├── 📁 location/
│   │   │   ├── location.service.ts
│   │   │   ├── location.utils.ts
│   │   │   └── location.types.ts
│   │   ├── 📁 analytics/
│   │   │   ├── app.analytics.ts
│   │   │   ├── user.analytics.ts
│   │   │   ├── crash.analytics.ts
│   │   │   ├── event.types.ts
│   │   │   └── analytics.utils.ts
│   │   └── 📁 offline/
│   │       ├── offlineQueue.ts
│   │       ├── syncManager.ts
│   │       ├── connectivity.ts
│   │       ├── offline.types.ts
│   │       └── offline.utils.ts
│   ├── 📁 store/
│   │   ├── index.ts
│   │   ├── store.config.ts
│   │   ├── 📁 slices/
│   │   │   ├── auth.slice.ts
│   │   │   ├── user.slice.ts
│   │   │   ├── claims.slice.ts
│   │   │   ├── verdicts.slice.ts
│   │   │   ├── search.slice.ts
│   │   │   ├── blogs.slice.ts
│   │   │   ├── notifications.slice.ts
│   │   │   ├── dashboard.slice.ts
│   │   │   ├── admin.slice.ts
│   │   │   ├── profile.slice.ts
│   │   │   └── app.slice.ts
│   │   ├── 📁 selectors/
│   │   │   ├── auth.selectors.ts
│   │   │   ├── claims.selectors.ts
│   │   │   ├── search.selectors.ts
│   │   │   ├── dashboard.selectors.ts
│   │   │   ├── profile.selectors.ts
│   │   │   └── app.selectors.ts
│   │   └── 📁 middleware/
│   │       ├── api.middleware.ts
│   │       ├── cache.middleware.ts
│   │       ├── analytics.middleware.ts
│   │       ├── offline.middleware.ts
│   │       ├── logger.middleware.ts
│   │       └── persistence.middleware.ts
│   ├── 📁 hooks/
│   │   ├── useAuth.ts
│   │   ├── useClaims.ts
│   │   ├── useSearch.ts
│   │   ├── useNotifications.ts
│   │   ├── useDashboard.ts
│   │   ├── useOffline.ts
│   │   ├── useDebounce.ts
│   │   ├── useNetworkStatus.ts
│   │   ├── useAppState.ts
│   │   ├── useBiometrics.ts
│   │   ├── useLocation.ts
│   │   ├── useMedia.ts
│   │   ├── useProfile.ts
│   │   ├── useTheme.ts
│   │   ├── useLocalization.ts
│   │   ├── usePermissions.ts
│   │   └── useDeepLink.ts
│   ├── 📁 utils/
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── constants.ts
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── errorHandler.ts
│   │   ├── permissions.ts
│   │   ├── deepLinkHandler.ts
│   │   ├── shareUtils.ts
│   │   ├── dateUtils.ts
│   │   ├── stringUtils.ts
│   │   ├── arrayUtils.ts
│   │   ├── objectUtils.ts
│   │   └── platformUtils.ts
│   ├── 📁 types/
│   │   ├── auth.types.ts
│   │   ├── claim.types.ts
│   │   ├── verdict.types.ts
│   │   ├── blog.types.ts
│   │   ├── user.types.ts
│   │   ├── navigation.types.ts
│   │   ├── api.types.ts
│   │   ├── common.types.ts
│   │   ├── app.types.ts
│   │   ├── dashboard.types.ts
│   │   └── notification.types.ts
│   ├── 📁 styles/
│   │   ├── index.ts
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   ├── shadows.ts
│   │   ├── animations.ts
│   │   ├── global.styles.ts
│   │   ├── components.styles.ts
│   │   └── screens.styles.ts
│   ├── 📁 performance/
│   │   ├── performance.monitor.ts
│   │   ├── memory.manager.ts
│   │   ├── bundle.analyzer.ts
│   │   ├── performance.utils.ts
│   │   └── performance.types.ts
│   ├── 📁 security/
│   │   ├── encryption.ts
│   │   ├── certificate.pinning.ts
│   │   ├── security.scanner.ts
│   │   ├── security.utils.ts
│   │   └── security.types.ts
│   └── 📁 optimization/
│       ├── image.optimizer.ts
│       ├── bundle.optimizer.ts
│       ├── cache.strategies.ts
│       ├── optimization.utils.ts
│       └── optimization.types.ts
├── 📁 scripts/
│   ├── build.sh
│   ├── deploy.sh
│   ├── generate-icons.sh
│   ├── bundle-analytics.sh
│   ├── cleanup.sh
│   ├── test-setup.sh
│   └── release.sh
├── 📁 tests/
│   ├── 📁 unit/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── services/
│   │   └── store/
│   ├── 📁 integration/
│   │   ├── navigation/
│   │   ├── api/
│   │   ├── state/
│   │   └── screens/
│   ├── 📁 e2e/
│   │   ├── auth.flow.ts
│   │   ├── claims.flow.ts
│   │   ├── search.flow.ts
│   │   ├── dashboard.flow.ts
│   │   ├── profile.flow.ts
│   │   └── app.flow.ts
│   ├── 📁 __mocks__/
│   │   ├── api.mocks.ts
│   │   ├── navigation.mocks.ts
│   │   ├── storage.mocks.ts
│   │   └── device.mocks.ts
│   ├── test-utils.tsx
│   ├── setup.ts
│   └── jest.config.js
├── 📁 .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd.yml
│   │   ├── security.yml
│   │   ├── release.yml
│   │   └── performance.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       ├── feature_request.md
│       └── security_issue.md
├── 📁 fastlane/
│   ├── Appfile
│   ├── Fastfile
│   ├── Matchfile
│   ├── Pluginfile
│   └── 📁 lanes/
│       ├── android.rb
│       ├── ios.rb
│       └── shared.rb
├── 📁 aws/
│   ├── 📁 amplify/
│   │   ├── backend/
│   │   │   ├── auth/
│   │   │   ├── api/
│   │   │   └── storage/
│   │   ├── hooks/
│   │   └── amplify.yml
│   ├── 📁 cloudformation/
│   │   ├── app-sync.yml
│   │   ├── cognito.yml
│   │   ├── s3-cdn.yml
│   │   ├── cloudfront.yml
│   │   └── lambda-functions.yml
│   ├── 📁 scripts/
│   │   ├── deploy-production.sh
│   │   ├── rollback.sh
│   │   ├── monitor.sh
│   │   └── backup.sh
│   └── 📁 ci-cd/
│       ├── build-spec.yml
│       ├── test-spec.yml
│       ├── deploy-spec.yml
│       └── security-spec.yml
├── 📁 monitoring/
│   ├── sentry.config.ts
│   ├── newrelic.config.ts
│   ├── performance.config.ts
│   ├── crashlytics.config.ts
│   └── analytics.config.ts
├── 📁 config/
│   ├── development.json
│   ├── staging.json
│   ├── production.json
│   ├── local.json
│   └── default.json
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── jest.config.js
├── eslint.config.js
├── prettier.config.js
├── .env.example
├── .gitignore
├── README.md
└── react-native.config.js















































































































































































































this is the db i created 
C:\Users\KELLY NYACHIRO>psql -h dpg-d1shosh5pdvs73ahbdog-a.frankfurt-postgres.render.com -U deepkentom -d deepkentom
Password for user deepkentom:
psql (18.0, server 16.9 (Debian 16.9-1.pgdg120+1))
WARNING: Console code page (437) differs from Windows code page (1252)
         8-bit characters might not work correctly. See psql reference
         page "Notes for Windows users" for details.
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_128_GCM_SHA256, compression: off, ALPN: none)
Type "help" for help.

deepkentom=> CREATE SCHEMA hakikisha;
CREATE SCHEMA
deepkentom=> SET search_path TO hakikisha, public;
SET
deepkentom=> SELECT current_schema();
 current_schema
----------------
 hakikisha
(1 row)


deepkentom=> CREATE TABLE hakikisha.users (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     email VARCHAR(255) UNIQUE NOT NULL,
deepkentom(>     phone VARCHAR(20),
deepkentom(>     password_hash VARCHAR(255) NOT NULL,
deepkentom(>     role VARCHAR(20) CHECK (role IN ('user', 'fact_checker', 'admin')) DEFAULT 'user',
deepkentom(>     profile_picture VARCHAR(500),
deepkentom(>     is_verified BOOLEAN DEFAULT FALSE,
deepkentom(>     verification_token VARCHAR(255),
deepkentom(>     registration_status VARCHAR(20) CHECK (registration_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     last_login TIMESTAMP WITH TIME ZONE,
deepkentom(>     login_count INTEGER DEFAULT 0
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.registration_requests (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
deepkentom(>     request_type VARCHAR(20) CHECK (request_type IN ('user', 'fact_checker')) NOT NULL,
deepkentom(>     status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
deepkentom(>     admin_notes TEXT,
deepkentom(>     submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     reviewed_at TIMESTAMP WITH TIME ZONE,
deepkentom(>     reviewed_by UUID REFERENCES hakikisha.users(id)
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.claims (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
deepkentom(>     title VARCHAR(500) NOT NULL,
deepkentom(>     description TEXT NOT NULL,
deepkentom(>     category VARCHAR(50) CHECK (category IN ('politics', 'health', 'education', 'technology', 'entertainment', 'other')) NOT NULL,
deepkentom(>     media_type VARCHAR(20) CHECK (media_type IN ('text', 'image', 'video', 'link')) DEFAULT 'text',
deepkentom(>     media_url VARCHAR(500),
deepkentom(>     status VARCHAR(20) CHECK (status IN ('pending', 'ai_processing', 'human_review', 'ai_approved', 'human_approved', 'published', 'rejected')) DEFAULT 'pending',
deepkentom(>     priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
deepkentom(>     similarity_hash VARCHAR(255),
deepkentom(>     submission_count INTEGER DEFAULT 1,
deepkentom(>     ai_verdict_id UUID,
deepkentom(>     human_verdict_id UUID,
deepkentom(>     assigned_fact_checker_id UUID REFERENCES hakikisha.users(id),
deepkentom(>     is_trending BOOLEAN DEFAULT FALSE,
deepkentom(>     trending_score FLOAT DEFAULT 0.0,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     published_at TIMESTAMP WITH TIME ZONE
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.verdicts (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
deepkentom(>     fact_checker_id UUID NOT NULL REFERENCES hakikisha.users(id),
deepkentom(>     verdict VARCHAR(20) CHECK (verdict IN ('true', 'false', 'misleading', 'unverifiable')) NOT NULL,
deepkentom(>     explanation TEXT NOT NULL,
deepkentom(>     evidence_sources JSONB DEFAULT '[]',
deepkentom(>     confidence_score FLOAT DEFAULT 0.0,
deepkentom(>     is_ai_approved BOOLEAN DEFAULT FALSE,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.ai_verdicts (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
deepkentom(>     verdict VARCHAR(20) CHECK (verdict IN ('true', 'false', 'misleading', 'unverifiable')) NOT NULL,
deepkentom(>     explanation TEXT NOT NULL,
deepkentom(>     confidence_score FLOAT NOT NULL,
deepkentom(>     model_used VARCHAR(100),
deepkentom(>     processing_time INTEGER,
deepkentom(>     evidence_citations JSONB DEFAULT '[]',
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=>  CREATE TABLE hakikisha.blogs (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     title VARCHAR(500) NOT NULL,
deepkentom(>     content TEXT NOT NULL,
deepkentom(>     author_id UUID NOT NULL REFERENCES hakikisha.users(id),
deepkentom(>     category VARCHAR(50) CHECK (category IN ('politics', 'health', 'education', 'technology', 'entertainment', 'trending', 'analysis')) NOT NULL,
deepkentom(>     related_claim_ids UUID[] DEFAULT '{}',
deepkentom(>     is_trending BOOLEAN DEFAULT FALSE,
deepkentom(>     is_ai_generated BOOLEAN DEFAULT FALSE,
deepkentom(>     view_count INTEGER DEFAULT 0,
deepkentom(>     published_at TIMESTAMP WITH TIME ZONE,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.notifications (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
deepkentom(>     title VARCHAR(255) NOT NULL,
deepkentom(>     message TEXT NOT NULL,
deepkentom(>     type VARCHAR(50) CHECK (type IN ('claim_status', 'registration', 'verdict', 'system', 'trending')),
deepkentom(>     is_read BOOLEAN DEFAULT FALSE,
deepkentom(>     related_entity_type VARCHAR(50),
deepkentom(>     related_entity_id UUID,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.search_logs (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     user_id UUID REFERENCES hakikisha.users(id),
deepkentom(>     query VARCHAR(500) NOT NULL,
deepkentom(>     search_type VARCHAR(20) CHECK (search_type IN ('claims', 'verdicts', 'blogs', 'all')) DEFAULT 'all',
deepkentom(>     results_count INTEGER DEFAULT 0,
deepkentom(>     filters_applied JSONB DEFAULT '{}',
deepkentom(>     search_duration INTEGER,
deepkentom(>     ip_address INET,
deepkentom(>     user_agent TEXT,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.user_sessions (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
deepkentom(>     session_token VARCHAR(500) UNIQUE NOT NULL,
deepkentom(>     ip_address INET,
deepkentom(>     user_agent TEXT,
deepkentom(>     login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     is_active BOOLEAN DEFAULT TRUE,
deepkentom(>     expires_at TIMESTAMP WITH TIME ZONE NOT NULL
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.admin_activities (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     admin_id UUID NOT NULL REFERENCES hakikisha.users(id),
deepkentom(>     action_type VARCHAR(100) NOT NULL,
deepkentom(>     description TEXT NOT NULL,
deepkentom(>     target_entity_type VARCHAR(50),
deepkentom(>     target_entity_id UUID,
deepkentom(>     ip_address INET,
deepkentom(>     user_agent TEXT,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.fact_checker_activities (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     fact_checker_id UUID NOT NULL REFERENCES hakikisha.users(id),
deepkentom(>     claim_id UUID NOT NULL REFERENCES hakikisha.claims(id),
deepkentom(>     action_type VARCHAR(100) NOT NULL,
deepkentom(>     duration_minutes INTEGER,
deepkentom(>     verdict_submitted BOOLEAN DEFAULT FALSE,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE TABLE hakikisha.trending_topics (
deepkentom(>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
deepkentom(>     topic_name VARCHAR(255) NOT NULL,
deepkentom(>     category VARCHAR(50) NOT NULL,
deepkentom(>     claim_count INTEGER DEFAULT 0,
deepkentom(>     engagement_score FLOAT DEFAULT 0.0,
deepkentom(>     trend_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
deepkentom(>     trend_end_time TIMESTAMP WITH TIME ZONE,
deepkentom(>     is_active BOOLEAN DEFAULT TRUE,
deepkentom(>     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
deepkentom(> );
CREATE TABLE
deepkentom=> CREATE INDEX idx_users_email ON hakikisha.users(email);
CREATE INDEX
deepkentom=> CREATE INDEX idx_users_role ON hakikisha.users(role);
CREATE INDEX
deepkentom=> CREATE INDEX idx_users_registration_status ON hakikisha.users(registration_status);
CREATE INDEX
deepkentom=> CREATE INDEX idx_claims_user_id ON hakikisha.claims(user_id);
CREATE INDEX
deepkentom=> CREATE INDEX idx_claims_status ON hakikisha.claims(status);
CREATE INDEX
deepkentom=> CREATE INDEX idx_claims_category ON hakikisha.claims(category);
CREATE INDEX
deepkentom=> CREATE INDEX idx_claims_priority ON hakikisha.claims(priority);
CREATE INDEX
deepkentom=> CREATE INDEX idx_claims_created_at ON hakikisha.claims(created_at);
CREATE INDEX
deepkentom=> CREATE INDEX idx_claims_trending ON hakikisha.claims(is_trending);
CREATE INDEX
deepkentom=> CREATE INDEX idx_verdicts_claim_id ON hakikisha.verdicts(claim_id);
CREATE INDEX
deepkentom=> CREATE INDEX idx_verdicts_fact_checker_id ON hakikisha.verdicts(fact_checker_id);
CREATE INDEX
deepkentom=> CREATE INDEX idx_search_logs_user_id ON hakikisha.search_logs(user_id);
CREATE INDEX
deepkentom=> CREATE INDEX idx_search_logs_created_at ON hakikisha.search_logs(created_at);
CREATE INDEX
deepkentom=> CREATE INDEX idx_search_logs_query ON hakikisha.search_logs(query);
CREATE INDEX
deepkentom=> \q

C:\Users\KELLY NYACHIRO>psql -h dpg-d1shosh5pdvs73ahbdog-a.frankfurt-postgres.render.com -U deepkentom -d deepkentom
Password for user deepkentom:
psql (18.0, server 16.9 (Debian 16.9-1.pgdg120+1))
WARNING: Console code page (437) differs from Windows code page (1252)
         8-bit characters might not work correctly. See psql reference
         page "Notes for Windows users" for details.
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_128_GCM_SHA256, compression: off, ALPN: none)
Type "help" for help.

deepkentom=> SET search_path TO hakikisha, public;
SET
deepkentom=> CREATE INDEX idx_search_logs_user_id ON hakikisha.search_logs(user_id);
ERROR:  relation "idx_search_logs_user_id" already exists
deepkentom=> CREATE INDEX idx_search_logs_created_at ON hakikisha.search_logs(created_at);
ERROR:  relation "idx_search_logs_created_at" already exists
deepkentom=> CREATE INDEX idx_search_logs_query ON hakikisha.search_logs(query);
ERROR:  relation "idx_search_logs_query" already exists
deepkentom=> CREATE INDEX idx_notifications_user_id ON hakikisha.notifications(user_id);
CREATE INDEX
deepkentom=> CREATE INDEX idx_notifications_is_read ON hakikisha.notifications(is_read);
CREATE INDEX
deepkentom=> CREATE INDEX idx_notifications_created_at ON hakikisha.notifications(created_at);
CREATE INDEX
deepkentom=> INSERT INTO hakikisha.users (email, password_hash, role, is_verified, registration_status)
deepkentom-> VALUES ('kellynyachiro@gmail.com', 'Kelly@40125507', 'admin', true, 'approved');
INSERT 0 1
deepkentom=> SELECT table_name
deepkentom-> FROM information_schema.tables
deepkentom-> WHERE table_schema = 'hakikisha'
deepkentom-> ORDER BY table_name;
       table_name
-------------------------
 admin_activities
 ai_verdicts
 blogs
 claims
 fact_checker_activities
 notifications
 registration_requests
 search_logs
 trending_topics
 user_sessions
 users
 verdicts
(12 rows)


deepkentom=> \q

C:\Users\KELLY NYACHIRO>





this is the oreder of the app development 
## 🚀 BUILD ORDER - STEP BY STEP DEVELOPMENT

### **PHASE 1: SETUP & CONFIGURATION (Week 1)**
```
1. src/app/app.config.ts
2. src/app/theme.config.ts
3. src/types/auth.types.ts
4. src/types/claim.types.ts
5. src/utils/constants.ts
6. src/utils/helpers.ts
7. src/styles/colors.ts
8. src/styles/spacing.ts
9. src/styles/typography.ts
10. src/styles/global.styles.ts
```

### **PHASE 2: API & STATE MANAGEMENT (Week 1)**
```
11. src/services/api/api.client.ts
12. src/services/api/auth.api.ts
13. src/store/index.ts
14. src/store/slices/auth.slice.ts
15. src/store/slices/claims.slice.ts
16. src/hooks/useAuth.ts
17. src/hooks/useClaims.ts
```

### **PHASE 3: AUTHENTICATION FLOW (Week 2)**
```
18. src/components/common/Button.tsx
19. src/components/common/Input.tsx
20. src/components/common/Loading.tsx
21. src/components/auth/LoginForm.tsx
22. src/components/auth/RegisterForm.tsx
23. src/screens/auth/LoginScreen.tsx
24. src/screens/auth/RegisterScreen.tsx
25. src/navigation/AuthNavigator.tsx
26. src/navigation/AppNavigator.tsx
27. App.tsx
```

### **PHASE 4: MAIN APP NAVIGATION (Week 2)**
```
28. src/components/common/Card.tsx
29. src/components/common/SearchBar.tsx
30. src/components/common/Badge.tsx
31. src/navigation/TabNavigator.tsx
32. src/navigation/MainNavigator.tsx
33. src/screens/main/HomeScreen.tsx
34. src/screens/main/SearchScreen.tsx
35. src/screens/main/ProfileScreen.tsx
```

### **PHASE 5: CLAIMS FEATURES (Week 3)**
```
36. src/services/api/claims.api.ts
37. src/components/claims/ClaimCard.tsx
38. src/components/claims/ClaimForm.tsx
39. src/components/claims/CategorySelector.tsx
40. src/components/claims/ClaimStatus.tsx
41. src/screens/claims/SubmitClaimScreen.tsx
42. src/screens/claims/ClaimDetailScreen.tsx
43. src/screens/claims/MyClaimsScreen.tsx
```

### **PHASE 6: SEARCH & VERDICTS (Week 3)**
```
44. src/services/api/search.api.ts
45. src/services/api/verdicts.api.ts
46. src/components/search/SearchFilters.tsx
47. src/components/search/SearchResults.tsx
48. src/components/verdicts/VerdictCard.tsx
49. src/components/verdicts/VerdictBadge.tsx
50. src/screens/verdicts/VerdictDetailScreen.tsx
51. src/screens/verdicts/VerdictListScreen.tsx
```

### **PHASE 7: DASHBOARD (Fact-Checkers) (Week 4)**
```
52. src/services/api/dashboard.api.ts
53. src/components/dashboard/StatsCard.tsx
54. src/components/dashboard/ClaimQueue.tsx
55. src/components/dashboard/QuickActions.tsx
56. src/screens/dashboard/DashboardHomeScreen.tsx
57. src/screens/dashboard/ClaimReviewScreen.tsx
58. src/screens/dashboard/VerdictSubmissionScreen.tsx
59. src/navigation/DashboardNavigator.tsx
```

### **PHASE 8: ADMIN FEATURES (Week 4)**
```
60. src/services/api/admin.api.ts
61. src/screens/admin/AdminDashboardScreen.tsx
62. src/screens/admin/RegistrationApprovalScreen.tsx
63. src/screens/admin/UserManagementScreen.tsx
64. src/navigation/AdminNavigator.tsx
```

### **PHASE 9: PROFILE & SETTINGS (Week 5)**
```
65. src/services/api/profile.api.ts
66. src/components/profile/ProfileHeader.tsx
67. src/screens/profile/EditProfileScreen.tsx
68. src/screens/profile/SettingsScreen.tsx
69. src/screens/profile/FactCheckerApplicationScreen.tsx
```

### **PHASE 10: NOTIFICATIONS & BLOGS (Week 5)**
```
70. src/services/api/notifications.api.ts
71. src/services/api/blogs.api.ts
72. src/components/notifications/NotificationItem.tsx
73. src/components/blog/BlogCard.tsx
74. src/screens/blogs/BlogListScreen.tsx
75. src/screens/blogs/BlogDetailScreen.tsx
76. src/screens/main/NotificationsScreen.tsx
```

### **PHASE 11: OFFLINE & MEDIA (Week 6)**
```
77. src/services/storage/asyncStorage.ts
78. src/services/media/imagePicker.service.ts
79. src/services/offline/offlineQueue.ts
80. src/services/push/notification.service.ts
```

## 🎯 START CODING ORDER:

### **Week 1: Foundation**
```
Day 1: Create config files (1-10)
Day 2: Create API services (11-13, 16)
Day 3: Create Redux slices (14-15)
Day 4: Create basic components (18-21)
Day 5: Create auth screens (22-24)
Day 6: Setup navigation (25-27)
Day 7: Test authentication flow
```

### **Week 2: Main App**
```
Day 8: Create main navigation (28-32)
Day 9: Create home & search screens (33-34)
Day 10: Create profile screen (35)
Day 11: Create claims API (36)
Day 12: Create claim components (37-40)
Day 13: Create claim screens (41-43)
Day 14: Test claims flow
```

### **Week 3: Core Features**
```
Day 15: Create search & verdict APIs (44-45)
Day 16: Create search components (46-47)
Day 17: Create verdict components (48-50)
Day 18: Create verdict screens (51)
Day 19: Test search & verdicts
Day 20: Start dashboard features (52-55)
Day 21: Continue dashboard (56-59)
```

**Continue this pattern for remaining weeks.**

## 📱 IMMEDIATE FILES TO CREATE (First 2 Days):

1. **Configuration & Types**
2. **API Client & Auth API** 
3. **Redux Store & Auth Slice**
4. **Basic Components (Button, Input, Loading)**
5. **Login/Register Screens**
6. **Navigation Setup**
7. **App.tsx**

Start with these 7 core areas and you'll have a working authentication flow by end of Week 1! 🚀

Would you like me to provide the complete code for any specific phase?



# HAKIKISHA - Complete Project Organization & Development Roadmap

## 📋 PROJECT OVERVIEW

### **Current Status**
- ✅ **Backend Structure**: Complete application architecture
- ✅ **Mobile App Structure**: Comprehensive React Native setup
- ✅ **Production Database**: Live PostgreSQL instance on Render
- ✅ **Admin User**: Initial admin account created
- ✅ **Development Plan**: Step-by-step build order

---

## 🗄️ DATABASE ARCHITECTURE (Live on Render)

### **Schema: hakikisha**
**12 Core Tables Created:**

1. **users** - User accounts and profiles
2. **registration_requests** - User registration approvals
3. **claims** - Fact-checking claims with workflow tracking
4. **verdicts** - Human fact-checker verdicts
5. **ai_verdicts** - AI-generated verdicts
6. **blogs** - Educational content and analysis
7. **notifications** - User notification system
8. **search_logs** - Search analytics and queries
9. **user_sessions** - Session management
10. **admin_activities** - Admin action logging
11. **fact_checker_activities** - Fact-checker performance tracking
12. **trending_topics** - Trending content detection

### **Key Database Features**
- **UUID Primary Keys** for scalability
- **JSONB columns** for flexible data storage
- **Comprehensive indexing** for performance
- **Foreign key constraints** for data integrity
- **Role-based access control** implementation

---

## 🚀 DEVELOPMENT ROADMAP

### **PHASE 1: FOUNDATION SETUP (Week 1)**
**Goal**: Working authentication system

#### Core Configuration Files
- App configuration and theming
- TypeScript type definitions
- Utility functions and constants
- Global styling system

#### Authentication System
- API client setup with interceptors
- Redux store configuration
- Auth slice for state management
- Custom hooks for auth operations

#### UI Components
- Basic components (Button, Input, Loading)
- Authentication forms
- Navigation structure
- App entry point

### **PHASE 2: CORE FEATURES (Weeks 2-3)**
**Goal**: Main app functionality

#### Navigation & Layout
- Tab-based navigation
- Main app screens (Home, Search, Profile)
- Role-based navigation flows

#### Claims Management
- Claim submission system
- Claim listing and details
- Media upload handling
- Status tracking

#### Search & Discovery
- Advanced search functionality
- Filtering and sorting
- Verdict display system
- Search analytics

### **PHASE 3: ADVANCED FEATURES (Weeks 4-5)**
**Goal**: Role-specific functionality

#### Fact-Checker Dashboard
- Claim queue management
- Verdict submission system
- Performance analytics
- Workload management

#### Admin System
- User management
- Registration approvals
- System analytics
- Content moderation

#### User Experience
- Profile management
- Notification system
- Blog content system
- Settings and preferences

### **PHASE 4: POLISH & OPTIMIZATION (Week 6)**
**Goal**: Production-ready app

#### Technical Enhancements
- Offline capability
- Media processing
- Push notifications
- Performance optimization

---

## 🏗️ SYSTEM ARCHITECTURE

### **Backend Structure**
```
hakikisha-backend/
├── Configurations (Database, Auth, AI, Cache)
├── Controllers (API endpoints for all features)
├── Middleware (Auth, Validation, Rate limiting)
├── Models (Database schemas and relationships)
├── Services (Business logic and external integrations)
├── Utilities (Helpers, validators, AI processors)
├── Workflows (Business process automation)
├── Queues (Background job processing)
└── Scripts (Database, AI training, maintenance)
```

### **Mobile App Structure**
```
hakikisha-mobile/
├── App Configuration (Theming, navigation, features)
├── Components (Reusable UI components by feature)
├── Screens (App pages and user interfaces)
├── Services (API, storage, media, analytics)
├── State Management (Redux store, slices, middleware)
├── Hooks (Custom React hooks for logic reuse)
├── Utilities (Helpers, formatters, validators)
└── Types (TypeScript definitions)
```

---

## 🔄 WORKFLOW SYSTEMS

### **User Registration Flow**
1. **Sign Up** → User submits registration
2. **Admin Review** → Manual approval process
3. **Email Verification** → Account activation
4. **Platform Access** → Full feature access

### **Claim Verification Flow**
1. **Submission** → User submits claim for fact-checking
2. **Dashboard Assignment** → Available to fact-checkers
3. **Dual Verification**:
   - **AI Path**: AI analysis → Human review → Publication
   - **Human Path**: Direct fact-checker review → Publication
4. **Notification** → User receives verdict
5. **Publication** → Searchable in database

### **Content Management Flow**
1. **Trending Detection** → System identifies popular claims
2. **Blog Generation** → AI/human creates educational content
3. **Publication** → Content available in blogs section
4. **Engagement Tracking** → Analytics and performance metrics

---

## 🎯 KEY FEATURES BY USER ROLE

### **Regular Users**
- Submit claims for fact-checking
- Search existing verdicts and blogs
- Track personal claim status
- Receive notifications
- Browse trending content

### **Fact-Checkers**
- Access claim review dashboard
- Submit verdicts with evidence
- Manage workload and assignments
- Track performance metrics
- Create educational content

### **Administrators**
- Approve user registrations
- Manage user accounts and roles
- Monitor system analytics
- Moderate content
- Configure system settings

---

## 🔧 TECHNICAL SPECIFICATIONS

### **Backend API Endpoints**
- **Authentication**: Register, login, logout, profile
- **Claims**: Submit, list, details, trending
- **Search**: Claims, verdicts, blogs, suggestions
- **Dashboard**: Fact-checker queue, assignments, analytics
- **Admin**: User management, approvals, system stats
- **Blogs**: Create, list, details, trending

### **Mobile App Features**
- **Cross-platform** (iOS & Android)
- **Offline capability** with sync
- **Media upload** (images, videos)
- **Push notifications**
- **Biometric authentication**
- **Dark/light theme support**
- **Multi-language support**

### **Performance Targets**
- **5M+ user scalability**
- **Real-time dashboard updates**
- **Fast search response times**
- **Efficient media processing**
- **Reliable offline operation**

---

## 📊 SUCCESS METRICS

### **Development Progress**
- ✅ Database schema implemented
- ✅ Backend structure defined
- ✅ Mobile app architecture planned
- ✅ Development roadmap established
- 🚧 Implementation in progress

### **Next Immediate Steps**
1. Create mobile app configuration files
2. Set up API client and authentication
3. Build basic UI components
4. Implement login/register screens
5. Establish navigation structure

---

## 🎉 READY TO START DEVELOPMENT

Your project is **perfectly organized** with:
- **Complete database schema** live in production
- **Structured backend architecture** for scalability
- **Comprehensive mobile app plan** with React Native
- **Clear development roadmap** with phased approach
- **Well-defined user workflows** and role permissions

**Next Action**: Begin with Phase 1 files as outlined in your build order. The foundation is solid and ready for implementation! 🚀