# Rsync Deployment Guide

This guide is for deploying Repan using rsync instead of git clone.

## Quick Start

From your local machine (current directory):

```bash
# Rsync to the remote server
rsync -avz --exclude-from=.rsyncignore \
  ./ to26409@repanttt.llan.ll.mit.edu:/home/to26409/repan/

# SSH to the server and deploy
ssh to26409@repanttt.llan.ll.mit.edu
cd /home/to26409/repan
./deploy-rsync.sh
```

## What Gets Excluded

The `.rsyncignore` file excludes:
- `node_modules/` - Docker will rebuild dependencies
- `.next/` - Docker will rebuild the app
- `.git/` - Not needed for rsync deployments
- `.env.local` and other local environment files
- IDE files, logs, and temporary files

## Important Notes

1. **Use deploy-rsync.sh, not deploy.sh**
   - `deploy.sh` expects a git repository and will fail
   - `deploy-rsync.sh` is designed for rsync'd directories

2. **First-time deployment**
   - The script will create `.env` from `.env.example`
   - Review and update `.env` before the deployment continues

3. **Updates**
   - Simply rsync again and run `./deploy-rsync.sh`
   - This will rebuild and restart containers

4. **Your .env file**
   - The rsync excludes `.env.local` but will sync `.env`
   - If you want a fresh `.env` on the server, delete it first:
     ```bash
     ssh to26409@repanttt.llan.ll.mit.edu "rm /home/to26409/repan/.env"
     ```

## Full Example Workflow

```bash
# From your local repan directory
cd /Users/to26409/Projects/repan

# Sync to remote server
rsync -avz --exclude-from=.rsyncignore \
  ./ to26409@repanttt.llan.ll.mit.edu:/home/to26409/repan/

# Deploy on remote server
ssh to26409@repanttt.llan.ll.mit.edu << 'EOF'
cd /home/to26409/repan
./deploy-rsync.sh
EOF
```

## Accessing the Application

Since nginx is already pointing at localhost:3000, the app should be immediately accessible once deployed.

## Troubleshooting

### Permission Issues
```bash
# Make sure deploy-rsync.sh is executable
ssh to26409@repanttt.llan.ll.mit.edu "chmod +x /home/to26409/repan/deploy-rsync.sh"
```

### Port Already in Use
If something is already running on port 3000:
```bash
# Check what's using port 3000
ssh to26409@repanttt.llan.ll.mit.edu "sudo ss -tlnp | grep 3000"

# Stop old containers if any
ssh to26409@repanttt.llan.ll.mit.edu "cd /home/to26409/repan && docker compose down"
```

### View Logs
```bash
ssh to26409@repanttt.llan.ll.mit.edu \
  "cd /home/to26409/repan && docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
```

## One-Line Deploy Command

Create this alias for easy deployments:

```bash
alias deploy-repan='rsync -avz --exclude-from=.rsyncignore ./ to26409@repanttt.llan.ll.mit.edu:/home/to26409/repan/ && ssh to26409@repanttt.llan.ll.mit.edu "cd /home/to26409/repan && ./deploy-rsync.sh"'
```

Then just run: `deploy-repan`
