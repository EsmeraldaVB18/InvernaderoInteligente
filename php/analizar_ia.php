<?php

header("Content-Type: application/json; charset=UTF-8");

$imagenBase64 = $_POST["imagen_base64"] ?? null;

if (!$imagenBase64) {
    echo json_encode([
        "success" => false,
        "message" => "No se recibió ninguna imagen."
    ]);
    exit;
}

/* Quitar prefijo Base64 */

if (strpos($imagenBase64, ",") !== false) {
    $imagenBase64 = explode(",", $imagenBase64, 2)[1];
}

/* URL DEL SERVIDOR DE IA EN RENDER */

$urlServidorIA = "https://invernadero-inteligente-ia.onrender.com/predict";

/* Preparar petición*/

$payload = json_encode([
    "image" => $imagenBase64
]);

if ($payload === false) {
    echo json_encode([
        "success" => false,
        "message" => "No fue posible preparar la imagen."
    ]);
    exit;
}

/* Enviar imagen a Flask / YOLO */

$ch = curl_init($urlServidorIA);

curl_setopt_array($ch, [

    CURLOPT_POST => true,

    CURLOPT_POSTFIELDS => $payload,

    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Accept: application/json"
    ],

    CURLOPT_RETURNTRANSFER => true,

    // Render puede tardar en realizar el primer análisis
    CURLOPT_CONNECTTIMEOUT => 15,

    CURLOPT_TIMEOUT => 180,

    CURLOPT_FOLLOWLOCATION => true
]);

$respuestaCruda = curl_exec($ch);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

$errorCurl = curl_error($ch);

curl_close($ch);

/* Error de conexión */

if ($respuestaCruda === false || $errorCurl) {

    echo json_encode([
        "success" => false,
        "message" => "No fue posible conectar con el servidor de IA.",
        "error" => $errorCurl
    ]);

    exit;
}

/* Convertir respuesta JSON */

$datos = json_decode($respuestaCruda, true);

/* Verificar respuesta */

if ($datos === null) {

    echo json_encode([
        "success" => false,
        "message" => "El servidor de IA devolvió una respuesta no válida.",
        "respuesta_cruda" => $respuestaCruda
    ]);

    exit;
}

/* Devolver respuesta de Render */

http_response_code($httpCode ?: 200);

echo json_encode(
    $datos,
    JSON_UNESCAPED_UNICODE
);

exit;