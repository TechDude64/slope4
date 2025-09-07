# Slope 4 - React + Vite with Global Leaderboard

A 3D endless runner game built with React, Vite, and Three.js, featuring a global leaderboard powered by Supabase.

## Features

- 3D endless runner gameplay with Three.js
- Global leaderboard system
- Score submission with player names
- Responsive design
- Modern React + Vite setup

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Run the following SQL to create the leaderboard table:

```sql
CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for better query performance
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX idx_leaderboard_created_at ON leaderboard(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read scores
CREATE POLICY "Anyone can read leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Create policy to allow anyone to insert scores
CREATE POLICY "Anyone can insert scores" ON leaderboard
  FOR INSERT WITH CHECK (true);
```

4. Go to Settings > API in your Supabase dashboard
5. Copy your Project URL and anon/public key

### 2. Environment Configuration

1. Update the `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## How to Play

- Use A/D or Left/Right arrow keys to move between lanes
- Avoid the red obstacles
- Survive as long as possible to get a high score
- When you crash, enter your name and submit your score to the leaderboard
- Click the "🏆 Leaderboard" button to view global high scores

## File Structure

```
src/
├── App.jsx          # Main application component
├── Game.jsx         # Three.js game component
├── Leaderboard.jsx  # Leaderboard modal component
├── supabase.js      # Supabase client and API functions
├── main.jsx         # Application entry point
└── index.css        # Global styles

public/
└── vite.svg         # Vite logo

.env                 # Environment variables
package.json         # Dependencies and scripts
vite.config.js       # Vite configuration
```

## Technologies Used

- **React** - UI framework
- **Vite** - Build tool and development server
- **Three.js** - 3D graphics library
- **Supabase** - Backend and database
- **ESLint** - Code linting

## Customization

You can customize various aspects of the game:

- Game speed and difficulty in the `Game.jsx` component
- Visual styling using inline styles or CSS modules
- Leaderboard display limit (currently set to 10)
- Player name length limit (currently 20 characters)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

- If the leaderboard doesn't load, check your Supabase credentials in `.env`
- Make sure your Supabase project has the correct RLS policies
- Check the browser console for any JavaScript errors
- Ensure your environment variables are prefixed with `VITE_` for Vite to expose them

## License

This project is open source and available under the MIT License.
