# Media Management System

## Overview

The Media Management System provides a comprehensive solution for handling image uploads, processing, and management within the destination admin interface. It includes drag-and-drop uploads, automatic image optimization, multiple size generation, and accessibility features.

## Components

### MediaManager

The main component for handling image uploads and management.

```tsx
import MediaManager from '@/components/admin/MediaManager';
import { OptimizedImage } from '@/lib/media-optimizer';

function MyComponent() {
  const [images, setImages] = useState<OptimizedImage[]>([]);

  return (
    <MediaManager
      selectedImages={images}
      onImagesChange={setImages}
      maxImages={5}
      allowMultiple={true}
    />
  );
}
```

#### Props

- `selectedImages?: OptimizedImage[]` - Currently selected images
- `onImagesChange?: (images: OptimizedImage[]) => void` - Callback when images change
- `maxImages?: number` - Maximum number of images allowed (default: 10)
- `allowMultiple?: boolean` - Allow multiple image selection (default: true)
- `className?: string` - Additional CSS classes

### ImageCropper

Component for cropping and editing images with aspect ratio control.

```tsx
import ImageCropper from '@/components/admin/ImageCropper';

function MyComponent() {
  return (
    <ImageCropper
      imageUrl="/path/to/image.jpg"
      aspectRatio={16/9}
      onCropComplete={(cropData, croppedBlob) => {
        // Handle cropped image
      }}
      onCancel={() => {
        // Handle cancel
      }}
    />
  );
}
```

#### Props

- `imageUrl: string` - URL of the image to crop
- `aspectRatio?: number` - Desired aspect ratio (width/height)
- `onCropComplete?: (cropData: CropArea, croppedImageBlob: Blob) => void` - Callback when cropping is complete
- `onCancel?: () => void` - Callback when cropping is cancelled

## MediaOptimizer Utility

The `MediaOptimizer` class provides static methods for image processing and upload.

### Key Methods

#### `validateImage(file: File)`

Validates image files before upload.

```tsx
const validation = MediaOptimizer.validateImage(file);
if (!validation.valid) {
  console.error(validation.error);
}
```

#### `uploadImage(file: File, altText: string, onProgress?: (progress: number) => void)`

Uploads and processes an image with progress tracking.

```tsx
try {
  const result = await MediaOptimizer.uploadImage(
    file,
    'Alt text for accessibility',
    (progress) => console.log(`Upload progress: ${progress}%`)
  );
  console.log('Upload successful:', result);
} catch (error) {
  console.error('Upload failed:', error);
}
```

#### `deleteImage(imageId: string)`

Deletes an image and all its generated sizes.

```tsx
try {
  await MediaOptimizer.deleteImage('image-id');
  console.log('Image deleted successfully');
} catch (error) {
  console.error('Delete failed:', error);
}
```

#### `updateImageAltText(imageId: string, altText: string)`

Updates the alt text for an image.

```tsx
try {
  await MediaOptimizer.updateImageAltText('image-id', 'New alt text');
  console.log('Alt text updated');
} catch (error) {
  console.error('Update failed:', error);
}
```

## Image Processing

### Automatic Size Generation

The system automatically generates multiple sizes for each uploaded image:

- **Thumbnail**: 150x150px - For small previews
- **Small**: 400x300px - For mobile displays
- **Medium**: 800x600px - For tablet displays
- **Large**: 1200x900px - For desktop displays
- **Hero**: 1920x1080px - For hero sections

### Format Optimization

- Converts images to WebP format for better compression
- Maintains aspect ratios with smart cropping
- Applies high-quality scaling algorithms

### File Validation

- Supports JPEG, PNG, and WebP formats
- Maximum file size: 10MB
- Automatic format detection and validation

## API Endpoints

### POST `/api/admin/media/upload`

Uploads and processes a new image.

**Request**: FormData with:
- `originalFile`: The image file
- `altText`: Alt text for accessibility
- `size_*`: Generated size files (thumbnail, small, medium, large, hero)

**Response**: OptimizedImage object

### GET `/api/admin/media/[id]`

Retrieves image metadata.

**Response**: Image metadata and URLs

### PATCH `/api/admin/media/[id]`

Updates image metadata (alt text).

**Request Body**:
```json
{
  "altText": "Updated alt text"
}
```

### DELETE `/api/admin/media/[id]`

Deletes an image and all its files.

**Note**: Prevents deletion if image is currently in use by destinations.

## Usage in Destination Forms

### Hero Image

```tsx
<MediaManager
  selectedImages={destination.heroImage ? [destination.heroImage] : []}
  onImagesChange={(images) => setDestination({
    ...destination,
    heroImage: images[0] || null
  })}
  maxImages={1}
  allowMultiple={false}
/>
```

### Gallery Images

```tsx
<MediaManager
  selectedImages={destination.galleryImages || []}
  onImagesChange={(images) => setDestination({
    ...destination,
    galleryImages: images
  })}
  maxImages={8}
  allowMultiple={true}
/>
```

### Section Images

```tsx
<MediaManager
  selectedImages={destination.sections.attractions.images || []}
  onImagesChange={(images) => setDestination({
    ...destination,
    sections: {
      ...destination.sections,
      attractions: {
        ...destination.sections.attractions,
        images
      }
    }
  })}
  maxImages={4}
  allowMultiple={true}
/>
```

## Accessibility Features

### Alt Text Management

- Required alt text for all images
- Visual indicators for missing alt text
- Easy editing interface for alt text
- Screen reader friendly

### Keyboard Navigation

- Full keyboard support for all interactions
- Focus management for modal dialogs
- ARIA labels and descriptions

### Color Contrast

- High contrast indicators for image status
- Clear visual feedback for all states
- Accessible color schemes

## Error Handling

### Upload Errors

- Network connectivity issues
- Server-side processing errors
- File validation failures
- Storage quota exceeded

### User Feedback

- Clear error messages
- Progress indicators
- Success confirmations
- Retry mechanisms

## Performance Optimizations

### Client-Side

- Image compression before upload
- Progressive loading of large images
- Lazy loading for image galleries
- Efficient re-rendering with React keys

### Server-Side

- Streaming file uploads
- Background image processing
- CDN integration ready
- Database indexing for fast queries

## Security Considerations

### File Validation

- MIME type checking
- File size limits
- Extension validation
- Content scanning

### Access Control

- Admin-only upload permissions
- User session validation
- CSRF protection
- Rate limiting

### Storage Security

- Secure file paths
- Access logging
- Backup strategies
- Cleanup procedures

## Testing

### Unit Tests

- Component rendering tests
- User interaction tests
- API endpoint tests
- Utility function tests

### Integration Tests

- Complete upload workflow
- Error handling scenarios
- Performance under load
- Cross-browser compatibility

### Accessibility Tests

- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- ARIA compliance

## Future Enhancements

### Planned Features

- Bulk image operations
- Advanced image editing tools
- AI-powered alt text generation
- Image tagging and categorization
- Advanced search and filtering
- Integration with external CDNs
- Video upload support
- Image analytics and usage tracking

### Performance Improvements

- WebP fallback for older browsers
- Progressive image enhancement
- Advanced caching strategies
- Background processing queues

## Troubleshooting

### Common Issues

1. **Upload fails with "File too large"**
   - Check file size (max 10MB)
   - Compress image before upload

2. **Images not displaying**
   - Verify file paths are correct
   - Check server permissions
   - Ensure CDN configuration

3. **Slow upload performance**
   - Check network connectivity
   - Verify server resources
   - Consider image compression

4. **Alt text not saving**
   - Check user permissions
   - Verify API connectivity
   - Check for validation errors

### Debug Mode

Enable debug logging by setting environment variable:
```
MEDIA_DEBUG=true
```

This will log detailed information about:
- Upload progress
- Image processing steps
- API requests and responses
- Error details