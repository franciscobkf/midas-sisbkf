-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Tempo de geração: 09/12/2025 às 09:41
-- Versão do servidor: 5.7.23-23
-- Versão do PHP: 8.1.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `sisbkf_midas3`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cor` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#6b7280',
  `icone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '?',
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `categorias`
--

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `cor`, `icone`, `ativo`, `created_at`, `updated_at`) VALUES
(1, 'Pessoal', NULL, '#ef4444', '👤', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(2, 'Operacional', NULL, '#f59e0b', '⚙️', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(3, 'Marketing', NULL, '#3b82f6', '📢', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(4, 'Tecnologia', NULL, '#8b5cf6', '💻', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(5, 'Escritório', NULL, '#10b981', '🏢', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(6, 'Impostos', NULL, '#6366f1', '📋', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(7, 'Outros', NULL, '#6b7280', '📁', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nome` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fonte_receita_id` int(11) DEFAULT NULL,
  `valor` decimal(15,2) NOT NULL DEFAULT '0.00',
  `moeda` enum('BRL','USD') COLLATE utf8mb4_unicode_ci DEFAULT 'BRL',
  `nivel_esforco` enum('Baixo','Médio','Alto') COLLATE utf8mb4_unicode_ci DEFAULT 'Médio',
  `equipe` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Ativo','Inativo','Prospect','Pausado') COLLATE utf8mb4_unicode_ci DEFAULT 'Ativo',
  `score_roi` int(11) DEFAULT '5',
  `recorrencia` enum('Única','Mensal','Trimestral','Semestral','Anual') COLLATE utf8mb4_unicode_ci DEFAULT 'Mensal',
  `dia_vencimento` int(11) DEFAULT '10',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `clientes`
--

INSERT INTO `clientes` (`id`, `nome`, `fonte_receita_id`, `valor`, `moeda`, `nivel_esforco`, `equipe`, `status`, `score_roi`, `recorrencia`, `dia_vencimento`, `observacoes`, `ativo`, `created_at`, `updated_at`) VALUES
(1, 'Dolarize', 6, 50.00, 'BRL', 'Baixo', 'Francisco', 'Ativo', 5, 'Mensal', 8, 'Benefício Membro BNI', 1, '2025-12-09 02:17:08', '2025-12-09 02:17:08');

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes_anexos`
--

CREATE TABLE `clientes_anexos` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `nome_arquivo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_original` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('contrato','proposta','acordo','nf','outro') COLLATE utf8mb4_unicode_ci DEFAULT 'outro',
  `descricao` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tamanho` int(11) DEFAULT '0',
  `mimetype` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes_cadastro`
--

CREATE TABLE `clientes_cadastro` (
  `id` int(11) NOT NULL,
  `razao_social` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_fantasia` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cnpj_cpf` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cep` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contato_nome` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contato_cargo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `clientes_cadastro`
--

INSERT INTO `clientes_cadastro` (`id`, `razao_social`, `nome_fantasia`, `cnpj_cpf`, `email`, `telefone`, `whatsapp`, `endereco`, `cidade`, `estado`, `cep`, `contato_nome`, `contato_cargo`, `observacoes`, `ativo`, `created_at`, `updated_at`) VALUES
(1, 'Dolarize', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Benefício Membro BNI', 1, '2025-12-09 02:17:08', '2025-12-09 02:17:08'),
(2, '', '', '', '', '', '', '', '', '', '', '', '', '', 1, '2025-12-09 04:28:52', '2025-12-09 04:28:52');

-- --------------------------------------------------------

--
-- Estrutura para tabela `configuracoes`
--

CREATE TABLE `configuracoes` (
  `chave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `configuracoes`
--

INSERT INTO `configuracoes` (`chave`, `valor`, `descricao`, `updated_at`) VALUES
('cotacao_dolar', '6.00', 'Cotação do dólar para conversão', '2025-12-09 01:51:40'),
('empresa_nome', 'BKF Group', 'Nome da empresa', '2025-12-09 01:51:40'),
('moeda_padrao', 'BRL', 'Moeda padrão do sistema', '2025-12-09 01:51:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `despesas`
--

CREATE TABLE `despesas` (
  `id` int(11) NOT NULL,
  `descricao` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `valor` decimal(15,2) NOT NULL DEFAULT '0.00',
  `moeda` enum('BRL','USD') COLLATE utf8mb4_unicode_ci DEFAULT 'BRL',
  `recorrencia` enum('Única','Mensal','Trimestral','Semestral','Anual') COLLATE utf8mb4_unicode_ci DEFAULT 'Mensal',
  `dia_vencimento` int(11) DEFAULT '10',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `fontes_receita`
--

CREATE TABLE `fontes_receita` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cor` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#10b981',
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `fontes_receita`
--

INSERT INTO `fontes_receita` (`id`, `nome`, `descricao`, `cor`, `ativo`, `created_at`, `updated_at`) VALUES
(1, 'Fee Mensal', NULL, '#10b981', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(2, 'Projeto Avulso', NULL, '#3b82f6', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(3, 'Comissão', NULL, '#f59e0b', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(4, 'Consultoria', NULL, '#8b5cf6', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(5, 'Parceria', NULL, '#ec4899', 1, '2025-12-09 01:51:40', '2025-12-09 01:51:40'),
(6, 'Elinks - Bronze', '', '#6b7280', 1, '2025-12-09 01:51:40', '2025-12-09 02:16:08'),
(7, 'Elinks - Prata', '', '#10b981', 1, '2025-12-09 02:16:25', '2025-12-09 02:16:25'),
(8, 'Elinks - Ouro', '', '#10b981', 1, '2025-12-09 03:40:55', '2025-12-09 03:40:55');

-- --------------------------------------------------------

--
-- Estrutura para tabela `lancamentos`
--

CREATE TABLE `lancamentos` (
  `id` int(11) NOT NULL,
  `tipo` enum('receita','despesa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `receita_id` int(11) DEFAULT NULL,
  `despesa_id` int(11) DEFAULT NULL,
  `descricao` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(15,2) NOT NULL DEFAULT '0.00',
  `moeda` enum('BRL','USD') COLLATE utf8mb4_unicode_ci DEFAULT 'BRL',
  `data_vencimento` date NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `status` enum('pendente','pago','cancelado','atrasado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendente',
  `mes_referencia` char(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Formato: YYYY-MM',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `lancamentos`
--

INSERT INTO `lancamentos` (`id`, `tipo`, `cliente_id`, `receita_id`, `despesa_id`, `descricao`, `valor`, `moeda`, `data_vencimento`, `data_pagamento`, `status`, `mes_referencia`, `observacoes`, `created_at`, `updated_at`) VALUES
(1, 'receita', 1, 1, NULL, 'Dolarize', 50.00, 'BRL', '2026-01-08', NULL, 'pendente', '2026-01', NULL, '2025-12-09 02:18:00', '2025-12-09 02:50:59'),
(2, 'receita', 1, 1, NULL, 'Dolarize', 50.00, 'BRL', '2025-12-08', NULL, 'pendente', '2025-12', NULL, '2025-12-09 03:35:21', '2025-12-09 03:35:21');

-- --------------------------------------------------------

--
-- Estrutura para tabela `receitas`
--

CREATE TABLE `receitas` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `fonte_receita_id` int(11) DEFAULT NULL,
  `descricao` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(15,2) NOT NULL DEFAULT '0.00',
  `moeda` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'BRL',
  `tipo` enum('recorrente','avulso') COLLATE utf8mb4_unicode_ci DEFAULT 'recorrente',
  `recorrencia` enum('Mensal','Trimestral','Semestral','Anual') COLLATE utf8mb4_unicode_ci DEFAULT 'Mensal',
  `dia_vencimento` int(2) DEFAULT '10',
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `nivel_esforco` enum('Baixo','Médio','Alto') COLLATE utf8mb4_unicode_ci DEFAULT 'Médio',
  `equipe` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score_roi` int(2) DEFAULT '5',
  `status` enum('ativo','pausado','encerrado') COLLATE utf8mb4_unicode_ci DEFAULT 'ativo',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `receitas`
--

INSERT INTO `receitas` (`id`, `cliente_id`, `fonte_receita_id`, `descricao`, `valor`, `moeda`, `tipo`, `recorrencia`, `dia_vencimento`, `data_inicio`, `data_fim`, `nivel_esforco`, `equipe`, `score_roi`, `status`, `observacoes`, `created_at`, `updated_at`) VALUES
(1, 1, 6, 'Contrato Dolarize', 50.00, 'BRL', 'recorrente', 'Mensal', 8, NULL, NULL, 'Baixo', 'Francisco', 5, 'ativo', 'Benefício Membro BNI', '2025-12-09 02:17:08', '2025-12-09 02:17:08');

-- --------------------------------------------------------

--
-- Estrutura stand-in para view `vw_resumo_mensal`
-- (Veja abaixo para a visão atual)
--
CREATE TABLE `vw_resumo_mensal` (
`mes_referencia` char(7)
,`receitas_recebidas` decimal(37,2)
,`receitas_pendentes` decimal(37,2)
,`despesas_pagas` decimal(37,2)
,`despesas_pendentes` decimal(37,2)
,`total_receitas` decimal(37,2)
,`total_despesas` decimal(37,2)
,`saldo` decimal(37,2)
);

-- --------------------------------------------------------

--
-- Estrutura para view `vw_resumo_mensal`
--
DROP TABLE IF EXISTS `vw_resumo_mensal`;

CREATE ALGORITHM=UNDEFINED DEFINER=`cpses_si11r1any2`@`localhost` SQL SECURITY DEFINER VIEW `vw_resumo_mensal`  AS SELECT `lancamentos`.`mes_referencia` AS `mes_referencia`, sum((case when ((`lancamentos`.`tipo` = 'receita') and (`lancamentos`.`status` = 'pago')) then `lancamentos`.`valor` else 0 end)) AS `receitas_recebidas`, sum((case when ((`lancamentos`.`tipo` = 'receita') and (`lancamentos`.`status` = 'pendente')) then `lancamentos`.`valor` else 0 end)) AS `receitas_pendentes`, sum((case when ((`lancamentos`.`tipo` = 'despesa') and (`lancamentos`.`status` = 'pago')) then `lancamentos`.`valor` else 0 end)) AS `despesas_pagas`, sum((case when ((`lancamentos`.`tipo` = 'despesa') and (`lancamentos`.`status` = 'pendente')) then `lancamentos`.`valor` else 0 end)) AS `despesas_pendentes`, sum((case when (`lancamentos`.`tipo` = 'receita') then `lancamentos`.`valor` else 0 end)) AS `total_receitas`, sum((case when (`lancamentos`.`tipo` = 'despesa') then `lancamentos`.`valor` else 0 end)) AS `total_despesas`, sum((case when (`lancamentos`.`tipo` = 'receita') then `lancamentos`.`valor` else -(`lancamentos`.`valor`) end)) AS `saldo` FROM `lancamentos` WHERE (`lancamentos`.`status` <> 'cancelado') GROUP BY `lancamentos`.`mes_referencia` ORDER BY `lancamentos`.`mes_referencia` DESC ;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fonte_receita` (`fonte_receita_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_ativo` (`ativo`);

--
-- Índices de tabela `clientes_anexos`
--
ALTER TABLE `clientes_anexos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente` (`cliente_id`);

--
-- Índices de tabela `clientes_cadastro`
--
ALTER TABLE `clientes_cadastro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ativo` (`ativo`),
  ADD KEY `idx_razao_social` (`razao_social`);

--
-- Índices de tabela `configuracoes`
--
ALTER TABLE `configuracoes`
  ADD PRIMARY KEY (`chave`);

--
-- Índices de tabela `despesas`
--
ALTER TABLE `despesas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categoria` (`categoria_id`),
  ADD KEY `idx_ativo` (`ativo`);

--
-- Índices de tabela `fontes_receita`
--
ALTER TABLE `fontes_receita`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `lancamentos`
--
ALTER TABLE `lancamentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_mes_referencia` (`mes_referencia`),
  ADD KEY `idx_data_vencimento` (`data_vencimento`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_despesa` (`despesa_id`),
  ADD KEY `idx_receita` (`receita_id`);

--
-- Índices de tabela `receitas`
--
ALTER TABLE `receitas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_fonte` (`fonte_receita_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_tipo` (`tipo`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `clientes_anexos`
--
ALTER TABLE `clientes_anexos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `clientes_cadastro`
--
ALTER TABLE `clientes_cadastro`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `despesas`
--
ALTER TABLE `despesas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `fontes_receita`
--
ALTER TABLE `fontes_receita`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `lancamentos`
--
ALTER TABLE `lancamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `receitas`
--
ALTER TABLE `receitas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `clientes`
--
ALTER TABLE `clientes`
  ADD CONSTRAINT `fk_cliente_fonte` FOREIGN KEY (`fonte_receita_id`) REFERENCES `fontes_receita` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `despesas`
--
ALTER TABLE `despesas`
  ADD CONSTRAINT `fk_despesa_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `lancamentos`
--
ALTER TABLE `lancamentos`
  ADD CONSTRAINT `fk_lancamento_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lancamento_despesa` FOREIGN KEY (`despesa_id`) REFERENCES `despesas` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
