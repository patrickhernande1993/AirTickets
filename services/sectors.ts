export const SECTORS = [
  'Administrativo',
  'Almoxarifado',
  'Comercial / Vendas',
  'Compras',
  'Confecção',
  'Contabilidade',
  'Diretoria',
  'Expedição / Logística',
  'Financeiro',
  'Jurídico',
  'Manutenção',
  'Marketing',
  'Produção',
  'Qualidade',
  'Recursos Humanos',
  'Tecelagem',
  'TI',
] as const;

export type Sector = typeof SECTORS[number];
