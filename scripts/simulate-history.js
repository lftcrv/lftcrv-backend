#!/usr/bin/env node

/**
 * Simulate Multi-Day Performance History
 *
 * This script creates performance snapshots for the last 7 days with
 * appropriate timestamps to populate the daily performance chart.
 *
 * Usage: node simulate-history.js
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// Configuration
const AGENT_ID = '149507f3-758c-42c6-8f9b-47cbb38e0b97';
const RUNTIME_AGENT_ID =
  '53e11e953f967a8dca7b356da01a663dd6b59db2d837e85bbcc708729f4fc732';
const API_KEY = 'secret';
const BASE_URL = 'http://127.0.0.1:8080';

// Initialize Prisma client for direct database access
const prisma = new PrismaClient();

// Helper to create formatted date strings
const formatDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Set to noon each day to ensure they're treated as separate days
  date.setHours(12, 0, 0, 0);
  return date;
};

// Clear existing snapshots before creating new ones
async function clearExistingData() {
  try {
    console.log('Clearing existing performance snapshots...');
    await prisma.agentPerformanceSnapshot.deleteMany({
      where: { agentId: AGENT_ID },
    });
    console.log('✓ Cleared existing snapshots');
  } catch (error) {
    console.error('Error clearing snapshots:', error);
  }
}

// Create a single snapshot for a specific day
async function createDailySnapshot(daysAgo, balanceValue, pnlValue) {
  try {
    const date = formatDate(daysAgo);
    console.log(
      `Creating snapshot for ${date.toISOString()} (${daysAgo} days ago)...`,
    );

    // Insert snapshot directly into database with the specific date
    const snapshot = await prisma.agentPerformanceSnapshot.create({
      data: {
        agentId: AGENT_ID,
        timestamp: date,
        balanceInUSD: balanceValue,
        pnl: pnlValue,
        pnlPercentage: balanceValue === pnlValue ? 0 : (pnlValue / (balanceValue - pnlValue)) * 100,
        pnl24h:
          daysAgo < 7 ? balanceValue - (balanceValue - pnlValue) : pnlValue,
        pnlCycle: 0,
        tradeCount: 2 + daysAgo, // Increasing trade count over time
        tvl: 0,
        price: 0,
        marketCap: 0,
      },
    });

    console.log(`✓ Created snapshot for ${date.toISOString()}`);
    return snapshot;
  } catch (error) {
    console.error(`Error creating snapshot for ${daysAgo} days ago:`, error);
  }
}

// Run simulation
async function simulateWeekHistory() {
  console.log('Simulating 7-day trading history...');

  try {
    // First clear existing snapshots
    await clearExistingData();

    // Create 7 daily snapshots with appropriate timestamps
    // We'll create them from oldest to newest
    const snapshots = [
      { daysAgo: 6, balance: 1000, pnl: 0 }, // Starting point
      { daysAgo: 5, balance: 1050, pnl: 50 }, // Small growth
      { daysAgo: 4, balance: 1120, pnl: 120 }, // More growth
      { daysAgo: 3, balance: 1190, pnl: 190 }, // Add BTC
      { daysAgo: 2, balance: 1150, pnl: 150 }, // Market dip
      { daysAgo: 1, balance: 1320, pnl: 320 }, // Recovery
      { daysAgo: 0, balance: 1536, pnl: 536 }, // Today - Current state
    ];

    // Create each snapshot
    for (const day of snapshots) {
      await createDailySnapshot(day.daysAgo, day.balance, day.pnl);
      // Small delay to ensure ordering
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log('Done! Checking results...');

    // Verify the created history
    const historyResponse = await axios.get(
      `${BASE_URL}/api/performance/${AGENT_ID}/history?interval=daily`,
      {
        headers: { 'x-api-key': API_KEY },
      },
    );

    console.log(
      'Daily history snapshots:',
      historyResponse.data.snapshots.length,
    );
    console.log('Dates:');
    for (const snapshot of historyResponse.data.snapshots) {
      console.log(
        `  ${new Date(snapshot.timestamp).toLocaleString()} - $${snapshot.balanceInUSD}`,
      );
    }

    console.log('\nSimulation complete! Your 7-day history has been created.');
  } catch (error) {
    console.error('Error in simulation:', error);
  } finally {
    // Always disconnect from prisma
    await prisma.$disconnect();
  }
}

// Execute the simulation
simulateWeekHistory().catch((error) => console.error('Error:', error));
