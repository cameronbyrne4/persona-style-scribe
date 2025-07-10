# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/cecacedb-bd0e-4a67-8620-e96a28e54dba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cecacedb-bd0e-4a67-8620-e96a28e54dba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Vercel Analytics

## Analytics Setup

This project includes Vercel Analytics for tracking user interactions and application performance.

### Configuration

1. **Environment Variables**: Create a `.env` file in the root directory with:
   ```
   VITE_VERCEL_ANALYTICS_ENABLED=1
   ```

2. **Usage**: The analytics are automatically initialized in `src/main.tsx`. You can use the analytics utility in `src/lib/analytics.ts` to track custom events:

   ```typescript
   import { analytics } from '@/lib/analytics';
   
   // Track feature usage
   analytics.trackFeature('button_clicked', { button: 'upload' });
   
   // Track page views
   analytics.trackPageView('/dashboard');
   
   // Track errors
   analytics.trackError('upload_failed', { error: 'network_error' });
   ```

3. **Available Tracking Functions**:
   - `trackPageView(page: string)` - Track page views
   - `trackAction(action: string, properties?: Record<string, any>)` - Track user actions
   - `trackFeature(feature: string, properties?: Record<string, any>)` - Track feature usage
   - `trackError(error: string, properties?: Record<string, any>)` - Track errors
   - `trackDocumentUpload(fileType: string, fileSize: number)` - Track document uploads
   - `trackStyleTransfer(inputLength: number, outputLength: number)` - Track style transfers
   - `trackResearchAnswer(questionLength: number, answerLength: number)` - Track research answers
   - `trackEngagement(action: string, duration?: number)` - Track user engagement

### Privacy

Analytics are disabled by default in development mode. Set `VITE_VERCEL_ANALYTICS_ENABLED=0` to disable analytics completely.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cecacedb-bd0e-4a67-8620-e96a28e54dba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
