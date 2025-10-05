# Destination Admin Management System - Developer Guide

## Architecture Overview

The Destination Admin Management System is built using Next.js 14 with TypeScript, MongoDB, and a component-based architecture. The system follows a modular design with clear separation between admin and public interfaces.

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Testing**: Vitest, React Testing Library
- **AI Integration**: OpenAI API (configurable)

## Project Structure

```
src/
├── app/
│   ├── admin/destinations/          # Admin destination pages
│   ├── destinations/                # Public destination pages
│   └── api/
│       ├── admin/destinations/      # Admin API endpoints
│       └── destinations/            # Public API endpoints
├── components/
│   ├── admin/                       # Admin components
│   └── destinations/                # Public components
├── models/                          # Database models
├── lib/                            # Utility functions
└── types/                          # TypeScript type definitions
```

## Database Schema

### Destination Model

```typescript
interface IDestination {
  _id: string;
  name: string;
  slug: string;
  country: string;
  region: string;
  description: string;
  heroImage?: string;
  gradientColors?: string;
  
  sections: {
    overview: DestinationSection;
    accommodation: DestinationSection;
    attractions: DestinationSection;
    beaches: DestinationSection;
    nightlife: DestinationSection;
    dining: DestinationSection;
    practical: DestinationSection;
  };
  
  quickFacts?: {
    population?: string;
    language?: string;
    currency?: string;
    timeZone?: string;
    airport?: string;
    flightTime?: string;
    climate?: string;
    bestTime?: string;
  };
  
  // Relationships
  relatedOffers?: ObjectId[];
  relatedActivities?: ObjectId[];
  relatedDestinations?: ObjectId[];
  
  // Publishing
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  scheduledPublishAt?: Date;
  
  // AI and automation
  aiGenerated: boolean;
  aiGenerationPrompt?: string;
  aiGenerationDate?: Date;
  
  // Audit fields
  createdBy: ObjectId;
  lastModifiedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Section Schema

```typescript
interface DestinationSection {
  title: string;
  content: string;
  images?: string[];
  highlights?: string[];
  tips?: string[];
  lastModified: Date;
  aiGenerated: boolean;
}
```

## API Endpoints

### Public API

#### GET /api/destinations
Retrieve published destinations with filtering and pagination.

**Query Parameters:**
- `region` - Filter by region
- `search` - Search in name, description, content
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "destinations": [
    {
      "id": "benidorm",
      "name": "Benidorm",
      "slug": "benidorm",
      "country": "Spain",
      "region": "Costa Blanca",
      "description": "...",
      "image": "...",
      "gradientColors": "from-blue-500 to-orange-400",
      "highlights": ["..."],
      "climate": "Mediterranean",
      "bestTime": "April to October",
      "flightTime": "2.5 hours from UK"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /api/destinations/[slug]
Get individual destination details.

**Response:**
```json
{
  "id": "benidorm",
  "name": "Benidorm",
  "slug": "benidorm",
  "country": "Spain",
  "region": "Costa Blanca",
  "description": "...",
  "heroImage": "...",
  "gradientColors": "from-blue-500 to-orange-400",
  "sections": {
    "overview": {
      "title": "Overview",
      "content": "<p>...</p>",
      "highlights": ["..."],
      "tips": ["..."],
      "images": ["..."]
    }
  },
  "quickFacts": {
    "population": "70,000",
    "language": "Spanish",
    "currency": "EUR"
  },
  "breadcrumb": [
    {"name": "Destinations", "href": "/destinations"},
    {"name": "Benidorm", "href": "/destinations/benidorm"}
  ]
}
```

#### GET /api/destinations/[id]/related
Get related offers, activities, and destinations.

**Response:**
```json
{
  "offers": [...],
  "activities": [...],
  "destinations": [...]
}
```

### Admin API

#### GET /api/admin/destinations
List all destinations (admin only).

**Query Parameters:**
- `status` - Filter by status
- `search` - Search query
- `page` - Page number
- `limit` - Items per page
- `sortBy` - Sort field
- `sortOrder` - asc/desc

#### POST /api/admin/destinations
Create new destination.

**Request Body:**
```json
{
  "name": "New Destination",
  "country": "Spain",
  "region": "Costa Blanca",
  "description": "...",
  "heroImage": "...",
  "gradientColors": "from-blue-500 to-orange-400",
  "sections": {...},
  "quickFacts": {...}
}
```

#### PUT /api/admin/destinations/[id]
Update existing destination.

#### DELETE /api/admin/destinations/[id]
Delete destination (admin only).

#### POST /api/admin/destinations/[id]/publish
Publish destination.

**Request Body:**
```json
{
  "comment": "Ready for publication",
  "scheduleDate": "2024-01-01T00:00:00Z" // Optional
}
```

#### GET /api/admin/destinations/stats
Get destination statistics.

**Response:**
```json
{
  "total": 15,
  "published": 10,
  "draft": 3,
  "archived": 2,
  "recentlyUpdated": 5
}
```

#### GET /api/admin/destinations/activity
Get recent destination activity.

#### GET /api/admin/destinations/[id]/suggestions
Get AI-powered content suggestions.

#### POST /api/admin/destinations/migrate
Run content migration (admin only).

## Component Architecture

### Admin Components

#### DestinationManager
Main management interface for listing and organizing destinations.

**Props:**
```typescript
interface DestinationManagerProps {
  initialDestinations?: IDestination[];
  onDestinationSelect?: (destination: IDestination) => void;
  className?: string;
}
```

#### DestinationForm
Form component for creating and editing destinations.

**Props:**
```typescript
interface DestinationFormProps {
  destination?: IDestination;
  onSave: (destination: Partial<IDestination>) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  mode: 'create' | 'edit';
}
```

#### DestinationPreview
Preview component with responsive design testing.

**Props:**
```typescript
interface DestinationPreviewProps {
  destination: IDestination;
  className?: string;
  mode?: 'standalone' | 'side-by-side';
  onDestinationChange?: (destination: IDestination) => void;
  isEditing?: boolean;
}
```

#### RelationshipManager
Component for managing content relationships.

**Props:**
```typescript
interface RelationshipManagerProps {
  destination: IDestination;
  onUpdate: (relationships: {
    relatedOffers: string[];
    relatedActivities: string[];
    relatedDestinations: string[];
  }) => void;
  className?: string;
}
```

### Public Components

#### RelatedContent
Displays related offers, activities, and destinations on public pages.

**Props:**
```typescript
interface RelatedContentProps {
  destinationId: string;
  destinationName: string;
  className?: string;
}
```

## Authentication & Authorization

### Role-Based Access Control

- **Admin**: Full access to all destinations and management features
- **Editor**: Can create and edit destinations, requires approval for publishing
- **Viewer**: Read-only access to admin interface

### API Security

All admin endpoints require authentication:

```typescript
const session = await getServerSession(authOptions);

if (!session?.user?.id || session.user.role !== 'admin') {
  return NextResponse.json(
    { error: 'Admin access required' },
    { status: 403 }
  );
}
```

## AI Integration

### Content Generation

The system integrates with AI services for content generation:

```typescript
// lib/ai-content-generator.ts
export async function generateDestinationContent(
  destination: Partial<IDestination>,
  options: AIGenerationOptions
): Promise<GeneratedContent> {
  // AI integration logic
}
```

### Configuration

AI features can be configured via environment variables:

```env
OPENAI_API_KEY=your_api_key
AI_MODEL=gpt-4
AI_GENERATION_ENABLED=true
```

## Testing

### Unit Tests

Components are tested using Vitest and React Testing Library:

```typescript
// Example test
describe('DestinationForm', () => {
  it('should render form fields', () => {
    render(<DestinationForm onSave={mockSave} onCancel={mockCancel} mode="create" />);
    
    expect(screen.getByLabelText('Destination Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });
});
```

### Integration Tests

API endpoints are tested with mock data:

```typescript
// Example API test
describe('/api/admin/destinations', () => {
  it('should create destination', async () => {
    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.destination.name).toBe('Test Destination');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- DestinationForm

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Performance Optimization

### Database Optimization

- **Indexes**: Created on frequently queried fields (slug, status, country, region)
- **Pagination**: Implemented for large datasets
- **Selective Population**: Only populate required relationships
- **Lean Queries**: Use `.lean()` for read-only operations

### Frontend Optimization

- **Code Splitting**: Components are lazy-loaded where appropriate
- **Image Optimization**: Automatic image optimization and multiple formats
- **Caching**: API responses cached where appropriate
- **Debouncing**: Search and auto-save operations are debounced

### Caching Strategy

```typescript
// Example caching implementation
const getCachedDestinations = async (key: string) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const destinations = await Destination.find({}).lean();
  await redis.setex(key, 300, JSON.stringify(destinations)); // 5 min cache
  
  return destinations;
};
```

## Deployment

### Environment Variables

Required environment variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/infinity-weekends

# Authentication
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000

# AI Integration (optional)
OPENAI_API_KEY=your_openai_key

# File Upload (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Build Process

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Build for production
npm run build

# Start production server
npm start
```

### Database Migrations

Migration scripts are located in `src/lib/migrations/`:

```bash
# Run migrations
node scripts/migrate.js

# Rollback migrations
node scripts/migrate.js rollback
```

## Monitoring & Logging

### Error Handling

Comprehensive error handling is implemented throughout:

```typescript
try {
  const result = await someOperation();
  return NextResponse.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'Operation failed', details: error.message },
    { status: 500 }
  );
}
```

### Logging

Application logs include:
- API request/response logs
- Database operation logs
- Error logs with stack traces
- Performance metrics

### Health Checks

Health check endpoints for monitoring:

```typescript
// /api/health
export async function GET() {
  const dbStatus = await checkDatabaseConnection();
  const aiStatus = await checkAIService();
  
  return NextResponse.json({
    status: 'healthy',
    database: dbStatus,
    ai: aiStatus,
    timestamp: new Date().toISOString()
  });
}
```

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write tests for new features
- Document public APIs

### Git Workflow

1. Create feature branch from `main`
2. Implement feature with tests
3. Submit pull request
4. Code review and approval
5. Merge to `main`

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017/infinity-weekends"

# Verify environment variables
echo $MONGODB_URI
```

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- --run DestinationForm.test.tsx
```

### Performance Issues

#### Slow API Responses
- Check database indexes
- Review query complexity
- Monitor database performance
- Consider caching strategies

#### Memory Leaks
- Monitor Node.js memory usage
- Check for unclosed database connections
- Review event listener cleanup
- Use memory profiling tools

## Security Considerations

### Input Validation

All user inputs are validated:

```typescript
const destinationSchema = z.object({
  name: z.string().min(2).max(100),
  country: z.string().min(2).max(50),
  region: z.string().min(2).max(50),
  description: z.string().min(10).max(1000)
});
```

### XSS Prevention

- HTML content is sanitized
- User inputs are escaped
- CSP headers implemented
- React's built-in XSS protection

### Authentication Security

- Secure session management
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- CSRF protection

### File Upload Security

- File type validation
- Size limits enforced
- Virus scanning (if configured)
- Secure file storage

## Future Enhancements

### Planned Features

- **Multi-language Support**: Internationalization for global destinations
- **Advanced Analytics**: Detailed performance metrics and insights
- **Workflow Automation**: Advanced publishing workflows and approvals
- **Content Versioning**: Enhanced version control and collaboration
- **API Rate Limiting**: Advanced rate limiting and quotas
- **Real-time Collaboration**: Live editing and collaboration features

### Technical Debt

- Migrate to React Server Components where appropriate
- Implement more comprehensive caching
- Add more granular permissions system
- Improve error boundary implementation
- Enhance accessibility compliance

---

*For user documentation, see the [Destination Admin Management Guide](./destination-admin-management-guide.md)*
*For quick reference, see the [Quick Reference Guide](./destination-admin-quick-reference.md)*