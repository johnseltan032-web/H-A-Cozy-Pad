FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql && a2enmod rewrite

COPY docker/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY .htaccess /var/www/html/.htaccess
COPY --from=frontend-build /app/dist/ /var/www/html/
COPY api/ /var/www/html/api/
RUN mkdir -p /var/www/html/api/uploads && chown -R www-data:www-data /var/www/html/api/uploads

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "mkdir -p /var/www/html/api/uploads && chown -R www-data:www-data /var/www/html/api/uploads && sed -i \"s/Listen 80/Listen ${PORT:-8080}/\" /etc/apache2/ports.conf && sed -i \"s/\\*:80/*:${PORT:-8080}/\" /etc/apache2/sites-available/000-default.conf && exec apache2-foreground"]