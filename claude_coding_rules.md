# Claude 4 Performance Rules for TRAE

## Core Response Behavior
1. Always respond in English for consistency
2. Provide complete, working code implementations - never partial snippets
3. Focus on practical solutions over theoretical explanations
4. When generated code exceeds 20 lines, evaluate if it can be broken into smaller functions
5. Add concise English comments only for complex business logic, not obvious operations

## Code Quality Standards

### Naming & Structure
- Use descriptive, self-explanatory variable and function names
- Follow language-specific naming conventions (camelCase for JS/TS, snake_case for Python)
- Avoid abbreviations and single-letter variables except for conventional loop counters
- Return early instead of deep nesting - maximum 3 levels of indentation

### Performance & Efficiency  
- Avoid unnecessary object copying or cloning
- Use appropriate data structures for the task (Map vs Object, Set vs Array)
- Minimize computational complexity - prefer O(n) over O(n²) when possible
- Implement lazy loading and memoization where beneficial

### Error Handling & Security
- Always include proper error handling with specific error messages
- Validate and sanitize all inputs, especially user data
- Use environment variables for sensitive configuration
- Implement proper authentication/authorization patterns when relevant

## Technology-Specific Guidelines

### Frontend (React/Vue/Angular)
- Use functional components with hooks over class components
- Implement proper state management (useState, useReducer, Zustand, etc.)
- Consider accessibility (aria-labels, semantic HTML, keyboard navigation)
- Optimize rendering with React.memo, useMemo, useCallback when needed

### Backend (Node.js/Python/FastAPI)
- Design RESTful APIs with proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Use async/await patterns consistently
- Implement middleware for cross-cutting concerns (logging, auth, CORS)
- Structure projects with clear separation: routes, controllers, services, models

### Database Operations
- Write optimized queries considering indexes
- Use parameterized queries to prevent SQL injection
- Implement connection pooling for production applications
- Consider database-specific optimizations (PostgreSQL vs MongoDB vs Redis)

## Code Generation Preferences

### File Structure
- When creating new files, specify the complete relative path from project root
- Use appropriate file extensions (.ts for TypeScript, .jsx for React, .py for Python)
- Follow project conventions for folder organization

### Dependencies & Imports
- Prefer built-in language features over external libraries when practical
- Use specific imports instead of wildcard imports
- List all required dependencies at the top of code blocks
- Suggest package manager commands (npm, pnpm, pip, etc.) when adding new dependencies

## Response Format Requirements

### Code Blocks
```language:relative/path/to/file
// Complete, working implementation
// Include all necessary imports
// Add meaningful comments for business logic only
```

### Explanations
- Lead with the working solution first
- Explain implementation choices briefly after the code
- Mention trade-offs only when there are significant alternatives
- Suggest testing approaches for complex logic

## Anti-Patterns to Avoid

### Code Smells
- **Long Functions**: Break functions over 20 lines into smaller, single-purpose functions
- **Duplicate Code**: Extract repeated logic into reusable functions or classes
- **Magic Numbers**: Use named constants for any non-obvious numeric values
- **Primitive Obsession**: Use objects/classes instead of primitive types for domain concepts
- **Feature Envy**: Move methods to the class they primarily operate on

### Common Mistakes
- Don't generate placeholder comments like "// TODO: implement this"
- Don't create empty catch blocks - always handle or log errors
- Don't use var in JavaScript - prefer const and let
- Don't ignore TypeScript warnings - fix type issues properly

## Testing & Debugging Guidelines
- Write testable code with clear input/output boundaries
- Include example test cases for complex business logic
- Use descriptive test names that explain the scenario being tested
- Implement logging at appropriate levels (debug, info, warn, error)

## Project Integration
- Always reference files using complete relative paths from project root
- When modifying existing code, maintain the current code style if it's consistent
- When refactoring, explicitly mention you're following new standards
- Consider backward compatibility when making breaking changes

## Communication Style
- Be direct and technical - avoid unnecessary pleasantries
- Provide actionable solutions immediately
- Anticipate follow-up questions and address them proactively
- When multiple approaches exist, briefly mention why you chose the recommended one

## Refactoring Approach
When working with existing non-standard code:
1. Explicitly state when you're refactoring to meet these standards
2. Make small, incremental improvements
3. Ensure all tests pass after each refactoring step
4. Document any breaking changes or migration requirements

---
*Goal: Generate production-ready, maintainable code that follows modern best practices and can be easily understood by team members.*