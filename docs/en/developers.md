# Developer Documentation

This section contains technical documentation for developers.

## API Documentation

--8<-- "includes/developers/api.md"

## Start

To start developing with our platform, follow these steps:

1. **Sign up** for a developer account
2. **Generate** your API keys
3. **Install** our SDKs
4. **Build** your first integration

## SDKs and Libraries

We provide official SDKs for various programming languages:

- **JavaScript/Node.js** - `npm install @platform/sdk`
- **Python** - `pip install platform-sdk`
- **Java** - Maven dependency available
- **PHP** - Composer package available

## Example Code

### Authentication Example

```javascript
const Platform = require('@platform/sdk');

const client = new Platform({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Authenticate user
const user = await client.auth.login({
  username: 'user@example.com',
  password: 'password'
});
```

## Support

For technical support:

- Consult our [API Documentation](--8<-- "includes/urls-ita.md")
- Visit our [Developers Forum](https://developers.example.com/forum/it)
- Contact support at [developers@example.com](mailto:developers@example.com)