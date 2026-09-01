# Building Blocks

:::building-block
id: bb-api
title: API Gateway
technology: Node.js
:::

:::building-block
id: bb-auth
title: Auth Service
parent: bb-nonexistent
:::

:::building-block
id: bb-db
title: Database
technology: PostgreSQL
implements: concept-logging
:::

:::building-block
id: bb-db-reader
title: Database Reader
parent: bb-db
:::

:::concept
id: concept-logging
title: Logging
category: cross-cutting
:::
