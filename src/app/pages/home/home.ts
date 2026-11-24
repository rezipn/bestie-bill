import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BillService } from '../../bill';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  bill = inject(BillService);
  private router = inject(Router);
  newMember = signal('');

  addMember() {
    const name = this.newMember().trim();
    if (!name) return;
    this.bill.members.update(list => [...list, name]);
    this.newMember.set('');
  }

  removeMember(name: string) {
    this.bill.members.update(list => list.filter(m => m !== name));
  }

  start() {
    if (this.bill.members().length < 2) return;
    this.router.navigate(['/upload']);
  }
}