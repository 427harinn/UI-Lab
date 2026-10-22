# AGENT_WORKFLOW

## Purpose

Verify whether one Codex conversation can act as a root/lead agent and autonomously create other independent Codex subagents.

The user should give instructions only to the root agent. The user must not be required to manually create or coordinate other chats.

## Required workflow

When explicitly asked to run the subagent capability test:

### 1. Root agent

The Codex conversation that receives the user's prompt is the Root / Lead Agent.

It must remain responsible for:

- deciding the work split;
- creating subagents if the environment supports it;
- waiting for their results;
- integrating the results;
- reporting whether real subagent creation succeeded.

### 2. Spawn three independent subagents

Create these independent subagents using actual multi-agent/subagent tooling.

#### Repository Analyst

Task:

- inspect the repository at a high level;
- identify the main application stack;
- report three notable repository characteristics;
- do not modify files.

#### Test Analyst

Task:

- inspect package scripts and testing-related files;
- identify the available automated test categories;
- report which commands appear to be the main quality gates;
- do not modify files.

#### Architecture Analyst

Task:

- inspect README and architecture/project documentation;
- summarize the current purpose of UI Lab;
- identify one architectural risk or maintenance concern;
- do not modify files.

These agents should work independently where possible.

### 3. Wait and integrate

The Root Agent must wait for all three agents.

Then produce one short combined report containing:

- whether actual subagent spawning succeeded;
- which subagents were spawned;
- a concise summary of each result;
- whether the agents appeared to have independent task contexts;
- any limitation encountered.

## Failure behavior

If the current Codex environment does not expose actual subagent / multi-agent capability:

- do not role-play or simulate the three agents;
- do not manually perform their assigned tasks as a substitute;
- do not ask the user to create extra chats;
- stop and report: "Subagent spawning is not available in this Codex session."

The failure result is still a successful experiment because it tells us the capability is unavailable in this environment.

## Prohibited actions

For this capability test:

- no code changes;
- no commits;
- no branches;
- no pull requests;
- no issue creation;
- no destructive repository operations.
