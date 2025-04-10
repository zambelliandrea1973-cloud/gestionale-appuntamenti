import { Appointment } from "@shared/schema";

export interface AppointmentWithDetails extends Appointment {
  client?: Client;
  service?: Service;
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