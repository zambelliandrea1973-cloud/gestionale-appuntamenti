import { Appointment } from "../../../shared/schema";

export interface AppointmentWithDetails extends Appointment {
  client?: Client;
  service?: Service;
  staff?: Staff;
  room?: TreatmentRoom;
}

export interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  specialization?: string;
  iban?: string;
  isActive?: boolean;
}

export interface TreatmentRoom {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderTemplate {
  id: number;
  name: string;
  template: string;
  serviceId?: number | null;
  type?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}