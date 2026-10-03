<?php
function parseGuestCount($value): ?int
{
    if (!is_int($value) && !is_string($value)) {
        return null;
    }

    $digits = (string) $value;
    if (!preg_match('/^\d+$/D', $digits)) {
        return null;
    }

    $normalized = ltrim($digits, '0');
    $normalized = $normalized === '' ? '0' : $normalized;
    $maximum = (string) PHP_INT_MAX;

    if (
        strlen($normalized) > strlen($maximum) ||
        (strlen($normalized) === strlen($maximum) && strcmp($normalized, $maximum) > 0)
    ) {
        return null;
    }

    return (int) $normalized;
}
