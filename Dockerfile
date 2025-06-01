FROM node:lts AS runtime
WORKDIR /app

# Install cron and httpd
RUN apt-get update && apt-get install -y \
    cron \
    apache2 \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . .
RUN npm i

# Create build script
RUN echo '#!/bin/bash\ncd /app && npm run build && cp -r /app/dist/* /var/www/html/' > /usr/local/bin/rebuild.sh
RUN chmod +x /usr/local/bin/rebuild.sh

# Setup cron job for nightly rebuild (2 AM)
RUN echo '0 2 * * * /usr/local/bin/rebuild.sh >> /var/log/cron.log 2>&1' | crontab -

# Create startup script
RUN echo '#!/bin/bash\n\
service cron start\n\
apache2ctl -D FOREGROUND' > /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 80

CMD ["/usr/local/bin/start.sh"]