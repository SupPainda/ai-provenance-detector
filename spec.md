# Specification - AI Provenance Detector Rename and Styling Updates

## Goal
Rename the Chromium extension UI and default popup from "Image Metadata Downloader" to "AI Provenance Detector" and update its style to be modern, colorful, and visually appealing.

## Affected Files
1. `popup.html` - Modify title and `<h1>` text.
2. `manifest.json` - Modify name and default_title attributes.
3. `styles.css` - Modify color palette, header typography (adding gradients), container styling (introducing modern shadows and borders), and button interactions/gradients.

## Requirements
- Change name to "AI Provenance Detector" in all user-facing interfaces and metadata.
- Retain all core features (file selection, extraction logic, metadata viewing, download functionality).
- Improve aesthetics:
  - Add gradient headers.
  - Revamp file selection input wrapper with a dashed interactive container.
  - Use rich Indigo/Emerald button gradients for actions.
  - Implement cohesive color hierarchy for AI status output.
  - Maintain minimal diffs and do not restructure HTML elements unnecessarily.
- Perform a backend server connection check immediately when a file is selected:
  - Call the server health check endpoint (`GET http://localhost:3000/`) with a short timeout.
  - If the server is offline or unreachable, display a warning in the status text (e.g., `Ready to extract metadata from <file> (⚠️ Backend server is offline)`) and keep/set the "Extract metadata" button disabled.
  - If the server is online, display the standard ready message and enable the "Extract metadata" button.
- Clear all residual UI states (including AI evidence details wrapper `aiDetails`) immediately when a new image is selected to prevent previous results from showing.
- Implement a dark mode visual theme:
  - Update root color scheme to dark.
  - Set a deep slate/navy gradient background for the body.
  - Apply a dark glassmorphic look to the main container.
  - Update primary text to white/off-white and secondary text to light gray.
  - Redesign the metadata output, file input wrapper, and status colors to match dark mode aesthetics.

