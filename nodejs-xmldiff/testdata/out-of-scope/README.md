# Out of scope (product invariant)

The editor always assigns a unique `@id` on every element at creation time.
These fixtures deliberately violate that invariant and are **not** part of the
default progressive suite.

They remain here only as documentation of why the ID-based algorithm cannot
work without stable element identities.

Run explicitly if needed:

```bash
node test/run-scenarios.js --out-of-scope
```
