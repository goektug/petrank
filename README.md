# PetRank 🐾

A modern web application for sharing and ranking pet photos. Built with Next.js, Supabase, and TailwindCSS.

## 🌟 Features

- **Image Upload**: Easy drag-and-drop or click-to-upload functionality
- **Pet Details**: Add information about your pets including:
  - Pet Name
  - Age
  - Gender
  - Social Media Links
- **View Tracking**: Automatic tracking of image views
- **Ranking System**: Images are automatically ranked based on view count
- **Admin Panel**: Secure admin interface for content moderation
- **Responsive Design**: Beautiful interface that works on all devices

## 🚀 Live Demo

Visit [petrank.vercel.app](https://petrank.vercel.app) to see the application in action.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Deployment**: Vercel
- **Authentication**: GitHub OAuth
- **Image Storage**: Supabase Storage

## 📋 Prerequisites

- Node.js 18+ 
- npm/yarn
- Supabase account
- GitHub account (for authentication)

## 🔧 Local Development

1. Clone the repository:
```bash
git clone https://github.com/goektug/petrank.git
cd petrank
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## 🔐 Authentication Setup

1. Create a GitHub OAuth application
2. Set the homepage URL to your domain
3. Set the callback URL to your Supabase auth callback URL
4. Add the GitHub OAuth credentials to your Supabase project

## 🗄️ Database Schema

The application uses the following main table:

```sql
CREATE TABLE pet_uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_name VARCHAR NOT NULL,
  age VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  social_media_link TEXT,
  image_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

## 🚀 Deployment

The project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the environment variables
4. Deploy!

## 📜 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/goektug/petrank/issues).

## 👥 Authors

- [@goektug](https://github.com/goektug) 