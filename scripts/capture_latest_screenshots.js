import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../screenshots');

const sampleHistory = [
  {
    id: 'pred_1711019200001_abcde',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    videoName: 'marketing_presentation_4k.mp4',
    sourceResolution: '3840x2160 (4K)',
    outputResolution: '1920x1080 (1080p)',
    sourceCodec: 'H.264',
    outputCodec: 'H.264 (libx264)',
    durationSeconds: 180,
    estimatedTimeSeconds: 48.72,
    estimatedTimeFormatted: '48.72 seconds',
    modelName: 'metadata_transcoding_model',
    predictionType: 'metadata_only',
    realtimeFactor: 0.27
  },
  {
    id: 'pred_1711018500002_bcdef',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    videoName: 'nature_documentary_clip.mp4',
    sourceResolution: '1920x1080 (1080p)',
    outputResolution: '1280x720 (720p)',
    sourceCodec: 'H.264',
    outputCodec: 'VP8 (WebM)',
    durationSeconds: 120,
    estimatedTimeSeconds: 24.35,
    estimatedTimeFormatted: '24.35 seconds',
    modelName: 'metadata_transcoding_model',
    predictionType: 'metadata_only',
    realtimeFactor: 0.20
  },
  {
    id: 'pred_1711017800003_cdefg',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    videoName: 'software_tutorial_fullhd.mp4',
    sourceResolution: '1920x1080 (1080p)',
    outputResolution: '854x480 (480p)',
    sourceCodec: 'H.264',
    outputCodec: 'H.264 (libx264)',
    durationSeconds: 300,
    estimatedTimeSeconds: 41.15,
    estimatedTimeFormatted: '41.15 seconds',
    modelName: 'metadata_transcoding_model',
    predictionType: 'metadata_only',
    realtimeFactor: 0.14
  },
  {
    id: 'pred_1711016400004_defgh',
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    videoName: 'action_camera_reel.mp4',
    sourceResolution: '1280x720 (720p)',
    outputResolution: '640x360 (360p)',
    sourceCodec: 'MPEG-4',
    outputCodec: 'H.264 (libx264)',
    durationSeconds: 60,
    estimatedTimeSeconds: 9.42,
    estimatedTimeFormatted: '9.42 seconds',
    modelName: 'metadata_transcoding_model',
    predictionType: 'metadata_only',
    realtimeFactor: 0.16
  }
];

async function capture() {
  console.log('Launching browser for latest UI screenshots...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. Dashboard (Main Landing View of the Latest Redesigned UI)
  console.log('1. Capturing latest Dashboard view...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  // Wait for fluid animation entrance and staggered text reveal
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });

  // 2. Video Analysis (Step 2: Source Inspection & Output Profile Configuration)
  console.log('2. Capturing latest Video Analysis configuration screen...');
  // Click first preset to advance to step 2 configuration
  const presetButtons = await page.$$('button');
  for (const btn of presetButtons) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.includes('1080p FHD')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotsDir, 'video-analysis.png') });

  // 3. Prediction Results (Step 3: Actual prediction result from backend)
  console.log('3. Capturing latest Prediction Results...');
  const predictBtns = await page.$$('button');
  for (const btn of predictBtns) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.includes('Predict Transcoding Time')) {
      await btn.click();
      break;
    }
  }
  // Wait for live prediction API call and result rendering
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(screenshotsDir, 'prediction-results.png') });

  // 4. Model Insights
  console.log('4. Capturing latest Model Insights...');
  await page.goto('http://localhost:3000/insights', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotsDir, 'model-insights.png') });

  // 5. Prediction History
  console.log('5. Capturing latest Prediction History...');
  await page.goto('http://localhost:3000/history', { waitUntil: 'networkidle0' });
  await page.evaluate((data) => {
    localStorage.setItem('vidopt_prediction_history_v1', JSON.stringify(data));
  }, sampleHistory);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotsDir, 'prediction-history.png') });

  // 6. About
  console.log('6. Capturing latest About page...');
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotsDir, 'about.png') });

  await browser.close();
  console.log('All 6 application screenshots successfully captured from latest UI!');
}

capture().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
