-- Tabela de solicitações de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente         text NOT NULL,
  tipo_solicitacao text NOT NULL CHECK (tipo_solicitacao IN ('Orçamento', 'Amostra')),
  prioridade      text NOT NULL CHECK (prioridade IN ('Crítico', 'Normal')) DEFAULT 'Normal',
  observacao      text,
  status_produto  text NOT NULL CHECK (status_produto IN ('NOVO', 'RECORRENTE')) DEFAULT 'NOVO',
  arquivos        text[] DEFAULT '{}',
  status          text NOT NULL CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')) DEFAULT 'PENDENTE',
  finalizado      boolean NOT NULL DEFAULT false,
  numero_ov       text,                   -- Número do OV ou PD no ERP (preenchido pelo orçamentista)
  requester_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_name  text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orcamentos_updated_at
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS: cada usuário vê apenas as próprias; admins veem todas
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orcamentos"
  ON orcamentos FOR SELECT
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can insert own orcamentos"
  ON orcamentos FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update orcamentos"
  ON orcamentos FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
