/**
 * ============================================================
 * SIS MIDAS BKF - SISTEMA FINANCEIRO
 * JavaScript Principal - v3.22 (Master Fix)
 * ============================================================
 */

// Configuração da API
const API_BASE = 'api/';

// Estado da aplicação
const state = {
    mesAtual: new Date().toISOString().slice(0, 7),
    auxiliares: {
        categorias: [],
        fontes_receita: [],
        clientes_cadastro: [],
        meses_disponiveis: [],
        cotacao: 6.00
    },
    clientes: [], // Legacy
    clientes_cadastro: [],
    receitas: [],
    despesas: [],
    lancamentos: [],
    dashboard: null
};

// ============================================================
// UTILIDADES
// ============================================================

function formatMoney(value, currency = 'BRL') {
    const num = parseFloat(value) || 0;
    const symbol = currency === 'USD' ? 'US$ ' : 'R$ ';
    return symbol + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function parseDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 4000);
}

// ============================================================
// API HELPERS
// ============================================================

async function api(action, method = 'GET', data = null, id = null) {
    let url = `${API_BASE}index.php?action=${action}`;
    if (id) url += `&id=${id}`;
    
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data && method !== 'GET') options.body = JSON.stringify(data);
    if (method === 'GET' && data) url += '&' + new URLSearchParams(data).toString();
    
    try {
        const response = await fetch(url, options);
        // Tenta ler o JSON, se falhar (erro PHP), lança erro
        const text = await response.text();
        try {
            const result = JSON.parse(text);
            if (!result.success && result.error) throw new Error(result.error);
            return result;
        } catch (e) {
            console.error('Resposta inválida do servidor:', text);
            throw new Error('Erro no servidor. Verifique o console.');
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadAuxiliares();
    setupNavigation();
    setupEventListeners();
    navigateTo('dashboard');
    setupMonthSelector();
});

async function loadAuxiliares() {
    try {
        const result = await api('auxiliares');
        state.auxiliares = result.data;
        if (result.data.cotacao) {
            state.auxiliares.cotacao = parseFloat(result.data.cotacao);
        }
    } catch (error) { console.error(error); }
}

function setupMonthSelector() {
    const select = document.getElementById('mes-seletor');
    if (!select) return;
    select.innerHTML = state.auxiliares.meses_disponiveis.map(m => `<option value="${m.valor}" ${m.valor === state.mesAtual ? 'selected' : ''}>${m.label}</option>`).join('');
    select.addEventListener('change', (e) => { 
        state.mesAtual = e.target.value; 
        loadCurrentPage();
    });
}

function loadCurrentPage() {
    const activePage = document.querySelector('.page-section.active');
    if (activePage) navigateTo(activePage.id.replace('page-', ''));
}

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => { item.classList.remove('active'); if (item.dataset.page === page) item.classList.add('active'); });
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) pageElement.classList.add('active');
    
    const titles = {'dashboard': 'Dashboard', 'clientes-cadastro': 'Cadastro de Clientes', 'receitas': 'Receitas / Contratos', 'despesas': 'Despesas', 'lancamentos': 'Lançamentos', 'configuracoes': 'Configurações'};
    document.getElementById('header-title').textContent = titles[page] || page;
    
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'clientes-cadastro': loadClientesCadastro(); break;
        case 'receitas': loadReceitas(); break;
        case 'despesas': loadDespesas(); break;
        case 'lancamentos': loadLancamentos(); break;
        case 'configuracoes': loadConfiguracoes(); break; // Agora carrega tudo!
        case 'clientes': loadClientes(); break; // Legacy support
    }
    document.querySelector('.sidebar').classList.remove('open');
}

function setupEventListeners() {
    document.getElementById('menu-toggle')?.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); }));
    document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => closeModal(b.closest('.modal-overlay').id)));
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    try {
        const result = await api('dashboard', 'GET', { mes_ano: state.mesAtual });
        state.dashboard = result.data;
        renderDashboard();
    } catch (error) {
        container.innerHTML = `<div class="empty-state">Erro: ${error.message}<br><button class="btn btn-primary" onclick="loadDashboard()">Tentar novamente</button></div>`;
    }
}

function renderDashboard() {
    const data = state.dashboard;
    const container = document.getElementById('dashboard-content');
    const lucroClass = data.resumo.lucro_liquido >= 0 ? 'positive' : 'negative';
    const cotacaoDia = data.cotacao_usada ? formatMoney(data.cotacao_usada, 'BRL') : 'R$ 6,00';
    
    container.innerHTML = `
        <div class="card mb-3" style="border: 1px solid var(--success-border); background: linear-gradient(to right, var(--bg-card), rgba(16, 185, 129, 0.05));">
            <div class="card-body" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: var(--success-bg); padding: 8px; border-radius: 8px; font-size: 20px;">💵</div>
                    <div>
                        <div style="font-size: 12px; color: var(--muted); text-transform: uppercase; font-weight: 600;">Cotação do Dólar Hoje</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--ink);">${cotacaoDia}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; color: var(--muted);">Atualizado automaticamente</div>
                    <div style="font-size: 11px; color: var(--success);">via AwesomeAPI</div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon receitas">💰</div>
                <div class="stat-info">
                    <div class="stat-label">Receitas Mensais (BRL)</div>
                    <div class="stat-value">${formatMoney(data.resumo.total_receitas_brl)}</div>
                    <div class="stat-change positive">${data.resumo.total_clientes} clientes ativos</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon despesas">📉</div>
                <div class="stat-info">
                    <div class="stat-label">Despesas Mensais</div>
                    <div class="stat-value">${formatMoney(data.resumo.total_despesas_brl)}</div>
                    <div class="stat-change">${data.resumo.total_despesas_cadastradas} despesas fixas</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon lucro">📊</div>
                <div class="stat-info">
                    <div class="stat-label">Lucro Líquido</div>
                    <div class="stat-value ${lucroClass}">${formatMoney(data.resumo.lucro_liquido)}</div>
                    <div class="stat-change ${lucroClass}">${data.resumo.margem_lucro}% margem</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon pendente">⏳</div>
                <div class="stat-info">
                    <div class="stat-label">A Receber (${data.mes_nome})</div>
                    <div class="stat-value">${formatMoney(data.mes_atual.receitas_pendentes)}</div>
                    <div class="stat-change text-success">Recebido: ${formatMoney(data.mes_atual.receitas_recebidas)}</div>
                </div>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header"><h3 class="card-title">⚡ Ações Rápidas</h3></div>
            <div class="card-body">
                <div class="d-flex gap-2" style="flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="openClienteCadastroModal()">➕ Novo Cliente</button>
                    <button class="btn btn-secondary" onclick="openDespesaModal()">➕ Nova Despesa</button>
                    <button class="btn btn-success" onclick="gerarLancamentosMes()">🔄 Gerar Lançamentos</button>
                    <button class="btn btn-secondary" onclick="navigateTo('lancamentos')">📋 Ver Lançamentos</button>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">📋 Lançamentos de ${data.mes_nome}</h3>
                <button class="btn btn-sm btn-secondary" onclick="navigateTo('lancamentos')">Ver Todos</button>
            </div>
            <div class="card-body" style="padding: 16px;">
                ${data.lancamentos_mes.length ? data.lancamentos_mes.slice(0, 10).map(l => {
                    let valorDisplay = formatMoney(l.valor, l.moeda);
                    if (l.moeda === 'USD') {
                        const convertido = parseFloat(l.valor) * parseFloat(data.cotacao_usada || 6);
                        valorDisplay += ` <small class="text-muted" style="font-weight:400; margin-left:4px;">(~${formatMoney(convertido)})</small>`;
                    }
                    return `
                    <div class="lancamento-item ${l.status}">
                        <div class="lancamento-checkbox ${l.status === 'pago' ? 'checked' : ''}" onclick="togglePago(${l.id}, '${l.status}')"></div>
                        <div class="lancamento-info">
                            <div class="lancamento-descricao">${l.descricao}</div>
                            <div class="lancamento-meta">
                                <span>${l.tipo === 'receita' ? '💰 Receita' : '📉 Despesa'}</span>
                                <span>📅 Venc: ${l.vencimento_br}</span>
                                ${l.pagamento_br ? `<span>✅ Pago: ${l.pagamento_br}</span>` : ''}
                                <span class="badge ${l.status === 'pago' ? 'badge-success' : 'badge-warning'}">${l.status}</span>
                            </div>
                        </div>
                        <div class="lancamento-valor ${l.tipo}">
                            ${l.tipo === 'receita' ? '+' : '-'} ${valorDisplay}
                        </div>
                        <div class="lancamento-actions">
                            <button class="btn btn-ghost btn-icon" onclick="editLancamento(${l.id})">✏️</button>
                            <button class="btn btn-ghost btn-icon" onclick="deleteLancamento(${l.id})">🗑️</button>
                        </div>
                    </div>
                `}).join('') : '<div class="empty-state"><div class="empty-state-text">Nenhum lançamento. Clique em "Gerar Lançamentos".</div></div>'}
            </div>
        </div>
    `;
}

async function gerarLancamentosMes() {
    if (!confirm(`Gerar lançamentos para ${state.mesAtual}?`)) return;
    try {
        const result = await api('gerar_lancamentos', 'POST', { mes_ano: state.mesAtual });
        showToast(result.message); loadDashboard();
    } catch (error) { showToast(error.message, 'error'); }
}

async function togglePago(id, currentStatus) {
    try {
        await api('marcar_pago', 'POST', { pago: currentStatus !== 'pago' }, id);
        showToast(currentStatus !== 'pago' ? 'Pago' : 'Pendente'); 
        loadCurrentPage();
    } catch (error) { showToast(error.message, 'error'); }
}

// ============================================================
// RECEITAS / CONTRATOS
// ============================================================

async function loadReceitas() {
    const container = document.getElementById('receitas-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    await loadAuxiliares();
    try {
        const result = await api('receitas');
        state.receitas = result.data || [];
        renderReceitas();
    } catch (error) { container.innerHTML = `<div class="empty-state">Erro: ${error.message}</div>`; }
}

function renderReceitas() {
    const container = document.getElementById('receitas-list');
    if (!state.receitas.length) {
        container.innerHTML = `<div class="empty-state"><p>Nenhuma receita cadastrada</p><button class="btn btn-primary" onclick="openReceitaModal()">➕ Nova Receita</button></div>`;
        return;
    }
    
    const cotacao = state.auxiliares.cotacao || 6.00;
    const porCliente = {};
    state.receitas.forEach(r => {
        const clienteId = r.cliente_id || 0;
        if (!porCliente[clienteId]) porCliente[clienteId] = { nome: r.cliente_nome || 'Sem cliente', receitas: [] };
        porCliente[clienteId].receitas.push(r);
    });
    
    let html = '';
    Object.entries(porCliente).forEach(([clienteId, grupo]) => {
        const totalAtivo = grupo.receitas
            .filter(r => r.status === 'ativo')
            .reduce((sum, r) => {
                let valor = parseFloat(r.valor || 0);
                if (r.moeda && r.moeda.toUpperCase() === 'USD') valor = valor * cotacao;
                return sum + valor;
            }, 0);
        
        html += `
            <div class="card mb-3">
                <div class="card-header" style="background: var(--glass); padding: 16px;">
                    <div><h4 style="font-size: 16px; font-weight: 700;">🏢 ${grupo.nome}</h4></div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: var(--muted);">Total Ativo (Estimado BRL)</div>
                        <div style="font-size: 18px; font-weight: 700; color: var(--success);">${formatMoney(totalAtivo)}</div>
                    </div>
                </div>
                <div class="card-body" style="padding: 0;">
                    <table class="data-table" style="margin: 0;">
                        <thead><tr><th>Descrição</th><th>Valor</th><th>Recorrência</th><th>Status</th><th style="width: 100px;">Ações</th></tr></thead>
                        <tbody>
        `;
        grupo.receitas.forEach(receita => {
            let valorVis = formatMoney(receita.valor, receita.moeda);
            if(receita.moeda === 'USD') {
                valorVis += `<br><span style="font-size:11px; color:var(--muted)">~ ${formatMoney(parseFloat(receita.valor)*cotacao)}</span>`;
            }
            html += `
                <tr style="${receita.status !== 'ativo' ? 'opacity: 0.6;' : ''}">
                    <td>${receita.descricao}</td>
                    <td><strong>${valorVis}</strong></td>
                    <td>${receita.recorrencia} (dia ${receita.dia_vencimento})</td>
                    <td><span class="badge ${receita.status === 'ativo' ? 'badge-success' : 'badge-secondary'}">${receita.status}</span></td>
                    <td><div class="table-actions"><button class="btn-icon" onclick="editReceita(${receita.id})">✏️</button><button class="btn-icon btn-danger" onclick="deleteReceita(${receita.id})">🗑️</button></div></td>
                </tr>
            `;
        });
        html += `</tbody></table></div></div>`;
    });
    container.innerHTML = html;
}

// ============================================================
// LANÇAMENTOS
// ============================================================

async function loadLancamentos() {
    const container = document.getElementById('lancamentos-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    try {
        const result = await api('lancamentos', 'GET', { mes_ano: state.mesAtual });
        state.lancamentos = result.data || [];
        renderLancamentos();
    } catch (error) { container.innerHTML = `<div class="empty-state">Erro: ${error.message}</div>`; }
}

function renderLancamentos() {
    const container = document.getElementById('lancamentos-list');
    const cotacao = state.auxiliares.cotacao || 6.00;
    
    const receitas = state.lancamentos.filter(l => l.tipo === 'receita');
    const despesas = state.lancamentos.filter(l => l.tipo === 'despesa');
    const calc = (itens) => itens.reduce((acc, l) => acc + (l.moeda==='USD' ? parseFloat(l.valor)*cotacao : parseFloat(l.valor)), 0);
    
    const tReceitas = calc(receitas);
    const tDespesas = calc(despesas);
    const tRecRecebido = calc(receitas.filter(l=>l.status==='pago'));
    const tDespPago = calc(despesas.filter(l=>l.status==='pago'));

    container.innerHTML = `
        <div class="stats-grid mb-3" style="grid-template-columns: repeat(4, 1fr);">
            <div class="stat-card"><div class="stat-info"><div class="stat-label">Receitas (BRL)</div><div class="stat-value text-success">${formatMoney(tReceitas)}</div><div class="stat-change">Recebido: ${formatMoney(tRecRecebido)}</div></div></div>
            <div class="stat-card"><div class="stat-info"><div class="stat-label">Despesas (BRL)</div><div class="stat-value text-error">${formatMoney(tDespesas)}</div><div class="stat-change">Pago: ${formatMoney(tDespPago)}</div></div></div>
            <div class="stat-card"><div class="stat-info"><div class="stat-label">Saldo Previsto</div><div class="stat-value ${tReceitas-tDespesas>=0?'positive':'negative'}">${formatMoney(tReceitas-tDespesas)}</div></div></div>
            <div class="stat-card"><div class="stat-info"><div class="stat-label">Saldo Realizado</div><div class="stat-value ${tRecRecebido-tDespPago>=0?'positive':'negative'}">${formatMoney(tRecRecebido-tDespPago)}</div></div></div>
        </div>
        
        <div class="d-flex justify-between align-center mb-3 gap-2" style="flex-wrap: wrap;">
            <div class="d-flex gap-1">
                <button class="btn btn-sm ${!window.filtroTipo ? 'btn-primary' : 'btn-secondary'}" onclick="filtrarLancamentos(null)">Todos</button>
                <button class="btn btn-sm ${window.filtroTipo === 'receita' ? 'btn-primary' : 'btn-secondary'}" onclick="filtrarLancamentos('receita')">💰 Receitas</button>
                <button class="btn btn-sm ${window.filtroTipo === 'despesa' ? 'btn-primary' : 'btn-secondary'}" onclick="filtrarLancamentos('despesa')">📉 Despesas</button>
            </div>
            <div class="d-flex gap-1">
                <button class="btn btn-sm btn-success" onclick="gerarLancamentosMes()">🔄 Gerar</button>
                <button class="btn btn-sm btn-secondary" onclick="openLancamentoModal()">➕ Novo</button>
            </div>
        </div>
        
        ${state.lancamentos.length ? `
            <div class="card">
                <div class="card-header"><h3 class="card-title">📋 Lançamentos</h3></div>
                <div class="card-body" style="padding: 16px;">
                    ${state.lancamentos.filter(l => !window.filtroTipo || l.tipo === window.filtroTipo).map(l => {
                        let valorDisplay = formatMoney(l.valor, l.moeda);
                        if (l.moeda === 'USD') valorDisplay += ` <small class="text-muted">(~${formatMoney(parseFloat(l.valor)*cotacao)})</small>`;
                        return `
                        <div class="lancamento-item ${l.status}">
                            <div class="lancamento-checkbox ${l.status === 'pago' ? 'checked' : ''}" onclick="togglePago(${l.id}, '${l.status}')"></div>
                            <div class="lancamento-info">
                                <div class="lancamento-descricao">${l.descricao}</div>
                                <div class="lancamento-meta">
                                    <span>${l.tipo === 'receita' ? '💰 Receita' : '📉 Despesa'}</span>
                                    <span>📅 Venc: ${l.vencimento_br}</span>
                                    ${l.pagamento_br ? `<span>✅ Pago: ${l.pagamento_br}</span>` : ''}
                                    <span class="badge ${l.status === 'pago' ? 'badge-success' : 'badge-warning'}">${l.status}</span>
                                </div>
                            </div>
                            <div class="lancamento-valor ${l.tipo}">
                                ${l.tipo === 'receita' ? '+' : '-'} ${valorDisplay}
                            </div>
                            <div class="lancamento-actions">
                                <button class="btn btn-ghost btn-icon" onclick="editLancamento(${l.id})">✏️</button>
                                <button class="btn btn-ghost btn-icon" onclick="deleteLancamento(${l.id})">🗑️</button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        ` : '<div class="empty-state"><div class="empty-state-text">Nenhum lançamento.</div></div>'}
    `;
}

function filtrarLancamentos(tipo) { window.filtroTipo = tipo; renderLancamentos(); }

// ============================================================
// CLIENTES CADASTRO (COMPLETA)
// ============================================================

async function loadClientesCadastro() {
    const container = document.getElementById('clientes-cadastro-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    try {
        const result = await api('clientes_cadastro');
        state.clientes_cadastro = result.data || [];
        renderClientesCadastro();
    } catch (error) { container.innerHTML = `<div class="empty-state"><p>Erro ao carregar clientes: ${error.message}</p></div>`; }
}

function renderClientesCadastro() {
    const container = document.getElementById('clientes-cadastro-list');
    if (!state.clientes_cadastro.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏢</div><p>Nenhum cliente cadastrado</p><button class="btn btn-primary" onclick="openClienteCadastroModal()">➕ Cadastrar Cliente</button></div>`;
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Cliente</th><th>Contato</th><th>Receitas</th><th>Valor Total</th><th style="width: 120px;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    state.clientes_cadastro.forEach(cliente => {
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${cliente.razao_social}</div>
                    ${cliente.nome_fantasia ? `<div class="text-muted" style="font-size: 12px;">${cliente.nome_fantasia}</div>` : ''}
                </td>
                <td>
                    ${cliente.email ? `<div style="font-size: 12px;">📧 ${cliente.email}</div>` : ''}
                    ${cliente.whatsapp || cliente.telefone ? `<div style="font-size: 12px;">📱 ${cliente.whatsapp || cliente.telefone}</div>` : ''}
                </td>
                <td><span class="badge badge-info">${cliente.total_receitas || 0} contratos</span></td>
                <td>
                    <div style="font-size: 13px;">
                        <div><strong>${formatMoney(cliente.valor_total || 0)}</strong></div>
                        ${parseFloat(cliente.valor_recebido || 0) > 0 ? `<div class="text-success" style="font-size: 11px;">✓ Recebido: ${formatMoney(cliente.valor_recebido)}</div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="editClienteCadastro(${cliente.id})" title="Editar">✏️</button>
                        <button class="btn-icon btn-danger" onclick="deleteClienteCadastro(${cliente.id})" title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function openClienteCadastroModal(id=null) {
    const form = document.getElementById('form-cliente-cadastro');
    if(form) {
        form.reset(); form.dataset.id = id || '';
        document.getElementById('modal-cliente-cadastro-title').textContent = id ? '✏️ Editar' : '➕ Novo';
        openModal('modal-cliente-cadastro');
    }
}
async function editClienteCadastro(id) {
    try {
        const r = await api(`clientes_cadastro`, 'GET', null, id); const c = r.data;
        document.getElementById('cc-razao-social').value = c.razao_social||'';
        document.getElementById('cc-nome-fantasia').value = c.nome_fantasia||'';
        document.getElementById('cc-cnpj-cpf').value = c.cnpj_cpf||'';
        document.getElementById('cc-email').value = c.email||'';
        document.getElementById('cc-telefone').value = c.telefone||'';
        document.getElementById('cc-whatsapp').value = c.whatsapp||'';
        document.getElementById('cc-endereco').value = c.endereco||'';
        document.getElementById('cc-cidade').value = c.cidade||'';
        document.getElementById('cc-estado').value = c.estado||'';
        document.getElementById('cc-cep').value = c.cep||'';
        document.getElementById('cc-contato-nome').value = c.contato_nome||'';
        document.getElementById('cc-contato-cargo').value = c.contato_cargo||'';
        document.getElementById('cc-observacoes').value = c.observacoes||'';
        openClienteCadastroModal(id);
    } catch(e) { showToast(e.message, 'error'); }
}
function submitClienteCadastro() { 
    const id = document.getElementById('form-cliente-cadastro').dataset.id;
    const data = {
        razao_social: document.getElementById('cc-razao-social').value,
        nome_fantasia: document.getElementById('cc-nome-fantasia').value,
        cnpj_cpf: document.getElementById('cc-cnpj-cpf').value,
        email: document.getElementById('cc-email').value,
        telefone: document.getElementById('cc-telefone').value,
        whatsapp: document.getElementById('cc-whatsapp').value,
        endereco: document.getElementById('cc-endereco').value,
        cidade: document.getElementById('cc-cidade').value,
        estado: document.getElementById('cc-estado').value,
        cep: document.getElementById('cc-cep').value,
        contato_nome: document.getElementById('cc-contato-nome').value,
        contato_cargo: document.getElementById('cc-contato-cargo').value,
        observacoes: document.getElementById('cc-observacoes').value
    };
    api('clientes_cadastro', id ? 'PUT' : 'POST', data, id).then(() => { showToast('Salvo!'); closeModal('modal-cliente-cadastro'); loadClientesCadastro(); }).catch(e => showToast(e.message, 'error'));
}
async function deleteClienteCadastro(id) { 
    if(confirm('Excluir?')) api('clientes_cadastro', 'DELETE', null, id).then(() => { showToast('Excluído'); loadClientesCadastro(); }); 
}

// ============================================================
// MODAIS E CRUD GERAL (Restaurado e Completo)
// ============================================================

function openReceitaModal(id=null) {
    const form = document.getElementById('form-receita'); form.reset(); form.dataset.id = id || '';
    const selC = document.getElementById('receita-cliente'); selC.innerHTML='<option value="">Selecione...</option>';
    (state.auxiliares.clientes_cadastro||[]).forEach(c=>selC.innerHTML+=`<option value="${c.id}">${c.razao_social}</option>`);
    const selF = document.getElementById('receita-fonte'); selF.innerHTML='<option value="">Selecione...</option>';
    (state.auxiliares.fontes_receita||[]).forEach(f=>selF.innerHTML+=`<option value="${f.id}">${f.nome}</option>`);
    openModal('modal-receita');
}
async function editReceita(id) {
    const r = await api('receita', 'GET', null, id); const d=r.data;
    openReceitaModal(id);
    document.getElementById('receita-cliente').value = d.cliente_id;
    document.getElementById('receita-fonte').value = d.fonte_receita_id;
    document.getElementById('receita-descricao').value = d.descricao;
    document.getElementById('receita-valor').value = d.valor;
    document.getElementById('receita-moeda').value = d.moeda;
    document.getElementById('receita-tipo').value = d.tipo;
    document.getElementById('receita-recorrencia').value = d.recorrencia;
    document.getElementById('receita-dia').value = d.dia_vencimento;
    document.getElementById('receita-status').value = d.status;
    document.getElementById('receita-data-inicio').value = d.data_inicio;
    document.getElementById('receita-data-fim').value = d.data_fim;
}
function submitReceita() {
    const id = document.getElementById('form-receita').dataset.id;
    const data = {
        cliente_id: document.getElementById('receita-cliente').value,
        fonte_receita_id: document.getElementById('receita-fonte').value,
        descricao: document.getElementById('receita-descricao').value,
        valor: document.getElementById('receita-valor').value,
        moeda: document.getElementById('receita-moeda').value,
        tipo: document.getElementById('receita-tipo').value,
        recorrencia: document.getElementById('receita-recorrencia').value,
        dia_vencimento: document.getElementById('receita-dia').value,
        status: document.getElementById('receita-status').value,
        data_inicio: document.getElementById('receita-data-inicio').value,
        data_fim: document.getElementById('receita-data-fim').value
    };
    api('receitas', id ? 'PUT' : 'POST', data, id).then(() => { showToast('Salvo!'); closeModal('modal-receita'); loadReceitas(); });
}
async function deleteReceita(id) { if(confirm('Excluir?')) api('receita', 'DELETE', null, id).then(() => { showToast('Excluído'); loadReceitas(); }); }

function openDespesaModal(d=null) { 
    const form = document.getElementById('form-despesa'); form.reset(); form.dataset.id = d ? d.id : '';
    const sel = document.getElementById('despesa-categoria'); sel.innerHTML='<option value="">Selecione...</option>';
    (state.auxiliares.categorias||[]).forEach(c=>sel.innerHTML+=`<option value="${c.id}">${c.icone} ${c.nome}</option>`);
    if(d) {
        document.getElementById('despesa-descricao').value = d.descricao;
        document.getElementById('despesa-categoria').value = d.categoria_id;
        document.getElementById('despesa-valor').value = d.valor;
        document.getElementById('despesa-moeda').value = d.moeda;
        document.getElementById('despesa-recorrencia').value = d.recorrencia;
        document.getElementById('despesa-dia').value = d.dia_vencimento;
        document.getElementById('despesa-observacoes').value = d.observacoes;
    }
    openModal('modal-despesa'); 
}
async function editDespesa(id) { const d = state.despesas.find(x=>x.id===id); openDespesaModal(d); }
function saveDespesa(e) {
    e.preventDefault(); const id = document.getElementById('form-despesa').dataset.id;
    const data = {
        descricao: document.getElementById('despesa-descricao').value,
        categoria_id: document.getElementById('despesa-categoria').value,
        valor: document.getElementById('despesa-valor').value,
        moeda: document.getElementById('despesa-moeda').value,
        recorrencia: document.getElementById('despesa-recorrencia').value,
        dia_vencimento: document.getElementById('despesa-dia').value,
        observacoes: document.getElementById('despesa-observacoes').value
    };
    api('despesas', id ? 'PUT' : 'POST', data, id).then(()=>{ showToast('Salvo!'); closeModal('modal-despesa'); loadDespesas(); });
}
async function deleteDespesa(id) { if(confirm('Excluir?')) api('despesa', 'DELETE', null, id).then(()=>{ showToast('Removido'); loadDespesas(); }); }

function openLancamentoModal(l=null) {
    const form = document.getElementById('form-lancamento'); form.reset(); form.dataset.id = l ? l.id : '';
    if(l) {
        document.getElementById('lancamento-tipo').value = l.tipo;
        document.getElementById('lancamento-descricao').value = l.descricao;
        document.getElementById('lancamento-valor').value = l.valor;
        document.getElementById('lancamento-moeda').value = l.moeda;
        document.getElementById('lancamento-vencimento').value = l.data_vencimento;
        document.getElementById('lancamento-observacoes').value = l.observacoes;
    } else {
        document.getElementById('lancamento-vencimento').value = state.mesAtual + '-10';
    }
    openModal('modal-lancamento');
}
async function editLancamento(id) { const l = state.lancamentos.find(x=>x.id===id); openLancamentoModal(l); }
function saveLancamento(e) {
    e.preventDefault(); const id = document.getElementById('form-lancamento').dataset.id;
    const data = {
        tipo: document.getElementById('lancamento-tipo').value,
        descricao: document.getElementById('lancamento-descricao').value,
        valor: document.getElementById('lancamento-valor').value,
        moeda: document.getElementById('lancamento-moeda').value,
        data_vencimento: document.getElementById('lancamento-vencimento').value,
        observacoes: document.getElementById('lancamento-observacoes').value
    };
    api('lancamentos', id ? 'PUT' : 'POST', data, id).then(()=>{ showToast('Salvo!'); closeModal('modal-lancamento'); loadLancamentos(); });
}

// ----------------------------------------------------------------------------------
// EXCLUSÃO INTELIGENTE DE LANÇAMENTOS (v3.19)
// ----------------------------------------------------------------------------------
async function deleteLancamento(id) {
    const lancamento = state.lancamentos.find(l => l.id === id);
    if (!lancamento) return;

    // Se avulso (não tem vínculo com contrato pai)
    if (!lancamento.receita_id && !lancamento.despesa_id) {
        if (confirm('Excluir este lançamento avulso?')) {
            api('lancamento', 'DELETE', null, id).then(() => { showToast('Removido'); loadLancamentos(); });
        }
        return;
    }

    // Se recorrente, mostra modal de decisão
    const modalHtml = `
        <div class="modal-overlay active" id="modal-delete-decision" style="z-index:9999">
            <div class="modal" style="max-width:400px; margin:auto">
                <div class="modal-header"><h3 class="modal-title">🗑️ Excluir Recorrência</h3><button class="modal-close" onclick="document.getElementById('modal-delete-decision').remove()">×</button></div>
                <div class="modal-body"><p>Este é um lançamento recorrente.</p></div>
                <div class="modal-footer" style="flex-direction:column; gap:8px">
                    <button class="btn btn-secondary" onclick="confirmDelete(${id}, 'unico')" style="width:100%">📅 Apenas este mês</button>
                    <button class="btn btn-danger" onclick="confirmDelete(${id}, 'todos')" style="width:100%">🛑 Encerrar contrato e excluir futuros</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
async function confirmDelete(id, scope) {
    document.getElementById('modal-delete-decision').remove();
    try {
        const res = await api(`lancamento&scope=${scope}`, 'DELETE', null, id);
        showToast(res.message);
        loadLancamentos();
        if (scope === 'todos') loadAuxiliares(); 
    } catch(e) { showToast(e.message, 'error'); }
}

// ----------------------------------------------------------------------------------
// FUNÇÕES DE CONFIGURAÇÃO (Restauradas)
// ----------------------------------------------------------------------------------
function openFonteModal(f=null) { openModal('modal-fonte'); }
function openCategoriaModal(c=null) { openModal('modal-categoria'); }
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function loadDespesas() { api('despesas').then(r=>{ state.despesas=r.data; renderDespesas(); }); }
function renderDespesas() { 
    const c=document.getElementById('despesas-list'); 
    c.innerHTML = state.despesas.length ? `<div class="table-container"><table class="table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${state.despesas.map(d=>`<tr><td>${d.descricao}</td><td>${d.categoria_nome||'-'}</td><td>${formatMoney(d.valor, d.moeda)}</td><td><div class="table-actions"><button class="btn-icon" onclick="editDespesa(${d.id})">✏️</button><button class="btn-icon btn-delete" onclick="deleteDespesa(${d.id})">🗑️</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">Nenhuma despesa.</div>'; 
}

// FIX: Carrega tudo o que a tela de configurações precisa
function loadConfiguracoes() { 
    api('configuracoes').then(r=>{ document.getElementById('config-cotacao').value=r.data.cotacao_dolar; });
    loadFontes();
    loadCategorias();
}
async function loadFontes() {
    api('fontes_receita').then(r => {
        const c = document.getElementById('fontes-list');
        c.innerHTML = r.data.map(f => `<div class="aux-item"><div class="aux-item-info"><div class="aux-item-name">${f.nome}</div><div class="aux-item-desc">${f.descricao||''}</div></div><div class="aux-item-actions"><button class="btn-icon btn-delete" onclick="deleteFonte(${f.id})">🗑️</button></div></div>`).join('');
    });
}
async function loadCategorias() {
    api('categorias').then(r => {
        const c = document.getElementById('categorias-list');
        c.innerHTML = r.data.map(i => `<div class="aux-item"><div class="aux-item-info"><div class="aux-item-name">${i.icone} ${i.nome}</div><div class="aux-item-desc">${i.descricao||''}</div></div><div class="aux-item-actions"><button class="btn-icon btn-delete" onclick="deleteCategoria(${i.id})">🗑️</button></div></div>`).join('');
    });
}

function saveConfiguracoes() { api('configuracoes', 'PUT', {cotacao_dolar: document.getElementById('config-cotacao').value}).then(()=>showToast('Salvo')); }

// ----------------------------------------------------------------------------------
// LEGACY SUPPORT (Compatibilidade com HTML antigo)
// ----------------------------------------------------------------------------------
async function loadClientes() { 
    const c = document.getElementById('clientes-list'); c.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    api('clientes').then(r => { state.clientes = r.data; renderClientes(); });
}
function renderClientes() {
    const c = document.getElementById('clientes-list');
    if(!state.clientes.length) { c.innerHTML='<div class="empty-state">Vazio</div>'; return; }
    c.innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>Cliente</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${state.clientes.map(cl => `<tr><td>${cl.razao_social}</td><td>${formatMoney(cl.valor_receitas)}</td><td><button class="btn-icon" onclick="deleteCliente(${cl.id})">🗑️</button></td></tr>`).join('')}</tbody></table></div>`;
}
function openClienteModal() { openClienteCadastroModal(); /* Redireciona para o novo */ }
function saveCliente(e) { if(e)e.preventDefault(); submitClienteCadastro(); }
async function deleteCliente(id) { deleteClienteCadastro(id); }

// ----------------------------------------------------------------------------------
// EXPORTS GLOBAIS (Garante que o HTML ache as funções)
// ----------------------------------------------------------------------------------
window.openClienteModal = openClienteModal;
window.editCliente = editCliente; // Se existir legacy
window.saveCliente = saveCliente;
window.deleteCliente = deleteCliente;
window.openDespesaModal = openDespesaModal;
window.editDespesa = editDespesa;
window.saveDespesa = saveDespesa;
window.deleteDespesa = deleteDespesa;
window.openLancamentoModal = openLancamentoModal;
window.editLancamento = editLancamento;
window.saveLancamento = saveLancamento;
window.deleteLancamento = deleteLancamento;
window.togglePago = togglePago;
window.gerarLancamentosMes = gerarLancamentosMes;
window.filtrarLancamentos = filtrarLancamentos;
window.navigateTo = navigateTo;
window.closeModal = closeModal;
window.openFonteModal = openFonteModal;
window.openCategoriaModal = openCategoriaModal;
window.saveConfiguracoes = saveConfiguracoes;
window.openClienteCadastroModal = openClienteCadastroModal;
window.editClienteCadastro = editClienteCadastro;
window.submitClienteCadastro = submitClienteCadastro;
window.deleteClienteCadastro = deleteClienteCadastro;
window.verClienteDetalhe = verClienteDetalhe;
window.openReceitaModal = openReceitaModal;
window.editReceita = editReceita;
window.submitReceita = submitReceita;
window.deleteReceita = deleteReceita;
window.confirmDelete = confirmDelete;
// Funções curtas de salvamento (Configurações)
window.saveFonte = async function(e) { 
    if(e)e.preventDefault(); 
    const n = document.getElementById('fonte-nome').value; 
    const d = document.getElementById('fonte-descricao').value; // CORRIGIDO: Agora pega a descrição
    api('fontes_receita','POST',{nome:n, descricao:d}).then(()=>{showToast('Salvo'); closeModal('modal-fonte'); loadConfiguracoes();}); 
}
window.submitFonte = window.saveFonte;

window.saveCategoria = async function(e) { 
    if(e)e.preventDefault(); 
    const n = document.getElementById('categoria-nome').value; 
    const d = document.getElementById('categoria-descricao').value; // CORRIGIDO: Agora pega a descrição
    api('categorias','POST',{nome:n, descricao:d}).then(()=>{showToast('Salvo'); closeModal('modal-categoria'); loadConfiguracoes();}); 
}
window.submitCategoria = window.saveCategoria;

window.deleteFonte = async function(id) { if(confirm('Excluir?')) api('fontes_receita','DELETE',null,id).then(()=>{showToast('Removido'); loadConfiguracoes();}); }
window.deleteCategoria = async function(id) { if(confirm('Excluir?')) api('categorias','DELETE',null,id).then(()=>{showToast('Removido'); loadConfiguracoes();}); }