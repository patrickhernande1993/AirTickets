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
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  requester: string; // Name of requester
  requesterId: string; // Link to User ID
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  createdAt: Date;
  aiAnalysis?: string;
  suggestedSolution?: string;
}

export interface ITicketStats {
  total: number;
  open: number;
  critical: number;
  resolved: number;
}

export type ViewState = 'DASHBOARD' | 'CREATE_TICKET' | 'TICKET_DETAIL' | 'MY_TICKETS' | 'USERS' | 'EDIT_TICKET';
