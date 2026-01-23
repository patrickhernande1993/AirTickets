
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED'
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
  isActive?: boolean;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  requester: string; 
  requesterId: string; 
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  attachments?: string[];
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: Date;
  source?: 'WEB' | 'EMAIL'; // Identifica a origem da mensagem
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
  ticketNumber?: number;
  actorId: string;
  actorName?: string;
  action: string;
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
