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

export interface Ticket {
  id: string;
  title: string;
  description: string;
  requester: string;
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

export type ViewState = 'DASHBOARD' | 'CREATE_TICKET' | 'TICKET_DETAIL';