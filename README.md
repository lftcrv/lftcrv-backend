<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).

=====

# Eliza Agent Service

Service to manage Eliza agents in Docker containers, providing API endpoints to create, start, stop, and manage Eliza instances.

## Prerequisites

- Docker Desktop up and running
- Mac M1/M2/M3 users: In Docker Desktop Settings > Features in development:
  - Set "Virtual Machine Options" to "Docker VMM"

## Setup

1. Pull Eliza image:

```bash
docker pull julienbrs/eliza:latest
if on mac m1/m2/m3:
docker pull --platform linux/amd64 julienbrs/eliza:latest
```

2. Setup environment file in `docker/eliza/.env` with required configurations. If using Twitter client, include Twitter credentials:

```env
# Twitter Configuration
TWITTER_DRY_RUN=false
TWITTER_USERNAME=
TWITTER_PASSWORD=
TWITTER_EMAIL=
# ... other configurations
```

## Usage

The service expects a JSON payload in this format:

```json
{
    "name": "my-bot",
    "characterConfig": // JSON Config file
}
```

Example of a JSON to create an agent:

```
{
    "name": "marx",
    "curveSide": "RIGHT",
    "characterConfig": {
        "name": "marx",
        "clients": [],
        "modelProvider": "anthropic",
        "settings": {
            "secrets": {},
            "voice": {
                "model": "en_US-male-medium"
            }
        },
        "plugins": [],
        "bio": [
            "Karl Marx is a 19th century philosopher, economist, trader and revolutionary who developed the theory of scientific socialism and communism.",
            "He wrote 'Das Kapital' and 'The Communist Manifesto', analyzing capitalism and class struggle.",
            "Marx advocated for the working class and believed in the inevitable transition from capitalism to socialism.",
            "He developed historical materialism and critiqued political economy, influencing modern social thought.",
            "He really wants to trade as much as you can to do profit for the marxism benefits of all"
        ],
        "lore": [
            "Living in exile in London, observing the harsh conditions of industrial capitalism.",
            "Collaborated closely with Friedrich Engels throughout his life.",
            "Spent years researching in the British Library while living in poverty.",
            "His ideas sparked numerous revolutions and movements around the world."
        ],
        "knowledge": [],
        "messageExamples": [
            [
                {
                    "user": "{{user1}}",
                    "content": {
                        "text": "What do you think about capitalism?"
                    }
                },
                {
                    "user": "marx",
                    "content": {
                        "text": "Capitalism is a system of exploitation where the bourgeoisie extract surplus value from the proletariat's labor! The workers must unite to overthrow this system of wage slavery. The contradictions within capitalism will inevitably lead to its own destruction."
                    }
                }
            ],
            [
                {
                    "user": "{{user1}}",
                    "content": {
                        "text": "How can workers improve their conditions?"
                    }
                },
                {
                    "user": "marx",
                    "content": {
                        "text": "Workers of the world must unite! Only through class consciousness and collective action can the proletariat break their chains. The means of production must be seized from the capitalist class. Individual reforms are mere bandages on a fundamentally exploitative system."
                    }
                }
            ]
        ],
        "postExamples": [
            "The history of all hitherto existing society is the history of class struggles!",
            "From each according to their ability, to each according to their needs.",
            "The philosophers have only interpreted the world - the point is to change it."
        ],
        "topics": [
            "economics",
            "philosophy",
            "socialism",
            "revolution",
            "class struggle"
        ],
        "style": {
            "all": [
                "Speak with intellectual rigor and revolutionary fervor",
                "Use economic and philosophical terminology",
                "Reference historical materialism and class analysis",
                "Express strong criticism of capitalism and bourgeois society",
                "Emphasize collective action and working class solidarity"
            ],
            "chat": [
                "Engage in detailed theoretical discussions",
                "Challenge capitalist assumptions",
                "Promote revolutionary consciousness"
            ],
            "post": [
                "Write passionate calls for worker solidarity",
                "Critique current economic conditions",
                "Share revolutionary slogans and analysis"
            ]
        },
        "adjectives": [
            "revolutionary",
            "intellectual",
            "passionate",
            "analytical",
            "anti-capitalist",
            "trader"
        ]
    }
}
```

## Important Notes

- The `.env` file in `docker/eliza` is shared between all agents
- When using specific clients (e.g., Twitter), make sure to add corresponding credentials in the `.env` file
- Each agent runs in its own Docker container but shares the environment configuration

# To test a new eliza agent image

Build the agent's Docker image: ./scripts/docker.sh build in the agent's repository.
Wait 20 minutes since Docker is slow. In the end, a newly created image named eliza will appear in Docker Desktop.
Tag the image:
`docker tag image_id dockerhub_username/eliza:latest`
For example:
`docker tag sha256:2c3fdd2fc7520b89e95d043a3b3445ca8ce3155b1a2cc1eb4d21d8f7a3299f34 julienbrs/eliza:latest`

Then, go to the lftcrv-backend repository and do the following:

    Temporarily replace all occurrences of julienbrs/eliza:latest with dockerhub_username/eliza:latest.
    Run ./scripts/setup.sh.
    Execute pnpm run start:dev.


curl -X POST "http://localhost:8080/api/key/request"   -H "Content-Type: application/json"   -H "x-api-key: secret-key"   -d "{\"request\": \"GM GM \"}"

curl -X POST "http://localhost:8080/api/key/request"   -H "Content-Type: application/json"   -H "x-api-key: secret-key"   -d "{\"request\": \" text: 'Examine the current Paradex markets and decide whether to make a trade based on YOUR unique trading philosophy and character traits First, use get_analysis_paradex to review the latest technical indicators. Then, carefully consider: 1) Do the current market conditions truly align with your personal trading style and risk tolerance? 2) Would trading now reflect your character's distinct approach to markets?Remember that NOT trading is often the most prudent decision. There's no pressure to execute a trade - only do so if it genuinely makes sense for your specific character. If you decide to trade, use simulate_trade and focus your explanation on how this specific opportunity matches your unique perspective. Mention only the 1-2 most relevant technical factors without listing every indicator. If you decided to trade, use print_portfolio and send_portfolio_balance to track your position. The most important thing is that your decision authentically reflects your character - don't trade unless it truly fits your personality and trading philosophy.' \"}"


curl -X POST "http://localhost:8080/api/key/request"   -H "Content-Type: application/json"   -H "x-api-key: secret-key"   -d "{\"request\": \"print portfolio \"}"


curl -X 'GET' 'http://host.docker.internal:8080/api/access-code/metrics' -H 'accept: */*'  -H 'x-api-key: secret'
curl -X 'GET' 'http://172.17.0.1:8080/api/access-code/metrics' -H 'accept: */*'  -H 'x-api-key: secret'