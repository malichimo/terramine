# TerraMine Checkpoints

## stable-v1.30b
- **Date**: April 17, 2025
- **Commit**: [Run `git log --oneline -n 1 stable-v1.30b` and 0bdb9d3]
- **Tag**: stable-v1.30b
- **Branch**: stable-v1.30b-branch
- **Description**: Stable version with working sign-in screen, transitions to main UI with GoogleMap and TerracreMarkers. No loading screen issues.
- **How to Revert**:
  ```bash
  # Using tag
  git checkout v1.30-branch
  git reset --hard stable-v1.30b
  git push origin v1.30-branch --force
  # Or using branch
  git checkout v1.30-branch
  git merge stable-v1.30b-branch
  git push origin v1.30-branch