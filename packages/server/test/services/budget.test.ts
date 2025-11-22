import { describe, it, expect, beforeEach } from 'vitest';
// FIX: Adicionada extensão .js
import { BudgetService } from '../../src/services/budget.js';

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService();
  });

  it('deve iniciar com orçamento total', () => {
    expect(service.getRemaining()).toBe(5.00);
  });

  it('deve deduzir custo corretamente', async () => {
    await service.consume(1.50);
    expect(service.getRemaining()).toBe(3.50);
  });

  it('deve bloquear se exceder o limite', async () => {
    await service.consume(4.90);
    const allowed = await service.checkBudget(0.20); 
    expect(allowed).toBe(false);
  });
});
