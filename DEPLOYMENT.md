# Production Deployment Quick Reference

This guide is for deploying Repan on a production server with **only Docker and Git** (no npm/node required).

## Prerequisites

Your production server needs:
- Docker
- docker-compose (or `docker compose` plugin)
- Git

To install on RHEL/CentOS/Rocky Linux using yum:

```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# Install Git (if not already installed)
sudo yum install -y git
```

## First-Time Deployment

```bash
# 1. Clone the repository
git clone https://github.com/tmhoule/repan.git
cd repan

# 2. Run the deployment script
./deploy.sh
```

That's it! The script will:
- Create `.env` from `.env.example`
- Build Docker images
- Start PostgreSQL database
- Run database migrations automatically
- Start the application

The app will be accessible at `http://localhost:3000` on the server.

**Important:** The app binds to localhost only for security. To make it accessible externally, set up a reverse proxy (nginx, apache, or SSH tunnel).

## Updating to Latest Version

```bash
cd repan
./deploy.sh
```

The script automatically pulls the latest code from GitHub and rebuilds.

## Common Operations

### View Logs
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### View App Logs Only
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app
```

### View Database Logs Only
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f db
```

### Stop the Application
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Restart the Application
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

### Check Container Status
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Configuration

Edit `.env` to customize settings:

```bash
vi .env
```

Important settings:
- `DATABASE_URL` - Database connection string
- `DISABLE_SECURE_COOKIES` - Set to "true" if using HTTP (not HTTPS)
- `NEXT_PUBLIC_APP_NAME` - Application name

After changing `.env`, restart containers:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

## Accessing the App

The app binds to `localhost:3000` only for security. Choose one of these options to access it:

### Option 1: SSH Tunnel (Simple, Secure)

From your local machine:
```bash
ssh -L 3000:localhost:3000 user@your-server
```

Then open `http://localhost:3000` in your local browser.

### Option 2: Reverse Proxy with nginx (For permanent external access)

Install nginx:
```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Create nginx config:
```bash
sudo vi /etc/nginx/conf.d/repan.conf
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

Open firewall for HTTP:
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Now access at `http://your-server-ip` or `http://your-domain.com`

## Backup Database

```bash
docker exec repan-db-1 pg_dump -U repan repan > backup-$(date +%Y%m%d).sql
```

## Restore Database

```bash
docker exec -i repan-db-1 psql -U repan repan < backup-20260325.sql
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs

# Check if port 3000 is already in use
sudo ss -tlnp | grep 3000
```

### Database connection errors
```bash
# Check if database container is running
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Restart database
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart db
```

### Application errors
```bash
# Check application logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app

# Rebuild and restart
./deploy.sh
```

## Security Recommendations

1. **Use a reverse proxy** (nginx/apache) with HTTPS
2. **Configure firewall** to restrict access
3. **Change database password** in docker-compose.prod.yml and .env
4. **Regular backups** of the PostgreSQL database
5. **Keep Docker updated** with `yum update docker-ce`

## Support

For issues, check:
- Application logs: `docker compose logs app`
- Database logs: `docker compose logs db`
- GitHub issues: https://github.com/tmhoule/repan/issues
