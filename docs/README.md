# AI Trading Agents System

## Overview

This system enables autonomous trading agents with distinct personalities to trade cryptocurrencies based on comprehensive market analysis while minimizing computational overhead through shared analysis layers.

## System Architecture

### 1. Static Configuration Layer

Before any trading occurs, the system initializes with two key configurations:

#### Token Profiling
- Each token is profiled based on its narratives, project type, market segment, development stage, and community type
- These profiles create a static "personality match" score for each agent-token pair

#### Agent Configuration
- Defines the agent's trading personality and preferences
- Includes trading style, risk profile, time horizon, and narrative preferences
- Determines how the agent weighs different types of analysis

### 2. Dynamic Analysis Layer

Three main analysis services run continuously, providing shared data for all agents:

#### Technical Analysis
- Price patterns and chart analysis
- Moving averages and technical indicators
- Volume analysis and support/resistance levels
- Short-term market dynamics

#### Market Analysis
- Global trading volumes and exchange flows
- Whale wallet movements
- Liquidity analysis
- Cross-exchange dynamics
- Market cap trends

#### Project & Sentiment Analysis
- Social media trends and community engagement
- News analysis and major events
- Development activity and updates
- Token metrics and project fundamentals

### 3. Agent Decision Layer

Each agent processes the shared analysis through its unique lens:

1. **Provider Weights**
   - Analysis data is weighted based on agent personality
   - Technical traders prioritize chart analysis
   - Fundamental traders focus more on project metrics

2. **Token Affinity**
   - Static scores from token profiles influence trading priority
   - Agents prefer tokens matching their narrative preferences

3. **Final Decision**
   - Combines weighted analysis with token affinity
   - Generates trading signals based on personality

### 4. Trading Actions

Two main types of actions:
- SWAP: Direct on-chain token swaps through AMMs
- TRADE: Order placement and management on Paradex

## Agent Types Examples

1. **Technical Trader**
   - Heavily weights technical analysis
   - Short time horizons
   - Focuses on price action and volume

2. **Trend Follower**
   - Balances technical and market analysis
   - Medium time horizons
   - Focuses on momentum and market flows

3. **Fundamental Trader**
   - Prioritizes project and sentiment analysis
   - Longer time horizons
   - Focuses on project development and news

## System Benefits

1. **Efficiency**
   - Analysis performed once and shared across agents
   - Reduces computational overhead
   - Minimizes redundant API calls

2. **Personality-Driven**
   - Each agent maintains unique trading style
   - Token affinity creates natural specialization
   - Weighted analysis reflects trading preferences

3. **Scalability**
   - Easy to add new agents without increasing analysis load
   - Simple to integrate new analysis components
   - Modular architecture for easy expansion

4. **Market Coverage**
   - Different agent personalities ensure diverse strategies
   - Various time horizons covered
   - Multiple trading styles represented

## Usage Flow

1. Configure token profiles and agent personalities
2. System runs continuous analysis services
3. Agents receive weighted analysis based on their profile
4. Each agent makes independent trading decisions
5. Trading actions executed through appropriate channels