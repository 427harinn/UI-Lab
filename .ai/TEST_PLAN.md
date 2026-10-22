# TEST_PLAN

## Experiment: Root Codex spawning subagents

### Goal

Determine whether the current Codex App session can autonomously create independent subagents from one user request.

### PASS criteria

The experiment passes only if all of the following are true:

- [ ] The original Codex conversation acts as the Root / Lead Agent.
- [ ] It creates an actual Repository Analyst subagent.
- [ ] It creates an actual Test Analyst subagent.
- [ ] It creates an actual Architecture Analyst subagent.
- [ ] The user does not create additional chats manually.
- [ ] The Root Agent waits for the three subagents.
- [ ] The Root Agent receives their results.
- [ ] The Root Agent integrates those results into one final response.
- [ ] No application code or repository files are changed during the test.

### FAIL criteria

The experiment fails if any of the following happens:

- Codex says subagent capability is unavailable.
- Codex asks the user to create separate chats or threads.
- Codex merely pretends to be multiple roles inside the same response.
- Codex performs all three analyses itself without spawning independent agents.
- The Root Agent cannot wait for or collect subagent results.

### Important

A FAIL is useful information. Do not work around it.

The purpose is to learn what the current Codex App session can actually do, not to force a multi-agent-looking answer.
