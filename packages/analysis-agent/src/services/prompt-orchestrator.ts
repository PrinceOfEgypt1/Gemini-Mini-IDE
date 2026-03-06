import { SYSTEM_PROMPTS } from "../prompts/index.js";
import type {
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  RichEpic,
  RichUserStory,
} from "../types/rich-schemas.js";

export class PromptOrchestrator {
  private userPrompt: string = "";
  private analysis: RichAnalysis | null = null;
  private productPlan: RichProductPlan | null = null;
  private architecture: RichArchitecture | null = null;
  private userStories: RichUserStory[] = [];

  public start(userPrompt: string): void {
    this.userPrompt = userPrompt;
    this.analysis = null;
    this.productPlan = null;
    this.architecture = null;
    this.userStories = [];
  }

  public setAnalysis(analysis: RichAnalysis): void {
    this.analysis = analysis;
  }

  public getAnalysis(): RichAnalysis | null {
    return this.analysis;
  }

  public setProductPlan(productPlan: RichProductPlan): void {
    this.productPlan = productPlan;
  }

  public getProductPlan(): RichProductPlan | null {
    return this.productPlan;
  }

  public setArchitecture(architecture: RichArchitecture): void {
    this.architecture = architecture;
  }

  public addUserStories(stories: RichUserStory[]): void {
    this.userStories.push(...stories);
  }

  public getAnalysisPrompt(userPrompt: string): { system: string; user: string } {
    return {
      system: SYSTEM_PROMPTS.ANALYSIS,
      user: userPrompt,
    };
  }

  public getProductPrompt(userPrompt: string, analysis: RichAnalysis | null): { system: string; user: string } {
    if (analysis) {
      this.setAnalysis(analysis);
    }
    if (!this.analysis) {
      throw new Error("Analysis context not set for product prompt.");
    }
    const richContext = JSON.stringify(this.analysis, null, 2);
    return {
      system: SYSTEM_PROMPTS.PRODUCT,
      user: `${userPrompt}\n\nCONTEXTO DE ANÁLISE:\n${richContext}`,
    };
  }

  public getArchitecturePrompt(
    userPrompt: string,
    analysis: RichAnalysis | null,
    productPlan: RichProductPlan | null,
    userStories: RichUserStory[]
  ): { system: string; user: string } {
    if (analysis) {
      this.setAnalysis(analysis);
    }
    if (productPlan) {
      this.setProductPlan(productPlan);
    }
    if (userStories.length > 0) {
      this.addUserStories(userStories);
    }
    if (!this.productPlan) {
      throw new Error("Product plan context not set for architecture prompt.");
    }
    const richContext = JSON.stringify(this.productPlan, null, 2);
    return {
      system: SYSTEM_PROMPTS.ARCHITECTURE,
      user: `${userPrompt}\n\nCONTEXTO DE PRODUTO:\n${richContext}`,
    };
  }

  public getUserStoriesPrompt(epic: RichEpic, productPlan: RichProductPlan | null): { system: string; user: string } {
    if (productPlan) {
      this.setProductPlan(productPlan);
    }
    if (!this.productPlan) {
      throw new Error("Product plan context not set for user stories prompt.");
    }
    const richContext = JSON.stringify(epic, null, 2);
    return {
      system: SYSTEM_PROMPTS.USER_STORIES,
      user: `Expand the following epic into detailed user stories with acceptance criteria:\n\nEPIC:\n${richContext}`,
    };
  }

  public getCodeGenPrompt(fileSpecPath: string, fileDescription: string, fileImports: string[]): { system: string; user: string } {
    if (!this.architecture) {
      throw new Error("Architecture context not set for code generation prompt.");
    }
    const architectureContext = JSON.stringify(this.architecture, null, 2);
    const userStoriesContext = JSON.stringify(this.userStories, null, 2);
    const userPrompt = `
      FILE: ${fileSpecPath}
      DESCRIPTION: ${fileDescription}
      IMPORTS NEEDED: ${JSON.stringify(fileImports)}

      ARCHITECTURE CONTEXT:
      ${architectureContext}

      USER STORIES CONTEXT:
      ${userStoriesContext}
    `;
    return {
      system: SYSTEM_PROMPTS.CODE_GEN,
      user: userPrompt,
    };
  }

  public getArchitecture(): RichArchitecture | null {
    return this.architecture;
  }

  public getUserStories(): RichUserStory[] {
    return this.userStories;
  }

  public getUserPrompt(): string {
    return this.userPrompt;
  }
}
