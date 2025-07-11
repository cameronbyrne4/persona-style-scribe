# Pensona

> Your AI-powered writing assistant that learns your unique style and helps you create content that sounds authentically you.

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.50.3-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-646CFF.svg)](https://vitejs.dev/)

## ✨ Features

### 🎨 Style Transfer
Transform any text to match your unique writing voice. Upload writing samples during onboarding, and our AI learns your style to rewrite content in your authentic voice.

### 🔍 Research & Answer (RAG)
Ask questions about your documents and get AI-powered answers that sound like you. Upload source materials or paste text, then ask questions to get personalized responses.

### 📚 Document Management
- Upload and manage your writing samples
- Track your style profile strength
- View document history and analytics
- Support for text files and pasted content

### 📊 Analytics & Insights
- Real-time style profile strength assessment
- Document upload tracking
- Feature usage analytics
- Performance monitoring

### 🔐 Authentication
- Google OAuth integration via Supabase Auth
- Secure user sessions
- Protected routes and API endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/persona-style-scribe.git
   cd persona-style-scribe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_VERCEL_ANALYTICS_ENABLED=1
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migration: `supabase db push`
   - Deploy edge functions: `supabase functions deploy extract-text && supabase functions deploy rag-qa && supabase functions deploy style-transfer`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for client-side routing
- **TanStack Query** for server state management
- **shadcn/ui** components with Tailwind CSS
- **Vercel Analytics** for usage tracking

### Backend
- **Supabase** as Backend-as-a-Service
- **PostgreSQL** database with Row Level Security
- **Supabase Auth** for authentication
- **Supabase Storage** for file uploads
- **Edge Functions** for AI processing

### AI Integration
- **OpenAI/Anthropic** for text generation
- **Custom prompts** for style transfer
- **RAG (Retrieval-Augmented Generation)** for research answers
- **Rate limiting** and validation

## 📁 Project Structure

```
persona-style-scribe/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configurations
│   └── assets/             # Static assets
├── supabase/
│   ├── functions/          # Edge functions
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── public/                 # Public assets
└── documents/              # Project documentation (gitignored)
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Database Migrations

```bash
# Apply migrations to your Supabase project
supabase db push

# Create new migration
supabase migration new migration_name
```

### Edge Functions

```bash
# Deploy all functions
supabase functions deploy extract-text
supabase functions deploy rag-qa
supabase functions deploy style-transfer

# Deploy with logs
supabase functions deploy function-name --debug
```

## 🎯 Core Features Deep Dive

### Style Transfer
The style transfer feature analyzes your writing samples to understand your unique voice, including:
- Vocabulary preferences
- Sentence structure patterns
- Tone and formality levels
- Writing style characteristics

### Research & Answer (RAG)
Powered by retrieval-augmented generation:
- Upload source documents or paste text
- Ask questions about the content
- Receive answers in your writing style
- Support for different answer lengths (short, medium, long)

### Document Management
- Secure file upload to Supabase Storage
- Text extraction and processing
- Document metadata tracking
- Style profile strength calculation

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **JWT authentication** for all API endpoints
- **Rate limiting** on edge functions
- **Input validation** and sanitization
- **Secure file uploads** with type checking

## 📈 Analytics

The app includes comprehensive analytics tracking:
- Page views and user navigation
- Feature usage and engagement
- Document upload metrics
- Style transfer and RAG usage
- Error tracking and performance monitoring

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
The app can be deployed to any platform that supports static site hosting:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any VPS with nginx

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `documents/` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join the conversation in GitHub Discussions

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend platform
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Vite](https://vitejs.dev/) for the lightning-fast build tool

---

Built with ❤️ using modern web technologies
