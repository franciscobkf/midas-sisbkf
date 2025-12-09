<?php
/**
 * SIS MIDAS BKF - Configurações
 * v3.0
 */

// Configurações do Banco de Dados
define('DB_HOST', 'localhost');
define('DB_NAME', 'sisbkf_midas3');
define('DB_USER', 'sisbkf_midas3');
define('DB_PASS', '$px+p(Nx[#+%');

/**
 * Retorna conexão PDO com o banco de dados
 */
function getConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['success' => false, 'error' => 'Erro de conexão: ' . $e->getMessage()]));
        }
    }
    
    return $pdo;
}
