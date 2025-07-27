# Media Library Implementation

This document describes the implementation of the file storage functionality with S3 integration, based on the provided screenshots and execution plan.

## Features Implemented

### 1. Backend Infrastructure

- **S3 Integration**: Complete AWS S3 setup for file storage
- **Media Service**: Comprehensive service for file operations
- **Database Schema**: Media and folder management tables
- **API Endpoints**: RESTful APIs for media operations

### 2. Media Library Interface

- **Dark Theme UI**: Matches the Strapi design from screenshots
- **Grid/List Views**: Toggle between different view modes
- **Folder Navigation**: Hierarchical folder structure
- **Search & Filtering**: Advanced search capabilities
- **Bulk Operations**: Select and manage multiple files

### 3. File Upload Components

- **Drag & Drop**: Modern file upload interface
- **Progress Indicators**: Real-time upload progress
- **File Validation**: Type and size validation
- **Multiple Upload**: Support for single and multiple files

### 4. Form Integration

- **File Upload Widget**: Reusable component for forms
- **Media Picker**: Integration with media library
- **Validation**: Form field validation for files

## File Structure

```
backend-driven-cms/
├── app/
│   ├── admin/
│   │   └── media/
│   │       └── page.tsx                 # Media library main page
│   └── api/
│       └── media/
│           ├── route.ts                 # Main media API
│           ├── [id]/
│           │   └── route.ts             # Individual media operations
│           └── folders/
│               └── route.ts             # Folder management API
├── components/
│   ├── admin/
│   │   └── AdminLayout.tsx              # Admin navigation layout
│   ├── media/
│   │   ├── AddAssetModal.tsx            # File upload modal
│   │   ├── MediaDetailsModal.tsx        # File details modal
│   │   └── MediaLibrary.tsx             # Media library component
│   └── forms/
│       └── widgets/
│           └── FileUploadWidget.tsx     # Form file upload widget
└── lib/
    └── services/
        └── MediaService.ts              # Core media service
```

## Database Schema

### Media Table

```sql
CREATE TABLE media (
  id VARCHAR(16) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  size BIGINT NOT NULL,
  s3_url VARCHAR(1000) NOT NULL,
  width INT NULL,
  height INT NULL,
  duration DECIMAL(10,2) NULL,
  alternative_text TEXT NULL,
  caption TEXT NULL,
  folder_id VARCHAR(16) NULL,
  created_by VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);
```

### Media Folders Table

```sql
CREATE TABLE media_folders (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_folder_id VARCHAR(16) NULL,
  path VARCHAR(1000) NOT NULL,
  created_by VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Media Operations

- `GET /api/media` - List media with pagination and filtering
- `POST /api/media` - Upload files
- `GET /api/media/[id]` - Get media details
- `PUT /api/media/[id]` - Update media metadata
- `DELETE /api/media/[id]` - Delete media (soft delete)

### Folder Operations

- `GET /api/media/folders` - List folders
- `POST /api/media/folders` - Create new folder

## Environment Configuration

Create a `.env.local` file with the following variables:

```env
# S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET=your_bucket_name_here
S3_CDN_URL=https://your-cdn-domain.com
S3_CDN_ROOT_PATH=/media

# Hasura Configuration
HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=your_admin_secret_here
NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install aws-sdk multer @types/multer react-dropzone
```

### 2. Configure AWS S3

1. Create an S3 bucket
2. Configure CORS policy for the bucket
3. Set up IAM user with S3 permissions
4. Configure environment variables

### 3. Set up Database

1. Create the media and media_folders tables
2. Set up proper indexes for performance
3. Configure Hasura metadata

### 4. Configure CDN (Optional)

1. Set up CloudFront distribution
2. Configure environment variables for CDN URL

## Usage Examples

### Using FileUploadWidget in Forms

```tsx
import { FileUploadWidget } from "@/components/forms/widgets/FileUploadWidget";

function MyForm() {
  const [files, setFiles] = useState(null);

  return (
    <FileUploadWidget
      value={files}
      onChange={setFiles}
      multiple={true}
      allowedTypes={["image/*", "application/pdf"]}
      maxFiles={5}
      maxFileSize={10 * 1024 * 1024} // 10MB
      required={true}
      label="Upload Documents"
    />
  );
}
```

### Accessing Media Library

Navigate to `/admin/media` to access the media library interface.

## Features Matching Screenshots

### 1. Media Library Dashboard

- ✅ Dark theme matching Strapi design
- ✅ Folder navigation sidebar
- ✅ Grid/list view toggle
- ✅ Search and filtering
- ✅ Bulk selection and operations

### 2. Add New Assets Modal

- ✅ "FROM COMPUTER" and "FROM URL" tabs
- ✅ Drag & drop upload area
- ✅ Progress indicators
- ✅ File validation

### 3. File Details Modal

- ✅ File preview (images, documents)
- ✅ Metadata editing (filename, alt text, caption)
- ✅ File information display
- ✅ Action buttons (delete, download, copy URL)

### 4. Form File Upload

- ✅ Drag & drop interface
- ✅ File type validation
- ✅ Progress indicators
- ✅ Multiple file support

## Security Considerations

1. **File Validation**: Server-side validation of file types and sizes
2. **Access Control**: Implement proper authentication and authorization
3. **S3 Security**: Use IAM roles and bucket policies
4. **CDN Security**: Configure proper CORS and security headers

## Performance Optimizations

1. **Image Optimization**: Automatic image resizing and compression
2. **CDN Integration**: Fast file delivery through CDN
3. **Pagination**: Efficient loading of large media libraries
4. **Caching**: Redis-based caching for frequently accessed data

## Future Enhancements

1. **Image Processing**: Automatic thumbnail generation
2. **Video Processing**: Video transcoding and streaming
3. **Advanced Search**: Full-text search with metadata
4. **Usage Tracking**: Track where files are used across the system
5. **Duplicate Detection**: Prevent duplicate file uploads
6. **Bulk Operations**: Advanced bulk editing and management

## Troubleshooting

### Common Issues

1. **S3 Upload Failures**

   - Check AWS credentials and permissions
   - Verify bucket CORS configuration
   - Ensure proper environment variables

2. **File Preview Issues**

   - Check CDN configuration
   - Verify file permissions
   - Ensure proper MIME type detection

3. **Database Connection Issues**
   - Verify Hasura configuration
   - Check database schema
   - Ensure proper indexes

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Contributing

When contributing to the media library:

1. Follow the existing code style
2. Add proper TypeScript types
3. Include error handling
4. Write tests for new features
5. Update documentation

## License

This implementation is part of the backend-driven CMS project.
