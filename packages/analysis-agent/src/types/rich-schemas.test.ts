import { describe, it, expect } from 'vitest';
import {
  ComplexityInfoSchema,
  RichAnalysisSchema,
  AnalysisSchema,
  RichEpicSchema,
  RiskSchema,
  RichProductPlanSchema,
  TechStackSchema,
  ArchitecturalDecisionSchema,
  RichManifestItemSchema,
  RichArchitectureSchema,
  AcceptanceCriterionSchema,
  RichUserStorySchema,
  UserStoriesSummarySchema,
  RichUserStoriesResultSchema,
  UserStoriesSchema,
} from './rich-schemas';

// --- Helpers ---
function validComplexityInfo() {
  return { level: 'MEDIUM' as const, score: 5, justification: 'Moderate complexity' };
}

function validRichAnalysis() {
  return {
    summary: 'A test summary',
    coreEntities: ['User', 'Order'],
    complexity: validComplexityInfo(),
    assumptions: ['Assumption 1'],
    implicitRequirements: ['Req 1'],
  };
}

function validEpic() {
  return {
    id: 'EPIC-01',
    title: 'Core Module',
    category: 'CORE' as const,
    context: 'Base system',
    requirements: ['Auth'],
    acceptanceCriteria: ['Login works'],
    priority: 'P0' as const,
    estimatedComplexity: 'HIGH' as const,
  };
}

function validRisk() {
  return { description: 'Data loss', mitigation: 'Backups' };
}

function validTechStack() {
  return {
    runtime: 'Node.js 20',
    language: 'TypeScript',
    framework: 'Fastify',
    orm: 'Prisma',
    database: 'PostgreSQL',
    cache: 'Redis',
    queue: 'BullMQ',
    testing: 'Vitest',
    documentation: 'README.md',
  };
}

function validManifestItem() {
  return {
    path: 'src/index.ts',
    purpose: 'Entry point',
    criticality: 'HIGH' as const,
    category: 'APPLICATION' as const,
  };
}

function validAcceptanceCriterion() {
  return {
    id: 'AC-01',
    scenario: 'User login',
    given: 'valid credentials',
    when: 'user submits form',
    then: 'user is logged in',
  };
}

function validUserStory() {
  return {
    id: 'US-01',
    title: 'Login',
    description: 'As a user I can login',
    acceptanceCriteria: [validAcceptanceCriterion()],
    technicalNotes: ['Use JWT'],
    dependencies: [],
    estimatedPoints: 3,
    priority: 'P1' as const,
  };
}

// --- Tests ---

describe('ComplexityInfoSchema', () => {
  it('should accept valid data', () => {
    const result = ComplexityInfoSchema.parse(validComplexityInfo());
    expect(result.level).toBe('MEDIUM');
    expect(result.score).toBe(5);
  });

  it('should reject invalid level', () => {
    expect(() =>
      ComplexityInfoSchema.parse({ ...validComplexityInfo(), level: 'INVALID' })
    ).toThrow();
  });

  it('should reject score below 1', () => {
    expect(() =>
      ComplexityInfoSchema.parse({ ...validComplexityInfo(), score: 0 })
    ).toThrow();
  });

  it('should reject score above 10', () => {
    expect(() =>
      ComplexityInfoSchema.parse({ ...validComplexityInfo(), score: 11 })
    ).toThrow();
  });

  it('should accept all valid levels', () => {
    for (const level of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      const result = ComplexityInfoSchema.parse({ ...validComplexityInfo(), level });
      expect(result.level).toBe(level);
    }
  });
});

describe('RichAnalysisSchema', () => {
  it('should accept valid data', () => {
    const result = RichAnalysisSchema.parse(validRichAnalysis());
    expect(result.summary).toBe('A test summary');
    expect(result.coreEntities).toHaveLength(2);
  });

  it('should reject missing fields', () => {
    expect(() => RichAnalysisSchema.parse({ summary: 'only summary' })).toThrow();
  });

  it('should accept empty arrays', () => {
    const data = {
      ...validRichAnalysis(),
      coreEntities: [],
      assumptions: [],
      implicitRequirements: [],
    };
    const result = RichAnalysisSchema.parse(data);
    expect(result.coreEntities).toHaveLength(0);
  });
});

describe('AnalysisSchema alias', () => {
  it('should be the same as RichAnalysisSchema', () => {
    expect(AnalysisSchema).toBe(RichAnalysisSchema);
  });
});

describe('RichEpicSchema', () => {
  it('should accept valid epic', () => {
    const result = RichEpicSchema.parse(validEpic());
    expect(result.id).toBe('EPIC-01');
    expect(result.priority).toBe('P0');
  });

  it('should accept all category values', () => {
    for (const category of ['CORE', 'AUTH & SECURITY', 'ADMIN', 'OBSERVABILITY', 'INTEGRATION', 'INFRASTRUCTURE']) {
      const result = RichEpicSchema.parse({ ...validEpic(), category });
      expect(result.category).toBe(category);
    }
  });

  it('should reject invalid priority', () => {
    expect(() =>
      RichEpicSchema.parse({ ...validEpic(), priority: 'P4' })
    ).toThrow();
  });
});

describe('RiskSchema', () => {
  it('should accept valid risk', () => {
    const result = RiskSchema.parse(validRisk());
    expect(result.description).toBe('Data loss');
  });

  it('should reject missing mitigation', () => {
    expect(() => RiskSchema.parse({ description: 'Risk' })).toThrow();
  });
});

describe('RichProductPlanSchema', () => {
  it('should accept valid product plan', () => {
    const result = RichProductPlanSchema.parse({
      productVision: 'Build an IDE',
      epics: [validEpic()],
      outOfScope: ['Mobile'],
      risks: [validRisk()],
    });
    expect(result.epics).toHaveLength(1);
    expect(result.outOfScope).toContain('Mobile');
  });

  it('should accept empty arrays', () => {
    const result = RichProductPlanSchema.parse({
      productVision: 'Vision',
      epics: [],
      outOfScope: [],
      risks: [],
    });
    expect(result.epics).toHaveLength(0);
  });
});

describe('TechStackSchema', () => {
  it('should accept valid stack', () => {
    const result = TechStackSchema.parse(validTechStack());
    expect(result.runtime).toBe('Node.js 20');
  });

  it('should apply defaults for optional fields', () => {
    const minimal = {
      runtime: 'Node.js',
      language: 'TypeScript',
      framework: 'Express',
      testing: 'Jest',
    };
    const result = TechStackSchema.parse(minimal);
    expect(result.orm).toBe('N/A');
    expect(result.database).toBe('N/A');
    expect(result.cache).toBe('N/A');
    expect(result.queue).toBe('N/A');
    expect(result.documentation).toBe('README.md');
  });
});

describe('ArchitecturalDecisionSchema', () => {
  it('should accept valid decision', () => {
    const result = ArchitecturalDecisionSchema.parse({
      decision: 'Use microservices',
      rationale: 'Scalability',
    });
    expect(result.decision).toBe('Use microservices');
  });
});

describe('RichManifestItemSchema', () => {
  it('should accept valid manifest item', () => {
    const result = RichManifestItemSchema.parse(validManifestItem());
    expect(result.criticality).toBe('HIGH');
    expect(result.category).toBe('APPLICATION');
  });

  it('should accept all file categories', () => {
    const categories = ['DOMAIN', 'APPLICATION', 'INFRASTRUCTURE', 'DEVOPS', 'CONFIG', 'TESTS', 'DOCS', 'ANIMATION', 'UI', 'STORE'];
    for (const category of categories) {
      const result = RichManifestItemSchema.parse({ ...validManifestItem(), category });
      expect(result.category).toBe(category);
    }
  });

  it('should reject invalid criticality', () => {
    expect(() =>
      RichManifestItemSchema.parse({ ...validManifestItem(), criticality: 'EXTREME' })
    ).toThrow();
  });
});

describe('RichArchitectureSchema', () => {
  it('should accept valid architecture', () => {
    const result = RichArchitectureSchema.parse({
      architectureStyle: 'Clean Architecture',
      stack: validTechStack(),
      keyDecisions: [{ decision: 'Use DDD', rationale: 'Domain clarity' }],
      manifest: [validManifestItem()],
      securityConsiderations: ['HTTPS only'],
      scalabilityPath: ['Horizontal scaling'],
    });
    expect(result.architectureStyle).toBe('Clean Architecture');
    expect(result.diagram).toBe('');
  });

  it('should default diagram to empty string', () => {
    const result = RichArchitectureSchema.parse({
      architectureStyle: 'MVC',
      stack: validTechStack(),
      keyDecisions: [],
      manifest: [],
      securityConsiderations: [],
      scalabilityPath: [],
    });
    expect(result.diagram).toBe('');
  });
});

describe('AcceptanceCriterionSchema', () => {
  it('should accept valid criterion', () => {
    const result = AcceptanceCriterionSchema.parse(validAcceptanceCriterion());
    expect(result.given).toBe('valid credentials');
  });

  it('should reject missing when field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { when: _when, ...partial } = validAcceptanceCriterion();
    expect(() => AcceptanceCriterionSchema.parse(partial)).toThrow();
  });
});

describe('RichUserStorySchema', () => {
  it('should accept valid user story', () => {
    const result = RichUserStorySchema.parse(validUserStory());
    expect(result.estimatedPoints).toBe(3);
    expect(result.acceptanceCriteria).toHaveLength(1);
  });

  it('should accept all priority values', () => {
    for (const priority of ['P0', 'P1', 'P2', 'P3']) {
      const result = RichUserStorySchema.parse({ ...validUserStory(), priority });
      expect(result.priority).toBe(priority);
    }
  });
});

describe('UserStoriesSummarySchema', () => {
  it('should accept valid summary', () => {
    const result = UserStoriesSummarySchema.parse({
      totalStories: 10,
      totalPoints: 30,
      p0Count: 2,
      p1Count: 5,
      p2Count: 3,
    });
    expect(result.totalStories).toBe(10);
  });
});

describe('RichUserStoriesResultSchema', () => {
  it('should accept valid result', () => {
    const result = RichUserStoriesResultSchema.parse({
      epicId: 'EPIC-01',
      epicTitle: 'Core',
      userStories: [validUserStory()],
      summary: { totalStories: 1, totalPoints: 3, p0Count: 0, p1Count: 1, p2Count: 0 },
    });
    expect(result.userStories).toHaveLength(1);
  });
});

describe('UserStoriesSchema alias', () => {
  it('should be the same as RichUserStoriesResultSchema', () => {
    expect(UserStoriesSchema).toBe(RichUserStoriesResultSchema);
  });
});
