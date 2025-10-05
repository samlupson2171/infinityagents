# Destination Admin Management - Quick Reference

## Quick Actions

### Creating a New Destination
1. Dashboard → "Add New Destination"
2. Fill basic info (name, country, region, description)
3. Add hero image and gradient colors
4. Fill quick facts
5. Save as draft

### Publishing Content
1. Complete all required sections
2. Preview content across devices
3. Click "Publish" button
4. Confirm publication

### AI Content Generation
1. Click "Generate with AI" in any section
2. Select preferences (audience, style)
3. Review generated content
4. Edit and customize as needed
5. Save changes

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | Ctrl/Cmd + S |
| Preview | Ctrl/Cmd + P |
| Bold text | Ctrl/Cmd + B |
| Italic text | Ctrl/Cmd + I |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Y |

## Content Sections

### Required Sections
- ✅ Overview
- ✅ Accommodation  
- ✅ Attractions
- ✅ Beaches
- ✅ Nightlife
- ✅ Dining
- ✅ Practical Information

### Section Components
- **Content**: Rich text with formatting
- **Highlights**: Bullet point lists
- **Tips**: Helpful advice
- **Images**: Visual content with alt text

## Status Workflow

```
Draft → Preview → Publish → Live
  ↓       ↓        ↓       ↓
Edit → Review → Approve → Monitor
```

## Image Guidelines

### Formats Supported
- JPG, PNG, WebP, GIF
- Maximum size: 10MB
- Recommended: 1200px+ width

### Best Practices
- Use high-quality images
- Add descriptive alt text
- Optimize file sizes
- Maintain consistent style

## Common Tasks

### Linking Related Content
1. Go to "Relationships" tab
2. Search for offers/activities/destinations
3. Check boxes to select
4. Save relationships

### Sharing Previews
1. Click "Share Preview" button
2. Copy generated link
3. Share with stakeholders
4. Link expires in 24 hours

### Managing Media
1. Upload images via drag-and-drop
2. Crop and adjust as needed
3. Add alt text for accessibility
4. Organize by destination

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Content not saving | Check internet, refresh page |
| Images not loading | Verify format and size |
| Preview not working | Clear cache, try different browser |
| AI generation failing | Check connection, try simpler input |

## Support Contacts

- **Technical Issues**: support@infinityweekends.com
- **Content Questions**: content@infinityweekends.com
- **Training**: training@infinityweekends.com

## API Endpoints (Developers)

### Public Endpoints
- `GET /api/destinations` - List published destinations
- `GET /api/destinations/[slug]` - Get destination details
- `GET /api/destinations/[id]/related` - Get related content

### Admin Endpoints
- `GET /api/admin/destinations` - List all destinations
- `POST /api/admin/destinations` - Create destination
- `PUT /api/admin/destinations/[id]` - Update destination
- `DELETE /api/admin/destinations/[id]` - Delete destination
- `POST /api/admin/destinations/[id]/publish` - Publish destination
- `GET /api/admin/destinations/[id]/suggestions` - Get content suggestions

---

*For detailed instructions, see the full [Destination Admin Management Guide](./destination-admin-management-guide.md)*