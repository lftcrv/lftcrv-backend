# Getting Profile Pictures from Latest Agents Endpoint

## Endpoint Details
```
GET /api/eliza-agent/latest
Headers: {
  'x-api-key': 'your-api-key'
}
```

## Response Structure
```typescript
{
  "status": "success",
  "data": {
    "agents": [
      {
        "id": "agent-id",
        "name": "Agent Name",
        // ... other agent fields
        "profilePicture": "agent-id.png",                                    // filename
        "profilePictureUrl": "/uploads/profile-pictures/agent-id.png"        // ready-to-use URL
      }
    ]
  }
}
```

## Frontend Usage Example
```typescript
// Fetching latest agents with profile pictures
const fetchLatestAgents = async () => {
  const response = await fetch('http://localhost:8080/api/eliza-agent/latest', {
    headers: {
      'x-api-key': apiKey
    }
  });
  
  const { data: { agents } } = await response.json();
  
  // Each agent will have profilePictureUrl ready to use
  return agents;
};

// Using in React component
function AgentList() {
  const [agents, setAgents] = useState([]);
  
  useEffect(() => {
    fetchLatestAgents().then(setAgents);
  }, []);
  
  return (
    <div>
      {agents.map(agent => (
        <div key={agent.id}>
          <img 
            src={agent.profilePictureUrl} 
            alt={agent.name}
            onError={(e) => {
              e.target.src = '/default-avatar.png'; // Fallback image
            }}
          />
          <h3>{agent.name}</h3>
        </div>
      ))}
    </div>
  );
}
```

## Important Notes
1. The `profilePictureUrl` is already included in the response - no need to construct it manually
2. The URL is ready to use in your `<img>` tags
3. No additional API calls needed to get the profile picture URL
4. The URL follows the format: `/uploads/profile-pictures/{agentId}.png`

## Example Response
```json
{
  "status": "success",
  "data": {
    "agents": [
      {
        "id": "c5607ee5-4266-41bf-9bbc-2fcc37ea0dc1",
        "name": "pepe",
        "profilePicture": "c5607ee5-4266-41bf-9bbc-2fcc37ea0dc1.png",
        "profilePictureUrl": "/uploads/profile-pictures/c5607ee5-4266-41bf-9bbc-2fcc37ea0dc1.png",
        "curveSide": "LEFT",
        "status": "STARTING"
      }
    ]
  }
}
```

## Troubleshooting
If the image doesn't load:
1. Make sure to use the complete URL: `http://localhost:8080${agent.profilePictureUrl}`
2. Verify the image exists in the backend's uploads directory
3. Implement a fallback image for cases where the profile picture is not available 