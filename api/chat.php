<?php
    require 'config.php';

    header('Access-Control-Allow-Origin: ' . $FRONTEND_ORIGIN);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Vary: Origin');
    header('Content-Type: application/json');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $message = trim((string) ($data['message'] ?? ''));
    $user = trim((string) ($data['user'] ?? 'guest-user'));
    $conversationId = trim((string) ($data['conversation_id'] ?? ''));
    $apiKey = getenv('DIFY_API_KEY') ?: '';
    $apiUrl = rtrim(getenv('DIFY_API_URL') ?: 'https://api.dify.ai/v1', '/');

    if ($message === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Enter a message first.']);
        exit;
    }

    if ($apiKey === '') {
        error_log('Chat request failed: DIFY_API_KEY is not configured.');
        http_response_code(503);
        echo json_encode(['error' => 'Customer support chat is not configured yet.']);
        exit;
    }

    $requestBody = json_encode([
        'inputs' => new stdClass(),
        'query' => $message,
        'response_mode' => 'blocking',
        'user' => $user !== '' ? substr($user, 0, 128) : 'guest-user',
        'conversation_id' => $conversationId,
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Bearer {$apiKey}\r\nContent-Type: application/json\r\n",
            'content' => $requestBody,
            'timeout' => 60,
            'ignore_errors' => true,
        ],
    ]);

    $responseBody = @file_get_contents($apiUrl . '/chat-messages', false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\s([0-9]{3})\s/', $statusLine, $statusMatch);
    $upstreamStatus = (int) ($statusMatch[1] ?? 0);
    $responseData = is_string($responseBody) ? json_decode($responseBody, true) : null;

    if ($upstreamStatus < 200 || $upstreamStatus >= 300 || !is_array($responseData)) {
        error_log('Chat request failed: Dify returned HTTP ' . ($upstreamStatus ?: 'no response'));
        http_response_code(502);
        echo json_encode(['error' => 'Customer support could not reply right now. Please try again.']);
        exit;
    }

    echo json_encode([
        'answer' => $responseData['answer'] ?? 'I could not find an answer. Please try again.',
        'conversation_id' => $responseData['conversation_id'] ?? '',
        'message_id' => $responseData['message_id'] ?? '',
    ]);
?>