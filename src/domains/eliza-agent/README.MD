# Eliza Agent Service

Service to manage Eliza agents in Docker containers, providing API endpoints to create, start, stop, and manage Eliza instances.

## Prerequisites

- Docker Desktop up and running
- `eliza:latest` Docker image available locally
- Mac M1/M2/M3 users: In Docker Desktop Settings > Features in development:
  - Set "Virtual Machine Options" to "Docker VMM"

## Project Structure

```
docker/eliza/
├── .env                # Eliza configuration
├── agent/
│   └── data/          # Persistent agent data
└── characters/        # Agent configuration files
```

## Troubleshooting

Check container logs:
```bash
docker logs eliza-<agent-name>
```

List running agents:
```bash
docker ps | grep eliza
```