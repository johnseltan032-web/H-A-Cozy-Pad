FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
	&& find /etc/apache2/mods-enabled -maxdepth 1 \( -name 'mpm_*.load' -o -name 'mpm_*.conf' \) ! -name 'mpm_prefork.load' ! -name 'mpm_prefork.conf' -delete \
	&& a2enmod mpm_prefork rewrite \
	&& test "$(apache2ctl -M 2>/dev/null | grep -Ec 'mpm_(prefork|event|worker)_module')" -eq 1

COPY docker/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY docker/start-apache.sh /usr/local/bin/start-apache
RUN chmod +x /usr/local/bin/start-apache
COPY .htaccess /var/www/html/.htaccess
COPY --from=frontend-build /app/dist/ /var/www/html/
COPY api/ /var/www/html/api/
RUN mkdir -p /var/www/html/api/uploads && chown -R www-data:www-data /var/www/html/api/uploads

ENV PORT=8080
EXPOSE 8080

CMD ["/usr/local/bin/start-apache"]