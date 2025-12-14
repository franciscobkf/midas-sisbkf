<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once(__DIR__ . '/../includes/config.php');

try {
    $pdo = getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Conexão: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'dashboard':
            $mes_ano = $_GET['mes_ano'] ?? date('Y-m');
            $cotacao = obterCotacaoDolar($pdo);
            $meses_pt = ['01'=>'Janeiro','02'=>'Fevereiro','03'=>'Março','04'=>'Abril','05'=>'Maio','06'=>'Junho','07'=>'Julho','08'=>'Agosto','09'=>'Setembro','10'=>'Outubro','11'=>'Novembro','12'=>'Dezembro'];
            $partes = explode('-', $mes_ano);
            $mes_nome = $meses_pt[$partes[1]] . ' ' . $partes[0];
            
            $resumo_mes = ['receitas_recebidas'=>0, 'receitas_pendentes'=>0, 'despesas_pagas'=>0, 'despesas_pendentes'=>0, 'total_receitas'=>0, 'total_despesas'=>0, 'saldo'=>0];
            
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(CASE WHEN status='pago' THEN (CASE WHEN moeda='USD' THEN valor*? ELSE valor END) ELSE 0 END),0) as recebidas, COALESCE(SUM(CASE WHEN status='pendente' THEN (CASE WHEN moeda='USD' THEN valor*? ELSE valor END) ELSE 0 END),0) as pendentes, COALESCE(SUM(CASE WHEN moeda='USD' THEN valor*? ELSE valor END),0) as total FROM lancamentos WHERE tipo='receita' AND mes_referencia=? AND status!='cancelado'");
            $stmt->execute([$cotacao, $cotacao, $cotacao, $mes_ano]);
            $rec = $stmt->fetch();
            $resumo_mes['receitas_recebidas']=$rec['recebidas'];
            $resumo_mes['receitas_pendentes']=$rec['pendentes'];
            $resumo_mes['total_receitas']=$rec['total'];
            
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(CASE WHEN status='pago' THEN (CASE WHEN moeda='USD' THEN valor*? ELSE valor END) ELSE 0 END),0) as pagas, COALESCE(SUM(CASE WHEN status='pendente' THEN (CASE WHEN moeda='USD' THEN valor*? ELSE valor END) ELSE 0 END),0) as pendentes, COALESCE(SUM(CASE WHEN moeda='USD' THEN valor*? ELSE valor END),0) as total FROM lancamentos WHERE tipo='despesa' AND mes_referencia=? AND status!='cancelado'");
            $stmt->execute([$cotacao, $cotacao, $cotacao, $mes_ano]);
            $desp = $stmt->fetch();
            $resumo_mes['despesas_pagas']=$desp['pagas'];
            $resumo_mes['despesas_pendentes']=$desp['pendentes'];
            $resumo_mes['total_despesas']=$desp['total'];
            
            $resumo_mes['saldo'] = $resumo_mes['total_receitas'] - $resumo_mes['total_despesas'];
            $total_clientes = $pdo->query("SELECT COUNT(*) FROM clientes_cadastro WHERE ativo=1")->fetchColumn();
            $total_despesas_cadastradas = $pdo->query("SELECT COUNT(*) FROM despesas WHERE ativo=1")->fetchColumn();
            $lucro_liquido = $resumo_mes['total_receitas'] - $resumo_mes['total_despesas'];
            $margem_lucro = $resumo_mes['total_receitas'] > 0 ? round(($lucro_liquido / $resumo_mes['total_receitas']) * 100, 1) : 0;
            
            $stmt = $pdo->prepare("SELECT l.*, DATE_FORMAT(l.data_vencimento, '%d/%m/%Y') as vencimento_br, DATE_FORMAT(l.data_pagamento, '%d/%m/%Y') as pagamento_br, COALESCE(c.razao_social, l.descricao) as cliente_nome FROM lancamentos l LEFT JOIN clientes_cadastro c ON l.cliente_id=c.id WHERE l.mes_referencia=? AND l.status!='cancelado' ORDER BY l.data_vencimento ASC, l.id ASC");
            $stmt->execute([$mes_ano]);
            
            respond(['mes_ano'=>$mes_ano, 'mes_nome'=>$mes_nome, 'cotacao_usada'=>$cotacao, 'resumo'=>['total_receitas_brl'=>number_format($resumo_mes['total_receitas'],2,'.',''), 'total_despesas_brl'=>number_format($resumo_mes['total_despesas'],2,'.',''), 'lucro_liquido'=>number_format($lucro_liquido,2,'.',''), 'margem_lucro'=>$margem_lucro, 'total_clientes'=>(int)$total_clientes, 'total_despesas_cadastradas'=>(int)$total_despesas_cadastradas], 'mes_atual'=>['receitas_recebidas'=>number_format($resumo_mes['receitas_recebidas'],2,'.',''), 'receitas_pendentes'=>number_format($resumo_mes['receitas_pendentes'],2,'.',''), 'despesas_pagas'=>number_format($resumo_mes['despesas_pagas'],2,'.',''), 'despesas_pendentes'=>number_format($resumo_mes['despesas_pendentes'],2,'.','')], 'lancamentos_mes'=>$stmt->fetchAll()]);
            break;

        case 'auxiliares':
            $cotacao = obterCotacaoDolar($pdo);
            $cat=$pdo->query("SELECT id,nome,cor,icone FROM categorias WHERE ativo=1 ORDER BY nome")->fetchAll();
            $font=$pdo->query("SELECT id,nome,descricao FROM fontes_receita WHERE ativo=1 ORDER BY nome")->fetchAll();
            $cli=$pdo->query("SELECT id,razao_social,nome_fantasia FROM clientes_cadastro WHERE ativo=1 ORDER BY razao_social")->fetchAll();
            $meses=[];
            $pt=['01'=>'Janeiro','02'=>'Fevereiro','03'=>'Março','04'=>'Abril','05'=>'Maio','06'=>'Junho','07'=>'Julho','08'=>'Agosto','09'=>'Setembro','10'=>'Outubro','11'=>'Novembro','12'=>'Dezembro'];
            for($i=-12;$i<=3;$i++){
                $d=new DateTime();
                $d->modify("$i months");
                $meses[]=['valor'=>$d->format('Y-m'),'label'=>$pt[$d->format('m')].' '.$d->format('Y')];
            }
            usort($meses, function($a,$b){return strcmp($a['valor'],$b['valor']);});
            respond(['categorias'=>$cat,'fontes_receita'=>$font,'clientes_cadastro'=>$cli,'meses_disponiveis'=>$meses,'cotacao'=>$cotacao]);
            break;

        case 'categorias': 
            if($_SERVER['REQUEST_METHOD']==='GET'){
                $s=$pdo->query("SELECT * FROM categorias WHERE ativo=1 ORDER BY nome");
                respond($s->fetchAll());
            } elseif($_SERVER['REQUEST_METHOD']==='POST'){
                $d=getJsonInput(); 
                $pdo->prepare("INSERT INTO categorias (nome, descricao, cor, icone, ativo) VALUES (?,?,?,?,1)")->execute([$d['nome']??'', $d['descricao']??'', $d['cor']??'#6b7280', $d['icone']??'📁']); 
                respond(['id'=>$pdo->lastInsertId(), 'message'=>'Criado']);
            } elseif($_SERVER['REQUEST_METHOD']==='PUT'){
                $id=$_GET['id']??0;
                $d=getJsonInput();
                $pdo->prepare("UPDATE categorias SET nome=?, descricao=?, cor=?, icone=? WHERE id=?")->execute([$d['nome']??'', $d['descricao']??'', $d['cor']??'#6b7280', $d['icone']??'📁', $id]);
                respond(['message'=>'Atualizado']);
            } elseif($_SERVER['REQUEST_METHOD']==='DELETE'){
                $pdo->prepare("UPDATE categorias SET ativo=0 WHERE id=?")->execute([$_GET['id']??0]);
                respond(['message'=>'Removido']);
            } 
            break;

        case 'fontes_receita': 
            if($_SERVER['REQUEST_METHOD']==='GET'){
                $s=$pdo->query("SELECT * FROM fontes_receita WHERE ativo=1 ORDER BY nome");
                respond($s->fetchAll());
            } elseif($_SERVER['REQUEST_METHOD']==='POST'){
                $d=getJsonInput(); 
                $pdo->prepare("INSERT INTO fontes_receita (nome, descricao, ativo) VALUES (?,?,1)")->execute([$d['nome']??'', $d['descricao']??'']); 
                respond(['id'=>$pdo->lastInsertId(), 'message'=>'Criado']);
            } elseif($_SERVER['REQUEST_METHOD']==='PUT'){
                $id=$_GET['id']??0;
                $d=getJsonInput();
                $pdo->prepare("UPDATE fontes_receita SET nome=?, descricao=? WHERE id=?")->execute([$d['nome']??'', $d['descricao']??'', $id]);
                respond(['message'=>'Atualizado']);
            } elseif($_SERVER['REQUEST_METHOD']==='DELETE'){
                $pdo->prepare("UPDATE fontes_receita SET ativo=0 WHERE id=?")->execute([$_GET['id']??0]);
                respond(['message'=>'Removido']);
            } 
            break;

        case 'clientes_cadastro':
            $id=$_GET['id']??null;
            if($_SERVER['REQUEST_METHOD']==='GET' && !$id) {
                $cotacao = obterCotacaoDolar($pdo);
                $stmt = $pdo->prepare("SELECT c.id, c.razao_social, c.nome_fantasia, c.cnpj_cpf, c.email, c.telefone, c.whatsapp, c.contato_nome, c.ativo, (SELECT COUNT(*) FROM receitas r WHERE r.cliente_id=c.id AND r.status='ativo') as total_receitas, (SELECT COALESCE(SUM(CASE WHEN r.moeda='USD' THEN r.valor*? ELSE r.valor END),0) FROM receitas r WHERE r.cliente_id=c.id AND r.status='ativo') as valor_total, (SELECT COALESCE(SUM(CASE WHEN l.moeda='USD' THEN l.valor*? ELSE l.valor END),0) FROM lancamentos l WHERE l.cliente_id=c.id AND l.tipo='receita' AND l.status='pago') as valor_recebido FROM clientes_cadastro c WHERE c.ativo=1 ORDER BY c.razao_social");
                $stmt->execute([$cotacao, $cotacao]);
                respond($stmt->fetchAll());
            } elseif($_SERVER['REQUEST_METHOD']==='GET' && $id) {
                $stmt=$pdo->prepare("SELECT * FROM clientes_cadastro WHERE id=?");
                $stmt->execute([$id]);
                respond($stmt->fetch());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $d = getJsonInput();
                $stmt = $pdo->prepare("INSERT INTO clientes_cadastro (razao_social, nome_fantasia, cnpj_cpf, email, telefone, whatsapp, endereco, cidade, estado, cep, contato_nome, contato_cargo, observacoes, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
                $stmt->execute([$d['razao_social']??'', $d['nome_fantasia']??'', $d['cnpj_cpf']??'', $d['email']??'', $d['telefone']??'', $d['whatsapp']??'', $d['endereco']??'', $d['cidade']??'', $d['estado']??'', $d['cep']??'', $d['contato_nome']??'', $d['contato_cargo']??'', $d['observacoes']??'']);
                respond(['id'=>$pdo->lastInsertId(), 'message'=>'Cliente criado']);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                 $d = getJsonInput(); 
                 $stmt = $pdo->prepare("UPDATE clientes_cadastro SET razao_social=?, nome_fantasia=?, cnpj_cpf=?, email=?, telefone=?, whatsapp=?, endereco=?, cidade=?, estado=?, cep=?, contato_nome=?, contato_cargo=?, observacoes=? WHERE id=?");
                 $stmt->execute([$d['razao_social']??'', $d['nome_fantasia']??'', $d['cnpj_cpf']??'', $d['email']??'', $d['telefone']??'', $d['whatsapp']??'', $d['endereco']??'', $d['cidade']??'', $d['estado']??'', $d['cep']??'', $d['contato_nome']??'', $d['contato_cargo']??'', $d['observacoes']??'', $id]);
                 respond(['message'=>'Cliente atualizado']);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                 $pdo->beginTransaction();
                 $pdo->prepare("UPDATE clientes_cadastro SET ativo=0 WHERE id=?")->execute([$id]);
                 $pdo->prepare("UPDATE lancamentos SET status='cancelado' WHERE cliente_id=? AND status='pendente'")->execute([$id]);
                 $pdo->commit();
                 respond(['message'=>'Cliente desativado']);
            }
            break;
            
        case 'cliente':
            $id = $_GET['id'] ?? 0;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt = $pdo->prepare("SELECT * FROM clientes_cadastro WHERE id=?");
                $stmt->execute([$id]);
                $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
                if(!$cliente){http_response_code(404); respond(['error'=>'404'],false);}
                $stmt=$pdo->prepare("SELECT * FROM receitas WHERE cliente_id=? AND status!='encerrado' ORDER BY created_at DESC");
                $stmt->execute([$id]);
                $cliente['receitas']=$stmt->fetchAll(PDO::FETCH_ASSOC);
                $stmt=$pdo->prepare("SELECT * FROM clientes_anexos WHERE cliente_id=? ORDER BY created_at DESC");
                $stmt->execute([$id]);
                $cliente['anexos']=$stmt->fetchAll();
                $stmt=$pdo->prepare("SELECT * FROM lancamentos WHERE cliente_id=? ORDER BY data_vencimento DESC LIMIT 20");
                $stmt->execute([$id]);
                $cliente['lancamentos']=$stmt->fetchAll();
                respond($cliente);
            }
            break;

        case 'receitas':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $sql="SELECT r.*, c.razao_social as cliente_nome FROM receitas r LEFT JOIN clientes_cadastro c ON r.cliente_id=c.id WHERE r.status != 'encerrado' ORDER BY r.created_at DESC";
                respond($pdo->query($sql)->fetchAll());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $d=getJsonInput();
                
                $stmt=$pdo->prepare("INSERT INTO receitas (cliente_id, fonte_receita_id, descricao, valor, moeda, tipo, recorrencia, dia_vencimento, data_inicio, data_fim, nivel_esforco, equipe, score_roi, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$d['cliente_id']??null, $d['fonte_receita_id']??null, $d['descricao']??'', $d['valor']??0, $d['moeda']??'BRL', $d['tipo']??'recorrente', $d['recorrencia']??'Mensal', $d['dia_vencimento']??1, $d['data_inicio']??null, $d['data_fim']??null, $d['nivel_esforco']??'Médio', $d['equipe']??'', $d['score_roi']??5, $d['status']??'ativo', $d['observacoes']??'']);
                $receitaId = $pdo->lastInsertId();
                
                try {
                    $mesAtual = date('Y-m');
                    $diaVenc = $d['dia_vencimento'] ?? 10;
                    $diaVenc = min((int)$diaVenc, (int)date('t'));
                    $dataVencimento = $mesAtual . '-' . str_pad($diaVenc, 2, '0', STR_PAD_LEFT);
                    
                    $stmtCli = $pdo->prepare("SELECT razao_social FROM clientes_cadastro WHERE id = ?");
                    $stmtCli->execute([$d['cliente_id']]);
                    $cli = $stmtCli->fetch();
                    $nomeCliente = $cli ? $cli['razao_social'] : ($d['descricao'] ?? 'Receita');

                    $stmtLanc = $pdo->prepare("INSERT INTO lancamentos (tipo, cliente_id, receita_id, descricao, valor, moeda, data_vencimento, status, mes_referencia) VALUES ('receita', ?, ?, ?, ?, ?, ?, 'pendente', ?)");
                    $stmtLanc->execute([$d['cliente_id']??null, $receitaId, $nomeCliente, $d['valor']??0, $d['moeda']??'BRL', $dataVencimento, $mesAtual]);
                    
                    respond(['id'=>$receitaId, 'message'=>'Receita e lançamento criados!']);
                } catch (Exception $e) {
                    respond(['id'=>$receitaId, 'message'=>'Receita criada, mas erro no lançamento']);
                }
                
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                 $id = $_GET['id'] ?? 0;
                 $pdo->beginTransaction();
                 $pdo->prepare("UPDATE receitas SET status='encerrado' WHERE id=?")->execute([$id]);
                 $pdo->prepare("UPDATE lancamentos SET status='cancelado' WHERE receita_id=? AND status='pendente'")->execute([$id]);
                 $pdo->commit();
                 respond(['message'=>'Receita encerrada']);
            }
            break;
            
        case 'receita':
            $id=$_GET['id']??0;
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt=$pdo->prepare("SELECT r.*, c.razao_social as cliente_nome FROM receitas r LEFT JOIN clientes_cadastro c ON r.cliente_id=c.id WHERE r.id=?");
                $stmt->execute([$id]);
                $receita=$stmt->fetch(PDO::FETCH_ASSOC);
                if(!$receita) respond(['error'=>'404'],false);
                respond($receita);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $d=getJsonInput();
                $stmt=$pdo->prepare("UPDATE receitas SET cliente_id=?, fonte_receita_id=?, descricao=?, valor=?, moeda=?, tipo=?, recorrencia=?, dia_vencimento=?, data_inicio=?, data_fim=?, nivel_esforco=?, equipe=?, score_roi=?, status=?, observacoes=? WHERE id=?");
                $stmt->execute([$d['cliente_id']??null, $d['fonte_receita_id']??null, $d['descricao']??'', $d['valor']??0, $d['moeda']??'BRL', $d['tipo']??'recorrente', $d['recorrencia']??'Mensal', $d['dia_vencimento']??1, $d['data_inicio']??null, $d['data_fim']??null, $d['nivel_esforco']??'Médio', $d['equipe']??'', $d['score_roi']??5, $d['status']??'ativo', $d['observacoes']??'', $id]);
                respond(['message'=>'Receita atualizada']);
            }
            break;

        case 'despesas':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                respond($pdo->query("SELECT * FROM despesas WHERE ativo=1 ORDER BY descricao")->fetchAll());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $d=getJsonInput();
                $stmt=$pdo->prepare("INSERT INTO despesas (descricao, categoria_id, valor, moeda, recorrencia, dia_vencimento, observacoes, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
                $stmt->execute([$d['descricao']??'', $d['categoria_id']??null, $d['valor']??0, $d['moeda']??'BRL', $d['recorrencia']??'Mensal', $d['dia_vencimento']??1, $d['observacoes']??'']);
                respond(['id'=>$pdo->lastInsertId(), 'message'=>'Despesa criada']);
            }
            break;

        case 'despesa':
            $id=$_GET['id']??0;
            if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $d=getJsonInput();
                $stmt=$pdo->prepare("UPDATE despesas SET descricao=?, categoria_id=?, valor=?, moeda=?, recorrencia=?, dia_vencimento=?, observacoes=?, ativo=? WHERE id=?");
                $stmt->execute([$d['descricao']??'', $d['categoria_id']??null, $d['valor']??0, $d['moeda']??'BRL', $d['recorrencia']??'Mensal', $d['dia_vencimento']??1, $d['observacoes']??'', $d['ativo']??1, $id]);
                respond(['message'=>'Despesa atualizada']);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $pdo->beginTransaction();
                $pdo->prepare("UPDATE despesas SET ativo=0 WHERE id=?")->execute([$id]);
                $pdo->prepare("UPDATE lancamentos SET status='cancelado' WHERE despesa_id=? AND status='pendente'")->execute([$id]);
                $pdo->commit();
                respond(['message'=>'Despesa removida']);
            }
            break;

        case 'lancamentos':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $mes_ano=$_GET['mes_ano']??date('Y-m');
                $tipo=$_GET['tipo']??null;
                $status=$_GET['status']??null;
                $sql="SELECT l.*, c.razao_social as cliente_nome, r.descricao as receita_descricao FROM lancamentos l LEFT JOIN clientes_cadastro c ON l.cliente_id=c.id LEFT JOIN receitas r ON l.receita_id=r.id WHERE l.mes_referencia=?";
                $params=[$mes_ano];
                if($tipo){$sql.=" AND l.tipo=?"; $params[]=$tipo;}
                if($status){$sql.=" AND l.status=?"; $params[]=$status;}
                $sql.=" ORDER BY l.data_vencimento";
                $stmt=$pdo->prepare($sql);
                $stmt->execute($params);
                respond($stmt->fetchAll());
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $d=getJsonInput();
                $stmt=$pdo->prepare("INSERT INTO lancamentos (tipo, cliente_id, receita_id, despesa_id, descricao, valor, moeda, data_vencimento, data_pagamento, status, mes_referencia, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$d['tipo']??'receita', $d['cliente_id']??null, $d['receita_id']??null, $d['despesa_id']??null, $d['descricao']??'', $d['valor']??0, $d['moeda']??'BRL', $d['data_vencimento']??date('Y-m-d'), $d['data_pagamento']??null, $d['status']??'pendente', $d['mes_referencia']??date('Y-m'), $d['observacoes']??'']);
                respond(['id'=>$pdo->lastInsertId(), 'message'=>'Lançamento criado']);
            }
            break;

        case 'lancamento':
            $id=$_GET['id']??0;
            $scope=$_GET['scope']??'unico';
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $stmt=$pdo->prepare("SELECT l.*, c.razao_social as cliente_nome FROM lancamentos l LEFT JOIN clientes_cadastro c ON l.cliente_id=c.id WHERE l.id=?");
                $stmt->execute([$id]);
                $lancamento=$stmt->fetch(PDO::FETCH_ASSOC);
                if(!$lancamento) respond(['error'=>'404'],false);
                respond($lancamento);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $d=getJsonInput();
                $stmt=$pdo->prepare("UPDATE lancamentos SET tipo=?, cliente_id=?, receita_id=?, despesa_id=?, descricao=?, valor=?, moeda=?, data_vencimento=?, data_pagamento=?, status=?, mes_referencia=?, observacoes=? WHERE id=?");
                $stmt->execute([$d['tipo']??'receita', $d['cliente_id']??null, $d['receita_id']??null, $d['despesa_id']??null, $d['descricao']??'', $d['valor']??0, $d['moeda']??'BRL', $d['data_vencimento']??date('Y-m-d'), $d['data_pagamento']??null, $d['status']??'pendente', $d['mes_referencia']??date('Y-m'), $d['observacoes']??'', $id]);
                respond(['message'=>'Lançamento atualizado']);
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $pdo->beginTransaction();
                $stmt=$pdo->prepare("SELECT receita_id, despesa_id FROM lancamentos WHERE id=?");
                $stmt->execute([$id]);
                $item=$stmt->fetch(PDO::FETCH_ASSOC);
                if($scope==='todos' && $item){
                    if(!empty($item['receita_id'])){
                        $pdo->prepare("UPDATE receitas SET status='encerrado' WHERE id=?")->execute([$item['receita_id']]);
                        $pdo->prepare("UPDATE lancamentos SET status='cancelado' WHERE receita_id=? AND status='pendente' AND id!=?")->execute([$item['receita_id'], $id]);
                    }
                    if(!empty($item['despesa_id'])){
                        $pdo->prepare("UPDATE despesas SET ativo=0 WHERE id=?")->execute([$item['despesa_id']]);
                        $pdo->prepare("UPDATE lancamentos SET status='cancelado' WHERE despesa_id=? AND status='pendente' AND id!=?")->execute([$item['despesa_id'], $id]);
                    }
                }
                $pdo->prepare("DELETE FROM lancamentos WHERE id=?")->execute([$id]);
                $pdo->commit();
                respond(['message'=>'Removido']);
            }
            break;

        case 'marcar_pago':
            $id=$_GET['id']??0;
            $d=getJsonInput();
            $pago=$d['pago']??true;
            $pdo->prepare("UPDATE lancamentos SET status=?, data_pagamento=? WHERE id=?")->execute([$pago?'pago':'pendente', $pago?date('Y-m-d'):NULL, $id]);
            respond(['message'=>$pago?'Pago':'Pendente', 'status'=>$pago?'pago':'pendente']);
            break;

        case 'gerar_lancamentos':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $d=getJsonInput();
                $mes_ano=$d['mes_ano']??date('Y-m');
                $gerados=0;
                $ini=$mes_ano.'-01';
                $fim=date('Y-m-t',strtotime($ini));
                $intervalos=['Mensal'=>1,'Trimestral'=>3,'Semestral'=>6,'Anual'=>12];
                
                $receitas=$pdo->prepare("SELECT r.*, c.razao_social as cliente_nome FROM receitas r LEFT JOIN clientes_cadastro c ON r.cliente_id=c.id WHERE r.status='ativo' AND (r.data_inicio IS NULL OR r.data_inicio<=?) AND (r.data_fim IS NULL OR r.data_fim>=?)");
                $receitas->execute([$fim,$ini]);
                foreach($receitas->fetchAll() as $r){
                    if($r['tipo']==='avulso'){
                        $checkAvulso=$pdo->prepare("SELECT id FROM lancamentos WHERE receita_id=?");
                        $checkAvulso->execute([$r['id']]);
                        if($checkAvulso->fetch()) continue;
                    } else {
                        $int=$intervalos[$r['recorrencia']]??1;
                        if($int>1){ 
                            $l=$pdo->prepare("SELECT data_vencimento FROM lancamentos WHERE receita_id=? ORDER BY data_vencimento DESC LIMIT 1");
                            $l->execute([$r['id']]);
                            $u=$l->fetch();
                            if($u){
                                $d1=new DateTime($u['data_vencimento']);
                                $d1->modify('first day of this month');
                                $d2=new DateTime($ini);
                                if((($d2->format('Y')-$d1->format('Y'))*12+($d2->format('m')-$d1->format('m')))<$int) continue;
                            }
                        }
                    }
                    $check=$pdo->prepare("SELECT id FROM lancamentos WHERE receita_id=? AND mes_referencia=?");
                    $check->execute([$r['id'],$mes_ano]);
                    if(!$check->fetch()){
                        $dia=min($r['dia_vencimento']?:1, date('t',strtotime($ini)));
                        $venc=$mes_ano.'-'.str_pad($dia,2,'0',STR_PAD_LEFT);
                        $pdo->prepare("INSERT INTO lancamentos (tipo,cliente_id,receita_id,descricao,valor,moeda,data_vencimento,status,mes_referencia) VALUES ('receita',?,?,?,?,?,?,?,?)")->execute([$r['cliente_id'],$r['id'],$r['cliente_nome']?:$r['descricao'],$r['valor'],$r['moeda']?:'BRL',$venc,'pendente',$mes_ano]);
                        $gerados++;
                    }
                }
                
                $despesas=$pdo->query("SELECT * FROM despesas WHERE ativo=1 AND recorrencia!='Única'");
                foreach($despesas->fetchAll() as $d){
                    $int=$intervalos[$d['recorrencia']]??1;
                    if($int>1){
                        $l=$pdo->prepare("SELECT data_vencimento FROM lancamentos WHERE despesa_id=? ORDER BY data_vencimento DESC LIMIT 1");
                        $l->execute([$d['id']]);
                        $u=$l->fetch();
                        if($u){
                            $d1=new DateTime($u['data_vencimento']);
                            $d1->modify('first day of this month');
                            $d2=new DateTime($ini);
                            if((($d2->format('Y')-$d1->format('Y'))*12+($d2->format('m')-$d1->format('m')))<$int) continue;
                        }
                    }
                    $check=$pdo->prepare("SELECT id FROM lancamentos WHERE despesa_id=? AND mes_referencia=?");
                    $check->execute([$d['id'],$mes_ano]);
                    if(!$check->fetch()){
                        $dia=min($d['dia_vencimento']?:1, date('t',strtotime($ini)));
                        $venc=$mes_ano.'-'.str_pad($dia,2,'0',STR_PAD_LEFT);
                        $pdo->prepare("INSERT INTO lancamentos (tipo,despesa_id,descricao,valor,moeda,data_vencimento,status,mes_referencia) VALUES ('despesa',?,?,?,?,?,?,?)")->execute([$d['id'],$d['descricao'],$d['valor'],$d['moeda']?:'BRL',$venc,'pendente',$mes_ano]);
                        $gerados++;
                    }
                }
                respond(['message'=>"Lançamentos gerados", 'gerados'=>$gerados]);
            }
            break;

        case 'configuracoes':
            if($_SERVER['REQUEST_METHOD']==='GET'){
                $s=$pdo->query("SELECT * FROM configuracoes");
                $c=[];
                foreach($s->fetchAll() as $r) $c[$r['chave']]=$r['valor'];
                respond($c);
            } elseif($_SERVER['REQUEST_METHOD']==='PUT'){
                $d=getJsonInput();
                foreach($d as $k=>$v){
                    $pdo->prepare("UPDATE configuracoes SET valor=? WHERE chave=?")->execute([$v,$k]);
                }
                respond(['message'=>'Salvo']);
            }
            break;
            
        case 'upload_anexo': 
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $cliente_id = $_POST['cliente_id'] ?? 0;
                if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) { http_response_code(400); respond(['error' => 'Erro no upload'], false); }
                $f = $_FILES['arquivo'];
                $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
                $n = uniqid().'_'.preg_replace('/[^a-zA-Z0-9\._-]/','',$f['name']);
                if(move_uploaded_file($f['tmp_name'], __DIR__.'/../uploads/clientes/'.$n)) {
                    $pdo->prepare("INSERT INTO clientes_anexos (cliente_id, nome_arquivo, caminho, tipo, tamanho) VALUES (?,?,?,?,?)")->execute([$cliente_id, $f['name'], 'uploads/clientes/'.$n, $f['type'], $f['size']]);
                    respond(['message'=>'Upload ok']);
                }
            }
            break;
            
        case 'delete_anexo':
            if($_SERVER['REQUEST_METHOD']==='DELETE'){
                $s=$pdo->prepare("SELECT caminho FROM clientes_anexos WHERE id=?");
                $s->execute([$_GET['id']]);
                $a=$s->fetch();
                if($a && file_exists(__DIR__.'/../'.$a['caminho'])) unlink(__DIR__.'/../'.$a['caminho']);
                $pdo->prepare("DELETE FROM clientes_anexos WHERE id=?")->execute([$_GET['id']]);
                respond(['message'=>'Anexo removido']);
            }
            break;
            
        default:
            http_response_code(400);
            respond(['error' => 'Ação não reconhecida'], false);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    respond(['error' => 'Erro: ' . $e->getMessage()], false);
}

function respond($data, $success = true) {
    echo json_encode(['success' => $success, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    return $data ?? [];
}

function obterCotacaoDolar($pdo) {
    $stmt = $pdo->prepare("SELECT valor, updated_at FROM configuracoes WHERE chave = 'cotacao_dolar'");
    $stmt->execute();
    $config = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$config) { $pdo->exec("INSERT INTO configuracoes (chave, valor) VALUES ('cotacao_dolar', '6.00')"); return 6.00; }
    if ((time() - strtotime($config['updated_at'])) < 3 * 3600) { return (float) $config['valor']; }
    try {
        $curl = curl_init();
        curl_setopt_array($curl, [CURLOPT_URL => "https://economia.awesomeapi.com.br/last/USD-BRL", CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3, CURLOPT_SSL_VERIFYPEER => false]);
        $resp = curl_exec($curl);
        curl_close($curl);
        if ($resp) {
            $d = json_decode($resp, true);
            if (isset($d['USDBRL']['bid'])) {
                $val = number_format((float)$d['USDBRL']['bid'], 2, '.', '');
                $pdo->prepare("UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = 'cotacao_dolar'")->execute([$val]);
                return (float) $val;
            }
        }
    } catch (Exception $e) {}
    return (float) $config['valor'];
}
?>