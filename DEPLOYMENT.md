# GitHub Pages Deployment Guide

## Automatic Deployment with GitHub Actions

This project is configured to automatically deploy to GitHub Pages using GitHub Actions.

### How It Works

1. **On Push to Main**: Every time you push code to the `main` branch, the workflow automatically:
   - Installs dependencies
   - Builds the project (`npm run build`)
   - Deploys to GitHub Pages

2. **Manual Trigger**: You can also manually trigger the deployment from:
   - GitHub → Actions tab → "Deploy to GitHub Pages" → Run workflow

### Initial Setup (One-time)

1. **Enable GitHub Pages**:
   - Go to your repository: https://github.com/shuffleo/p2p-gyro-game
   - Navigate to: **Settings** → **Pages**
   - Under "Source", select: **GitHub Actions**
   - Save the settings

2. **Verify Workflow**:
   - Go to: **Actions** tab
   - You should see the "Deploy to GitHub Pages" workflow
   - The workflow will run automatically on the next push to `main`

### Deployment Process

The workflow (`.github/workflows/deploy.yml`) performs these steps:

```yaml
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (npm ci)
4. Build project (npm run build)
5. Upload build artifact
6. Deploy to GitHub Pages
```

### Build Configuration

- **Base Path**: `/p2p-gyro-game/` (configured in `vite.config.js`)
- **Output Directory**: `dist/`
- **Build Tool**: Vite with esbuild minification

### Access Your Deployed Site

Once deployed, your site will be available at:
**https://shuffleo.github.io/p2p-gyro-game/**

### Troubleshooting

#### Workflow Not Running
- Check that GitHub Pages source is set to "GitHub Actions" (not "Deploy from a branch")
- Verify the workflow file exists at `.github/workflows/deploy.yml`
- Check Actions tab for any error messages

#### Build Failures
- Check the Actions tab for build logs
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible (18+)

#### Site Not Updating
- GitHub Pages can take a few minutes to update after deployment
- Check the Actions tab to confirm deployment completed successfully
- Clear browser cache if you see old content

#### 404 Errors
- Verify the base path in `vite.config.js` matches your repository name
- Check that assets are being built correctly in the `dist/` folder

### Manual Deployment (If Needed)

If you need to deploy manually:

```bash
# Build the project
npm run build

# The dist/ folder contains the production build
# You can manually upload this to GitHub Pages or use gh-pages package
```

### Workflow File

The deployment workflow is located at:
`.github/workflows/deploy.yml`

You can customize it if needed, but the default configuration should work for most cases.

### Notes

- The workflow uses the latest GitHub Actions (v4) for Pages deployment
- Builds are cached for faster subsequent deployments
- The workflow runs on Ubuntu latest
- Node.js 18 is used for building

