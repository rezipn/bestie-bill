const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'bestie-bill' });
});

// POST /api/split
// body: { items: [{ name, price, participants: ["Rezi","Maya"] }], paidBy: "Rezi" }
app.post('/api/split', (req, res) => {
  const { items, paidBy } = req.body;
  const totals = {};

  for (const item of items) {
    const share = item.price / item.participants.length;
    for (const p of item.participants) {
      totals[p] = (totals[p] || 0) + share;
    }
  }

  // siapa nalangin siapa (settle paling simpel)
  const balances = Object.entries(totals).map(([name, owe]) => ({
    name,
    balance: (name === paidBy ? items.reduce((s, i) => s + i.price, 0) : 0) - owe,
  }));

  const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);
    settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amount) });
    debtors[i].balance += amount;
    creditors[j].balance -= amount;
    if (Math.abs(debtors[i].balance) < 1) i++;
    if (Math.abs(creditors[j].balance) < 1) j++;
  }

  res.json({ totals, settlements });
});

const PORT = 3000;
app.listen(PORT, () => console.log('Bestie Bill API jalan di http://localhost:' + PORT));