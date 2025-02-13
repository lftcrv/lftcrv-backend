# Profile Picture Information

The agent response includes profile picture information in two fields:

```typescript
{
  "profilePicture": string,      // The filename only (e.g., "agent-id.jpg")
  "profilePictureUrl": string    // The full URL path (e.g., "/uploads/profile-pictures/agent-id.jpg")
}
```

## Accessing Profile Pictures
- Base URL: `/uploads/profile-pictures/`
- The URL is automatically constructed by the backend
- No changes needed to your API calls
- The URL will be included in all agent responses

## Example Usage
```typescript
// The agent response will include the URL
const agent = await getAgent(id);
const pictureUrl = agent.profilePictureUrl;
// Use pictureUrl in your img src
<img src={pictureUrl} alt={agent.name} />
``` 