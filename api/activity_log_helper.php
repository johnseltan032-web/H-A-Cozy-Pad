<?php
function writeActivityLog(
    PDO $pdo,
    string $action,
    string $description,
    ?string $targetType = null,
    ?string $targetId = null
): void {
    $actorUserId = $_SESSION['user_id'] ?? null;
    $actorName = trim((string) ($_SESSION['full_name'] ?? ''));

    if ($actorName === '' && $actorUserId !== null) {
        $user = $pdo->prepare('SELECT full_name FROM users WHERE user_id = ?');
        $user->execute([$actorUserId]);
        $actorName = trim((string) $user->fetchColumn());
    }

    $statement = $pdo->prepare(
        'INSERT INTO admin_activity_log (actor_user_id, actor_name, action, description, target_type, target_id)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $actorUserId,
        $actorName !== '' ? $actorName : 'Unknown administrator',
        $action,
        $description,
        $targetType,
        $targetId,
    ]);
}
