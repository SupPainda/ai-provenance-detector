# Image Metadata Downloader

A Chromium browser extension for extracting metadata from an uploaded image and a direct local utility for running full ExifTool extraction.

## Local ExifTool Utility

### Prerequisites
- Install ExifTool on your machine.
- Make sure `exiftool` is available in your PATH.
- On Windows, the binary may be `exiftool.exe`.

### Usage
1. Open a terminal in `c:\Projects\Major Project v2`.
2. Run:
   - `node extract-metadata.js "C:\\path\\to\\your-image.jpg"`
3. The output file will be created as `your-image.exiftool.txt` in the same folder as the source image.

### Optional output path
- `node extract-metadata.js -o "C:\\output\\metadata.txt" "C:\\path\\to\\your-image.jpg"`
- `node extract-metadata.js -o "C:\\output" "C:\\path\\to\\your-image.jpg"`

### Behavior
- Uses ExifTool flags `-a -u -g1` to preserve all tags, unknown tags, and group names.
- Writes plain text output with the full ExifTool report.

## Extension Usage
1. Open Chrome or another Chromium-based browser.
2. Go to `chrome://extensions/`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the folder `c:\Projects\Major Project v2`.

### Extension workflow
1. Click the extension icon.
2. Upload an image file.
3. Click `Extract metadata`.
4. Click `Download metadata` to save the `.exiftool.txt` file.

## Notes
- The extension currently uses a browser-side parser and is best for quick metadata extraction.
- For full ExifTool coverage, use the local utility above.
