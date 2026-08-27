# Claude CLI Multi-Profile OAuth Setup on macOS

This guide documents a working setup for running **multiple Claude CLI sessions with different OAuth logins** on the same Mac, while still being able to:

- open separate terminal profiles
- go to any project folder
- run `claude` manually
- keep normal shell tools like `brew` working
- keep the Claude login state isolated per profile

## Goal

Create two terminal profiles:

- `claude`
- `claude-m`

Each profile should:

- use a different Claude login state
- preserve the normal shell setup
- preserve access to `brew`, `node`, and other existing tools
- allow `cd /path/to/project && claude`

---

## Why the earlier version broke

The first working isolation method changed `HOME` to a custom folder such as:

- `/Users/mehdizare/.claude-home`
- `/Users/mehdizare/.claude-home-m`

That successfully isolated Claude's local state, but it also changed where `zsh` looked for startup files.

So instead of loading:

- `/Users/mehdizare/.zshrc`

it looked for:

- `/Users/mehdizare/.claude-home/.zshrc`

That caused normal shell PATH configuration to disappear, which is why commands like `brew` stopped working.

---

## Final working solution

Use:

- `HOME` = isolated Claude profile directory
- `ZDOTDIR` = real home directory

This keeps Claude state separate while still loading the real shell config from the normal `.zshrc`.

---

## Known paths from the working machine

User:
```bash
mehdizare
```

Real Claude binary:
```bash
/Users/mehdizare/.local/bin/claude
```

Homebrew path on Apple Silicon Mac:
```bash
/opt/homebrew/bin
```

---

## Step 1: Create profile directories and bin directory

```bash
mkdir -p /Users/mehdizare/.claude-home
mkdir -p /Users/mehdizare/.claude-home-m
mkdir -p /Users/mehdizare/bin
```

---

## Step 2: Create launcher script for `claude`

```bash
cat > /Users/mehdizare/bin/claude-launch <<'EOF'
#!/bin/zsh
export REAL_HOME="/Users/mehdizare"
export HOME="/Users/mehdizare/.claude-home"
export PATH="/opt/homebrew/bin:/Users/mehdizare/.local/bin:$PATH"
export ZDOTDIR="$REAL_HOME"
exec /bin/zsh -i
EOF
```

---

## Step 3: Create launcher script for `claude-m`

```bash
cat > /Users/mehdizare/bin/claude-m <<'EOF'
#!/bin/zsh
export REAL_HOME="/Users/mehdizare"
export HOME="/Users/mehdizare/.claude-home-m"
export PATH="/opt/homebrew/bin:/Users/mehdizare/.local/bin:$PATH"
export ZDOTDIR="$REAL_HOME"
exec /bin/zsh -i
EOF
```

---

## Step 4: Make both scripts executable

```bash
chmod +x /Users/mehdizare/bin/claude-launch
chmod +x /Users/mehdizare/bin/claude-m
```

---

## Step 5: Configure iTerm2 profiles

Create two iTerm2 profiles.

### Profile 1
Name:
```text
claude
```

Command:
```bash
/Users/mehdizare/bin/claude-launch
```

### Profile 2
Name:
```text
claude-m
```

Command:
```bash
/Users/mehdizare/bin/claude-m
```

In iTerm2:

1. Open **Settings**
2. Go to **Profiles**
3. Duplicate the default profile twice
4. Rename one to `claude`
5. Rename the other to `claude-m`
6. In each profile, go to **General**
7. Under **Command**, choose **Command**
8. Paste the matching launcher path

---

## Step 6: Verify the environment

Open each iTerm2 profile and run:

```bash
echo $HOME
echo $ZDOTDIR
echo $PATH
which brew
which claude
```

Expected behavior:

### In `claude`
```bash
HOME=/Users/mehdizare/.claude-home
ZDOTDIR=/Users/mehdizare
```

### In `claude-m`
```bash
HOME=/Users/mehdizare/.claude-home-m
ZDOTDIR=/Users/mehdizare
```

`which brew` should resolve to something like:
```bash
/opt/homebrew/bin/brew
```

`which claude` should resolve to:
```bash
/Users/mehdizare/.local/bin/claude
```

---

## Step 7: Use it in a project

Inside either profile:

```bash
cd /Users/mehdizare/repos/your-project
claude
```

Example:

```bash
cd /Users/mehdizare/repos/roboad-mono-repo
claude
```

You can also run normal shell tools there, for example:

```bash
brew install node
```

---

## Why this version works

This setup separates responsibilities cleanly:

- `HOME` points to a unique profile directory, so Claude state is isolated
- `ZDOTDIR` points to the real home directory, so zsh still loads the real `.zshrc`
- `PATH` explicitly includes:
  - Homebrew
  - the real Claude install location

So you get isolated Claude accounts **without** breaking the rest of the shell.

---

## Important note on concurrent sessions

This setup is safe for running both profiles at the same time.

Avoid solutions that rely on switching a shared `~/.claude` symlink back and forth, because that can break when both profiles are open simultaneously.

---

## If Claude path is different on another machine

Find it with:

```bash
which claude
```

Then replace `/Users/mehdizare/.local/bin/claude` in the scripts if needed.

---

## If Homebrew path is different

Check with:

```bash
which brew
```

On Apple Silicon it is usually:

```bash
/opt/homebrew/bin/brew
```

On Intel Macs it is often:

```bash
/usr/local/bin/brew
```

Update the `PATH` line in the scripts accordingly.

---

## Full copy-paste block

```bash
mkdir -p /Users/mehdizare/.claude-home
mkdir -p /Users/mehdizare/.claude-home-m
mkdir -p /Users/mehdizare/bin

cat > /Users/mehdizare/bin/claude-launch <<'EOF'
#!/bin/zsh
export REAL_HOME="/Users/mehdizare"
export HOME="/Users/mehdizare/.claude-home"
export PATH="/opt/homebrew/bin:/Users/mehdizare/.local/bin:$PATH"
export ZDOTDIR="$REAL_HOME"
exec /bin/zsh -i
EOF

cat > /Users/mehdizare/bin/claude-m <<'EOF'
#!/bin/zsh
export REAL_HOME="/Users/mehdizare"
export HOME="/Users/mehdizare/.claude-home-m"
export PATH="/opt/homebrew/bin:/Users/mehdizare/.local/bin:$PATH"
export ZDOTDIR="$REAL_HOME"
exec /bin/zsh -i
EOF

chmod +x /Users/mehdizare/bin/claude-launch
chmod +x /Users/mehdizare/bin/claude-m
```

---

## Quick troubleshooting

### `brew` not found
Cause:
- shell config not loading
- `PATH` missing Homebrew

Fix:
- make sure `ZDOTDIR` points to the real home
- make sure `PATH` includes the correct Homebrew directory

### `claude` not found
Cause:
- Claude install path not in `PATH`

Fix:
- add the actual Claude path to `PATH`
- confirm with `which claude`

### Wrong account/session reused
Cause:
- both profiles using the same `HOME`

Fix:
- confirm each profile has a different `HOME`

### Need to work inside project folders
This setup intentionally opens a normal shell first, so you can:

```bash
cd /path/to/project
claude
```

instead of launching Claude immediately on profile open.

---

## Suggested future improvement

If repeating this setup on another machine, parameterize the scripts like this:

- detect `brew` path dynamically
- detect `claude` path dynamically
- generate the launcher files from a small shell script

That would make it reusable across Macs with fewer manual edits.
