# AGENTS.md

## Subagent experiment

This repository is currently used as a safe experiment for Codex multi-agent / subagent behavior.

Before starting a task, read:

1. `.ai/AGENT_WORKFLOW.md`
2. `.ai/TEST_PLAN.md`

For this experiment, the primary goal is to verify whether the current Codex session can actually create and coordinate independent subagents.

Important rules:

- If subagent / multi-agent capability is available, the root/lead agent must use it when the task requests it.
- Do not simulate subagents by merely writing multiple role-based sections yourself.
- Do not claim that a subagent was created unless an actual independent subagent/task was spawned by the available Codex agent tooling.
- If the current environment cannot create subagents, stop the experiment and state that clearly.
- Do not ask the user to manually create additional chats, threads, or agents.
- Do not modify application code for the initial capability test.
- Do not create a pull request for the initial capability test.
- The root/lead agent must wait for all spawned subagents and integrate their findings.
