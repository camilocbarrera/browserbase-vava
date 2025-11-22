This is a [Next.js](https://nextjs.org) project with a simple Browserbase implementation example (without Trigger.dev).

## Browserbase Simple Example

This project demonstrates how to use Browserbase for browser automation with geolocated proxies. The implementation includes:

- **Simple Browserbase Service** (`lib/browserbase-simple.ts`): Standalone service for managing Browserbase sessions
- **API Route** (`app/api/proxy/route.ts`): Next.js API endpoint that uses Browserbase to proxy requests
- **Example UI** (`app/page.tsx`): Simple interface to test Browserbase requests

## Getting Started

### 1. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
bun install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
BROWSERBASE_API_KEY=your_api_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here
```

You can get these credentials from your [Browserbase dashboard](https://www.browserbase.com/).

### 3. Run the Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 4. Test the Example

1. Enter a URL in the input field (e.g., `https://httpbin.org/json`)
2. Click "Make Request"
3. View the response and session status

## How It Works

The Browserbase service:
- Creates browser sessions with Colombian IP addresses (configurable in `lib/browserbase-simple.ts`)
- Manages session lifecycle (create, rotate after 50 requests, close)
- Uses Puppeteer for real browser automation
- Implements delays and realistic headers for human-like behavior

## API Usage

You can also use the API route directly:

```bash
curl "http://localhost:3000/api/proxy?url=https://httpbin.org/json"
```

## Configuration

You can customize the service behavior in `lib/browserbase-simple.ts`:

- `maxRequestsPerSession`: Number of requests before rotating session (default: 50)
- `geolocation`: Change country/city for proxy location
- Request delays and headers can be adjusted in the `makeRequest` method

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
