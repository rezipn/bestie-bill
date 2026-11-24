import { Injectable, signal } from '@angular/core';

export interface BillItem {
  name: string;
  price: number;
  participants: string[];
}

@Injectable({ providedIn: 'root' })
export class BillService {
  groupName = signal('Nongkrong Bareng');
  members = signal<string[]>(['Rezi']);
  items = signal<BillItem[]>([]);
  paidBy = signal('Rezi');
  splitResult = signal<{ totals: Record<string, number>; settlements: { from: string; to: string; amount: number }[] } | null>(null);
}