# Activities Module Design Document

## Overview

The Activities Module is designed as a comprehensive system that integrates seamlessly with the existing Infinity Weekends platform. It follows the established patterns of the current codebase while introducing new functionality for activity management, package building, and PDF generation. The system is built using Next.js 14 with TypeScript, MongoDB for data persistence, and follows the existing authentication and authorization patterns.

## Architecture

### System Components

```mermaid
graph TB
    A[Client Browser] --> B[Next.js Frontend]
    B --> C[API Routes]
    C --> D[MongoDB Database]
    C --> E[PDF Generation Service]
    C --> F[CSV Processing Service]
    
    subgraph "Frontend Components"
        B1[Activity Search]
        B2[Activity Details]
        B3[Package Builder]
        B4[Admin Upload]
        B5[Package Manager]
    end
    
    subgraph "API Endpoints"
        C1[/api/activities]
        C2[/api/admin/activities]
        C3[/api/packages]
        C4[/api/packages/export]
    end
    
    subgraph "Database Collections"
        D1[activities]
        D2[packages]
        D3[users]
    end
    
    B --> B1
    B --> B2
    B --> B3
    B --> B4
    B --> B5
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    
    D --> D1
    D --> D2
    D --> D3
```

### Data Flow

1. **CSV Upload Flow**: Admin uploads CSV → Validation → Database insertion → Confirmation
2. **Activity Search Flow**: Agent searches → API query → Filtered results → Display
3. **Package Building Flow**: Agent selects activities → Package state management → Cost calculation
4. **PDF Export Flow**: Package data → PDF generation → File download

## Components and Interfaces

### Data Models

#### Activity Model
```typescript
interface Activity {
  _id: string;
  name: string;
  category: ActivityCategory;
  location: string;
  pricePerPerson: number;
  minPersons: number;
  maxPersons: number;
  availableFrom: Date;
  availableTo: Date;
  duration: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
}

enum ActivityCategory {
  EXCURSION = 'excursion',
  SHOW = 'show',
  TRANSPORT = 'transport',
  DINING = 'dining',
  ADVENTURE = 'adventure',
  CULTURAL = 'cultural',
  NIGHTLIFE = 'nightlife',
  SHOPPING = 'shopping'
}
```

#### Package Model
```typescript
interface ActivityPackage {
  _id: string;
  name: string;
  activities: PackageActivity[];
  totalCost: number;
  numberOfPersons: number;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'finalized';
  clientName?: string;
  notes?: string;
}

interface PackageActivity {
  activityId: ObjectId;
  activity: Activity;
  quantity: number;
  subtotal: number;
}
```

### Frontend Components

#### 1. ActivitySearch Component
- **Purpose**: Main search and filtering interface
- **Features**: 
  - Search input with debounced queries
  - Filter dropdowns (location, category, price range, dates)
  - Results grid with pagination
  - Loading states and error handling
- **Props**: `onActivitySelect: (activity: Activity) => void`

#### 2. ActivityCard Component
- **Purpose**: Display individual activity in search results
- **Features**:
  - Activity image placeholder
  - Key information display (name, price, duration, location)
  - Category badge
  - "Add to Package" button
  - Availability indicator
- **Props**: `activity: Activity, onAddToPackage: (activity: Activity) => void`

#### 3. ActivityDetails Component
- **Purpose**: Full activity information display
- **Features**:
  - Complete activity details
  - Availability calendar view
  - Pricing calculator for different group sizes
  - Add to package functionality
- **Props**: `activityId: string`

#### 4. PackageBuilder Component
- **Purpose**: Manage current package being built
- **Features**:
  - Selected activities list
  - Quantity adjustments
  - Real-time cost calculation
  - Remove activities functionality
  - Save/Export actions
- **State**: Manages current package state

#### 5. PackageManager Component
- **Purpose**: View and manage saved packages
- **Features**:
  - List of saved packages
  - Load/Edit/Delete operations
  - Package preview
  - Export functionality
- **Props**: None (fetches user's packages)

#### 6. AdminActivityUpload Component
- **Purpose**: CSV upload interface for admins
- **Features**:
  - File upload with drag-and-drop
  - Upload progress indicator
  - Validation error display
  - Import summary
- **Props**: `onUploadComplete: () => void`

#### 7. AdminActivityManager Component
- **Purpose**: Manage individual activities
- **Features**:
  - Activity table with search/filter
  - Inline editing
  - Bulk operations
  - Activity status management
- **Props**: None

### API Endpoints

#### Public Activity Endpoints

**GET /api/activities**
- Query parameters: `search`, `location`, `category`, `priceMin`, `priceMax`, `dateFrom`, `dateTo`, `page`, `limit`
- Returns: Paginated activity results with filters applied
- Authentication: Required (travel agent)

**GET /api/activities/[id]**
- Returns: Single activity details
- Authentication: Required (travel agent)

**GET /api/activities/locations**
- Returns: List of unique locations for filter dropdown
- Authentication: Required (travel agent)

**GET /api/activities/categories**
- Returns: List of available categories
- Authentication: Required (travel agent)

#### Package Management Endpoints

**POST /api/packages**
- Body: Package data
- Returns: Created package
- Authentication: Required (travel agent)

**GET /api/packages**
- Query parameters: `status`, `page`, `limit`
- Returns: User's packages
- Authentication: Required (travel agent)

**PUT /api/packages/[id]**
- Body: Updated package data
- Returns: Updated package
- Authentication: Required (travel agent, own packages only)

**DELETE /api/packages/[id]**
- Returns: Success confirmation
- Authentication: Required (travel agent, own packages only)

**POST /api/packages/[id]/export**
- Returns: PDF file stream
- Authentication: Required (travel agent, own packages only)

#### Admin Activity Endpoints

**POST /api/admin/activities/upload**
- Body: FormData with CSV file
- Returns: Upload results with validation errors
- Authentication: Required (admin)

**GET /api/admin/activities**
- Query parameters: `search`, `status`, `page`, `limit`
- Returns: All activities for admin management
- Authentication: Required (admin)

**PUT /api/admin/activities/[id]**
- Body: Updated activity data
- Returns: Updated activity
- Authentication: Required (admin)

**DELETE /api/admin/activities/[id]**
- Returns: Success confirmation
- Authentication: Required (admin)

**POST /api/admin/activities/bulk-update**
- Body: Array of activity IDs and update operation
- Returns: Bulk update results
- Authentication: Required (admin)

## Data Models

### MongoDB Schema Design

#### Activities Collection
```javascript
{
  _id: ObjectId,
  name: String, // indexed
  category: String, // indexed
  location: String, // indexed
  pricePerPerson: Number, // indexed
  minPersons: Number,
  maxPersons: Number,
  availableFrom: Date, // indexed
  availableTo: Date, // indexed
  duration: String,
  description: String,
  isActive: Boolean, // indexed
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId // ref: users
}
```

#### Packages Collection
```javascript
{
  _id: ObjectId,
  name: String,
  activities: [{
    activityId: ObjectId, // ref: activities
    quantity: Number,
    subtotal: Number
  }],
  totalCost: Number,
  numberOfPersons: Number,
  createdBy: ObjectId, // ref: users, indexed
  createdAt: Date,
  updatedAt: Date,
  status: String, // 'draft' | 'finalized'
  clientName: String,
  notes: String
}
```

### Database Indexes
- Activities: `{ name: 'text', description: 'text' }` (text search)
- Activities: `{ location: 1, category: 1, isActive: 1 }` (filtering)
- Activities: `{ availableFrom: 1, availableTo: 1 }` (date range queries)
- Activities: `{ pricePerPerson: 1 }` (price filtering)
- Packages: `{ createdBy: 1, status: 1 }` (user packages)

## Error Handling

### CSV Upload Validation
- **File Format**: Validate CSV headers match expected format
- **Data Types**: Validate numeric fields, date formats, required fields
- **Business Rules**: Check date ranges, capacity constraints, price validation
- **Duplicate Handling**: Check for existing activities by name + location combination

### API Error Responses
```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `UPLOAD_ERROR`: CSV processing failed
- `INTERNAL_ERROR`: Server error

### Frontend Error Handling
- Display user-friendly error messages
- Retry mechanisms for network failures
- Form validation with real-time feedback
- Graceful degradation for missing data

## Testing Strategy

### Unit Tests
- **Models**: Validation logic, schema compliance
- **API Routes**: Request/response handling, authentication
- **Components**: Rendering, user interactions, state management
- **Utilities**: CSV parsing, PDF generation, date calculations

### Integration Tests
- **CSV Upload Flow**: End-to-end file processing
- **Package Building**: Activity selection to PDF export
- **Search Functionality**: Filtering and pagination
- **Authentication**: Role-based access control

### E2E Tests
- **Agent Workflow**: Search → Select → Build Package → Export PDF
- **Admin Workflow**: Upload CSV → Manage Activities
- **Package Management**: Save → Load → Edit → Export

### Test Data
- Sample CSV files with various scenarios (valid, invalid, edge cases)
- Mock activities covering all categories and locations
- Test packages with different configurations
- User accounts with different roles

### Performance Testing
- Large CSV file uploads (stress testing)
- Search performance with large activity datasets
- PDF generation with complex packages
- Concurrent user scenarios

## Security Considerations

### Authentication & Authorization
- Extend existing JWT-based authentication
- Role-based access control (admin vs travel agent)
- Package ownership validation
- API rate limiting

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention (using Mongoose)
- File upload security (CSV only, size limits)
- XSS prevention in user-generated content

### File Handling
- Secure file upload with type validation
- Temporary file cleanup after processing
- PDF generation in isolated environment
- No executable file uploads

## Performance Optimization

### Database Optimization
- Appropriate indexing strategy
- Query optimization for search/filter operations
- Pagination for large datasets
- Connection pooling

### Frontend Optimization
- Lazy loading for activity images
- Debounced search inputs
- Virtual scrolling for large lists
- Caching of filter options

### Caching Strategy
- Redis caching for frequently accessed data
- Browser caching for static assets
- API response caching for stable data
- Package state persistence in localStorage

## Integration Points

### Existing System Integration
- **Authentication**: Use existing user management and JWT system
- **Navigation**: Integrate with existing navigation structure
- **Styling**: Follow existing Tailwind CSS patterns and color scheme
- **Database**: Extend existing MongoDB connection and patterns

### External Services
- **PDF Generation**: Use libraries like Puppeteer or jsPDF
- **File Processing**: Node.js built-in CSV parsing
- **Email Integration**: Extend existing email service for package sharing

## Deployment Considerations

### Environment Variables
```
MONGODB_URI=mongodb://...
JWT_SECRET=...
PDF_STORAGE_PATH=/tmp/pdfs
MAX_CSV_SIZE=10485760
REDIS_URL=redis://... (optional)
```

### File Storage
- Temporary PDF storage for downloads
- CSV upload temporary processing
- Activity image storage (future enhancement)

### Monitoring
- API endpoint performance monitoring
- CSV upload success/failure rates
- PDF generation metrics
- User activity tracking