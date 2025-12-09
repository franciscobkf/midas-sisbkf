<?php
/**
 * SIS MIDAS v3.0 - API Principal
 * Sistema de Gestão Financeira
 * BKF Group
 * * ATUALIZAÇÃO (Bug Fix + Auto Rate):
 * - Correção de soma de moedas no Dashboard (USD -> BRL).
 * - Integração com API externa para cotação automática do dólar.
 */

// Headers CORS e JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Config - CAMINHO ABSOLUTO
require_once(__DIR__ . '/../includes/config.php');

// Conexão
try {
    $pdo = getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro de conexão: ' . $e->getMessage()]);
    exit;
}

// Roteamento
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        
        // ==================== DASHBOARD (CORRIGIDO) ====================
        case 'dashboard':
            $mes_ano = $_GET['mes_ano'] ?? date('Y-m');
            
            // 1. Buscar cotação do dólar (Automática via API ou Cache)
            $cotacao = obterCotacaoDolar($pdo);

            // Nome do mês formatado
            $meses_pt = [
                '01' => 'Janeiro', '02' => 'Fevereiro', '03' => 'Março',
                '04' => 'Abril', '05' => 'Maio', '06' => 'Junho',
                '07' => 'Julho', '08' => 'Agosto', '09' => 'Setembro',
                '10' => 'Outubro', '11' => 'Novembro', '12' => 'Dezembro'
            ];
            $partes = explode('-', $mes_ano);
            $mes_nome = $meses_pt[$partes[1]] . ' ' . $partes[0];
            
            // 2. Inicializar array de resumo
            $resumo_mes = [
                'receitas_recebidas' => 0,
                'receitas_pendentes' => 0,
                'despesas_pagas' => 0,
                'despesas_pendentes' => 0,
                'total_receitas' => 0,
                'total_despesas' => 0,
                'saldo' => 0
            ];
            
            // 3. Calcular RECEITAS (Convertendo USD -> BRL)
            $stmt = $pdo->prepare("
                SELECT 
                    COALESCE(SUM(CASE WHEN status = 'pago' THEN (CASE WHEN moeda = 'USD' THEN valor * ? ELSE valor END) ELSE 0 END), 0) as recebidas,
                    COALESCE(SUM(CASE WHEN status = 'pendente' THEN (CASE WHEN moeda = 'USD' THEN valor * ? ELSE valor END) ELSE 0 END), 0) as pendentes,
                    COALESCE(SUM(CASE WHEN moeda = 'USD' THEN valor * ? ELSE valor END), 0) as total
                FROM lancamentos 
                WHERE tipo = 'receita' AND mes_referencia = ? AND status != 'cancelado'
            ");
            $stmt->execute([$cotacao, $cotacao, $cotacao, $mes_ano]);
            $rec = $stmt->fetch();
            
            $resumo_mes['receitas_recebidas'] = $rec['recebidas'];
            $resumo_mes['receitas_pendentes'] = $rec['pendentes'];
            $resumo_mes['total_receitas'] = $rec['total'];
            
            // 4. Calcular DESPESAS (Convertendo USD -> BRL)
            $stmt = $pdo->prepare("
                SELECT 
                    COALESCE(SUM(CASE WHEN status = 'pago' THEN (CASE WHEN moeda = 'USD' THEN valor * ? ELSE valor END) ELSE 0 END), 0) as pagas,
                    COALESCE(SUM(CASE WHEN status = 'pendente' THEN (CASE WHEN moeda = 'USD' THEN valor * ? ELSE valor END) ELSE 0 END), 0) as pendentes,
                    COALESCE(SUM(CASE WHEN moeda = 'USD' THEN valor * ? ELSE valor END), 0) as total
                FROM lancamentos 
                WHERE tipo = 'despesa' AND mes_referencia = ? AND status != 'cancelado'
            ");
            $stmt->execute([$cotacao, $cotacao, $cotacao, $mes_ano]);
            $desp = $stmt->fetch();
            
            $resumo_mes['despesas_pagas'] = $desp['pagas'];
            $resumo_mes['despesas_pendentes'] = $desp['pendentes'];
            $resumo_mes['total_despesas'] = $desp['total'];
            
            $resumo_mes['saldo'] = $resumo_mes['total_receitas'] - $resumo_mes['total_despesas'];
            
            // Total clientes ativos
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM clientes_cadastro WHERE ativo = 1");
            $total_clientes = $stmt->fetch()['total'];
            
            // Total despesas cadastradas (fixas)
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM despesas WHERE ativo = 1");
            $total_despesas_cadastradas = $stmt->fetch()['total'];
            
            // Calcular lucro líquido e margem
            $total_receitas = floatval($resumo_mes['total_receitas']);
            $total_despesas = floatval($resumo_mes['total_despesas']);
            $lucro_liquido = $total_receitas - $total_despesas;
            $margem_lucro = $total_receitas > 0 ? round(($lucro_liquido / $total_receitas) * 100, 1) : 0;
            
            // Buscar lançamentos do mês para exibir no dashboard
            $stmt = $pdo->prepare("
                SELECT l.*, 
                       DATE_FORMAT(l.data_vencimento, '%d/%m/%Y') as vencimento_br,
                       DATE_FORMAT(l.data_pagamento, '%d/%m/%Y') as pagamento_br,
                       COALESCE(c.razao_social, l.descricao) as cliente_nome
                FROM lancamentos l
                LEFT JOIN clientes_cadastro c ON l.cliente_id = c.id
                WHERE l.mes_referencia = ? AND l.status != 'cancelado'
                ORDER BY l.data_vencimento ASC, l.id ASC
            ");
            $stmt->execute([$mes_ano]);
            $lancamentos_mes = $stmt->fetchAll();
            
            // Montar resposta
            respond([
                'mes_ano' => $mes_ano,
                'mes_nome' => $mes_nome,
                'cotacao_usada' => $cotacao,
                'resumo' => [
                    'total_receitas_brl' => number_format($total_receitas, 2, '.', ''),
                    'total_despesas_brl' => number_format($total_despesas, 2, '.', ''),
                    'lucro_liquido' => number_format($lucro_liquido, 2, '.', ''),
                    'margem_lucro' => $margem_lucro,
                    'total_clientes' => (int)$total_clientes,
                    'total_despesas_cadastradas' => (int)$total_despesas_cadastradas
                ],
                'mes_atual' => [
                    'receitas_recebidas' => number_format(floatval($resumo_mes['receitas_recebidas']), 2, '.', ''),
                    'receitas_pendentes' => number_format(floatval($resumo_mes['receitas_pendentes']), 2, '.', ''),
                    'despesas_pagas' => number_format(floatval($resumo_mes['despesas_pagas']), 2, '.', ''),
                    'despesas_pendentes' => number_format(floatval($resumo_mes['despesas_pendentes']), 2, '.', '')
                ],
                'lancamentos_mes' => $lancamentos_mes
            ]);
            break;
            
        // ==================== CLIENTES ====================
        case 'clientes':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->query("
                    SELECT c.*, 
                           (SELECT COUNT(*) FROM receitas r WHERE r.cliente_id = c.id AND r.status = 'ativo') as total_receitas,
                           (SELECT COALESCE(SUM(r.valor), 0) FROM receitas r WHERE r.cliente_id = c.id AND r.status = 'ativo') as valor_receitas
                    FROM clientes_cadastro c 
                    ORDER BY c.razao_social
                ");
                respond($stmt->fetchAll());
            } 
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    INSERT INTO clientes_cadastro 
                    (razao_social, nome_fantasia, cnpj_cpf, email, telefone, whatsapp, 
                     endereco, cidade, estado, cep, contato_nome, contato_cargo, observacoes, ativo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([
                    $data['razao_social'] ?? '', $data['nome_fantasia'] ?? '', $data['cnpj_cpf'] ?? '',
                    $data['email'] ?? '', $data['telefone'] ?? '', $data['whatsapp'] ?? '',
                    $data['endereco'] ?? '', $data['cidade'] ?? '', $data['estado'] ?? '',
                    $data['cep'] ?? '', $data['contato_nome'] ?? '', $data['contato_cargo'] ?? '',
                    $data['observacoes'] ?? ''
                ]);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Cliente criado com sucesso']);
            }
            break;
            
        case 'cliente':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->prepare("SELECT * FROM clientes_cadastro WHERE id = ?");
                $stmt->execute([$id]);
                $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$cliente) {
                    http_response_code(404);
                    respond(['error' => 'Cliente não encontrado'], false);
                }
                
                $stmt = $pdo->prepare("SELECT * FROM receitas WHERE cliente_id = ? ORDER BY created_at DESC");
                $stmt->execute([$id]);
                $cliente['receitas'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $stmt = $pdo->prepare("SELECT * FROM clientes_anexos WHERE cliente_id = ? ORDER BY created_at DESC");
                $stmt->execute([$id]);
                $cliente['anexos'] = $stmt->fetchAll();
                
                $stmt = $pdo->prepare("SELECT * FROM lancamentos WHERE cliente_id = ? ORDER BY data_vencimento DESC LIMIT 20");
                $stmt->execute([$id]);
                $cliente['lancamentos'] = $stmt->fetchAll();
                
                respond($cliente);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    UPDATE clientes_cadastro 
                    SET razao_social = ?, nome_fantasia = ?, cnpj_cpf = ?, email = ?, 
                        telefone = ?, whatsapp = ?, endereco = ?, cidade = ?, estado = ?, 
                        cep = ?, contato_nome = ?, contato_cargo = ?, observacoes = ?, ativo = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['razao_social'] ?? '', $data['nome_fantasia'] ?? '', $data['cnpj_cpf'] ?? '',
                    $data['email'] ?? '', $data['telefone'] ?? '', $data['whatsapp'] ?? '',
                    $data['endereco'] ?? '', $data['cidade'] ?? '', $data['estado'] ?? '',
                    $data['cep'] ?? '', $data['contato_nome'] ?? '', $data['contato_cargo'] ?? '',
                    $data['observacoes'] ?? '', $data['ativo'] ?? 1, $id
                ]);
                respond(['message' => 'Cliente atualizado com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $stmt = $pdo->prepare("UPDATE clientes_cadastro SET ativo = 0 WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Cliente desativado com sucesso']);
            }
            break;
            
        // ==================== RECEITAS (Contratos) ====================
        case 'receitas':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $cliente_id = $_GET['cliente_id'] ?? null;
                $status = $_GET['status'] ?? null;
                $sql = "SELECT r.*, c.razao_social as cliente_nome FROM receitas r LEFT JOIN clientes_cadastro c ON r.cliente_id = c.id WHERE 1=1";
                $params = [];
                if ($cliente_id) { $sql .= " AND r.cliente_id = ?"; $params[] = $cliente_id; }
                if ($status) { $sql .= " AND r.status = ?"; $params[] = $status; }
                $sql .= " ORDER BY r.created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                respond($stmt->fetchAll());
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    INSERT INTO receitas 
                    (cliente_id, fonte_receita_id, descricao, valor, moeda, tipo, recorrencia, 
                     dia_vencimento, data_inicio, data_fim, nivel_esforco, equipe, score_roi, status, observacoes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $data['cliente_id'] ?? null, $data['fonte_receita_id'] ?? null, $data['descricao'] ?? '',
                    $data['valor'] ?? 0, $data['moeda'] ?? 'BRL', $data['tipo'] ?? 'recorrente',
                    $data['recorrencia'] ?? 'Mensal', $data['dia_vencimento'] ?? 1, $data['data_inicio'] ?? null,
                    $data['data_fim'] ?? null, $data['nivel_esforco'] ?? 'Médio', $data['equipe'] ?? '',
                    $data['score_roi'] ?? 5, $data['status'] ?? 'ativo', $data['observacoes'] ?? ''
                ]);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Receita criada com sucesso']);
            }
            break;
            
        case 'receita':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->prepare("SELECT r.*, c.razao_social as cliente_nome FROM receitas r LEFT JOIN clientes_cadastro c ON r.cliente_id = c.id WHERE r.id = ?");
                $stmt->execute([$id]);
                $receita = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$receita) { http_response_code(404); respond(['error' => 'Receita não encontrada'], false); }
                respond($receita);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    UPDATE receitas 
                    SET cliente_id = ?, fonte_receita_id = ?, descricao = ?, valor = ?, moeda = ?,
                        tipo = ?, recorrencia = ?, dia_vencimento = ?, data_inicio = ?, data_fim = ?,
                        nivel_esforco = ?, equipe = ?, score_roi = ?, status = ?, observacoes = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['cliente_id'] ?? null, $data['fonte_receita_id'] ?? null, $data['descricao'] ?? '',
                    $data['valor'] ?? 0, $data['moeda'] ?? 'BRL', $data['tipo'] ?? 'recorrente',
                    $data['recorrencia'] ?? 'Mensal', $data['dia_vencimento'] ?? 1, $data['data_inicio'] ?? null,
                    $data['data_fim'] ?? null, $data['nivel_esforco'] ?? 'Médio', $data['equipe'] ?? '',
                    $data['score_roi'] ?? 5, $data['status'] ?? 'ativo', $data['observacoes'] ?? '', $id
                ]);
                respond(['message' => 'Receita atualizada com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $stmt = $pdo->prepare("UPDATE receitas SET status = 'encerrado' WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Receita encerrada com sucesso']);
            }
            break;
            
        // ==================== DESPESAS ====================
        case 'despesas':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->query("SELECT * FROM despesas WHERE ativo = 1 ORDER BY descricao");
                respond($stmt->fetchAll());
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    INSERT INTO despesas 
                    (descricao, categoria_id, valor, moeda, recorrencia, dia_vencimento, observacoes, ativo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([
                    $data['descricao'] ?? '', $data['categoria_id'] ?? null, $data['valor'] ?? 0,
                    $data['moeda'] ?? 'BRL', $data['recorrencia'] ?? 'Mensal', $data['dia_vencimento'] ?? 1,
                    $data['observacoes'] ?? ''
                ]);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Despesa criada com sucesso']);
            }
            break;
            
        case 'despesa':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    UPDATE despesas 
                    SET descricao = ?, categoria_id = ?, valor = ?, moeda = ?, 
                        recorrencia = ?, dia_vencimento = ?, observacoes = ?, ativo = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['descricao'] ?? '', $data['categoria_id'] ?? null, $data['valor'] ?? 0,
                    $data['moeda'] ?? 'BRL', $data['recorrencia'] ?? 'Mensal', $data['dia_vencimento'] ?? 1,
                    $data['observacoes'] ?? '', $data['ativo'] ?? 1, $id
                ]);
                respond(['message' => 'Despesa atualizada com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $stmt = $pdo->prepare("UPDATE despesas SET ativo = 0 WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Despesa desativada com sucesso']);
            }
            break;
            
        // ==================== LANÇAMENTOS ====================
        case 'lancamentos':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $mes_ano = $_GET['mes_ano'] ?? date('Y-m');
                $tipo = $_GET['tipo'] ?? null;
                $status = $_GET['status'] ?? null;
                $sql = "
                    SELECT l.*, c.razao_social as cliente_nome, r.descricao as receita_descricao
                    FROM lancamentos l
                    LEFT JOIN clientes_cadastro c ON l.cliente_id = c.id
                    LEFT JOIN receitas r ON l.receita_id = r.id
                    WHERE l.mes_referencia = ?
                ";
                $params = [$mes_ano];
                if ($tipo) { $sql .= " AND l.tipo = ?"; $params[] = $tipo; }
                if ($status) { $sql .= " AND l.status = ?"; $params[] = $status; }
                $sql .= " ORDER BY l.data_vencimento";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                respond($stmt->fetchAll());
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    INSERT INTO lancamentos 
                    (tipo, cliente_id, receita_id, despesa_id, descricao, valor, moeda, 
                     data_vencimento, data_pagamento, status, mes_referencia, observacoes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $data['tipo'] ?? 'receita', $data['cliente_id'] ?? null, $data['receita_id'] ?? null,
                    $data['despesa_id'] ?? null, $data['descricao'] ?? '', $data['valor'] ?? 0,
                    $data['moeda'] ?? 'BRL', $data['data_vencimento'] ?? date('Y-m-d'), $data['data_pagamento'] ?? null,
                    $data['status'] ?? 'pendente', $data['mes_referencia'] ?? date('Y-m'), $data['observacoes'] ?? ''
                ]);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Lançamento criado com sucesso']);
            }
            break;
            
        case 'lancamento':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->prepare("SELECT l.*, c.razao_social as cliente_nome FROM lancamentos l LEFT JOIN clientes_cadastro c ON l.cliente_id = c.id WHERE l.id = ?");
                $stmt->execute([$id]);
                $lancamento = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$lancamento) { http_response_code(404); respond(['error' => 'Lançamento não encontrado'], false); }
                respond($lancamento);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    UPDATE lancamentos 
                    SET tipo = ?, cliente_id = ?, receita_id = ?, despesa_id = ?, descricao = ?,
                        valor = ?, moeda = ?, data_vencimento = ?, data_pagamento = ?, 
                        status = ?, mes_referencia = ?, observacoes = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['tipo'] ?? 'receita', $data['cliente_id'] ?? null, $data['receita_id'] ?? null,
                    $data['despesa_id'] ?? null, $data['descricao'] ?? '', $data['valor'] ?? 0,
                    $data['moeda'] ?? 'BRL', $data['data_vencimento'] ?? date('Y-m-d'),
                    $data['data_pagamento'] ?? null, $data['status'] ?? 'pendente',
                    $data['mes_referencia'] ?? date('Y-m'), $data['observacoes'] ?? '', $id
                ]);
                respond(['message' => 'Lançamento atualizado com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $stmt = $pdo->prepare("DELETE FROM lancamentos WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Lançamento excluído com sucesso']);
            }
            break;
            
        case 'lancamento_pagar':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("UPDATE lancamentos SET status = 'pago', data_pagamento = ? WHERE id = ?");
                $stmt->execute([$data['data_pagamento'] ?? date('Y-m-d'), $id]);
                respond(['message' => 'Lançamento marcado como pago']);
            }
            break;
            
        case 'marcar_pago':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $pago = $data['pago'] ?? true;
                if ($pago) {
                    $stmt = $pdo->prepare("UPDATE lancamentos SET status = 'pago', data_pagamento = ? WHERE id = ?");
                    $stmt->execute([date('Y-m-d'), $id]);
                    respond(['message' => 'Lançamento marcado como pago', 'status' => 'pago']);
                } else {
                    $stmt = $pdo->prepare("UPDATE lancamentos SET status = 'pendente', data_pagamento = NULL WHERE id = ?");
                    $stmt->execute([$id]);
                    respond(['message' => 'Lançamento desmarcado', 'status' => 'pendente']);
                }
            }
            break;
            
        // ==================== GERAR LANÇAMENTOS DO MÊS ====================
        case 'gerar_lancamentos':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $mes_ano = $data['mes_ano'] ?? date('Y-m');
                $gerados = 0;
                $primeiro_dia_mes = $mes_ano . '-01';
                $ultimo_dia_mes = date('Y-m-t', strtotime($primeiro_dia_mes));
                
                // Gerar lançamentos de receitas ativas
                $stmt = $pdo->prepare("
                    SELECT r.*, c.razao_social as cliente_nome
                    FROM receitas r
                    LEFT JOIN clientes_cadastro c ON r.cliente_id = c.id
                    WHERE r.status = 'ativo'
                      AND (r.data_inicio IS NULL OR r.data_inicio <= ?)
                      AND (r.data_fim IS NULL OR r.data_fim >= ?)
                ");
                $stmt->execute([$ultimo_dia_mes, $primeiro_dia_mes]);
                $receitas = $stmt->fetchAll();
                
                foreach ($receitas as $receita) {
                    $check = $pdo->prepare("SELECT id FROM lancamentos WHERE receita_id = ? AND mes_referencia = ?");
                    $check->execute([$receita['id'], $mes_ano]);
                    
                    if (!$check->fetch()) {
                        if ($receita['tipo'] === 'avulso') {
                            $checkAvulso = $pdo->prepare("SELECT id FROM lancamentos WHERE receita_id = ?");
                            $checkAvulso->execute([$receita['id']]);
                            if ($checkAvulso->fetch()) continue;
                        }
                        
                        $dia = $receita['dia_vencimento'] ?: 1;
                        $ultimo_dia = date('t', strtotime($primeiro_dia_mes));
                        $dia = min($dia, $ultimo_dia);
                        $data_venc = $mes_ano . '-' . str_pad($dia, 2, '0', STR_PAD_LEFT);
                        
                        $insert = $pdo->prepare("
                            INSERT INTO lancamentos 
                            (tipo, cliente_id, receita_id, descricao, valor, moeda, 
                             data_vencimento, status, mes_referencia)
                            VALUES ('receita', ?, ?, ?, ?, ?, ?, 'pendente', ?)
                        ");
                        $insert->execute([
                            $receita['cliente_id'], $receita['id'], $receita['cliente_nome'] ?: $receita['descricao'],
                            $receita['valor'], $receita['moeda'] ?: 'BRL', $data_venc, $mes_ano
                        ]);
                        $gerados++;
                    }
                }
                
                // Gerar lançamentos de despesas recorrentes
                $stmt = $pdo->query("SELECT * FROM despesas WHERE ativo = 1 AND recorrencia != 'Única'");
                $despesas = $stmt->fetchAll();
                
                foreach ($despesas as $despesa) {
                    $check = $pdo->prepare("SELECT id FROM lancamentos WHERE despesa_id = ? AND mes_referencia = ?");
                    $check->execute([$despesa['id'], $mes_ano]);
                    
                    if (!$check->fetch()) {
                        $dia = $despesa['dia_vencimento'] ?: 1;
                        $ultimo_dia = date('t', strtotime($primeiro_dia_mes));
                        $dia = min($dia, $ultimo_dia);
                        $data_venc = $mes_ano . '-' . str_pad($dia, 2, '0', STR_PAD_LEFT);
                        
                        $insert = $pdo->prepare("
                            INSERT INTO lancamentos 
                            (tipo, despesa_id, descricao, valor, moeda, 
                             data_vencimento, status, mes_referencia)
                            VALUES ('despesa', ?, ?, ?, ?, ?, 'pendente', ?)
                        ");
                        $insert->execute([
                            $despesa['id'], $despesa['descricao'], $despesa['valor'],
                            $despesa['moeda'] ?: 'BRL', $data_venc, $mes_ano
                        ]);
                        $gerados++;
                    }
                }
                
                respond(['message' => "Lançamentos gerados com sucesso", 'gerados' => $gerados, 'mes_ano' => $mes_ano]);
            }
            break;
            
        // ==================== ANEXOS ====================
        case 'upload_anexo':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $cliente_id = $_POST['cliente_id'] ?? 0;
                if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
                    http_response_code(400); respond(['error' => 'Erro no upload do arquivo'], false);
                }
                $file = $_FILES['arquivo'];
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $allowed = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
                if (!in_array($ext, $allowed)) { http_response_code(400); respond(['error' => 'Tipo de arquivo não permitido'], false); }
                
                $filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\._-]/', '', $file['name']);
                $upload_dir = __DIR__ . '/../uploads/clientes/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);
                
                if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
                    $stmt = $pdo->prepare("INSERT INTO clientes_anexos (cliente_id, nome_arquivo, caminho, tipo, tamanho) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$cliente_id, $file['name'], 'uploads/clientes/' . $filename, $file['type'], $file['size']]);
                    respond(['id' => $pdo->lastInsertId(), 'message' => 'Arquivo enviado com sucesso', 'caminho' => 'uploads/clientes/' . $filename]);
                } else {
                    http_response_code(500); respond(['error' => 'Erro ao salvar arquivo'], false);
                }
            }
            break;
            
        case 'delete_anexo':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $stmt = $pdo->prepare("SELECT caminho FROM clientes_anexos WHERE id = ?");
                $stmt->execute([$id]);
                $anexo = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($anexo) {
                    $filepath = __DIR__ . '/../' . $anexo['caminho'];
                    if (file_exists($filepath)) unlink($filepath);
                    $stmt = $pdo->prepare("DELETE FROM clientes_anexos WHERE id = ?");
                    $stmt->execute([$id]);
                }
                respond(['message' => 'Anexo excluído com sucesso']);
            }
            break;
            
        // ==================== RELATÓRIOS ====================
        case 'relatorio_mensal':
            $mes_ano = $_GET['mes_ano'] ?? date('Y-m');
            $stmt = $pdo->prepare("
                SELECT l.*, c.razao_social as cliente_nome
                FROM lancamentos l
                LEFT JOIN clientes_cadastro c ON l.cliente_id = c.id
                WHERE l.mes_referencia = ?
                ORDER BY l.tipo, l.data_vencimento
            ");
            $stmt->execute([$mes_ano]);
            $lancamentos = $stmt->fetchAll();
            $receitas = array_filter($lancamentos, fn($l) => $l['tipo'] === 'receita');
            $despesas = array_filter($lancamentos, fn($l) => $l['tipo'] === 'despesa');
            $total_receitas = array_sum(array_column($receitas, 'valor'));
            $total_despesas = array_sum(array_column($despesas, 'valor'));
            $recebido = array_sum(array_column(array_filter($receitas, fn($l) => $l['status'] === 'pago'), 'valor'));
            $pago = array_sum(array_column(array_filter($despesas, fn($l) => $l['status'] === 'pago'), 'valor'));
            
            respond([
                'mes_ano' => $mes_ano,
                'lancamentos' => array_values($lancamentos),
                'receitas' => array_values($receitas),
                'despesas' => array_values($despesas),
                'totais' => [
                    'receitas' => number_format($total_receitas, 2, '.', ''),
                    'despesas' => number_format($total_despesas, 2, '.', ''),
                    'saldo' => number_format($total_receitas - $total_despesas, 2, '.', ''),
                    'recebido' => number_format($recebido, 2, '.', ''),
                    'pago' => number_format($pago, 2, '.', ''),
                    'a_receber' => number_format($total_receitas - $recebido, 2, '.', ''),
                    'a_pagar' => number_format($total_despesas - $pago, 2, '.', '')
                ]
            ]);
            break;
            
        // ==================== AUXILIARES ====================
        case 'auxiliares':
            $stmt = $pdo->query("SELECT id, nome, cor, icone FROM categorias WHERE ativo = 1 ORDER BY nome");
            $categorias = $stmt->fetchAll();
            $stmt = $pdo->query("SELECT id, nome, descricao FROM fontes_receita WHERE ativo = 1 ORDER BY nome");
            $fontes_receita = $stmt->fetchAll();
            $stmt = $pdo->query("SELECT id, razao_social, nome_fantasia FROM clientes_cadastro WHERE ativo = 1 ORDER BY razao_social");
            $clientes_cadastro = $stmt->fetchAll();
            
            $meses_disponiveis = [];
            $meses_pt = ['01'=>'Janeiro','02'=>'Fevereiro','03'=>'Março','04'=>'Abril','05'=>'Maio','06'=>'Junho','07'=>'Julho','08'=>'Agosto','09'=>'Setembro','10'=>'Outubro','11'=>'Novembro','12'=>'Dezembro'];
            for ($i = -12; $i <= 3; $i++) {
                $data = new DateTime();
                $data->modify("$i months");
                $valor = $data->format('Y-m');
                $mes = $data->format('m');
                $ano = $data->format('Y');
                $meses_disponiveis[] = ['valor' => $valor, 'label' => $meses_pt[$mes] . ' ' . $ano];
            }
            usort($meses_disponiveis, function($a, $b) { return strcmp($a['valor'], $b['valor']); });
            
            respond([
                'categorias' => $categorias,
                'fontes_receita' => $fontes_receita,
                'clientes_cadastro' => $clientes_cadastro,
                'meses_disponiveis' => $meses_disponiveis
            ]);
            break;
            
        // ==================== CLIENTES CADASTRO ====================
        case 'clientes_cadastro':
            $id = $_GET['id'] ?? null;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                if ($id) {
                    $stmt = $pdo->prepare("SELECT * FROM clientes_cadastro WHERE id = ?");
                    $stmt->execute([$id]);
                    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (!$cliente) { http_response_code(404); respond(['error' => 'Cliente não encontrado'], false); }
                    respond($cliente);
                } else {
                    $stmt = $pdo->query("
                        SELECT c.id, c.razao_social, c.nome_fantasia, c.cnpj_cpf, c.email, c.telefone, c.whatsapp, c.contato_nome, c.ativo,
                               (SELECT COUNT(*) FROM receitas r WHERE r.cliente_id = c.id AND r.status = 'ativo') as total_receitas,
                               (SELECT COALESCE(SUM(r.valor), 0) FROM receitas r WHERE r.cliente_id = c.id AND r.status = 'ativo') as valor_receitas,
                               (SELECT COALESCE(SUM(r.valor), 0) FROM receitas r WHERE r.cliente_id = c.id AND r.status = 'ativo') as valor_total,
                               (SELECT COALESCE(SUM(l.valor), 0) FROM lancamentos l WHERE l.cliente_id = c.id AND l.tipo = 'receita' AND l.status = 'pago') as valor_recebido
                        FROM clientes_cadastro c 
                        WHERE c.ativo = 1
                        ORDER BY c.razao_social
                    ");
                    respond($stmt->fetchAll());
                }
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    INSERT INTO clientes_cadastro 
                    (razao_social, nome_fantasia, cnpj_cpf, email, telefone, whatsapp, 
                     endereco, cidade, estado, cep, contato_nome, contato_cargo, observacoes, ativo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([
                    $data['razao_social'] ?? '', $data['nome_fantasia'] ?? '', $data['cnpj_cpf'] ?? '',
                    $data['email'] ?? '', $data['telefone'] ?? '', $data['whatsapp'] ?? '',
                    $data['endereco'] ?? '', $data['cidade'] ?? '', $data['estado'] ?? '',
                    $data['cep'] ?? '', $data['contato_nome'] ?? '', $data['contato_cargo'] ?? '',
                    $data['observacoes'] ?? ''
                ]);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Cliente criado com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                if (!$id) { http_response_code(400); respond(['error' => 'ID não informado'], false); }
                $data = getJsonInput();
                $stmt = $pdo->prepare("
                    UPDATE clientes_cadastro 
                    SET razao_social = ?, nome_fantasia = ?, cnpj_cpf = ?, email = ?, 
                        telefone = ?, whatsapp = ?, endereco = ?, cidade = ?, estado = ?, 
                        cep = ?, contato_nome = ?, contato_cargo = ?, observacoes = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['razao_social'] ?? '', $data['nome_fantasia'] ?? '', $data['cnpj_cpf'] ?? '',
                    $data['email'] ?? '', $data['telefone'] ?? '', $data['whatsapp'] ?? '',
                    $data['endereco'] ?? '', $data['cidade'] ?? '', $data['estado'] ?? '',
                    $data['cep'] ?? '', $data['contato_nome'] ?? '', $data['contato_cargo'] ?? '',
                    $data['observacoes'] ?? '', $id
                ]);
                respond(['message' => 'Cliente atualizado com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                if (!$id) { http_response_code(400); respond(['error' => 'ID não informado'], false); }
                $stmt = $pdo->prepare("UPDATE clientes_cadastro SET ativo = 0 WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Cliente desativado com sucesso']);
            }
            break;
            
        // ==================== CATEGORIAS ====================
        case 'categorias':
            $id = $_GET['id'] ?? null;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->query("SELECT id, nome, descricao, cor, icone FROM categorias WHERE ativo = 1 ORDER BY nome");
                respond($stmt->fetchAll());
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("INSERT INTO categorias (nome, descricao, cor, icone, ativo) VALUES (?, ?, ?, ?, 1)");
                $stmt->execute([$data['nome'] ?? '', $data['descricao'] ?? '', $data['cor'] ?? '#6b7280', $data['icone'] ?? '📁']);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Categoria criada com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                if (!$id) { http_response_code(400); respond(['error' => 'ID não informado'], false); }
                $data = getJsonInput();
                $stmt = $pdo->prepare("UPDATE categorias SET nome = ?, descricao = ?, cor = ?, icone = ? WHERE id = ?");
                $stmt->execute([$data['nome'] ?? '', $data['descricao'] ?? '', $data['cor'] ?? '#6b7280', $data['icone'] ?? '📁', $id]);
                respond(['message' => 'Categoria atualizada com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                if (!$id) { http_response_code(400); respond(['error' => 'ID não informado'], false); }
                $stmt = $pdo->prepare("UPDATE categorias SET ativo = 0 WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Categoria excluída com sucesso']);
            }
            break;
            
        // ==================== FONTES DE RECEITA ====================
        case 'fontes_receita':
            $id = $_GET['id'] ?? null;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->query("SELECT id, nome, descricao FROM fontes_receita WHERE ativo = 1 ORDER BY nome");
                respond($stmt->fetchAll());
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("INSERT INTO fontes_receita (nome, descricao, ativo) VALUES (?, ?, 1)");
                $stmt->execute([$data['nome'] ?? '', $data['descricao'] ?? '']);
                respond(['id' => $pdo->lastInsertId(), 'message' => 'Fonte de receita criada com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                if (!$id) { http_response_code(400); respond(['error' => 'ID não informado'], false); }
                $data = getJsonInput();
                $stmt = $pdo->prepare("UPDATE fontes_receita SET nome = ?, descricao = ? WHERE id = ?");
                $stmt->execute([$data['nome'] ?? '', $data['descricao'] ?? '', $id]);
                respond(['message' => 'Fonte de receita atualizada com sucesso']);
            }
            elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                if (!$id) { http_response_code(400); respond(['error' => 'ID não informado'], false); }
                $stmt = $pdo->prepare("UPDATE fontes_receita SET ativo = 0 WHERE id = ?");
                $stmt->execute([$id]);
                respond(['message' => 'Fonte de receita excluída com sucesso']);
            }
            break;
            
        default:
            http_response_code(400);
            respond(['error' => 'Ação não reconhecida: ' . $action], false);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    respond(['error' => 'Erro no banco de dados: ' . $e->getMessage()], false);
} catch (Exception $e) {
    http_response_code(500);
    respond(['error' => 'Erro: ' . $e->getMessage()], false);
}

// ==================== FUNÇÕES AUXILIARES ====================

function respond($data, $success = true) {
    echo json_encode([
        'success' => $success,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    return $data ?? [];
}

/**
 * Busca cotação atualizada (com cache de 3 horas no banco)
 */
function obterCotacaoDolar($pdo) {
    // 1. Buscar valor atual no banco
    $stmt = $pdo->prepare("SELECT valor, updated_at FROM configuracoes WHERE chave = 'cotacao_dolar'");
    $stmt->execute();
    $config = $stmt->fetch(PDO::FETCH_ASSOC);

    // Se não existir configuração, cria uma padrão e retorna 6.00
    if (!$config) {
        $pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('cotacao_dolar', '6.00')");
        return 6.00;
    }

    // 2. Verificar idade da cotação
    $ultima_atualizacao = strtotime($config['updated_at']);
    $agora = time();
    $horas_passadas = ($agora - $ultima_atualizacao) / 3600;

    // Se foi atualizado há menos de 3 horas, usa o valor do banco (Cache)
    if ($horas_passadas < 3) {
        return (float) $config['valor'];
    }

    // 3. Buscar na API externa (AwesomeAPI - Gratuita)
    try {
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://economia.awesomeapi.com.br/last/USD-BRL",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 3, // Timeout curto
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        $response = curl_exec($curl);
        curl_close($curl);

        if ($response) {
            $dados = json_decode($response, true);
            if (isset($dados['USDBRL']['bid'])) {
                // Pegar valor de compra ('bid') e formatar
                $novo_valor = number_format((float)$dados['USDBRL']['bid'], 2, '.', '');

                // 4. Atualizar no banco de dados com timestamp atual
                $update = $pdo->prepare("UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = 'cotacao_dolar'");
                $update->execute([$novo_valor]);

                return (float) $novo_valor;
            }
        }
    } catch (Exception $e) {
        // Falha silenciosa
    }

    return (float) $config['valor'];
}
?>