-- Script SQL para criar o banco de dados do TCC - Monitoramento de Energia com ESP32

-- Criar banco de dados (se não existir)
CREATE DATABASE IF NOT EXISTS Monitor_Energia;

-- Usar o banco de dados
USE Monitor_Energia;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de leituras de energia
CREATE TABLE IF NOT EXISTS leituras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tensao DECIMAL(10,2) NOT NULL,
    corrente DECIMAL(10,2) NOT NULL,
    kwh DECIMAL(10,2) NOT NULL,
    instante TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para otimização
CREATE INDEX idx_leituras_usuario_id ON leituras(usuario_id);
CREATE INDEX idx_leituras_instante ON leituras(instante);