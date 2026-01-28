# Video Platform - Full-Stack Application

A production-ready, scalable video upload, processing, and streaming platform with multi-tenant support and role-based access control.

## 🎯 Project Overview

This application provides a complete end-to-end solution for:
- **Video Upload**: Secure file uploads with validation
- **Sensitivity Processing**: Rule-based dummy sensitivity analysis with real-time updates
- **Video Streaming**: Secure HTTP Range Request-based streaming
- **Multi-Tenant Architecture**: Complete data isolation per tenant
- **Role-Based Access Control**: Admin, Editor, and Viewer roles with appropriate permissions

## 🏗️ Architecture

### Backend Stack
- **Node.js** (Latest LTS) with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.io** for real-time updates
- **Multer** for file uploads
- **FFmpeg** for video metadata extraction
- **Local file storage** (no cloud dependencies)

### Frontend Stack
- **React** (Latest stable) with Vite
- **Context API** for state management
- **React Router** for navigation
- **Axios** for HTTP requests
- **Socket.io Client** for real-time updates
- **Responsive UI** (desktop + mobile)

## 📁 Project Structure

```
assignment/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── models/           # MongoDB models
│   │   ├── middleware/       # Auth, RBAC, tenant isolation
│   │   ├── services/         # Business logic (video processing)
│   │   ├── sockets/          # Socket.io handlers
│   │   ├── utils/            # Utilities (JWT, upload config)
│   │   └── app.js            # Express app entry point
│   ├── uploads/              # Video file storage
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React Context (Auth)
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom hooks (if any)
│   │   └── main.jsx         # React entry point
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (running locally or connection string)
3. **FFmpeg** installed on your system
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/video-platform
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
MAX_FILE_SIZE=524288000
UPLOAD_PATH=./uploads
FRONTEND_URL=http://localhost:5173
```

5. Ensure MongoDB is running:
```bash
# If using local MongoDB
mongod
```

6. Start the backend server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional, defaults are set):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 🔐 Authentication & Authorization

### User Roles

1. **Admin**
   - Full access to all features
   - Can manage users and videos
   - Can access all tenant data

2. **Editor**
   - Can upload videos
   - Can manage own videos
   - Can delete videos
   - Limited to own tenant data

3. **Viewer**
   - Read-only access
   - Can view videos
   - Cannot upload or delete
   - Limited to own tenant data

### Multi-Tenant Isolation

- Each user is assigned a `tenantId` (defaults to their own user ID)
- Users can only access data from their tenant
- Admins can access all tenant data
- Complete data isolation enforced at database query level

## 📡 API Documentation

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "viewer" // optional: admin, editor, viewer
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt-token-here"
  }
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### Video Endpoints

#### Upload Video
```
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- video: <file>
- tenantId: <optional> (admin/editor only) - Upload video to specific tenant

Response:
{
  "success": true,
  "data": {
    "video": {
      "_id": "...",
      "filename": "...",
      "processingStatus": "pending",
      "tenantId": "...",
      ...
    }
  }
}

Note: Admins and editors can optionally specify tenantId in form data to upload 
videos to a specific tenant, making them accessible to viewers in that tenant.
```

#### Get All Videos
```
GET /api/videos?status=completed&sensitivityStatus=safe&page=1&limit=10
Authorization: Bearer <token>

Query Parameters:
- status: pending, processing, completed, failed
- sensitivityStatus: safe, flagged, pending
- page: page number (default: 1)
- limit: items per page (default: 10)
```

#### Get Single Video
```
GET /api/videos/:id
Authorization: Bearer <token>
```

#### Stream Video (HTTP Range Requests)
```
GET /api/videos/:id/stream
Authorization: Bearer <token>

Supports HTTP Range Requests (206 Partial Content)
Only available after processing is completed
```

#### Delete Video
```
DELETE /api/videos/:id
Authorization: Bearer <token>
Required Role: admin or editor
```

### User Management Endpoints (Admin Only)

#### Get All Users
```
GET /api/users?page=1&limit=10&role=editor
Authorization: Bearer <token>
Required Role: admin
```

#### Get User
```
GET /api/users/:id
Authorization: Bearer <token>
Required Role: admin
```

#### Update User Role
```
PATCH /api/users/:id/role
Authorization: Bearer <token>
Content-Type: application/json
Required Role: admin

{
  "role": "editor"
}
```

#### Update User Tenant (Assign User to Tenant)
```
PATCH /api/users/:id/tenant
Authorization: Bearer <token>
Content-Type: application/json
Required Role: admin

{
  "tenantId": "user-id-to-assign-to"
}

// To remove from tenant (make them their own tenant):
{
  "tenantId": null
}
```

#### Get All Tenants
```
GET /api/users/tenants
Authorization: Bearer <token>
Required Role: admin

Returns list of all users who can serve as tenant owners, with video and member counts.
```

## 🎬 Video Processing Pipeline

### Processing Stages

1. **Upload Received** (0%)
   - File uploaded and saved
   - Video record created in database

2. **Metadata Extraction** (25-50%)
   - FFmpeg extracts video metadata
   - Duration, resolution, file size recorded

3. **Sensitivity Analysis** (75%)
   - Rule-based dummy analysis:
     - Filename keyword check
     - Duration-based rules
     - File size checks
     - Random classification (30% flag rate)

4. **Processing Completed** (100%)
   - Status updated to "completed"
   - Sensitivity status set (safe/flagged)
   - Video available for streaming

### Real-Time Updates

- Socket.io emits progress updates to tenant-specific rooms
- Frontend receives live updates via Socket.io client
- Progress percentage and stage information included

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: bcrypt with salt rounds
3. **Role-Based Access Control**: Middleware enforces permissions
4. **Multi-Tenant Isolation**: Database-level data separation
5. **File Validation**: Type and size validation on upload
6. **Secure Streaming**: Authentication required for video access
7. **Input Validation**: Request validation and sanitization

## 🎨 Frontend Features

### Pages

1. **Login/Register**: Authentication pages
2. **Dashboard**: Overview with statistics and recent videos
3. **Upload**: Video upload with progress tracking
4. **Video Library**: Browse all videos with filters
5. **Video Player**: Stream videos with metadata display

### Real-Time Features

- Live processing progress updates
- Automatic UI refresh on status changes
- Socket.io reconnection handling

## 🧪 Testing the Application

### 1. Create Test Users

Register users with different roles:
- Admin user
- Editor user
- Viewer user

### 2. Upload a Video

1. Login as Editor or Admin
2. Navigate to Upload page
3. Select a video file (mp4, mov, avi, webm, mkv)
4. Watch real-time processing updates

### 3. View Videos

1. Navigate to Video Library
2. Filter by status or sensitivity
3. Click on a video to view details and stream

### 4. Test Multi-Tenant Isolation

1. Create two users (they'll have different tenantIds)
2. Upload videos as each user
3. Verify each user only sees their own videos

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Error**
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`

**FFmpeg Not Found**
- Install FFmpeg and ensure it's in PATH
- Verify with: `ffmpeg -version`

**Port Already in Use**
- Change `PORT` in `.env`
- Or kill the process using port 5000

### Frontend Issues

**API Connection Error**
- Verify backend is running on port 5000
- Check `VITE_API_URL` in frontend `.env`

**Socket Connection Failed**
- Ensure Socket.io is properly configured
- Check CORS settings in backend

**Video Not Streaming**
- Ensure video processing is completed
- Check browser console for errors
- Verify authentication token is valid

## 📝 Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/video-platform |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRE` | Token expiration | 7d |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 524288000 (500MB) |
| `UPLOAD_PATH` | Upload directory | ./uploads |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:5000/api |
| `VITE_SOCKET_URL` | Socket.io server URL | http://localhost:5000 |

## 🏗️ Key Architectural Decisions

### 1. Multi-Tenant Architecture
- Each user gets their own `tenantId` (defaults to user ID)
- Database queries filtered by `tenantId`
- Admins can override tenant filtering
- Ensures complete data isolation

### 2. Role-Based Access Control
- Middleware-based permission checking
- Route-level and controller-level enforcement
- Flexible role assignment system

### 3. Real-Time Updates
- Socket.io for bidirectional communication
- Tenant-specific rooms for efficient broadcasting
- Automatic reconnection handling

### 4. Video Streaming
- HTTP Range Requests (206 Partial Content)
- Supports seeking and partial downloads
- Authentication required
- Only available after processing

### 5. Processing Pipeline
- Asynchronous processing after upload
- Rule-based dummy sensitivity analysis
- Real-time progress updates
- Error handling and status tracking

## 📦 Dependencies

### Backend
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing
- `multer`: File upload handling
- `socket.io`: Real-time communication
- `fluent-ffmpeg`: Video metadata extraction
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management

### Frontend
- `react`: UI library
- `react-dom`: React DOM rendering
- `react-router-dom`: Client-side routing
- `axios`: HTTP client
- `socket.io-client`: Socket.io client
- `vite`: Build tool and dev server

## 🚀 Production Deployment Considerations

1. **Environment Variables**: Use secure secrets management
2. **MongoDB**: Use managed MongoDB service (Atlas, etc.)
3. **File Storage**: Consider cloud storage (S3, etc.) for scalability
4. **FFmpeg**: Ensure FFmpeg is available in production environment
5. **HTTPS**: Use HTTPS for secure communication
6. **Rate Limiting**: Implement rate limiting for API endpoints
7. **Error Logging**: Set up proper error logging and monitoring
8. **Database Indexing**: Ensure proper indexes on frequently queried fields
9. **CORS**: Configure CORS for production domain
10. **File Cleanup**: Implement cleanup job for failed/old uploads



## 👤 Author

Stephen Ferrao

---

**Note**: This is a production-ready implementation following best practices for security, scalability, and maintainability. All code is fully functional and ready for deployment.
