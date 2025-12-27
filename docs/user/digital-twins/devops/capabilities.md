# Capabilities

Other than creating and editing Digital Twins, you are naturally also able to
run them and adjust their execution parameters. DTaaS allows you to run multiple
Digital Twins at the same time and even change settings while they are running,
without needing to worry about manually having to fetch your data: They will load
when you return to whichever branch and group you ran them on. The settings include
both repository and execution, while all twins can easily be run and checked from
the Execution tab under the Preview page.

Read more about [Settings](../../website/settings.md), [Setting Values](./execution-settings.md)
and [Concurrent Execution](./concurrent-execution.md) on their respective pages.

## 🧩 Implementing Backends

DTaaS is by default set up to work with GitLab as execution and storage backend,
but other combinations may fit your needs better. As such, the code base is
designed with this flexibility in mind, so you don't have to reimplement everything
every time you need a new backend. In future versions of DTaaS, more backends may
be available out of the box, like GitHub and Azure.

## 💭 Summary

Digital Twins can be queued as needed and the live settings you make during these
will not interfere with data retention, while empowering you to test multiple
setups at once in one place.
For greater flexibility, those with the technical know-how can frictionlessly
expand upon the available backends.
