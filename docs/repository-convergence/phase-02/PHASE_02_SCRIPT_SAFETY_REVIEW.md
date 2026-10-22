# Package Script Safety Review

Package manifests discovered: **10**
Declared script rows inventoried: **186**
Script command path tokens: **161**

Scripts were inspected statically and **none were executed**. Command classification is heuristic. Before running any command, review its transitive shell scripts and environment prerequisites. Database, deployment, release, reset, seed, cleanup, and destructive commands remain out of scope. Environment variable names may be listed; secret values were not intentionally extracted.
