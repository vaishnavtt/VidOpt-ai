import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../components/common/MetricCard';
import { TrendingDown } from 'lucide-react';

describe('MetricCard Component', () => {
  it('renders label, value, unit, and description correctly', () => {
    render(
      <MetricCard
        label="Tuned XGBoost MAE"
        value="1.60"
        unit="seconds"
        description="Mean Absolute Error on test set"
        icon={TrendingDown}
        variant="indigo"
        badge="Top Performer"
      />
    );

    expect(screen.getByText('Tuned XGBoost MAE')).toBeDefined();
    expect(screen.getByText('1.60')).toBeDefined();
    expect(screen.getByText('seconds')).toBeDefined();
    expect(screen.getByText('Mean Absolute Error on test set')).toBeDefined();
    expect(screen.getByText('Top Performer')).toBeDefined();
  });
});
