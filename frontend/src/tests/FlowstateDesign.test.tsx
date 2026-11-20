import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StaggeredText } from '../components/common/StaggeredText';
import { Navbar } from '../components/layout/Navbar';
import { AnalyzeVideo } from '../pages/AnalyzeVideo';

describe('Flowstate Design Components', () => {
  it('renders StaggeredText word-by-word with heading styling', () => {
    const { container } = render(
      <StaggeredText
        as="h1"
        type="heading"
        baseDelayMs={480}
        text="Predict Video Transcoding Time with AI"
      />
    );

    expect(screen.getByText('Predict')).toBeDefined();
    expect(screen.getByText('Video')).toBeDefined();
    expect(screen.getByText('Transcoding')).toBeDefined();
    expect(screen.getByText('Time')).toBeDefined();
    expect(screen.getByText('with')).toBeDefined();
    expect(screen.getByText('AI')).toBeDefined();

    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(6);
  });

  it('renders StaggeredText supporting text word-by-word', () => {
    const { container } = render(
      <StaggeredText
        as="p"
        type="supporting"
        baseDelayMs={1150}
        text="Analyze your video, configure output settings"
      />
    );

    expect(screen.getByText('Analyze')).toBeDefined();
    expect(screen.getByText('your')).toBeDefined();
    expect(screen.getByText('video,')).toBeDefined();
    expect(screen.getByText('configure')).toBeDefined();
    expect(screen.getByText('output')).toBeDefined();
    expect(screen.getByText('settings')).toBeDefined();
  });

  it('renders Navbar with brand, glass pill navigation, and CTA button', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('VidOpt AI')).toBeDefined();
    expect(screen.getByText('Intelligent Video Transcoding')).toBeDefined();
    expect(screen.getByText('Analyze Video')).toBeDefined();
    expect(screen.getByText('Prediction History')).toBeDefined();
    expect(screen.getByText('Model Insights')).toBeDefined();
    expect(screen.getByText('About Project')).toBeDefined();
    expect(screen.getAllByText('Upload Video').length).toBeGreaterThan(0);
  });

  it('renders AnalyzeVideo hero badge, presets, and advances to step 2 on preset click', async () => {
    render(
      <BrowserRouter>
        <AnalyzeVideo />
      </BrowserRouter>
    );

    // Hero badge
    expect(screen.getByText('AI-POWERED TRANSCODING INTELLIGENCE')).toBeDefined();

    // Preset button
    const presetBtn = screen.getByText('1080p FHD (2 min, H.264)');
    expect(presetBtn).toBeDefined();

    // Click preset
    fireEvent.click(presetBtn);

    // Step 2 should now show source characteristics and target configuration
    await waitFor(() => {
      expect(screen.getByText('Extracted Video Characteristics')).toBeDefined();
      expect(screen.getByText('Target Transcoding Configuration')).toBeDefined();
      expect(screen.getByText('Predict Transcoding Time →')).toBeDefined();
    });
  });
});
