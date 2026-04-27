-- Adiciona campo de data agendada para atendimento na tabela de tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Índice para facilitar buscas por data agendada
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_date ON tickets(scheduled_date);
