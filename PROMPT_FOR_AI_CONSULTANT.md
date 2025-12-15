# 🤖 PROMPT FOR AI CONSULTANT

## Context

You are an expert AI consultant specializing in LLM-based code generation systems, prompt engineering, and software architecture. You have been hired to solve critical quality issues in the **Gemini-Mini-IDE** project.

---

## Project Overview

**Gemini-Mini-IDE** is an AI-powered IDE that generates complete software projects from natural language descriptions. It uses:

- **LLM**: OpenAI GPT-4o-mini
- **Architecture**: Multi-stage pipeline (Analysis → Product → Architecture → User Stories → Code Generation)
- **Language**: TypeScript (strict mode, ESM modules)
- **Framework**: Fastify server, pnpm monorepo
- **Validation**: Zod schemas + custom validators

**Repository**: https://github.com/PrinceOfEgypt1/Gemini-Mini-IDE
**Branch**: `claude/fix-server-startup-018VNKPS4rf3H8w4TnyfS1mC`

---

## Problem Statement

The system is currently producing **unacceptable quality output**:

### 🔴 Critical Issues:

1. **No JSDoc/TypeDoc Documentation**
   - Generated TypeScript code has ZERO documentation
   - Missing @param, @returns, @throws annotations
   - No class or interface descriptions

2. **No User Stories Generated**
   - Expected output: ~60 User Stories with GWT format (Given-When-Then)
   - Actual output: **ZERO User Stories**
   - Epic expansion appears to fail silently

3. **Files with "FAILED TO GENERATE CLEAN CODE" Errors**
   - Multiple files contain error placeholders instead of actual code
   - Validation failures after 3 retry attempts
   - Same error repeated deterministically

4. **Incomplete Code Implementations**
   - Code missing critical methods or functionality
   - Partial implementations that don't compile

---

## Investigation Completed

A comprehensive forensic investigation has been conducted. **Read this file first**:

📄 `/home/user/Gemini-Mini-IDE/FORENSIC_INVESTIGATION_REPORT.md`

This 500+ line report contains:
- Complete architecture analysis
- Root cause identification for each issue
- File-by-file code analysis
- Specific line numbers and code snippets
- Recommended fixes with implementation details

---

## Your Mission

**Primary Objective**: Review the forensic report and provide **additional insights, alternative solutions, or identify any missed issues**.

### Specific Tasks:

1. **Validate Root Cause Analysis**
   - Review the 5 identified root causes
   - Confirm or challenge the conclusions
   - Identify any missed factors

2. **Evaluate Proposed Fixes**
   - Assess Fix #1: JSDoc enforcement in prompt
   - Assess Fix #2: Temperature variation on retry
   - Assess Fix #3: Documentation validator
   - Assess Fix #4: User Stories investigation
   - Suggest improvements or alternatives

3. **Identify Additional Issues**
   - Are there other systemic problems not covered?
   - Review the prompt engineering approach
   - Check for architectural anti-patterns

4. **Provide Implementation Guidance**
   - Prioritize the fixes differently if needed
   - Suggest additional testing strategies
   - Recommend monitoring/observability improvements

---

## Key Files to Review

You should examine these critical files in the repository:

### **Prompts** (Root of the issue):
- `packages/analysis-agent/src/prompts/code-gen.ts` - 🔴 PRIMARY ISSUE
- `packages/analysis-agent/src/prompts/user-stories.ts`
- `packages/analysis-agent/src/prompts/architecture.ts`
- `packages/analysis-agent/src/prompts/product.ts`
- `packages/analysis-agent/src/prompts/analysis.ts`

### **Core Logic**:
- `packages/analysis-agent/src/agent.ts` - Main orchestrator (670 lines)
  - Line 365-373: Analysis step
  - Line 375-384: Product step
  - Line 386-466: Architecture step (with retry logic)
  - Line 468-487: User Stories expansion (expandEpicsToStories)
  - Line 489-563: Code generation (generateFileContent)
  - Line 567-668: Main analyze() orchestrator

### **Context & Validation**:
- `packages/analysis-agent/src/context/generation-context.ts`
- `packages/analysis-agent/src/validators/manifest-validator.ts`
- `packages/analysis-agent/src/validators/integrity-validator.ts`
- `packages/analysis-agent/src/services/cache.service.ts`

### **Schemas**:
- `packages/analysis-agent/src/types/rich-schemas.ts`

---

## Forensic Report Summary

### Root Causes Identified:

| # | Root Cause | Severity | File |
|---|------------|----------|------|
| 1 | JSDoc not enforced in CODE_GEN_PROMPT | 🔴 CRITICAL | `prompts/code-gen.ts` |
| 2 | Deterministic retry (temp=0.0, seed=42) | 🔴 CRITICAL | `agent.ts:519` |
| 3 | Product step may not generate epics | 🟡 HIGH | `agent.ts:375-384` |
| 4 | No documentation validator | 🟡 HIGH | N/A (needs creation) |
| 5 | Examples lack extensive JSDoc | 🟡 HIGH | `prompts/code-gen.ts` |

### Key Findings:

**JSDoc Issue**:
- Prompt line 23 asks "□ Existe documentação JSDoc para funções públicas?"
- This is phrased as a QUESTION, not a REQUIREMENT
- Examples (lines 29-54) show NO JSDoc
- Negative rules don't enforce documentation

**Retry Issue**:
```typescript
// Current (BROKEN):
temperature: 0.0,  // Same every time
seed: 42,          // Deterministic

// Should be (like Architecture step):
const temperature = attempts > 1 ? 0.3 : 0.0;
const seed = attempts > 1 ? undefined : 42;
```

**User Stories Mystery**:
- The `expandEpicsToStories` logic LOOKS correct
- Prompt is EXCELLENT (detailed examples, GWT format)
- Hypothesis: Product step returns empty `epics` array → No User Stories
- Needs debug logging to confirm

---

## Expected Deliverables

Please provide:

### 1. **Executive Summary** (200 words)
Your high-level assessment of the situation and confidence in the proposed fixes.

### 2. **Root Cause Validation** (500 words)
- Agree/disagree with each of the 5 root causes
- Identify any additional root causes missed
- Provide evidence from code analysis

### 3. **Solution Review** (800 words)
- Evaluate each of the 4 proposed fixes
- Suggest improvements or alternatives
- Identify potential side effects
- Recommend implementation order

### 4. **Additional Recommendations** (500 words)
- Systemic improvements to prevent future issues
- Prompt engineering best practices
- Architectural improvements
- Testing and monitoring strategies

### 5. **Risk Assessment** (300 words)
- Risks of implementing the proposed fixes
- Potential breaking changes
- Rollback strategy

### 6. **Implementation Checklist** (structured list)
Step-by-step checklist with:
- Pre-implementation verification
- Implementation steps
- Testing procedures
- Success criteria

---

## Technical Context

### Current Workflow:

```
User Prompt
    ↓
1. Analysis (complexity, entities, assumptions)
    ↓
2. Product (epics, vision, risks)
    ↓
3. Architecture (manifest of 30-60 files, stack, decisions)
    ↓ [RETRY with validation - WORKING]
4. User Stories (expand each epic to 3-5 stories)
    ↓ [FAILING - returns 0 stories]
5. Code Generation (generate each file from manifest)
    ↓ [FAILING - no JSDoc, "FAILED TO GENERATE" errors]
```

### LLM Configuration:

```typescript
// Analysis, Product, Architecture, User Stories:
{
  model: "gpt-4o-mini",
  temperature: 0.0,  // First attempt
  temperature: 0.3,  // Retry (Architecture only)
  timeout: 600000,   // 10 minutes
  response_format: { type: "json_object" }
}

// Code Generation:
{
  model: "gpt-4o-mini",
  temperature: 0.0,  // 🔴 ALWAYS 0.0 (even on retries)
  seed: 42,          // 🔴 ALWAYS 42 (deterministic)
  timeout: 600000,
  response_format: { type: "json_object" }
}
```

### Validation Pipeline:

```typescript
// For each generated file:
1. Completeness Validator (anti-lazy check)
2. Syntax Validator (TypeScript compilation)
3. [MISSING] Documentation Validator
```

### Caching:

- Semantic cache with SHA-256 keys
- TTL: 24 hours
- Version: v14.3 (incremented to invalidate old cache)
- Includes: prompt + model + temperature + retryAttempt

---

## Recent Changes

Last 3 commits addressed earlier issues:

1. **04c7068**: Category mappings (UI, HOOKS → APPLICATION), timeout 60s → 600s
2. **263910a**: Forensic audit fixes (method counting in validator)
3. **96b1699**: Integrity validation (manifest vs generated files)

These fixes WORKED for their respective issues. The current problems are NEW discoveries.

---

## Constraints & Requirements

### Must Preserve:
- ✅ Clean Architecture approach
- ✅ TypeScript strict mode
- ✅ Zod schema validation
- ✅ Retry logic with validation (but needs improvement)
- ✅ Semantic caching (but version bump when prompts change)

### Must Fix:
- ❌ JSDoc/TypeDoc generation
- ❌ User Stories generation
- ❌ Deterministic retry behavior
- ❌ "FAILED TO GENERATE CLEAN CODE" errors

### Must Not Break:
- ✅ Existing working steps (Analysis, Product, Architecture)
- ✅ Server API (/analyze endpoint)
- ✅ UI integration
- ✅ Manifest validation (recently fixed)

---

## Example of Expected Quality

### Current Output (BAD):
```typescript
export class BinarySearchTree {
  constructor() {}
  insert(value: number) {}
  remove(value: number) {}
}
```

### Expected Output (GOOD):
```typescript
/**
 * Binary Search Tree implementation with self-balancing capabilities.
 *
 * Maintains O(log n) search, insert, and delete operations through
 * automatic tree rebalancing when height difference exceeds threshold.
 *
 * @class BinarySearchTree
 * @template T The type of values stored in the tree (must be comparable)
 */
export class BinarySearchTree<T> {
  /**
   * Inserts a new value into the tree while maintaining BST properties.
   *
   * @param {T} value - The value to insert
   * @returns {boolean} True if inserted, false if duplicate
   * @throws {Error} If value is null or undefined
   * @complexity O(log n) average, O(n) worst case
   */
  public insert(value: T): boolean {
    if (value === null || value === undefined) {
      throw new Error("Cannot insert null or undefined value");
    }
    // ... implementation
  }

  /**
   * Removes a value from the tree and rebalances if necessary.
   *
   * @param {T} value - The value to remove
   * @returns {boolean} True if found and removed, false otherwise
   * @complexity O(log n) average, O(n) worst case
   */
  public remove(value: T): boolean {
    // ... implementation
  }
}
```

---

## User Stories Example (Expected)

For a medical clinic scheduling epic, we expect:

```json
{
  "epicId": "EPIC-001",
  "epicTitle": "Patient Management",
  "userStories": [
    {
      "id": "US-001",
      "title": "Register new patient with basic information",
      "description": "As a receptionist, I want to register a new patient with their basic information, so they can schedule appointments.",
      "acceptanceCriteria": [
        {
          "id": "AC-001-01",
          "scenario": "Valid patient registration",
          "given": "I am on the patient registration screen",
          "when": "I enter valid CPF (123.456.789-00), name (Maria Silva), email (maria@email.com), and phone (11999998888)",
          "then": "The system validates the data, creates the patient record, and displays confirmation message"
        },
        {
          "id": "AC-001-02",
          "scenario": "Duplicate CPF",
          "given": "A patient with CPF 123.456.789-00 already exists",
          "when": "I try to register another patient with the same CPF",
          "then": "The system displays error 'CPF already registered' with link to existing record"
        },
        {
          "id": "AC-001-03",
          "scenario": "Invalid CPF format",
          "given": "I am on the patient registration screen",
          "when": "I enter an invalid CPF (111.111.111-11)",
          "then": "The system displays inline error 'Invalid CPF' and prevents submission"
        }
      ],
      "technicalNotes": [
        "Endpoint: POST /api/v1/patients",
        "Validate CPF using mod-11 algorithm",
        "Store CPF without formatting (numbers only)",
        "Use transaction for data consistency"
      ],
      "dependencies": [
        "Database schema for patients table",
        "CPF validation utility"
      ],
      "estimatedPoints": 5,
      "priority": "P0"
    }
    // ... 4-5 more stories for this epic
  ],
  "summary": {
    "totalStories": 5,
    "totalPoints": 21,
    "p0Count": 2,
    "p1Count": 2,
    "p2Count": 1
  }
}
```

**Currently getting**: Empty array `[]`

---

## Questions to Address

1. **Prompt Engineering**:
   - Are the prompts using the right tone/structure?
   - Should we use few-shot examples differently?
   - Is the negative rules approach effective?

2. **Retry Strategy**:
   - Is 3 attempts enough?
   - Should temperature increase be linear or exponential?
   - Should we use different strategies for different error types?

3. **Validation**:
   - Is the completeness validator too strict?
   - Should we validate documentation before syntax?
   - How to handle edge cases (interfaces don't need implementations)?

4. **User Stories**:
   - Why would epic expansion return 0 stories?
   - Is the LLM timing out?
   - Is the schema rejecting valid responses?

5. **Architecture**:
   - Should we separate documentation generation from code generation?
   - Should we use a different model for different steps?
   - Should we implement streaming for long responses?

---

## Success Criteria

After implementing fixes, the system should:

✅ Generate code with **100% JSDoc coverage** for public APIs
✅ Generate **15-60 User Stories** for medium complexity projects
✅ **Zero "FAILED TO GENERATE CLEAN CODE" errors**
✅ **Pass all validation** on first or second attempt (max 3 attempts)
✅ **Maintain < 5 minute** total generation time
✅ **Cache hit rate > 60%** for repeated prompts

---

## Your Response Format

Please structure your response as:

```markdown
# AI Consultant Analysis Report

## 1. Executive Summary
[200 words]

## 2. Root Cause Validation
### RC1: JSDoc Not Enforced
- Status: CONFIRMED / REJECTED / PARTIAL
- Evidence: [cite code lines]
- Additional Notes: [your insights]

[Repeat for RC2-RC5]

### Additional Root Causes
[Any you discovered]

## 3. Solution Review
### Fix #1: JSDoc Enforcement
- Assessment: [your evaluation]
- Suggested Improvements: [details]
- Side Effects: [potential issues]

[Repeat for Fix #2-#4]

### Alternative Solutions
[Any alternatives you propose]

## 4. Additional Recommendations
[Your systemic improvements]

## 5. Risk Assessment
[Risks and mitigation]

## 6. Implementation Checklist
- [ ] Pre-implementation item 1
- [ ] Pre-implementation item 2
...
```

---

## Additional Resources

### Project Documentation:
- README.md in repository root
- Architecture decisions in `docs/` folder (if present)
- Recent commit messages (git log)

### Testing:
- Test with "Prompt 7" (data structures request that caused the reported failure)
- Validate with medical clinic scheduling system
- Check edge cases: minimal projects, complex enterprise systems

### Monitoring:
- Watch LLM API costs (gpt-4o-mini is cheap but retries add up)
- Track generation times per step
- Monitor cache hit rates

---

## Final Notes

The user (moses) is **extremely frustrated** with the current quality. This is a high-stakes consultation. Your analysis will directly inform implementation decisions.

**Confidence Level Expected**: Provide confidence scores (0-100%) for each conclusion.

**Pragmatism Over Perfection**: Solutions should be implementable in 2-4 hours, not 2-4 weeks.

**Evidence-Based**: Every recommendation should cite specific code lines or prompt sections.

---

**BEGIN YOUR ANALYSIS NOW.**

Focus on practical, actionable insights that will get this system producing professional-grade output.
