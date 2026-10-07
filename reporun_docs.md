Docs

How to use RepoRun as a team member.
First steps — get your project running

New here? Follow these five steps in order. Each links to the page where you do it. Total time: about 10 minutes.

    Open your team. Stacks lists the stack for your team — it was created for you. Log in with your university account (CAS) if you do not see it yet; memberships appear on first login.
    Connect your Git repository. On your stack page, open the Repository section and paste your repo URL and branch. RepoRun needs read access — for private repos, add a deploy key or a token account with read rights to the repository.
    Add the two files RepoRun needs. docker-compose.yml — your services, exactly like you run them locally — and stack.yml, a small file that tells RepoRun which service and port to expose. The minimum:

    version: 1
    ingress:
      - name: app
        service: web      # the compose service to expose
        port: 3000        # the port it listens on
        primary: true
        access:
          type: cas

    Not dockerized yet? Skip to step 5 — the Guide can write both files with you.
    Validate, then Deploy. On the stack page press Validate (checks your files without deploying), fix any reported issues, then press Deploy. The first deploy builds your images and can take a few minutes. When it finishes, your endpoint URL is live — share that link.
    Stuck? Ask the Guide. The Guide is a built-in assistant that works directly with your files: it converts an existing docker-compose.yml into the RepoRun pair, writes a stack.yml from scratch, or helps you dockerize a project that has no Compose file yet. Try: “I have no docker-compose, only a Node.js app — help me start from zero.”

What is RepoRun?

RepoRun is a single-host Docker Compose deployment platform. It runs one deployable stack per team and exposes that stack through managed ingress endpoints.

The core hierarchy is:

Platform
  └── Workspace
        └── Team
              └── Stack
                    └── Endpoint

Each deployable stack repository must contain docker-compose.yml (what runs) and stack.yml (what RepoRun exposes). New here? The First steps section above walks you through this in five short steps.
Roles

    Team Member — manages the team stack, environment values, Basic Auth credentials, deployments, and logs.
    Workspace Admin — administers assigned workspaces, teams, and quotas.
    Platform Admin — global system administration.

There is no Team Admin role in v1. Your role determines which sections below apply to you.
Getting around

    Dashboard — your stacks, what needs attention, and recent operations.
    Stacks — every stack visible to you across your Platform Admin, Workspace Admin, and Team Member scopes.
    Operations — operation history and live logs across visible stacks.
    Catalog — validated starter templates you can initialize into an empty stack repository.

Use the filter bar above each grid to narrow results; major grids persist filters in the URL.
Team Member guide

The stack detail page is your main operational surface. It shows status, endpoints, lifecycle actions, repository and validation status, environment values, Basic Auth credentials, operation history, runtime log controls, quota usage, and the inbound webhook panel.
Lifecycle actions

    Deploy / Redeploy — fetches the configured branch, validates the repository, then runs docker compose up -d --build. Redeploy always starts the stack if it succeeds.
    Stop — runs docker compose down. Volumes are never removed.
    Start / Wake — uses the last trusted deployed configuration. It does not pull Git or rebuild.

A deploy succeeds when docker compose up -d exits successfully. A container healthcheck reporting unhealthy does not fail a deploy in v1. Failed stacks are recoverable by team members unless marked administrator repair required.
Environment values

Environment values are stack-level key/value records. Values are encrypted at rest and visible as plain text to authorized team members in v1. Changes are audited by key, action, actor, and timestamp; values are never stored in audit logs.

Env keys must match ^[A-Z_][A-Z0-9_]{0,127}$. Compose references with defaults such as ${LOG_LEVEL:-info} do not require a stored value. Missing required references fail validation by name only — secret values are never included in issues or logs.
Basic Auth credentials

Basic Auth credentials are team-level and referenced from stack.yml by an immutable credentials_ref. Passwords are visible as plain text to authorized users in v1 and encrypted at rest. RepoRun generates BCrypt (or APR1 for long passwords) hashes for Traefik; plaintext is never written to generated Traefik config.
Endpoint access policies

Each endpoint declared in stack.ymluses one of these access types:

    public — no authentication.
    cas — requires a valid CAS identity. Because the CAS IdP authorizes only the platform origin (not per-stack subdomains), an unauthenticated request is redirected to RepoRun’s own CAS login, which completes CAS authentication and sets a session cookie scoped to the base domain. A request with an existing valid session is admitted directly. Deactivated users fail closed. This is the default whenaccess is omitted.
    team — requires a valid active RepoRun session and exact membership in the endpoint’s team. Platform and Workspace Admin roles do not implicitly grant team endpoint access.
    basic_auth — HTTP Basic Auth via platform-generated password hashes for a team-level credential set.

There is no authenticated access type. Its “requires a RepoRun session” semantics are subsumed by cas, which additionally redirects unauthenticated requests through CAS login. Existing endpoints previously stored as authenticated were migrated to cas.
Idle sleep and wake

A running stack is automatically slept when its primary endpoint has been idle past the effective timeout. The effective timeout falls back from a per-team override to the workspace value, then to the global default. Auto-sleep only runs outside the local environment and is guarded by the same rules as manual sleep.

A request to a sleeping stack wakes it on demand using the last trusted configuration.
Catalog templates

The catalog lists validated starter templates. Initializing a template replaces the committed tree of an empty or starter-only repository; RepoRun never force pushes. Review the environment example and provide required values before initializing.