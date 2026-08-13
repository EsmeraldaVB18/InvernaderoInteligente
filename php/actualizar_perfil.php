<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$usuario_id = $_POST["usuario_id"] ?? "";
$nombre = $_POST["nombre"] ?? "";
$apellido = $_POST["apellido"] ?? "";
$correo = $_POST["correo"] ?? "";
$foto_perfil = $_POST["foto_perfil"] ?? ""; 
$nueva_password = $_POST["nueva_password"] ?? "";

if (!$usuario_id || !$nombre || !$apellido || !$correo) {
    echo json_encode(["success" => false, "message" => "Faltan datos obligatorios (nombre, apellido o correo)"]);
    exit;
}


$stmt_check = $conn->prepare("SELECT id FROM usuarios WHERE correo = ? AND id != ?");
$stmt_check->bind_param("si", $correo, $usuario_id);
$stmt_check->execute();
if ($stmt_check->get_result()->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "El correo ya está en uso por otra cuenta"]);
    exit;
}

$query = "UPDATE usuarios SET nombre = ?, apellido = ?, correo = ?";
$params = [$nombre, $apellido, $correo];
$types = "sss";

if (!empty($foto_perfil)) {
    $query .= ", foto_perfil = ?";
    $params[] = $foto_perfil;
    $types .= "s";
}

if (!empty($nueva_password)) {
    if (strlen($nueva_password) < 6) {
        echo json_encode(["success" => false, "message" => "La contraseña debe tener al menos 6 caracteres"]);
        exit;
    }
    $query .= ", password = ?";
    $params[] = password_hash($nueva_password, PASSWORD_DEFAULT);
    $types .= "s";
}

$query .= " WHERE id = ?";
$params[] = $usuario_id;
$types .= "i";

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Perfil actualizado correctamente",
        "nombre" => $nombre,
        "foto_perfil" => $foto_perfil 
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error al actualizar el perfil: " . $stmt->error]);
}
?>
