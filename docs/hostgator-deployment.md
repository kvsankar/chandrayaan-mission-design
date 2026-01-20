# Hostgator SFTP Deployment Setup

This guide explains how to set up automated deployment to Hostgator via SFTP using GitHub Actions.

## Overview

The `deploy-hostgator.yml` workflow automatically deploys the application to `https://sankara.net/astro/chandrayaan-mission-design/` whenever code is pushed to the `main` or `master` branch.

## Prerequisites

Before setting up the deployment, you need to gather the following information from your Hostgator account:

1. **SFTP Host** - Your server hostname (e.g., `sankara.net` or `gator1234.hostgator.com`)
2. **SFTP Username** - Your cPanel username or FTP account username
3. **SFTP Port** - Usually `22` for SFTP
4. **SSH Private Key** - Your SSH private key for authentication (recommended) OR password
5. **Remote Path** - The target directory on your server (e.g., `/home/username/public_html/astro/chandrayaan-mission-design/`)

## Step 1: Get SFTP Credentials from Hostgator

### Option A: Using SSH Key (Recommended - More Secure)

1. **Generate SSH Key Pair** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@chandrayaan-mission-design"
   ```
   - Save the key (default: `~/.ssh/id_rsa`)
   - Leave passphrase empty for automated deployment

2. **Add Public Key to Hostgator**:
   - Log in to cPanel
   - Go to **SSH Access** or **Manage SSH Keys**
   - Import or paste your public key (`~/.ssh/id_rsa.pub`)
   - Authorize the key

3. **Get Your Private Key**:
   ```bash
   cat ~/.ssh/id_rsa
   ```
   - Copy the entire output (including `-----BEGIN...` and `-----END...`)

### Option B: Using Password (Less Secure)

If SSH keys aren't available, you can use password authentication:
- You'll need to modify the workflow to use `password` instead of `ssh_private_key`
- Not recommended for production deployments

### Get Other SFTP Details

1. **SFTP Host**:
   - Usually your domain name (`sankara.net`) or Hostgator server hostname
   - Check cPanel → **FTP Accounts** for server details

2. **SFTP Username**:
   - Your cPanel username or specific FTP account username
   - Found in cPanel → **FTP Accounts**

3. **SFTP Port**:
   - Standard SFTP port is `22`
   - Verify in cPanel documentation or contact support if different

4. **Remote Path**:
   - For `https://sankara.net/astro/chandrayaan-mission-design/`:
   - Path should be: `/home/YOUR_USERNAME/public_html/astro/chandrayaan-mission-design/`
   - Replace `YOUR_USERNAME` with your actual cPanel username

## Step 2: Add GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of the following:

### Required Secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SFTP_HOST` | SFTP server hostname | `sankara.net` or `gator1234.hostgator.com` |
| `SFTP_USERNAME` | SFTP/cPanel username | `sankara` or `sankara_ftp` |
| `SFTP_PORT` | SFTP port number | `22` |
| `SFTP_SSH_KEY` | SSH private key content | Contents of `~/.ssh/id_rsa` |
| `SFTP_REMOTE_PATH` | Target directory path | `/home/sankara/public_html/astro/chandrayaan-mission-design/` |

### Adding Secrets via GitHub UI:

1. **SFTP_HOST**:
   - Name: `SFTP_HOST`
   - Value: `sankara.net` (or your Hostgator server hostname)

2. **SFTP_USERNAME**:
   - Name: `SFTP_USERNAME`
   - Value: Your cPanel/FTP username

3. **SFTP_PORT**:
   - Name: `SFTP_PORT`
   - Value: `22`

4. **SFTP_SSH_KEY**:
   - Name: `SFTP_SSH_KEY`
   - Value: Your entire private key (copy output from `cat ~/.ssh/id_rsa`)
   - Include the full key from `-----BEGIN RSA PRIVATE KEY-----` to `-----END RSA PRIVATE KEY-----`

5. **SFTP_REMOTE_PATH**:
   - Name: `SFTP_REMOTE_PATH`
   - Value: `/home/YOUR_USERNAME/public_html/astro/chandrayaan-mission-design/`

### Adding Secrets via GitHub CLI:

```bash
# Set SFTP host
gh secret set SFTP_HOST --body "sankara.net"

# Set SFTP username
gh secret set SFTP_USERNAME --body "your_username"

# Set SFTP port
gh secret set SFTP_PORT --body "22"

# Set SSH private key (from file)
gh secret set SFTP_SSH_KEY < ~/.ssh/id_rsa

# Set remote path
gh secret set SFTP_REMOTE_PATH --body "/home/your_username/public_html/astro/chandrayaan-mission-design/"
```

## Step 3: Prepare Remote Directory

Before the first deployment, ensure the target directory exists on your Hostgator server:

1. **Via cPanel File Manager**:
   - Navigate to `public_html/`
   - Create `astro/` folder if it doesn't exist
   - Create `chandrayaan-mission-design/` folder inside `astro/`

2. **Via SSH** (if enabled):
   ```bash
   ssh your_username@sankara.net
   mkdir -p ~/public_html/astro/chandrayaan-mission-design/
   chmod 755 ~/public_html/astro/chandrayaan-mission-design/
   exit
   ```

3. **Via SFTP Client** (FileZilla, Cyberduck, etc.):
   - Connect to your server
   - Navigate to `public_html/`
   - Create the directory structure

## Step 4: Test the Deployment

### Automatic Deployment:
Push a commit to `main` or `master` branch, and the workflow will run automatically.

### Manual Deployment:
1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy to Hostgator via SFTP** workflow
3. Click **Run workflow** → Select `master` branch → **Run workflow**

### Monitor Deployment:
- Watch the workflow progress in the **Actions** tab
- Check for errors in the deployment logs
- Verify files appear in the remote directory

## Step 5: Verify Deployment

1. **Check Files on Server**:
   - Via cPanel File Manager, verify files exist in `/home/your_username/public_html/astro/chandrayaan-mission-design/`
   - Should see: `index.html`, `wizard.html`, `explorer.html`, `designer.html`, and asset files

2. **Test the Site**:
   - Open: `https://sankara.net/astro/chandrayaan-mission-design/`
   - Should load the landing page with three app cards
   - Test each app link to verify all entry points work

3. **Check Browser Console**:
   - Open DevTools → Console
   - Verify no 404 errors for assets (CSS, JS, images)
   - If you see path errors, may need to adjust `base` in `vite.config.js`

## Troubleshooting

### Common Issues:

**1. SSH Connection Failed**:
- Verify SSH key is correctly added to GitHub Secrets (entire key including headers)
- Ensure public key is authorized in Hostgator cPanel
- Check SFTP_HOST and SFTP_PORT are correct

**2. Permission Denied**:
- Verify SFTP_USERNAME is correct
- Check directory permissions on server (should be 755)
- Ensure remote path exists and is writable

**3. Files Not Appearing**:
- Check SFTP_REMOTE_PATH is correct (including username)
- Verify deployment didn't fail silently (check workflow logs)
- Ensure target directory exists on server

**4. Site Loads but Assets Missing (404)**:
- Check browser console for asset path errors
- May need to adjust Vite `base` config if paths are wrong
- Verify all files uploaded correctly (check file count)

**5. Workflow Timeout**:
- Large file upload may timeout
- Increase timeout in workflow or optimize asset sizes
- Check network connectivity between GitHub and Hostgator

### Getting Help:

1. **Check Workflow Logs**:
   - GitHub Actions → Failed run → Click on job → Expand failed step

2. **Test SFTP Connection Manually**:
   ```bash
   sftp -P 22 username@sankara.net
   # Try to navigate to the target directory
   cd public_html/astro/chandrayaan-mission-design/
   ls
   ```

3. **Hostgator Support**:
   - If SSH/SFTP access issues persist, contact Hostgator support
   - Ask about SSH key authentication and SFTP access

## Security Best Practices

1. **Never Commit Secrets**:
   - Always use GitHub Secrets for credentials
   - Never hardcode passwords or keys in workflow files

2. **Use SSH Keys**:
   - Prefer SSH key authentication over passwords
   - Generate unique keys for GitHub Actions

3. **Restrict Access**:
   - Use FTP accounts with limited permissions if possible
   - Don't use root/admin accounts for deployment

4. **Rotate Keys**:
   - Periodically regenerate SSH keys
   - Update GitHub Secrets when keys change

## Workflow Details

The deployment workflow:
1. ✅ Runs tests (unit + E2E)
2. ✅ Builds the application
3. ✅ Verifies build artifacts
4. ✅ Uploads via SFTP to Hostgator
5. ✅ Displays deployment summary

**Triggers**:
- Push to `main` or `master` branch
- Manual trigger via GitHub Actions UI

**Build Output**:
- Source: `dist-pages/`
- Destination: `/home/username/public_html/astro/chandrayaan-mission-design/`

**URL**:
- Production: `https://sankara.net/astro/chandrayaan-mission-design/`

## Alternative: Password Authentication

If SSH keys don't work, modify the workflow to use password authentication:

```yaml
- name: Deploy to Hostgator via SFTP
  uses: wlixcc/SFTP-Deploy-Action@v1.2.4
  with:
    username: ${{ secrets.SFTP_USERNAME }}
    server: ${{ secrets.SFTP_HOST }}
    port: ${{ secrets.SFTP_PORT }}
    password: ${{ secrets.SFTP_PASSWORD }}  # Use password instead of key
    local_path: './dist-pages/*'
    remote_path: ${{ secrets.SFTP_REMOTE_PATH }}
    sftp_only: true
```

Then add `SFTP_PASSWORD` secret with your FTP password.

**Warning**: Password authentication is less secure than SSH keys.

## Next Steps

Once deployment is working:
1. Set up branch protection rules to require passing tests before merge
2. Consider adding staging environment (different subdirectory)
3. Add deployment notifications (Slack, email, etc.)
4. Monitor site performance and uptime

---

**Questions?** Check the workflow logs in GitHub Actions or contact support.
