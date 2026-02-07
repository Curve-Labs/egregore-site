Ask questions — AI-generated, context-aware, routed to self or others.

Arguments: $ARGUMENTS (Optional: [@person] about [topic], or empty to answer pending)

## Usage

- `/ask` — Answer pending questions (if any), or start reflection
- `/ask me about [topic]` — Self-reflection with AI-generated questions
- `/ask @person about [topic]` — Queue questions for another person
- `/ask about [topic]` — Exploratory questions about a topic/project

## How It Works

The AI analyzes context to dynamically generate AskUserQuestion-formatted questions. No hardcoded templates — questions are generated based on:

1. **The topic** — What are we asking about?
2. **The target** — Self, specific person, or broad exploration?
3. **Available context** — Neo4j data via `bin/graph.sh` about sessions, quests, artifacts
4. **Question scope** — Narrow (decision-focused) vs wide (exploratory)

## Step 1: Parse Arguments

Parse `$ARGUMENTS` to extract:
- **target**: `@person` name, `me`, or none (broad)
- **topic**: Everything after "about" (if present)

Examples:
- `/ask` → target: none, topic: none (answer pending or start fresh)
- `/ask me about priorities` → target: self, topic: "priorities"
- `/ask @oz about evaluation criteria` → target: "oz", topic: "evaluation criteria"
- `/ask about tristero` → target: none, topic: "tristero"
- `/ask about where egregore is heading` → target: none, topic: "where egregore is heading"

## Step 2: Get Current User

```bash
git config user.name
```

Map to short name: "Oguzhan Yayla" → oz, "Cem Dagdelen" → cem, "Ali" → ali

## Step 3: Check for Pending Questions (if no args)

If `/ask` called with no arguments, first check for pending questions via `bash bin/graph.sh query "..."`:

```cypher
MATCH (qs:QuestionSet {status: 'pending'})-[:ASKED_TO]->(p:Person {name: $me})
MATCH (qs)-[:ASKED_BY]->(asker:Person)
RETURN qs.id AS setId, qs.topic AS topic, qs.created AS created, asker.name AS from
ORDER BY qs.created DESC
```

**If pending questions exist:**
```
You have 2 pending question sets:

1. From cem about "evaluation criteria" (12 hours ago)
2. From ali about "MCP transport" (2 days ago)

Which would you like to answer first?
```

Use AskUserQuestion to let them select which set, then load and present those questions (see Step 7).

**If no pending questions:** Proceed with self-reflection about general priorities (or ask what they want to explore).

## Step 4: Gather Context from Neo4j

Run queries in parallel via `bash bin/graph.sh query "..."` based on target:

**For self (`me`) or no target:**
```cypher
// My recent sessions
MATCH (s:Session)-[:BY]->(p:Person {name: $me})
RETURN s.topic AS topic, s.summary AS summary, s.date AS date
ORDER BY s.date DESC LIMIT 5

// My active quests
MATCH (q:Quest {status: 'active'})-[:STARTED_BY|:CONTRIBUTED_BY*]->(p:Person {name: $me})
RETURN q.id AS quest, q.title AS title

// Recent artifacts I contributed
MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p:Person {name: $me})
RETURN a.title AS title, a.type AS type
ORDER BY a.created DESC LIMIT 5
```

**For person target (`@person`):**
```cypher
// Their recent sessions
MATCH (s:Session)-[:BY]->(p:Person {name: $target})
RETURN s.topic AS topic, s.summary AS summary, s.date AS date
ORDER BY s.date DESC LIMIT 5

// Their contributions
MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p:Person {name: $target})
RETURN a.title AS title, a.type AS type
ORDER BY a.created DESC LIMIT 5

// Quests they work on
MATCH (q:Quest {status: 'active'})-[:STARTED_BY|:CONTRIBUTED_BY*]->(p:Person {name: $target})
RETURN q.id AS quest, q.title AS title
```

**For broad topic (no target):**
```cypher
// Project context if topic matches a project
MATCH (proj:Project {name: $topic})
OPTIONAL MATCH (q:Quest)-[:RELATES_TO]->(proj)
RETURN proj.name AS project, collect(q.id) AS quests

// Recent org-wide activity
MATCH (s:Session)-[:BY]->(p:Person)
WHERE s.date >= date() - duration('P7D')
RETURN s.topic AS topic, p.name AS by, s.date AS date
ORDER BY s.date DESC LIMIT 5

// Active quests across org
MATCH (q:Quest {status: 'active'})
RETURN q.id AS quest, q.title AS title, q.question AS question
```

## Step 5: Generate Questions with AskUserQuestion

Based on context, generate 1-4 questions using AskUserQuestion tool.

### Determining Question Scope

**Narrow scope** (1-2 questions, single-select):
- Topic is a specific decision point
- Context shows a clear blocker or choice needed
- Example: "about which transport to use"

**Wide scope** (3-4 questions, some multi-select):
- Topic is exploratory or strategic
- No clear decision point
- Example: "about where egregore is heading"

### Question Generation Guidelines

**Headers** (max 12 chars):
- "Focus" — What to prioritize
- "Tradeoff" — Weighing options
- "Blocker" — What's in the way
- "Priority" — Ordering importance
- "Scope" — Breadth of exploration
- "Gap" — What's missing
- "Direction" — Strategic choices
- "Approach" — How to tackle something

**Options**:
- 2-4 options per question
- Draw from actual context (quest names, project names, recent work)
- "Other" is automatically provided — don't include it

**multiSelect**:
- `true` for brainstorming, scoping, or non-exclusive options
- `false` for decisions, priorities, single-choice

### Example: Self-Reflection Questions

For `/ask me about priorities`:

```
Analyzing your context...
- Active quests: benchmark-eval (3 artifacts), research-agent (1 artifact)
- Recent sessions: MCP transport decision, Neo4j setup
- Open threads: evaluation framework design
```

Then use AskUserQuestion:

Question 1:
- question: "Which quest needs your attention most urgently?"
- header: "Focus"
- options:
  - label: "benchmark-eval"
    description: "3 artifacts, evaluation framework in progress"
  - label: "research-agent"
    description: "1 artifact, early exploration stage"
  - label: "Something new"
    description: "A direction not yet tracked"
- multiSelect: false

Question 2:
- question: "What's your biggest blocker right now?"
- header: "Blocker"
- options:
  - label: "Technical uncertainty"
    description: "Need to figure out how to implement something"
  - label: "Waiting on others"
    description: "Blocked by someone else's input"
  - label: "Too many threads"
    description: "Need to focus, context-switching too much"
- multiSelect: false

### Example: Person-Targeted Questions

For `/ask @oz about evaluation criteria`:

```
Analyzing Oz's context...
- Recent work: benchmark-eval quest, HELM framework review
- Contributions: temporal evaluation thought, HELM findings
- Projects: tristero
```

Generate questions that probe Oz's thinking on evaluation:

Question 1:
- question: "What criteria matter most for evaluating dynamic ontologies?"
- header: "Focus"
- options:
  - label: "Accuracy"
    description: "How correct are the classifications?"
  - label: "Coherence"
    description: "How well does the structure hold together?"
  - label: "Usefulness"
    description: "Does it help users find what they need?"
  - label: "Efficiency"
    description: "Computational and storage costs"
- multiSelect: true

Question 2:
- question: "How should we weight temporal vs structural metrics?"
- header: "Tradeoff"
- options:
  - label: "Temporal primary"
    description: "How ontology changes over time is most important"
  - label: "Structural primary"
    description: "Current snapshot quality matters most"
  - label: "Equal weight"
    description: "Both dimensions equally important"
  - label: "Context-dependent"
    description: "Depends on use case"
- multiSelect: false

### Example: Wide Exploration Questions

For `/ask about where egregore is heading`:

```
Analyzing organizational context...
- Active projects: Tristero, LACE, egregore
- Recent decisions: MCP transport, Neo4j adoption
- Active quests: benchmark-eval, research-agent, nlnet-commons
```

Generate exploratory questions:

Question 1:
- question: "What aspects of Egregore's direction interest you?"
- header: "Scope"
- options:
  - label: "Technical architecture"
    description: "How the systems fit together"
  - label: "Product strategy"
    description: "What we're building and for whom"
  - label: "Team coordination"
    description: "How we work together"
  - label: "External positioning"
    description: "Grants, partnerships, public presence"
- multiSelect: true

Question 2:
- question: "What feels unclear or unresolved?"
- header: "Gap"
- options:
  - label: "Long-term direction"
    description: "Where are we heading in 6-12 months?"
  - label: "Project connections"
    description: "How Tristero, LACE, and egregore relate"
  - label: "Decision authority"
    description: "Who decides what?"
  - label: "Resource allocation"
    description: "Where to invest time and energy"
- multiSelect: true

## Step 6: Store Person-Targeted Questions in Neo4j

If targeting another person (`@person`), store the questions for async delivery:

```cypher
MATCH (asker:Person {name: $me})
MATCH (target:Person {name: $targetPerson})
CREATE (qs:QuestionSet {
  id: $setId,
  topic: $topic,
  contextSummary: $contextSummary,
  created: datetime(),
  status: 'pending'
})
CREATE (qs)-[:ASKED_BY]->(asker)
CREATE (qs)-[:ASKED_TO]->(target)
WITH qs
UNWIND $questions AS q
CREATE (question:Question {
  id: q.id,
  text: q.text,
  header: q.header,
  options: q.optionsJson,
  multiSelect: q.multiSelect,
  answer: null
})
CREATE (question)-[:PART_OF]->(qs)
RETURN qs.id
```

Where:
- `$setId` = `YYYY-MM-DD-asker-to-target-topic-slug`
- `$questions` = array of question objects with id, text, header, options, multiSelect

Then notify via Telegram:

```bash
bash bin/notify.sh send "oz" "Hey Oz, cem has questions about \"evaluation criteria\"\n\n3 questions waiting for you. Run /ask in Claude to answer."
```

**Message format:**
```
Hey Oz, cem has questions about "evaluation criteria"

3 questions waiting for you. Run /ask in Claude to answer.
```

**Output:**
```
Questions queued for Oz:
1. "What criteria matter most for evaluating dynamic ontologies?" [Focus]
2. "How should we weight temporal vs structural metrics?" [Tradeoff]

Oz will be notified and can answer in their next Claude session.
You'll be notified when they respond.
```

## Step 7: Present Pending Questions

When a user runs `/ask` and has pending questions:

1. Load the QuestionSet from Neo4j
2. Convert stored questions to AskUserQuestion format
3. Present via AskUserQuestion UI
4. Store answers back to Neo4j

```cypher
// Load questions for a set
MATCH (q:Question)-[:PART_OF]->(qs:QuestionSet {id: $setId})
RETURN q.id AS id, q.text AS text, q.header AS header, q.options AS options, q.multiSelect AS multiSelect
ORDER BY q.id
```

After user answers via AskUserQuestion:

```cypher
// Store answers
MATCH (q:Question {id: $questionId})
SET q.answer = $answer, q.answeredAt = datetime()

// Check if all questions answered
MATCH (qs:QuestionSet {id: $setId})
OPTIONAL MATCH (q:Question)-[:PART_OF]->(qs) WHERE q.answer IS NULL
WITH qs, count(q) AS unanswered
SET qs.status = CASE WHEN unanswered = 0 THEN 'answered' ELSE 'partial' END
RETURN qs.status
```

Then notify the asker:

```bash
bash bin/notify.sh send "cem" "Hey Cem, oz answered your questions about \"evaluation criteria\"\n\nRun /activity to see their answers."
```

**Message format:**
```
Hey Cem, oz answered your questions about "evaluation criteria"

Run /activity to see their answers.
```

## Step 8: Self-Reflection Capture

For self-targeted questions, answers can optionally be saved as artifacts:

After answering self-reflection questions:
```
Your responses captured.

Would you like to save this as an artifact?
```

If yes, create artifact via `/add` flow (thought type, linked to relevant quests).

## Error Handling

**Person not found:**
```
I don't have @{name} in the knowledge graph.

Known people: oz, ali, cem

Check the name, or add them first with a handoff or session.
```

**Neo4j unavailable:**
```
Knowledge graph unavailable. Generating questions without context...

[Generate generic questions about the topic]
```

**No context available for person:**
```
I don't have much context about @{name}'s work on "{topic}".

Generating exploratory questions instead...
```

## Output Examples

### Self-reflection
```
> /ask me about my priorities

Analyzing your context...
- Active quests: benchmark-eval, research-agent
- Recent sessions: Neo4j adoption, MCP transport
- Open: 1 handoff pending

[AskUserQuestion appears with context-aware questions]
```

### Person-targeted
```
> /ask @oz about the benchmark evaluation approach

Analyzing Oz's context...
- Recent work: benchmark-eval quest, HELM review
- Contributions: temporal evaluation thought

Generating questions for Oz...

Questions queued:
1. "What criteria matter most for evaluating dynamic ontologies?" [Focus]
2. "How should we weight temporal vs structural metrics?" [Tradeoff]

Oz will be notified. Answers will appear in /activity.
```

### Answering pending
```
> /ask

You have 2 pending question sets:

1. From cem about "evaluation criteria" (12 hours ago)
2. From ali about "MCP transport" (2 days ago)

[AskUserQuestion: Which would you like to answer first?]

> evaluation criteria

[AskUserQuestion: Questions from cem appear]
```

### Wide exploration
```
> /ask about egregore

Analyzing organizational context...
- 3 active projects, 4 active quests
- Recent decisions: MCP transport, Neo4j

[AskUserQuestion with exploratory questions, multiSelect enabled]
```

## Rules

- **Generate questions dynamically** — Never use hardcoded templates
- **Reference actual context** — Questions should mention real quests, projects, recent work
- **Appropriate scope** — Narrow for decisions, wide for exploration
- **Always use AskUserQuestion** — Both for self and when surfacing pending questions
- **Notify on async** — Telegram for person-targeted questions and answers
- **Link to knowledge graph** — All questions/answers stored in Neo4j via `bin/graph.sh`
- **Never use MCP** — Always use `bash bin/graph.sh query "..."` for Neo4j
