# Reporting Security Issues

We take security very seriously at GoDaddy. We appreciate your efforts to
responsibly disclose your findings, and will make every effort to acknowledge
your contributions.

## Where should I report security issues?

In order to give the community time to respond and upgrade, we strongly urge you
report all security issues privately.

To report a security issue in one of our Open Source projects email us directly
at **oss@godaddy.com** and include the word "SECURITY" in the subject line.

This mail is delivered to our Open Source Security team.

After the initial reply to your report, the team will keep you informed of the
progress being made towards a fix and announcement, and may ask for additional
information or guidance.

## Deploy validator (`validate-paas.mjs`)

The skill includes a **local, read-only** CLI that checks a Node.js project
before upload to Node.js Hosting. It:

- Accepts a **project directory path** from the command line (the operator
  chooses which folder to scan).
- Reads `package.json` and source files only; does not execute project code or
  shell commands.
- Confines file access under that directory using validated relative segments
  and prefix checks (no `path.join` / `path.resolve` on untrusted segments).

Run it only on projects you trust, just as you would run `npm install` or
open the folder in an editor. It is not a network-facing service.