# Domain-Specific Prompts (OPTIONAL)

This directory contains **optional** domain-specific prompt examples that can be used to enhance LLM code generation for specific project types.

## Status: OPTIONAL / NOT INTEGRATED

These prompts are **NOT automatically applied** to the code generation pipeline. They exist as reference material for potential future use or for users who want to explicitly opt-in to domain-specific generation.

## Contents

- `animation.ts` - Examples for animation/motion projects
- `visualization.ts` - Examples for data visualization projects
- `data-structures.ts` - Examples for data structure implementations

## Usage

These prompts are **NOT imported or used** by the main code generation flow. To use them, a developer would need to explicitly:

1. Import the `selectDomainExamples` function
2. Call it with the project analysis
3. Inject the result into the code generation prompt

## Why Not Integrated?

To maintain generality, the core prompts (`architecture.ts`, `code-gen.ts`) do not reference these domain-specific examples. This ensures the system works equally well for:

- Web applications
- APIs and backends
- CLI tools
- Libraries
- Dashboards
- Any other project type

## Future Considerations

If domain-specific prompts are needed, consider:

1. Making them user-configurable
2. Detecting domain from user intent, not keywords
3. Allowing explicit opt-in via project settings
