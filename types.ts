
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive?: boolean; // Campo para controlar se o usuário está ativo ou bloqueado
}

export interface Ticket {
  id: string;
  ticketNumber: number; // ID Sequencial (1, 2, 3...)
  title: string;
  description: string;
  requester: string; 
  requesterId: string; 
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  createdAt: Date;
  updatedAt?: Date; // Última atualização
  resolvedAt?: Date; // Data de resolução
  attachments?: string[]; // URLs dos arquivos anexados
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  ticketId?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  ticketId: string;
  ticketNumber?: number; // Para exibição nos logs
  actorId: string;
  actorName?: string;
  action: string; // 'CREATED' | 'STATUS_CHANGE' | 'EDITED'
  details?: string;
  createdAt: Date;
}

export interface ITicketStats {
  total: number;
  open: number;
  critical: number;
  resolved: number;
}

export type ViewState = 'DASHBOARD' | 'CREATE_TICKET' | 'TICKET_DETAIL' | 'MY_TICKETS' | 'ALL_TICKETS' | 'USERS' | 'EDIT_TICKET' | 'NOTIFICATIONS';