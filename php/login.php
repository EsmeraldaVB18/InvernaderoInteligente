<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$usuario_req = $_POST["usuario"] ?? "";
$password_req = $_POST["password"] ?? "";

if (!$usuario_req || !$password_req) {
    echo json_encode(["success" => false, "message" => "Completa todos los campos"]);
    exit;
}

// Buscar por usuario o correo
$stmt = $conn->prepare("SELECT * FROM usuarios WHERE usuario = ? OR correo = ?");
$stmt->bind_param("ss", $usuario_req, $usuario_req);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    $row = $res->fetch_assoc();
    

    if (password_verify($password_req, $row["password"]) || $password_req === $row["password"]) {
        echo json_encode([
            "success"    => true,
            "id"         => $row["id"],
            "usuario"    => $row["usuario"],
            "nombre"     => $row["nombre"],
            "foto_perfil" => $row["foto_perfil"] ?? ""
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Usuario o contraseña incorrectos"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Usuario o contraseña incorrectos"]);
}
?>
