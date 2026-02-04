// Unit tests for assets.js (Vitest)
import { describe, it, expect } from 'vitest';
import { getRetirementAssets } from '../modules/assets.js';

// Helper to create test data with assets
function createTestData(assets = []) {
  return {
    settings: {
      currency: 'INR',
      fundHouse: 'icici',
      equityReturn: 10,
      debtReturn: 5
    },
    cashflow: {
      income: [],
      expenses: []
    },
    assets: {
      items: assets
    },
    liabilities: {
      items: []
    },
    goals: []
  };
}

describe('getRetirementAssets', () => {
  it('Returns zero for empty assets', () => {
    const data = createTestData([]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Returns zero when no EPF/NPS assets', () => {
    const data = createTestData([
      { id: '1', name: 'House', category: 'Real Estate', value: 8000000 },
      { id: '2', name: 'Car', category: 'Vehicles', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Sums single EPF asset', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1500000);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(1500000);
  });

  it('Sums single NPS asset', () => {
    const data = createTestData([
      { id: '1', name: 'NPS Self', category: 'NPS', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(500000);
  });

  it('Sums multiple EPF assets', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 },
      { id: '2', name: 'EPF Spouse', category: 'EPF', value: 800000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(2300000);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(2300000);
  });

  it('Sums multiple NPS assets', () => {
    const data = createTestData([
      { id: '1', name: 'NPS Self', category: 'NPS', value: 500000 },
      { id: '2', name: 'NPS Spouse', category: 'NPS', value: 300000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(800000);
    expect(result.totalCorpus).toBe(800000);
  });

  it('Sums both EPF and NPS', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 },
      { id: '2', name: 'NPS Self', category: 'NPS', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1500000);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(2000000);
  });

  it('Ignores non-EPF/NPS assets', () => {
    const data = createTestData([
      { id: '1', name: 'House', category: 'Real Estate', value: 8000000 },
      { id: '2', name: 'EPF Self', category: 'EPF', value: 1500000 },
      { id: '3', name: 'Car', category: 'Vehicles', value: 500000 },
      { id: '4', name: 'NPS Self', category: 'NPS', value: 500000 },
      { id: '5', name: 'FD', category: 'Bank/FDs', value: 200000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1500000);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(2000000);
  });

  it('Handles null data gracefully', () => {
    const result = getRetirementAssets(null);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Handles missing assets gracefully', () => {
    const result = getRetirementAssets({});

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Handles undefined value in asset', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: undefined }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Handles null value in asset', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: null }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Full sample data scenario', () => {
    const data = createTestData([
      { id: 'asset-epf-1', name: 'EPF - Salary Self', category: 'EPF', value: 1500000 },
      { id: 'asset-epf-2', name: 'EPF - Salary Spouse', category: 'EPF', value: 800000 },
      { id: 'asset-nps-1', name: 'NPS - Salary Self', category: 'NPS', value: 500000 },
      { id: 'asset-re-1', name: 'Apartment', category: 'Real Estate', value: 8000000 },
      { id: 'asset-car-1', name: 'Honda City', category: 'Vehicles', value: 800000 },
      { id: 'asset-mf-1', name: 'Bluechip Fund', category: 'Mutual Funds', value: 500000 },
      { id: 'asset-fd-1', name: 'HDFC FD', category: 'Bank/FDs', value: 300000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(2300000);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(2800000);
  });
});

describe('Asset Categories', () => {
  it('EPF category is case-sensitive', () => {
    const data = createTestData([
      { id: '1', name: 'EPF', category: 'EPF', value: 1000000 },
      { id: '2', name: 'epf', category: 'epf', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1000000);
  });

  it('NPS category is case-sensitive', () => {
    const data = createTestData([
      { id: '1', name: 'NPS', category: 'NPS', value: 1000000 },
      { id: '2', name: 'nps', category: 'nps', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.npsCorpus).toBe(1000000);
  });
});
