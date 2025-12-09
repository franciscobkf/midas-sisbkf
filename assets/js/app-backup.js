/**
 * ============================================================
 * SIS MIDAS BKF - SISTEMA FINANCEIRO
 * JavaScript Principal - v3.0
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
        meses_disponiveis: []
    },
    clientes: [],
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
    // Se já está no formato DD/MM/YYYY
    if (dateStr.includes('/')) return dateStr;
    // Converter de YYYY-MM-DD para DD/MM/YYYY
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function parseDate(dateStr) {
    if (!dateStr) return '';
    // Se está no formato DD/MM/YYYY, converter para YYYY-MM-DD
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
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '📢'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
// API HELPERS
// ============================================================

async function api(action, method = 'GET', data = null, id = null) {
    let url = `${API_BASE}index.php?action=${action}`;
    if (id) url += `&id=${id}`;
    
    console.log(`API Call: ${method} ${url}`, data);
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    if (method === 'GET' && data) {
        const params = new URLSearchParams(data);
        url += '&' + params.toString();
    }
    
    try {
        const response = await fetch(url, options);
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (!result.success && result.error) {
            throw new Error(result.error);
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Carregar dados auxiliares
    await loadAuxiliares();
    
    // Configurar navegação
    setupNavigation();
    
    // Configurar eventos
    setupEventListeners();
    
    // Carregar dashboard inicial
    navigateTo('dashboard');
    
    // Configurar seletor de mês
    setupMonthSelector();
});

async function loadAuxiliares() {
    try {
        const result = await api('auxiliares');
        state.auxiliares = result.data;
        console.log('Auxiliares carregados:', state.auxiliares);
    } catch (error) {
        console.error('Erro ao carregar auxiliares:', error);
    }
}

function setupMonthSelector() {
    const select = document.getElementById('mes-seletor');
    if (!select) return;
    
    select.innerHTML = state.auxiliares.meses_disponiveis.map(m => 
        `<option value="${m.valor}" ${m.valor === state.mesAtual ? 'selected' : ''}>${m.label}</option>`
    ).join('');
    
    select.addEventListener('change', (e) => {
        state.mesAtual = e.target.value;
        loadCurrentPage();
    });
}

function loadCurrentPage() {
    const activePage = document.querySelector('.page-section.active');
    if (activePage) {
        const page = activePage.id.replace('page-', '');
        navigateTo(page);
    }
}

// ============================================================
// NAVEGAÇÃO
// ============================================================

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Atualizar menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Atualizar páginas
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'clientes': 'Clientes (Legado)',
        'clientes-cadastro': 'Cadastro de Clientes',
        'receitas': 'Receitas / Contratos',
        'despesas': 'Despesas',
        'lancamentos': 'Lançamentos do Mês',
        'configuracoes': 'Configurações'
    };
    document.getElementById('header-title').textContent = titles[page] || page;
    
    // Carregar dados da página
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'clientes-cadastro':
            loadClientesCadastro();
            break;
        case 'receitas':
            loadReceitas();
            break;
        case 'despesas':
            loadDespesas();
            break;
        case 'lancamentos':
            loadLancamentos();
            break;
        case 'configuracoes':
            loadConfiguracoes();
            break;
    }
    
    // Fechar sidebar mobile
    document.querySelector('.sidebar').classList.remove('open');
}

function setupEventListeners() {
    // Menu mobile toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });
    
    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });
    
    // Botões de fechar modal
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    });
    
    // Formulário de Fonte de Receita
    const formFonte = document.getElementById('form-fonte');
    if (formFonte) {
        formFonte.addEventListener('submit', saveFonte);
        console.log('Event listener adicionado ao form-fonte');
    }
    
    // Formulário de Categoria
    const formCategoria = document.getElementById('form-categoria');
    if (formCategoria) {
        formCategoria.addEventListener('submit', saveCategoria);
        console.log('Event listener adicionado ao form-categoria');
    }
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await api('dashboard', 'GET', { mes: state.mesAtual });
        state.dashboard = result.data;
        renderDashboard();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">Erro ao carregar dashboard</div>
                <div class="empty-state-text">${error.message}</div>
                <button class="btn btn-primary" onclick="loadDashboard()">Tentar novamente</button>
            </div>
        `;
    }
}

function renderDashboard() {
    const data = state.dashboard;
    const container = document.getElementById('dashboard-content');
    
    const lucroClass = data.resumo.lucro_liquido >= 0 ? 'positive' : 'negative';
    const recebido = data.mes_atual.receitas_recebidas || 0;
    const pendente = data.mes_atual.receitas_pendentes || 0;
    
    container.innerHTML = `
        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon receitas">💰</div>
                <div class="stat-info">
                    <div class="stat-label">Receitas Mensais</div>
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
                    <div class="stat-change ${lucroClass}">${data.resumo.margem_lucro}% de margem</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon pendente">⏳</div>
                <div class="stat-info">
                    <div class="stat-label">A Receber (${data.mes_nome})</div>
                    <div class="stat-value">${formatMoney(pendente)}</div>
                    <div class="stat-change text-success">Recebido: ${formatMoney(recebido)}</div>
                </div>
            </div>
        </div>
        
        <!-- Ações Rápidas -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title">⚡ Ações Rápidas</h3>
            </div>
            <div class="card-body">
                <div class="d-flex gap-2" style="flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="openClienteModal()">
                        ➕ Novo Cliente
                    </button>
                    <button class="btn btn-secondary" onclick="openDespesaModal()">
                        ➕ Nova Despesa
                    </button>
                    <button class="btn btn-success" onclick="gerarLancamentosMes()">
                        🔄 Gerar Lançamentos do Mês
                    </button>
                    <button class="btn btn-secondary" onclick="navigateTo('lancamentos')">
                        📋 Ver Lançamentos
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Resumo do Mês -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title">📅 Resumo de ${data.mes_nome}</h3>
            </div>
            <div class="card-body">
                <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div style="text-align: center; padding: 16px; background: var(--success-bg); border-radius: var(--radius); border: 1px solid var(--success-border);">
                        <div style="font-size: 24px; font-weight: 800; color: var(--success);">${formatMoney(recebido)}</div>
                        <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Receitas Recebidas</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--warning-bg); border-radius: var(--radius); border: 1px solid var(--warning-border);">
                        <div style="font-size: 24px; font-weight: 800; color: var(--warning);">${formatMoney(pendente)}</div>
                        <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Receitas Pendentes</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--error-bg); border-radius: var(--radius); border: 1px solid var(--error-border);">
                        <div style="font-size: 24px; font-weight: 800; color: var(--error);">${formatMoney(data.mes_atual.despesas_pagas)}</div>
                        <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Despesas Pagas</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--glass); border-radius: var(--radius); border: 1px solid var(--line);">
                        <div style="font-size: 24px; font-weight: 800; color: var(--ink);">${formatMoney(data.mes_atual.despesas_pendentes)}</div>
                        <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Despesas Pendentes</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Últimos Lançamentos -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">📋 Lançamentos de ${data.mes_nome}</h3>
                <button class="btn btn-sm btn-secondary" onclick="navigateTo('lancamentos')">Ver Todos</button>
            </div>
            <div class="card-body" style="padding: 16px;">
                ${data.lancamentos_mes.length ? data.lancamentos_mes.slice(0, 10).map(l => `
                    <div class="lancamento-item ${l.status}">
                        <div class="lancamento-checkbox ${l.status === 'pago' ? 'checked' : ''}" 
                             onclick="togglePago(${l.id}, '${l.status}')" 
                             title="${l.status === 'pago' ? 'Desmarcar como pago' : 'Marcar como pago/recebido'}">
                        </div>
                        <div class="lancamento-info">
                            <div class="lancamento-descricao">${l.descricao}</div>
                            <div class="lancamento-meta">
                                <span>${l.tipo === 'receita' ? '💰 Receita' : '📉 Despesa'}</span>
                                <span>📅 Venc: ${l.vencimento_br}</span>
                                ${l.pagamento_br ? `<span>✅ Pago: ${l.pagamento_br}</span>` : ''}
                            </div>
                        </div>
                        <div class="lancamento-valor ${l.tipo}">
                            ${l.tipo === 'receita' ? '+' : '-'} ${formatMoney(l.valor, l.moeda)}
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <div class="empty-state-title">Nenhum lançamento</div>
                        <div class="empty-state-text">Clique em "Gerar Lançamentos do Mês" para criar os lançamentos automáticos.</div>
                    </div>
                `}
            </div>
        </div>
    `;
}

async function gerarLancamentosMes() {
    if (!confirm(`Gerar lançamentos para ${state.mesAtual}?\n\nIsso criará automaticamente as receitas e despesas recorrentes para o mês.`)) {
        return;
    }
    
    try {
        const result = await api('gerar_lancamentos', 'POST', { mes: state.mesAtual });
        showToast(result.message || 'Lançamentos gerados com sucesso!');
        loadDashboard();
    } catch (error) {
        showToast(error.message || 'Erro ao gerar lançamentos', 'error');
    }
}

async function togglePago(id, currentStatus) {
    try {
        const novoPago = currentStatus !== 'pago';
        await api('marcar_pago', 'POST', { pago: novoPago }, id);
        showToast(novoPago ? 'Marcado como pago!' : 'Desmarcado');
        loadCurrentPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// CLIENTES
// ============================================================

async function loadClientes() {
    const container = document.getElementById('clientes-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await api('clientes');
        state.clientes = result.data || [];
        renderClientes();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">Erro ao carregar clientes</div>
                <div class="empty-state-text">${error.message}</div>
            </div>
        `;
    }
}

function renderClientes() {
    const container = document.getElementById('clientes-list');
    
    if (!state.clientes.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-title">Nenhum cliente cadastrado</div>
                <div class="empty-state-text">Comece adicionando seu primeiro cliente.</div>
                <button class="btn btn-primary" onclick="openClienteModal()">➕ Adicionar Cliente</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Fonte</th>
                        <th>Valor</th>
                        <th>Recorrência</th>
                        <th>Dia Venc.</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.clientes.map(c => `
                        <tr>
                            <td>
                                <strong>${c.nome}</strong>
                                ${c.equipe ? `<br><small class="text-muted">${c.equipe}</small>` : ''}
                            </td>
                            <td>
                                ${c.fonte_nome ? `<span class="badge badge-info">${c.fonte_nome}</span>` : '-'}
                            </td>
                            <td><strong>${formatMoney(c.valor, c.moeda)}</strong></td>
                            <td>${c.recorrencia || 'Mensal'}</td>
                            <td>Dia ${c.dia_vencimento || 10}</td>
                            <td>
                                <span class="badge ${c.status === 'Ativo' ? 'badge-success' : 'badge-warning'}">${c.status}</span>
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-ghost btn-icon" onclick="editCliente(${c.id})" title="Editar">✏️</button>
                                    <button class="btn btn-ghost btn-icon" onclick="deleteCliente(${c.id})" title="Excluir">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openClienteModal(cliente = null) {
    const modal = document.getElementById('modal-cliente');
    const form = document.getElementById('form-cliente');
    const title = document.getElementById('modal-cliente-title');
    
    // Limpar formulário
    form.reset();
    form.dataset.id = '';
    
    // Preencher select de fontes
    const selectFonte = document.getElementById('cliente-fonte');
    selectFonte.innerHTML = '<option value="">Selecione...</option>' +
        state.auxiliares.fontes_receita.map(f => 
            `<option value="${f.id}">${f.nome}</option>`
        ).join('');
    
    if (cliente) {
        title.textContent = '✏️ Editar Cliente';
        form.dataset.id = cliente.id;
        document.getElementById('cliente-nome').value = cliente.nome || '';
        document.getElementById('cliente-fonte').value = cliente.fonte_receita_id || '';
        document.getElementById('cliente-valor').value = cliente.valor || '';
        document.getElementById('cliente-moeda').value = cliente.moeda || 'BRL';
        document.getElementById('cliente-recorrencia').value = cliente.recorrencia || 'Mensal';
        document.getElementById('cliente-dia').value = cliente.dia_vencimento || 10;
        document.getElementById('cliente-status').value = cliente.status || 'Ativo';
        document.getElementById('cliente-equipe').value = cliente.equipe || '';
        document.getElementById('cliente-esforco').value = cliente.nivel_esforco || 'Médio';
        document.getElementById('cliente-observacoes').value = cliente.observacoes || '';
    } else {
        title.textContent = '➕ Novo Cliente';
    }
    
    openModal('modal-cliente');
}

async function editCliente(id) {
    const cliente = state.clientes.find(c => c.id === id);
    if (cliente) {
        openClienteModal(cliente);
    }
}

async function saveCliente(e) {
    e.preventDefault();
    
    const form = e.target;
    const id = form.dataset.id;
    
    const data = {
        nome: document.getElementById('cliente-nome').value,
        fonte_receita_id: document.getElementById('cliente-fonte').value || null,
        valor: document.getElementById('cliente-valor').value,
        moeda: document.getElementById('cliente-moeda').value,
        recorrencia: document.getElementById('cliente-recorrencia').value,
        dia_vencimento: document.getElementById('cliente-dia').value,
        status: document.getElementById('cliente-status').value,
        equipe: document.getElementById('cliente-equipe').value,
        nivel_esforco: document.getElementById('cliente-esforco').value,
        observacoes: document.getElementById('cliente-observacoes').value
    };
    
    try {
        if (id) {
            await api('clientes', 'PUT', data, id);
            showToast('Cliente atualizado!');
        } else {
            await api('clientes', 'POST', data);
            showToast('Cliente cadastrado!');
        }
        
        closeModal('modal-cliente');
        loadClientes();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
        await api('clientes', 'DELETE', null, id);
        showToast('Cliente removido!');
        loadClientes();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// DESPESAS
// ============================================================

async function loadDespesas() {
    const container = document.getElementById('despesas-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await api('despesas');
        state.despesas = result.data || [];
        renderDespesas();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">Erro ao carregar despesas</div>
                <div class="empty-state-text">${error.message}</div>
            </div>
        `;
    }
}

function renderDespesas() {
    const container = document.getElementById('despesas-list');
    
    if (!state.despesas.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <div class="empty-state-title">Nenhuma despesa cadastrada</div>
                <div class="empty-state-text">Comece adicionando sua primeira despesa fixa.</div>
                <button class="btn btn-primary" onclick="openDespesaModal()">➕ Adicionar Despesa</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>Recorrência</th>
                        <th>Dia Venc.</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.despesas.map(d => `
                        <tr>
                            <td><strong>${d.descricao}</strong></td>
                            <td>
                                ${d.categoria_nome ? `
                                    <span class="badge badge-neutral">
                                        ${d.categoria_icone || '📁'} ${d.categoria_nome}
                                    </span>
                                ` : '-'}
                            </td>
                            <td><strong class="text-error">${formatMoney(d.valor, d.moeda)}</strong></td>
                            <td>${d.recorrencia || 'Mensal'}</td>
                            <td>Dia ${d.dia_vencimento || 10}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-ghost btn-icon" onclick="editDespesa(${d.id})" title="Editar">✏️</button>
                                    <button class="btn btn-ghost btn-icon" onclick="deleteDespesa(${d.id})" title="Excluir">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openDespesaModal(despesa = null) {
    const modal = document.getElementById('modal-despesa');
    const form = document.getElementById('form-despesa');
    const title = document.getElementById('modal-despesa-title');
    
    form.reset();
    form.dataset.id = '';
    
    const selectCat = document.getElementById('despesa-categoria');
    selectCat.innerHTML = '<option value="">Selecione...</option>' +
        state.auxiliares.categorias.map(c => 
            `<option value="${c.id}">${c.icone || '📁'} ${c.nome}</option>`
        ).join('');
    
    if (despesa) {
        title.textContent = '✏️ Editar Despesa';
        form.dataset.id = despesa.id;
        document.getElementById('despesa-descricao').value = despesa.descricao || '';
        document.getElementById('despesa-categoria').value = despesa.categoria_id || '';
        document.getElementById('despesa-valor').value = despesa.valor || '';
        document.getElementById('despesa-moeda').value = despesa.moeda || 'BRL';
        document.getElementById('despesa-recorrencia').value = despesa.recorrencia || 'Mensal';
        document.getElementById('despesa-dia').value = despesa.dia_vencimento || 10;
        document.getElementById('despesa-observacoes').value = despesa.observacoes || '';
    } else {
        title.textContent = '➕ Nova Despesa';
    }
    
    openModal('modal-despesa');
}

async function editDespesa(id) {
    const despesa = state.despesas.find(d => d.id === id);
    if (despesa) {
        openDespesaModal(despesa);
    }
}

async function saveDespesa(e) {
    e.preventDefault();
    
    const form = e.target;
    const id = form.dataset.id;
    
    const data = {
        descricao: document.getElementById('despesa-descricao').value,
        categoria_id: document.getElementById('despesa-categoria').value || null,
        valor: document.getElementById('despesa-valor').value,
        moeda: document.getElementById('despesa-moeda').value,
        recorrencia: document.getElementById('despesa-recorrencia').value,
        dia_vencimento: document.getElementById('despesa-dia').value,
        observacoes: document.getElementById('despesa-observacoes').value
    };
    
    try {
        if (id) {
            await api('despesas', 'PUT', data, id);
            showToast('Despesa atualizada!');
        } else {
            await api('despesas', 'POST', data);
            showToast('Despesa cadastrada!');
        }
        
        closeModal('modal-despesa');
        loadDespesas();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteDespesa(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    try {
        await api('despesas', 'DELETE', null, id);
        showToast('Despesa removida!');
        loadDespesas();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// LANÇAMENTOS
// ============================================================

async function loadLancamentos() {
    const container = document.getElementById('lancamentos-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await api('lancamentos', 'GET', { mes: state.mesAtual });
        state.lancamentos = result.data || [];
        renderLancamentos();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">Erro ao carregar lançamentos</div>
                <div class="empty-state-text">${error.message}</div>
            </div>
        `;
    }
}

function renderLancamentos() {
    const container = document.getElementById('lancamentos-list');
    
    // Calcular totais
    const receitas = state.lancamentos.filter(l => l.tipo === 'receita');
    const despesas = state.lancamentos.filter(l => l.tipo === 'despesa');
    const totalReceitas = receitas.reduce((s, l) => s + parseFloat(l.valor), 0);
    const totalDespesas = despesas.reduce((s, l) => s + parseFloat(l.valor), 0);
    const receitasRecebidas = receitas.filter(l => l.status === 'pago').reduce((s, l) => s + parseFloat(l.valor), 0);
    const despesasPagas = despesas.filter(l => l.status === 'pago').reduce((s, l) => s + parseFloat(l.valor), 0);
    
    container.innerHTML = `
        <!-- Resumo -->
        <div class="stats-grid mb-3" style="grid-template-columns: repeat(4, 1fr);">
            <div class="stat-card">
                <div class="stat-info">
                    <div class="stat-label">Receitas (Total)</div>
                    <div class="stat-value text-success">${formatMoney(totalReceitas)}</div>
                    <div class="stat-change">Recebido: ${formatMoney(receitasRecebidas)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <div class="stat-label">Despesas (Total)</div>
                    <div class="stat-value text-error">${formatMoney(totalDespesas)}</div>
                    <div class="stat-change">Pago: ${formatMoney(despesasPagas)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <div class="stat-label">Saldo Previsto</div>
                    <div class="stat-value ${totalReceitas - totalDespesas >= 0 ? 'positive' : 'negative'}">${formatMoney(totalReceitas - totalDespesas)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <div class="stat-label">Saldo Realizado</div>
                    <div class="stat-value ${receitasRecebidas - despesasPagas >= 0 ? 'positive' : 'negative'}">${formatMoney(receitasRecebidas - despesasPagas)}</div>
                </div>
            </div>
        </div>
        
        <!-- Filtros e Ações -->
        <div class="d-flex justify-between align-center mb-3 gap-2" style="flex-wrap: wrap;">
            <div class="d-flex gap-1">
                <button class="btn btn-sm ${!window.filtroTipo ? 'btn-primary' : 'btn-secondary'}" onclick="filtrarLancamentos(null)">Todos</button>
                <button class="btn btn-sm ${window.filtroTipo === 'receita' ? 'btn-primary' : 'btn-secondary'}" onclick="filtrarLancamentos('receita')">💰 Receitas</button>
                <button class="btn btn-sm ${window.filtroTipo === 'despesa' ? 'btn-primary' : 'btn-secondary'}" onclick="filtrarLancamentos('despesa')">📉 Despesas</button>
            </div>
            <div class="d-flex gap-1">
                <button class="btn btn-sm btn-success" onclick="gerarLancamentosMes()">🔄 Gerar Lançamentos</button>
                <button class="btn btn-sm btn-secondary" onclick="openLancamentoModal()">➕ Novo Lançamento</button>
            </div>
        </div>
        
        <!-- Lista de Lançamentos -->
        ${state.lancamentos.length ? `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📋 Lançamentos</h3>
                    <span class="badge badge-neutral">${state.lancamentos.length} itens</span>
                </div>
                <div class="card-body" style="padding: 16px;">
                    ${state.lancamentos.filter(l => !window.filtroTipo || l.tipo === window.filtroTipo).map(l => `
                        <div class="lancamento-item ${l.status}">
                            <div class="lancamento-checkbox ${l.status === 'pago' ? 'checked' : ''}" 
                                 onclick="togglePago(${l.id}, '${l.status}')" 
                                 title="${l.status === 'pago' ? 'Desmarcar como pago' : 'Marcar como pago/recebido'}">
                            </div>
                            <div class="lancamento-info">
                                <div class="lancamento-descricao">${l.descricao}</div>
                                <div class="lancamento-meta">
                                    <span>${l.tipo === 'receita' ? '💰 Receita' : '📉 Despesa'}</span>
                                    <span>📅 Venc: ${l.vencimento_br}</span>
                                    ${l.pagamento_br ? `<span>✅ Pago: ${l.pagamento_br}</span>` : ''}
                                    <span class="badge ${l.status === 'pago' ? 'badge-success' : l.status === 'atrasado' ? 'badge-error' : 'badge-warning'}">${l.status}</span>
                                </div>
                            </div>
                            <div class="lancamento-valor ${l.tipo}">
                                ${l.tipo === 'receita' ? '+' : '-'} ${formatMoney(l.valor, l.moeda)}
                            </div>
                            <div class="lancamento-actions">
                                <button class="btn btn-ghost btn-icon" onclick="editLancamento(${l.id})" title="Editar">✏️</button>
                                <button class="btn btn-ghost btn-icon" onclick="deleteLancamento(${l.id})" title="Excluir">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">Nenhum lançamento para este mês</div>
                <div class="empty-state-text">Clique em "Gerar Lançamentos" para criar os lançamentos automáticos baseados nos clientes e despesas cadastrados.</div>
                <button class="btn btn-primary" onclick="gerarLancamentosMes()">🔄 Gerar Lançamentos do Mês</button>
            </div>
        `}
    `;
}

function filtrarLancamentos(tipo) {
    window.filtroTipo = tipo;
    renderLancamentos();
}

function openLancamentoModal(lancamento = null) {
    const modal = document.getElementById('modal-lancamento');
    const form = document.getElementById('form-lancamento');
    const title = document.getElementById('modal-lancamento-title');
    
    form.reset();
    form.dataset.id = '';
    
    if (lancamento) {
        title.textContent = '✏️ Editar Lançamento';
        form.dataset.id = lancamento.id;
        document.getElementById('lancamento-tipo').value = lancamento.tipo || 'receita';
        document.getElementById('lancamento-descricao').value = lancamento.descricao || '';
        document.getElementById('lancamento-valor').value = lancamento.valor || '';
        document.getElementById('lancamento-moeda').value = lancamento.moeda || 'BRL';
        document.getElementById('lancamento-vencimento').value = parseDate(lancamento.vencimento_br) || '';
        document.getElementById('lancamento-observacoes').value = lancamento.observacoes || '';
    } else {
        title.textContent = '➕ Novo Lançamento';
        // Data padrão: dia 10 do mês atual
        document.getElementById('lancamento-vencimento').value = state.mesAtual + '-10';
    }
    
    openModal('modal-lancamento');
}

async function editLancamento(id) {
    const lancamento = state.lancamentos.find(l => l.id === id);
    if (lancamento) {
        openLancamentoModal(lancamento);
    }
}

async function saveLancamento(e) {
    e.preventDefault();
    
    const form = e.target;
    const id = form.dataset.id;
    
    const data = {
        tipo: document.getElementById('lancamento-tipo').value,
        descricao: document.getElementById('lancamento-descricao').value,
        valor: document.getElementById('lancamento-valor').value,
        moeda: document.getElementById('lancamento-moeda').value,
        data_vencimento: document.getElementById('lancamento-vencimento').value,
        observacoes: document.getElementById('lancamento-observacoes').value
    };
    
    try {
        if (id) {
            await api('lancamentos', 'PUT', data, id);
            showToast('Lançamento atualizado!');
        } else {
            await api('lancamentos', 'POST', data);
            showToast('Lançamento criado!');
        }
        
        closeModal('modal-lancamento');
        loadLancamentos();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteLancamento(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    
    try {
        await api('lancamentos', 'DELETE', null, id);
        showToast('Lançamento removido!');
        loadLancamentos();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// CONFIGURAÇÕES - FONTES DE RECEITA
// ============================================================

async function loadConfiguracoes() {
    await loadFontes();
    await loadCategorias();
    await loadConfigGerais();
}

async function loadFontes() {
    try {
        const result = await api('fontes_receita');
        const fontes = result.data;
        const container = document.getElementById('fontes-list');
        
        if (fontes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <div class="empty-state-text">Nenhuma fonte cadastrada</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="aux-list">
                ${fontes.map(f => `
                    <div class="aux-item">
                        <div class="aux-item-info">
                            <div class="aux-item-name">${f.nome}</div>
                            ${f.descricao ? `<div class="aux-item-desc">${f.descricao}</div>` : ''}
                        </div>
                        <div class="aux-item-actions">
                            <button class="btn-icon btn-edit" onclick="editFonte(${f.id})" title="Editar">✏️</button>
                            <button class="btn-icon btn-delete" onclick="deleteFonte(${f.id})" title="Excluir">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Atualizar state
        state.auxiliares.fontes_receita = fontes;
    } catch (error) {
        console.error('Erro ao carregar fontes:', error);
    }
}

function openFonteModal(fonte = null) {
    const modal = document.getElementById('modal-fonte');
    const form = document.getElementById('form-fonte');
    const title = document.getElementById('modal-fonte-title');
    
    form.reset();
    form.dataset.id = '';
    
    if (fonte) {
        title.textContent = '✏️ Editar Fonte de Receita';
        form.dataset.id = fonte.id;
        document.getElementById('fonte-nome').value = fonte.nome || '';
        document.getElementById('fonte-descricao').value = fonte.descricao || '';
    } else {
        title.textContent = '➕ Nova Fonte de Receita';
    }
    
    openModal('modal-fonte');
}

async function editFonte(id) {
    const fonte = state.auxiliares.fontes_receita.find(f => f.id === id);
    if (fonte) {
        openFonteModal(fonte);
    }
}

async function saveFonte(e) {
    if (e) e.preventDefault();
    console.log('saveFonte chamada');
    
    const form = document.getElementById('form-fonte');
    const id = form.dataset.id;
    
    const nome = document.getElementById('fonte-nome').value.trim();
    const descricao = document.getElementById('fonte-descricao').value.trim();
    
    console.log('Dados:', { id, nome, descricao });
    
    if (!nome) {
        showToast('Nome é obrigatório', 'error');
        return;
    }
    
    const data = { nome, descricao };
    
    try {
        let result;
        if (id) {
            console.log('Atualizando fonte ID:', id);
            result = await api('fontes_receita', 'PUT', data, id);
            console.log('Resultado PUT:', result);
            showToast('Fonte de receita atualizada!');
        } else {
            console.log('Criando nova fonte');
            result = await api('fontes_receita', 'POST', data);
            console.log('Resultado POST:', result);
            showToast('Fonte de receita criada!');
        }
        closeModal('modal-fonte');
        await loadFontes();
        await loadAuxiliares();
    } catch (error) {
        console.error('Erro ao salvar fonte:', error);
        showToast(error.message || 'Erro ao salvar', 'error');
    }
}

// Função chamada pelo onclick do botão
function submitFonte() {
    console.log('submitFonte() chamada via onclick');
    saveFonte();
}

async function deleteFonte(id) {
    if (!confirm('Deseja realmente excluir esta fonte de receita?')) return;
    
    try {
        await api('fontes_receita', 'DELETE', null, id);
        showToast('Fonte de receita excluída!');
        await loadFontes();
        await loadAuxiliares();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// CONFIGURAÇÕES - CATEGORIAS DE DESPESAS
// ============================================================

async function loadCategorias() {
    try {
        const result = await api('categorias');
        const categorias = result.data;
        const container = document.getElementById('categorias-list');
        
        if (categorias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📂</div>
                    <div class="empty-state-text">Nenhuma categoria cadastrada</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="aux-list">
                ${categorias.map(c => `
                    <div class="aux-item">
                        <div class="aux-item-info">
                            <div class="aux-item-name">${c.nome}</div>
                            ${c.descricao ? `<div class="aux-item-desc">${c.descricao}</div>` : ''}
                        </div>
                        <div class="aux-item-actions">
                            <button class="btn-icon btn-edit" onclick="editCategoria(${c.id})" title="Editar">✏️</button>
                            <button class="btn-icon btn-delete" onclick="deleteCategoria(${c.id})" title="Excluir">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Atualizar state
        state.auxiliares.categorias = categorias;
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

function openCategoriaModal(categoria = null) {
    const modal = document.getElementById('modal-categoria');
    const form = document.getElementById('form-categoria');
    const title = document.getElementById('modal-categoria-title');
    
    form.reset();
    form.dataset.id = '';
    
    if (categoria) {
        title.textContent = '✏️ Editar Categoria';
        form.dataset.id = categoria.id;
        document.getElementById('categoria-nome').value = categoria.nome || '';
        document.getElementById('categoria-descricao').value = categoria.descricao || '';
    } else {
        title.textContent = '➕ Nova Categoria';
    }
    
    openModal('modal-categoria');
}

async function editCategoria(id) {
    const categoria = state.auxiliares.categorias.find(c => c.id === id);
    if (categoria) {
        openCategoriaModal(categoria);
    }
}

async function saveCategoria(e) {
    if (e) e.preventDefault();
    console.log('saveCategoria chamada');
    
    const form = document.getElementById('form-categoria');
    const id = form.dataset.id;
    
    const nome = document.getElementById('categoria-nome').value.trim();
    const descricao = document.getElementById('categoria-descricao').value.trim();
    
    console.log('Dados:', { id, nome, descricao });
    
    if (!nome) {
        showToast('Nome é obrigatório', 'error');
        return;
    }
    
    const data = { nome, descricao };
    
    try {
        let result;
        if (id) {
            console.log('Atualizando categoria ID:', id);
            result = await api('categorias', 'PUT', data, id);
            console.log('Resultado PUT:', result);
            showToast('Categoria atualizada!');
        } else {
            console.log('Criando nova categoria');
            result = await api('categorias', 'POST', data);
            console.log('Resultado POST:', result);
            showToast('Categoria criada!');
        }
        closeModal('modal-categoria');
        await loadCategorias();
        await loadAuxiliares();
    } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        showToast(error.message || 'Erro ao salvar', 'error');
    }
}

// Função chamada pelo onclick do botão
function submitCategoria() {
    console.log('submitCategoria() chamada via onclick');
    saveCategoria();
}

async function deleteCategoria(id) {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;
    
    try {
        await api('categorias', 'DELETE', null, id);
        showToast('Categoria excluída!');
        await loadCategorias();
        await loadAuxiliares();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// CONFIGURAÇÕES - GERAIS
// ============================================================

async function loadConfigGerais() {
    try {
        const result = await api('configuracoes');
        const config = result.data;
        
        document.getElementById('config-cotacao').value = config.cotacao_dolar || '6.00';
        document.getElementById('config-empresa').value = config.nome_empresa || 'BKF Group';
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

async function saveConfiguracoes() {
    const data = {
        cotacao_dolar: document.getElementById('config-cotacao').value,
        nome_empresa: document.getElementById('config-empresa').value
    };
    
    try {
        await api('configuracoes', 'PUT', data);
        showToast('Configurações salvas!');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// MODAL HELPERS
// ============================================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ============================================================
// v3.0 - CLIENTES CADASTRO
// ============================================================

async function loadClientesCadastro() {
    const container = document.getElementById('clientes-cadastro-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await api('clientes_cadastro');
        state.clientes_cadastro = result.data || [];
        renderClientesCadastro();
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><p>Erro ao carregar clientes: ${error.message}</p></div>`;
    }
}

function renderClientesCadastro() {
    const container = document.getElementById('clientes-cadastro-list');
    
    if (!state.clientes_cadastro || state.clientes_cadastro.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <p>Nenhum cliente cadastrado</p>
                <button class="btn btn-primary" onclick="openClienteCadastroModal()">➕ Cadastrar Cliente</button>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th>Receitas</th>
                    <th>Valor Total</th>
                    <th style="width: 120px;">Ações</th>
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
                    ${cliente.cnpj_cpf ? `<div class="text-muted" style="font-size: 11px;">${cliente.cnpj_cpf}</div>` : ''}
                </td>
                <td>
                    ${cliente.email ? `<div style="font-size: 12px;">📧 ${cliente.email}</div>` : ''}
                    ${cliente.whatsapp || cliente.telefone ? `<div style="font-size: 12px;">📱 ${cliente.whatsapp || cliente.telefone}</div>` : ''}
                    ${cliente.contato_nome ? `<div style="font-size: 12px;">👤 ${cliente.contato_nome}</div>` : ''}
                </td>
                <td>
                    <span class="badge badge-info">${cliente.total_receitas || 0} contratos</span>
                </td>
                <td>
                    <strong>${formatMoney(cliente.valor_total || 0)}</strong>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="verClienteDetalhe(${cliente.id})" title="Ver detalhes">👁️</button>
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

function openClienteCadastroModal(id = null) {
    const form = document.getElementById('form-cliente-cadastro');
    form.reset();
    form.dataset.id = id || '';
    
    document.getElementById('modal-cliente-cadastro-title').textContent = id ? '✏️ Editar Cliente' : '➕ Novo Cliente';
    openModal('modal-cliente-cadastro');
}

async function editClienteCadastro(id) {
    try {
        const result = await api(`clientes_cadastro&id=${id}`);
        const cliente = result.data;
        
        document.getElementById('cc-razao-social').value = cliente.razao_social || '';
        document.getElementById('cc-nome-fantasia').value = cliente.nome_fantasia || '';
        document.getElementById('cc-cnpj-cpf').value = cliente.cnpj_cpf || '';
        document.getElementById('cc-email').value = cliente.email || '';
        document.getElementById('cc-telefone').value = cliente.telefone || '';
        document.getElementById('cc-whatsapp').value = cliente.whatsapp || '';
        document.getElementById('cc-endereco').value = cliente.endereco || '';
        document.getElementById('cc-cidade').value = cliente.cidade || '';
        document.getElementById('cc-estado').value = cliente.estado || '';
        document.getElementById('cc-cep').value = cliente.cep || '';
        document.getElementById('cc-contato-nome').value = cliente.contato_nome || '';
        document.getElementById('cc-contato-cargo').value = cliente.contato_cargo || '';
        document.getElementById('cc-observacoes').value = cliente.observacoes || '';
        
        openClienteCadastroModal(id);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function submitClienteCadastro() {
    saveClienteCadastro();
}

async function saveClienteCadastro() {
    const form = document.getElementById('form-cliente-cadastro');
    const id = form.dataset.id;
    
    const data = {
        razao_social: document.getElementById('cc-razao-social').value.trim(),
        nome_fantasia: document.getElementById('cc-nome-fantasia').value.trim(),
        cnpj_cpf: document.getElementById('cc-cnpj-cpf').value.trim(),
        email: document.getElementById('cc-email').value.trim(),
        telefone: document.getElementById('cc-telefone').value.trim(),
        whatsapp: document.getElementById('cc-whatsapp').value.trim(),
        endereco: document.getElementById('cc-endereco').value.trim(),
        cidade: document.getElementById('cc-cidade').value.trim(),
        estado: document.getElementById('cc-estado').value,
        cep: document.getElementById('cc-cep').value.trim(),
        contato_nome: document.getElementById('cc-contato-nome').value.trim(),
        contato_cargo: document.getElementById('cc-contato-cargo').value.trim(),
        observacoes: document.getElementById('cc-observacoes').value.trim()
    };
    
    if (!data.razao_social) {
        showToast('Razão Social é obrigatória', 'error');
        return;
    }
    
    try {
        if (id) {
            await api(`clientes_cadastro&id=${id}`, 'PUT', data);
            showToast('Cliente atualizado!');
        } else {
            await api('clientes_cadastro', 'POST', data);
            showToast('Cliente cadastrado!');
        }
        closeModal('modal-cliente-cadastro');
        loadClientesCadastro();
        loadAuxiliares(); // Atualizar lista de clientes nos selects
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteClienteCadastro(id) {
    if (!confirm('Deseja excluir este cliente?')) return;
    
    try {
        await api(`clientes_cadastro&id=${id}`, 'DELETE');
        showToast('Cliente excluído!');
        loadClientesCadastro();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function verClienteDetalhe(id) {
    // Por enquanto, apenas edita - futuramente pode abrir uma página de detalhe
    editClienteCadastro(id);
}

// ============================================================
// v3.0 - RECEITAS / CONTRATOS
// ============================================================

async function loadReceitas() {
    const container = document.getElementById('receitas-list');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await api('receitas');
        state.receitas = result.data || [];
        renderReceitas();
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><p>Erro ao carregar receitas: ${error.message}</p></div>`;
    }
}

function renderReceitas() {
    const container = document.getElementById('receitas-list');
    
    if (!state.receitas || state.receitas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p>Nenhuma receita cadastrada</p>
                <button class="btn btn-primary" onclick="openReceitaModal()">➕ Nova Receita</button>
            </div>
        `;
        return;
    }
    
    // Agrupar por cliente
    const porCliente = {};
    state.receitas.forEach(r => {
        const clienteId = r.cliente_id || 0;
        if (!porCliente[clienteId]) {
            porCliente[clienteId] = {
                nome: r.cliente_nome || 'Sem cliente',
                fantasia: r.cliente_fantasia,
                receitas: []
            };
        }
        porCliente[clienteId].receitas.push(r);
    });
    
    let html = '';
    
    Object.entries(porCliente).forEach(([clienteId, grupo]) => {
        const totalAtivo = grupo.receitas
            .filter(r => r.status === 'ativo')
            .reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);
        
        html += `
            <div class="card mb-3">
                <div class="card-header" style="background: var(--glass); padding: 16px;">
                    <div>
                        <h4 style="font-size: 16px; font-weight: 700;">🏢 ${grupo.nome}</h4>
                        ${grupo.fantasia ? `<span class="text-muted" style="font-size: 12px;">${grupo.fantasia}</span>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: var(--muted);">Total Ativo</div>
                        <div style="font-size: 18px; font-weight: 700; color: var(--success);">${formatMoney(totalAtivo)}</div>
                    </div>
                </div>
                <div class="card-body" style="padding: 0;">
                    <table class="data-table" style="margin: 0;">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Recorrência</th>
                                <th>Status</th>
                                <th style="width: 100px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        grupo.receitas.forEach(receita => {
            const statusClass = {
                'ativo': 'badge-success',
                'pausado': 'badge-warning',
                'encerrado': 'badge-secondary'
            }[receita.status] || 'badge-secondary';
            
            html += `
                <tr style="${receita.status !== 'ativo' ? 'opacity: 0.6;' : ''}">
                    <td>
                        <div style="font-weight: 500;">${receita.descricao || 'Contrato'}</div>
                        ${receita.fonte_nome ? `<span class="text-muted" style="font-size: 11px;">${receita.fonte_nome}</span>` : ''}
                    </td>
                    <td>
                        <span class="badge ${receita.tipo === 'recorrente' ? 'badge-info' : 'badge-secondary'}">
                            ${receita.tipo === 'recorrente' ? '🔄 Recorrente' : '📌 Avulso'}
                        </span>
                    </td>
                    <td>
                        <strong>${formatMoney(receita.valor, receita.moeda)}</strong>
                    </td>
                    <td>${receita.recorrencia} (dia ${receita.dia_vencimento})</td>
                    <td>
                        <span class="badge ${statusClass}">${receita.status}</span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon" onclick="editReceita(${receita.id})" title="Editar">✏️</button>
                            <button class="btn-icon btn-danger" onclick="deleteReceita(${receita.id})" title="Excluir">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function openReceitaModal(id = null) {
    const form = document.getElementById('form-receita');
    form.reset();
    form.dataset.id = id || '';
    
    // Popular select de clientes
    const selectCliente = document.getElementById('receita-cliente');
    selectCliente.innerHTML = '<option value="">Selecione o cliente...</option>';
    (state.auxiliares.clientes_cadastro || []).forEach(c => {
        selectCliente.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`;
    });
    
    // Popular select de fontes
    const selectFonte = document.getElementById('receita-fonte');
    selectFonte.innerHTML = '<option value="">Selecione...</option>';
    (state.auxiliares.fontes_receita || []).forEach(f => {
        selectFonte.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
    });
    
    document.getElementById('modal-receita-title').textContent = id ? '✏️ Editar Receita' : '➕ Nova Receita';
    openModal('modal-receita');
}

async function editReceita(id) {
    try {
        const result = await api(`receitas&id=${id}`);
        const receita = result.data;
        
        openReceitaModal(id);
        
        document.getElementById('receita-cliente').value = receita.cliente_id || '';
        document.getElementById('receita-fonte').value = receita.fonte_receita_id || '';
        document.getElementById('receita-descricao').value = receita.descricao || '';
        document.getElementById('receita-valor').value = receita.valor || '';
        document.getElementById('receita-moeda').value = receita.moeda || 'BRL';
        document.getElementById('receita-tipo').value = receita.tipo || 'recorrente';
        document.getElementById('receita-recorrencia').value = receita.recorrencia || 'Mensal';
        document.getElementById('receita-dia').value = receita.dia_vencimento || 10;
        document.getElementById('receita-status').value = receita.status || 'ativo';
        document.getElementById('receita-data-inicio').value = receita.data_inicio || '';
        document.getElementById('receita-data-fim').value = receita.data_fim || '';
        document.getElementById('receita-esforco').value = receita.nivel_esforco || 'Médio';
        document.getElementById('receita-score').value = receita.score_roi || 5;
        document.getElementById('receita-equipe').value = receita.equipe || '';
        document.getElementById('receita-observacoes').value = receita.observacoes || '';
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function submitReceita() {
    saveReceita();
}

async function saveReceita() {
    const form = document.getElementById('form-receita');
    const id = form.dataset.id;
    
    const data = {
        cliente_id: document.getElementById('receita-cliente').value,
        fonte_receita_id: document.getElementById('receita-fonte').value || null,
        descricao: document.getElementById('receita-descricao').value.trim(),
        valor: parseFloat(document.getElementById('receita-valor').value) || 0,
        moeda: document.getElementById('receita-moeda').value,
        tipo: document.getElementById('receita-tipo').value,
        recorrencia: document.getElementById('receita-recorrencia').value,
        dia_vencimento: parseInt(document.getElementById('receita-dia').value) || 10,
        status: document.getElementById('receita-status').value,
        data_inicio: document.getElementById('receita-data-inicio').value || null,
        data_fim: document.getElementById('receita-data-fim').value || null,
        nivel_esforco: document.getElementById('receita-esforco').value,
        score_roi: parseInt(document.getElementById('receita-score').value) || 5,
        equipe: document.getElementById('receita-equipe').value.trim(),
        observacoes: document.getElementById('receita-observacoes').value.trim()
    };
    
    if (!data.cliente_id) {
        showToast('Selecione um cliente', 'error');
        return;
    }
    
    if (!data.valor || data.valor <= 0) {
        showToast('Informe um valor válido', 'error');
        return;
    }
    
    try {
        if (id) {
            await api(`receitas&id=${id}`, 'PUT', data);
            showToast('Receita atualizada!');
        } else {
            await api('receitas', 'POST', data);
            showToast('Receita criada!');
        }
        closeModal('modal-receita');
        loadReceitas();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteReceita(id) {
    if (!confirm('Deseja excluir esta receita?')) return;
    
    try {
        await api(`receitas&id=${id}`, 'DELETE');
        showToast('Receita excluída!');
        loadReceitas();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Expor funções para o HTML
window.openClienteModal = openClienteModal;
window.editCliente = editCliente;
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
window.editFonte = editFonte;
window.saveFonte = saveFonte;
window.deleteFonte = deleteFonte;
window.openCategoriaModal = openCategoriaModal;
window.editCategoria = editCategoria;
window.saveCategoria = saveCategoria;
window.deleteCategoria = deleteCategoria;
window.saveConfiguracoes = saveConfiguracoes;

// v3.0 exports
window.openClienteCadastroModal = openClienteCadastroModal;
window.editClienteCadastro = editClienteCadastro;
window.submitClienteCadastro = submitClienteCadastro;
window.deleteClienteCadastro = deleteClienteCadastro;
window.verClienteDetalhe = verClienteDetalhe;
window.openReceitaModal = openReceitaModal;
window.editReceita = editReceita;
window.submitReceita = submitReceita;
window.deleteReceita = deleteReceita;
