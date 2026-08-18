# Glossary

Arc42 chapter 12: define the domain and technical terms used in the architecture documentation.
A shared glossary reduces misunderstandings between developers, architects, and stakeholders.
Each term gets its own `##` section.

The `definition` field is required (rule E005 will flag a missing definition). Keep definitions
concise — one or two sentences. The prose above the block can provide extended context.

## Bounded Context

A bounded context is a logical boundary within which a domain model is consistent and unambiguous.
Inside a bounded context, terms have precise, agreed meanings; the same word may mean something
different in a different bounded context.

:::glossary-term
id: term-bounded-context
title: Bounded Context
definition: A logical boundary within which a domain model, its language, and its rules are internally consistent. Defined in Domain-Driven Design (Evans, 2003).
:::

## Idempotent Operation

An operation is idempotent if executing it multiple times with the same input produces the same
result as executing it once. Idempotency is required for safe retry logic in distributed systems.

:::glossary-term
id: term-idempotent
title: Idempotent Operation
definition: An operation that can be applied multiple times without changing the result beyond the initial application. Used to make retries safe in distributed systems.
:::
