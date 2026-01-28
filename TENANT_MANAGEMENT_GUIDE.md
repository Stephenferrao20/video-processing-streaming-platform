# Tenant Management Guide

## Problem Solved

Previously, viewers were isolated in their own tenant with no videos, making them useless. Now admins can:
1. Assign users to tenants (so viewers can see videos)
2. Upload videos to specific tenants
3. Manage tenant assignments

## How Tenant System Works

### Default Behavior
- When a user registers, they become their own tenant (`tenantId = user._id`)
- Users can only see videos from their own tenant
- This provides isolation by default

### Sharing Videos with Viewers

**Scenario**: You want viewers to see videos uploaded by editors/admins.

**Solution**: Assign viewers to the same tenant as the editor/admin who uploads videos.

## Step-by-Step Workflow

### 1. Create Users

Register users normally:
- Admin: `admin@example.com`
- Editor: `editor@example.com`  
- Viewer: `viewer@example.com`

Initially, each user is their own tenant.

### 2. Assign Viewer to Editor's Tenant

As an admin, assign the viewer to the editor's tenant:

```bash
PATCH /api/users/{viewer-id}/tenant
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "tenantId": "{editor-user-id}"
}
```

Now the viewer shares the editor's tenant and can see videos uploaded by that editor.

### 3. Upload Videos

When the editor uploads a video, it's automatically assigned to their tenant (which the viewer now shares).

**Optional**: Admin/Editor can explicitly specify tenant when uploading:

```bash
POST /api/videos/upload
Authorization: Bearer <editor-token>
Content-Type: multipart/form-data

Form Data:
- video: <file>
- tenantId: {optional-tenant-id}
```

### 4. View Videos

The viewer can now see all videos from their assigned tenant!

## API Endpoints

### Get All Tenants (Admin Only)
```bash
GET /api/users/tenants
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "tenants": [
      {
        "_id": "user-id",
        "name": "Editor Name",
        "email": "editor@example.com",
        "role": "editor",
        "tenantId": "user-id",
        "videoCount": 5,
        "memberCount": 2,
        "isActiveTenant": true
      }
    ],
    "total": 10
  }
}
```

### Assign User to Tenant (Admin Only)
```bash
PATCH /api/users/{user-id}/tenant
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "tenantId": "target-tenant-user-id"
}

// To remove from tenant (make them their own tenant again):
{
  "tenantId": null
}
```

### Upload Video to Specific Tenant (Admin/Editor Only)
```bash
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- video: <file>
- tenantId: {optional-tenant-user-id}
```

## Common Use Cases

### Use Case 1: Company Department
- **Editor** (department head) uploads videos
- **Viewers** (team members) are assigned to editor's tenant
- All team members see the same videos

### Use Case 2: Content Creator
- **Editor** (creator) uploads videos
- **Viewers** (subscribers) are assigned to creator's tenant
- Subscribers see creator's videos

### Use Case 3: Multiple Teams
- **Editor A** (Team A) uploads videos → Team A viewers assigned to Editor A's tenant
- **Editor B** (Team B) uploads videos → Team B viewers assigned to Editor B's tenant
- Complete isolation between teams

## Example Workflow

```javascript
// 1. Admin creates users
// - editor@company.com (Editor role)
// - viewer1@company.com (Viewer role)
// - viewer2@company.com (Viewer role)

// 2. Admin assigns viewers to editor's tenant
PATCH /api/users/viewer1-id/tenant
{ "tenantId": "editor-id" }

PATCH /api/users/viewer2-id/tenant
{ "tenantId": "editor-id" }

// 3. Editor uploads videos
POST /api/videos/upload
// Videos automatically assigned to editor's tenant

// 4. Viewers can now see the videos!
GET /api/videos
// Returns all videos from editor's tenant
```

## Important Notes

1. **Tenant Owner**: The user whose `_id` matches the `tenantId` is the tenant owner
2. **Tenant Members**: Users whose `tenantId` points to another user are members of that tenant
3. **Admin Override**: Admins can see all videos regardless of tenant
4. **Default Isolation**: If no tenant assignment is made, users remain isolated
5. **Video Assignment**: Videos inherit the uploader's tenantId unless explicitly specified

## Troubleshooting

**Q: Viewer sees no videos**
- Check if viewer is assigned to a tenant that has videos
- Verify the tenant owner has uploaded videos
- Check viewer's `tenantId` matches the editor's `_id`

**Q: How to see which users belong to a tenant?**
- Use `GET /api/users/tenants` to see tenant statistics
- Check `memberCount` to see how many users are in each tenant

**Q: How to move a user to a different tenant?**
- Use `PATCH /api/users/{id}/tenant` with new `tenantId`

**Q: How to make a user their own tenant again?**
- Use `PATCH /api/users/{id}/tenant` with `{ "tenantId": null }`
