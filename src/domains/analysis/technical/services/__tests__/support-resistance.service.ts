// import { Test, TestingModule } from '@nestjs/testing';
// import { SupportResistanceService } from '../support-resistance.service';
// import { PriceDTO } from '../../dto/price.dto';

// describe('SupportResistanceService', () => {
//   let service: SupportResistanceService;

//   beforeAll(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [SupportResistanceService],
//     }).compile();

//     service = module.get<SupportResistanceService>(SupportResistanceService);
//   });

//   describe('findKeyLevels', () => {
//     it('should return an empty array if fewer than 10 prices', () => {
//       const prices: PriceDTO[] = [
//         {
//           timestamp: 1,
//           price: 100,
//           close: 100,
//           high: 105,
//           low: 95,
//           volume: 1000,
//         },
//         {
//           timestamp: 2,
//           price: 101,
//           close: 101,
//           high: 106,
//           low: 96,
//           volume: 1100,
//         },
//       ];
//       const levels = service.findKeyLevels(prices);
//       expect(levels).toEqual([]);
//     });

//     it('should find significant levels for enough data points', () => {
//       /**
//        * We need at least one repeated pivot (peak or valley) 3 times
//        * so findKeyLevels can cluster them into a "significant" level.
//        *
//        * Below, we create 16 bars. We'll force 3 local maxima at ~105 
//        * so that the pivot logic sees them as peaks.
//        *
//        * The simple pivot detection (findPivots) uses:
//        *   if (curr > prev && curr > next) or (curr < prev && curr < next)
//        *
//        * We'll ensure that bars 3, 5, 7 are each a local high of 105.
//        */
//       const prices: PriceDTO[] = [
//         // Bar 1
//         { timestamp: 1,  price: 100, close: 100, high: 100, low: 99,  volume: 1000 },
//         // Bar 2
//         { timestamp: 2,  price: 102, close: 102, high: 103, low: 100, volume: 1000 },
//         // Bar 3 => local high (105) > prev(102), next(98)
//         { timestamp: 3,  price: 105, close: 105, high: 105, low: 104, volume: 1200 },
//         // Bar 4
//         { timestamp: 4,  price: 98,  close: 98,  high: 99,  low: 97,   volume: 900 },
//         // Bar 5 => another local high (105) > prev(98), next(99)
//         { timestamp: 5,  price: 105, close: 105, high: 105, low: 100, volume: 1300 },
//         // Bar 6
//         { timestamp: 6,  price: 99,  close: 99,  high: 100, low: 95,   volume: 950 },
//         // Bar 7 => another local high (105) > prev(99), next(101)
//         { timestamp: 7,  price: 105, close: 105, high: 105, low: 104, volume: 1100 },
//         // Bar 8
//         { timestamp: 8,  price: 101, close: 101, high: 102, low: 99,   volume: 1000 },
//         // Bar 9
//         { timestamp: 9,  price: 103, close: 103, high: 104, low: 102,  volume: 1400 },
//         // Bar 10
//         { timestamp: 10, price: 108, close: 108, high: 108, low: 106, volume: 1600 },
//         // Bar 11
//         { timestamp: 11, price: 107, close: 107, high: 107, low: 105, volume: 1000 },
//         // Bar 12
//         { timestamp: 12, price: 106, close: 106, high: 106, low: 104, volume: 1000 },
//         // Bar 13
//         { timestamp: 13, price: 100, close: 100, high: 101, low: 99,   volume: 900 },
//         // Bar 14
//         { timestamp: 14, price: 102, close: 102, high: 103, low: 99,   volume: 1150 },
//         // Bar 15
//         { timestamp: 15, price: 99,  close: 99,  high: 100, low: 98,   volume: 1000 },
//         // Bar 16
//         { timestamp: 16, price: 101, close: 101, high: 102, low: 99,   volume: 1000 },
//       ];

//       const levels = service.findKeyLevels(prices);
//       // We expect at least one level around ~105 (due to 3 repeated pivot highs).
//       expect(levels.length).toBeGreaterThan(0);

//       // Ensure levels are sorted ascending
//       expect(levels).toEqual(levels.slice().sort((a, b) => a - b));
//     });
//   });

//   describe('identifyTrendlines', () => {
//     it('should return an empty array if fewer than 20 prices', () => {
//       const shortPrices: PriceDTO[] = Array.from({ length: 10 }, (_, i) => ({
//         timestamp: i + 1,
//         price: 100 + i,
//         close: 100 + i,
//         high: 101 + i,
//         low: 99 + i,
//         volume: 1000 + i * 10,
//       }));
//       const trendlines = service.identifyTrendlines(shortPrices);
//       expect(trendlines).toEqual([]);
//     });

//     it('should find some trendlines for synthetic pivot data', () => {
//         /**
//          * Window = 5. We want at least 2 pivot highs and
//          * one additional bar touching that line. 
//          * 
//          * We'll create 22 bars. 
//          *  - i=5 => pivot low
//          *  - i=10 => pivot high (105)
//          *  - i=12 => near the line between i=10 & i=15 
//          *  - i=15 => pivot high (106)
//          */
//         const prices: PriceDTO[] = [
//           // i=0
//           { timestamp: 1,  price: 100, close: 100, high: 100,   low: 98,   volume: 1000 },
//           { timestamp: 2,  price: 101, close: 101, high: 101,   low: 99,   volume: 1000 },
//           { timestamp: 3,  price: 102, close: 102, high: 102,   low: 99,   volume: 1000 },
//           { timestamp: 4,  price: 98,  close: 98,  high: 98,    low: 95,   volume: 900  },
//           { timestamp: 5,  price: 97,  close: 97,  high: 97,    low: 94,   volume: 1000 },
      
//           // i=5 => pivot LOW: 90 (lowest vs i=0..4 & i=6..10)
//           { timestamp: 6,  price: 90,  close: 90,  high: 90,    low: 89,   volume: 950  },
      
//           // i=6..9 => all above 90 but below 105
//           { timestamp: 7,  price: 94,  close: 94,  high: 94,    low: 93,   volume: 1000 },
//           { timestamp: 8,  price: 96,  close: 96,  high: 96,    low: 94,   volume: 1000 },
//           { timestamp: 9,  price: 92,  close: 92,  high: 92,    low: 90,   volume: 1000 },
//           { timestamp: 10, price: 93,  close: 93,  high: 93,    low: 90,   volume: 1000 },
      
//           // i=10 => pivot HIGH: 105 (bigger than i=5..9 & i=11..14)
//           { timestamp: 11, price: 105, close: 105, high: 105,   low: 103,  volume: 1200 },
      
//           // i=11
//           { timestamp: 12, price: 104, close: 104, high: 104,   low: 102,  volume: 1000 },
      
//           // i=12 => extra "touch": near line from i=10->105 slope to i=15->106
//           // Slope = (106 - 105) / (15 - 10) = 1/5 = 0.2
//           // For i=12, xDelta= (12-10)=2 => expected line price=105 +0.2*2=105.4
//           // We'll set high=105.35 => within ~0.2% tolerance of 105
//           { timestamp: 13, price: 105.3, close: 105.3, high: 105.35, low: 104, volume: 1000 },
      
//           // i=13,14 => all <= 105
//           { timestamp: 14, price: 104, close: 104, high: 104,   low: 102,  volume: 1000 },
//           { timestamp: 15, price: 103, close: 103, high: 103,   low: 101,  volume: 1000 },
      
//           // i=15 => pivot HIGH: 106 (bigger than i=10..14 & i=16..20)
//           { timestamp: 16, price: 106, close: 106, high: 106,   low: 105,  volume: 1500 },
      
//           // i=16..19 => all <= 106
//           { timestamp: 17, price: 104, close: 104, high: 104,   low: 102,  volume: 1000 },
//           { timestamp: 18, price: 103, close: 103, high: 103,   low: 101,  volume: 900  },
//           { timestamp: 19, price: 100, close: 100, high: 100,   low: 98,   volume: 1100 },
//           { timestamp: 20, price: 99,  close: 99,  high: 99,    low: 97,   volume: 900  },
      
//           // i=20 => pivot LOW candidate if needed
//           { timestamp: 21, price: 95,  close: 95,  high: 95,    low: 93,   volume: 1000 },
//           // i=21
//           { timestamp: 22, price: 96,  close: 96,  high: 96,    low: 94,   volume: 1000 },
//         ];
      
//         const trendlines = service.identifyTrendlines(prices);
      
//         // We expect at least 1 or 2 lines:
//         //   - A 'resistance' line from i=10->105 to i=15->106 with i=12 touching.
//         expect(trendlines.length).toBeLessThanOrEqual(5);
//         expect(trendlines.length).toBeGreaterThan(0);
      
//         // Quick structural checks
//         trendlines.forEach((t) => {
//           expect(t.start).toHaveProperty('price');
//           expect(t.start).toHaveProperty('index');
//           expect(t.end).toHaveProperty('price');
//           expect(t.end).toHaveProperty('index');
//           expect(t.strength).toBeGreaterThanOrEqual(0);
//           expect(t.strength).toBeLessThanOrEqual(1);
//           expect(['support', 'resistance']).toContain(t.type);
//         });
//       });
      
//   });

//   describe('validateLevel', () => {
//     it('should return false for fewer than 5 prices', () => {
//       const prices: PriceDTO[] = [
//         {
//           timestamp: 1,
//           price: 100,
//           close: 100,
//           high: 101,
//           low: 99,
//           volume: 1000,
//         },
//         {
//           timestamp: 2,
//           price: 101,
//           close: 101,
//           high: 102,
//           low: 100,
//           volume: 1100,
//         },
//       ];
//       const volumes = prices.map((p) => p.volume || 0);
//       const level = 100;
//       const isValid = service.validateLevel(level, prices, volumes);
//       expect(isValid).toBe(false);
//     });

//     it('should validate a level with enough touches and significant volume', () => {
//       const prices: PriceDTO[] = [
//         {
//           timestamp: 1,
//           price: 100,
//           close: 100,
//           high: 101,
//           low: 99,
//           volume: 1000,
//         },
//         {
//           timestamp: 2,
//           price: 100.2,
//           close: 100.2,
//           high: 101,
//           low: 99.9,
//           volume: 1200,
//         },
//         {
//           timestamp: 3,
//           price: 99.8,
//           close: 99.8,
//           high: 100.5,
//           low: 99.6,
//           volume: 900,
//         },
//         {
//           timestamp: 4,
//           price: 100.1,
//           close: 100.1,
//           high: 100.9,
//           low: 99.9,
//           volume: 3000, // big volume
//         },
//         {
//           timestamp: 5,
//           price: 100,
//           close: 100,
//           high: 100.7,
//           low: 99.7,
//           volume: 1100,
//         },
//         {
//           timestamp: 6,
//           price: 100.2,
//           close: 100.2,
//           high: 101.2,
//           low: 99.8,
//           volume: 950,
//         },
//         {
//           timestamp: 7,
//           price: 99.9,
//           close: 99.9,
//           high: 100.6,
//           low: 99.4,
//           volume: 4000, // another big volume
//         },
//       ];

//       const volumes = prices.map((p) => p.volume || 0);
//       const level = 100;
//       const isValid = service.validateLevel(level, prices, volumes);

//       // Expect true if there are ≥3 touches near 100 and
//       // at least one bar’s volume is above avg + stdDev
//       expect(isValid).toBe(true);
//     });

//     it('should return false if no significant volume is present', () => {
//       /**
//        * Here, we ensure no bar is above (avg + stdDev).
//        * If all volumes are identical, stdDev = 0 => volumeThreshold=avgVolume.
//        * Then no volume is strictly above threshold => "significantVolume" should remain false.
//        */
//       const prices: PriceDTO[] = [
//         {
//           timestamp: 1,
//           price: 100,
//           close: 100,
//           high: 101,
//           low: 99,
//           volume: 1000,
//         },
//         {
//           timestamp: 2,
//           price: 100.1,
//           close: 100.1,
//           high: 100.5,
//           low: 99.8,
//           volume: 1000,
//         },
//         {
//           timestamp: 3,
//           price: 99.9,
//           close: 99.9,
//           high: 101,
//           low: 99.6,
//           volume: 1000,
//         },
//         {
//           timestamp: 4,
//           price: 100,
//           close: 100,
//           high: 101.2,
//           low: 99.7,
//           volume: 1000,
//         },
//         {
//           timestamp: 5,
//           price: 100.05,
//           close: 100.05,
//           high: 101.1,
//           low: 99.9,
//           volume: 1000,
//         },
//       ];

//       const volumes = prices.map((p) => p.volume || 0);
//       const level = 100;
//       const isValid = service.validateLevel(level, prices, volumes);

//       // Even if touches >= 3, we have no "big volume spike"
//       // => should return false
//       expect(isValid).toBe(false);
//     });
//   });
// });
