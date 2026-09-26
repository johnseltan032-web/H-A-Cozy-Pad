#!/bin/sh
set -eu

port="${PORT:-8080}"

find /etc/apache2/mods-enabled -maxdepth 1 \( -name 'mpm_*.load' -o -name 'mpm_*.conf' \) ! -name 'mpm_prefork.load' ! -name 'mpm_prefork.conf' -delete
a2enmod mpm_prefork
module_output="$(apache2ctl -M 2>&1)" || {
	printf '%s\n' "$module_output" >&2
	exit 1
}
mpm_count="$(printf '%s\n' "$module_output" | grep -Ec 'mpm_(prefork|event|worker)_module' || true)"
if [ "$mpm_count" -ne 1 ]; then
	printf 'Expected exactly one Apache MPM; found %s.\n%s\n' "$mpm_count" "$module_output" >&2
	exit 1
fi

mkdir -p /var/www/html/api/uploads
chown -R www-data:www-data /var/www/html/api/uploads
sed -i "s/Listen 80/Listen ${port}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${port}>/" /etc/apache2/sites-available/000-default.conf

exec apache2-foreground