# Novus Test Automation — Opt-In

**Extension**: Novus Test Automation

## Opt-In Prompt

The following question is automatically included in the Requirements Analysis clarifying questions when this extension is loaded:

```markdown
## Question: Novus Test Automation Extension
Should AIRE generate Novus automated tests from approved manual test plans when you run `/novus-automate`?

A) Yes — enable `/novus-automate` for this project (each person who runs it needs a Novus clone in NOVUS_HOME, Java 17–21, Maven and a browser MCP connected to Claude Code)

B) No — do not enable it (nothing changes for this project; it can be enabled later)

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```

Unlike other extensions, an answer of **Yes** does not load the rules file at Requirements Analysis.
`novus-automation.md` is loaded only by the `/novus-automate` skill, after its own enablement check
(`common/extensions-loading.md` Sections 2 and 5). Every other stage reports its rules as N/A.
