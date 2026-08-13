<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$nombre   = $_POST["nombre"] ?? "";
$apellido = $_POST["apellido"] ?? "";
$correo   = $_POST["correo"] ?? "";
$usuario  = $_POST["usuario"] ?? "";
$password = $_POST["password"] ?? "";

if(!$nombre || !$apellido || !$correo || !$usuario || !$password){
    echo json_encode(["success"=>false,"message"=>"Completa todos los campos"]);
    exit;
}

$verificar = $conn->prepare("SELECT id FROM usuarios WHERE correo=? OR usuario=?");
$verificar->bind_param("ss", $correo, $usuario);
$verificar->execute();
$res = $verificar->get_result();

if($res->num_rows > 0){
    echo json_encode(["success"=>false,"message"=>"Usuario o correo ya existe"]);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO usuarios (nombre,apellido,correo,usuario,password) VALUES (?,?,?,?,?)");
$stmt->bind_param("sssss", $nombre, $apellido, $correo, $usuario, $hash);

if($stmt->execute()){
    echo json_encode(["success"=>true]);
}else{
    echo json_encode(["success"=>false,"message"=>$stmt->error]);
}
?>