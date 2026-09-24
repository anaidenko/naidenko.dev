---
name: commit
description: Create a git commit for the staged changes in Conventional Commits format. Use when asked to commit the current work.
allowed-tools: Bash(git diff --staged), Bash(git log *), Bash(git status), Bash(git commit *)
---

# Commit

1. **Read what is staged.** Run `git diff --staged` and read every hunk. If a staged file
   carries changes you did not make, leave it out or name those changes in the message.
2. **Match the style.** Run `git log --oneline -10`.
3. **Write the subject** as `type(scope): summary`:
    - types: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `build`, `ci`, `chore`;
    - the scope is optional: `form`, `worker`, `seo`, `analytics` and so on;
    - imperative mood, lowercase after the colon, at most 72 characters.
4. **Add a body only when the why is not obvious** from the subject: what changed and why,
   wrapped at 100 characters.
5. **Ask about unstaged changes.** List them and ask which to include. Never stage them
   silently.
6. **Commit.** Do not push.

If nothing is staged, say so and stop.
