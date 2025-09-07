import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const submitScore = async (playerName, score) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([{ player_name: playerName, score: score, created_at: new Date().toISOString() }])

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error submitting score:', error)
    return null
  }
}

export const getLeaderboard = async () => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('player_name, score')
      .order('score', { ascending: false })
      .limit(10)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }
}
