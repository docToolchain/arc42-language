# Deployment View

## CLI and Core Package

The CLI and core package are bundled together as an executable that can be invoked through `npx`.
This gives users and automation a straightforward way to run the validation tool without managing
a separate installation of the package internals.

## Agent Skill

The agent skill is deployed to the agent's skills directory. The deployment includes the skill's
templates as a subdirectory, so the agent receives both the authoring guidance and the reusable
document structures in one installed skill.
