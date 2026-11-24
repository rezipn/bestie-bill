import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { createWorker, PSM } from 'tesseract.js';
import { BillService, BillItem } from '../../bill';

@Component({
  selector: 'app-upload',
  imports: [FormsModule],
  templateUrl: './upload.html',
  styleUrl: './upload.scss',
})
export class Upload {
  bill = inject(BillService);
  private router = inject(Router);

  preview = signal('');
  scanning = signal(false);
  progress = signal(0);
  status = signal('');
  newName = signal('');
  newPrice = signal('');
  calculating = signal(false);

  async onFile(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.preview.set(URL.createObjectURL(file));
    this.scanning.set(true);
    this.status.set('Lagi baca struk...');

    const worker = await createWorker('ind+eng', 1, {
      logger: m => { if (m.status === 'recognizing text') this.progress.set(Math.round(m.progress * 100)); },
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const { data } = await worker.recognize(file);
    await worker.terminate();

    const items = this.parseReceipt(data.text);
    this.bill.items.set(items);
    this.scanning.set(false);
    this.status.set(items.length ? `Ketemu ${items.length} item — cek & koreksi ya.` : 'Tidak ada item terbaca. Tambah manual di bawah.');
  }

  parseReceipt(text: string): BillItem[] {
  const all = this.bill.members();
  const items: BillItem[] = [];
  let nameBuf = '';
  const flush = (name: string, price: number) => {
    const clean = name.replace(/[^a-zA-Z0-9 &().+/-]/g, '').replace(/^\d+\s*x?\s*/i, '').trim();
    if (clean.length < 3 || !price || price < 1000 || price > 10000000) return;
    if (/total|subtotal|tunai|cash|kembalian|pajak|pb\d|ppn|terima kasih|change|qris|bca|print|served|guests|take away|dine in|items|rounding|before/i.test(clean)) return;
    if (items.some(i => i.name.toLowerCase() === clean.toLowerCase())) return;
    items.push({ name: clean, price, participants: [...all] });
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    // baris yang diakhiri harga: "Nasi Goreng ... 48,182" atau cuma harga "48,182"
    const m = line.match(/^(.*?)\s+(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*$/);
    if (m) {
      const nm = (nameBuf + ' ' + m[1]).trim();
      flush(nm, Number(m[2].replace(/[.,]/g, '')));
      nameBuf = '';
    } else if (/^\d{1,3}$/.test(line)) {
      // baris cuma qty (1, 4) — abaikan
      continue;
    } else if (/^[a-zA-Z(]/.test(line) && !/date|receipt|cashier|customer|terima kasih/i.test(line)) {
      // baris nama (mungkin lanjutan item multi-baris)
      nameBuf = (nameBuf + ' ' + line).trim();
    }
  }
  return items;
}

  addManual() {
    const name = this.newName().trim();
    const price = Number(this.newPrice());
    if (!name || !price) return;
    this.bill.items.update(list => [...list, { name, price, participants: [...this.bill.members()] }]);
    this.newName.set('');
    this.newPrice.set('');
  }

  removeItem(i: number) {
    this.bill.items.update(list => list.filter((_, x) => x !== i));
  }

  toggleParticipant(item: BillItem, member: string) {
    const has = item.participants.includes(member);
    item.participants = has ? item.participants.filter(p => p !== member) : [...item.participants, member];
    this.bill.items.update(list => [...list]);
  }

  total() {
    return this.bill.items().reduce((s, i) => s + i.price, 0);
  }

  async calculate() {
  this.calculating.set(true);
  try {
    const res = await fetch('http://localhost:3000/api/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: this.bill.items(), paidBy: this.bill.paidBy() }),
    });
    if (!res.ok) throw new Error('backend error');
    this.bill.splitResult.set(await res.json());
  } catch {
    // fallback: hitung lokal kalau backend mati
    this.bill.splitResult.set(this.splitLocal());
  }
  this.calculating.set(false);
  this.router.navigate(['/result']);
}

private splitLocal() {
  const items = this.bill.items();
  const paidBy = this.bill.paidBy();
  const totals: Record<string, number> = {};
  for (const item of items) {
    const share = item.price / item.participants.length;
    for (const p of item.participants) totals[p] = (totals[p] || 0) + share;
  }
  const grand = items.reduce((s, i) => s + i.price, 0);
  const balances = Object.entries(totals).map(([name, owe]) => ({
    name, balance: (name === paidBy ? grand : 0) - owe,
  }));
  const debtors = balances.filter(b => b.balance < -1).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 1).sort((a, b) => b.balance - a.balance);
  const settlements: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);
    settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amount) });
    debtors[i].balance += amount;
    creditors[j].balance -= amount;
    if (Math.abs(debtors[i].balance) < 1) i++;
    if (Math.abs(creditors[j].balance) < 1) j++;
  }
  return { totals, settlements };
}
}