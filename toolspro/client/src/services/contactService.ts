import { apiPost } from "./api";

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; 
}

export function sendContactMessage(payload: ContactPayload): Promise<{ received: boolean }> {
  return apiPost<{ received: boolean }>("/contact", payload);
}