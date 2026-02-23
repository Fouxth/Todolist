#!/bin/bash
# ============================================================
# Run this script ON YOUR VPS (103.142.150.196)
# It sets up nginx + self-signed SSL so Socket.IO works over WSS
# Usage: bash setup-ssl.sh
# ============================================================

set -e

echo "==> Installing nginx..."
apt-get update -qq && apt-get install -y nginx openssl

echo "==> Creating self-signed SSL certificate..."
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/server.key \
  -out /etc/nginx/ssl/server.crt \
  -subj "/C=TH/ST=Bangkok/L=Bangkok/O=DevTeam/CN=103.142.150.196"

echo "==> Writing nginx config..."
cat > /etc/nginx/sites-available/todolist << 'EOF'
# HTTP -> redirect to HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS reverse proxy to Node.js on port 3001
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Socket.IO — needs special proxy settings
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_buffering    off;
    }

    # API
    location /api/ {
        proxy_pass         http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
    }
}
EOF

ln -sf /etc/nginx/sites-available/todolist /etc/nginx/sites-enabled/todolist
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx && systemctl enable nginx

echo ""
echo "==> Done! SSL is now active on https://103.142.150.196"
echo "==> Test: curl -k https://103.142.150.196/api/auth/me"
