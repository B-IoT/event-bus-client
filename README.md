# @biot-dev/event-bus-client

![npm (scoped)](https://img.shields.io/npm/v/@biot-dev/event-bus-client)

[BioT](https://biot.webflow.io)'s Vert.x Event Bus Client for real-time updates and notifications.

## Usage

```typescript
import { Client } from '@biot-dev/event-bus-client'

const client = new Client('url', 'token', 'company', options)
await client.connect()

client.onItemUpdate((type, id, content) => {
  // Process update
})
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
