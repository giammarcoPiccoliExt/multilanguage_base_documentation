# Developer Documentation

This section contains technical documentation for developers.

## API Documentation

--8<-- includes/developers/api.md

♪ Start

To start developing with our platform, follow these steps:

1. **Register*** for a developer account
2. **Genera**** your API keys
3. **Install*** our SDK
4. **Building***** your first integration

## SDK and Librerie

We provide official SDKs for different programming languages:

- **JavaScript/Node.js** - `npm install @platform/sdk`
- **Python** - `pip install platform-sdk`
- **Java*** - Maven employee available
- **PHP*** - Composer package available

## Examples of Code

### Authentication Example

``javascript
const Platform = require('@platform/sdk');

const client = new Platform({
apiKey: 'your-api-key',
environment: 'production'
?

// User Authentication
const user = await client.auth.login({
username: 'user@example.com',
password: 'password'
?
``

## Support

For technical support:

- See our [ API Documentation](--8<-- "includes/urls-ita.md")
- Visit our [forum developers](https://developers.example.com/forum/it)
- Contact support at [developers@example.com](mailto:developers@example.com)
