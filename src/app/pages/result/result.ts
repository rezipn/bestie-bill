import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BillService } from '../../bill';

@Component({
  selector: 'app-result',
  imports: [],
  templateUrl: './result.html',
  styleUrl: './result.scss',
})
export class Result {
  bill = inject(BillService);
  private router = inject(Router);

  rupiah(n: number) {
  return Math.round(n).toLocaleString('id-ID');
  }

  total() {
    return this.bill.items().reduce((s, i) => s + i.price, 0);
  }

  totalsList() {
    const r = this.bill.splitResult();
    if (!r) return [];
    return Object.entries(r.totals).map(([name, amount]) => ({ name, amount: Math.round(amount) }));
  }

  shareWA() {
  const r = this.bill.splitResult();
  if (!r) return;
  const lines = [
    `Bestie Bill - ${this.bill.groupName()}`,
    `Total: Rp${this.rupiah(this.total())}`,
    ``,
    ...this.totalsList().map(t => `- ${t.name}: Rp${this.rupiah(t.amount)}`),
    ``,
    ...r.settlements.map(s => `${s.from} bayar Rp${this.rupiah(s.amount)} ke ${s.to}`),
  ];
  window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
}

  again() {
    this.bill.items.set([]);
    this.bill.splitResult.set(null);
    this.router.navigate(['/']);
  }
}