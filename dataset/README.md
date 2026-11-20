# VidOpt AI Dataset Documentation

This directory contains the dataset used for training and evaluating the video transcoding prediction models.

## Dataset Files

- `transcoding_mesurment.tsv`: Primary dataset containing 68,784 transcoding experiment records across 1,099 unique source videos.
- `youtube_videos.tsv`: Source metadata and collection details for the YouTube video pool.
- `README.txt`: Original schema reference notes.

## Characteristics & Features

- Total Rows: 68,784
- Unique Video IDs: 1,099
- Target Variable: `utime` (CPU transcoding time in seconds)

### Input Attributes:
- Source container metadata: `duration`, `width`, `height`, `bitrate`, `framerate`, `codec`
- Target output configuration: `o_width`, `o_height`, `o_bitrate`, `o_framerate`, `o_codec`
- Frame-level attributes (full-feature model only): `i`, `p`, `b`, `frames`, `i_size`, `p_size`, `size`

### Excluded Attributes:
- `id`: Used solely as grouping key to prevent data leakage during train/test splitting.
- `umem`, `b_size`: Excluded from production model inputs to prevent target leakage and impractical requirements.

## Attribution
Data originates from the Video Transcoding Dataset hosted on the UCI Machine Learning Repository (D. Deneke et al.).
