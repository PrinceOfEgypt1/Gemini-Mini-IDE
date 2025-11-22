/**
 * Serviço de controle de orçamento.
 * Gerencia os limites de gastos da aplicação para evitar custos excessivos com LLMs.
 */
export class BudgetService {
  private readonly MAX_DAILY_COST = 5.00; // R$ 5,00
  private currentCost = 0;

  /**
   * Verifica se há orçamento suficiente para a operação.
   * @param estimatedCost - Custo estimado da operação.
   * @returns True se houver orçamento, False caso contrário.
   */
  async checkBudget(estimatedCost: number): Promise<boolean> {
    if (this.currentCost + estimatedCost > this.MAX_DAILY_COST) {
      return false;
    }
    return true;
  }

  /**
   * Deduz o custo do orçamento atual.
   * @param cost - O valor a ser consumido.
   */
  async consume(cost: number): Promise<void> {
    this.currentCost += cost;
  }

  /**
   * Retorna o orçamento restante.
   */
  getRemaining(): number {
    return Math.max(0, this.MAX_DAILY_COST - this.currentCost);
  }
}
