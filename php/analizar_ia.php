<?php

header("Content-Type: application/json");

$imagenBase64 = $_POST["imagen_base64"] ?? null;

if (!$imagenBase64) {
    echo json_encode(["success" => false, "message" => "No se recibió imagen"]);
    exit;
}


if (preg_match('/^data:image\/(\w+);base64,/', $imagenBase64, $type)) {
    $imagenBase64 = substr($imagenBase64, strpos($imagenBase64, ',') + 1);
}


$urlServidorLocal = "http://localhost:5000/predict";

$payload = json_encode([
    "image" => $imagenBase64
]);

$ch = curl_init($urlServidorLocal);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$respuestaCruda = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$errorCurl = curl_error($ch);
curl_close($ch);

if ($errorCurl) {
    echo json_encode(["success" => false, "message" => "Error al conectar con el servidor local de IA: " . $errorCurl]);
    exit;
}

$datos = json_decode($respuestaCruda, true);

if ($httpCode !== 200 || !$datos || !isset($datos["predictions"])) {
    echo json_encode([
        "success" => false,
        "message" => "Respuesta inesperada del modelo local",
        "respuesta_cruda" => $respuestaCruda
    ]);
    exit;
}

$predicciones = $datos["predictions"];

$MAPA_CLASES = [
    "albahaca sana" => [
        "diagnostico" => "Planta sana",
        "tipo" => "sana",
        "descripcion" => "La planta presenta un aspecto saludable y sin síntomas visibles.",
        "recomendacion" => "Continuar con el riego y fertilización habitual."
    ],
    "mosca blanca" => [
        "diagnostico" => "Mosca blanca",
        "tipo" => "plaga",
        "descripcion" => "Se detectaron indicios de infestación por mosca blanca en la hoja.",
        "recomendacion" => "Revisar el envés de las hojas, usar trampas amarillas pegajosas y considerar control biológico."
    ],
    "mildiu velloso" => [
        "diagnostico" => "Mildiu velloso",
        "tipo" => "enfermedad",
        "descripcion" => "Se identificaron manchas y vellosidad característica de mildiu velloso.",
        "recomendacion" => "Mejorar la ventilación, reducir la humedad foliar y aplicar fungicida específico si el síntoma avanza."
    ],
    "minador de hoja" => [
        "diagnostico" => "Minador de hoja",
        "tipo" => "plaga",
        "descripcion" => "Se detectaron galerías/túneles característicos de larvas minadoras dentro del tejido foliar.",
        "recomendacion" => "Retirar y destruir las hojas afectadas, usar trampas cromáticas y monitorear la evolución."
    ],
];

if (empty($predicciones)) {
    echo json_encode([
        "success" => false,
        "message" => "Imagen no válida para el análisis"
    ]);
    exit;
}

usort($predicciones, function($a, $b) {
    return ($b["confidence"] ?? 0) <=> ($a["confidence"] ?? 0);
});

$mejor = $predicciones[0];
$claseDetectada = strtolower(trim($mejor["class"] ?? ""));
$confianza = round(($mejor["confidence"] ?? 0) * 100, 1);

// Umbrales de confianza dinámicos para evitar falsos positivos (objetos, plantas falsas o no relacionadas)
$umbralMinimo = 45; // Umbral base para plagas/enfermedades
if ($claseDetectada === "albahaca sana") {
    // Si la red cree que es "sana", le exigimos una confianza mucho mayor (ej. 75%)
    // porque el modelo suele confundir objetos verdes o plantas similares con "sana"
    $umbralMinimo = 75; 
}

if ($confianza < $umbralMinimo) {
    echo json_encode([
        "success" => false,
        "message" => "Imagen no válida para el análisis"
    ]);
    exit;
}

if (!isset($MAPA_CLASES[$claseDetectada])) {
    echo json_encode([
        "success" => false,
        "message" => "Clase '$claseDetectada' no está mapeada en \$MAPA_CLASES",
        "respuesta_cruda" => $respuestaCruda
    ]);
    exit;
}
$info = $MAPA_CLASES[$claseDetectada];

echo json_encode([
    "success" => true,
    "diagnostico" => $info["diagnostico"],
    "tipo" => $info["tipo"],
    "confianza" => $confianza,
    "descripcion" => $info["descripcion"],
    "recomendacion" => $info["recomendacion"]
]);