# Dataset Viewer

Dataset Viewer is an Electron-based application for viewing chat-based LLM datasets in JSONL format.

## Features

- Load and view JSONL files containing chat conversations
- Navigate through multiple chat examples
- Render markdown content in messages
- Cross-platform support (Windows, macOS, Linux)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/snapbooks-app/dataset-viewer.git
   ```

2. Navigate to the project directory:
   ```
   cd dataset-viewer
   ```

3. Install dependencies:
   ```
   npm install
   ```

## Usage

To start the application in development mode:

```bash
npm start
```

## How to Use

1. Click the "Load" button (folder icon) to select a JSONL file containing chat data.
2. Use the "Previous" and "Next" buttons to navigate through the chat examples.
3. Messages are color-coded based on their role (user, assistant, or system).

## Development

The project uses the following technologies:

- Electron
- HTML/CSS (with Tailwind CSS and DaisyUI)
- JavaScript

Main files:
- `main.js`: Electron main process
- `renderer.js`: Electron renderer process
- `index.html`: Main application view
- `chatLoader.js`: Module for loading chat files

## Building and Releasing

### Local Development Builds

To build the application locally for all platforms:

```bash
npm run build
```

To build for specific platforms:

```bash
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

### Automated Releases

The project uses GitHub Actions for automated builds and releases across Windows, macOS, and Linux platforms.

#### Creating a Release

1. **Patch Release** (0.0.5 → 0.0.6):
   ```bash
   npm run release
   ```

2. **Minor Release** (0.0.5 → 0.1.0):
   ```bash
   npm run release:minor
   ```

3. **Major Release** (0.0.5 → 1.0.0):
   ```bash
   npm run release:major
   ```

These commands will:
- Increment the version number in `package.json`
- Create a git tag
- Push changes and tags to GitHub
- Trigger the automated build workflow

#### Build Artifacts

The GitHub Actions workflow will create the following build artifacts:

**Windows:**
- `.exe` installer (NSIS)
- `.msi` installer

**macOS:**
- `.dmg` installer

**Linux:**
- `.deb` package (Debian/Ubuntu)
- `.rpm` package (Red Hat/Fedora)
- `.AppImage` portable executable

#### Manual Workflow Trigger

You can also manually trigger the build workflow from the GitHub Actions tab without creating a release.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
