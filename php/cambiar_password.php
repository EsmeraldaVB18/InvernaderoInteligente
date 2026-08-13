<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$token    = trim($_POST["token"]    ?? "");
$password = trim($_POST["password"] ?? "");

if (!$token || !$password) {
    echo json_encode(["success" => false, "message" => "Datos incompletos."]);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(["success" => false, "message" => "La contraseña debe tener al menos 6 caracteres."]);
    exit;
}

// Buscar token válido (máximo 30 minutos)
$stmt = $conn->prepare("SELECT correo, fecha FROM password_resets WHERE token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Token inválido o ya fue utilizado."]);
    exit;
}

$row = $res->fetch_assoc();
$fechaToken = strtotime($row["fecha"]);
$ahora      = time();

if (($ahora - $fechaToken) > 1800) { // 30 minutos
    // Limpiar token expirado
    $del = $conn->prepare("DELETE FROM password_resets WHERE token = ?");
    $del->bind_param("s", $token);
    $del->execute();
    echo json_encode(["success" => false, "message" => "El enlace ha expirado. Solicita uno nuevo."]);
    exit;
}

$correo = $row["correo"];
$hash   = password_hash($password, PASSWORD_DEFAULT);

// Actualizar contraseña
$upd = $conn->prepare("UPDATE usuarios SET password = ? WHERE correo = ?");
$upd->bind_param("ss", $hash, $correo);

if ($upd->execute()) {
    // Eliminar el token usado
    $del = $conn->prepare("DELETE FROM password_resets WHERE token = ?");
    $del->bind_param("s", $token);
    $del->execute();

    echo json_encode(["success" => true, "message" => "Contraseña actualizada correctamente."]);
} else {
    echo json_encode(["success" => false, "message" => "Error al actualizar: " . $upd->error]);
}
?>
